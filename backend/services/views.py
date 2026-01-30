from rest_framework import viewsets
from .models import Service
from .serializers import ServiceSerializer, ServiceDetailSerializer


class ServiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Service management
    
    Endpoints:
    - GET /services/ - List all services
    - POST /services/ - Create new service
    - GET /services/{id}/ - Get service details
    - PUT /services/{id}/ - Update service
    - DELETE /services/{id}/ - Delete service
    """
    
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ServiceDetailSerializer
        return ServiceSerializer
