from rest_framework import serializers
from .models import Member, MemberAlert, ContactLog, MemberAbsenteeismMetric, MemberAbsenteeismAlert


class MemberSerializer(serializers.ModelSerializer):
    # Override qr_code_image to return base64 data (or URL if data unavailable)
    qr_code_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Member
        fields = [
            'id',
            'member_id',
            'full_name',
            'date_of_birth',
            'phone',
            'email',
            'place_of_residence',
            'profession',
            'department',
            'class_name',
            'committee',
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
    
    def get_qr_code_image(self, obj):
        """Return base64 QR code data if available, otherwise return URL.
        This avoids CORS/CORB issues when displaying images from different origins."""
        if obj.qr_code_data:
            return f"data:image/png;base64,{obj.qr_code_data}"
        elif obj.qr_code_image:
            return obj.qr_code_image.url
        return None
    
    def validate_full_name(self, value):
        """Validate that full_name is not empty and not duplicated"""
        if not value or not value.strip():
            raise serializers.ValidationError("Full name is required and cannot be empty.")
        return value.strip()
    
    def validate_email(self, value):
        """Validate email and check if already exists (for non-visitors)"""
        if value:
            value = value.lower().strip()
            # Check if email is already used (for non-visitor members)
            existing = Member.objects.filter(email=value, is_visitor=False).exclude(
                pk=self.instance.pk if self.instance else None
            )
            if existing.exists():
                raise serializers.ValidationError("A non-visitor member with this email already exists.")
        return value
    
    def validate_phone(self, value):
        """Clean phone number"""
        if value:
            return value.strip()
        return value
    
    def validate(self, data):
        """Validate overall member data"""
        # At least one contact method should be provided (email or phone)
        email = data.get('email')
        phone = data.get('phone')
        is_visitor = data.get('is_visitor', False)
        
        # Treat empty strings as no value
        email_provided = email and str(email).strip()
        phone_provided = phone and str(phone).strip()
        
        if not email_provided and not phone_provided:
            # Only enforce for non-visitors, visitors often have minimal info
            if not is_visitor:
                raise serializers.ValidationError({
                    'non_field_errors': [
                        "At least one contact method (email or phone) is required for non-visitor members."
                    ]
                })
        return data
    
    def create(self, validated_data):
        """Create member and trigger QR code generation"""
        member = Member.objects.create(**validated_data)
        return member


class MemberDetailSerializer(serializers.ModelSerializer):
    alerts = serializers.SerializerMethodField()
    absenteeism_alerts = serializers.SerializerMethodField()
    absenteeism_metric = serializers.SerializerMethodField()
    recent_contacts = serializers.SerializerMethodField()
    attendance_history = serializers.SerializerMethodField()
    # Override qr_code_image to return base64 data (or URL if data unavailable)
    qr_code_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Member
        fields = '__all__'
        read_only_fields = ['id', 'member_id', 'qr_code_image', 'qr_code_data', 'created_at', 'updated_at',
                           'consecutive_absences', 'last_attendance_date', 'attendance_status',
                           'engagement_score', 'last_contact_date', 'current_absenteeism_ratio']
    
    def get_qr_code_image(self, obj):
        """Return base64 QR code data if available, otherwise return URL.
        This avoids CORS/CORB issues when displaying images from different origins."""
        if obj.qr_code_data:
            return f"data:image/png;base64,{obj.qr_code_data}"
        elif obj.qr_code_image:
            return obj.qr_code_image.url
        return None
    
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