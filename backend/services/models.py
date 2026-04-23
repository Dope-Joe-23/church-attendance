from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver


class Service(models.Model):
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
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-date', '-start_time']
    
    def __str__(self):
        return f"{self.name} - {self.date} at {self.start_time}"


@receiver(post_delete, sender=Service)
def recalculate_alerts_on_service_delete(sender, instance, **kwargs):
    """
    Recalculate member alerts when a service is deleted.
    This ensures alerts are based on actual attendance data, not phantom services.
    
    Runs asynchronously to avoid blocking the DELETE request.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        from services.tasks import recalculate_member_alerts_async
        logger.info(f"Service deleted: {instance.name}. Queuing async alert recalculation...")
        # Queue the task asynchronously - don't wait for it to complete
        recalculate_member_alerts_async.delay()
        logger.info(f"Alert recalculation task queued successfully")
    except Exception as e:
        logger.error(f"Failed to queue alert recalculation after service deletion: {str(e)}", exc_info=True)
