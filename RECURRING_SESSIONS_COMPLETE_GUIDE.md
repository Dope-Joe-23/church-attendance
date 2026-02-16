# Recurring Services & Sessions - Complete Documentation

## System Architecture Overview

### Core Concept
The Church Attendance system uses a **parent-child service model** for recurring services:

```
Recurring Service (Parent)
├── Database: Service model with is_recurring=true, parent_service=null
├── Times: start_time, end_time (default for all instances)
├── Range: Recurrence pattern (weekly/monthly)
└── Children: Multiple Service instances (one per occurrence)
    ├── Database: Service model with parent_service={parent_id}, date={occurrence_date}
    ├── Times: Inherited from parent OR overridden
    └── Attendance: Tracked independently per instance
```

### Session = Service Instance
In this system, **sessions don't have a separate model** - they are Service records where `parent_service` is set. This design allows:
- Maximum flexibility: Each session can have different times, location if needed
- Simpler data model: Reuse Service/Attendance models
- Consistent tracking: Attendance works the same way for services and sessions

---

## User Journey - Recurring Service Setup

### Step 1: Create Parent Recurring Service
1. Go to **Services** → "+ Add New Service"
2. Fill form:
   - **Service Name**: "Sunday Service"
   - **Check** "Is Recurring?"
   - **Recurrence Pattern**: "Weekly" 
   - **Start Time**: "09:00" (shown - default for all instances)
   - **End Time**: "11:00" (shown - default for all instances)
   - *Note: Date field is hidden for recurring services*
3. Click "Create Service"

**Backend Action**: Service created with:
- `is_recurring=True`
- `recurrence_pattern='weekly'`
- `start_time='09:00'`
- `end_time='11:00'`
- `parent_service=null`
- `date=null` (not applicable for parent service)

**Frontend Action**: Parent service appears in Services list with "N sessions" indicator

### Step 2A: Auto-Generate Sessions (Weekly)
*Automatic when service is created OR manual via generate-instances endpoint*

