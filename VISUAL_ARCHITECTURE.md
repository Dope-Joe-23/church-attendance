# Visual Architecture & User Flows

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CHURCH ATTENDANCE SYSTEM                 │
└─────────────────────────────────────────────────────────────┘

┌─── Frontend (React) ──────────┐
│                               │
│  • Login/Register Page        │
│    └─ Invitation Code Field  │
│                               │
│  • Admin Invitations Page     │
│    ├─ Generate Codes         │
│    ├─ View/Track Codes       │
│    └─ Copy & Share           │
│                               │
│  • Members Page              │
│    └─ Create/Edit Members    │
│                               │
└───────────────┬───────────────┘
                │ HTTP/REST API
                ↓
┌─── Backend (Django) ──────────────────────────┐
│                                                │
│  Authentication                               │
│  ├─ register_user() - Now requires code      │
│  ├─ login_user()                             │
│  └─ JWT Tokens                               │
│                                                │
│  Members App                                  │
│  ├─ Member Model                             │
│  ├─ InvitationCode Model                     │
│  └─ ViewSets & Serializers                   │
│                                                │
│  Services                                     │
│  ├─ qr_card_generator.py                     │
│  ├─ email_service.py                         │
│  ├─ whatsapp_service.py                      │
│  └─ Database Models/Signals                  │
│                                                │
│  Integrations                                │
│  ├─ Email (Django Mail)                      │
│  ├─ WhatsApp (Twilio API)                    │
│  └─ QR Generation (qrcode + Pillow)          │
│                                                │
└────────────────┬──────────────────────────────┘
                 │
        ┌────────┴────────┐
        ↓                 ↓
   ┌──────────┐      ┌──────────────┐
   │ Database │      │ 3rd Party    │
   │          │      │              │
   │ SQLite/  │      │ • Twilio API │
   │ Postgres │      │   (WhatsApp) │
   │          │      │              │
   │ Tables:  │      │ • Email SMTP │
   │ • User   │      │              │
   │ • Member │      │ • Cloudinary │
   │ • Invite │      │   (Media)    │
   │ • Alerts │      │              │
   │ • Events │      └──────────────┘
   │          │
   └──────────┘
```

---

## User Flows

### 📝 Admin Workflow: Create Invitation Code

```
                    ┌─ ADMIN DASHBOARD ─┐
                    │                    │
                    │  🎫 Invitations    │
                    │                    │
                    └────────┬───────────┘
                             │
                    ┌────────▼──────────┐
                    │ Generation Form   │
                    │                   │
                    │ ◯ Single Code     │
                    │ ◯ Bulk Codes      │
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────┐
                    │ Fill Details:     │
                    │ • Email (opt)     │
                    │ • Expiration      │
                    │ • Count (bulk)    │
                    └────────┬──────────┘
                             │ Click Generate
                    ┌────────▼──────────┐
                    │ Backend Creates   │
                    │ Code Objects      │
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────┐
                    │ Success Alert     │
                    │ Shows New Code(s) │
                    │ 📋 Copy btn       │
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────┐
                    │ Admin Sends Code  │
                    │ to user manually: │
                    │ • Email           │
                    │ • WhatsApp        │
                    │ • Chat            │
                    │ • Print           │
                    └───────────────────┘
