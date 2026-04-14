# Complete Setup & Usage Guide

Answers to your three key questions about setup and usage.

---

## Question 1: .env Setup for Twilio

### ✅ Your .env file has been updated with placeholders!

Location: `backend/.env`

**What was added:**

```bash
# Twilio WhatsApp Configuration (NEW - Optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890

# Church Configuration (Optional - used in emails and messages)
CHURCH_NAME=Worship In Spirit Church
```

### 🎯 How to fill them in:

1. **Create Twilio Account** (free, takes 5 minutes)
   - Go to https://www.twilio.com/console
   - Sign up
   - Verify email and phone

2. **Get Credentials from Twilio Dashboard**
   ```
   TWILIO_ACCOUNT_SID = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   TWILIO_AUTH_TOKEN = "your_auth_token_here"
   TWILIO_WHATSAPP_FROM = "whatsapp:+1234567890"  (your Twilio WhatsApp number)
   ```

3. **Update backend/.env**
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_token_here
   TWILIO_WHATSAPP_FROM=whatsapp:+233501234567
   CHURCH_NAME=Worship In Spirit Church
   ```

4. **Test it works**
   ```bash
   cd backend
   python manage.py shell
   
   from members.whatsapp_service import WhatsAppService
   service = WhatsAppService()
   print(service.is_enabled())  # Should print: True
   ```

✅ **Full Twilio setup guide:** See `TWILIO_SETUP_GUIDE.md`

---

## Question 2: How QR Codes are Sent to Members

### 🎯 The Automatic Flow:

When you **create a member with email** (through the form):

```
1. Admin creates member in UI or API
   └─ (requires: name, email, phone, etc.)

2. Member saved to database
   └─ Signal triggered automatically

3. QR code generated
   └─ System creates unique QR for member_id

4. Styled membership card created
   └─ Uses the beautiful QRCodeModal design
   └─ Includes: Name, ID, Department, Class, QR code

5. Email sent automatically
   └─ To: member.email
   └─ Includes: Styled card (embedded image) + Plain QR (attachment)
   └─ No admin action needed!

6. Member receives email
   └─ Beautiful card with all details
   └─ Can print, screenshot, or just view
   └─ Also has plain QR code for backup
```

### 📍 Where in the Code:

**File:** `backend/members/models.py`

```python
@receiver(post_save, sender=Member)
def send_qr_code_on_creation(sender, instance, created, **kwargs):
    """Automatically sends QR code email when member created"""
    if created and instance.email:
        from .email_service import send_qr_code_email
        send_qr_code_email(instance)
```

### 🔄 Manual Resend (if needed):

**Via API:**
```bash
POST /api/members/{member_id}/send_qr_email/
```

**Via Django shell:**
```python
from members.models import Member
from members.email_service import send_qr_code_email

member = Member.objects.get(member_id='MEM001')
send_qr_code_email(member)
```

### 📧 What Member Receives:

**Email Subject:** `Your Church Attendance QR Code - John Doe`

**Email Content:**
```
✓ Welcome message
✓ Beautiful membership card graphic
  - Name: JOHN DOE
  - ID: MEM001
  - Department: Technical
  - Class: Airport
  - QR code embedded in card
✓ Usage instructions
✓ Church branding
✓ Plain QR code as attachment (backup)
✓ Card PNG as attachment (for printing)
```

### ⚙️ Customization:

**Change email template:** `backend/members/email_service.py`
```python
html_content = f"""
    # Customize HTML here
    # Currently sends styled card + instructions
"""
```

**Change card design:** `backend/members/qr_card_generator.py`
```python
# Modify card layout, colors, text, etc.
def _generate_png_card(member):
    # Customize card dimensions, colors, fonts
```

---

## Question 3: Invitation Code Management

### 🎯 Complete Answer:

**Current Status (before):**
- No frontend UI
- Only available via Django admin or REST API
- Admin-unfriendly

**What I Created (just now):**
- ✅ Beautiful custom admin page
- ✅ Full UI for managing invitation codes
- ✅ Generate single or bulk codes
- ✅ Track usage and expiration
- ✅ Copy codes easily
- ✅ Integrated into navigation

### 📍 New Admin Page Location:

**URL:** `http://localhost:8000/invitations`

**Access:** Authenticated admin users only

**Navigation:** Click "🎫 Invitations" in top menu

### 🎨 Features:

1. **Generate Single Code**
   - Optional email restriction
   - Set expiration date
   - Quick buttons: 7, 14, 30 days

2. **Generate Bulk Codes**
   - Create 1-100 codes at once
   - Optional email list (one per line)
   - All with same expiration

