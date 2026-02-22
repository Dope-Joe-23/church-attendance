# Lazy-Load Sessions Pattern - Architecture Guide

## Overview

The Lazy-Load Sessions Pattern is a scalable approach to handling recurring services. Instead of batch-generating all future sessions upfront, sessions are generated on-demand when requested. This allows unlimited recurring sessions without massive database bloat.

## Problem with Batch Generation

**Old Approach (Pre-Lazy-Loading):**
- When a recurring service is created, ALL sessions for 3 months are generated immediately
- Results in thousands of database records for long-running recurring services
- Running out of sessions when services need to continue longer than 3 months
- Updating parent service doesn't affect already-created sessions
- Memory and query performance issues with large session counts

**Example Issue:**
```
Service: "Sunday Worship"
- Created with is_recurring=True, recurrence_pattern='weekly'
- Batch-generates 13 sessions (3 months × ~4 weeks)
- But church wants 5 years of data!
- After 3 months, need manual intervention to generate more
- Already-created sessions don't reflect parent updates
```

## Lazy-Loading Solution

**New Approach (Lazy-Loading):**
- Parent service stored as template (no date field)
- Sessions generated only when requested via API
- `generated_until` field tracks the farthest date generated
- No automatic batch generation on creation
- Only generates the sessions actually needed
- Parent updates apply to future (not-yet-created) sessions

## Architecture

### Database Schema

```python
class Service(models.Model):
    # Core fields
    id = AutoField
    name = CharField
    date = DateField(null=True, blank=True)  # NULL for parent templates
    start_time = TimeField
    end_time = TimeField
    location = CharField
    description = TextField
    
    # Recurring service fields
    is_recurring = BooleanField
    recurrence_pattern = CharField('weekly' | 'monthly' | 'none')
    parent_service = ForeignKey(self, null=True)  # NULL for parents
    
    # Lazy-loading tracking
    generated_until = DateField(null=True, blank=True)
    
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

### Data Organization

```
Service (Parent Template)
├── id: 1
├── name: "Sunday Worship"
├── date: NULL (no date for template)
├── is_recurring: True
├── recurrence_pattern: "weekly"
├── parent_service: NULL (this IS the parent)
├── generated_until: 2026-06-15
└── start_time: 09:00:00

    ├─ Service (Instance 1)
    │  ├── id: 101
    │  ├── name: "Sunday Worship"
    │  ├── date: 2026-02-22
    │  ├── parent_service_id: 1
    │  └── [other fields from parent]
    │
    ├─ Service (Instance 2)
    │  ├── id: 102
    │  ├── name: "Sunday Worship"
    │  ├── date: 2026-03-01
    │  ├── parent_service_id: 1
    │  └── [other fields from parent]
    │
    └─ ... (only sessions up to 2026-06-15 exist)
```

## Core Functions

### `generate_sessions_until(parent_service, until_date)`

Main lazy-loading function. Generates sessions only between `generated_until` and the requested `until_date`.

```python
from services.utils import generate_sessions_until

parent = Service.objects.get(id=1, is_recurring=True)
result = generate_sessions_until(parent, until_date=date(2026, 12, 31))

# Returns dict:
#   'generated': 26  # New sessions created
#   'existing': 13   # Sessions that already existed
#   'instances': QuerySet of all sessions up to until_date
```

**How it works:**
1. Checks `parent.generated_until` to determine where to start
2. Generates sessions from that point to `until_date`
3. Skips any already-created sessions
4. Updates `parent.generated_until` to track progress
5. Returns all instances up to the requested date

### `ensure_sessions_until(parent_service, until_date)`

Convenience wrapper - generates sessions if needed and returns QuerySet.

```python
sessions = ensure_sessions_until(parent, until_date=date(2026, 12, 31))
# Just the QuerySet, for use in serializers/templates
```

### `get_sessions_for_range(parent_service, start_date, end_date, days_ahead)`

High-level helper - get sessions for a specific date range.

```python
sessions = get_sessions_for_range(
    parent,
    start_date=date(2026, 3, 1),
    end_date=date(2026, 3, 31)
)
# Returns sessions within the range, auto-generates if needed
```

### `create_service_instance(parent_service, instance_date, location=None, ...)`

Manually create a single session for a date (outside normal recurrence pattern).

```python
special_session = create_service_instance(
    parent,
    instance_date=date(2026, 12, 25),  # Christmas service
    location="Main Hall",
    start_time="10:00:00"
)
```

## API Endpoints

### 1. Create Recurring Service (No Auto-Generation)

```http
POST /api/services/
Content-Type: application/json