```

### 👤 User Workflow: Register with Code

```
              ┌─ REGISTRATION PAGE ─┐
              │                     │
              │ URL: /login?reg     │
              │ Click: Register     │
              └──────────┬──────────┘
                         │
              ┌──────────▼────────────┐
              │ Registration Form:    │
              │                       │
              │ * Invitation Code     │  ← REQUIRED
              │ * Email               │
              │ * Username            │
              │ * Password            │
              │ * Confirm Password    │
              │ * First Name (opt)    │
              │ * Last Name (opt)     │
              └──────────┬────────────┘
                         │
              ┌──────────▼────────────┐
              │ User Enters Code      │
              │ (pasted from email)   │
              └──────────┬────────────┘
                         │ Click Register
              ┌──────────▼────────────┐
              │ Frontend Validates    │
              │ • Code not empty      │
              │ • Fields filled       │
              │ • Passwords match     │
              └──────────┬────────────┘
                         │
        ┌────────────────▼─────────────────┐
        │                                  │
    ┌───▼────┐ Invalid?              ┌─────▼──────┐ Valid?
    │         │                      │            │
    ▼ Error   │                      │           ▼
  "Code not   │                      │    POST /auth/register/
   found"     │                      │    {
              │                      │     code: "Ql7mK9x2R4pNvW8jB5sT"
              │                      │     email: "user@example.com"
              │                      │     username: "john_smith"
              │                      │     password: "SecurePass123"
              │                      │    }
              │                      │            │
              │                      │           ▼
              │              ┌───────────────────────────────┐
              │              │ Backend Validation            │
              │              │                               │
              │              │ 1. Find InvitationCode        │
              │              │ 2. Check if valid:            │
              │              │    - Exists?                  │
              │              │    - Not expired?             │
              │              │    - Not already used?        │
              │              │    - Email matches? (if set)  │
              │              │                               │
              │              └───────▬──────────┬────────────┘
              │                      │          │
        ┌─────┴──────────┐   ┌──────▼──┐  ┌────▼──────────┐
        │ Code Invalid   │   │         │  │               │
        │ • Expired      │   │ Invalid │  │ Valid!        │
        │ • Used         │   │ Code    │  │               │
        │ • Wrong email  │   │ Error   │  ▼               │
        │                │   │ Message │                   │
        └────────────────┘   │         │  Create User     │
                             │         │  • Username      │
                             │         │  • Email         │
                             │         │  • Password hash │
                             │         │  • Is_active=True│
                             │         │                  │
                             │         │  Mark Code Used  │
                             │         │  • used = True   │
                             │         │  • used_by = user│
                             │         │  • used_at = now │
                             │         │                  │
                             │         │  Generate JWT    │
                             │         │  • Access token  │
                             │         │  • Refresh token │
                             │         │                  │
                             │         │  Return tokens   │
                             │         │                  │
                             └──┬──────┘                   │
                                │                          │
                                └──────────────┬───────────┘
                                               │
                         ┌─────────────────────▼────────────┐
                         │ Frontend Receives Response       │
                         │                                  │
                         │ • Stores tokens in localStorage  │
                         │ • Sets auth header               │
                         │ • Redirects to /dashboard        │
                         │                                  │
                         └──────────────────────────────────┘
                                               │
                         ┌─────────────────────▼────────────┐
                         │ User Now Authenticated          │
                         │ Can use all system features     │
                         └──────────────────────────────────┘
