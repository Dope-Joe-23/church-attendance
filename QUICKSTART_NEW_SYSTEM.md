# Quick Start: New Attendance & Alert System

## What Changed?

### Old System
- Counted consecutive absences (2 → 4 → 8)
- Didn't account for different participation levels
- Manual alert resolution only

### New System ✨
- **Ratio-based**: 25%+ absent = alert
- **Weighted**: Recurring services count 1.5x more
- **Last 10 services**: Per-member metric calculation
- **Better UI**: Table with all members, not just alerts
- **Optional auto**: Celery task can auto-mark when service ends

---

## Setup (Backend)

### 1. Database
```bash
cd backend
python manage.py migrate
```
✅ Already applied - new tables created

### 2. Dependencies (Optional: Celery)
```bash
pip install celery celery-beat redis
```
Or skip if you want to use manual `/attendance/mark_absent/` endpoint.

### 3. Verify Setup
```bash
python manage.py check
# System check identified no issues
```

---

## Using the System

### Scenario 1: Mark Attendance (QR Check-in)
```bash
POST /attendance/checkin/
{
    "member_id": "ABC123",
    "service_id": 5
}
```
**Behind the scenes:**
- Creates Attendance record (present)
- Calculates member's last 10 services
- Checks if absenteeism ratio changed
- Creates/resolves alert if needed

### Scenario 2: Mark Members Absent (Manual)
```bash
POST /attendance/mark_absent/
{
    "service_id": 5
}
```
**Result:** All non-checked-in members marked absent for service 5

### Scenario 3: View Attendance Metrics
```bash
GET /members/absenteeism-metrics/by_member/?member_id=123
```
**Response:**
```json
{
  "member": 123,
  "member_name": "John Doe",
  "total_services": 8,
  "absent_count": 3,
  "present_count": 5,
  "absenteeism_ratio": 0.357,
  "absenteeism_percentage": 35.7,
  "recurring_absent": 2,
  "recurring_present": 4,
  "onetime_absent": 1,
  "onetime_present": 1
}
```

### Scenario 4: View Unresolved Alerts
```bash
GET /members/absenteeism-alerts/unresolved/
```
**Response:**
```json
[
  {
    "id": 42,
    "member": 123,
    "member_name": "John Doe",
    "alert_level": "early_warning",
    "absenteeism_percentage": 35.7,
    "reason": "3 absences out of 8 services (35.7%)",
    "is_resolved": false,
    "created_at": "2026-02-22T10:30:00Z"
  }
]
```

### Scenario 5: Resolve an Alert
```bash
POST /members/absenteeism-alerts/42/resolve/
{
    "resolution_notes": "Member contacted and explained absence"
}
```
**Note:** Once resolved, won't show in unresolved list anymore

---

## Care Dashboard

### Access
Visit: `http://localhost:5173/care`

### Features

**Statistics Cards** (Top)
- Shows count of members at each severity level
- 🔴 Critical: 60%+ absent
- 🟠 At Risk: 40-59% absent  
- 🟡 Warning: 25-39% absent
- 🟢 Active: 0-24% absent

**Search & Filter**
- 🔍 Search by name or member ID
- 📊 Filter by alert status
- 📈 Sort by absenteeism or name
- 🔄 Refresh to reload data

**Members Table**
- Shows ALL members (not just alert members)
- Absenteeism % calculated from last 10 services
- Click "View" to see attendance history
- Click "Resolve" to resolve alert

---

## Alert Thresholds

| Status | Range | Trigger |
|--------|-------|---------|
| 🟢 Active | 0-24% | No action needed |
| 🟡 Early Warning | 25-39% | Consider outreach |
| 🟠 At Risk | 40-59% | Follow up needed |
| 🔴 Critical | 60%+ | Urgent intervention |

## How Absenteeism % is Calculated

```
Metric = Last 10 services attended (by this member, descending date)

Example:
Service 1 (recurring): Present    = 1.5 × 1.0 = 1.5 weighted
Service 2 (one-time): Absent      = 1.0 × 1.0 = 1.0 weighted
Service 3 (recurring): Present    = 1.5 × 1.0 = 1.5 weighted
Service 4 (recurring): Absent      = 1.5 × 1.0 = 1.5 weighted
... (6 more)

Weighted Total = sum of all weights (including those not shown)
Weighted Absent = sum of absent weights

Absenteeism % = Weighted Absent / Weighted Total
```

