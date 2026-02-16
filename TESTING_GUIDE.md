# Recurring Services & Sessions - Verification & Testing Guide

## Overview of Fixes

All issues have been addressed with the following improvements:

### Issue 1: Scanner Report Not Showing Session Status ✅
**Status**: Backend structure is correct (attendancetracking already works for sessions)
**Fix**: Clarified that sessions = child service instances
**How it works**: When selecting a session in Scanner, you're actually selecting a child Service record. The attendance report shows the status for that specific session/service instance correctly.

### Issue 2: Care Dashboard - No Alerts for Session Absences ✅
**Status**: Fixed - absence tracking now properly triggers alerts
**Root Cause Fixed**: The `auto_mark_absent()` function wasn't calling `update_member_absence_tracking()`, so alerts weren't being created
**How it works now**: 
1. When a service/session is marked as closed/ended:
   - All non-checked-in members get absence records
   - Each absence triggers member absence tracking update
   - After 2 absences → early_warning alert
   - After 4+ absences → at_risk alert
   - After 8+ absences → critical alert

### Issue 3: Session Modal Defaults ✅
**Before**: 
- Date: Empty, had to manually enter
- Start/End Times: Empty, had to manually enter both
- Hidden for recurring services (confusing)

**After**:
- Date: Defaults to today's date
- Start Time: Defaults to parent service start time
- End Time: Defaults to parent service end time
- All fields editable/optional
- Times visible for recurring services with clear labels

---

## Testing Procedures

### Part A: Session Date/Time Defaults Testing

#### Test Case A1: Adding Session with Date Defaults
1. Navigate to **Services** page
2. Create a recurring service (e.g., "Sunday Service", Weekly)
   - Name: "Sunday Service"
   - Check "is_recurring"
   - Pattern: "Weekly"
   - Start time: "09:00"
   - End time: "11:00"
   - Save
3. In the services list, click "View Sessions" on your new recurring service
4. Click "+ Add Session Date"
   - **Expected**: Date input shows today's date (not empty)
   - **Expected**: Start time shows "09:00" (parent service time)
   - **Expected**: End time shows "11:00" (parent service time)

