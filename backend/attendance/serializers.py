from rest_framework import serializers
from .models import Attendance
from members.models import Member
from services.models import Service
from members.serializers import MemberSerializer
from services.serializers import ServiceSerializer


class AttendanceSerializer(serializers.ModelSerializer):
    member_details = MemberSerializer(source='member', read_only=True)
    service_details = ServiceSerializer(source='service', read_only=True)
    
    class Meta:
        model = Attendance
        fields = [
            'id',
            'member',
            'member_details',
            'service',
            'service_details',
            'check_in_time',
            'status',
            'is_auto_marked',
            'notes',
            'created_at',
        ]
        read_only_fields = ['id', 'check_in_time', 'created_at', 'is_auto_marked']


class AttendanceCheckInSerializer(serializers.Serializer):
    """Serializer for check-in via QR code"""
    member_id = serializers.CharField(max_length=50)
    service_id = serializers.IntegerField()
    
    def validate_member_id(self, value):
        try:
            Member.objects.get(member_id=value)
        except Member.DoesNotExist:
            raise serializers.ValidationError(f"Member with ID {value} not found")
        return value
    
    def validate_service_id(self, value):
        try:
            Service.objects.get(id=value)
        except Service.DoesNotExist:
            raise serializers.ValidationError(f"Service with ID {value} not found")
        return value
