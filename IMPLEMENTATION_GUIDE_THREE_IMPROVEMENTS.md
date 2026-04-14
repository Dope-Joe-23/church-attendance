# Implementation Guide: Three Key Improvements

## Summary

This document details three major improvements to the church attendance system:

1. **Registration Protection with Invitation Codes** - Prevent unauthorized user registration
2. **WhatsApp Integration** - Send QR codes via WhatsApp
3. **Styled QR Code Email Cards** - Send beautifully designed membership cards via email

---

## 1. Registration Protection with Invitation Codes

### What Changed

- **Before**: Anyone could register using the `/api/auth/register/` endpoint
- **After**: Only users with valid invitation codes can register

### Files Created/Modified

**Backend:**
- `backend/members/models.py` - Added `InvitationCode` model
- `backend/church_config/views.py` - Updated `register_user()` to require invitation code
- `backend/members/views.py` - Added `InvitationCodeViewSet` with admin endpoints
- `backend/members/serializers.py` - Added `InvitationCodeSerializer`
- `backend/members/urls.py` - Registered invitation code routes

**Frontend:**
- `frontend/src/pages/Login.jsx` - Updated registration form to include invitation code field

### New Database Model

```python
class InvitationCode(models.Model):
    code                # Unique invitation code
    email               # Optional: restrict code to specific email
    created_by          # Admin who created it
    created_at          # Creation timestamp
    expires_at          # Expiration date
    used                # Boolean: code has been used
    used_by             # User who used the code
    used_at             # When code was used
```

### How to Use

#### 1. Generate Invitation Codes (Admin)

**Single Code:**
```bash
POST /api/members/invitations/
Headers: Authorization: Bearer {admin_token}

{
  "expires_at": "2024-12-31T23:59:59Z",
  "email": "user@example.com"  // optional - restrict to email
}
```

**Bulk Codes:**
```bash
POST /api/members/invitations/generate_bulk/
Headers: Authorization: Bearer {admin_token}

{
  "count": 10,
  "expires_at": "2024-12-31T23:59:59Z",
  "emails": ["user1@example.com", "user2@example.com"]  // optional
}
```

#### 2. Validate Invitations (Anyone)

```bash
POST /api/members/invitations/validate/

{
  "code": "your-invitation-code",
  "email": "user@example.com"  // optional
}
```

#### 3. Register with Code

**Frontend Form:**
- Fill in: Invitation Code, Email, First/Last Name, Username, Password
- Form validates code before submission

**API Call:**
```bash
POST /api/auth/register/

{
  "invitation_code": "your-code",
  "username": "newuser",
  "email": "user@example.com",
  "password": "SecurePassword123",
  "password_confirm": "SecurePassword123",
  "first_name": "John",
  "last_name": "Doe"
}
```

#### 4. List Invitations (Admin)

```bash
GET /api/members/invitations/              # All codes
GET /api/members/invitations/active/       # Active (unused, not expired)
GET /api/members/invitations/used/         # Already used
```

### Security Features

✅ **Single-use codes** - Each code can only be used once  
✅ **Expiration support** - Codes automatically expire  
✅ **Email restriction** - Optionally restrict codes to specific emails  
✅ **Audit trail** - Track who created and used each code  
✅ **Token required** - Only authenticated admins can generate codes

---

## 2. WhatsApp Integration

### What Changed

- Added ability to send QR codes via WhatsApp using Twilio API
- Serves as complementary channel to email
- Supports bulk sending to multiple members

### Files Created

- `backend/members/whatsapp_service.py` - WhatsApp integration service
- Updated `backend/members/views.py` - Added WhatsApp endpoints

### Installation Requirements

```bash
# Install Twilio
pip install twilio
```

### Configuration

Add to `.env` file (workspace root):

```
# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890

# Example with Ghana country code:
TWILIO_WHATSAPP_FROM=whatsapp:+233501234567
```

### Setup Steps

1. **Create Twilio Account**
   - Go to https://www.twilio.com
   - Sign up for free trial
   - Get Account SID and Auth Token

2. **Enable WhatsApp**
   - In Twilio Console → Messaging → WhatsApp
   - Get a Twilio WhatsApp number

3. **Add to Environment**
   - Add credentials to `.env` file
   - No code changes needed

### How to Use

#### 1. Send QR to Single Member

```bash
POST /api/members/{member_id}/send_qr_whatsapp/
Headers: Authorization: Bearer {user_token}

{
  "phone_number": "+233501234567"  // optional, uses member.phone if not provided
}
```

**Response:**
```json
{
  "success": true,
  "message_sid": "SM...",
  "phone_number": "whatsapp:+233501234567"
}
```

#### 2. Send QR to Multiple Members

```bash
POST /api/members/send_qr_whatsapp_bulk/
Headers: Authorization: Bearer {user_token}

{
  "filter": "with_phone",  // or "all", "recent"
  "member_ids": [1, 2, 3]  // optional specific members
}
```

**Filters:**
- `with_phone` - Members with phone numbers (default)
- `all` - All non-visitor members
- `recent` - Members added in last 30 days

#### 3. Check Service Status

The service automatically disables if credentials are not set. You can check by attempting to send a message - error message will indicate if service is not configured.

### Message Content

Members receive WhatsApp message with:
- Greeting and member details
- Member ID
- Department and Class info
- Instructions for QR code usage
- Church name

Example message:
```
Hello John Doe! 👋

Your church membership card is ready! 

📝 Member Details:
- Name: John Doe
- Member ID: MEM001
- Department: Technical
- Class: Airport

📱 How to use your QR code:
1. Present this QR code during attendance check-in
2. Church staff will scan it to mark your attendance
3. Keep it handy or print it out for services

🙏 Your QR code has been sent via email as well.
```

