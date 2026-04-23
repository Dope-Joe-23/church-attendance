from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import date, timedelta
from .models import Service
from .serializers import ServiceSerializer, ServiceDetailSerializer
from .utils import auto_mark_absent, generate_sessions_until, get_sessions_for_range, create_service_instance


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
        Delete service simply and safely.
        
        No dependencies on external systems (Celery/Redis).
        - Service is deleted immediately
        - If needed, alerts can be refreshed on next API call
        - This ensures DELETE always succeeds, regardless of backend availability
        """
        instance.delete()
    
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