"""
Shared self check-in logic.

Used by both:
- the authenticated scanner flow (POST /attendance/checkin/)
- the public (no-account) self check-in flow (GET/POST /public/checkin/)
"""
from datetime import datetime, timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from .models import Attendance
from .tasks import schedule_member_absenteeism_update
from members.models import Member
from services.models import Service


def serialize_checkin_attendance(attendance):
    """Small check-in response payload; avoids sending nested QR image data."""
    return {
        'id': attendance.id,
        'member': attendance.member_id,
        'member_id': attendance.member.member_id,
        'member_name': attendance.member.full_name,
        'service': attendance.service_id,
        'status': attendance.status,
        'check_in_time': attendance.check_in_time,
        'created_at': attendance.created_at,
    }


def is_template_service(service):
    """Parent recurring service templates have no date — check-in is not allowed."""
    return service.is_recurring and service.parent_service is None and service.date is None


def get_checkin_window(service):
    """
    Return (open_dt, close_dt) for a service's self check-in window.

    Check-in opens CHECKIN_GRACE_BEFORE_MINUTES before start_time and closes
    CHECKIN_GRACE_AFTER_MINUTES after end_time. If end_time is unset, a
    2-hour duration is assumed. Returns (None, None) for services with no date.
    """
    if service.date is None:
        return None, None

    start_dt = timezone.make_aware(datetime.combine(service.date, service.start_time))
    nominal_end = service.end_time or (
        datetime.combine(service.date, service.start_time) + timedelta(hours=2)
    ).time()
    end_dt = timezone.make_aware(datetime.combine(service.date, nominal_end))

    open_dt = start_dt - timedelta(minutes=settings.CHECKIN_GRACE_BEFORE_MINUTES)
    close_dt = end_dt + timedelta(minutes=settings.CHECKIN_GRACE_AFTER_MINUTES)
    return open_dt, close_dt


def checkin_window_status(service):
    """
    Return (is_open, message, open_dt, close_dt) describing the self check-in window.
    """
    open_dt, close_dt = get_checkin_window(service)
    if open_dt is None:
        return False, 'This service has no scheduled date yet.', None, None
    now = timezone.now()
    if now < open_dt:
        return (
            False,
            f'Check-in opens {settings.CHECKIN_GRACE_BEFORE_MINUTES} minutes before the service starts.',
            open_dt,
            close_dt,
        )
    if now > close_dt:
        return False, 'Check-in has closed for this service.', open_dt, close_dt
    return True, 'Check-in is open.', open_dt, close_dt


