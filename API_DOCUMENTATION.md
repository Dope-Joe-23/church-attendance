# API Documentation

## Base URL

```
http://localhost:8000/api
```

## Authentication

Currently, the API is open without authentication. For production, implement JWT or Token-based authentication.

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "status": "error_type"
}
```

## Members API

### List All Members

**Endpoint:** `GET /members/`

**Response:**
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "member_id": "ABC123",
      "full_name": "John Doe",
      "phone": "+1234567890",
      "email": "john@example.com",
      "department": "Worship Team",
      "qr_code_image": "/media/qr_codes/qr_code_ABC123.png",
      "created_at": "2025-01-30T10:00:00Z",
      "updated_at": "2025-01-30T10:00:00Z"
    }
  ]
}
```

### Create Member

**Endpoint:** `POST /members/`

**Request Body:**
```json
{
  "full_name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "department": "Worship Team"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "member_id": "ABC123",
  "full_name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "department": "Worship Team",
  "qr_code_image": "/media/qr_codes/qr_code_ABC123.png",
  "created_at": "2025-01-30T10:00:00Z",
  "updated_at": "2025-01-30T10:00:00Z"
}
```

### Get Member by ID

**Endpoint:** `GET /members/{id}/`

**Response:**
```json
{
  "id": 1,
  "member_id": "ABC123",
  "full_name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "department": "Worship Team",
  "qr_code_image": "/media/qr_codes/qr_code_ABC123.png",
  "created_at": "2025-01-30T10:00:00Z",
  "updated_at": "2025-01-30T10:00:00Z"
}
```

### Get Member by Member ID

**Endpoint:** `GET /members/by_member_id/?member_id=ABC123`

**Response:**
```json
{
  "id": 1,
  "member_id": "ABC123",
  "full_name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "department": "Worship Team",
  "qr_code_image": "/media/qr_codes/qr_code_ABC123.png",
  "created_at": "2025-01-30T10:00:00Z",
  "updated_at": "2025-01-30T10:00:00Z"
}
```

### Update Member

**Endpoint:** `PUT /members/{id}/`

**Request Body:**
```json
{
  "full_name": "John Doe Updated",
  "phone": "+9876543210",
  "email": "newemail@example.com",
  "department": "Sunday School"
}
```

**Response:**
```json
{
  "id": 1,
  "member_id": "ABC123",
  "full_name": "John Doe Updated",
  "phone": "+9876543210",
  "email": "newemail@example.com",
  "department": "Sunday School",
  "qr_code_image": "/media/qr_codes/qr_code_ABC123.png",
  "created_at": "2025-01-30T10:00:00Z",
  "updated_at": "2025-01-30T10:00:00Z"
}
```

### Delete Member

**Endpoint:** `DELETE /members/{id}/`

**Response:** `204 No Content`

### Get Member QR Code

**Endpoint:** `GET /members/{id}/qr_code/`

**Response:**
```json
{
  "qr_code_url": "/media/qr_codes/qr_code_ABC123.png",
  "member_id": "ABC123"
}
```

---

## Services API

### List All Services

**Endpoint:** `GET /services/`

**Response:**
```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Sunday Morning Service",
      "date": "2025-01-30",
      "start_time": "09:00:00",
      "location": "Main Hall",
      "description": "Main weekly service",
      "created_at": "2025-01-30T08:00:00Z",
      "updated_at": "2025-01-30T08:00:00Z"
    }
  ]
}
```

### Create Service

**Endpoint:** `POST /services/`

**Request Body:**
```json
{
  "name": "Sunday Morning Service",
  "date": "2025-01-30",
  "start_time": "09:00:00",
  "location": "Main Hall",
  "description": "Main weekly service"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "Sunday Morning Service",
  "date": "2025-01-30",
  "start_time": "09:00:00",
  "location": "Main Hall",
  "description": "Main weekly service",
  "created_at": "2025-01-30T08:00:00Z",
  "updated_at": "2025-01-30T08:00:00Z"
}
```

### Get Service by ID

**Endpoint:** `GET /services/{id}/`

**Response:** Same as create response

### Update Service

**Endpoint:** `PUT /services/{id}/`

**Request Body:** Same as create request

**Response:** Updated service object

### Delete Service

**Endpoint:** `DELETE /services/{id}/`

**Response:** `204 No Content`

---

## Attendance API

### List All Attendance Records

**Endpoint:** `GET /attendance/`

