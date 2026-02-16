"""
Utility functions for member management and absence tracking.
"""
from datetime import datetime, timedelta
from .models import Member, MemberAlert, ContactLog
from django.db.models import Q


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
        member.last_attendance_date = datetime.now().date()
        
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
            ).update(is_resolved=True, resolved_at=datetime.now())
            
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
            ).update(is_resolved=True, resolved_at=datetime.now())
            
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
    alert.resolved_at = datetime.now()
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
    three_months_ago = datetime.now().date() - timedelta(days=90)
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
    member.last_contact_date = datetime.now().date()
    member.save()
    
    return contact_log


def recalculate_member_alerts():
    """
    Recalculate alerts for all members based on actual attendance data.
    Can be called to rebuild alerts if they're missing or out of sync.
    
    This counts absent records from attendance table and generates appropriate alerts.
    
    Returns:
        dict: Summary of recalculated alerts
    """
    from attendance.models import Attendance
    from services.models import Service
    
    summary = {
        'members_processed': 0,
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
        three_months_ago = datetime.now().date() - timedelta(days=90)
        
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
            # Resolve any existing alerts
            MemberAlert.objects.filter(
                member=member,
                is_resolved=False
            ).update(is_resolved=True, resolved_at=datetime.now())
        
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
            ).update(is_resolved=True, resolved_at=datetime.now())
            
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
            ).update(is_resolved=True, resolved_at=datetime.now())
            
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

