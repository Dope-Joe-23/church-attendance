# Lazy-Load Sessions - Visual Architecture

## Comparison: Batch vs Lazy-Load

### 1. BATCH GENERATION (Old Approach) ❌

```
Timeline: Create recurring service
│
├─ Time: 0ms
│  └─ API: POST /services/
│     └─ Create parent + 13 child instances
│        (All created upfront in single operation)
│
├─ Database After Creation
│  │
│  ├─ Service (parent): { id:1, date:null, generated_until:null }
│  │
│  └─ Service (instances): 13 records
│     ├─ { id:101, date:2026-02-22, parent:1 }
│     ├─ { id:102, date:2026-03-01, parent:1 }
│     ├─ { id:103, date:2026-03-08, parent:1 }
│     └─ ... (13 total)
│
├─ After 3 months
│  └─ ❌ Services run out!
│     (Only had 13 sessions, now need more)
│
└─ Problem: Need manual intervention to extend
```

### 2. LAZY-LOAD GENERATION (New Approach) ✅

```
Timeline: Create recurring service
│
├─ Step 1: Create Parent (Time: 5ms)
│  │
│  └─ API: POST /services/
│     └─ Create parent ONLY
│        ├─ { id:1, name:"Sunday Worship", date:null, generated_until:null }
│        └─ ZERO child instances created
│
├─ Step 2: Generate Sessions on Demand (Time: 100ms)
│  │
│  └─ API: POST /services/1/generate-instances/
│     └─ API Request: { until_date: 2026-06-15 }
│        └─ Response: { generated: 18, existing: 0, generated_until: 2026-06-15 }
│
│        Database After Generation:
│        ├─ Service (parent): { generated_until: 2026-06-15 }
│        │
│        └─ Service (instances): 18 records
│           ├─ { id:101, date:2026-02-22, parent:1 }
│           ├─ { id:102, date:2026-03-01, parent:1 }
│           └─ ... (18 total, stop at 2026-06-15)
│
├─ Step 3: Extend Later (Time: 50ms, only new sessions)
│  │
│  └─ API: POST /services/1/generate-instances/
│     └─ API Request: { until_date: 2026-12-31 }
│        └─ Response: { generated: 28, existing: 18, generated_until: 2026-12-31 }
│
│        Database After Extension:
│        ├─ Service (parent): { generated_until: 2026-12-31 }
│        │
│        └─ Service (instances): 46 total
│           ├─ [Existing 18 from June]
│           └─ [New 28 from June to December]
│
└─ ✅ Unlimited: Can extend to years ahead!
   Only creates what's needed when needed
```

## Data Model Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Service (Parent Template)                 │
├─────────────────────────────────────────────────────────────┤
│ id:                1                                         │
│ name:              "Sunday Worship"                          │
│ start_time:        "09:00:00"                              │
│ end_time:          "11:00:00"                              │
│ location:          "Main Sanctuary"                         │
│                                                             │
│ is_recurring:      True    ← Marks as recurring            │
│ recurrence_pattern: "weekly" ← Generate every 7 days       │
│ parent_service:    NULL    ← This IS the parent            │
│                                                             │
│ date:              NULL    ← Templates have no date        │
│ generated_until:   2026-06-15 ← Tracks frontier            │
│                                                             │
│ created_at:        2026-02-15 22:00:00                      │
│ updated_at:        2026-02-18 14:30:00                      │
└─────────────────────────────────────────────────────────────┘
         │
         │ has many
         │ (one-to-many relationship via parent_service FK)
         │
         ├─ ┌─────────────────────────────────┐
         │  │ Service (Instance 1)            │
         │  ├─────────────────────────────────┤
         │  │ id: 101                         │
         │  │ date: 2026-02-22         ← Session date
         │  │ parent_service: 1        ← Points to parent
         │  │ [other fields from parent]
         │  └─────────────────────────────────┘
         │
         ├─ ┌─────────────────────────────────┐
         │  │ Service (Instance 2)            │
         │  ├─────────────────────────────────┤
         │  │ id: 102                         │
         │  │ date: 2026-03-01        ← Next week
         │  │ parent_service: 1               │
         │  │ [other fields from parent]
         │  └─────────────────────────────────┘
         │
         ├─ ┌─────────────────────────────────┐
         │  │ Service (Instance 3)            │
         │  ├─────────────────────────────────┤
         │  │ id: 103                         │
         │  │ date: 2026-03-08        ← Next week
         │  │ parent_service: 1               │
         │  │ [other fields from parent]
         │  └─────────────────────────────────┘
         │
         └─ ... (only up to generated_until: 2026-06-15)
