from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import MemberViewSet

router = SimpleRouter()
router.register(r'', MemberViewSet, basename='member')

urlpatterns = [
    path('', include(router.urls)),
]
