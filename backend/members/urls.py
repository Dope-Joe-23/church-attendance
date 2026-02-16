from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import MemberViewSet, MemberAlertViewSet, ContactLogViewSet

router = SimpleRouter()
router.register(r'', MemberViewSet, basename='member')
router.register(r'alerts', MemberAlertViewSet, basename='alert')
router.register(r'contact-logs', ContactLogViewSet, basename='contact-log')

urlpatterns = [
    path('', include(router.urls)),
]
