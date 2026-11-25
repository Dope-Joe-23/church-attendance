from django.db import models
import secrets

from tenants.context import tenant_for_data_access
from tenants.models import TenantOwnedModel


class Service(TenantOwnedModel):
    """Model to store church services/meetings"""
    
    RECURRENCE_CHOICES = [
        ('none', 'One-time'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]
    
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    date = models.DateField(null=True, blank=True)  # Nullable for recurring services
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    
    # Recurring service fields
    is_recurring = models.BooleanField(default=False)
    recurrence_pattern = models.CharField(
        max_length=20, 
        choices=RECURRENCE_CHOICES, 
        default='none'
    )
    parent_service = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='instances'
    )
    
    # Lazy-loading tracking: DATE until which instances have been generated
    # Enables on-demand session generation without batch-creating all upfront
    generated_until = models.DateField(null=True, blank=True, help_text="Last date instances were generated until")
    
    # Self check-in token (generated lazily on first request)
    checkin_token = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="Unguessable token for public self check-in QR. Generated lazily."
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.tenant_id:
            self.tenant_id = tenant_for_data_access().pk
        if self.parent_service_id:
            parent_tenant_id = type(self).all_tenants.values_list(
                'tenant_id',
                flat=True,
            ).get(pk=self.parent_service_id)
            if self.tenant_id and self.tenant_id != parent_tenant_id:
                from django.core.exceptions import ValidationError

                raise ValidationError('Parent and child services must belong to the same tenant.')
        super().save(*args, **kwargs)
    
    def get_or_create_checkin_token(self):
        """Lazily generate and return a unique check-in token."""
        if not self.checkin_token:
            self.checkin_token = secrets.token_urlsafe(32)
            self.save(update_fields=['checkin_token', 'updated_at'])
        return self.checkin_token
    
    def rotate_checkin_token(self):
        """Replace the current token with a fresh one, invalidating the old QR."""
        self.checkin_token = secrets.token_urlsafe(32)
        self.save(update_fields=['checkin_token', 'updated_at'])
        return self.checkin_token
    
    class Meta:
        ordering = ['-date', '-start_time']
    
    def __str__(self):
        return f"{self.name} - {self.date} at {self.start_time}"