3. **View All Codes**
   - Table with: Code, Email, Status, Expiration, Created By
   - Status badges: Active, Used, Expired
   - Click copy icon to copy code

4. **Filter Codes**
   - All codes
   - Active codes (not used, not expired)
   - Used codes (with user info)

5. **Delete Codes**
   - Remove unused codes
   - Automatic audit trail

### 📱 How Admins Use It:

#### Workflow: Invite New Admin User

```
1. Go to http://localhost:8000/invitations
   
2. Fill form:
   - Email: (optional) john@church.org
   - Expires: 2024-12-31
   
3. Click "Generate Code"
   
4. Copy code that appears
   
5. Send code to john@church.org
   (via email, WhatsApp, etc.)
   
6. John receives code
   
7. John goes to http://localhost:8000/login
   
8. John clicks "Register"
   
9. John enters:
   - Invitation Code: (pastes code)
   - Username: john_smith
   - Email: john@church.org
   - Password: (strong password)
   
10. John clicks "Register"
    
11. Code marked as "Used"
    
12. John now has admin access!
```

#### Workflow: Bulk Invite Team

```
1. Go to http://localhost:8000/invitations

2. Click "Bulk Codes" tab

3. Fill form:
   - Count: 5
   - Emails:
     manager@church.org
     admin1@church.org
     admin2@church.org
     coordinator@church.org
     secretary@church.org
   - Expires: 2024-12-31

4. Click "Generate 5 Codes"

5. Codes created with email restrictions

6. Copy each code and send to their email

7. All 5 people can now register with their codes
```

### 🔄 How Codes Are Sent (Currently):

**There are two approaches:**

#### Approach 1: Manual by Admin (DEFAULT)
```
Admin generates code
└─ Admin copies code
└─ Admin sends manually via:
   - Email
   - WhatsApp
   - Chat
   - Print and hand over
```

#### Approach 2: Automatic Email (Optional - New Feature)
I can create an automatic email sender that:
- Generates code
- Automatically emails to the provided address
- Includes registration link
- Includes instructions

**Would you like me to add automatic email sending?**

### 🔗 Frontend Integration:

**New Files Created:**
- `frontend/src/components/InvitationCodeManager.jsx` - The UI
- `frontend/src/pages/InvitationCodes.jsx` - The page
- `frontend/src/styles/invitation-manager.css` - Styling

**Updated Files:**
- `frontend/src/App.jsx` - Added route and import
- `frontend/src/components/Navigation.jsx` - Added nav link

**Backend (Already existed):**
- `/api/members/invitations/` - REST API
- Authentication required - only admins can manage

### 🔒 Security:

✅ Only authenticated admins can generate codes
✅ Codes are single-use
✅ Codes auto-expire
✅ Email restriction prevents misuse
✅ Full audit trail (who created, who used)

---

## Summary Table

| Feature | Status | How to Use |
|---------|--------|-----------|
| **Twilio Setup** | ✅ Placeholders added to .env | Fill in credentials from Twilio console |
| **QR Code Email** | ✅ Automatic on member creation | No action needed - happens automatically |
| **Invitation Codes** | ✅ Admin page created | Go to `/invitations` in admin menu |
| **Code Generation** | ✅ Single & bulk | Use UI on /invitations page |
| **Code Tracking** | ✅ Full history | View in admin page - shows who used each |
| **Manual Code Sending** | ✅ Admin copy-paste | Admin generates, copies, sends manually |
| **Auto Email Codes** | ⏳ Can add | Request if you want auto-send |

---

## Next Steps:

1. **Set up Twilio** (10 minutes)
   - Follow `TWILIO_SETUP_GUIDE.md`
   - Fill in credentials in `.env`
   - Test connection

2. **Test QR Email**
   - Create a test member with email
   - Check inbox for beautiful card
   - Verify design looks good

3. **Test Invitation Codes**
   - Go to http://localhost:8000/invitations
   - Generate test code
   - Try registering with it

4. **Deploy**
   - Push all code changes
   - Update `.env` on server
   - Restart application
   - Test all features

---

## Need More Help?

**For Twilio:** See `TWILIO_SETUP_GUIDE.md`

**For QR Codes:** Check `backend/members/email_service.py` and `qr_card_generator.py`

**For Invitations:** UI is self-explanatory - try it out! Or check `InvitationCodeManager.jsx`

**For API Reference:** See `IMPLEMENTATION_GUIDE_THREE_IMPROVEMENTS.md`

---

**Questions? Stuck?** Let me know what you need help with!
