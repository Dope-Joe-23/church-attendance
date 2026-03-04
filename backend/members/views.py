from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Member, MemberAlert, ContactLog, MemberAbsenteeismAlert, MemberAbsenteeismMetric
from .serializers import (
    MemberSerializer, MemberDetailSerializer, MemberAlertSerializer, 
    ContactLogSerializer, MemberAbsenteeismAlertSerializer, MemberAbsenteeismMetricSerializer
)
from .email_service import send_qr_code_email
from django.utils import timezone


class MemberViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Member management
    
    Endpoints:
    - GET /members/ - List all members
    - POST /members/ - Create new member
    - GET /members/{id}/ - Get member details
    - PUT /members/{id}/ - Update member
    - DELETE /members/{id}/ - Delete member
    """
    
    queryset = Member.objects.all()
    serializer_class = MemberSerializer
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MemberDetailSerializer
        return MemberSerializer
    
    @action(detail=False, methods=['get'])
    def by_member_id(self, request):
        """
        Get member by member_id
        Usage: /members/by_member_id/?member_id=ABC123
        """
        member_id = request.query_params.get('member_id')
        if not member_id:
            return Response(
                {'error': 'member_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            member = Member.objects.get(member_id=member_id)
            serializer = MemberDetailSerializer(member)
            return Response(serializer.data)
        except Member.DoesNotExist:
            return Response(
                {'error': f'Member with ID {member_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def qr_code(self, request, pk=None):
        """Get QR code image for a member"""
        member = self.get_object()
        if member.qr_code_image:
            return Response({
                'qr_code_url': member.qr_code_image.url,
                'member_id': member.member_id
            })
        return Response(
            {'error': 'QR code not available'},
            status=status.HTTP_404_NOT_FOUND
        )

    @action(detail=True, methods=['post'])
    def send_qr_email(self, request, pk=None):
        """Send QR code email to member"""
        member = self.get_object()
        
        if not member.email:
            return Response({
                'success': False,
                'message': f'Member {member.full_name} does not have an email address'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            success = send_qr_code_email(member)
            if success:
                return Response({
                    'success': True,
                    'message': f'QR code email sent to {member.email}'
                })
            else:
                return Response({
                    'success': False,
                    'message': 'Failed to send email. Check your email settings.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Error sending email: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MemberAlertViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Member Alerts
    
    Endpoints:
    - GET /alerts/ - List all alerts
    - POST /alerts/ - Create new alert
    - GET /alerts/{id}/ - Get alert details
    - PUT /alerts/{id}/ - Update alert
    """
    
    queryset = MemberAlert.objects.all()
    serializer_class = MemberAlertSerializer
    
    @action(detail=False, methods=['get'])
    def unresolved(self, request):
        """Get all unresolved alerts. Always recalculates to ensure fresh data."""
        try:
            from members.utils import recalculate_member_alerts
            # Recalculate alerts before returning to ensure they're based on current data
            recalculate_member_alerts()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error recalculating alerts: {str(e)}")
        
        alerts = MemberAlert.objects.filter(is_resolved=False).order_by('-created_at')
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_level(self, request):
        """Get alerts by level. Usage: /alerts/by_level/?level=critical"""
        level = request.query_params.get('level')
        if not level:
            return Response(
                {'error': 'level query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        alerts = MemberAlert.objects.filter(alert_level=level, is_resolved=False).order_by('-created_at')
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def recalculate(self, request):
        """
        Recalculate all alerts based on actual attendance data.
        This rebuilds alerts for members with absences from sessions.
        Useful if alerts are out of sync with attendance data.
        """
        from members.utils import recalculate_member_alerts
        
        try:
            summary = recalculate_member_alerts()
            return Response({
                'success': True,
                'message': 'Alerts recalculated successfully',
                'summary': summary
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': f'Failed to recalculate alerts: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def diagnostic(self, request):
        """
        Get diagnostic information about alerts and member absences.
        Helps debug why alerts may not be showing.
        """
        from attendance.models import Attendance
        from services.models import Service
        from datetime import timedelta

        three_months_ago = timezone.now().date() - timedelta(days=90)
        
        # Count total attendance records
        total_attendance = Attendance.objects.count()
        recent_attendance = Attendance.objects.filter(
            service__date__gte=three_months_ago
        ).count()
        
        # Count by status
        present_count = Attendance.objects.filter(status='present').count()
        absent_count = Attendance.objects.filter(status='absent').count()
        
        # Count by member
        members_with_attendance = set(
            Attendance.objects.values_list('member_id', flat=True).distinct()
        )
        
        # Count members with absences
        members_with_absences = set(
            Attendance.objects.filter(status='absent').values_list('member_id', flat=True).distinct()
        )
        
        # Get members and their absence counts
        members_data = []
        for member in Member.objects.filter(is_visitor=False):
            member_absences = Attendance.objects.filter(
                member=member,
                status='absent',
                service__date__gte=three_months_ago
            ).count()
            
            if member_absences > 0:
                members_data.append({
                    'member_id': member.id,
                    'name': member.full_name,
                    'absences_last_90_days': member_absences,
                    'database_consecutive_absences': member.consecutive_absences,
                    'attendance_status': member.attendance_status,
                    'has_unresolved_alert': MemberAlert.objects.filter(
                        member=member,
                        is_resolved=False
                    ).exists()
                })
        
        # Count alerts
        total_alerts = MemberAlert.objects.count()
        unresolved_alerts = MemberAlert.objects.filter(is_resolved=False).count()
        early_warning_alerts = MemberAlert.objects.filter(
            alert_level='early_warning',
            is_resolved=False
        ).count()
        at_risk_alerts = MemberAlert.objects.filter(
            alert_level='at_risk',
            is_resolved=False
        ).count()
        critical_alerts = MemberAlert.objects.filter(
            alert_level='critical',
            is_resolved=False
        ).count()
        
        return Response({
            'attendance_summary': {
                'total_attendance_records': total_attendance,
                'recent_attendance_records (last 90 days)': recent_attendance,
                'present_count': present_count,
                'absent_count': absent_count,
                'unique_members_with_attendance': len(members_with_attendance),
                'unique_members_with_absences': len(members_with_absences)
            },
            'alert_summary': {
                'total_alerts': total_alerts,
                'unresolved_alerts': unresolved_alerts,
                'early_warning_unresolved': early_warning_alerts,
                'at_risk_unresolved': at_risk_alerts,
                'critical_unresolved': critical_alerts
            },
            'members_with_absences': members_data,
            'notes': [
                'If members have absences but no alerts, run POST /members/alerts/recalculate/',
                'Check that member consecutive_absences matches actual absence count',
                'Early Warning alert needs 2+ absences, At Risk needs 4+ absences, Critical needs 8+ absences'
            ]
        })
    
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve an alert"""
        alert = self.get_object()
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.resolution_notes = request.data.get('resolution_notes', '')
        alert.save()
        serializer = self.get_serializer(alert)
        return Response(serializer.data)


class ContactLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Contact Logs
    
    Endpoints:
    - GET /contact-logs/ - List all contact logs
    - POST /contact-logs/ - Create new contact log
    - GET /contact-logs/{id}/ - Get contact log details
    """
    
    queryset = ContactLog.objects.all()
    serializer_class = ContactLogSerializer
    
    @action(detail=False, methods=['get'])
    def by_member(self, request):
        """Get contact logs for a specific member. Usage: /contact-logs/by_member/?member_id=1"""
        member_id = request.query_params.get('member_id')
        if not member_id:
            return Response(
                {'error': 'member_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logs = ContactLog.objects.filter(member_id=member_id).order_by('-contact_date')
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending_followup(self, request):
        """Get contact logs with pending follow-ups"""
        logs = ContactLog.objects.filter(follow_up_needed=True, follow_up_date__isnull=False).order_by('follow_up_date')
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)


class MemberAbsenteeismAlertViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Member Absenteeism Alerts (NEW SYSTEM)
    
    Ratio-based alerts triggered by absenteeism metrics.
    Thresholds:
    - early_warning: 25-39% absent
    - at_risk: 40-59% absent
    - critical: 60%+ absent
    
    Endpoints:
    - GET /absenteeism-alerts/ - List all alerts
    - GET /absenteeism-alerts/unresolved/ - List unresolved alerts
    - GET /absenteeism-alerts/by-level/ - Filter by level
    - POST /absenteeism-alerts/{id}/resolve/ - Resolve an alert
    """
    
    queryset = MemberAbsenteeismAlert.objects.all()
    serializer_class = MemberAbsenteeismAlertSerializer
    
    @action(detail=False, methods=['get'])
    def unresolved(self, request):
        """Get all unresolved absenteeism alerts"""
        from members.utils import recalculate_all_absenteeism_metrics
        
        # Optionally recalculate metrics if requested
        if request.query_params.get('recalculate') == 'true':
            try:
                recalculate_all_absenteeism_metrics()
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error recalculating absenteeism metrics: {str(e)}")
        
        alerts = MemberAbsenteeismAlert.objects.filter(is_resolved=False).order_by('-created_at')
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_level(self, request):
        """Get alerts by level. Usage: /absenteeism-alerts/by_level/?level=critical"""
        level = request.query_params.get('level')
        if not level:
            return Response(
                {'error': 'level query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        alerts = MemberAbsenteeismAlert.objects.filter(alert_level=level, is_resolved=False).order_by('-created_at')
        serializer = self.get_serializer(alerts, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve an alert"""
        alert = self.get_object()
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.resolution_notes = request.data.get('resolution_notes', 'Resolved through pastoral care')
        alert.save()
        serializer = self.get_serializer(alert)
        return Response(serializer.data)


class MemberAbsenteeismMetricViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Member Absenteeism Metrics (READ-ONLY)
    
    Metrics are calculated from last 10 services with recurring services weighted 1.5x.
    
    Endpoints:
    - GET /absenteeism-metrics/ - List all metrics
    - GET /absenteeism-metrics/{id}/ - Get metric details
    - GET /absenteeism-metrics/by_member/ - Get metric for a specific member
    """
    
    queryset = MemberAbsenteeismMetric.objects.all()
    serializer_class = MemberAbsenteeismMetricSerializer
    
    def list(self, request, *args, **kwargs):
        """Override list to handle empty results gracefully"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_member(self, request):
        """Get absenteeism metric for a specific member. Usage: /absenteeism-metrics/by_member/?member_id=1"""
        member_id = request.query_params.get('member_id')
        if not member_id:
            return Response(
                {'error': 'member_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            metric = MemberAbsenteeismMetric.objects.get(member_id=member_id)
            serializer = self.get_serializer(metric)
            return Response(serializer.data)
        except MemberAbsenteeismMetric.DoesNotExist:
            return Response(
                {'error': f'No absenteeism metric found for member {member_id}'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def recalculate_all(self, request):
        """
        Recalculate all absenteeism metrics.
        This rebuilds metrics for all members based on actual attendance data.
        """
        from members.utils import recalculate_all_absenteeism_metrics
        
        try:
            summary = recalculate_all_absenteeism_metrics()
            return Response({
                'success': True,
                'message': 'Absenteeism metrics recalculated',
                'summary': summary
            })
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error recalculating metrics: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
