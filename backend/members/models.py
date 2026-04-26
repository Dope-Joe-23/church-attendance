from django.db import models
from django.contrib.auth.models import User
import qrcode
from io import BytesIO
from django.core.files import File
from PIL import Image
from django.db.models.signals import post_save
from django.dispatch import receiver
import secrets
from datetime import timedelta
from django.utils import timezone


class InvitationCode(models.Model):
    """Model for managing user registration invitations"""
    
    code = models.CharField(max_length=32, unique=True, db_index=True)
    email = models.EmailField(blank=True, null=True, help_text="If set, code can only be used with this email")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='invitation_codes_created')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="Invitation code expires after this date")
    used = models.BooleanField(default=False)
    used_by = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='registered_with_code')
    used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Invitation ({self.email or 'any'}) - {'Used' if self.used else 'Pending'}"
    
    @staticmethod
    def generate_code():
        """Generate a unique invitation code"""
        return secrets.token_urlsafe(24)
    
    @classmethod
    def create_invitation(cls, created_by, email=None, days_valid=7):
        """Create a new invitation code"""
        code = cls.generate_code()
        expires_at = timezone.now() + timedelta(days=days_valid)
        return cls.objects.create(
            code=code,
            email=email,
            created_by=created_by,
            expires_at=expires_at
        )
    
    def is_valid(self):
        """Check if invitation code is still valid"""
        if self.used:
            return False
        if timezone.now() > self.expires_at:
            return False
        return True
    
    def mark_used(self, user):
        """Mark invitation as used"""
        self.used = True
        self.used_by = user
        self.used_at = timezone.now()
        self.save()