Backend automatically generates instances for the next 3 months:
- Every Sunday (matching the parent's date weekday)
- Each instance: Child Service with `parent_service={parent_id}`, `date={occurrence_date}`

**Result**: 13 sessions created for next 3+ months

### Step 2B: Manually Add a Specific Session
1. In Services page, click service → "View Sessions"
2. In Sessions Modal, click "+ Add Session Date"
3. Form appears with **defaults pre-filled**:
   - **Date**: Today's date (YYYY-MM-DD)
   - **Start Time**: "09:00" (from parent)
   - **End Time**: "11:00" (from parent)
   - **Location**: Empty (can override)
4. Options:
   - **Keep all defaults**: Just click Create → Session created with parent times
   - **Override time**: Change start to "08:30" → Session created with custom time
   - **Skip times entirely**: Leave empty → Session created with parent times

**Backend Action**: 
```python
create_service_instance(
    parent_service=service,
    instance_date=date(2026-02-22),
    start_time='08:30' or None,  # If None, uses parent's 09:00
    end_time=None,  # If None, uses parent's 11:00
    location='Special location or None'  # If None, uses parent's location
)
```

**Result**: New Service instance created as child of parent service

---

## User Journey - Attendence Taking & Tracking

### Step 1: Select Service/Session for Check-In
1. Go to **Scanner** page
2. See list of services:
   - Parent services show "# sessions" 
   - Click parent → Dropdown shows all child sessions with dates/times
   - Select specific session
3. Scanner opens for that session (Service instance)

**Frontend Action**: 
```javascript
selectedService = Session(id=101, parent_service=1, date=2026-02-15, start_time=09:00)
```

### Step 2: Take Attendance
1. Members scan QR codes
2. Each check-in creates: `Attendance(member=X, service=101, status='present')`
3. System tracks attendance per session (not per parent service)

### Step 3: End Session - Mark Remaining as Absent
1. Session ends (or admin clicks "Mark Remaining as Absent")
2. System finds all members NOT checked in
3. Creates: `Attendance(member=Y, service=101, status='absent', is_auto_marked=True)`
4. **For each absence created**:
   - Calls `update_member_absence_tracking(member, 'absent')`
   - Increments member's `consecutive_absences` counter
   - Checks against thresholds (2, 4, 8)
   - Creates/updates `MemberAlert` records as needed

**Result**:
- Member A: Attendance(status='present') for session 101
- Member B: Attendance(status='absent', is_auto_marked=True) for session 101
- Member B's consecutive_absences incremented
- If threshold reached → MemberAlert created

---

## Absence Tracking & Alerts System

### Member Absence State Tracking

```
Member state transitions:
         ↓
    CREATE/UPDATE event
         ↓
update_member_absence_tracking()
         ↓
IF status='present':
  - consecutive_absences = 0
  - attendance_status = 'active'
  - Resolve any existing alerts (mark as resolved)
         ↓
ELSE IF status='absent':
  - consecutive_absences += 1
  - IF count == 2: CREATE early_warning alert
  - IF count == 4: Resolve early_warning, CREATE at_risk alert
  - IF count == 8: Resolve at_risk, CREATE critical alert
         ↓
   SAVE updated member
         ↓
   Alert available in Care Dashboard
```

### Alert Generation Threshold

| Event | Consecutive Absences | Alert Created | Alert Level | Previous Alert |
|:---:|:---:|:---:|:---:|:---:|
| Check in | 0 | Resolve all | - | Marked resolved |
| 1st absence | 1 | None | - | - |
| 2nd absence | 2 | ✅ Yes | early_warning | - |
| 3rd absence | 3 | No change | early_warning | - |
| 4th absence | 4 | ✅ New | at_risk | early_warning resolved |
| 5-7th absences | 5-7 | No change | at_risk | - |
| 8th absence | 8 | ✅ New | critical | at_risk resolved |

---

## Care Dashboard - Alert Display

### How Alerts Are Fetched
1. Dashboard queries: `GET /members/alerts/unresolved/`
2. Backend returns all unresolved `MemberAlert` records
3. Frontend groups by `alert_level`: early_warning, at_risk, critical
4. Displays in three sections with counts

### Alert Information Shows
- **Member Name**
- **Alert Level** with visual indicator (🟡🟠🔴)
- **Reason/Details**: e.g., "2 consecutive absences - Early warning threshold reached"
- **Member Stats**: 
  - Consecutive absences count
  - Attendance percentage
  - Last attendance date
  - Status (active/at_risk/inactive)

### Taking Action
1. Click member to view details
2. See all contact logs for that member
3. Log contact/session notes
4. Manually resolve alert if needed with resolution notes

---

## Report Views - Session-Specific Attendance

### Scanner Report
**Available in**: Scanner page (when service/session selected)
- Shows attendance for **selected session only**
- NOT for parent service (parent has no check-ins)
- Lists: 
  - Member name, contact info, group
  - **Status**: Present/Absent/Late for **this session**
  - Check-in time

**Key Distinction**: 
- Selecting parent service → Shows "No sessions" (parent has no attendance)
- Selecting session → Shows attendance records for that specific session

### Services Page Report
**Available in**: Services → View Sessions → Select Session → Scanner
- Same data as Scanner Report
- Shows attendance for the selected session

---

## Data Model Summary

### Service Table
```
Service (Parent):
  id = 1
  name = "Sunday Service"
  date = NULL (parent services don't have dates)
  start_time = "09:00"
  end_time = "11:00"
  is_recurring = TRUE
  recurrence_pattern = "weekly"
  parent_service = NULL
  
Service (Child/Session):
  id = 101
  name = "Sunday Service"
  date = "2026-02-15" (specific occurrence)
  start_time = "09:00" or CUSTOM
  end_time = "11:00" or CUSTOM
  is_recurring = FALSE
  recurrence_pattern = "none"
  parent_service = 1 (points to parent)
```

### Attendance Table
```
Attendance records are created for EACH SERVICE (parent OR child):
  
For Session 101 (2026-02-15):
  Attendance(id=501, member=John, service=101, status='present')
  Attendance(id=502, member=Mary, service=101, status='absent')
  Attendance(id=503, member=Peter, service=101, status='present')

For Session 102 (2026-02-22):
  Attendance(id=601, member=John, service=102, status='absent')
  Attendance(id=602, member=Mary, service=102, status='present')
  Attendance(id=603, member=Peter, service=102, status='present')
```

### Member Alert Table
```
MemberAlert records track absence patterns:

  MemberAlert (id=1001):
    member = John
    alert_level = "early_warning"
    reason = "2 consecutive absences - Early warning threshold reached"
    is_resolved = FALSE
    created_at = 2026-02-23
    
*After John gets 2 more absences (4th absence):*

  MemberAlert (id=1001): is_resolved = TRUE
  MemberAlert (id=1002):
    member = John  
    alert_level = "at_risk"
    reason = "4 consecutive absences - Engagement concern threshold reached"
    is_resolved = FALSE
```

---

## API Endpoints Used

### Service Management
- `POST /services/` - Create service (parent or one-time)
- `POST /services/{id}/add_instance/` - Add single session with optional times
- `POST /services/{id}/generate_instances/` - Generate recurring instances (3 months)

### Attendance Management  
- `POST /attendance/checkin/` - Check in member via QR
- `POST /attendance/mark_absent/` - Mark remaining members absent
- `GET /attendance/by_service/?service_id=X` - Get attendance for specific service/session

### Alert Management
- `GET /members/alerts/unresolved/` - Get all unresolved alerts
- `POST /members/alerts/{id}/resolve/` - Mark alert as resolved

---

## Common Workflows

### Workflow 1: Weekly Service with Multiple Sessions
1. Create parent "Sunday Service" (weekly) with times 09:00-11:00
2. System auto-generates sessions for all Sundays
3. Each Sunday:
   - Scanner page shows session in dropdown
   - Staff selects Sunday session
   - Members check in
   - Service marked ended
   - Non-checked-in members marked absent
   - Absences trigger alert system

### Workflow 2: One-Time Event
1. Create "Anniversary Event" (NOT recurring)
2. Specify date, times, location
3. Open Scanner on event date
4. Take attendance
5. Mark remaining absent
6. Report shows attendance for this single service

### Workflow 3: Session Time Override
1. Sunday Service normally 09:00-11:00
2. Special request: One Sunday event starts at 08:00
3. Add session date with custom start_time="08:00"
4. System creates session with that time
5. Attendance taken for that specific session with custom times

---

## Summary: What's Fixed

✅ **Session Date Defaults**
- Session modals now show today's date by default
- Users can still change it if needed
- Reduces manual data entry

✅ **Session Time Defaults**  
- Session modals show parent service times pre-filled
- Times are optional - can leave blank to use parent times
- Can override if session needs different times

✅ **Recurring Service Form**
- Date field only shown for one-time services
- Time fields visible for ALL services (recurring and one-time)
- Clear labels distinguish between recurring defaults and required one-time fields
- Resolves confusion about where to set times for recurring services

✅ **Absence Tracking for Sessions**
- When session ends and members marked absent, absence tracking automatically triggers
- Increments consecutive_absences counter
- Creates alerts when thresholds are reached (2, 4, 8)
- Care Dashboard properly shows all absence alerts

✅ **Session-Specific Reporting**
- Reports show attendance for specific sessions, not parent services
- Scanner page groups services by parent service but allows selection of specific sessions
- Each session tracked independently

---

## Files Modified

1. **frontend/src/components/SessionsModal.jsx** 
   - Date defaults to today
   - Times default to parent service
   - Times made optional

2. **frontend/src/components/AddServiceDateModal.jsx**
   - Added time and location fields with parent defaults
   - Made times optional

3. **frontend/src/components/ServiceFormModal.jsx**
   - Date field hidden for recurring services only
   - Time fields visible for all services
   - Clarified required vs optional fields

4. **backend/services/utils.py**
   - Enhanced auto_mark_absent to call update_member_absence_tracking
   - Now properly creates alerts when absences are marked

---

## Next Steps (Optional Future Enhancements)

- Add "Mark Present" bulk action for sessions
- Add SMS/Email notifications when alerts are triggered
- Add session-level notes for pastoral staff
- Add attendance analytics dashboard
- Add member feedback option for absence reasons
