# Security & Integration Improvements Guide

## Overview
This guide covers three key improvements to the church attendance system:

1. **Authorization Protection** - Prevent unauthorized user registration
2. **WhatsApp Integration** - Send member QR codes via WhatsApp
3. **Styled QR Code Email** - Send beautifully designed QR code cards via email

---

## 1. Registration Protection with Invitation Codes

### Problem
Currently, the registration endpoint (`/api/auth/register/`) is open to anyone with `AllowAny` permission. This allows unauthorized users to create admin accounts.

### Solution
Implement an **Invitation Code** system:
- Only users with valid invitation codes can register
- Admin can generate invitation codes for specific people
- Each code is single-use and can be linked to email/phone

### Implementation Components

#### Database Model
A new `InvitationCode` model to store:
- Code (unique, random)
- Email (optional - for validation)
- Created by (admin user)
- Used (boolean)
- Used by (user who registered)
- Expiry date

#### API Endpoints
- `POST /api/auth/invitations/generate/` - Admin generates invitation codes
- `POST /api/auth/register/` - Updated to require valid invitation code
- `GET /api/auth/invitations/validate/` - Check if code is valid

#### Frontend Changes
- Registration form asks for invitation code
- Code validation before submission

---

## 2. WhatsApp Integration

### Problem
Currently, QR codes are only sent via email. WhatsApp provides instant delivery and better engagement.

### Solution
Use **Twilio WhatsApp API** (or similar service) to:
- Send QR code image via WhatsApp message
- Send with member details and instructions
- Track delivery status

### Implementation Components

#### Backend Service
- WhatsApp API client configuration
- QR code card generation (same as email)
- WhatsApp message sending function
- Error handling and logging

#### API Endpoints
- `POST /api/members/<id>/send_qr_whatsapp/` - Send QR via WhatsApp
- `POST /api/members/send_qr_bulk_whatsapp/` - Send to multiple members

#### Configuration
- Twilio account SID and auth token
- WhatsApp phone number
- Message templates

---

## 3. Styled QR Code Card via Email

### Problem
Currently, email sends a simple QR code image. The QRCodeModal has a beautiful card design with member details that isn't being used in emails.

### Solution
Generate the **styled QR code card** (from QRCodeModal) as an image:
- Use HTML-to-image conversion
- Include all member details (name, ID, department, class)
- Attach as professional-looking card in email
- Option to send as PNG or PDF

### Implementation Components

#### QR Code Card Generator
- Python service using `html2image` or `Pillow`
- Generates card identical to QRCodeModal design
- Returns PNG or PDF

#### Email Service Update
- Call card generator before sending email
- Attach generated card as image/PDF
- Send both plain QR code and card for flexibility

---

## Implementation Order

1. **Start with #1 (Registration Protection)** - Foundational security
2. **Then #3 (Styled QR Email)** - Improves immediate user experience
3. **Finally #2 (WhatsApp)** - Additional channel for modern engagement

---

## Environment Variables Needed

```
# For WhatsApp Integration (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_PHONE=+1234567890
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890

# Optional: For card generation
HTML_TO_IMAGE_TOOL=playwright  # or 'selenium' or 'weasyprint'
```

---

## Next Steps

Detailed implementations will follow for each component.
