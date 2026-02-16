# API Testing: Endpoints Quick Reference

## Endpoints Summary

| Endpoint | Method | Purpose | When to Use |
|----------|--------|---------|-----------|
| `/members/alerts/diagnostic/` | GET | Show alert system state | Diagnose why 0 alerts showing |
| `/members/alerts/recalculate/` | POST | Rebuild alerts from scratch | Fix out-of-sync data |
| `/members/alerts/unresolved/` | GET | Get alerts for dashboard | Used by Care Dashboard |
| `/attendance/mark-absent/` | POST | Mark members absent | Trigger alert generation |
| `/services/by-service/` | GET | Get attendance report | View who attended/missed |
| `/services/close/` | POST | Close service, auto-mark absent | Auto-generate alerts |

---

## Test 1: Check Current Alert State

```bash
# Terminal
curl -X GET http://localhost:8000/members/alerts/diagnostic/

# Python
import requests
r = requests.get('http://localhost:8000/members/alerts/diagnostic/')
print(r.json())
```

**Expected Response:**
```json
{
  "attendance_summary": {
    "total_attendance_records": Integer,
    "present_count": Integer,
    "absent_count": Integer,
    "unique_members_with_absences": Integer
  },
  "alert_summary": {
    "total_alerts": Integer,
    "unresolved_alerts": Integer,
    "early_warning_unresolved": Integer,
    "at_risk_unresolved": Integer,
    "critical_unresolved": Integer
  },
  "members_with_absences": [
    {
      "member_id": Integer,
      "name": String,
      "absences_last_90_days": Integer,
      "database_consecutive_absences": Integer,
      "has_unresolved_alert": Boolean
    }
  ]
}
```

**What to Check:**
- ✓ absent_count > 0? (Members have been marked absent)
- ✓ members_with_absences populated? (System found absence data)
- ✓ unresolved_alerts > 0? (Alerts exist for absences)
- ✓ absences_last_90_days == database_consecutive_absences? (Data in sync)

---

## Test 2: Verify Absence Data Exists

```bash
# Get attendance records
curl -X GET "http://localhost:8000/attendance/by-service/?service_id=1"

# Python
import requests
r = requests.get('http://localhost:8000/attendance/by-service/', params={'service_id': 1})
data = r.json()
absent_records = [r for r in data if r['status'] == 'absent']
print(f"Absent in this service: {len(absent_records)}")
for record in absent_records:
    print(f"  {record['member']['full_name']}")
```

---

## Test 3: Recalculate Alerts

Only run if Test 1 shows:
- ✓ absent_count > 0 (absences exist)
- ✗ unresolved_alerts = 0 (but no alerts)

```bash
# Terminal
curl -X POST http://localhost:8000/members/alerts/recalculate/

# Python
import requests
r = requests.post('http://localhost:8000/members/alerts/recalculate/')
print(r.json())
```

**Expected Response:**
```json
{
  "success": true,
  "summary": {
    "members_processed": Integer,
    "early_warning_created": Integer,
    "at_risk_created": Integer,
    "critical_created": Integer,
    "alerts_created": Integer
  }
}
```

**After Running:**
- Immediately run Test 1 again
- unresolved_alerts should now > 0
- Go to Care Dashboard, refresh page (Ctrl+F5)
- Alerts should appear

---

## Test 4: Manually Create Test Data

If you need test absences:

```python
from members.models import Member
from services.models import Service
from attendance.models import Attendance
from django.utils import timezone

# Get a member and service
member = Member.objects.first()  # Or get specific: Member.objects.get(id=1)
service = Service.objects.filter(is_recurring=False, date__isnull=False).first()

# Create absence records manually
absences = []
for i in range(3):
    # Create 3 absences for this member
    attendance = Attendance.objects.create(
        member=member,
        service=service,
        status='absent',
        check_in_time=None,
        timestamp=timezone.now()
    )
    absences.append(attendance)

print(f"Created {len(absences)} absence records for {member.full_name}")

# Now run diagnostic to see if alerts are created
# GET /members/alerts/diagnostic/
# Then POST /members/alerts/recalculate/ if needed
```

---

## Test 5: Full Workflow - Check In & Mark Absent

This is the normal way alerts are created:

```python
# 1. Create a session
from services.models import Service
from datetime import datetime, timedelta

session = Service.objects.create(
    name="Test Session",
    description="For testing alerts",
    date=datetime.now().date(),
    start_time=datetime.now().time(),
    end_time=(datetime.now() + timedelta(hours=1)).time(),
    is_recurring=False,
    parent_service=None
)

# 2. Check in some members
from attendance.models import Attendance
from members.models import Member
from django.utils import timezone

members = Member.objects.all()[:3]
for member in members[:2]:  # Check in first 2
    Attendance.objects.create(
        member=member,
        service=session,
        status='present',
        check_in_time=timezone.now()
    )

# 3. Mark remaining as absent
from attendance.views import AttendanceViewSet
from django.contrib.auth.models import AnonymousUser
from rest_framework.test import APIRequestFactory

factory = APIRequestFactory()
request = factory.post(f'/attendance/mark-absent/')
request.data = {
    'service_id': session.id,
    'member_ids': [members[2].id]
}

viewset = AttendanceViewSet()
viewset.request = request
viewset.format_kwarg = None

# Actually, easier to just use the API:
import requests
requests.post(
    'http://localhost:8000/attendance/mark-absent/',
    json={
        'service_id': session.id,
        'member_ids': [members[2].id]
    }
)

# 4. Check diagnostic
requests.get('http://localhost:8000/members/alerts/diagnostic/')
# Should show 1 absence and potentially 1 alert if member had 1+ prior absence
```