class Member(models.Model):
    """Model to store church member information"""
    
    # Department choices
    DEPARTMENT_CHOICES = [
        ('technical', 'Technical'),
        ('media', 'Media'),
        ('echoes_of_grace', 'Echoes of Grace'),
        ('celestial_harmony_choir', 'Celestial Harmony Choir'),
        ('heavenly_vibes', 'Heavenly Vibes'),
        ('prayer_evangelism', 'Prayer and Evangelism'),
        ('visitor_care', 'Visitor Care'),
        ('protocol_ushering', 'Protocol & Ushering'),
    ]
    
    # Class choices (formerly Group)
    CLASS_CHOICES = [
        ('airport', 'Airport'),
        ('abesim', 'Abesim'),
        ('old_abesim', 'Old Abesim'),
        ('asufufu_adomako', 'Asufufu / Adomako'),
        ('baakoniaba', 'Baakoniaba'),
        ('berlin_top_class_1', 'Berlin Top class 1'),
        ('berlin_top_class_2', 'Berlin Top class 2'),
        ('penkwase_class_1', 'Penkwase class 1'),
        ('penkwase_class_2', 'Penkwase class 2'),
        ('mayfair', 'Mayfair'),
        ('odumase', 'Odumase'),
        ('new_dormaa_kotokrom', 'New Dormaa / Kotokrom'),
        ('dumasua', 'Dumasua'),
        ('fiapre_class_1', 'Fiapre Class 1'),
        ('fiapre_class_2', 'Fiapre Class 2'),
        ('magazine', 'Magazine'),
        ('town_centre', 'Town Centre'),
        ('newtown_estate', 'Newtown/Estate'),
        ('distance', 'Distance'),
    ]
    
    # Committee choices
    COMMITTEE_CHOICES = [
        ('finance', 'Finance'),
        ('audit', 'Audit'),
        ('project', 'Project'),
        ('life_builders', 'Life Builders'),
        ('health', 'Health'),
        ('welfare', 'Welfare'),
        ('harvest', 'Harvest'),
    ]

    # Sex choices
    SEX_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female')
    ]
    
    # Marital status choices
    MARITAL_STATUS = [
        ('single', 'Single'),
        ('married', 'Married')
    ]
    
    # Attendance Status choices
    ATTENDANCE_STATUS_CHOICES = [
        ('active', 'Active - Good Attendance'),
        ('at_risk', 'At Risk - Pattern Change'),
        ('inactive', 'Inactive - Extended Absence'),
        ('vacation', 'On Vacation'),
    ]
    
    id = models.AutoField(primary_key=True)
    member_id = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=255)
    date_of_birth = models.DateField(blank=True, null=True)
    sex = models.CharField(max_length=10, choices=SEX_CHOICES, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    place_of_residence = models.CharField(max_length=255, blank=True, null=True)
    profession = models.CharField(max_length=255, blank=True, null=True)
    department = models.CharField(max_length=100, choices=DEPARTMENT_CHOICES, blank=True, null=True)
    class_name = models.CharField(max_length=100, choices=CLASS_CHOICES, blank=True, null=True)
    committee = models.CharField(max_length=100, choices=COMMITTEE_CHOICES, blank=True, null=True)
    marital_status = models.CharField(max_length=20, choices=MARITAL_STATUS, blank=True, null=True)
    is_visitor = models.BooleanField(default=False)
    baptised = models.BooleanField(default=False)
    confirmed = models.BooleanField(default=False)
    qr_code_image = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    qr_code_data = models.TextField(blank=True, null=True)  # base64-encoded PNG data of QR code
    
    # Absence & Engagement Tracking
    consecutive_absences = models.IntegerField(default=0)  # DEPRECATED: use current_absenteeism_ratio instead
    current_absenteeism_ratio = models.FloatField(default=0.0)  # Percentage of absences (0.0-1.0) based on last 10 services
    last_attendance_date = models.DateField(null=True, blank=True)
    attendance_status = models.CharField(max_length=20, choices=ATTENDANCE_STATUS_CHOICES, default='active')
    engagement_score = models.IntegerField(default=100)  # 0-100 scale
    last_contact_date = models.DateField(null=True, blank=True)
    pastoral_notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.full_name} ({self.member_id})"
    
    def save(self, *args, **kwargs):
        """Override save to generate sequential member ID and QR code"""
        import base64
        import logging
        from .utils import generate_sequential_member_id
        
        logger = logging.getLogger(__name__)
        
        # Generate sequential member_id if not provided
        if not self.member_id:
            self.member_id = generate_sequential_member_id()
        
        # Generate QR code if we don't already have data
        if not self.qr_code_data:
            try:
                qr = qrcode.QRCode(
                    version=1,
                    error_correction=qrcode.constants.ERROR_CORRECT_L,
                    box_size=10,
                    border=4,
                )
                qr.add_data(self.member_id)
                qr.make(fit=True)
                
                img = qr.make_image(fill_color="black", back_color="white")
                
                # Save to BytesIO buffer
                img_io = BytesIO()
                img.save(img_io, format='PNG')
                img_io.seek(0)  # Reset position for reading
                
                # Encode as base64 for database storage
                qr_png_data = img_io.getvalue()
                self.qr_code_data = base64.b64encode(qr_png_data).decode('utf-8')
                
                # Optionally save as file for backward compatibility (will use Cloudinary if configured)
                if not self.qr_code_image:
                    img_io.seek(0)  # Reset again before saving to file field
                    self.qr_code_image.save(
                        f"qr_code_{self.member_id}.png",
                        File(img_io),
                        save=False  # Don't save yet - we'll do it below
                    )
                    
                logger.info(f"Generated QR code for member {self.member_id}")
                    
            except Exception as e:
                logger.error(f"Error generating QR code for {self.member_id}: {str(e)}")
                # Don't raise - allow member creation even if QR generation fails
        
        # Now save the member record to database
        super().save(*args, **kwargs)
@receiver(post_save, sender=Member)
def send_qr_code_on_creation(sender, instance, created, **kwargs):
    """Send QR code email when a new member is created"""
    if created and instance.email:
        from .email_service import send_qr_code_email
        import logging
        logger = logging.getLogger(__name__)
        try:
            result = send_qr_code_email(instance)
            logger.info(f"QR code email sent to {instance.email}: {result}")
        except Exception as e:
            logger.error(f"Failed to send QR code email to {instance.email}: {str(e)}")


