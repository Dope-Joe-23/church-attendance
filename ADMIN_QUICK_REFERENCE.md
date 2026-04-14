# Quick Reference Card

## Three New Features

### 1️⃣ Registration Protection

**Problem**: Anyone could create admin account  
**Solution**: Only people with invitation codes can register

**Admin Actions**:
```
Generate code → Share with person → They register → Get access
```

**Commands**:
- Create code: `POST /api/members/invitations/`
- Create multiple: `POST /api/members/invitations/generate_bulk/`
- Validate: `POST /api/members/invitations/validate/`
- List active: `GET /api/members/invitations/active/`

---

### 2️⃣ WhatsApp Integration

**Problem**: Only email delivery for QR codes  
**Solution**: Send QR codes via WhatsApp for instant delivery

**Setup** (one-time):
1. Create Twilio account (free trial)
2. Add to .env:
   ```
   TWILIO_ACCOUNT_SID=...
   TWILIO_AUTH_TOKEN=...
   TWILIO_WHATSAPP_FROM=whatsapp:+...
   ```

**Admin Actions**:
- Send to member: `POST /api/members/{id}/send_qr_whatsapp/`
- Send to many: `POST /api/members/send_qr_whatsapp_bulk/`
- Filters: `with_phone`, `all`, `recent`

---

### 3️⃣ Styled QR Code Cards

**Problem**: Plain QR code in emails  
**Solution**: Professional membership card with details

**What Members Get**:
- Beautiful card graphic with:
  - Name
  - Member ID
  - Department
  - Class/Location
  - QR code embedded
- Email + attachments
- Can print or screenshot

**Happens Automatically**:
- When member created
- When sending QR email
- Fancy card + plain QR as backup

---

## Quick Workflows

### Invite New Admin

```
1. POST /api/members/invitations/
2. Send code to email
3. They register with code
4. Done ✓
```

### Onboard New Member

```
1. POST /api/members/ (with email & phone)
2. Email auto-sent with card
3. Optional: POST .../send_qr_whatsapp/
4. Member can check in ✓
```

### Resend QR Code

```
1. POST /api/members/{id}/send_qr_email/
   OR
   POST /api/members/{id}/send_qr_whatsapp/
2. Member gets fresh code ✓
```

### Bulk Send WhatsApp

```
1. POST /api/members/send_qr_whatsapp_bulk/
   {"filter": "with_phone"}
2. All members with phone get message ✓
```

---

## Environment Variables

```bash
# WhatsApp (NEW)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=yourtoken
TWILIO_WHATSAPP_FROM=whatsapp:+233501234567

# Email (existing - make sure set)
DEFAULT_FROM_EMAIL=noreply@church.org
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=app-password
```

---

## API Endpoints Cheat Sheet

```
# Invitations
POST   /api/members/invitations/
POST   /api/members/invitations/generate_bulk/
GET    /api/members/invitations/
GET    /api/members/invitations/active/
GET    /api/members/invitations/used/
POST   /api/members/invitations/validate/
DELETE /api/members/invitations/{id}/

# WhatsApp
POST /api/members/{id}/send_qr_whatsapp/
POST /api/members/send_qr_whatsapp_bulk/

# Email (Enhanced)
POST /api/members/{id}/send_qr_email/

# Register (Updated)
POST /api/auth/register/
  Required: invitation_code
```

---

## Common Phone Formats

```
Input              → WhatsApp Format
0501234567        → +233501234567
501234567         → +233501234567
+233501234567     → +233501234567
+1234567890       → +1234567890
```

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| "Invalid code" | Code spelling, exists, not expired, not used |
| "WhatsApp failed" | Twilio credentials set, phone format correct |
| "Email not sent" | Email settings configured, member has email |
| "No QR code" | Member saved (triggers generation), wait a moment |
| "Can't register" | Code valid and not used yet |

---

## Permissions

| Action | Who | Auth Required |
|--------|-----|---|
| Generate codes | Admin | ✓ Token |
| Validate code | Anyone | ✗ No |
| Register | Anyone | ✗ No (with code) |
| Send QR email | Admin | ✓ Token |
| Send QR WhatsApp | Admin | ✓ Token |
| List codes | Admin | ✓ Token |

---

## Before Going Live

- [ ] Create test Twilio account
- [ ] Set environment variables
- [ ] Run migrations: `python manage.py migrate`
- [ ] Test invitation code flow
- [ ] Test WhatsApp send (with test number)
- [ ] Test email with card
- [ ] Update frontend (already done)
- [ ] Train admins on features

---

## Deployment Commands

```bash
# Backend setup
cd backend
pip install twilio
python manage.py makemigrations
python manage.py migrate

# Update requirements
pip freeze > requirements.txt

# Test
python manage.py runserver
# Visit http://localhost:8000/api/members/invitations/

# Production
# ... deploy normally ...
```

---

## File Locations

**Backend**:
- `backend/members/models.py` - InvitationCode model
- `backend/members/qr_card_generator.py` - Card generation
- `backend/members/whatsapp_service.py` - WhatsApp service
- `backend/members/views.py` - ViewSets and endpoints
- `backend/members/email_service.py` - Email with cards

**Frontend**:
- `frontend/src/pages/Login.jsx` - Registration form

**Documentation**:
- `IMPLEMENTATION_GUIDE_THREE_IMPROVEMENTS.md` - Full guide
- `ADMIN_QUICK_START.md` - Admin workflows
- `ADMIN_QUICK_REFERENCE.md` - This file

---

## Getting Help

Check documentation in order:
1. **Quick**: This file or ADMIN_QUICK_START.md
2. **Detailed**: IMPLEMENTATION_GUIDE_THREE_IMPROVEMENTS.md
3. **API**: See "API Reference" in Implementation Guide
4. **Errors**: Check logs in `backend/logs/`

---

## Features Summary

| Feature | Status | Effort | Impact |
|---------|--------|--------|--------|
| Registration Protection | ✅ Complete | Low | High |
| Styled QR Cards | ✅ Complete | Low | Medium |
| WhatsApp Send | ✅ Complete | Low | High |
| Bulk Send | ✅ Complete | Low | Medium |
| Code Management | ✅ Complete | Low | High |

---

## Next Phase Ideas

- Email notifications for failed check-ins
- SMS support (via Twilio)
- QR code expiration/rotation
- Member self-service code requests
- Admin dashboard for stats
- Attendance reminders via WhatsApp

---

**Last Updated**: April 14, 2026  
**Version**: 1.0  
**Status**: Ready for production
