"""
Service utilities for lazy-loaded recurring services.

Lazy-Loading Pattern:
- Recurring services (parents) don't create child instances upfront
- Instances are generated on-demand when requested via API
- 'generated_until' field tracks the last date instances were created for
- This allows unlimited sessions without massive database bloat
- Parent service changes apply to future (not-yet-created) sessions
"""
from datetime import datetime, timedelta, date
from django.db.models import Q
from .models import Service
from attendance.models import Attendance
from members.models import Member


def get_next_occurrence_date(current_date, recurrence_pattern):
    """
    Calculate the next occurrence date based on recurrence pattern.
    
    Args:
        current_date: Starting date
        recurrence_pattern: 'weekly' or 'monthly'
    
    Returns:
        Next occurrence date
    """
    if recurrence_pattern == 'weekly':
        return current_date + timedelta(days=7)
    
    elif recurrence_pattern == 'monthly':
        # Handle month boundaries (e.g., Jan 31 -> Feb 28)
        if current_date.month == 12:
            next_month_date = current_date.replace(year=current_date.year + 1, month=1)
        else:
            next_month_date = current_date.replace(month=current_date.month + 1)
        
        # If the day doesn't exist in the target month, use the last day of that month
        while next_month_date.day > current_date.day:
            next_month_date = next_month_date.replace(day=next_month_date.day - 1)
        
        return next_month_date
    
    return current_date + timedelta(days=1)


def generate_sessions_until(parent_service, until_date):
    """
    Lazy-load: Generate sessions for a recurring service up to a specific date.
    
    This is the core lazy-loading function. It only generates sessions between
    the last generated date (or service start) and the requested until_date.
    Skips any already-created sessions.
    
    Args:
        parent_service: Service object with is_recurring=True and parent_service=None
        until_date: Generate sessions up to (and including) this date
    
    Returns:
        Dict with keys:
            - 'generated': number of new sessions created in this call
            - 'existing': number of existing sessions found in date range
            - 'instances': QuerySet of all Service instances for this parent up to until_date
    
    Raises:
        ValueError: If service is not a recurring parent
    """
    if not parent_service.is_recurring or parent_service.parent_service is not None:
        raise ValueError("Service must be a recurring parent service (is_recurring=True, parent_service=None)")
    
    # Determine start date for generation
    if parent_service.generated_until:
        # Start from the day after last generation
        start_date = parent_service.generated_until + timedelta(days=1)
    else:
        # First time: use parent's date (for one-time instance) or today
        start_date = parent_service.date or date.today()
    
    # Don't generate into the past
    if until_date < start_date:
        return {
            'generated': 0,
            'existing': 0,
            'instances': Service.objects.filter(
                Q(id=parent_service.id) |
                Q(parent_service=parent_service, date__lte=until_date)
            ).order_by('date')
        }
    
    generated = 0
    existing = 0
    current_date = start_date
    
    while current_date <= until_date:
        # Check if instance already exists for this date
        instance = Service.objects.filter(
            parent_service=parent_service,
            date=current_date
        ).first()
        
        if instance:
            existing += 1
        else:
            # Create new instance with parent's current configuration
            instance = Service.objects.create(
                name=parent_service.name,
                date=current_date,
                start_time=parent_service.start_time,
                end_time=parent_service.end_time,
                location=parent_service.location,
                description=parent_service.description,
                parent_service=parent_service,
            )
            generated += 1
        
        # Move to next occurrence
        current_date = get_next_occurrence_date(current_date, parent_service.recurrence_pattern)
    
    # Update tracking field
    parent_service.generated_until = until_date
    parent_service.save(update_fields=['generated_until', 'updated_at'])
    
    # Return all instances up to the requested date
    all_instances = Service.objects.filter(
        Q(id=parent_service.id) |
        Q(parent_service=parent_service, date__lte=until_date)
    ).order_by('date')
    
    return {
        'generated': generated,
        'existing': existing,
        'instances': all_instances
    }


def ensure_sessions_until(parent_service, until_date):
    """
    Convenience function: Ensure sessions exist up to a date (generate if needed).
    
    Args:
        parent_service: Service object with is_recurring=True
        until_date: Ensure sessions exist up to this date
    
    Returns:
        QuerySet of all Service instances up to until_date
    """
    if not parent_service.is_recurring:
        return Service.objects.filter(id=parent_service.id)
    
    result = generate_sessions_until(parent_service, until_date)
    return result['instances']


