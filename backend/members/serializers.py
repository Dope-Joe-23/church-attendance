from rest_framework import serializers
from .models import Member, MemberAlert, ContactLog, MemberAbsenteeismMetric, MemberAbsenteeismAlert


class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = [
            'id',
            'member_id',
            'full_name',
            'phone',
            'email',
            'department',
            'group',
            'location',
            'is_visitor',
            'baptised',
            'confirmed',
            'qr_code_image',
            'qr_code_data',
            'consecutive_absences',
            'last_attendance_date',
            'attendance_status',
            'engagement_score',
            'last_contact_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'member_id', 'qr_code_image', 'qr_code_data', 'created_at', 'updated_at', 
                           'consecutive_absences', 'last_attendance_date', 'attendance_status', 
                           'engagement_score', 'last_contact_date']


class MemberDetailSerializer(serializers.ModelSerializer):
    alerts = serializers.SerializerMethodField()
    absenteeism_alerts = serializers.SerializerMethodField()
    absenteeism_metric = serializers.SerializerMethodField()
    recent_contacts = serializers.SerializerMethodField()
    attendance_history = serializers.SerializerMethodField()
    
    class Meta:
        model = Member
        fields = '__all__'
        read_only_fields = ['id', 'member_id', 'qr_code_image', 'qr_code_data', 'created_at', 'updated_at',
                           'consecutive_absences', 'last_attendance_date', 'attendance_status',
                           'engagement_score', 'last_contact_date', 'current_absenteeism_ratio']
    
    def get_alerts(self, obj):
        alerts = obj.alerts.filter(is_resolved=False)
        return MemberAlertSerializer(alerts, many=True).data
    
    def get_absenteeism_alerts(self, obj):
        """Get the latest unresolved absenteeism alert"""
        alert = obj.absenteeism_alerts.filter(is_resolved=False).first()
        if alert:
            return MemberAbsenteeismAlertSerializer(alert).data
        return None
    
    def get_absenteeism_metric(self, obj):
        """Get the absenteeism metric if it exists"""
        try:
            metric = obj.absenteeism_metric
            return MemberAbsenteeismMetricSerializer(metric).data
        except:
            return None
    
    def get_recent_contacts(self, obj):
        contacts = obj.contact_logs.all()[:5]
        return ContactLogSerializer(contacts, many=True).data
    
    def get_attendance_history(self, obj):
        """Get recent attendance records for display in care dashboard"""
        from attendance.models import Attendance
        # Get last 10 attendance records
        attendances = Attendance.objects.filter(member=obj).order_by('-service__date')[:10]
        return AttendanceDetailSerializer(attendances, many=True).data


class AttendanceDetailSerializer(serializers.Serializer):
    """Serializer for attendance records with service details"""
    id = serializers.IntegerField()
    status = serializers.CharField()
    marked_by = serializers.CharField()
    check_in_time = serializers.DateTimeField(required=False, allow_null=True)
    service_id = serializers.SerializerMethodField()
    service_name = serializers.SerializerMethodField()
    service_date = serializers.SerializerMethodField()
    service_is_recurring = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField()
    
    def get_service_id(self, obj):
        return obj.service.id
    
    def get_service_name(self, obj):
        return obj.service.name
    
    def get_service_date(self, obj):
        return obj.service.date
    
    def get_service_is_recurring(self, obj):
        return obj.service.parent_service is not None


class MemberAlertSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    
    class Meta:
        model = MemberAlert
        fields = [
            'id',
            'member',
            'member_name',
            'alert_level',
            'reason',
            'is_resolved',
            'created_at',
            'resolved_at',
            'resolution_notes',
        ]
        read_only_fields = ['id', 'created_at', 'resolved_at']


class ContactLogSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    
    class Meta:
        model = ContactLog
        fields = [
            'id',
            'member',
            'member_name',
            'contact_method',
            'message_sent',
            'contacted_by',
            'response_received',
            'follow_up_needed',
            'follow_up_date',
            'contact_date',
        ]
        read_only_fields = ['id', 'contact_date']

class MemberAbsenteeismMetricSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    absenteeism_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = MemberAbsenteeismMetric
        fields = [
            'id',
            'member',
            'member_name',
            'total_services',
            'absent_count',
            'present_count',
            'weighted_absent',
            'weighted_total',
            'absenteeism_ratio',
            'absenteeism_percentage',
            'recurring_absent',
            'recurring_present',
            'onetime_absent',
            'onetime_present',
            'last_updated',
            'created_at',
        ]
        read_only_fields = [
            'id', 'member', 'total_services', 'absent_count', 'present_count',
            'weighted_absent', 'weighted_total', 'absenteeism_ratio', 
            'recurring_absent', 'recurring_present', 'onetime_absent', 'onetime_present',
            'last_updated', 'created_at'
        ]
    
    def get_absenteeism_percentage(self, obj):
        return round(obj.absenteeism_ratio * 100, 1)


class MemberAbsenteeismAlertSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.full_name', read_only=True)
    absenteeism_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = MemberAbsenteeismAlert
        fields = [
            'id',
            'member',
            'member_name',
            'alert_level',
            'absenteeism_ratio_at_creation',
            'absenteeism_percentage',
            'absent_count_at_creation',
            'total_services_at_creation',
            'reason',
            'is_resolved',
            'created_at',
            'resolved_at',
            'resolution_notes',
        ]
        read_only_fields = [
            'id', 'member', 'alert_level', 'absenteeism_ratio_at_creation',
            'absent_count_at_creation', 'total_services_at_creation', 'reason',
            'created_at', 'resolved_at'
        ]
    
    def get_absenteeism_percentage(self, obj):
        return round(obj.absenteeism_ratio_at_creation * 100, 1)