# Quick Start: Admin Workflows

This document shows practical examples for using the three new features.

---

## 1. Creating Invitation Codes

### Scenario: Invite 5 New Admins

```bash
curl -X POST http://localhost:8000/api/members/invitations/generate_bulk/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 5,
    "expires_at": "2024-12-31T23:59:59Z",
    "emails": [
      "admin1@church.org",
      "admin2@church.org",
      "admin3@church.org",
      "admin4@church.org",
      "admin5@church.org"
    ]
  }'
```

**Response:**
```json
{
  "count": 5,
  "codes": [
    {
      "code": "Ql7mK9x2R4pNvW8jB5sT",
      "email": "admin1@church.org",
      "is_valid": true,
      "expires_at": "2024-12-31T23:59:59Z"
    },
    // ... 4 more codes
  ]
}
```

### Scenario: Send Codes to Emails

Add this admin task (in Django shell):

```python
python manage.py shell
```

```python
from members.models import InvitationCode
from django.core.mail import send_mail
from django.conf import settings

# Get all active codes
active_codes = [c for c in InvitationCode.objects.filter(used=False) if c.is_valid()]

for code in active_codes:
    if code.email:
        send_mail(
            'Church Attendance System - Admin Invitation',
            f'''Hello,

You've been invited to access the Church Attendance System as an administrator.

Your invitation code: {code.code}

This code will expire on: {code.expires_at}

To register:
1. Go to {settings.FRONTEND_URL}/login
2. Click "Register"
3. Enter your invitation code
4. Complete your registration

Best regards,
Church Administration
''',
            settings.DEFAULT_FROM_EMAIL,
            [code.email],
        )
        print(f"Sent code to {code.email}")
```

---

## 2. Member Registration Flow

### Step 1: Admin Creates Invitation Codes

```bash
# Create 10 codes, expire in 7 days
POST /api/members/invitations/generate_bulk/
{
  "count": 10,
  "expires_at": "$(date -d '+7 days' -Iseconds)"
}
```

### Step 2: Send Codes to Users

Email the codes or display them in admin dashboard.

### Step 3: User Registers

**Frontend:**
1. Go to Login page
2. Click "Register"
3. Fill in:
   - Invitation Code: (paste code)
   - Email: (their email)
   - First Name / Last Name
   - Username
   - Password
4. Click "Register"

**Result:**
- User account created
- Invitation code marked as used
- User logged in and redirected to dashboard
- QR code email sent automatically

---

## 3. Sending QR via WhatsApp

### Setup (One-time)

1. **Create Twilio Account**
   - Visit https://www.twilio.com/console
   - Sign up (free trial includes WhatsApp)
   - Get Account SID and Auth Token

2. **Get WhatsApp Number**
   - In Twilio Console → Messaging → WhatsApp Senders
   - Follow steps to get a number (or sandbox number for testing)

3. **Configure .env**
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_token_here
   TWILIO_WHATSAPP_FROM=whatsapp:+233501234567
   ```

4. **Test Twilio Connection**
   ```python
   python manage.py shell
   ```
   ```python
   from members.whatsapp_service import WhatsAppService
   service = WhatsAppService()
   print(f"WhatsApp enabled: {service.is_enabled()}")
   ```

### Send QR to Single Member

```bash
# Get member ID first
GET /api/members/?search=John

# Send QR
POST /api/members/1/send_qr_whatsapp/
{
  "phone_number": "+233501234567"
}
```

**Response:**
```json
{
  "success": true,
  "message_sid": "SM1234567890abcdef1234567890abcdef",
  "phone_number": "whatsapp:+233501234567"
}
```

### Send QR to All Members with Phone

```bash
POST /api/members/send_qr_whatsapp_bulk/
{
  "filter": "with_phone"
}
```

**Response:**
```json
{
  "success": true,
  "success_count": 45,
  "failure_count": 3,
  "total": 48,
  "results": [
    {
      "member_id": "MEM001",
      "member_name": "John Doe",
      "success": true,
      "message_sid": "SM..."
    },
    // ... more results
  ]
}
```

### Send to Recent Members

```bash
POST /api/members/send_qr_whatsapp_bulk/
{
  "filter": "recent"  // Last 30 days
}
```

### Send to Specific Members

```bash
POST /api/members/send_qr_whatsapp_bulk/
{
  "member_ids": [1, 5, 12, 23]
}
```

---

## 4. QR Code Email with Styled Card

### Automatic (On Member Creation)

When you create a member with an email:

```bash
POST /api/members/
{
  "full_name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "0501234567",
  "department": "technical",
  "class_name": "airport"
}
```

**Automatic actions:**
1. ✅ QR code generated
2. ✅ Membership card created
3. ✅ Email sent with styled card

Member receives professional-looking email with:
- Beautiful membership card graphic
- Their name, ID, department, class
- QR code embedded in card
- Usage instructions
- Both card and plain QR as attachments

### Manual Resend

```bash
# Resend email if something went wrong
POST /api/members/1/send_qr_email/

