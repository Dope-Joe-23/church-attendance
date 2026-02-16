from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import date
from .models import Service
from .serializers import ServiceSerializer, ServiceDetailSerializer
from .utils import auto_mark_absent, generate_recurring_service_instances, create_service_instance


class ServiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Service management
    
    Endpoints:
    - GET /services/ - List all services
    - POST /services/ - Create new service
    - GET /services/{id}/ - Get service details
    - PUT /services/{id}/ - Update service
    - DELETE /services/{id}/ - Delete service
    - POST /services/{id}/close/ - Mark all non-attendees as absent
    - POST /services/{id}/generate-instances/ - Generate recurring service instances
    """
    
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ServiceDetailSerializer
        return ServiceSerializer
    
    def perform_create(self, serializer):
        """Override create to handle recurring services"""
        service = serializer.save()
        
        # If this is a recurring service, generate initial instances
        if service.is_recurring and not service.parent_service:
            # Generate instances for next 3 months
            generate_recurring_service_instances(service)
    
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
        Generate recurring service instances for the next N months.
        """
        service = self.get_object()
        
        if not service.is_recurring:
            return Response(
                {'error': 'Service is not a recurring service.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        months = request.data.get('months', 3)
        
        try:
            from datetime import timedelta
            end_date = date.today() + timedelta(days=30 * months)
            instances = generate_recurring_service_instances(
                service,
                start_date=date.today(),
                end_date=end_date
            )
            
            return Response(
                {
                    'message': f'Generated {len(instances)} service instances.',
                    'instances': ServiceSerializer(instances, many=True).data
                },
                status=status.HTTP_201_CREATED
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