```

### 📧 Member Workflow: Receive QR Code Email

```
              ┌─ ADMIN CREATES MEMBER ─┐
              │                        │
              │ Via form or API:       │
              │ • full_name            │
              │ • email ✓              │
              │ • phone                │
              │ • department           │
              │ • class_name           │
              └───────────┬────────────┘
                          │
              ┌───────────▼────────────┐
              │ POST /members/         │
              │ Backend receives       │
              └───────────┬────────────┘
                          │
              ┌───────────▼────────────────────┐
              │ Member Saved to Database       │
              │                               │
              │ Model.save() called           │
              │ ├─ Generate member_id        │
              │ ├─ Generate QR code          │
              │ └─ Store in qr_code_data     │
              └───────────┬────────────────────┘
                          │
              ┌───────────▼────────────────────┐
              │ Signal: post_save triggered    │
              │                               │
              │ send_qr_code_on_creation()    │
              └───────────┬────────────────────┘
                          │
              ┌───────────▼────────────────────┐
              │ Generate Styled Card           │
              │                               │
              │ qr_card_generator.py:         │
              │ • Create 600x900 image        │
              │ • Draw header (blue)          │
              │ • Add member details:         │
              │   - Name                      │
              │   - ID                        │
              │   - Department                │
              │   - Class                     │
              │ • Embed QR code image         │
              │ • Export as PNG               │
              └───────────┬────────────────────┘
                          │
              ┌───────────▼────────────────────┐
              │ Create Email Message           │
              │                               │
              │ from email_service.py:        │
              │ • Subject line                │
              │ • HTML template               │
              │ • Plain text version          │
              │ • Embedded card image         │
              │ • Attachment: card.png        │
              │ • Attachment: qr_code.png    │
              └───────────┬────────────────────┘
                          │
              ┌───────────▼────────────────────┐
              │ Send Email via SMTP           │
              │                               │
              │ EMAIL_BACKEND:               │
              │ django.core.mail...          │
              │                               │
              │ To: member.email             │
              │ From: DEFAULT_FROM_EMAIL     │
              │ SMTP Host: EMAIL_HOST        │
              │ Port: EMAIL_PORT             │
              │ Auth: EMAIL_HOST_USER       │
              └───────────┬────────────────────┘
                          │
              ┌───────────▼────────────────────┐
              │ Member Receives Email         │
              │                               │
              │ In Inbox:                    │
              │ Subject: Your Church QR Code  │
              │                               │
              │ Body:                        │
              │ ┌─────────────────────────┐  │
              │ │ Welcome Message         │  │
              │ ├─────────────────────────┤  │
              │ │ ┌───────────────────┐   │  │
              │ │ │  MEMBERSHIP CARD  │   │  │
              │ │ │  ·················│   │  │
              │ │ │ Name: John Doe    │   │  │
              │ │ │ ID: MEM001        │   │  │
              │ │ │ Dept: Technical   │   │  │
              │ │ │ Class: Airport    │   │  │
              │ │ │ ┌─────────────┐   │   │  │
              │ │ │ │   QR CODE   │   │   │  │
              │ │ │ │             │   │   │  │
              │ │ │ └─────────────┘   │   │  │
              │ │ └───────────────────┘   │  │
              │ ├─────────────────────────┤  │
              │ │ Instructions:           │  │
              │ │ • Use for check-in      │  │
              │ │ • Print or screenshot   │  │
              │ │ • Show at service       │  │
              │ ├─────────────────────────┤  │
              │ │ Attachments:            │  │
              │ │ 📎 membership_card_... │  │
              │ │ 📎 qr_code_...        │  │
              │ └─────────────────────────┘  │
              └───────────────────────────────┘
                          │
              ┌───────────▼────────────────────┐
              │ Member Reviews Card            │
              │                               │
              │ • Sees beautiful card         │
              │ • Can print it                │
              │ • Can screenshot it           │
              │ • Can download attachments    │
              │ • Ready for next service!     │
              └───────────────────────────────┘
```

### 💬 Optional: Send QR via WhatsApp

```
              ┌─ ADMIN SENDS WHATSAPP ─┐
              │                        │
              │ POST /members/{id}/    │
              │ send_qr_whatsapp/      │
              └───────────┬────────────┘
                          │
              ┌───────────▼────────────┐
              │ WhatsApp Service       │
              │ whatsapp_service.py    │
              └───────────┬────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
    Check if      Get phone #        Format number
    enabled       from member         Convert to
    • Twilio      or param            intl format
      creds?
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
              ┌───────────▼────────────┐
              │ Create Message Body:   │
              │                        │
              │ Hello {name}! 👋      │
              │ Your QR ready!        │
              │                        │
              │ Details:              │
              │ • ID: MEM001          │
              │ • Dept: Technical     │
              │ • Class: Airport      │
              │                        │
              │ Show at service!      │
              └───────────┬────────────┘
                          │
              ┌───────────▼────────────┐
              │ Call Twilio API       │
              │                       │
              │ client.messages       │
              │ .create(              │
              │   from=WHATSAPP_FROM, │
              │   to=whatsapp:+233... │
              │   body=message_text   │
              │ )                     │
              └───────────┬────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
    Success!        Invalid #      No Twilio
    Message ID      "Base64 error" credentials
    returned        Error returned Error msg
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
              ┌───────────▼────────────┐
              │ Return to Admin        │
              │                        │
              │ {                      │
              │  "success": true/false │
              │  "message_sid": "SM.." │
              │  "error": null or str  │
              │ }                      │
              └───────────┬────────────┘
                          │
              ┌───────────▼────────────┐
              │ Admin UI Shows Result  │
              │                        │
              │ ✓ Message sent! or    │
              │ ✗ Error: ...          │
              └───────────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────────────────── SYSTEM DATA FLOW ───────────────────────────┐
