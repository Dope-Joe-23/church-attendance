# Church Attendance - Email System Setup & Documentation

## Overview
The email system automatically sends QR codes to members when they are added to the system. Members receive their unique QR code via email for attendance tracking.

---

## Features

✅ **Auto-Send on Member Creation** - QR codes automatically email when new members are added  
✅ **Manual Resend** - Admin can resend QR codes via API endpoint  
✅ **Professional Email Template** - HTML formatted email with QR code image  
✅ **Gmail Integration** - Works with Gmail using App Passwords  
✅ **Error Handling** - Graceful fallback if email fails  
✅ **Development Mode** - Console email backend for testing

---

## Setup Instructions

### Step 1: Configure Gmail (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account:
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Follow setup instructions

2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or your device)
   - Google will generate a 16-character password
   - Copy this password (you'll use it in .env file)

### Step 2: Update .env File

Edit `backend/.env`:

```env
# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@yourechurch.com

# Church Configuration
CHURCH_NAME=Your Church Name
```

**Example:**
```env
EMAIL_HOST_USER=pastor@gmail.com
EMAIL_HOST_PASSWORD=abcd efgh ijkl mnop
DEFAULT_FROM_EMAIL=attendance@mychurch.org
CHURCH_NAME=Grace Community Church
```

### Step 3: Test Email Configuration

Run this in the backend terminal to test:

```bash
python manage.py shell
```

Then in Python shell:
```python
from django.core.mail import send_mail

send_mail(
    'Test Email',
    'This is a test email',
    'noreply@yourechurch.com',
    ['test-email@gmail.com'],
    fail_silently=False,
)
```

If successful, you'll see "1" returned. Check your email!

---

## How It Works

### Automatic Email on Member Creation

```
User Creates Member → Member Model Saved → QR Code Generated → Email Sent
```

**Flow:**
1. Admin creates new member via API or admin panel
2. Member's save() method generates unique QR code
3. post_save signal triggers `send_qr_code_on_creation()`
4. Email service sends professional HTML email with QR code image
5. Member receives email with instructions

### Email Content

Members receive:
- ✉️ Personalized greeting with their name
- 📋 Their unique Member ID
- 🖼️ QR code image (attached and embedded)
- 📱 Instructions on how to use the QR code
- 🏢 Church name and contact info

---

## API Endpoints

### 1. Create Member (Auto-sends QR Code Email)

**Endpoint:** `POST /api/members/`

```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "department": "Worship Team"
}
```

**Response:**
```json
{
  "id": 1,
  "member_id": "ABC12345",
  "full_name": "John Doe",
  "email": "john@example.com",
  "qr_code_image": "/media/qr_codes/qr_code_ABC12345.png"
}
```

Email automatically sent to `john@example.com`

---

### 2. Manually Resend QR Code Email

**Endpoint:** `POST /api/members/{id}/send_qr_email/`

**Example:**
```bash
curl -X POST http://localhost:8000/api/members/1/send_qr_email/
```

**Response (Success):**
```json
{
  "success": true,
  "message": "QR code email sent to john@example.com"
}
```

**Response (No Email):**
```json
{
  "success": false,
  "message": "Member John Doe does not have an email address"
}
```

---

### 3. Get Member QR Code

**Endpoint:** `GET /api/members/{id}/qr_code/`

```json
{
  "qr_code_url": "/media/qr_codes/qr_code_ABC12345.png",
  "member_id": "ABC12345"
}
```

---

## Development & Testing

### Option A: Console Email Backend (No Real Emails)

For testing without sending real emails, update `.env`:

```env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

Emails will print to terminal instead of being sent.

### Option B: File Email Backend (Save to Files)

```env
EMAIL_BACKEND=django.core.mail.backends.filebased.EmailBackend
EMAIL_FILE_PATH=/tmp/app-messages
```

Emails will be saved as files in `/tmp/app-messages/`

### Option C: Gmail (Production)

Use the full Gmail setup described above.

---

## Testing Workflow

### 1. Create a Test Member

```bash
# In terminal, navigate to backend
cd backend

# Start Django shell
python manage.py shell
```

```python
from members.models import Member

# Create test member
member = Member.objects.create(
    full_name="Test User",
    email="your-test-email@gmail.com",
    phone="555-1234",
    department="Test"
)

# Email is automatically sent!
print(f"Member created: {member.member_id}")
print(f"Email sent to: {member.email}")
```

### 2. Check Email Inbox

Go to your email and verify QR code was received.

### 3. Resend Email

```python
from members.email_service import send_qr_code_email

# Get the member
member = Member.objects.get(member_id="ABC12345")

# Manually resend email
success = send_qr_code_email(member)
print(f"Email sent: {success}")
```

---

## Troubleshooting

### ❌ Email Not Sending

**Problem:** Members not receiving emails

**Solutions:**
1. Check .env file has correct Gmail credentials
2. Verify Gmail App Password is correct (16 characters with spaces)
3. Test with console backend first: `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend`
4. Check Django logs for errors
5. Verify member has valid email address

### ❌ "Authentication Failed"

**Problem:** Error: `SMTPAuthenticationError`

**Solutions:**
1. Regenerate Gmail App Password (https://myaccount.google.com/apppasswords)
2. Ensure 2-Factor Authentication is enabled
3. Use correct email address in EMAIL_HOST_USER
4. Don't use regular Gmail password - must use App Password

### ❌ "Connection Refused"

**Problem:** Can't connect to SMTP server

**Solutions:**
1. Check internet connection
2. Verify EMAIL_HOST=smtp.gmail.com
3. Verify EMAIL_PORT=587
4. Verify EMAIL_USE_TLS=True
5. May be blocked by corporate firewall

### ❌ Email Sent But No Image

**Problem:** QR code image not showing in email

**Solutions:**
1. Ensure QR code was generated (check `/media/qr_codes/`)
2. Check if `qr_code_image` field has value
3. Test in Django shell:
   ```python
   member = Member.objects.get(member_id="ABC123")
   print(member.qr_code_image.url)  # Should print image path
   ```

### ✅ Test Email Sending

```python
from django.core.mail import send_mail

result = send_mail(
    subject='Test Email',
    message='This is a test',
    from_email='noreply@yourechurch.com',
    recipient_list=['test@gmail.com'],
    fail_silently=False,
)

print(f"Emails sent: {result}")  # Should print 1 if successful
```

---

## Files Modified

| File | Changes |
|------|---------|
| `backend/members/email_service.py` | **NEW** - Email sending logic |
| `backend/members/models.py` | Added email signal on member creation |
| `backend/members/views.py` | Added `send_qr_email` endpoint |
| `backend/church_config/settings.py` | Added email configuration |
| `backend/.env` | Added email credentials template |

---

## Email Service Code

### Main Email Function

```python
# backend/members/email_service.py

def send_qr_code_email(member):
    """
    Send member's QR code via email
    
    Args:
        member: Member instance
        
    Returns:
        bool: True if sent successfully, False otherwise
    """
    # Sends HTML email with QR code image
    # Includes member ID, instructions, and church name
```

### Auto-Send Signal

```python
# backend/members/models.py

@receiver(post_save, sender=Member)
def send_qr_code_on_creation(sender, instance, created, **kwargs):
    """Send QR code email when a new member is created"""
    if created and instance.email:
        send_qr_code_email(instance)
```

---

## API Examples

### Using cURL

```bash
# Create member and auto-send QR code
curl -X POST http://localhost:8000/api/members/ \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "555-5678",
    "department": "Finance"
  }'