### Phone Number Formatting

The service automatically converts phone numbers:
- `0501234567` → `+233501234567` (Ghana format)
- `501234567` → `+233501234567` (removes ambiguity)
- `+233501234567` → `whatsapp:+233501234567` (adds WhatsApp prefix)

---

## 3. Styled QR Code Email

### What Changed

- **Before**: Email contained plain QR code + simple text
- **After**: Email contains beautifully designed membership card with member details

### Files Created/Modified

**Backend:**
- `backend/members/qr_card_generator.py` - Card generation engine
- `backend/members/email_service.py` - Updated to use styled cards

### Card Features

The generated card includes:

```
┌─────────────────────────────────────┐
│  Header: Membership Card - WIS      │
├─────────────────────────────────────┤
│ Name: JOHN DOE                      │
│ ID:   MEM001                        │
│ Department: Technical               │
│ Class: Airport                      │
│                                     │
│     [QR CODE IMAGE - 500x500]      │
│                                     │
└─────────────────────────────────────┘
```

### Export Formats

The card generator supports:

1. **PNG** - Raster image format
   - Embedded in email as data URI
   - Also attached as file for download/printing
   - Supported everywhere

2. **PDF** (optional)
   - Requires `weasyprint` package
   - Click-to-print formatted
   - Falls back to PNG if weasyprint unavailable

### Optional Dependencies

```bash
# For PDF export (optional)
pip install weasyprint
```

## Email Updates

When member is created or QR email is sent:

1. **Styled Card Generated**
   - Includes member details
   - Contains QR code
   - Professional design

2. **Card Embedded in Email**
   - Displays inline in email client
   - Data URI for universal compatibility

3. **Attachments Included**
   - `membership_card_{member_id}.png` - The styled card
   - `qr_code_{member_id}.png` - Plain QR code (for backup)

4. **Fallback Handling**
   - If card generation fails, sends plain QR code
   - Email still succeeds even if card generation errors

### Email Content

Email now includes:

✅ Beautiful membership card graphic  
✅ Member's full name, ID, department, and class  
✅ QR code (both in card and as plain image)  
✅ Usage instructions  
✅ Church branding  
✅ Multiple attachment formats for flexibility

---

## API Reference

### Invitation Codes

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/members/invitations/` | GET | ✓ | List all codes |
| `/api/members/invitations/` | POST | ✓ | Create single code |
| `/api/members/invitations/generate_bulk/` | POST | ✓ | Create multiple codes |
| `/api/members/invitations/active/` | GET | ✓ | List active codes |
| `/api/members/invitations/used/` | GET | ✓ | List used codes |
| `/api/members/invitations/validate/` | POST | ✗ | Validate a code |
| `/api/auth/register/` | POST | ✗ | Register with code |

### WhatsApp

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/members/{id}/send_qr_whatsapp/` | POST | ✓ | Send QR to member |
| `/api/members/send_qr_whatsapp_bulk/` | POST | ✓ | Bulk send QR |

### Email

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/members/{id}/send_qr_email/` | POST | ✓ | Send email with card |

---

## Environment Variables Summary

```bash
# Email Configuration (existing)
DEFAULT_FROM_EMAIL=noreply@example.com
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# WhatsApp Integration (new)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_FROM=whatsapp:+233501234567

# Optional
HTML_TO_IMAGE_TOOL=playwright  # For advanced card generation
```

---

## Deployment Checklist

- [ ] Run database migrations: `python manage.py migrate`
- [ ] Install dependencies: `pip install Pillow twilio weasyprint`
- [ ] Add environment variables to `.env`
- [ ] Update frontend (Login.jsx already updated)
- [ ] Test invitation code generation
- [ ] Test WhatsApp sending (with test Twilio account first)
- [ ] Test email with styled card
- [ ] Configure CORS if needed for frontend
- [ ] Test registration flow with invitation code

---

## Troubleshooting

### Invitation Codes Not Working

1. **Check database**: `InvitationCode` table exists
2. **Run migration**: `python manage.py migrate`
3. **Generate test code**: Use admin endpoint to create one
4. **Verify expiry**: `expires_at` should be in future

### WhatsApp Not Sending

1. **Check credentials**: Verify `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`
2. **Check phone format**: Should be `+country-code + number`
3. **Check member.phone**: Member must have phone if not provided
4. **Check logs**: Look for Twilio API errors
5. **Test Twilio**: Log into Twilio console to verify credentials

### Email Not Showing Card

1. **Check Pillow**: `pip install Pillow`
2. **Check QR data**: Member must have `qr_code_data`
3. **Check logs**: Look for card generation errors
4. **Test email settings**: Verify email backend is configured
5. **Fallback works**: Plain QR code should still send even if card fails

---

## Security Notes

🔒 Only authenticated users can generate invitation codes  
🔒 Codes are single-use and expire automatically  
🔒 Email addresses can be restricted per code  
🔒 WhatsApp requires valid Twilio credentials  
🔒 No secrets stored in frontend code  
🔒 All APIs require proper authentication

---

## Next Steps

1. Test invitation code flow with test account
2. Set up Twilio for WhatsApp (free trial available)
3. Deploy to staging environment
4. Test all three features
5. Configure for production
6. Document process for admins
7. Train users on new features

---

## Support

For issues:
1. Check logs: `django.log` or server console
2. Test API endpoints directly with REST client
3. Verify all environment variables set
4. Check that required packages are installed
5. Ensure database migrations ran successfully