def resolve_member(member_id):
    """
    Resolve a member by their full ID, or by the last 4 digits of their ID.

    Member IDs look like WIS-2026-0001, so typing "0001" is enough. Full IDs
    keep working too. Returns (member, error_response) — one of them is None.
    """
    member_id = (member_id or '').strip()
    if not member_id:
        return None, Response(
            {'valid': False, 'success': False, 'error': 'Please enter your member ID.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 1) Exact full-ID match first (full IDs still work, case-insensitive)
    try:
        return Member.objects.get(member_id__iexact=member_id), None
    except Member.DoesNotExist:
        pass

    # 2) Last-4-digits shortcut: "0001" matches WIS-2026-0001
    matches = Member.objects.filter(
        member_id__iendswith=member_id,
        is_visitor=False,  # visitors are blocked from check-in anyway
    )
    count = matches.count()
    if count == 1:
        return matches.first(), None
    if count > 1:
        return None, Response(
            {'valid': False, 'success': False, 'error': 'Multiple members share this number. Please enter your full Member ID (e.g. WIS-2026-0001).'},
            status=status.HTTP_400_BAD_REQUEST
        )

    return None, Response(
        {'valid': False, 'success': False, 'error': f'No member found with ID "{member_id}". Please check your ID and try again.'},
        status=status.HTTP_404_NOT_FOUND
    )


def perform_checkin(member, service):
    """
    Core check-in logic shared by the authenticated scanner and public self check-in.

    Returns (success: bool, http_status: int, payload: dict).
    """
    if is_template_service(service):
        return False, status.HTTP_400_BAD_REQUEST, {
            'success': False,
            'message': f'"{service.name}" is a recurring service template. Please select a specific session/date to check in.'
        }

    if member.is_visitor:
        return False, status.HTTP_400_BAD_REQUEST, {
            'success': False,
            'message': f'{member.full_name} is listed as a visitor and is not tracked in attendance.'
        }

    # Prevent check-ins after attendance marking has been finalized
    manual_attendance_exists = Attendance.objects.filter(
        service=service,
        marked_by__in=['manual', 'auto']
    ).exists()

    if manual_attendance_exists:
        return False, status.HTTP_400_BAD_REQUEST, {
            'success': False,
            'message': 'Attendance for this service has been taken',
            'attendance': None
        }

    attendance, created = Attendance.objects.get_or_create(
        member=member,
        service=service,
        defaults={
            'status': 'present',
            'marked_by': 'check_in',
        }
    )

    if created:
        # Reset consecutive absences on successful check-in
        member.consecutive_absences = 0
        member.last_attendance_date = timezone.now().date()
        member.save(update_fields=['consecutive_absences', 'last_attendance_date'])

        # Update heavier absenteeism metrics and alerts off the request path
        # so QR check-in responses stay fast at the door.
        schedule_member_absenteeism_update(member.id)

        return True, status.HTTP_201_CREATED, {
            'success': True,
            'message': f'{member.full_name} checked in successfully',
            'member_name': member.full_name,
            'attendance': serialize_checkin_attendance(attendance)
        }

    return False, status.HTTP_200_OK, {
        'success': False,
        'message': f'{member.full_name} is already checked in for this service',
        'member_name': member.full_name,
        'attendance': serialize_checkin_attendance(attendance)
    }


class PublicCheckinRateThrottle(SimpleRateThrottle):
    """Per-IP throttle for submitting a self check-in."""
    scope = 'public_checkin'

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': ident}


class PublicCheckinInfoRateThrottle(SimpleRateThrottle):
    """Per-IP throttle for reading service info from a QR token."""
    scope = 'public_checkin_info'

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': ident}


class PublicCheckinView(APIView):
    """
    Unauthenticated self check-in endpoints used by members scanning a printed QR.

    GET  /api/public/checkin/?token=<token>
        -> service info plus whether check-in is currently open
    POST /api/public/checkin/
        -> body {"token": "...", "member_id": "..."} marks the member present
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def get_throttles(self):
        if self.request.method == 'GET':
            return [PublicCheckinInfoRateThrottle()]
        return [PublicCheckinRateThrottle()]

    def _service_from_token(self, token):
        """Resolve a check-in token to a Service, or return an error response."""
        if not token:
            return None, Response(
                {'valid': False, 'success': False, 'error': 'A check-in code is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            service = Service.objects.get(checkin_token=token)
        except Service.DoesNotExist:
            return None, Response(
                {'valid': False, 'success': False, 'error': 'This check-in code is not valid. Please scan the QR code posted at the church.'},
                status=status.HTTP_404_NOT_FOUND
            )
        return service, None

    def get(self, request):
        service, error = self._service_from_token(request.query_params.get('token'))
        if error:
            return error

        if is_template_service(service):
            return Response(
                {'valid': False, 'success': False, 'error': f'"{service.name}" has no scheduled session yet.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_open, message, open_dt, close_dt = checkin_window_status(service)
        attendance_taken = Attendance.objects.filter(
            service=service,
            marked_by__in=['manual', 'auto']
        ).exists()

        # Optional pre-check-in confirmation: resolve the member typing their ID
        # so the page can show "Is this you?" before the member submits.
        member_match = None
        member_id = (request.query_params.get('member_id') or '').strip()
        if member_id:
            member, resolve_error = resolve_member(member_id)
            if member is not None:
                member_match = {
                    'full_name': member.full_name,
                    'member_id': member.member_id,
                }
            else:
                member_match = {
                    'error': resolve_error.data.get('error', 'Unable to find member.')
                }

        # Optional name search: return matching members for the live-search UI
        search_query = (request.query_params.get('search') or '').strip()
        search_results = []
        if search_query and len(search_query) >= 2:
            members_qs = Member.objects.filter(
                full_name__icontains=search_query,
                is_visitor=False,
            ).order_by('full_name')[:15]
            search_results = [
                {
                    'id': m.id,
                    'full_name': m.full_name,
                    'member_id': m.member_id,
                }
                for m in members_qs
            ]

        return Response({
            'valid': True,
            'service': {
                'id': service.id,
                'name': service.name,
                'date': service.date,
                'start_time': service.start_time,
                'end_time': service.end_time,
                'location': service.location,
            },
            'church_name': settings.CHURCH_NAME,
            'checkin_open': is_open,
            'checkin_message': message,
            'checkin_window': (
                {'opens_at': open_dt.isoformat(), 'closes_at': close_dt.isoformat()}
                if open_dt is not None
                else None
            ),
            'attendance_taken': attendance_taken,
            'member_match': member_match,
            'search_results': search_results,
        })

    def post(self, request):
        service, error = self._service_from_token(request.data.get('token'))
        if error:
            return error

        member, error = resolve_member(request.data.get('member_id'))
        if error:
            return error

        if is_template_service(service):
            return Response(
                {'valid': False, 'success': False, 'error': f'"{service.name}" has no scheduled session yet.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        is_open, message, _, _ = checkin_window_status(service)
        if not is_open:
            return Response(
                {'valid': False, 'success': False, 'error': message, 'checkin_message': message},
                status=status.HTTP_400_BAD_REQUEST
            )

        _, http_status, payload = perform_checkin(member, service)
        return Response(payload, status=http_status)
