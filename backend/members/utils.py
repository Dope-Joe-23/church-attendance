"""
Utility functions for member management and absence tracking.
"""
from datetime import timedelta
from django.utils import timezone
from .models import Member, MemberAlert, ContactLog
from django.db.models import Q
import re


def generate_sequential_member_id():
    """
    Generate a sequential member ID in the format: WIS-YYYY-0001
    
    - WIS: Church prefix (static)
    - YYYY: Current year
    - 0001: Sequential number for the year (incremented for each new member)
    
    Returns:
        str: Generated member ID (e.g., 'WIS-2026-0001')
    """
    from django.utils import timezone
    
    current_year = timezone.now().year
    prefix = f"WIS-{current_year}-"
    
    # Get the highest sequence number for the current year
    # Use regex to find all member IDs matching the pattern WIS-YYYY-XXXX
    members_this_year = Member.objects.filter(
        member_id__startswith=prefix
    ).order_by('member_id')
    
    if not members_this_year.exists():
        # First member of the year
        sequence = 1
    else:
        # Get the last member and extract the sequence number
        last_member = members_this_year.last()
        try:
            # Extract the numeric part (last 4 digits)
            last_sequence = int(last_member.member_id.split('-')[-1])
            sequence = last_sequence + 1
        except (ValueError, IndexError):
            # Fallback if parsing fails
            sequence = members_this_year.count() + 1
    
    # Format as 4-digit sequence
    member_id = f"{prefix}{sequence:04d}"
    return member_id


def update_member_absence_tracking(member, attendance_status):
    """
    Update member's absence tracking when attendance is marked.
    
    Args:
        member: Member instance
        attendance_status: 'present' or 'absent'
    """
    if attendance_status == 'present':
        # Reset absence counter on attendance
        member.consecutive_absences = 0
        member.last_attendance_date = timezone.now().date()
        
        # If member was at risk or inactive, move back to active
        if member.attendance_status in ['at_risk', 'inactive']:
            member.attendance_status = 'active'
        
        # Increase engagement score slightly
        member.engagement_score = min(100, member.engagement_score + 5)
        
    elif attendance_status == 'absent':
        # Increment absence counter
        member.consecutive_absences += 1
        
        # Update attendance status based on absence pattern
        if member.consecutive_absences == 2:
            # Early warning - 2 consecutive absences
            member.attendance_status = 'at_risk'
            alert = MemberAlert.objects.create(
                member=member,
                alert_level='early_warning',
                reason=f'{member.consecutive_absences} consecutive absences - Early warning threshold reached'
            )
        elif member.consecutive_absences == 4:
            # At risk - 4+ consecutive absences
            if member.attendance_status != 'at_risk':
                member.attendance_status = 'at_risk'
            # Update existing early warning alert or create new one
            MemberAlert.objects.filter(
                member=member,
                is_resolved=False,
                alert_level='early_warning'
            ).update(is_resolved=True, resolved_at=timezone.now())
            
            alert = MemberAlert.objects.create(
                member=member,
                alert_level='at_risk',
                reason=f'{member.consecutive_absences} consecutive absences - Engagement concern threshold reached'
            )
        elif member.consecutive_absences == 8:
            # Critical - 8+ consecutive absences
            member.attendance_status = 'inactive'
            # Resolve previous alerts
            MemberAlert.objects.filter(
                member=member,
                is_resolved=False
            ).update(is_resolved=True, resolved_at=timezone.now())
            
            alert = MemberAlert.objects.create(
                member=member,
                alert_level='critical',
                reason=f'{member.consecutive_absences} consecutive absences - Critical alert: Extended absence detected'
            )
        
        # Decrease engagement score
        member.engagement_score = max(0, member.engagement_score - 10)
    
    member.save()


def resolve_member_alert(alert, resolution_notes=''):
    """
    Resolve a specific alert.
    
    Args:
        alert: MemberAlert instance
        resolution_notes: Notes about how the alert was resolved
    """
    alert.is_resolved = True
    alert.resolved_at = timezone.now()
    alert.resolution_notes = resolution_notes
    alert.save()


