# Quick Troubleshooting: Why Care Dashboard Shows 0 Alerts

## TL;DR

If Care Dashboard shows 0 alerts:
1. Run: `GET /members/alerts/diagnostic/`
2. Check if any members have absences
3. If yes but no alerts: Run `POST /members/alerts/recalculate/`
4. Refresh Care Dashboard

---

## Testing Data: Confirm You Have Real Absences

### Check If Absences Exist

**Run in Django shell:**
```python
from attendance.models import Attendance
from services.models import Service

# Count all absences
absent_count = Attendance.objects.filter(status='absent').count()
print(f"Total absences: {absent_count}")

# Count recent absences (last 90 days)
from datetime import datetime, timedelta
three_months_ago = datetime.now().date() - timedelta(days=90)
recent_absences = Attendance.objects.filter(
    status='absent',
    service__date__gte=three_months_ago
).count()
print(f"Absences in last 90 days: {recent_absences}")

# List some absent records
abs_records = Attendance.objects.filter(status='absent')[:5]
for record in abs_records:
    print(f"  {record.member.full_name} - {record.service.name} - {record.service.date}")
```

### Check If Alerts Exist

**Run in Django shell:**
```python
from members.models import MemberAlert

# Count alerts
total = MemberAlert.objects.count()
unresolved = MemberAlert.objects.filter(is_resolved=False).count()
print(f"Total alerts: {total}")
print(f"Unresolved alerts: {unresolved}")

# List unresolved alerts
alerts = MemberAlert.objects.filter(is_resolved=False)
for alert in alerts:
    print(f"  {alert.member.full_name} - {alert.alert_level} - {alert.reason}")
```

---

## Using Diagnostic Endpoint

### What It Does
Provides detailed information about alerts and absences to help diagnose issues.

### How to Run
```bash
# Using curl
curl -X GET http://localhost:8000/members/alerts/diagnostic/

# Using Python
import requests
response = requests.get('http://localhost:8000/members/alerts/diagnostic/')
print(response.json())
```

### Example Response
```json
{
  "attendance_summary": {
    "total_attendance_records": 150,
    "recent_attendance_records (last 90 days)": 45,
    "present_count": 120,
    "absent_count": 30,
    "unique_members_with_attendance": 25,
    "unique_members_with_absences": 8
  },
  "alert_summary": {
    "total_alerts": 2,
    "unresolved_alerts": 2,
    "early_warning_unresolved": 1,
    "at_risk_unresolved": 1,
    "critical_unresolved": 0
  },
  "members_with_absences": [
    {
      "member_id": 1,
      "name": "John Doe",
      "absences_last_90_days": 3,
      "database_consecutive_absences": 3,
      "attendance_status": "at_risk",
      "has_unresolved_alert": true
    },
    {
      "member_id": 2,
      "name": "Jane Smith",
      "absences_last_90_days": 2,
      "database_consecutive_absences": 0,  // OUT OF SYNC!
      "attendance_status": "active",
      "has_unresolved_alert": false  // SHOULD HAVE ALERT!
    }
  ],
  "notes": [
    "If members have absences but no alerts, run POST /members/alerts/recalculate/",
    "Check that member consecutive_absences matches actual absence count",
    "Early Warning alert needs 2+ absences, At Risk needs 4+ absences, Critical needs 8+ absences"
  ]
}
```

### What to Look For
- **absent_count**: Should be > 0 if you've marked members absent
- **members_with_absences**: Should show members with actual absence data
- **database_consecutive_absences vs absences_last_90_days**: Should match!
  - If don't match → Data is out of sync → Run **recalculate**
- **has_unresolved_alert**: Should be true if absences >= 2

---

## Using Recalculate Endpoint

### What It Does
Rebuilds alerts from scratch based on actual attendance data.

### When to Use
- Members have absences but no alerts showing
- Consecutive_absences counter out of sync
- After importing data or manual database changes
- When alerts seem wrong or missing

### How to Run
```bash
# Using curl
curl -X POST http://localhost:8000/members/alerts/recalculate/

# Using Python
import requests
response = requests.post('http://localhost:8000/members/alerts/recalculate/')
print(response.json())
```

### Example Response
```json
{
  "success": true,
  "message": "Alerts recalculated successfully",
  "summary": {
    "members_processed": 25,
    "early_warning_created": 3,
    "at_risk_created": 2,
    "critical_created": 0,
    "alerts_created": 5
  }
}
```

### What Happens
For each member:
1. Counts actual absences from Attendance table
2. Compares to member.consecutive_absences field
3. Updates counter if out of sync
4. Creates missing alerts based on absence count:
   - 2+ absences → Create early_warning alert
   - 4+ absences → Create at_risk alert (resolve early_warning)
   - 8+ absences → Create critical alert (resolve all others)
5. Resolves alerts if member is now present (0 absences)

---

## Step-by-Step Troubleshooting

### Scenario 1: Care Dashboard Shows 0 Alerts

**Step 1: Check diagnostic**
```
GET /members/alerts/diagnostic/
```

**Step 2: Check results**
- If `absent_count: 0` → No absences created yet
  - Need to: Create sessions, check in members, mark remaining as absent