---

## Optional: Celery Auto-Marking

### Why?
Automatically mark members absent when service end time passes. No manual call needed.

### Setup
1. Install Redis (`redis-cli` or Docker)
2. Install Python packages from requirements.txt
3. Create `.env` with Celery config:
```env
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

4. Start Celery worker (new terminal):
```bash
cd backend
celery -A church_config worker -l info
```

5. Start Celery Beat (another new terminal):
```bash
cd backend
celery -A church_config beat -l info
```

### Task Details
- **Runs every**: 5 minutes
- **Checks for**: Services where current time > end_time
- **Auto-marks**: Non-checked-in members as absent
- **Updates**: Absenteeism metrics and alerts automatically

### Without Celery
Just use the manual endpoint:
```bash
POST /attendance/mark_absent/
{
    "service_id": 5
}
```

---

## Troubleshooting

### "No absenteeism metrics showing"
**Solution:** Recalculate metrics
```bash
POST /members/absenteeism-metrics/recalculate_all/
```

### "Alert didn't trigger after marking absent"
**Solution:** Check ?recalculate param
```bash
GET /members/absenteeism-alerts/unresolved/?recalculate=true
```

### "Celery worker not starting"
**Solution:** Make sure Redis is running
```bash
# Windows (if using Docker):
docker run -d -p 6379:6379 redis:latest

# Or check if already running:
redis-cli ping
```

### "Dashboard loads slowly"
**Solution:** Use filters to reduce displayed members
- Filter by alert status
- Search for specific member
- Check database is not under heavy load

---

## API Reference

### Attendance
- `POST /attendance/checkin/` - Check in member via QR
- `POST /attendance/mark_absent/` - Mark all non-checked-in absent
- `GET /attendance/by-service/?service_id=1` - Get service attendance

### Metrics
- `GET /members/absenteeism-metrics/` - List all metrics
- `GET /members/absenteeism-metrics/by_member/?member_id=1` - Get one member
- `POST /members/absenteeism-metrics/recalculate_all/` - Rebuild all

### Alerts
- `GET /members/absenteeism-alerts/unresolved/` - Unresolved only
- `GET /members/absenteeism-alerts/by_level/?level=critical` - Filter by level
- `POST /members/absenteeism-alerts/{id}/resolve/` - Resolve manually

### Members
- `GET /members/` - List all members
- `GET /members/{id}/` - Get one member with full details
- `GET /members/by_member_id/?member_id=ABC123` - Get by member_id

---

## Example: Complete Flow

### Sunday Service: 10:00 AM - 11:30 AM

**10:30 AM - Members check in**
```
Member John scans QR:
  POST /attendance/checkin/ with member_id=ABC123, service_id=5
  → Attendance created (present)
  → Absenteeism metric updated for John
  → Alert resolved if John was at risk
```

**11:35 AM - Service ends, mark absences (MANUAL or AUTOMATIC)**

Manual:
```
POST /attendance/mark_absent/ with service_id=5
  → All non-checked-in members marked absent
  → Each member's metric recalculated
  → New alerts created for members hitting thresholds
```

Automatic (if Celery running):
```
Celery task runs every 5 mins
  At 11:35 AM, detects service 5 end_time passed
  → Marks all non-checked-in as absent
  → Updates metrics and alerts automatically
```

**12:00 PM - Care team reviews dashboard**
```
Open /care dashboard:
  → See 3 members with new early_warning alerts
  → Click "View" on member to see attendance history
  → Click "Resolve" after pastoral contact
```

---

## Key Differences from Old System

| Feature | Old | New |
|---------|-----|-----|
| Calculation | Consecutive count | Ratio-based % |
| Window | All-time | Last 10 services |
| Weighting | None | Recurring 1.5x |
| Alert count | Multiple per threshold | 1 per member |
| Resolution | Manual only | Manual only |
| Dashboard | Alert members only | ALL members visible |
| Interface | Card layout | Table layout |

---

## Questions?

Refer to detailed docs:
- [IMPLEMENTATION_SUMMARY_NEW_ALERT_SYSTEM.md](./IMPLEMENTATION_SUMMARY_NEW_ALERT_SYSTEM.md) - Full technical details
- [ATTENDANCE_TRACKING_ANALYSIS.md](./ATTENDANCE_TRACKING_ANALYSIS.md) - Requirements analysis
