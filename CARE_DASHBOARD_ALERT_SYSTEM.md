# Care Dashboard - Alert System Setup & Troubleshooting

## How Care Dashboard Prepares Data for Alerts

### Data Flow Diagram

```
Member Attendance Session
         ↓
  [Check In/Mark Absent]
         ↓
Attendance Record Created
  (member, service, status)
         ↓
auto_mark_absent() OR
mark_absent() called
         ↓
update_member_absence_tracking()
  - Increments consecutive_absences counter
  - Updates attendance_status
  - Decreases engagement_score
  - Checks threshold (2, 4, 8)
         ↓
MemberAlert Record Created
  (if threshold matched)
         ↓
Care Dashboard Queries:
GET /members/alerts/unresolved/
         ↓
Alerts Grouped & Displayed:
- Early Warning (2 absences)
- At Risk (4+ absences)
- Critical (8+ absences)
```

---

## Care Dashboard Components

### Data Preparation

The Care Dashboard fetches data from **3 main sources**:

1. **Unresolved Alerts** - `GET /members/alerts/unresolved/`
   - Returns all MemberAlert records where `is_resolved=False`
   - Grouped by `alert_level` (early_warning, at_risk, critical)
   - Ordered by creation date (newest first)

2. **Member Details** - `GET /members/{id}/`
   - Returns member information with:
     - consecutive_absences (counter)
     - attendance_status (active/at_risk/inactive)
     - engagement_score (0-100)
     - last_attendance_date
     - last_contact_date

3. **Contact Logs** - `GET /members/contact-logs/by_member/?member_id={id}`
   - Returns history of pastoral outreach
   - Used to show follow-up actions

### Display Logic

```jsx
const CareDashboard = () => {
  // Fetch data on load
  useEffect(() => {
    fetchAlerts(); // GET /members/alerts/unresolved/
  }, []);

  // Group alerts by level
  response.data.forEach(alert => {
    grouped[alert.alert_level].push(alert);
  });

  // Display stats
  <div className="alert-statistics">
    <div className="stat-card critical">
      {stats.critical} members in Critical status (🔴 8+ absences)
    </div>
    <div className="stat-card at-risk">
      {stats.at_risk} members At Risk (🟠 4+ absences)
    </div>
    <div className="stat-card early-warning">
      {stats.early_warning} members with Early Warning (🟡 2 absences)
    </div>
  </div>
};
```

---

## Alert Generation System

### When Alerts Are Created

Alerts are created **automatically** when members reach absence thresholds:

#### Threshold 1: Early Warning
- **Trigger**: Member gets 2nd absence
- **Condition**: `consecutive_absences == 2`
- **Alert Level**: `early_warning`
- **Status Color**: 🟡 Yellow
- **Action**: Update member status to `at_risk`

#### Threshold 2: At Risk
- **Trigger**: Member gets 4th absence
- **Condition**: `consecutive_absences == 4`
- **Alert Level**: `at_risk`
- **Resolve Previous**: Early warning alert marked as resolved
- **Status Color**: 🟠 Orange
- **Action**: Keep member status as `at_risk`

#### Threshold 3: Critical
- **Trigger**: Member gets 8th absence
- **Condition**: `consecutive_absences >= 8`
- **Alert Level**: `critical`
- **Resolve Previous**: All previous alerts marked as resolved
- **Status Color**: 🔴 Red
- **Action**: Update member status to `inactive`

### How to Trigger Alert Generation

#### Method 1: Manual Mark Absent (Most Common)
```
1. Go to Scanner → Select Session
2. View Attendance Report
3. Click "Mark Remaining as Absent"
4. System marks non-checked-in members as absent
5. For each absent record created:
   → update_member_absence_tracking(member, 'absent') called
   → Consecutive absences incremented
   → Alert created if threshold reached
```

#### Method 2: Service Close Endpoint
```
1. Go to Services → Select Session
2. Click "Close Service" button
3. System calls auto_mark_absent()
4. Each member marked absent triggers tracking update
5. Alerts created as needed
```

