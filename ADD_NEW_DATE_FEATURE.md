# Add New Date Feature for Recurring Services

## Overview
Successfully implemented the **"Add New Date"** feature for recurring services. This allows users to quickly add new instances/dates to existing recurring services without having to create a new service or regenerate all instances.

## How It Works

### User Experience

1. **View Services Table**
   - See all services listed (both recurring parents and one-off services)
   - Recurring parent services show "Weekly" or "Monthly" badge

2. **Add New Date**
   - For recurring parent services, a new **➕ Add New Date** button appears in the Actions column
   - Click the button to open the date picker modal
   - Select the desired date
   - Click "Create Instance"
   - New instance is created and added to the services list

3. **Result**
   - New service instance with the same name and settings but different date
   - Appears in the services table immediately
   - Can take attendance on the new date

### Example Workflow

```
Current State:
Service: "Sunday Worship" (Weekly)
├─ Feb 1, 2026
├─ Feb 8, 2026
├─ Feb 15, 2026
└─ Feb 22, 2026

User: Sees ➕ button on "Sunday Worship"
User: Clicks ➕ button
Modal: "Add New Date to Sunday Worship"
User: Selects March 1, 2026
User: Clicks "Create Instance"

Result:
Service: "Sunday Worship" (Weekly)
├─ Feb 1, 2026
├─ Feb 8, 2026
├─ Feb 15, 2026
├─ Feb 22, 2026
└─ Mar 1, 2026  ← NEW
```

---

## Technical Implementation

### Backend Changes

#### New Utility Function (`services/utils.py`)
```python
def create_service_instance(parent_service, instance_date):
    """
    Create a single instance of a recurring service for a specific date.
    
    Args:
        parent_service: Service object with is_recurring=True
        instance_date: Date for the new instance
    
    Returns:
        Created Service instance
    
    Raises:
        ValueError: If parent_service is not recurring
    """
```

**Logic:**
- Validates that the service is a recurring parent service
- Checks if instance already exists for that date (prevents duplicates)
- Creates new Service instance with all parent service properties
- Sets `parent_service` FK to maintain relationship
- Returns the created instance

#### New API Endpoint (`services/views.py`)
```
POST /services/{id}/add-instance/

Request Body:
{
    "date": "2026-03-01"
}

Response:
{
    "message": "Created service instance for 2026-03-01.",
    "instance": {
        "id": 5,
        "name": "Sunday Worship",
        "date": "2026-03-01",
        "start_time": "10:00:00",
        "end_time": "11:30:00",
        "location": "Main Hall",
        "is_recurring": false,
        "parent_service": 1,
        ...
    }
}
```

**Validation:**
- Checks that service is recurring parent (not already an instance)
- Validates date format (YYYY-MM-DD ISO format)
- Returns appropriate error if date is invalid or service is not recurring
- HTTP 201 on success, 400 on error

### Frontend Changes

#### New Component: `AddServiceDateModal` (`components/AddServiceDateModal.jsx`)

**Props:**
```javascript
{
  isOpen,              // Boolean - show/hide modal
  service,             // Object - the recurring parent service
  onSubmit,            // Function - called with (serviceId, dateString)
  onClose,             // Function - called when modal closes
  error,               // String - error message to display
}
```

**Features:**
- Date input field (required)
- Shows service recurrence pattern as hint
- Loading state during submission
- Error display
- Cancel and Create buttons
- Auto-focus on date input

#### Updated ServicesTable (`components/ServicesTable.jsx`)

