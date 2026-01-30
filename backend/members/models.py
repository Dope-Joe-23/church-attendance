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
    
    id = models.AutoField(primary_key=True)
    member_id = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    qr_code_image = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
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
