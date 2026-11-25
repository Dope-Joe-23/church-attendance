from django.db import models
from django.core.exceptions import ValidationError
from members.models import Member
from services.models import Service
from tenants.context import tenant_for_data_access
from tenants.models import TenantOwnedModel


class Attendance(TenantOwnedModel):
    """Model to store attendance records"""
    
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
    ]
    
    MARKED_BY_CHOICES = [
        ('check_in', 'QR Code Check-In'),
        ('manual', 'Manual Entry'),
        ('auto', 'Automatic (end of service)'),
    ]
    
    id = models.AutoField(primary_key=True)
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='attendances')
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='attendances')
    check_in_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='present')
    marked_by = models.CharField(max_length=20, choices=MARKED_BY_CHOICES, default='manual', 
                                  help_text="Source of attendance marking: QR check-in, manual entry, or automatic at service end")
    notes = models.TextField(blank=True, null=True)
    is_auto_marked = models.BooleanField(default=False)  # DEPRECATED: use marked_by='auto' instead
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['member', 'service']

    def save(self, *args, **kwargs):
        if not self.tenant_id:
            self.tenant = tenant_for_data_access()
        if (
            self.member.tenant_id != self.tenant_id
            or self.service.tenant_id != self.tenant_id
        ):
            raise ValidationError('Attendance, member, and service must belong to the same tenant.')
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.member.full_name} - {self.service.name} ({self.status})"