│                                                                          │
│  FRONTEND                    BACKEND                    SERVICES        │
│  ┌──────────────┐           ┌──────────────┐          ┌─────────────┐   │
│  │              │           │              │          │             │   │
│  │ Registration │──POST──→ │ auth/register│──────→  │ Validate    │   │
│  │   & Login    │          │              │         │ Invite Code │   │
│  │              │          │              │         │             │   │
│  └──────────────┘          └──────────────┘         └──────┬──────┘   │
│                                                            │             │
│  ┌──────────────┐          ┌──────────────┐              │             │
│  │              │          │              │              │             │
│  │ Create       │──POST──→ │ members/     │──────→   ┌───▼──────────┐ │
│  │ Member       │          │              │          │ QR Generator │ │
│  │              │          │ (save member)│          │              │ │
│  └──────────────┘          └──────────────┘          └───┬──────────┘ │
│        ▲                            │                    │             │
│        │                            ▼                    ▼             │
│        │                    ┌─────────────────────────────────┐       │
│        │                    │ Signal: post_save triggered     │       │
│        │                    │ → send_qr_code_on_creation()    │       │
│        │                    └─────────────┬───────────────────┘       │
│        │                                  │                            │
│        │                         ┌────────▼─────────────┐             │
│        │                         │ Email Service       │             │
│        │                         │ • Generate card     │             │
│        │                         │ • Embed QR code     │             │
│        │                         │ • Create attachments│             │
│        │                         └────────┬────────────┘             │
│        │                                  │                            │
│        │                         ┌────────▼─────────────┐             │
│        │                         │ SMTP Server         │             │
│        │                         │ Send email to member│             │
│        │                         └─────────────────────┘             │
│        │                                                               │
│  ┌─────┴──────────┐          ┌──────────────┐                        │
│  │                │          │              │                        │
│  │ Admin Invites  │──POST──→ │ invitations/ │                        │
│  │ Page           │          │ generate     │                        │
│  │                │          │ _bulk/       │                        │
│  └────────────────┘          │              │                        │
│                              └──────────────┘                        │
│                                      │                                │
│                              ┌──────▼──────────┐                      │
│                              │ Create Codes    │                      │
│                              │ Store in DB     │                      │
│                              └─────────────────┘                      │
│                                                                        │
│  ┌──────────────┐            ┌──────────────┐     ┌──────────────┐  │
│  │              │            │              │     │              │  │
│  │ Send         │──POST──→  │ /send_qr_    │────→│ Twilio API  │  │
│  │ WhatsApp     │           │ whatsapp/    │     │ Send message│  │
│  │              │           │              │     │              │  │
│  └──────────────┘           └──────────────┘     └──────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

```
FRONTEND
┌─ React 18
│  ├─ React Router (navigation)
│  ├─ Axios (API calls)
│  └─ CSS (styling)
└─ Modern JavaScript (ES6+)

BACKEND
┌─ Django 6
│  ├─ Django REST Framework
│  ├─ Django Signals (automation)
│  ├─ JWT Authentication
│  └─ SQLite/PostgreSQL
└─ Python 3.8+

LIBRARIES
├─ qrcode - QR generation
├─ Pillow - Image processing
├─ twilio - WhatsApp API
├─ weasyprint - PDF generation
└─ Django Mail - Email

SERVICES
├─ Gmail/SMTP - Email delivery
├─ Twilio - WhatsApp delivery
├─ Cloudinary - Media storage (optional)
└─ Local storage - QR codes

DEPLOYMENT
├─ Django (backend)
├─ Vite/npm (frontend)
├─ SQLite/PostgreSQL (database)
└─ Gunicorn/uWSGI (production)
```

---

## Summary

✅ **Simple to understand** - Clear data flows  
✅ **Secure** - Authentication at every step  
✅ **Automated** - Signals handle QR sending  
✅ **User-friendly** - Admin UI for easy management  
✅ **Scalable** - Can handle bulk operations  

All systems are **fully integrated and ready to use!**