**Response:**
```json
{
  "count": 50,
  "next": "http://localhost:8000/api/attendance/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "member": 1,
      "member_details": {
        "id": 1,
        "member_id": "ABC123",
        "full_name": "John Doe",
        "phone": "+1234567890",
        "email": "john@example.com",
        "department": "Worship Team",
        "qr_code_image": "/media/qr_codes/qr_code_ABC123.png",
        "created_at": "2025-01-30T10:00:00Z",
        "updated_at": "2025-01-30T10:00:00Z"
      },
      "service": 1,
      "service_details": {
        "id": 1,
        "name": "Sunday Morning Service",
        "date": "2025-01-30",
        "start_time": "09:00:00",
        "location": "Main Hall",
        "description": "Main weekly service",
        "created_at": "2025-01-30T08:00:00Z",
        "updated_at": "2025-01-30T08:00:00Z"
      },
      "check_in_time": "2025-01-30T09:15:30Z",
      "status": "present",
      "notes": null,
      "created_at": "2025-01-30T09:15:30Z"
    }
  ]
}
```

### Check-in Member (Via QR Code)

**Endpoint:** `POST /attendance/checkin/`

**Request Body:**
```json
{
  "member_id": "ABC123",
  "service_id": 1
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "John Doe checked in successfully",
  "attendance": {
    "id": 1,
    "member": 1,
    "member_details": {...},
    "service": 1,
    "service_details": {...},
    "check_in_time": "2025-01-30T09:15:30Z",
    "status": "present",
    "notes": null,
    "created_at": "2025-01-30T09:15:30Z"
  }
}
```

**Already Checked-In Response (200 OK):**
```json
{
  "success": false,
  "message": "John Doe is already checked in for this service",
  "attendance": {...}
}
```

**Error Responses:**

Member Not Found (404):
```json
{
  "success": false,
  "message": "Member with ID ABC999 not found"
}
```

Service Not Found (404):
```json
{
  "success": false,
  "message": "Service with ID 999 not found"
}
```

### Get Attendance by Service

**Endpoint:** `GET /attendance/by_service/?service_id=1`

**Response:**
```json
{
  "service": {
    "id": 1,
    "name": "Sunday Morning Service",
    "date": "2025-01-30",
    "start_time": "09:00:00"
  },
  "attendances": [
    {
      "id": 1,
      "member": 1,
      "member_details": {...},
      "service": 1,
      "service_details": {...},
      "check_in_time": "2025-01-30T09:15:30Z",
      "status": "present",
      "notes": null,
      "created_at": "2025-01-30T09:15:30Z"
    }
  ],
  "total_present": 85,
  "total_absent": 5,
  "total_late": 3
}
```

### Create Manual Attendance Record

**Endpoint:** `POST /attendance/`

**Request Body:**
```json
{
  "member": 1,
  "service": 1,
  "status": "present",
  "notes": "Arrived late"
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "member": 1,
  "member_details": {...},
  "service": 1,
  "service_details": {...},
  "check_in_time": "2025-01-30T09:15:30Z",
  "status": "present",
  "notes": "Arrived late",
  "created_at": "2025-01-30T09:15:30Z"
}
```

### Update Attendance Record

**Endpoint:** `PUT /attendance/{id}/`

**Request Body:**
```json
{
  "status": "late",
  "notes": "Arrived 10 minutes late"
}
```

**Response:**
```json
{
  "id": 1,
  "member": 1,
  "member_details": {...},
  "service": 1,
  "service_details": {...},
  "check_in_time": "2025-01-30T09:15:30Z",
  "status": "late",
  "notes": "Arrived 10 minutes late",
  "created_at": "2025-01-30T09:15:30Z"
}
```

### Delete Attendance Record

**Endpoint:** `DELETE /attendance/{id}/`

**Response:** `204 No Content`

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data |
| 404 | Not Found - Resource not found |
| 500 | Server Error - Internal server error |

## Pagination

List endpoints support pagination with query parameters:

```
GET /members/?page=1&page_size=20
```

**Pagination Response:**
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/members/?page=2",
  "previous": null,
  "results": [...]
}
```

## Filtering & Search

List endpoints support filtering:

```
GET /members/?search=john
GET /services/?ordering=-date
```

## Rate Limiting

Currently no rate limiting. For production, implement:
- Django REST Framework throttling
- API key-based rate limiting
- Per-user or per-IP rate limits

## Example cURL Requests

### Create Member
```bash
curl -X POST http://localhost:8000/api/members/ \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Jane Smith",
    "phone": "+1987654321",
    "email": "jane@example.com",
    "department": "Youth Ministry"
  }'
```

### Check-in Member
```bash
curl -X POST http://localhost:8000/api/attendance/checkin/ \
  -H "Content-Type: application/json" \
  -d '{
    "member_id": "ABC123",
    "service_id": 1
  }'
```

### Get Service Attendance
```bash
curl "http://localhost:8000/api/attendance/by_service/?service_id=1"
```

---

## WebSocket/Real-time Features

Currently not implemented. Future enhancements:
- Real-time attendance updates
- Live attendance counters
- Notification system

## Versioning

API Version: 1.0.0
No versioning implemented yet. All endpoints are v1.