{
    "name": "Sunday Worship",
    "start_time": "09:00:00",
    "end_time": "11:00:00",
    "location": "Sanctuary",
    "is_recurring": true,
    "recurrence_pattern": "weekly"
}

Response (200):
{
    "id": 1,
    "name": "Sunday Worship",
    "date": null,  # NULL for template
    "is_recurring": true,
    "parent_service": null,
    "generated_until": null  # Not generated yet
}
```

### 2. Lazy-Load Sessions on Demand

```http
POST /api/services/1/generate-instances/
Content-Type: application/json

{
    "until_date": "2026-12-31",
    "months": 12  # Alternative to until_date
}

Response (201):
{
    "message": "Generated 52 new sessions, found 13 existing.",
    "generated": 52,
    "existing": 13,
    "generated_until": "2026-12-31",
    "instances": [
        {
            "id": 101,
            "name": "Sunday Worship",
            "date": "2026-02-22",
            "parent_service": 1,
            ...
        },
        ...
    ]
}
```

### 3. Get Services (Auto-Lazy-Loads for Date Range)

```http
GET /api/services/?start_date=2026-03-01&end_date=2026-03-31

Response (200):
{
    "count": 5,
    "results": [
        { parent service },
        { instance 2026-03-01 },
        { instance 2026-03-08 },
        { instance 2026-03-15 },
        { instance 2026-03-22 },
        { instance 2026-03-29 }
    ]
}
```

### 4. Add Single Session Outside Recurrence

```http
POST /api/services/1/add-instance/
Content-Type: application/json

{
    "date": "2026-12-25",
    "start_time": "10:00:00",
    "end_time": "12:00:00",
    "location": "Main Sanctuary"
}

Response (201):
{
    "message": "Created service instance for 2026-12-25.",
    "instance": { ... }
}
```

## Benefits

### 1. **Unlimited Sessions**
- No hard limit on how far ahead you can generate
- Perfect for long-running recurring services

### 2. **Database Efficiency**
- Only store sessions that actually exist
- Massive reduction in database size
- Better query performance

Example:
```
Old Approach:  10 years × 52 weeks = 520 database records per service
New Approach:  0 records until requested, then generated on-demand
```

### 3. **Updateable Service Data**
- Updating parent service updates future sessions
- Past sessions retain their original configuration
- Clean separation of template vs instances

### 4. **Flexible Session Creation**
- Add special sessions (holidays, extra services) without pattern
- Override times/locations for specific instances
- Manual one-off sessions supported

### 5. **Scalability**
- No performance degradation as date range grows
- Lazy-loading works well with pagination
- Memory-efficient for large service lists

## Implementation Workflow

### Step 1: Create Recurring Service

```python
# API: POST /api/services/
service = Service.objects.create(
    name="Sunday Worship",
    start_time="09:00:00",
    is_recurring=True,
    recurrence_pattern="weekly"
)
# NO sessions created yet - just the template
```

### Step 2: Request Sessions for a Date Range

```python
# API: POST /api/services/1/generate-instances/
result = generate_sessions_until(service, until_date=date(2026, 12, 31))
# Sessions now exist up to 2026-12-31
```

### Step 3: Use Sessions in Your App

```python
# API: GET /api/services/1/
# Get parent + child instances, auto-lazy-loading if needed
sessions = get_sessions_for_range(
    service,
    start_date=today,
    end_date=today + timedelta(days=90)
)
```

### Step 4: Update Service

```python
# API: PUT /api/services/1/
service.location = "New Hall"
service.start_time = "10:00:00"
service.save()  # Updates parent template only!

