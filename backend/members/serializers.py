from rest_framework import serializers
from .models import Member, MemberAlert, ContactLog


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
            'consecutive_absences',
            'last_attendance_date',
            'attendance_status',
            'engagement_score',
            'last_contact_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'member_id', 'qr_code_image', 'created_at', 'updated_at', 
                           'consecutive_absences', 'last_attendance_date', 'attendance_status', 
                           'engagement_score', 'last_contact_date']


class MemberDetailSerializer(serializers.ModelSerializer):
    alerts = serializers.SerializerMethodField()
    recent_contacts = serializers.SerializerMethodField()
    
    class Meta:
        model = Member
        fields = '__all__'
        read_only_fields = ['id', 'member_id', 'qr_code_image', 'created_at', 'updated_at',
                           'consecutive_absences', 'last_attendance_date', 'attendance_status',
                           'engagement_score', 'last_contact_date']
    
    def get_alerts(self, obj):
        alerts = obj.alerts.filter(is_resolved=False)
        return MemberAlertSerializer(alerts, many=True).data
    
    def get_recent_contacts(self, obj):
        contacts = obj.contact_logs.all()[:5]
        return ContactLogSerializer(contacts, many=True).data


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