def get_member_attendance_stats(member):
    """
    Get comprehensive attendance statistics for a member.
    
    Args:
        member: Member instance
    
    Returns:
        dict: Attendance statistics
    """
    from attendance.models import Attendance
    from services.models import Service
    
    # Get services from the last 3 months
    three_months_ago = timezone.now().date() - timedelta(days=90)
    recent_services = Service.objects.filter(date__gte=three_months_ago).count()
    
    # Get attendance records
    attendance_records = Attendance.objects.filter(
        member=member,
        service__date__gte=three_months_ago
    )
    
    present_count = attendance_records.filter(status='present').count()
    absent_count = attendance_records.filter(status='absent').count()
    
    # Calculate percentages
    total_services = present_count + absent_count
    attendance_percentage = (present_count / total_services * 100) if total_services > 0 else 0
    
    return {
        'total_services_last_90_days': recent_services,
        'attended': present_count,
        'absent': absent_count,
        'attendance_percentage': round(attendance_percentage, 2),
        'consecutive_absences': member.consecutive_absences,
        'attendance_status': member.attendance_status,
        'engagement_score': member.engagement_score,
        'last_attendance_date': member.last_attendance_date,
        'last_contact_date': member.last_contact_date,
    }


def get_at_risk_members():
    """
    Get all members that need pastoral attention.
    
    Returns:
        dict: Members grouped by alert level
    """
    early_warning = Member.objects.filter(consecutive_absences=2, attendance_status='at_risk')
    at_risk = Member.objects.filter(consecutive_absences__gte=4, consecutive_absences__lt=8, attendance_status='at_risk')
    critical = Member.objects.filter(consecutive_absences__gte=8, attendance_status='inactive')
    
    return {
        'early_warning': early_warning,
        'at_risk': at_risk,
        'critical': critical,
    }


def log_contact(member, contact_method, message_sent, contacted_by=None, response_received=None, follow_up_needed=False, follow_up_date=None):
    """
    Log a contact attempt with a member.
    
    Args:
        member: Member instance
        contact_method: Method of contact ('email', 'sms', 'phone', 'visit', 'small_group', 'social_media')
        message_sent: Content of the message sent
        contacted_by: Name of person who made contact
        response_received: Member's response
        follow_up_needed: Whether follow-up is needed
        follow_up_date: Date for follow-up
    
    Returns:
        ContactLog: Created contact log instance
    """
    contact_log = ContactLog.objects.create(
        member=member,
        contact_method=contact_method,
        message_sent=message_sent,
        contacted_by=contacted_by,
        response_received=response_received,
        follow_up_needed=follow_up_needed,
        follow_up_date=follow_up_date,
    )
    
    # Update member's last contact date
    member.last_contact_date = timezone.now().date()
    member.save()
    
    return contact_log


def recalculate_member_alerts():
    """
    Recalculate alerts for all members based on actual attendance data.
    Can be called to rebuild alerts if they're missing or out of sync.
    
    This counts absent records from attendance table and generates appropriate alerts.
    Automatically resolves alerts for members with no recent absences.
    
    Returns:
        dict: Summary of recalculated alerts
    """
    from attendance.models import Attendance
    from services.models import Service
    import logging
    logger = logging.getLogger(__name__)
    
    summary = {
        'members_processed': 0,
        'alerts_resolved': 0,
        'early_warning_created': 0,
        'at_risk_created': 0,
        'critical_created': 0,
        'alerts_created': 0
    }
    
    # Get all non-visitor members
    members = Member.objects.filter(is_visitor=False)
    
    for member in members:
        # Count recent absences (from actual attendance data)
        # We count absences from the last 3 months
        three_months_ago = timezone.now().date() - timedelta(days=90)
        
        absent_count = Attendance.objects.filter(
            member=member,
            status='absent',
            service__date__gte=three_months_ago
        ).count()
        
        summary['members_processed'] += 1
        
        # Update member's consecutive_absences based on actual data
        member.consecutive_absences = absent_count
        
        # Determine alert level based on absences
        if absent_count == 0:
            member.attendance_status = 'active'
            # Resolve any existing unresolved alerts for this member
            resolved_count = MemberAlert.objects.filter(
                member=member,
                is_resolved=False
            ).update(is_resolved=True, resolved_at=timezone.now())
            summary['alerts_resolved'] += resolved_count
            logger.info(f"Resolved {resolved_count} alerts for member {member.full_name} (no recent absences)")
        
        elif absent_count >= 2 and absent_count < 4:
            # Early warning: 2-3 absences
            member.attendance_status = 'at_risk'
            
            # Create early warning alert if doesn't exist
            alert_exists = MemberAlert.objects.filter(
                member=member,
                alert_level='early_warning',
                is_resolved=False
            ).exists()
            
            if not alert_exists:
                MemberAlert.objects.create(
                    member=member,
                    alert_level='early_warning',
                    reason=f'{absent_count} absences from sessions - Early warning threshold reached'
                )
                summary['early_warning_created'] += 1
                summary['alerts_created'] += 1
        
        elif absent_count >= 4 and absent_count < 8:
            # At risk: 4-7 absences
            member.attendance_status = 'at_risk'
            
            # Resolve early warning, create at_risk
            MemberAlert.objects.filter(
                member=member,
                alert_level='early_warning',
                is_resolved=False
            ).update(is_resolved=True, resolved_at=timezone.now())
            
            alert_exists = MemberAlert.objects.filter(
                member=member,
                alert_level='at_risk',
                is_resolved=False
            ).exists()
            
            if not alert_exists:
                MemberAlert.objects.create(
                    member=member,
                    alert_level='at_risk',
                    reason=f'{absent_count} absences from sessions - Engagement concern threshold reached'
                )
                summary['at_risk_created'] += 1
                summary['alerts_created'] += 1
        
        elif absent_count >= 8:
            # Critical: 8+ absences
            member.attendance_status = 'inactive'
            
            # Resolve all previous alerts, create critical
            MemberAlert.objects.filter(
                member=member,
                is_resolved=False
            ).update(is_resolved=True, resolved_at=timezone.now())
            
            alert_exists = MemberAlert.objects.filter(
                member=member,
                alert_level='critical',
                is_resolved=False
            ).exists()
            
            if not alert_exists:
                MemberAlert.objects.create(
                    member=member,
                    alert_level='critical',
                    reason=f'{absent_count} absences from sessions - Critical alert: Extended absence detected'
                )
                summary['critical_created'] += 1
                summary['alerts_created'] += 1
        
        # Save updated member
        member.save()
    
    return summary


