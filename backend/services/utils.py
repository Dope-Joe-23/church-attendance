"""
Service utilities for handling recurring services and attendance automation.
"""
from datetime import datetime, timedelta, date
from django.db.models import Q
from .models import Service
from attendance.models import Attendance
from members.models import Member


def generate_recurring_service_instances(parent_service, start_date=None, end_date=None):
    """
    Generate recurring service instances between start_date and end_date.
    
    Args:
        parent_service: Service object with is_recurring=True
        start_date: Date to start generating instances (default: today)
        end_date: Date to end generating instances (default: 3 months from now)
    
    Returns:
        List of created/existing Service instances
    """
    if not parent_service.is_recurring:
        return [parent_service]
    
    start_date = start_date or date.today()
    end_date = end_date or (start_date + timedelta(days=90))
    
    instances = []
    current_date = start_date
    
    while current_date <= end_date:
        should_create = False
        
        if parent_service.recurrence_pattern == 'weekly':
            # Create instance on the same weekday as the original date
            if current_date.weekday() == parent_service.date.weekday():
                should_create = True
        elif parent_service.recurrence_pattern == 'monthly':
            # Create instance on the same day of month
            if current_date.day == parent_service.date.day:
                should_create = True
        
        if should_create:
            # Check if instance already exists
            existing = Service.objects.filter(
                parent_service=parent_service,
                date=current_date
            ).first()
            
            if not existing:
                instance = Service.objects.create(
                    name=parent_service.name,
                    date=current_date,
                    start_time=parent_service.start_time,
                    end_time=parent_service.end_time,
                    location=parent_service.location,
                    description=parent_service.description,
                    parent_service=parent_service,
                )
                instances.append(instance)
            else:
                instances.append(existing)
        
        current_date += timedelta(days=1)
    
    return instances


def create_service_instance(parent_service, instance_date):
    """
    Create a single instance of a recurring service for a specific date.
    
    Args:
        parent_service: Service object with is_recurring=True
        instance_date: Date for the new instance
    
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
    
    # Create new instance
    instance = Service.objects.create(
        name=parent_service.name,
        date=instance_date,
        start_time=parent_service.start_time,
        end_time=parent_service.end_time,
        location=parent_service.location,
        description=parent_service.description,
        parent_service=parent_service,
    )
    
    return instance


def auto_mark_absent(service):
    """
    Automatically mark all non-visitor members as absent who haven't checked in.
    Called when a service ends.
    
    Args:
        service: Service object
    
    Returns:
        Number of attendance records created
    """
    if not service.end_time:
        return 0
    
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
            # Create absent record
            Attendance.objects.create(
                member=member,
                service=service,
                status='absent',
                is_auto_marked=True,
            )
            count += 1
    
    return count


def get_service_instances(parent_service, num_months=3):
    """
    Get all instances of a recurring service for the next num_months.
    
    Args:
        parent_service: Service object with is_recurring=True
        num_months: Number of months to generate instances for
    
    Returns:
        QuerySet of Service instances
    """
    if not parent_service.is_recurring:
        return Service.objects.filter(id=parent_service.id)
    
    end_date = date.today() + timedelta(days=30 * num_months)
    instances = generate_recurring_service_instances(
        parent_service,
        start_date=date.today(),
        end_date=end_date
    )
    
    return Service.objects.filter(
        Q(id=parent_service.id) |
        Q(parent_service=parent_service, date__gte=date.today())
    )


def update_service_instances(parent_service, **kwargs):
    """
    Update all instances of a recurring service with new values.
    
    Args:
        parent_service: Service object with is_recurring=True
        **kwargs: Fields to update (name, start_time, end_time, location, description)
    
    Returns:
        Number of instances updated
    """
    if not parent_service.is_recurring:
        return 0
    
    # Update parent service
    for key, value in kwargs.items():
        setattr(parent_service, key, value)
    parent_service.save()
    
    # Update all child instances
    instances = Service.objects.filter(parent_service=parent_service)
    count = 0
    for instance in instances:
        for key, value in kwargs.items():
            setattr(instance, key, value)
        instance.save()
        count += 1
    
    return count