#### Method 3: API Direct Call
```python
# In Django shell or management command
from attendance.models import Attendance
from members.utils import update_member_absence_tracking
from members.models import Member

member = Member.objects.get(full_name="John Doe")
Attendance.objects.create(
    member=member,
    service_id=1,
    status='absent'
)
update_member_absence_tracking(member, 'absent')
# Alert automatically created if threshold reached!
```

---

## Troubleshooting: Why Alerts Show 0 Data

### Issue: Care Dashboard Shows 0 Alerts

**Possible Causes:**

1. **No Attendance Data Created Yet**
   - Need to: Create sessions, take attendance, mark members absent
   - Check: `GET /members/alerts/diagnostic/` to see if any absences exist

2. **Members Not Marked Absent**
   - "Mark Remaining as Absent" button not clicked
   - Only checked-in members are recorded
   - Non-checked-in members don't automatically get absence records

3. **Consecutive Absences Counter Out of Sync**
   - Database counter doesn't match actual absences
   - Solution: Run recalculate endpoint

4. **All Alerts Resolved**
   - Member checked back in, resetting counter
   - Check member details for current status

### Solution Steps

#### Step 1: Run Diagnostic
```bash
# Get detailed diagnostic information
POST /members/alerts/diagnostic/
```

**Response shows:**
- Total attendance records
- Count of present/absent records
- Members with absences
- Current alerts in database
- Whether member consecutive_absences matches actual data

#### Step 2: Recalculate Alerts (if needed)
```bash
# Rebuild all alerts based on actual attendance data
POST /members/alerts/recalculate/
```

**This function:**
- Counts actual absences from Attendance table
- Compares to member.consecutive_absences field
- Creates missing alerts if data is out of sync
- Resolves alerts if member has recovered

**Response shows:**
```json
{
  "success": true,
  "message": "Alerts recalculated successfully",
  "summary": {
    "members_processed": 45,
    "early_warning_created": 3,
    "at_risk_created": 2,
    "critical_created": 1,
    "alerts_created": 6
  }
}
```

---

## Testing Workflow to Generate Alerts

### Test Case: Generate Early Warning Alert

```
Step 1: Setup
- Go to Services page
- Create recurring service: "Sunday Service"
  - Pattern: Weekly
  - Times: 09:00-11:00

Step 2: Create sessions
- Create 3 sessions (e.g., Feb 9, Feb 16, Feb 23)
- Can be done manually via "Add Session Date"

Step 3: First Session - Feb 9
- Go to Scanner → Select Feb 9 session
- Check in: Member A, Member C
- Don't check in: Member B
- Click "Mark Remaining as Absent"
  → Member B: 1 absence (no alert yet, need 2)

Step 4: Second Session - Feb 16
- Go to Scanner → Select Feb 16 session
- Check in: Member A, Member C
- Don't check in: Member B
- Click "Mark Remaining as Absent"
  → Member B: 2 absences (ALERT CREATED: Early Warning 🟡)
  → update_member_absence_tracking called
  → consecutive_absences = 2
  → MemberAlert created with alert_level='early_warning'

Step 5: Check Care Dashboard
- Go to Care Dashboard
- Member B appears in 🟡 Early Warning section
- Shows reason: "2 consecutive absences - Early warning..."
- Can log contact/follow-up

Step 6: Third Session - Feb 23
- Check in: Member A
- Don't check in: Member B, Member C
- Click "Mark Remaining as Absent"
  → Member B: 3 absences (still early_warning, need 4)
  → Member C: 1 absence (no alert)

Step 7: Fourth Session (creating new)
- Add new session for Mar 2
- Check in: Member A
- Don't check in: Member B, Member C
- Click "Mark Remaining as Absent"
  → Member B: 4 absences (ALERT ESCALATED: At Risk 🟠)
  → Early warning alert marked as resolved
  → New at_risk alert created
  → Care Dashboard shows Member B in At Risk section
```

