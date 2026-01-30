from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import ServiceViewSet

router = SimpleRouter()
router.register(r'', ServiceViewSet, basename='service')

urlpatterns = [
    path('', include(router.urls)),
]
