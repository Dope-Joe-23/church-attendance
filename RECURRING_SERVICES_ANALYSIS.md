# Recurring Services & Sessions - Current Implementation Analysis

## Current Architecture

### Services and Sessions Concept
- **Service Model**: Represents both "one-time services" and "recurring parent services"
- **Sessions**: Implemented as child Service instances linked to a parent service via `parent_service` FK
- **Attendance**: Tracked against Service records (no separate session attendance model)

### Key Findings

#### Issue 1: Scanner Report - Sessions Status Not Showing
**Problem**: Attendance reports show present/absent for services but not distinctly for sessions
**Root Cause**: 
- The attendance data structure works correctly (records are tied to services/sessions)
- But the UI may not be clearly distinguishing between parent service sessions
- The AttendanceReport component doesn't differentiate between parent and child services

**Current Flow**:
- Service with `is_recurring=true` and `parent_service=null` = Parent recurring service
- Service with `parent_service={id}` = Child session/instance
- Attendance records are created against both parent and child services

#### Issue 2: Care Dashboard - No Alerts for Absences
**Problem**: Dashboard shows no alerts despite members missing services/sessions
**Root Cause**:
- Alerts are only created when `consecutive_absences` reaches thresholds (2, 4, 8)
- Absence tracking only updates when attendance is explicitly marked (checkin or mark_absent)
- Sessions without explicit attendance marking don't trigger absence updates
- The system doesn't automatically create "absent" records for missed sessions

**Current Alert Creation Logic**:
```
- 2 absences → early_warning alert
- 4 absences → at_risk alert  
- 8 absences → critical alert
```

**Real Problem**: When sessions are created, members don't automatically get attendance records (marked absent) if they don't check in. This prevents the absence tracking from working.

#### Issue 3: Session Date/Time Modal Issues
**Current Behavior in SessionsModal**:
- Date input has no default value (should default to today)
- Start/End time inputs are required (should be optional and default to parent service times)
- No population of parent service times as defaults

**Missing**: When submitting, optional times should fallback to parent service times

## Required Fixes

### 1. Automatic Absence Marking for Sessions
- When a service/session ends, mark all non-checked-in members as absent
- This triggers the absence tracking mechanism
- Currently only happens when manually clicking "Mark Remaining as Absent"

### 2. Session Modal Enhancements
- Default date to today's date
- Pre-fill start_time/end_time from parent service
- Make times optional - if not provided, use parent service times
- Hide date field (only) when creating recurring parent service, not start/end times

### 3. Attendance Report Clarification
- Clearly label when viewing parent service vs session
- Show session details in attendance records
- Distinguish parent service attendance from session attendance

### 4. Care Dashboard Integration
- Ensure alerts are created for all absences (not just consecutive)
- Or modify threshold checking to work with session-based tracking
- Show session-specific absence info in alerts

## Implementation Plan

1. **Backend Changes** (services/utils.py):
   - Enhance `auto_mark_absent()` to handle recurring services
   - For parent services, mark absent in all child sessions
   - Ensure member alerts are properly created

2. **Backend API** (services/views.py & attendance/views.py):
   - Add session-aware endpoints for attendance reporting
   - Enhance mark_absent to handle session instances

3. **Frontend Changes** (SessionsModal.jsx):
   - Add date default (today)
   - Add start_time/end_time defaults from parent
   - Make times optional with validation

4. **Frontend Changes** (AddServiceDateModal.jsx):
   - Add time and location fields
   - Population with parent service defaults
   - Conditional hiding of fields based on service type

5. **Frontend Changes** (Services.jsx):
   - Update form to hide date field for recurring parent services
   - Show start/end time fields for all service types

## Data Flow for Absence Tracking

```
Service Ends (or marked as closed)
    ↓
auto_mark_absent() called
    ↓
Get all non-visitor members
    ↓
Create/Update Attendance records with status='absent'
    ↓
update_member_absence_tracking() called with 'absent'
    ↓
Increment consecutive_absences counter
    ↓
Check against thresholds (2, 4, 8)
    ↓
Create/Update MemberAlert records
    ↓
Care Dashboard fetches unresolved alerts
```

## Testing Strategy

1. Create a recurring service (e.g., "Sunday Service" - weekly)
2. Generate multiple instances (sessions)
3. Create test members without check-ins
4. Mark a session as closed/ended
5. Verify absence records are created
6. Verify alerts appear in Care Dashboard after threshold is reached
