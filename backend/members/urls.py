from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import (
    MemberViewSet, MemberAlertViewSet, ContactLogViewSet,
    MemberAbsenteeismAlertViewSet, MemberAbsenteeismMetricViewSet
)

router = SimpleRouter()
router.register(r'alerts', MemberAlertViewSet, basename='alert')
router.register(r'contact-logs', ContactLogViewSet, basename='contact-log')
router.register(r'absenteeism-alerts', MemberAbsenteeismAlertViewSet, basename='absenteeism-alert')
router.register(r'absenteeism-metrics', MemberAbsenteeismMetricViewSet, basename='absenteeism-metric')
router.register(r'', MemberViewSet, basename='member')  # Must be last - most generic pattern

urlpatterns = [    path('', include(router.urls)),
]