# Response
{
  "success": true,
  "message": "QR code email sent to jane@example.com"
}
```

---

## 5. Admin Dashboard Workflow

### Check Active Invitation Codes

```bash
GET /api/members/invitations/active/
```

Shows:
- How many codes are available
- Which emails they're restricted to
- Expiration dates

### Generate Codes for New Admins

```bash
POST /api/members/invitations/
{
  "expires_at": "2024-12-31T23:59:59Z",
  "email": "newadmin@church.org"
}
```

### Track Code Usage

```bash
GET /api/members/invitations/used/

# Shows:
# - Which user registered with each code
# - When they registered
# - Their contact info
```

### Revoke Access

If needed, you can delete an unused code:

```bash
DELETE /api/members/invitations/5/
```

---

## 6. Member Communication Workflows

### Workflow A: New Member Joins

1. **Admin creates member**
   ```
   POST /api/members/
   ```

2. **Auto-send email**
   - ✅ Happens automatically
   - Member receives styled QR card

3. **To also send WhatsApp** (member permission asking)
   ```
   POST /api/members/{id}/send_qr_whatsapp/
   ```

### Workflow B: Bulk Welcome New Members

```bash
# Get recent members
GET /api/members/?ordering=-created_at

# Send WhatsApp QR codes to recent members
POST /api/members/send_qr_whatsapp_bulk/
{
  "filter": "recent"
}

# All recent members getting WhatsApp message 📱
```

### Workflow C: Member Change Phone Number

```bash
# Update member phone
PUT /api/members/123/
{
  "phone": "+233501234567"
}

# Resend emails and WhatsApp with new contact
POST /api/members/123/send_qr_email/
POST /api/members/123/send_qr_whatsapp/
```

---

## 7. Troubleshooting Commands

### Test Invitation Code

```bash
curl -X POST http://localhost:8000/api/members/invitations/validate/ \
  -H "Content-Type: application/json" \
  -d '{"code": "Ql7mK9x2R4pNvW8jB5sT"}'

# Response if valid:
# {"valid": true, "expires_at": "...", "email": "..."}

# Response if invalid:
# {"valid": false, "error": "..."}
```

### Check if Member Has QR

```python
python manage.py shell
```

```python
from members.models import Member

member = Member.objects.get(member_id='MEM001')

# Check if QR code exists
print(f"Has QR data: {bool(member.qr_code_data)}")
print(f"QR code preview: {member.qr_code_data[:50]}...")

# Regenerate if needed
member.save()  # Triggers QR generation
```

### Check WhatsApp Service

```python
python manage.py shell
```

```python
from members.whatsapp_service import WhatsAppService

service = WhatsAppService()
print(f"Enabled: {service.is_enabled()}")
print(f"Account SID: {service.account_sid}")
print(f"From: {service.whatsapp_from}")
```

### View Email Configuration

```python
python manage.py shell
```

```python
from django.conf import settings

print(f"Email Backend: {settings.EMAIL_BACKEND}")
print(f"Email Host: {settings.EMAIL_HOST}")
print(f"From Email: {settings.DEFAULT_FROM_EMAIL}")
print(f"Email User: {settings.EMAIL_HOST_USER}")
```

---

## 8. Common Scenarios

### Scenario: New Admin User

1. Generate invitation code
   ```
   POST /api/members/invitations/
   ```

2. Send code to email (manual or automated)

3. User registers with code on frontend

4. User gets access to admin dashboard

---

### Scenario: Onboard 100 Members

1. Create CSV with member data

2. Bulk create members via API
   ```
   POST /api/members/
   ```

3. Members automatically receive emails with styled QR cards

4. Send WhatsApp follow-up
   ```
   POST /api/members/send_qr_whatsapp_bulk/
   {"filter": "recent"}
   ```

5. Members can now check in using QR codes

---

### Scenario: Member Lost QR Code

1. Resend email with new card
   ```
   POST /api/members/{id}/send_qr_email/
   ```

2. Or send via WhatsApp
   ```
   POST /api/members/{id}/send_qr_whatsapp/
   ```

3. Member receives new QR in preferred channel

---

## Error Messages & Solutions

| Error | Solution |
|-------|----------|
| "Invalid invitation code" | Check code typo, verify code exists |
| "Code has expired" | Generate new code with later expiry |
| "WhatsApp service not configured" | Add Twilio credentials to .env |
| "Member has no phone number" | Add phone to member record |
| "Failed to send email" | Check EMAIL_HOST and credentials |
| "QR code not available" | Resave member to regenerate QR |

---

## Performance Tips

- **Bulk operations**: Use `/bulk/` endpoints instead of single requests
- **Filters**: Use `filter=recent` instead of `filter=all` for large member bases
- **Scheduling**: Use Django Celery for scheduled bulk sends
- **Caching**: Cache invitation codes list in admin dashboard

---

## Best Practices

✅ **Invitations**: Set reasonable expiry dates (7-14 days typical)  
✅ **WhatsApp**: Get member consent before sending messages  
✅ **Phone numbers**: Store with country codes (+233...)  
✅ **Bulk sends**: Schedule during off-peak hours  
✅ **Testing**: Use Twilio sandbox for development  
✅ **Monitoring**: Check logs for failed sends

---

## Need Help?

Check the full implementation guide: `IMPLEMENTATION_GUIDE_THREE_IMPROVEMENTS.md`
