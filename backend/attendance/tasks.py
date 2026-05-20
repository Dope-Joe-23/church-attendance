"""
Celery tasks for attendance workflows.
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def update_member_absenteeism_alerts_async(self, member_id):
    """
    Recalculate one member's absenteeism metrics and alerts after check-in.
    """
    try:
        from members.models import Member
        from members.utils import update_absenteeism_alerts

        member = Member.objects.get(pk=member_id)
        result = update_absenteeism_alerts(member)
        metric = result.get("metric") or {}

        return {
            "member_id": member_id,
            "alert_level": result.get("alert_level"),
            "alert_created": result.get("alert_created", False),
            "alert_resolved": result.get("alert_resolved", False),
            "absenteeism_ratio": metric.get("absenteeism_ratio"),
        }
    except Member.DoesNotExist:
        logger.warning("Skipping absenteeism update for missing member %s", member_id)
        return {"skipped": True, "reason": "member_not_found", "member_id": member_id}
    except Exception as exc:
        logger.error("Error updating absenteeism alerts for member %s", member_id, exc_info=True)
        raise self.retry(exc=exc, countdown=30)