# Future sessions (not yet created) will use new values
# Existing sessions keep their original values
```

### Step 5: Add Special Session

```python
# API: POST /api/services/1/add-instance/
create_service_instance(
    service,
    instance_date=date(2026, 12, 25),
    location="Main Sanctuary"
)
```

## Migration Path from Old System

If you have an existing recurring service with batch-generated sessions:

```python
# 1. Keep existing instances (they're still valid)
# 2. Set generated_until to the last instance date
parent_service.generated_until = date(2026, 6, 15)
parent_service.save()

# 3. Future gen requests will start from generated_until + 1 day
# 4. Existing instances won't be regenerated
```

## Best Practices

### ✅ DO:

1. **Use for recurring services** - Weekly/monthly services
2. **Generate ahead periodically** - Generate 3-6 months ahead when needed
3. **Update parent before generation** - Change times/location before generating future sessions
4. **Lazy-load on API fetch** - Backend auto-generates for requested date ranges
5. **Store past sessions permanently** - Archive completed sessions for reporting

### ❌ DON'T:

1. **Generate too far ahead** (100+ years) - Unnecessary data
2. **Batch generate millions of records** - Defeats the purpose of lazy-loading
3. **Modify existing instances** - Keep them immutable for audit trail
4. **Generate all at once** - Generate in chunks (3-6 months at a time)
5. **Multiple overlapping generations** - Track `generated_until` carefully

## Performance Considerations

### Query Efficiency

```python
# Good - limits date range
sessions = get_sessions_for_range(parent, days_ahead=90)
# Generates at most 12-13 sessions, returns efficiently

# Avoid - generates entire year at once
generate_sessions_until(parent, date(2027, 12, 31))
# Creates 52 records, large query result
```

### Pagination Integration

```python
# Frontend pagination still works
GET /api/services/?page=1&start_date=2026-03-01&end_date=2026-03-31
# Backend lazy-loads for date range, then paginates results
```

## Troubleshooting

### Problem: Sessions not appearing for future dates

```python
# Check if sessions have been generated
service = Service.objects.get(id=1)
print(service.generated_until)  # None if not generated yet

# Generate explicitly
result = generate_sessions_until(service, date.today() + timedelta(days=90))
print(result['generated'])  # Should be > 0
```

### Problem: Updating service didn't affect existing sessions

**This is intentional!** Update parent → affects FUTURE sessions only.

```python
# To update existing sessions too:
Service.objects.filter(parent_service=service).update(
    start_time="10:00:00",
    location="New Hall"
)
# Usually NOT recommended - breaks audit trail
```

### Problem: Too many sessions generated

```python
# Check count
count = Service.objects.filter(
    parent_service=service,
    date__isnull=False
).count()

# Delete excess (permanently!)
Service.objects.filter(
    parent_service=service,
    date__gt=date(2030, 1, 1)
).delete()
```

## Example: Complete Recurring Service Workflow

```python
from services.models import Service
from services.utils import generate_sessions_until
from datetime import date, timedelta

# 1. Create parent template
parent = Service.objects.create(
    name="Sunday Worship",
    start_time="09:00:00",
    end_time="11:00:00",
    location="Main Hall",
    is_recurring=True,
    recurrence_pattern="weekly"
)
# parent.generated_until = None (no sessions yet)

# 2. User requests services for next 3 months
result = generate_sessions_until(
    parent,
    until_date=date.today() + timedelta(days=90)
)
print(f"Generated {result['generated']} new sessions")
# parent.generated_until updated to 90 days ahead

# 3. Add special session
from services.utils import create_service_instance
special = create_service_instance(
    parent,
    instance_date=date(2026, 12, 25),
    location="Downtown Campus"
)

# 4. Update parent for tomorrow's new services
parent.description = "Quarterly guest speaker today!"
parent.save()
# Doesn't affect already-created sessions, only future ones

# 5. Get all sessions in a range
sessions = get_sessions_for_range(
    parent,
    start_date=date(2026, 3, 1),
    end_date=date(2026, 3, 31)
)
# Auto-generates if needed, returns April sessions
```

## Summary

The Lazy-Load Sessions Pattern provides:
- **Unlimited** recurring sessions
- **Efficient** database usage
- **Flexible** session management
- **Scalable** application performance
- **Clean** architecture separating templates from instances

Perfect for church applications with long-running recurring services!