def get_sessions_for_range(parent_service, start_date=None, end_date=None, days_ahead=90):
    """
    Get or generate sessions for a date range.
    
    Args:
        parent_service: Service object
        start_date: Start of range (default: today)
        end_date: End of range (default: None, uses days_ahead instead)
        days_ahead: If end_date not provided, generate this many days ahead
    
    Returns:
        QuerySet of Service instances in the date range
    """
    if not parent_service.is_recurring:
        return Service.objects.filter(id=parent_service.id)
    
    start_date = start_date or date.today()
    
    if end_date is None:
        end_date = start_date + timedelta(days=days_ahead)
    
    # Lazy-load sessions up to end_date
    generate_sessions_until(parent_service, end_date)
    
    # Return instances in the requested range
    return Service.objects.filter(
        Q(id=parent_service.id) |
        Q(parent_service=parent_service, date__gte=start_date, date__lte=end_date)
    ).order_by('date')


def create_service_instance(parent_service, instance_date, location=None, start_time=None, end_time=None):
    """
    Create a single instance of a recurring service for a specific date.
    
    Useful for manually creating instances outside the normal recurrence pattern.
    
    Args:
        parent_service: Service object with is_recurring=True
        instance_date: Date for the new instance
        location: Optional location (defaults to parent service location)
        start_time: Optional start time (defaults to parent service start_time)
        end_time: Optional end time (defaults to parent service end_time)
    
    Returns:
        Created Service instance or existing one if already exists
    
    Raises:
        ValueError: If parent_service is not recurring
    """
    if not parent_service.is_recurring:
        raise ValueError("Service is not a recurring service")
    
    # Check if instance already exists for this date
    existing = Service.objects.filter(
        parent_service=parent_service,
        date=instance_date
    ).first()
    
    if existing:
        return existing
    
    # Use provided values or defaults from parent
    instance_location = location if location is not None else parent_service.location
    instance_start_time = start_time if start_time is not None else parent_service.start_time
    instance_end_time = end_time if end_time is not None else parent_service.end_time
    
    # Create new instance
    instance = Service.objects.create(
        name=parent_service.name,
        date=instance_date,
        start_time=instance_start_time,
        end_time=instance_end_time,
        location=instance_location,
        description=parent_service.description,
        parent_service=parent_service,
    )
    
    # Ensure tracking field reflects this new date
    if parent_service.generated_until is None or instance_date > parent_service.generated_until:
        parent_service.generated_until = instance_date
        parent_service.save(update_fields=['generated_until', 'updated_at'])
    
    return instance


def auto_mark_absent(service):
    """
    Automatically mark all non-visitor members as absent who haven't checked in.
    Called when a service/session ends. Also updates member absence tracking and creates alerts.
    
    Only works for actual services/sessions (with dates), not parent recurring services (templates).
    
    Args:
        service: Service object (must have a date)
    
    Returns:
        Number of attendance records created, or 0 if service is a parent template
    """
    # Only process actual services/sessions with dates
    # Parent recurring services (is_recurring=True, parent_service=None, date=None) are templates
    if not service.date:
        return 0
    
    if not service.end_time:
        return 0
    
    from members.utils import update_absenteeism_alerts
    
    # Get all non-visitor members
    members = Member.objects.filter(is_visitor=False)
    
    count = 0
    for member in members:
        # Check if member already has attendance record for this service
        existing = Attendance.objects.filter(
            member=member,
            service=service
        ).first()
        
        if not existing:
            # Create absent record with marked_by='manual' (manual endpoint call)
            Attendance.objects.create(
                member=member,
                service=service,
                status='absent',
                marked_by='manual',
                is_auto_marked=False,  # This is manual, not automatic
            )
            # Update member's absenteeism metrics and alerts
            update_absenteeism_alerts(member)
            count += 1
    
    return count


def get_service_instances(parent_service, num_months=3):
    """
    DEPRECATED: Use get_sessions_for_range() instead.
    Get all instances of a recurring service for the next num_months with lazy-loading.
    
    Args:
        parent_service: Service object with is_recurring=True
        num_months: Number of months to generate instances for
    
    Returns:
        QuerySet of Service instances
    """
    if not parent_service.is_recurring:
        return Service.objects.filter(id=parent_service.id)
    
    end_date = date.today() + timedelta(days=30 * num_months)
    return get_sessions_for_range(parent_service, end_date=end_date)


def update_service_instances(parent_service, **kwargs):
    """
    Update parent service - applies to future (not-yet-created) sessions.
    
    Note: With lazy-loading, only the parent is updated. Child sessions will inherit
    the parent's values when generated. Already-created child instances retain their original values
    (this allows for updates to apply going forward without breaking past sessions).
    
    Args:
        parent_service: Service object with is_recurring=True
        **kwargs: Fields to update (name, start_time, end_time, location, description)
    
    Returns:
        Number of fields updated on parent service
    """
    if not parent_service.is_recurring:
        return 0
    
    updated_fields = []
    for key, value in kwargs.items():
        if hasattr(parent_service, key):
            setattr(parent_service, key, value)
            updated_fields.append(key)
    
    if updated_fields:
        updated_fields.append('updated_at')
        parent_service.save(update_fields=updated_fields)
    
    return len(updated_fields)
