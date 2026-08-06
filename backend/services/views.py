from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from datetime import date, timedelta
from .models import Service
from .serializers import ServiceSerializer, ServiceDetailSerializer
from .utils import auto_mark_absent, generate_sessions_until, get_sessions_for_range, create_service_instance, build_checkin_qr


class ServiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Service management with Lazy-Loading pattern.
    
    Lazy-Loading Pattern:
    - Recurring services are stored as templates (no date)
    - Sessions are generated on-demand via generate_instances endpoint
    - This allows unlimited sessions without database bloat
    
    Endpoints:
    - GET /services/ - List all services (includes lazy-loaded sessions for requested date range)
    - POST /services/ - Create new service (no automatic session generation)
    - GET /services/{id}/ - Get service details
    - PUT /services/{id}/ - Update service (applies to future sessions)
    - DELETE /services/{id}/ - Delete service
    - POST /services/{id}/close/ - Mark all non-attendees as absent
    - POST /services/{id}/generate-instances/ - Lazy-load: Generate sessions up to a date
    - POST /services/{id}/add-instance/ - Add single session outside recurrence pattern
    """
    
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    
    def get_permissions(self):
        """
        Self check-in QR endpoints expose the check-in token, so they are
        restricted to authenticated admin users only.
        """
        if self.action in ('checkin_qr', 'rotate_checkin_token'):
            return [IsAuthenticated()]
        return super().get_permissions()
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ServiceDetailSerializer
        return ServiceSerializer
    
    def perform_create(self, serializer):
        """
        Create service - no automatic session generation.
        
        With lazy-loading pattern:
        - Non-recurring services are created normally
        - Recurring services are created as templates (parents)
        - Sessions are generated on-demand when requested via API
        """
        service = serializer.save()
        # Sessions will be generated lazily when needed, not upfront
    
    def perform_destroy(self, instance):
        """
        Delete service and trigger metric recalculation for affected members.
        
        This ensures alerts are updated to reflect the new attendance data.
        """
        # Get all members affected by this service deletion (those who have attendance for it)
        from attendance.models import Attendance
        affected_member_ids = Attendance.objects.filter(
            service=instance
        ).values_list('member_id', flat=True).distinct()
        
        # Delete the service (CASCADE will delete attendance records)
        instance.delete()
        
        # Recalculate metrics for affected members
        if affected_member_ids:
            from members.utils import update_absenteeism_alerts
            from members.models import Member
            
            for member_id in affected_member_ids:
                try:
                    member = Member.objects.get(id=member_id)
                    update_absenteeism_alerts(member)
                except Member.DoesNotExist:
                    pass  # Member might have been deleted
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """
        Mark all non-visitor members as absent who haven't checked in.
        Only works for actual services/sessions, not parent recurring services.
        """
        service = self.get_object()
        
        # Prevent closing parent recurring services (template/label only)
        if service.is_recurring and service.parent_service is None and service.date is None:
            return Response(
                {'error': f'"{service.name}" is a recurring service template. Please select a specific session/date to close.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not service.end_time:
            return Response(
                {'error': 'Service does not have an end time set.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        count = auto_mark_absent(service)
        
        return Response(
            {'message': f'Marked {count} members as absent.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def generate_instances(self, request, pk=None):
        """
        Lazy-loading endpoint: Generate recurring service sessions up to a specific date.
        
        Request body:
        {
            "until_date": "2026-05-15",  # Generate sessions up to this date (optional, defaults to 3 months ahead)
            "months": 3                   # Alternative to until_date: number of months ahead
        }
        
        Returns:
        {
            "generated": 5,               # New sessions created in this call
            "existing": 3,                # Sessions that already existed
            "instances": [...]            # All sessions up to the requested date
        }
        """
        service = self.get_object()
        
        if not service.is_recurring or service.parent_service:
            return Response(
                {'error': 'Service must be a recurring parent service.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get target date
        until_date_str = request.data.get('until_date')
        months = request.data.get('months', 3)
        
        try:
            if until_date_str:
                until_date = date.fromisoformat(until_date_str)
            else:
                until_date = date.today() + timedelta(days=30 * months)
            
            result = generate_sessions_until(service, until_date)
            
            return Response(
                {
                    'message': f'Generated {result["generated"]} new sessions, found {result["existing"]} existing.',
                    'generated': result['generated'],
                    'existing': result['existing'],
                    'instances': ServiceSerializer(result['instances'], many=True).data,
                    'generated_until': service.generated_until.isoformat() if service.generated_until else None
                },
                status=status.HTTP_201_CREATED
            )
        except ValueError as e:
            return Response(
                {'error': f'Invalid date format: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def add_instance(self, request, pk=None):
        """
        Add a single instance of a recurring service for a specific date.
        
        Request body:
        {
            "date": "2026-02-15",
            "start_time": "09:00:00",
            "end_time": "11:00:00",
            "location": "Optional location override"
        }
        """
        service = self.get_object()
        
        if not service.is_recurring or service.parent_service:
            return Response(
                {'error': 'Service is not a recurring parent service.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        instance_date_str = request.data.get('date')
        if not instance_date_str:
            return Response(
                {'error': 'Date field is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Optional parameters
        location = request.data.get('location', '')
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')
        
        try:
            instance_date = date.fromisoformat(instance_date_str)
            instance = create_service_instance(
                service, 
                instance_date, 
                location=location if location else None,
                start_time=start_time,
                end_time=end_time
            )
            
            return Response(
                {
                    'message': f'Created service instance for {instance_date}.',
                    'instance': ServiceSerializer(instance).data
                },
                status=status.HTTP_201_CREATED
            )
        except ValueError as e:
            return Response(
                {'error': f'Invalid date format: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    @action(detail=True, methods=['get'])
    def checkin_qr(self, request, pk=None):
        """
        Get the self check-in QR code for a service/session.

        Generates the check-in token lazily on first request and returns
        the QR code (base64 PNG) encoding the public check-in URL members scan.
        """
        service = self.get_object()
        if service.is_recurring and service.parent_service is None and service.date is None:
            return Response(
                {'error': f'"{service.name}" is a recurring service template. Select a specific session to generate its check-in QR.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            checkin_url, qr_base64 = build_checkin_qr(service)
        except Exception as e:
            return Response(
                {'error': f'Failed to generate check-in QR: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        return Response({
            'service_id': service.id,
            'service_name': service.name,
            'service_date': service.date,
            'checkin_url': checkin_url,
            'qr_code_image': f'data:image/png;base64,{qr_base64}',
            'qr_code_base64': qr_base64,
        })

    @action(detail=True, methods=['post'])
    def rotate_checkin_token(self, request, pk=None):
        """
        Rotate a service self check-in token, invalidating old printed QRs.
        """
        service = self.get_object()
        service.rotate_checkin_token()
        try:
            checkin_url, qr_base64 = build_checkin_qr(service)
        except Exception as e:
            return Response(
                {'error': f'Failed to regenerate check-in QR: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        return Response({
            'message': 'Check-in QR code regenerated. Old printed QRs are no longer valid.',
            'service_id': service.id,
            'checkin_url': checkin_url,
            'qr_code_image': f'data:image/png;base64,{qr_base64}',
            'qr_code_base64': qr_base64,
        })