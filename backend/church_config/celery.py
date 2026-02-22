"""
Celery configuration for church_config project.

Celery is used for asynchronous tasks like auto-marking absent members
when service end times pass.
"""
import os
from celery import Celery
from celery.schedules import crontab

# Set default Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')

app = Celery('church_config')

# Load config from Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all registered Django apps
app.autodiscover_tasks()

# Configure Celery Beat Schedule for periodic tasks
app.conf.beat_schedule = {
    'auto-mark-absent-for-ended-services': {
        'task': 'services.tasks.auto_mark_absent_for_ended_services',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
        'options': {'queue': 'default'}
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