```

## Request/Response Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT / FRONTEND                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ POST /api/services/
                           ↓
       ┌───────────────────────────────────────────────┐
       │ {                                             │
       │   "name": "Sunday Worship",                   │
       │   "is_recurring": true,                       │
       │   "recurrence_pattern": "weekly",             │
       │   "start_time": "09:00:00"                   │
       │ }                                             │
       └───────────────────┬─────────────────────────┘
                           │
                           ↓
       ┌───────────────────────────────────────────────┐
       │ ServiceViewSet.perform_create()               │
       │                                               │
       │ 1. Service.objects.create(...)     ✓         │
       │    (Creates parent template only)              │
       │                                               │
       │ 2. No auto-generation!             ✓         │
       │    (Uses lazy-loading approach)               │
       └───────────────────┬─────────────────────────┘
                           │
                           ↓
       ┌───────────────────────────────────────────────┐
       │ Response:                                     │
       │ {                                             │
       │   "id": 1,                                   │
       │   "generated_until": null,                    │
       │   "instances": []    ← No children yet!      │
       │ }                                             │
       └───────────────────┬─────────────────────────┘
                           │
                           │ (Later) POST /api/services/1/generate-instances/
                           │ {"until_date": "2026-12-31"}
                           ↓
       ┌───────────────────────────────────────────────┐
       │ ServiceViewSet.generate_instances()           │
       │                                               │
       │ 1. generate_sessions_until(parent, until_date)│
       │    ├─ Check parent.generated_until            │
       │    ├─ Loop from generated_until to until_date │
       │    ├─ Skip existing sessions                  │
       │    ├─ Create new Service instances            │
       │    └─ Update parent.generated_until           │
       │                                               │
       │ 2. Return result dict                         │
       └───────────────────┬─────────────────────────┘
                           │
                           ↓
       ┌───────────────────────────────────────────────┐
       │ Response:                                     │
       │ {                                             │
       │   "generated": 52,          ← New created     │
       │   "existing": 5,            ← Already there  │
       │   "generated_until": "2026-12-31",            │
       │   "instances": [
       │     {id:1, date:null},      ← Parent
       │     {id:101, date:2026-02-22},               │
       │     {id:102, date:2026-03-01},               │
       │     ...                                       │
       │   ]                                           │
       │ }                                             │
       └───────────────────┬─────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT / FRONTEND                            │
│ ✓ Now have 52 Sunday sessions up to end of year!              │
│ ✓ Can display in calendar                                     │
│ ✓ Can mark attendance                                         │
│ ✓ Later: extend to more dates via same endpoint               │
└─────────────────────────────────────────────────────────────────┘
```

## Generation Timeline

```
Week 1-4 (Feb 22 - Mar 15)
│
├─ Day 1: Create parent
│         └─ Service { id:1, date:null, generated_until:null }
│
├─ Day 2: Generate 3 months
│         └─ generate_sessions_until(parent, date(2026-05-22))
│            ├─ Creates 13 sessions
│            └─ parent.generated_until = 2026-05-22
│
├─ Day 15: User requests May data
│          └─ get_sessions_for_range(parent, May 1, May 31)
│             ├─ Checks: generated_until = 2026-05-22? ✓
│             └─ Returns 4 May sessions (from existing batch)
│
└─ Day 30: User requests December data
           └─ get_sessions_for_range(parent, Dec 1, Dec 31)
              ├─ Checks: generated_until = 2026-05-22? ✗
              ├─ Auto-generates up to Dec 31 (lazy-loading!)
              │  └─ Creates 33 more sessions (June-Dec)
              │     parent.generated_until = 2026-12-31
              └─ Returns 5 December sessions (newly created)

Key: Lazy-loading generates only what's needed, when needed! 🚀
```

