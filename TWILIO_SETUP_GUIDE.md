# Twilio Setup Guide for WhatsApp

## Step 1: Create Twilio Account

1. Go to https://www.twilio.com/console
2. Click "Sign up" if you don't have an account
3. Enter details and verify email
4. Accept terms and confirm phone number
5. You'll get a free trial account with $15 credit

---

## Step 2: Get Your Credentials

### In Twilio Console:

1. **Account SID**
   - Dashboard shows: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Copy this

2. **Auth Token**
   - Click eye icon next to token to reveal
   - Copy this (keep SECRET!)

---

## Step 3: Get WhatsApp Sandbox Number

1. In Twilio Console, go to **Messaging** > **WhatsApp**
2. Click **Get Started** or **Sandbox**
3. You'll see a WhatsApp number like: `+1234567890`
4. This is your `TWILIO_WHATSAPP_FROM`

**For Development:**
- Use sandbox number (messages won't be sent, just logged)
- No approval needed

**For Production:**
- Request production number
- Takes 24-48 hours for approval
- Full country phone number needed

---

## Step 4: Update .env File

```bash
# backend/.env

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here_keep_secret
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890

# Optional church name (used in messages)
CHURCH_NAME=Worship In Spirit Church
```

---

## Step 5: Test Connection

### Option A: From Django Shell

```bash
cd backend
python manage.py shell
```

```python
from members.whatsapp_service import WhatsAppService

service = WhatsAppService()
print(f"Enabled: {service.is_enabled()}")

# Output should be: Enabled: True
```

### Option B: Test Send Message

```python
from members.models import Member
from members.whatsapp_service import WhatsAppService

# Get a member
member = Member.objects.first()

# Create service
service = WhatsAppService()

# Send test
result = service.send_qr_code(member, "+233501234567")

print(f"Success: {result['success']}")
print(f"Message: {result.get('message_sid', result.get('error'))}")
```

---

## Step 6: Customize Messages (Optional)

Edit `backend/members/whatsapp_service.py`:

```python
@staticmethod
def _create_message_body(member):
    """Customize message here"""
    message = f"""
Hello {member.full_name}! 👋

# Edit text here...

Your QR code: {member.member_id}
"""
    return message.strip()
```

---

## Phone Number Format

The system auto-converts these formats:

| Input | Converts To |
|-------|------------|
| `0501234567` | `+233501234567` |
| `501234567` | `+233501234567` |
| `+233501234567` | `+233501234567` |
| `+1234567890` | `+1234567890` |

**Ghana Country Codes:**
- Mobile: `+233` (remove leading 0)
- Vodafone: `+233 50X XXXXXX`
- MTN: `+233 50X or 54X XXXXXX`

---

## Troubleshooting

### "WhatsApp service not configured"

**Cause:** Missing environment variables

**Fix:**
```bash
# Check .env has all three:
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+...

# Restart Django server
python manage.py runserver
```

### "Invalid phone number"

**Cause:** Phone format incorrect

**Fix:**
- Use international format: `+country_code + number`
- Ghana: `+233 + number without leading 0`
- Example: `+233501234567` ✓, `0501234567` ✓

### "Unauthorized"

**Cause:** Wrong account ID or token

**Fix:**
- Get fresh credentials from Twilio console
- Make sure you copied full string
- No extra spaces or quotes

### "Message not sent" (in sandbox)

**This is normal!** Sandbox doesn't actually send messages. 

Test actual sending:
1. Apply for production number
2. Use production credentials
3. Messages will send to real WhatsApp

---

## Production Deployment

### Before Going Live:

1. **Request Production Number**
   - In Twilio: Messaging > WhatsApp > Request Production
   - Provide: Company name, use case, phone number
   - Wait 24-48 hours for approval

2. **Update .env with Production Credentials**
   ```
   TWILIO_ACCOUNT_SID=your_production_account_id
   TWILIO_AUTH_TOKEN=your_production_token
   TWILIO_WHATSAPP_FROM=whatsapp:+233XXXXXXXXX
   ```

3. **Test with Real Phone**
   ```python
   from members.whatsapp_service import WhatsAppService
   
   service = WhatsAppService()
   result = service.send_qr_code(member, "+233501234567")
   
   # Check your phone - should receive message!
   ```

4. **Deploy**
   - Push code changes
   - Update environment on server
   - Restart application
   - Test from production

---

## Usage Examples

### Send to Single Member

```bash
curl -X POST http://localhost:8000/api/members/1/send_qr_whatsapp/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+233501234567"}'
```

### Send to Multiple Members

```bash
curl -X POST http://localhost:8000/api/members/send_qr_whatsapp_bulk/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filter": "with_phone"}'
```

---

## Cost

**Free Trial:**
- $15 credit
- Good for testing and small deployments

**Production:**
- $0.0075 per WhatsApp message (approximately)
- Incoming messages similar cost
- Pay as you go, no monthly fees

**Example:** 500 messages/month = ~$3.75/month

---

## Best Practices

✅ **Do:**
- Use sandbox first for testing
- Store auth token in `.env`, never commit to git
- Validate phone numbers before sending
- Use bulk operations for efficiency
- Monitor costs via Twilio dashboard

❌ **Don't:**
- Put credentials in code
- Share auth tokens
- Send unsolicited messages
- Forget to add country code to numbers
- Use sandbox credentials in production

---

## Links

- **Twilio Console:** https://www.twilio.com/console
- **WhatsApp Setup:** https://www.twilio.com/console/sms/whatsapp
- **Twilio Docs:** https://www.twilio.com/docs
- **WhatsApp API Docs:** https://www.twilio.com/docs/whatsapp

---

## Support

**Twilio Issues:**
1. Check Twilio console for error logs
2. Verify credentials are correct
3. Check phone number format
4. View message logs in Twilio dashboard

**App Issues:**
1. Check Django logs
2. Run test from shell
3. Verify credentials in `.env`
4. Check firewall/network

---

**Setup Time:** 10-15 minutes  
**Ready to Use:** Immediately after setup  
**Testing:** Can test immediately in sandbox