**New Button:**
- Shows only for recurring parent services (`is_recurring=true && !parent_service`)
- Button: ➕ "Add New Date"
- Calls `onAddDate(service)` prop
- Green hover color (#d1fae5)

**Updated Props:**
```javascript
onAddDate={handleAddDate}  // New prop
```

#### Updated Services Page (`pages/Services.jsx`)

**New State:**
```javascript
const [showAddDateModal, setShowAddDateModal] = useState(false);
const [selectedServiceForDate, setSelectedServiceForDate] = useState(null);
const [addDateError, setAddDateError] = useState(null);
```

**New Handlers:**
```javascript
const handleAddDate = (service) => {
  // Open modal with selected service
}

const handleAddDateSubmit = async (serviceId, dateString) => {
  // Call API to create instance
  // Refresh services list
  // Close modal
}
```

**New Imports:**
```javascript
import { AddServiceDateModal } from '../components';
```

#### Updated API Client (`services/api.js`)

**New Method:**
```javascript
addServiceInstance: async (id, dateString) => {
  const response = await apiClient.post(
    `/services/${id}/add-instance/`, 
    { date: dateString }
  );
  return response.data;
}
```

#### Updated Component Exports (`components/index.js`)

```javascript
export { default as AddServiceDateModal } from './AddServiceDateModal';
```

#### Styling Updates (`styles/components.css` and `styles/index.css`)

**New Styles:**
- `.add-date-icon:hover` - Green hover effect (#d1fae5)
- `.form-hint` - Gray help text for form fields

---

## Data Flow

```
User clicks ➕ button
    ↓
handleAddDate() triggered
    ↓
Sets selectedServiceForDate state
Sets showAddDateModal = true
    ↓
AddServiceDateModal renders with selected service
    ↓
User picks date and clicks "Create Instance"
    ↓
handleAddDateSubmit() called with serviceId and dateString
    ↓
Frontend: serviceApi.addServiceInstance(id, dateString)
    ↓
Backend: POST /services/{id}/add-instance/
    ↓
Backend: Validates date and service
    ↓
Backend: create_service_instance() creates new instance
    ↓
Backend: Returns 201 with instance data
    ↓
Frontend: fetchServices() refreshes list
    ↓
New instance appears in table
    ↓
Modal closes, state resets
```

---

## Features

✅ **Quick Date Addition** - Add single dates without regenerating all instances
✅ **Duplicate Prevention** - Checks if date already exists before creating
✅ **Error Handling** - Proper validation and error messages
✅ **Intuitive UI** - Only shows button for recurring parent services
✅ **Consistent Naming** - New instances inherit all parent service properties
✅ **Smart Button** - ➕ icon, only appears when applicable
✅ **Form Validation** - Requires valid date selection
✅ **Loading State** - Shows "Creating..." during submission
✅ **Visual Feedback** - Green hover color (#d1fae5) for add button
✅ **Modal Pattern** - Consistent with other modals in app

---

## Usage Examples

### Scenario 1: Add Easter Service
```
Service: "Sunday Worship" (Weekly)
Current instances: Feb 1, 8, 15, 22, 29, Mar 1, 8, 15, 22, 29
User wants: Special Easter service on Mar 30, 2026

Steps:
1. Click ➕ on "Sunday Worship"
2. Select date: Mar 30, 2026
3. Click "Create Instance"
4. New instance appears in table
5. Can now take attendance for Mar 30
```

### Scenario 2: Fill Gap in Instances
```
Service: "Midweek Study" (Weekly)
Missing: Mar 10, 2026 (gap in pattern)

Steps:
1. Click ➕ on "Midweek Study"
2. Select date: Mar 10, 2026
3. Click "Create Instance"
4. Attendance recorded for that specific date
```

---

## Files Modified

### Backend
- `backend/services/utils.py` - Added `create_service_instance()` function
- `backend/services/views.py` - Added `add_instance()` endpoint

### Frontend
- `frontend/src/components/AddServiceDateModal.jsx` - **NEW** modal component
- `frontend/src/components/ServicesTable.jsx` - Added ➕ button for recurring services
- `frontend/src/pages/Services.jsx` - Added modal state and handlers
- `frontend/src/services/api.js` - Added `addServiceInstance()` method
- `frontend/src/components/index.js` - Export new component
- `frontend/src/styles/components.css` - Added `.add-date-icon:hover` style
- `frontend/src/styles/index.css` - Added `.form-hint` style

---

## Error Handling

**Backend Validation:**
- Service not recurring parent: HTTP 400 - "Service is not a recurring parent service"
- Invalid date format: HTTP 400 - "Invalid date format"
- No date provided: HTTP 400 - "Date field is required"
- Duplicate date: Returns existing instance (no error)

**Frontend:**
- Network errors: Display error message in modal
- Validation errors: Show server error message
- Loading state: Disable button during submission

---

## Testing Checklist

- [x] Can view ➕ button on recurring parent services
- [x] ➕ button hidden on one-off services
- [x] ➕ button hidden on child instances
- [x] Modal opens with correct service name
- [x] Can select different dates
- [x] Instance created on backend
- [x] Instance appears in table after creation
- [x] Duplicate dates prevented
- [x] Error messages display properly
- [x] Modal closes after successful creation
- [x] Services list refreshes automatically
- [x] Can take attendance on new instance
- [x] Styling matches other buttons/modals

---

## Future Enhancements

1. **Date Validation**
   - Prevent selecting dates in the past
   - Show calendar with available dates
   - Highlight existing instance dates

2. **Bulk Operations**
   - Add multiple dates at once
   - "Extend Series" to generate next N months
   - Skip dates in pattern

3. **Instance Customization**
   - Allow overriding service time for specific instance
   - Custom location per instance
   - Add notes to specific instance

4. **Workflow Improvements**
   - Keep modal open for adding multiple dates
   - Show count of existing instances
   - Quick access to attendance from modal

---

## Conclusion

The "Add New Date" feature provides a simple, intuitive way to extend recurring services without complex workflows. Users can now easily add individual service dates as needed, making the system flexible for special events, makeup services, or filling gaps in the recurring pattern.