---

## API Endpoints for Alert Management

### Fetch Alerts
```
GET /members/alerts/unresolved/
Returns: All unresolved alerts grouped by level
```

### Fetch Alerts by Level
```
GET /members/alerts/by_level/?level=critical
Returns: Alerts for specific level (critical, at_risk, early_warning)
```

### Get Diagnostic Data
```
GET /members/alerts/diagnostic/
Returns: Comprehensive diagnostic info about alerts and absences
- Attendance summary (total, by status)
- Alert summary (total, by level, unresolved)
- Members with absences and their current state
- Notes on how to troubleshoot
```

### Recalculate All Alerts
```
POST /members/alerts/recalculate/
Returns: Summary of alerts created during recalculation
- Members processed
- Alerts created by level
- Total alerts created
```

### Resolve Alert
```
POST /members/alerts/{id}/resolve/
Body: { "resolution_notes": "Member attended service" }
Returns: Updated alert with is_resolved=true
```

### Log Contact
```
POST /members/contact-logs/
Body: {
  "member": 1,
  "contact_method": "email",
  "message_sent": "Check-in message",
  "contacted_by": "Pastor John",
  "response_received": "Member confirmed attending next week"
}
Returns: Created ContactLog record
```

---

## Database Schema for Alerts

### MemberAlert Table
```
id                  - Primary key
member_id          - Foreign key to Member
alert_level        - 'early_warning' | 'at_risk' | 'critical'
reason              - Human readable reason for alert
is_resolved         - True/False (resolved alerts still visible for audit)
created_at          - When alert created
resolved_at         - When alert resolved (null until resolved)
resolution_notes    - Notes on resolution
```

### Member Fields Used for Alerts
```
Member.consecutive_absences     - Counter (0+)
Member.attendance_status        - 'active' | 'at_risk' | 'inactive'
Member.engagement_score         - Score (0-100)
Member.last_attendance_date     - Most recent service attended
Member.last_contact_date        - Last pastoral contact date
```

---

## Common Issues & Solutions

### Issue: Created absences but alerts don't appear
**Solution:**
1. Verify member was actually marked absent
2. Run diagnostic: `GET /members/alerts/diagnostic/` 
3. Check member.consecutive_absences field
4. If out of sync, run recalculate: `POST /members/alerts/recalculate/`

### Issue: Alert created for wrong member
**Solution:**
1. Check attendance data for accuracy
2. Verify member.consecutive_absences counter
3. If wrong, edit Member.consecutive_absences directly in Django admin
4. Run recalculate to regenerate

### Issue: Can't see member in Care Dashboard
**Solution:**
1. Member must have unresolved alert (is_resolved=false)
2. Member must have consecutive_absences >= 2
3. Run diagnostic to see current state
4. May need to run recalculate if data is out of sync

### Issue: Alert doesn't disappear even when member attends
**Solution:**
1. Check in member for service
2. Run diagnostic to confirm consecutive_absences counter reset
3. If still showing, need to manually resolve alert
4. Or wait until Care Dashboard refreshes

---

## Summary: Care Dashboard Data Preparation

✅ **Alerts are created automatically** when members reach absence thresholds

✅ **Two triggers for alert generation:**
- Manual: "Mark Remaining as Absent" button
- Automatic: Service/session close endpoint

✅ **Three alert levels** based on consecutive absences:
- 2 absences → Early Warning (yellow)
- 4 absences → At Risk (orange)
- 8 absences → Critical (red)

✅ **Debugging tools available:**
- Diagnostic endpoint shows current state
- Recalculate endpoint rebuilds alerts from scratch
- Both accessible via API

✅ **Data sources:**
- Attendance table (core data)
- Member counters (consecutive_absences)
- MemberAlert table (unresolved alerts)
- ContactLog table (pastoral history)

The system is designed to be automatic and self-correcting via the recalculate endpoint.
