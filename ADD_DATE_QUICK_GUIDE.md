# Add New Date Feature - Quick Reference

## What Was Built

A simple **➕ Add New Date** button for recurring services that lets you quickly add new service instances without creating a new service from scratch.

## Button Location

In the **Services Table**, under the **Actions** column for recurring parent services:

```
Service Name  | Date     | Time  | Location | Actions
Sunday        | Weekly ▼ | 10am  | Main     | 📋 ➕ ✏️ 🗑️
Worship       |          |       | Hall     | ↑
              |          |       |          | NEW BUTTON
```

## How to Use

1. **Find recurring service** - Look for "Weekly" or "Monthly" badge
2. **Click ➕** - Opens date picker modal
3. **Select date** - Choose the new date you want
4. **Click Create** - Instance is created and appears in table
5. **Done!** - Can now take attendance on that date

## What It Does

✅ Creates single new instance for a specific date  
✅ Copies all settings from parent service  
✅ Prevents duplicate dates  
✅ Appears immediately in services table  
✅ Works with both weekly and monthly services  

## Example

**Before:**
```
Sunday Worship (Weekly)
- Feb 1, 2026
- Feb 8, 2026
- Feb 15, 2026
- Feb 22, 2026
```

**You click ➕ and select Mar 1, 2026:**

**After:**
```
Sunday Worship (Weekly)
- Feb 1, 2026
- Feb 8, 2026
- Feb 15, 2026
- Feb 22, 2026
- Mar 1, 2026  ← NEW!
```

## Technical Details

**Backend Endpoint:**
```
POST /services/{service_id}/add-instance/
Body: { "date": "2026-03-01" }
```

**Frontend Modal:**
- Component: `AddServiceDateModal.jsx`
- Imported in: `Services.jsx`
- Exported from: `components/index.js`

**Utility Function:**
```python
create_service_instance(parent_service, instance_date)
```

## Files Changed

- `services/utils.py` - New utility function
- `services/views.py` - New API endpoint
- `AddServiceDateModal.jsx` - NEW component
- `ServicesTable.jsx` - Added button
- `Services.jsx` - Added modal state
- `api.js` - New API method
- `components/index.js` - Export component
- `components.css` - Button styling
- `index.css` - Form hint styling