class MemberAlert(models.Model):
    """Model to track alerts for members with absence patterns"""
    
    ALERT_LEVEL_CHOICES = [
        ('early_warning', 'Early Warning - 2 absences'),
        ('at_risk', 'At Risk - 4+ absences'),
        ('critical', 'Critical - 8+ absences'),
    ]
    
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='alerts')
    alert_level = models.CharField(max_length=20, choices=ALERT_LEVEL_CHOICES)
    reason = models.TextField()  # "2 consecutive absences", "4 out of 5 services missed", etc.
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.member.full_name} - {self.alert_level}"


class ContactLog(models.Model):
    """Model to track all outreach and communication with members"""
    
    CONTACT_METHOD_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS Text'),
        ('phone', 'Phone Call'),
        ('visit', 'In-Person Visit'),
        ('small_group', 'Small Group Leader Check-in'),
        ('social_media', 'Social Media Message'),
    ]
    
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='contact_logs')
    contact_method = models.CharField(max_length=20, choices=CONTACT_METHOD_CHOICES)
    message_sent = models.TextField()
    contacted_by = models.CharField(max_length=255, blank=True, null=True)  # Name of person who made contact
    response_received = models.TextField(blank=True, null=True)
    follow_up_needed = models.BooleanField(default=False)
    follow_up_date = models.DateField(null=True, blank=True)
    contact_date = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-contact_date']
    
    def __str__(self):
        return f"{self.member.full_name} - {self.contact_method} ({self.contact_date.strftime('%Y-%m-%d')})"


class MemberAbsenteeismMetric(models.Model):
    """
    Model to store calculated absenteeism metrics for members.
    
    Absenteeism is calculated from the last 10 attended services/sessions.
    Recurring services count with 1.5x weight (considered more important).
    """
    
    member = models.OneToOneField(Member, on_delete=models.CASCADE, related_name='absenteeism_metric')
    
    # Metrics based on last 10 services
    total_services = models.IntegerField(default=0)  # Total services in last 10 (0-10)
    absent_count = models.IntegerField(default=0)  # Number of absences
    present_count = models.IntegerField(default=0)  # Number of presents
    
    # Weighted metrics (recurring services weighted 1.5x)
    weighted_absent = models.FloatField(default=0.0)  # Weighted absence count
    weighted_total = models.FloatField(default=0.0)  # Weighted total count
    absenteeism_ratio = models.FloatField(default=0.0)  # weighted_absent / weighted_total (0.0-1.0)
    
    # Breakdown by service type
    recurring_absent = models.IntegerField(default=0)
    recurring_present = models.IntegerField(default=0)
    onetime_absent = models.IntegerField(default=0)
    onetime_present = models.IntegerField(default=0)
    
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = "Member Absenteeism Metrics"
    
    def __str__(self):
        return f"{self.member.full_name} - {self.absenteeism_ratio:.1%} absent"


class MemberAbsenteeismAlert(models.Model):
    """
    Model for ratio-based alerts triggered by absenteeism metrics.
    
    Alert levels based on absenteeism ratio (not consecutive absences):
    - early_warning: 25-39% absent
    - at_risk: 40-59% absent
    - critical: 60%+ absent
    """
    
    ALERT_LEVEL_CHOICES = [
        ('early_warning', 'Early Warning - 25-39% absent'),
        ('at_risk', 'At Risk - 40-59% absent'),
        ('critical', 'Critical - 60%+ absent'),
    ]
    
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='absenteeism_alerts')
    alert_level = models.CharField(max_length=20, choices=ALERT_LEVEL_CHOICES)
    
    # Snapshot of metrics when alert was created
    absenteeism_ratio_at_creation = models.FloatField()
    absent_count_at_creation = models.IntegerField()
    total_services_at_creation = models.IntegerField()
    
    reason = models.TextField()  # e.g., "3 absences out of 8 services (37.5%)"
    is_resolved = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.member.full_name} - {self.alert_level} ({self.absenteeism_ratio_at_creation:.1%})"