---

## Test 6: Verify Care Dashboard Integration

After creating alerts:

```bash
# Get unresolved alerts (what Care Dashboard uses)
curl -X GET http://localhost:8000/members/alerts/unresolved/

# Python
import requests
r = requests.get('http://localhost:8000/members/alerts/unresolved/')
alerts = r.json()
print(f"Unresolved alerts: {len(alerts)}")
for alert in alerts:
    print(f"  {alert['member']['full_name']} - {alert['alert_level']}")
```

**Expected Response:**
```json
{
  "early_warning": [
    {
      "id": Integer,
      "member": {
        "id": Integer,
        "full_name": String,
        "phone": String,
        "email": String
      },
      "alert_level": "early_warning",
      "reason": "Member has been absent 2 times...",
      "contact_date": String or null,
      "is_resolved": false,
      "resolved_on": null,
      "created_on": String
    }
  ],
  "at_risk": [...],
  "critical": [...]
}
```

Then in Care Dashboard:
- Go to Care Dashboard page
- Should see alerts organized by level
- Click "Mark Resolved" to mark alert as handled
- Resolved alerts disappear from dashboard

---

## Quick Command Reference

### Django Shell (if needed)
```bash
# Enter Django shell
python manage.py shell

# Check absences
from attendance.models import Attendance
Attendance.objects.filter(status='absent').count()

# Check alerts
from members.models import MemberAlert
MemberAlert.objects.filter(is_resolved=False).count()

# Run recalculate manually
from members.utils import recalculate_member_alerts
result = recalculate_member_alerts()
print(result)
```

### Quick cURL Tests
```bash
# 1. Diagnostic
curl http://localhost:8000/members/alerts/diagnostic/

# 2. Recalculate
curl -X POST http://localhost:8000/members/alerts/recalculate/

# 3. Unresolved (for dashboard)
curl http://localhost:8000/members/alerts/unresolved/

# 4. Attendance by service
curl "http://localhost:8000/attendance/by-service/?service_id=5"

# 5. Mark absents
curl -X POST http://localhost:8000/attendance/mark-absent/ \
  -H "Content-Type: application/json" \
  -d '{"service_id": 5, "member_ids": [1, 2, 3]}'
```

---

## Debugging Checklist

- [ ] Backend running? (`python manage.py runserver`)
- [ ] Frontend running? (npm start or Vite dev server)
- [ ] Database migrated? (`python manage.py migrate`)
- [ ] Test data exists? (Members, services, sessions created)
- [ ] Attendance records exist? (Query: `Attendance.objects.count()`)
- [ ] Absences recorded? (Query: `Attendance.objects.filter(status='absent').count()`)
- [ ] Alerts exist? (Query: `MemberAlert.objects.count()`)
- [ ] After recalculate? Run diagnostic again
- [ ] Care Dashboard page? Hard refresh (Ctrl+F5)
- [ ] Check browser console? Any JS errors?
- [ ] Member alerts endpoint? Returns data via GET /members/alerts/unresolved/

---

## If Nothing Works

1. **Check API is running:**
   ```bash
   curl http://localhost:8000/members/alerts/diagnostic/
   # Should return JSON, not 404
   ```

2. **Check database:**
   ```bash
   python manage.py dbshell
   SELECT COUNT(*) FROM attendance_attendance WHERE status='absent';
   SELECT COUNT(*) FROM members_memberalert WHERE is_resolved=0;
   ```

3. **Check for errors:**
   ```bash
   # Look at Django console output
   # Check for Python exceptions in terminal running runserver
   ```

4. **Reset test data:**
   ```bash
   python manage.py shell
   
   # Clear test data
   from attendance.models import Attendance
   from members.models import MemberAlert
   Attendance.objects.filter(status='absent').delete()
   MemberAlert.objects.all().delete()
   
   # Restart and create fresh test data
   ```

---

## Success Criteria

✅ Care Dashboard shows 0 alerts initially (no test data yet)
✅ After creating sessions and marking members absent, Care Dashboard shows alerts
✅ Alerts grouped by level: 🟡 Early Warning, 🟠 At Risk, 🔴 Critical
✅ Clicking "Mark Resolved" removes alert from dashboard
✅ New members reaching 2 absences automatically get early warning alert
✅ Diagnostic endpoint shows correct absence counts
✅ Recalculate endpoint fixes out-of-sync data