- If `absent_count > 0` but `unresolved_alerts: 0` → Data out of sync
  - Go to **Step 3**
- If `unresolved_alerts > 0` → Alerts exist, check why not showing in dashboard
  - Verify Care Dashboard is:
    - Calling GET /members/alerts/unresolved/
    - Properly rendering alerts
    - Frontend may have cache issue → Hard refresh browser

**Step 3: Recalculate alerts**
```
POST /members/alerts/recalculate/
```

**Step 4: Verify**
```
GET /members/alerts/diagnostic/
# Should now show unresolved_alerts > 0
```

**Step 5: Refresh Care Dashboard**
- Browser: Ctrl+F5 (hard refresh)
- Or log out/log back in
- Alerts should now appear

### Scenario 2: Member Has 3 Absences But No Early Warning Alert

**Step 1: Check why**
```
GET /members/alerts/diagnostic/
```

Look at member_with_absences for that member:
- `absences_last_90_days: 3`
- `database_consecutive_absences: 0` ← OUT OF SYNC!
- `has_unresolved_alert: false` ← Missing alert!

**Step 2: Recalculate**
```
POST /members/alerts/recalculate/
```

**Step 3: Verify**
```
GET /members/alerts/diagnostic/
```

Member should now have:
- `absences_last_90_days: 3`
- `database_consecutive_absences: 3` ← FIXED!
- `has_unresolved_alert: true` ← ALERT CREATED!

**Step 4: Check Care Dashboard**
- Member appears in yellow (Early Warning) section

---

## Full Workflow To Generate Test Data

### Prerequisites
- Recurring service "Sunday Service" created (weekly)
- Sessions created for 3 consecutive weeks

### Workflow

```
Week 1 (Feb 9):
  ✓ Create session Feb 9
  ✓ Check in: John, Mary
  ✓ Don't check in: Bob
  ✓ Click "Mark Remaining as Absent"
  → Bob: 1 absence (no alert yet)

Week 2 (Feb 16):
  ✓ Create session Feb 16
  ✓ Check in: John, Mary
  ✓ Don't check in: Bob
  ✓ Click "Mark Remaining as Absent"
  → Bob: 2 absences (ALERT CREATED ✅)
  → Run diagnostic:
     - absent_count should include Bob's 2 absences
     - unresolved_alerts should include early_warning for Bob
  → Go to Care Dashboard
     - Bob should appear in 🟡 Early Warning section

Week 3 (Feb 23):
  ✓ Create session Feb 23
  ✓ Check in: John, Mary
  ✓ Don't check in: Bob, Susan
  ✓ Click "Mark Remaining as Absent"
  → Bob: 3 absences (still early_warning)
  → Susan: 1 absence (no alert yet)
  → Care Dashboard still shows Bob in Early Warning

Week 4 (Mar 2):
  ✓ Create session Mar 2
  ✓ Check in: John
  ✓ Don't check in: Bob, Mary, Susan
  ✓ Click "Mark Remaining as Absent"
  → Bob: 4 absences (ALERT ESCALATED to At Risk ✅)
  → Mary: 1 absence (no alert yet)
  → Susan: 2 absences (ALERT CREATED ✅)
  → Care Dashboard shows:
     - Bob in 🟠 At Risk section
     - Susan in 🟡 Early Warning section

Run diagnostic at any point:
GET /members/alerts/diagnostic/

Should show:
- absent_count: 7 (2+2+1+2 = 7)
- unresolved_alerts: 2 (Bob's at_risk, Susan's early_warning)
- members_with_absences: Shows Bob with 4, Susan with 2
```

---

## If Still Not Working

### Check API Connection
```python
import requests

# Test API access
response = requests.get('http://localhost:8000/members/alerts/unresolved/')
print(response.status_code)  # Should be 200
print(response.json())  # Should return list of alerts
```

### Check Database Directly
```python
from members.models import MemberAlert, Member
from attendance.models import Attendance

# Direct database queries
print("Total alerts:", MemberAlert.objects.count())
print("Unresolved:", MemberAlert.objects.filter(is_resolved=False).count())
print("Absences:", Attendance.objects.filter(status='absent').count())

# Check specific member
member = Member.objects.get(full_name="Bob")
print(f"Bob's absences: {Attendance.objects.filter(member=member, status='absent').count()}")
print(f"Bob's counter: {member.consecutive_absences}")
print(f"Bob's status: {member.attendance_status}")
print(f"Bob's alerts: {MemberAlert.objects.filter(member=member, is_resolved=False).count()}")
```

### Check Backend Logs
```bash
# If running locally
tail -f /path/to/logfile

# Look for errors in:
- POST /attendance/mark_absent/ responses
- Member consecutive_absences updates
- MemberAlert creations
```

---

## Summary

1. **Create absence data**: Check in members, mark remaining as absent
2. **Verify with diagnostic**: GET /members/alerts/diagnostic/
3. **If out of sync**: POST /members/alerts/recalculate/
4. **View in dashboard**: Go to Care Dashboard URL
5. **Hard refresh**: Ctrl+F5 if not showing

That's it! Alerts should appear automatically.
