from django.db import models
import qrcode
from io import BytesIO
from django.core.files import File
from PIL import Image
import uuid
from django.db.models.signals import post_save
from django.dispatch import receiver


class Member(models.Model):
    """Model to store church member information"""
    
    # Department choices
    DEPARTMENT_CHOICES = [
        ('worship', 'Worship'),
        ('outreach', 'Outreach'),
        ('youth', 'Youth'),
        ('administration', 'Administration'),
    ]
    
    # Group choices
    GROUP_CHOICES = [
        ('group_a', 'Group A'),
        ('group_b', 'Group B'),
        ('group_c', 'Group C'),
        ('group_d', 'Group D'),
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
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    department = models.CharField(max_length=100, choices=DEPARTMENT_CHOICES, blank=True, null=True)
    group = models.CharField(max_length=100, choices=GROUP_CHOICES, blank=True, null=True)
    is_visitor = models.BooleanField(default=False)
    qr_code_image = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    
    # Absence & Engagement Tracking
    consecutive_absences = models.IntegerField(default=0)
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
        """Override save to generate QR code on member creation"""
        # Generate member_id if not provided
        if not self.member_id:
            self.member_id = str(uuid.uuid4())[:8].upper()
        
        # Generate QR code
        if not self.qr_code_image:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            qr.add_data(self.member_id)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Save to BytesIO
            img_io = BytesIO()
            img.save(img_io, 'PNG')
            img_io.seek(0)
            
            # Save to model
            self.qr_code_image.save(
                f"qr_code_{self.member_id}.png",
                File(img_io),
                save=False
            )
        
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
