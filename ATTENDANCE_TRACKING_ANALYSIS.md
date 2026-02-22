# Attendance Tracking Analysis & Proposed Overhaul

## Current System Overview

### 1. How Member Attendance is Currently Tracked

#### Data Model
- **Service Model**: Stores church services/sessions with:
  - `date`, `start_time`, `end_time` (for sessions)
  - `is_recurring`, `parent_service`, `recurrence_pattern` (for recurring services)
  - `generated_until` (lazy-loading indicator)

- **Attendance Model**: Links members to services with:
  - `status` (present/absent)
  - `check_in_time` (when they physically checked in via QR)
  - `is_auto_marked` (Boolean indicating if absence was auto-triggered)
  - `created_at`, `updated_at`

- **Member Model**: Tracks:
  - `consecutive_absences` (count)
  - `attendance_status` (active/at_risk/inactive/vacation)
  - `engagement_score` (0-100)
  - `last_attendance_date`

#### Current Tracking Flow
1. **Check-in**: Member scans QR → Creates Attendance record with `status='present'`
2. **Manual Mark Absent**: Church leader calls `/attendance/mark_absent/` → Creates absent records for all unchecked members
3. **Auto Mark Absent**: Function `auto_mark_absent()` called when service ends → Creates absent records automatically
4. **Alert Generation**: 
   - Triggered in `update_member_absence_tracking()` when absence is marked
   - Based on `consecutive_absences` count:
     - 2 absences = "early_warning"
     - 4+ absences = "at_risk"  
     - 8+ absences = "critical"

### 2. Automatic Time Detection for Alerts

**Current Implementation:**
```python
def auto_mark_absent(service):
    # Checks if end_time exists
    if not service.end_time:
        return 0
    # Then marks all non-checked-in members as absent
```

**Analysis:**
- ❌ **NOT TRULY AUTOMATIC**: The `end_time` is just a field check, NOT checking if current time > end_time
- ❌ **Manual Trigger Required**: Requires manual API call to trigger, not time-based automatic execution
- ✅ **Useful for Intent**: Helps prevent auto-marking services without defined end times

**Is it Necessary?**
- **Partially**: The field check prevents marking sessions with undefined end times
- **Better Approach**: Should be a scheduled task (Celery) that auto-executes when end_time passes
- **Current Gap**: No scheduled task exists to automatically trigger at service end time

---

## Issues with Current Alert System

### Problem: Alert Counting Logic

**Current Logic:**
- Counts `consecutive_absences` from the entire `Attendance` table
- Escalates based on threshold jumps (2 → 4 → 8)
- One absence count = one alert per threshold level

**Your Requirement:**
- You want **proportional** alerting: if member has **2 absences out of 5** services (40% absent), count as **1 alert** (not multiple escalations)
- **Example**: 
  - 2/5 services missed = 1 alert
  - 3/5 services missed = still 1 alert (same ratio)
  - Different members with different service participation should be weighted similarly

---

## Proposed Overhaul

### Phase 1: Alert System Redesign

**Change Alert Calculation to Ratio-Based:**

```python
# Instead of: "consecutive_absences >= 2"
# Use: absent_count / total_services_attended >= threshold

ABSENTEEISM_THRESHOLDS = {
    'early_warning': 0.25,      # 25% absent
    'at_risk': 0.40,             # 40% absent
    'critical': 0.60,            # 60% absent
}
```

**New `MemberAbsenteeismAlert` Model:**
```python
class MemberAbsenteeismAlert(models.Model):
    member = ForeignKey(Member)
    absenteeism_ratio = FloatField()  # 0.0-1.0
    absent_count = IntegerField()
    total_sessions_attended = IntegerField()
    alert_level = CharField()
    is_resolved = BooleanField()
    created_at = DateTimeField()
    resolved_at = DateTimeField(null=True)
```

### Phase 2: Care Dashboard Overhaul

**New Dashboard Sections:**

1. **Member Attendance Summary Table**
   - Shows every member (not just alert members)
   - For each member: All past services/sessions with status badges
   - Color-coded: 🟢 Present | 🔴 Absent | ⏳ Pending | 📅 Upcoming

2. **Absenteeism Summary Cards**
   - Critical (60%+ absent): (count)
   - At Risk (40-59% absent): (count)
   - Early Warning (25-39% absent): (count)
   - Active (0-24% absent): (count)

3. **Individual Member Card**
   - Avatar/Name
   - Current absenteeism ratio (e.g., "3/8 sessions - 37.5%")
   - Alert badge (if applicable)
   - Recent attendance history (last 5 services)
   - Last contact date
   - Quick action buttons: Log Contact, View History

4. **Filters & Search**
   - By alert level
   - By department/group
   - By absenteeism range (0-25%, 25-40%, 40-60%, 60%+)
   - Search by member name

---

## Clarifying Questions Before Implementation

1. **Time Window for Alert Calculation:**
   - Should absenteeism ratio be calculated from:
     - Last 90 days? (current approach)
     - Last 6 months?
     - All time?
     - Rolling window by number of services (e.g., last 10 services regardless of date)?

2. **Scheduled Auto-Marking:**
   - Should we implement Celery task to auto-mark absent when `end_time` passes?
   - Should this run continuously or at specific intervals?

3. **One-Time vs Recurring Services:**
   - Should they be weighted differently in the ratio calculation?
   - Example: Missing 1/3 one-time services (33%) vs 1/3 weekly sessions?

4. **UI Layout Preference:**
   - Table format (sortable, filterable)?
   - Card/Grid format?
   - Timeline format (showing attendance chronologically)?

5. **Alert Resolution:**
   - Should alerts auto-resolve when absenteeism drops below threshold?
   - Manual resolution only?

6. **Historical Tracking:**
   - Keep old consecutive_absences data or migrate?
   - Display member's alert history?

---

## Database Migration Plan

### New Models
- `SessionAttendanceRecord` (more detailed tracking)
- `MemberAbsenteeismMetric` (stores calculated ratios)
- `MemberAbsenteeismAlert` (new alert system)

### Modified Models
- `Member`: Remove `consecutive_absences`, add `current_absenteeism_ratio`
- `Attendance`: Add `is_marked_manually` to distinguish manual vs auto vs check-in

### Migration Strategy
1. Create new models alongside existing
2. Backfill data from `Attendance` table
3. Gradually switch views to new alert system
4. Keep old system for 1 release as fallback