def calculate_absenteeism_metric(member):
    """
    Calculate absenteeism metric for a member based on last 10 services.
    
    Recurring services are weighted 1.5x in the calculation.
    
    Args:
        member: Member instance
    
    Returns:
        dict: Metric data with keys:
            - total_services
            - absent_count
            - present_count
            - weighted_absent
            - weighted_total
            - absenteeism_ratio (0.0-1.0)
            - recurring_absent
            - recurring_present
            - onetime_absent
            - onetime_present
    """
    from attendance.models import Attendance
    from services.models import Service
    
    # Get last 10 services by date (descending) that have any attendance records
    last_10_services = Service.objects.filter(
        attendances__member=member,
        date__isnull=False
    ).order_by('-date').distinct()[:10]
    
    if not last_10_services:
        # No attendance history, return empty metric
        return {
            'total_services': 0,
            'absent_count': 0,
            'present_count': 0,
            'weighted_absent': 0.0,
            'weighted_total': 0.0,
            'absenteeism_ratio': 0.0,
            'recurring_absent': 0,
            'recurring_present': 0,
            'onetime_absent': 0,
            'onetime_present': 0,
        }
    
    # Count attendance records for these services
    attendance_records = Attendance.objects.filter(
        member=member,
        service__in=last_10_services
    )
    
    total_services = attendance_records.count()
    absent_count = attendance_records.filter(status='absent').count()
    present_count = attendance_records.filter(status='present').count()
    
    # Calculate weights: recurring services count 1.5x
    weighted_absent = 0.0
    weighted_total = 0.0
    recurring_absent = 0
    recurring_present = 0
    onetime_absent = 0
    onetime_present = 0
    
    for record in attendance_records:
        # Check if service is recurring (has a parent_service)
        is_recurring = record.service.parent_service is not None
        weight = 1.5 if is_recurring else 1.0
        
        weighted_total += weight
        
        if record.status == 'absent':
            weighted_absent += weight
            if is_recurring:
                recurring_absent += 1
            else:
                onetime_absent += 1
        else:  # present
            if is_recurring:
                recurring_present += 1
            else:
                onetime_present += 1
    
    # Calculate ratio
    absenteeism_ratio = (weighted_absent / weighted_total) if weighted_total > 0 else 0.0
    
    return {
        'total_services': total_services,
        'absent_count': absent_count,
        'present_count': present_count,
        'weighted_absent': weighted_absent,
        'weighted_total': weighted_total,
        'absenteeism_ratio': absenteeism_ratio,
        'recurring_absent': recurring_absent,
        'recurring_present': recurring_present,
        'onetime_absent': onetime_absent,
        'onetime_present': onetime_present,
    }


def get_alert_level_for_ratio(absenteeism_ratio):
    """
    Determine alert level based on absenteeism ratio.
    
    Args:
        absenteeism_ratio: Float between 0.0 and 1.0
    
    Returns:
        str: 'early_warning', 'at_risk', 'critical', or None
    """
    if absenteeism_ratio >= 0.60:
        return 'critical'
    elif absenteeism_ratio >= 0.40:
        return 'at_risk'
    elif absenteeism_ratio >= 0.25:
        return 'early_warning'
    return None


