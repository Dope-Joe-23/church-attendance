from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
import csv
import logging
from .models import Attendance
from .serializers import AttendanceSerializer, AttendanceCheckInSerializer
from .checkin_service import perform_checkin
from services.models import Service
from members.models import Member

logger = logging.getLogger(__name__)



class AttendanceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Attendance management
    
    Endpoints:
    - GET /attendance/ - List all attendance records
    - GET /attendance/?member=<id> - Filter by member ID
    - GET /attendance/?service=<id> - Filter by service ID
    - POST /attendance/ - Create attendance record
    - GET /attendance/{id}/ - Get attendance details
    - POST /attendance/checkin/ - Check-in member via QR code
    - GET /attendance/by-service/{service_id}/ - Get attendance for a service
    """
    
    queryset = Attendance.objects.all().select_related('member', 'service', 'service__parent_service').order_by('-created_at')
    serializer_class = AttendanceSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['member', 'service', 'status']
    ordering_fields = ['created_at', 'member', 'service']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['post'])
    def checkin(self, request):
        """
        Check-in member using QR code
        
        Request body:
        {
            "member_id": "ABC123",
            "service_id": 1
        }
        """
        serializer = AttendanceCheckInSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        member_id = serializer.validated_data['member_id']
        service_id = serializer.validated_data['service_id']
        
        try:
            member = Member.objects.get(member_id=member_id)
            service = Service.objects.get(id=service_id)
        except Member.DoesNotExist:
            return Response({
                'success': False,
                'message': f'Member with ID {member_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Service.DoesNotExist:
            return Response({
                'success': False,
                'message': f'Service with ID {service_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        _, http_status, payload = perform_checkin(member, service)
        return Response(payload, status=http_status)
    
    @action(detail=False, methods=['get'])
    def by_service(self, request):
        """
        Get attendance records for a specific service/session
        Usage: /attendance/by_service/?service_id=1
        Only works for sessions (specific dates), not parent recurring services
        Returns comprehensive statistics including attendance by class
        """
        service_id = request.query_params.get('service_id')
        if not service_id:
            return Response({
                'error': 'service_id query parameter is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = Service.objects.get(id=service_id)
            
            # Prevent attendance reports for parent recurring services (template/label only)
            if service.is_recurring and service.parent_service is None and service.date is None:
                return Response({
                    'error': f'"{service.name}" is a recurring service template. Please select a specific session/date to view attendance.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # --- Statistics via aggregation queries (no .only() on these paths) ---
            # These use fresh querysets to avoid touching qr_code_data, which
            # can cause UTF-8 decode errors on Python 3.14 / psycopg3.
            from django.db.models import Count
            base_att = Attendance.objects.filter(service=service)
            
            status_counts = dict(
                base_att.values_list('status').annotate(c=Count('id')).values_list('status', 'c')
            )
            total_present = status_counts.get('present', 0)
            total_absent = status_counts.get('absent', 0)
            total_late = status_counts.get('late', 0)
            
            # Sex-based statistics for present members
            sex_counts = dict(
                base_att.filter(status='present')
                .values_list('member__sex').annotate(c=Count('id'))
                .values_list('member__sex', 'c')
            )
            male_present = sex_counts.get('male', 0)
            female_present = sex_counts.get('female', 0)
            
            # Attendance by class (single GROUP BY query)
            class_agg = (
                base_att.filter(member__class_name__isnull=False)
                .values('member__class_name', 'status')
                .annotate(c=Count('id'))
            )
            class_stats = {}
            for row in class_agg:
                cname = row['member__class_name']
                if cname not in class_stats:
                    class_stats[cname] = {'present': 0, 'absent': 0, 'total': 0}
                class_stats[cname][row['status']] = row['c']
                class_stats[cname]['total'] += row['c']
            class_stats = dict(sorted(class_stats.items()))
            
            # --- Serializer data (with .only() to exclude qr_code_data) ---
            attendances = Attendance.objects.filter(service=service)\
                .select_related('member', 'service', 'service__parent_service')\
                .only(
                    'id', 'check_in_time', 'status', 'is_auto_marked', 'notes', 'created_at',
                    'member__id', 'member__member_id', 'member__full_name',
                    'member__sex', 'member__department', 'member__class_name',
                    'member__phone', 'member__email', 'member__date_of_birth',
                    'member__place_of_residence', 'member__profession',
                    'member__committee', 'member__marital_status',
                    'member__is_visitor', 'member__baptised', 'member__confirmed',
                    'member__attendance_status', 'member__engagement_score',
                    'member__last_attendance_date', 'member__consecutive_absences',
                    'service__id', 'service__name', 'service__date', 'service__start_time',
                    'service__is_recurring', 'service__parent_service',
                )
            serializer = AttendanceSerializer(attendances, many=True)
            
            return Response({
                'service': {
                    'id': service.id,
                    'name': service.name,
                    'date': service.date,
                    'start_time': service.start_time
                },
                'attendances': serializer.data,
                'total_present': total_present,
                'total_absent': total_absent,
                'total_late': total_late,
                'male_present': male_present,
                'female_present': female_present,
                'class_statistics': class_stats,
            })
        except Service.DoesNotExist:
            return Response({
                'error': f'Service with ID {service_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in by_service for service_id={service_id}: {e}", exc_info=True)
            return Response({
                'error': 'An internal error occurred while loading attendance data.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def mark_absent(self, request):
        """
        Mark all members who haven't checked in as absent for a service/session.
        This is typically called at the end of a service/session.
        Only works for sessions (specific dates), not parent recurring services.
        
        Request body:
        {
            "service_id": 1
        }
        """
        service_id = request.data.get('service_id')
        if not service_id:
            return Response({
                'error': 'service_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = Service.objects.get(id=service_id)
            
            # Prevent marking absent for parent recurring services (template/label only)
            if service.is_recurring and service.parent_service is None and service.date is None:
                return Response({
                    'error': f'"{service.name}" is a recurring service template. Please select a specific session/date to mark attendance.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if any check-ins exist for this service
            checkin_count = Attendance.objects.filter(
                service=service,
                marked_by='check_in'
            ).count()
            
            # Get all members who are NOT visitors (optimize with only id field)
            all_member_ids = set(Member.objects.filter(is_visitor=False).values_list('id', flat=True))
            
            # Get members already marked for this service
            already_marked = set(
                Attendance.objects.filter(service=service).values_list('member_id', flat=True)
            )
            
            # Calculate members to mark as absent
            members_to_mark_ids = all_member_ids - already_marked
            
            # Create attendance records for members not yet marked
            absent_count = len(members_to_mark_ids)
            new_attendances = []
            
            # Fetch member names only for those to be marked (batch this)
            member_names_map = {}
            if members_to_mark_ids:
                member_names_map = dict(
                    Member.objects.filter(id__in=members_to_mark_ids).values_list('id', 'full_name')
                )
                
                for member_id in members_to_mark_ids:
                    new_attendances.append(
                        Attendance(
                            member_id=member_id,
                            service=service,
                            status='absent',
                            marked_by='manual'
                        )
                    )
            
            # Bulk create all attendance records at once (much faster)
            if new_attendances:
                Attendance.objects.bulk_create(new_attendances, batch_size=500)
            
            # Queue absenteeism metric updates for all affected members
            # Use bulk update to efficiently update consecutive_absences
            if members_to_mark_ids:
                # For now, just mark that metrics need recalculation
                # Actual recalculation will happen separately
                from django.db.models import F, Q
                
                # Get all absent attendances for these members (their most recent)
                recent_absences = Attendance.objects.filter(
                    member_id__in=members_to_mark_ids,
                    status='absent'
                ).select_related('service').order_by('member_id', '-service__date')
            
            marked_members = [member_names_map.get(mid, f"Member {mid}") for mid in members_to_mark_ids][:20]
            
            return Response({
                'success': True,
                'message': f'Marked {absent_count} members as absent',
                'marked_members': marked_members if absent_count <= 20 else marked_members + [f'... and {absent_count - 20} more'],
                'checkin_count': checkin_count
            }, status=status.HTTP_200_OK)
        
        except Service.DoesNotExist:
            return Response({
                'error': f'Service with ID {service_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in mark_absent: {str(e)}", exc_info=True)
            return Response({
                'error': f'Error marking members as absent: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def unmark_attendance(self, request):
        """
        Unmark/remove all attendance records for a service/session.
        This resets attendance marking back to neutral state.
        Only works for sessions (specific dates), not parent recurring services.
        
        Request body:
        {
            "service_id": 1
        }
        """
        service_id = request.data.get('service_id')
        if not service_id:
            return Response({
                'error': 'service_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            service = Service.objects.get(id=service_id)
            
            # Prevent unmarking for parent recurring services (template/label only)
            if service.is_recurring and service.parent_service is None and service.date is None:
                return Response({
                    'error': f'"{service.name}" is a recurring service template. Please select a specific session/date to unmark attendance.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get all attendance records for this service
            attendances = Attendance.objects.filter(service=service)
            deleted_count = attendances.count()
            
            # Delete all attendance records
            attendances.delete()
            
            return Response({
                'success': True,
                'message': f'Unmarked {deleted_count} attendance records',
                'deleted_count': deleted_count
            }, status=status.HTTP_200_OK)
        
        except Service.DoesNotExist:
            return Response({
                'error': f'Service with ID {service_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """
        Export attendance report as CSV.
        Usage: /attendance/export_csv/?service_id=1
        """
        service_id = request.query_params.get('service_id')
        if not service_id:
            return Response(
                {'error': 'service_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            service = Service.objects.get(id=service_id)
        except Service.DoesNotExist:
            return Response(
                {'error': f'Service with ID {service_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Class & department display name mapping
        CLASS_LABELS = dict(Member.CLASS_CHOICES)
        DEPT_LABELS = dict(Member.DEPARTMENT_CHOICES)

        attendances = Attendance.objects.filter(service=service)\
            .select_related('member')\
            .only(
                'check_in_time', 'status', 'notes',
                'member__member_id', 'member__full_name', 'member__sex',
                'member__department', 'member__class_name', 'member__phone',
                'member__email',
            )\
            .order_by('member__full_name')

        response = HttpResponse(content_type='text/csv')
        safe_name = service.name.replace(' ', '_')[:30]
        date_str = str(service.date) if service.date else 'no-date'
        response['Content-Disposition'] = (
            f'attachment; filename="attendance_{safe_name}_{date_str}.csv"'
        )

        writer = csv.writer(response)
        writer.writerow([
            'Member ID', 'Full Name', 'Sex', 'Department', 'Class',
            'Phone', 'Email', 'Status', 'Check-in Time', 'Notes',
        ])

        for att in attendances:
            m = att.member
            writer.writerow([
                m.member_id,
                m.full_name,
                (m.sex or '').capitalize(),
                DEPT_LABELS.get(m.department, m.department or ''),
                CLASS_LABELS.get(m.class_name, m.class_name or ''),
                m.phone or '',
                m.email or '',
                att.status.capitalize(),
                att.check_in_time.strftime('%Y-%m-%d %H:%M') if att.check_in_time else '',
                att.notes or '',
            ])

        return response