## Size Comparison Chart

```
Services Generated vs DB Size Over Time

OLD BATCH APPROACH:
│
│ 50 records ┤                      ┌─────────────
│            │                      │ (capped at 3 months)
│ 40 records ┤                      │
│            │                      │
│ 30 records ┤                 ┌────┘
│            │                 │    (runs out here!)
│ 20 records ┤            ┌────┘
│            │            │
│ 10 records ┤       ┌────┘
│            ├──┐    │
│  0 records ┤  └────┴──────────────────────────
│            └─────┬────────┬────────┬───────
│                 1mo      3mo       6mo      1yr
│
Result: Limited, runs out, needs manual intervention


NEW LAZY-LOAD APPROACH:
│
│ 50 records ┤
│            │
│ 40 records ┤                            ┌────
│            │                       ┌────┘
│ 30 records ┤                  ┌────┘
│            │             ┌────┘
│ 20 records ┤        ┌────┘
│            │   ┌────┘
│ 10 records ┤   │
│            ┤───┘
│  0 records ├────────────────────────────
│            └─────┬────────┬────────┬───────
│                 1mo      3mo       6mo      1yr
│
Result: Scales perfectly, only creates what's needed
         Can extend indefinitely as needed
```

## Update Behavior Diagram

```
PARENT SERVICE UPDATE SCENARIO

Parent: { name: "Sunday Worship", start_time: "09:00:00", generated_until: "2026-06-15" }

Existing Sessions (Before Update):
  ├─ 2026-02-22: { start_time: 09:00 }  ← Created in February
  ├─ 2026-03-01: { start_time: 09:00 }  ← Created in March
  └─ 2026-06-15: { start_time: 09:00 }  ← Last in batch


ACTION: Update Parent
  parent.start_time = "09:30:00"
  parent.save()


BEHAVIOR:
  ├─ Parent now: { start_time: 09:30 }
  │
  ├─ Existing instances: UNCHANGED ✓ (immutable for audit)
  │  ├─ 2026-02-22: { start_time: 09:00 }  ← Still 09:00
  │  ├─ 2026-03-01: { start_time: 09:00 }  ← Still 09:00
  │  └─ 2026-06-15: { start_time: 09:00 }  ← Still 09:00
  │
  └─ Future instances: WILL USE UPDATE ✓ (not yet created)
     If generate_sessions_until(parent, 2026-12-31):
      ├─ 2026-06-22: { start_time: 09:30 }  ← NEW from parent!
      ├─ 2026-06-29: { start_time: 09:30 }  ← NEW from parent!
      └─ 2026-12-31: { start_time: 09:30 }  ← NEW from parent!


RESULT:
  ✅ Existing sessions: Keep original values (audit trail)
  ✅ Future sessions: Inherit parent's new values
  ✅ Perfect for gradually changing service times/locations
```

## System Overview

```
                ┌────────────────────────┐
                │   RECURRING SERVICE    │
                │      API LAYER         │
                └───────────┬────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ↓                   ↓                   ↓
    ┌────────┐         ┌──────────┐      ┌──────────┐
    │ Create │         │Lazy-Load │      │  Add     │
    │Service │         │Sessions  │      │Special   │
    │        │         │          │      │Session   │
    └───┬────┘         └─────┬────┘      └────┬─────┘
        │                    │                 │
        │ No batch-gen       │ Smart gen       │ One-off
        │                    │ (on-demand)     │
        ↓                    ↓                 ↓
  ┌──────────────────────────────────────────────┐
  │        SERVICE MODEL + UTILITIES              │
  ├──────────────────────────────────────────────┤
  │ ✓ Parent template (date=null)               │
  │ ✓ Child instances (date=actual)             │
  │ ✓ generated_until tracking                  │
  │ ✓ Lazy-load functions                       │
  │ ✓ Update propagation                        │
  └───────────────────┬──────────────────────────┘
                      │
                      ↓
              ┌───────────────┐
              │   DATABASE    │
              │ (SQLite/Psql) │
              └───────────────┘
                Parent + Children
                Only what's needed!
```

---

This pattern enables **unlimited, scalable recurring services** without database bloat! 🎉