def update_absenteeism_alerts(member):
    """
    Update absenteeism alerts for a member based on current metrics.
    
    This is the main function to call when attendance changes.
    It calculates the metric, creates/updates the MemberAbsenteeismMetric,
    and creates/resolves MemberAbsenteeismAlerts accordingly.
    
    Args:
        member: Member instance
    
    Returns:
        dict: Result with keys:
            - metric: The calculated metric dict
            - alert_level: The new alert level (or None)
            - alert_created: Boolean
            - alert_resolved: Boolean
            - alert: The MemberAbsenteeismAlert instance (or None)
    """
    from .models import MemberAbsenteeismMetric, MemberAbsenteeismAlert
    from attendance.models import Attendance
    
    result = {
        'metric': None,
        'alert_level': None,
        'alert_created': False,
        'alert_resolved': False,
        'alert': None,
    }
    
    # Calculate metric
    metric_data = calculate_absenteeism_metric(member)
    result['metric'] = metric_data
    
    # Update or create MemberAbsenteeismMetric
    metric, created = MemberAbsenteeismMetric.objects.get_or_create(member=member)
    metric.total_services = metric_data['total_services']
    metric.absent_count = metric_data['absent_count']
    metric.present_count = metric_data['present_count']
    metric.weighted_absent = metric_data['weighted_absent']
    metric.weighted_total = metric_data['weighted_total']
    metric.absenteeism_ratio = metric_data['absenteeism_ratio']
    metric.recurring_absent = metric_data['recurring_absent']
    metric.recurring_present = metric_data['recurring_present']
    metric.onetime_absent = metric_data['onetime_absent']
    metric.onetime_present = metric_data['onetime_present']
    metric.save()
    
    # Update member's denormalized ratio field
    member.current_absenteeism_ratio = metric_data['absenteeism_ratio']
    member.save()
    
    # Determine required alert level
    required_alert_level = get_alert_level_for_ratio(metric_data['absenteeism_ratio'])
    result['alert_level'] = required_alert_level
    
    # Find existing unresolved alert
    existing_alert = MemberAbsenteeismAlert.objects.filter(
        member=member,
        is_resolved=False
    ).first()
    
    if required_alert_level is None:
        # No alert needed - resolve any existing alert
        if existing_alert:
            existing_alert.is_resolved = True
            existing_alert.resolved_at = timezone.now()
            existing_alert.resolution_notes = 'Absenteeism ratio dropped below threshold'
            existing_alert.save()
            result['alert_resolved'] = True
    else:
        # Alert is needed
        if existing_alert and existing_alert.alert_level == required_alert_level:
            # Alert exists at same level, just update it
            result['alert'] = existing_alert
        else:
            # Need to create new alert or replace existing
            if existing_alert:
                # Resolve old alert
                existing_alert.is_resolved = True
                existing_alert.resolved_at = timezone.now()
                existing_alert.resolution_notes = 'Alert level changed'
                existing_alert.save()
            
            # Create new alert
            reason = f"{metric_data['absent_count']} absences out of {metric_data['total_services']} services ({metric_data['absenteeism_ratio']:.1%})"
            alert = MemberAbsenteeismAlert.objects.create(
                member=member,
                alert_level=required_alert_level,
                absenteeism_ratio_at_creation=metric_data['absenteeism_ratio'],
                absent_count_at_creation=metric_data['absent_count'],
                total_services_at_creation=metric_data['total_services'],
                reason=reason,
            )
            result['alert'] = alert
            result['alert_created'] = True
    
    return result


def recalculate_all_absenteeism_metrics():
    """
    Recalculate absenteeism metrics and alerts for all members.
    
    This is the batch operation to sync all member metrics and alerts.
    Called after service deletion, bulk attendance changes, etc.
    
    Returns:
        dict: Summary of the recalculation
    """
    import logging
    logger = logging.getLogger(__name__)
    
    summary = {
        'members_processed': 0,
        'alerts_created': 0,
        'alerts_resolved': 0,
        'early_warning_count': 0,
        'at_risk_count': 0,
        'critical_count': 0,
    }
    
    members = Member.objects.filter(is_visitor=False)
    
    for member in members:
        result = update_absenteeism_alerts(member)
        summary['members_processed'] += 1
        
        if result['alert_created']:
            summary['alerts_created'] += 1
            if result['alert_level'] == 'early_warning':
                summary['early_warning_count'] += 1
            elif result['alert_level'] == 'at_risk':
                summary['at_risk_count'] += 1
            elif result['alert_level'] == 'critical':
                summary['critical_count'] += 1
        
        if result['alert_resolved']:
            summary['alerts_resolved'] += 1
        
        logger.debug(f"Processed {member.full_name}: ratio={result['metric']['absenteeism_ratio']:.1%}, alert_level={result['alert_level']}")
    
    logger.info(f"Absenteeism metrics recalculation complete. Summary: {summary}")
    return summary
