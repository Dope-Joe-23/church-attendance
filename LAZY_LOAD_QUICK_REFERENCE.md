# Lazy-Load Sessions Pattern - Quick Reference

## Quick Start

### 1. Create Recurring Service
```bash
POST /api/services/
{
    "name": "Sunday Worship",
    "start_time": "09:00:00",
    "end_time": "11:00:00",
    "location": "Main Hall",
    "is_recurring": true,
    "recurrence_pattern": "weekly"
}
# Returns parent template with NO sessions created yet
```

### 2. Generate Sessions On-Demand
```bash
POST /api/services/{id}/generate-instances/
{
    "until_date": "2026-12-31"
    # OR
    "months": 3
}

# Returns:
{
    "generated": 52,           # New sessions created
    "existing": 13,            # Sessions already existed
    "generated_until": "2026-12-31",
    "instances": [...]         # All sessions up to this date
}
```

### 3. Use Sessions
```bash
GET /api/services/
# Backend auto-lazy-loads for requested date range

GET /api/services/{id}/
# Gets parent + all existing child sessions
```

## Core Functions

| Function | Purpose | Returns |
|:---------|:--------|:---------|
| `generate_sessions_until(parent, until_date)` | Core lazy-loader | Dict with generated/existing counts and instances |
| `ensure_sessions_until(parent, until_date)` | Generate if needed, return QuerySet | QuerySet of sessions |
| `get_sessions_for_range(parent, start, end, days_ahead)` | Get sessions in date range | QuerySet of filtered sessions |
| `create_service_instance(parent, date, ...)` | Create single one-off session | Service instance |

## Model Fields

```python
class Service:
    # Marking recurring services
    is_recurring: bool             # True for recurring/templates
    recurrence_pattern: str        # 'weekly', 'monthly', 'none'
    parent_service: FK             # NULL for parents, points to parent for instances
    
    # Session data (NULL for templates)
    date: DateField                # NULL for parent, actual date for instances
    
    # Lazy-loading tracking
    generated_until: DateField     # Track where we've generated up to
```

## Common Patterns

### Pattern 1: Generate 3 Months Ahead (Default)
```python
result = generate_sessions_until(
    parent_service,
    until_date=date.today() + timedelta(days=90)
)
```

### Pattern 2: Get Sessions for Current Month
```python
from datetime import date
from dateutil.relativedelta import relativedelta

month_end = date.today() + relativedelta(months=1, day=1) - timedelta(days=1)
sessions = get_sessions_for_range(
    parent_service,
    start_date=date.today(),
    end_date=month_end
)
```

### Pattern 3: Extend Generation When Needed
```python
# Run when service goes beyond generated_until
result = generate_sessions_until(
    parent_service,
    until_date=date.today() + timedelta(days=365)
)
```

### Pattern 4: Add Special Session (Holiday, etc.)
```python
christmas = create_service_instance(
    parent_service,
    instance_date=date(2026, 12, 25),
    location="Downtown Campus"
)
```

### Pattern 5: Update Parent (Affects Future Sessions)
```python
parent_service.start_time = "10:00:00"
parent_service.save()
# Already-created sessions keep original time
# Future (not-generated) sessions will use new time
```

## API Endpoint Examples

### Generate Sessions
```http
POST /api/services/1/generate-instances/
Content-Type: application/json

{"until_date": "2026-12-31"}

HTTP/1.1 201 Created
{
    "generated": 45,
    "existing": 8,
    "generated_until": "2026-12-31",
    "instances": [...]
}
```

### Add Special Session
```http
POST /api/services/1/add-instance/
Content-Type: application/json

{
    "date": "2026-12-25",
    "start_time": "10:00:00",
    "end_time": "12:00:00",
    "location": "Main Hall"
}

HTTP/1.1 201 Created
{
    "message": "Created service instance for 2026-12-25.",
    "instance": {...}
}
```

### Query Sessions by Date Range
```http
GET /api/services/?start_date=2026-03-01&end_date=2026-03-31

HTTP/1.1 200 OK
{
    "count": 5,
    "results": [
        { parent service },
        { instance 2026-03-07 },
        { instance 2026-03-14 },
        { instance 2026-03-21 },
        { instance 2026-03-28 }
    ]
}
```

## Key Concepts

### Template vs Instance
- **Template (Parent)**: `is_recurring=True`, `parent_service=NULL`, `date=NULL`
- **Instance (Child)**: `is_recurring=False`, `parent_service=<id>`, `date=<actual_date>`

### generated_until Tracking
- Prevents re-generating same sessions
- Tracks "frontier" of generation
- Updated after each `generate_sessions_until()` call

### Update Behavior
- **Parent Update**: Affects current template + future (not-yet-created) sessions
- **Child Update**: Modifies that specific instance only
- **Past Sessions**: Immutable (for audit trail)

## Performance Notes

✅ Good:
- Generate 1-3 months at a time
- Query sessions within a date range
- Lazy-load on frontend request

❌ Avoid:
- Generating 10+ years at once
- Querying without date filters
- Modifying past sessions

## Debugging

### Check Generation Status
```python
service = Service.objects.get(id=1)
print(service.generated_until)  # None = not generated
```

### Count Sessions
```python
count = Service.objects.filter(parent_service=service_id).count()
print(f"Sessions for parent: {count}")
```

### Get Sessions in Range
```python
sessions = Service.objects.filter(
    parent_service=service_id,
    date__gte=start_date,
    date__lte=end_date
).order_by('date')
```

### Find Parent for Instance
```python
parent = instance_service.parent_service
# or
parents = Service.objects.filter(instances__id=instance_id).distinct()
```

## Migration from Batch Generation

If you had a service with batch-generated sessions:

```python
parent = Service.objects.get(id=1, is_recurring=True)

# Find last created instance
last_instance = Service.objects.filter(
    parent_service=parent
).order_by('-date').first()

# Update tracking
if last_instance:
    parent.generated_until = last_instance.date
    parent.save()

# Going forward, lazy-loading will start from generated_until
```

## Summary Table

| Task | Function | Endpoint |
|:-----|:---------|:---------|
| Create recurring service | `Service.objects.create()` | POST /services/ |
| Generate sessions | `generate_sessions_until()` | POST /services/{id}/generate-instances/ |
| Get sessions | `get_sessions_for_range()` | GET /services/?start_date=...&end_date=... |
| Add special session | `create_service_instance()` | POST /services/{id}/add-instance/ |
| Update service | `parent.save()` | PUT /services/{id}/ |
| Get service info | `Service.objects.get()` | GET /services/{id}/ |

---

**For detailed guide**: See `LAZY_LOAD_SESSIONS_GUIDE.md`
**For demo script**: Run `python manage.py shell < lazy_load_demo.py`