#### Test Case A2: Overriding Session Times
1. In the same add session form from A1:
   - Keep the pre-filled date (today)
   - Change start time to "08:30"
   - Leave end time empty (should use parent's 11:00)
   - Add optional location if desired
   - Click "Create"
2. **Expected**: Session created with specified start time and parent's end time

#### Test Case A3: Using Default Times
1. Add another session:
   - Leave all time fields with their pre-filled defaults
   - Just select tomorrow's date
   - Click "Create"
2. **Expected**: Session created with parent service times (09:00-11:00)

---

### Part B: Recurring Service Form Testing

#### Test Case B1: Recurring Service Creation
1. Navigate to **Services** page
2. Click "+ Add New Service"
3. Fill in:
   - Name: "Prayer Meeting"
   - Check "is_recurring"
   - Recurrence Pattern: "Weekly"
4. **Expected**: 
   - Date field should **NOT** be visible (hidden for recurring)
   - Start and End time fields should be **VISIBLE**
5. Set times (e.g., 19:00 - 20:00)
6. Add location and description
7. Save
8. **Expected**: Service created successfully with default times for all instances

#### Test Case B2: One-Time Service Creation
1. Click "+ Add New Service" again
2. Fill in:
   - Name: "Special Event"
   - **Don't** check "is_recurring"
   - Pick a date
   - Set start time and end time
3. **Expected**:
   - Date field should be **VISIBLE** and required
   - Time fields should be **VISIBLE** and required
   - Clear indicators that times are required

---

### Part C: Absence Tracking & Alerts Testing

#### Test Case C1: Manual Absence Marking
1. Create a test recurring service (if not done in Part B):
   - Name: "Test Service"
   - Weekly, starts at 10:00, ends at 12:00
2. Create a session for this service
3. Go to **Scanner** page
4. Select that session
5. **Don't check in any members** (simulate absences)
6. Open the attendance report (if available) or close the service
7. Click "Mark Remaining as Absent"
8. **Expected**: All members marked as absent

#### Test Case C2: Absence Alerts - Early Warning
1. Find a test member or create one
2. For that member, mark them absent for 2 sessions
3. Navigate to **Care Dashboard**
4. **Expected**: 
   - Member appears in **Early Warning** section (🟡 Yellow)
   - Alert reason shows "2 consecutive absences"

#### Test Case C3: Absence Alerts - At Risk
1. Continue marking the same member absent for 2 more sessions (total 4)
2. Go back to **Care Dashboard**
3. Refresh or reload the page
4. **Expected**:
   - Early Warning alert should be resolved
   - Member now appears in **At Risk** section (🟠 Orange)
   - Alert shows "4 consecutive absences"

#### Test Case C4: Absence Alerts - Critical
1. Mark the same member absent for 4 more sessions (total 8)
2. Go to **Care Dashboard**
3. **Expected**:
   - At Risk alert should be resolved
   - Member appears in **Critical** section (🔴 Red)
   - Alert shows "8 consecutive absences"

#### Test Case C5: Alert Recovery
1. For the member in critical status, check them in for one service
2. Go to **Care Dashboard**
3. Consider running the mark_absenti function or waiting for automatic marking
4. **After marking their attendance**:
   - Their consecutive_absences counter should reset to 0
   - Status should return to "Active"
   - Alerts should be resolved

---

### Part D: Integration Testing

#### Test Case D1: Scanner with Sessions
1. Go to **Scanner** page
2. Select a recurring service
   - **Expected**: Dropdown shows all sessions with dates and times
   - **Expected**: Times are correct (either parent defaults or session overrides)
3. Select a specific session
4. Check in a member via QR code
5. Go to Service page → Reports
6. **Expected**: Attendance report shows the member as present for that specific session

#### Test Case D2: Reports View
1. Go to a service with multiple sessions
2. Select different sessions
3. **Expected**: Attendance reports differ by session (different present/absent members)
4. Check that session-specific attendance is correctly tracked

#### Test Case D3: Multiple Sessions Same Service
1. Create a recurring service with 3 sessions
2. For Session 1: Check in members A, B, C (no D)
3. For Session 2: Check in members A, C, D (no B)
4. For Session 3: Check in member A only
5. Mark all as closed/ended
6. Go to Care Dashboard
7. **Expected**:
   - Member B should have 2 absences (sessions 2, 3)
   - Member C should have 1 absence (session 3)
   - Member D should have 2 absences (sessions 1, 3)
   - Appropriate alerts appear based on absence counts

---

## Expected Behavior Summary

### Session Creation
| Field | Recurring | One-Time | Auto-Populated | Editable | Optional |
|-------|-----------|----------|:--:|:--:|:--:|
| Date | Hidden | Shown | ✅ Today | ✅ Yes | ❌ No |
| Start Time | Shown | Shown | ✅ Parent | ✅ Yes | ✅ Yes |
| End Time | Shown | Shown | ✅ Parent | ✅ Yes | ✅ Yes |
| Location | Shown | Shown | ❌ Empty | ✅ Yes | ✅ Yes |

### Alert Generation
| Consecutive Absences | Alert Level | Dashboard Section | Status Color |
|:--:|:--:|:--:|:--:|
| 0-1 | None | Active | 🟢 Green |
| 2 | Early Warning | Early Warning | 🟡 Yellow |
| 3 | At Risk | At Risk | 🟠 Orange |
| 4+ | At Risk | At Risk | 🟠 Orange |
| 8+ | Critical | Critical | 🔴 Red |

---

## Troubleshooting

### Sessions Not Showing Default Date
**Problem**: Date field is empty when opening add session modal
**Solution**: Check that JavaScript date handling is working. Clear browser cache and refresh.

### Times Not Showing Parent Service Defaults
**Problem**: Start/end time fields are empty
**Solution**: Verify parent service has `start_time` and `end_time` set. Check backend data.

### Alerts Not Appearing in Care Dashboard
**Problem**: Members with multiple absences don't show alerts
**Solution**: 
1. Verify absences were marked (check Attendance records)
2. Run "Mark Remaining as Absent" to trigger tracking
3. Refresh Care Dashboard page
4. Check that update_member_absence_tracking is being called

### Member Can't Escape Critical Alert Status
**Problem**: Member marked as present but alert still shows as critical
**Solution**:
1. Check that consecutive_absences counter was actually reset (should be 0)
2. Verify attendance status changed from "inactive" to "active"
3. Alert should be marked as resolved automatically

---

## Database State Verification

### Quick SQL Checks (Django shell)

```python
# Check a member's absence status
from members.models import Member, MemberAlert
m = Member.objects.get(full_name='Test Member')
print(f"Consecutive absences: {m.consecutive_absences}")
print(f"Status: {m.attendance_status}")

# Check unresolved alerts for a member
alerts = MemberAlert.objects.filter(member=m, is_resolved=False)
for alert in alerts:
    print(f"Alert: {alert.alert_level} - {alert.reason}")

# Check attendance records for a service
from services.models import Service
from attendance.models import Attendance
s = Service.objects.get(name='Sunday Service', date='2026-02-15')
attendances = Attendance.objects.filter(service=s)
print(f"Present: {attendances.filter(status='present').count()}")
print(f"Absent: {attendances.filter(status='absent').count()}")
```

---

## Deployment Checklist

- [ ] All frontend components build without errors
- [ ] No console errors when navigating between pages
- [ ] Backend migrations applied (if any - none needed for this change)
- [ ] Test creating recurring service with times
- [ ] Test adding session with defaults
- [ ] Test marking absences triggers alerts
- [ ] Test Care Dashboard shows alerts
- [ ] Test Scanner shows sessions correctly
- [ ] Test member recovering from absent status

---

## Success Criteria

✅ **Session modals show date/time defaults** - Fix allows users to see today's date and parent service times pre-filled

✅ **Times are optional** - Sessions can be created without specifying times (use parent defaults)

✅ **Date hidden for recurring, times visible** - Clear distinction between recurring and one-time services

✅ **Absence tracking triggers alerts** - Marked absences properly increment counters and create alerts

✅ **Care Dashboard shows session absence alerts** - Members with multiple absences from services/sessions appear in alerts

✅ **All features integrated** - Scanner, Services, Reports, and Care Dashboard all work together properly