# Resend QR code email to member ID 5
curl -X POST http://localhost:8000/api/members/5/send_qr_email/
```

### Using JavaScript/Frontend

```javascript
// Create member
const response = await fetch('http://localhost:8000/api/members/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '555-5678',
    department: 'Finance'
  })
});

const member = await response.json();
console.log(`Member created. Email sent to: ${member.email}`);

// Resend QR email
const resend = await fetch(`http://localhost:8000/api/members/${member.id}/send_qr_email/`, {
  method: 'POST'
});

const result = await resend.json();
console.log(result.message);
```

---

## Security Best Practices

⚠️ **Important:**

1. **Never commit .env to git** - Add to `.gitignore`
2. **Use App Passwords** - Never use real Gmail password
3. **Rotate passwords regularly** - Change app password quarterly
4. **Use HTTPS in production** - Secure email credentials in transit
5. **Limit email frequency** - Don't spam members with resends
6. **Validate email addresses** - Prevent sending to invalid emails
7. **Add rate limiting** - Limit API calls to send_qr_email endpoint

---

## Future Enhancements

🚀 Possible improvements:

- [ ] Bulk email sending for multiple members
- [ ] Email templates customization
- [ ] SMS fallback if email fails
- [ ] Email delivery tracking
- [ ] Scheduled reminder emails
- [ ] Multiple email recipients
- [ ] Internationalization (multi-language emails)
- [ ] Email unsubscribe management
- [ ] Async email queue (Celery)

---

## Support

For issues:
1. Check Troubleshooting section above
2. Review Django email documentation: https://docs.djangoproject.com/en/6.0/topics/email/
3. Check Gmail app-specific passwords: https://support.google.com/accounts/answer/185833

