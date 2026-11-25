"""
Celery tasks for services app.

This module contains asynchronous tasks like auto-marking members as absent
when service end times pass.
"""
from celery import shared_task
from django.utils import timezone
from django.db.models import Count
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def _mark_absent_for_current_tenant():
    from services.models import Service
    from attendance.models import Attendance
    from members.models import Member
    from members.utils import update_absenteeism_alerts

    now = timezone.now().time()
    today = timezone.now().date()
    ended_services = Service.objects.filter(
        date=today,
        end_time__isnull=False,
        end_time__lt=now,
    ).exclude(
        id__in=Attendance.objects.filter(
            service__date=today,
            service__end_time__isnull=False,
        ).values('service_id').annotate(
            count=Count('id')
        ).filter(
            count=Count('service__attendances')
        ).values_list('service_id', flat=True)
    )

    summary = {
        'services_processed': 0,
        'total_members_marked': 0,
        'alerts_updated': 0,
        'errors': [],
    }
    for service in ended_services:
        try:
            members = Member.objects.filter(is_visitor=False)
            for member in members:
                existing = Attendance.objects.filter(
                    member=member,
                    service=service,
                ).first()
                if existing:
                    continue

                Attendance.objects.create(
                    member=member,
                    service=service,
                    status='absent',
                    marked_by='auto',
                    is_auto_marked=True,
                )
                update_absenteeism_alerts(member)
                summary['total_members_marked'] += 1
                summary['alerts_updated'] += 1

            summary['services_processed'] += 1
            logger.info(
                'Auto-marked %s (%s): %s members marked absent',
                service.name,
                service.date,
                summary['total_members_marked'],
            )
        except Exception as exc:
            error_msg = f'Error processing service {service.id}: {exc}'
            logger.error(error_msg, exc_info=True)
            summary['errors'].append(error_msg)

    return summary


@shared_task(bind=True, max_retries=3)
def auto_mark_absent_for_ended_services(self):
    """
    Periodic task that auto-marks absent for services that have ended.
    
    This task runs every 5 minutes and checks for services where:
    1. The service has an end_time
    2. Current time is past the end_time
    3. Members haven't checked in and haven't been marked absent
    
    It updates member absence tracking and creates alerts automatically.
    
    Returns:
        dict: Summary of marked members
    """
    try:
        summary = {
            'services_processed': 0,
            'total_members_marked': 0,
            'alerts_updated': 0,
            'errors': [],
        }
        from tenants.context import tenant_context
        from tenants.models import Tenant

        for tenant in Tenant._base_manager.all().iterator():
            with tenant_context(tenant):
                tenant_summary = _mark_absent_for_current_tenant()
            for key in ('services_processed', 'total_members_marked', 'alerts_updated'):
                summary[key] += tenant_summary[key]
            summary['errors'].extend(tenant_summary['errors'])

        logger.info(f"Auto-mark absent task completed. Summary: {summary}")
        return summary
        
    except Exception as exc:
        logger.error(f"Error in auto_mark_absent_for_ended_services: {str(exc)}", exc_info=True)
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True)
def recalculate_all_alerts(self):
    """
    Task to recalculate all member alerts.
    
    This can be triggered manually or called after bulk attendance changes.
    Uses the new ratio-based alert system.
    
    Returns:
        dict: Summary of recalculation
    """
    try:
        from members.utils import recalculate_all_absenteeism_metrics
        from tenants.context import tenant_context
        from tenants.models import Tenant
        
        logger.info("Starting recalculation of all member alerts...")
        summary = {}
        for tenant in Tenant._base_manager.all().iterator():
            with tenant_context(tenant):
                tenant_summary = recalculate_all_absenteeism_metrics()
            for key, value in tenant_summary.items():
                if isinstance(value, (int, float)):
                    summary[key] = summary.get(key, 0) + value
                elif value:
                    summary.setdefault('tenant_details', {})[tenant.slug] = {
                        **summary.get('tenant_details', {}).get(tenant.slug, {}),
                        key: value,
                    }
        logger.info(f"Alert recalculation complete: {summary}")
        
        return summary
        
    except Exception as exc:
        logger.error(f"Error in recalculate_all_alerts: {str(exc)}", exc_info=True)
        raise


@shared_task(bind=True)
def recalculate_member_alerts_async(self):
    """
    Async task to recalculate member alerts after service deletion.
    
    This is called asynchronously to avoid blocking the DELETE request
    when dealing with large numbers of members.
    
    Returns:
        dict: Summary of recalculation
    """
    try:
        from members.utils import recalculate_member_alerts
        from tenants.context import tenant_context
        from tenants.models import Tenant
        
        logger.info("Starting async recalculation of member alerts (triggered by service deletion)...")
        summary = {}
        for tenant in Tenant._base_manager.all().iterator():
            with tenant_context(tenant):
                tenant_summary = recalculate_member_alerts()
            for key, value in tenant_summary.items():
                if isinstance(value, (int, float)):
                    summary[key] = summary.get(key, 0) + value
                elif value:
                    summary.setdefault('tenant_details', {})[tenant.slug] = {
                        **summary.get('tenant_details', {}).get(tenant.slug, {}),
                        key: value,
                    }
        logger.info(f"Alert recalculation complete: {summary}")
        
        return summary
        
    except Exception as exc:
        logger.error(f"Error in recalculate_member_alerts_async: {str(exc)}", exc_info=True)
        raise
