# Member Creation System - Complete Implementation Guide

## Overview

The member creation system automatically generates QR codes, stores them with Cloudinary integration support, and sends welcome emails to new members.

## Member Creation Flow

### 1. **Creating a Member (Database/ORM)**

Members can be created in three ways:

#### **Method A: Direct ORM**
```python
from members.models import Member

member = Member.objects.create(
    full_name="John Doe",
    email="john@example.com",
    phone="555-1234",
    department="worship",
    is_visitor=False
)
# member_id, QR code, and email are auto-handled
```

#### **Method B: API Endpoint**
```bash
POST /api/members/
Content-Type: application/json

{
  "full_name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "555-5678",
  "department": "outreach",
  "group": "group_a"
}
```

#### **Method C: Admin Dashboard**
Navigate to `admin/members/member/` and add via the Django admin interface.

### 2. **Automatic Processing During Creation**

When a member is saved (via any method), the `Member.save()` method automatically:

```python
def save(self, *args, **kwargs):
    # Step 1: Generate member_id if not provided
    if not self.member_id:
        self.member_id = str(uuid.uuid4())[:8].upper()
    
    # Step 2: Generate QR code if not already present
    if not self.qr_code_data:
        qr = qrcode.QRCode(...)
        qr.add_data(self.member_id)
        img = qr.make_image()
        
        # Save as base64 PNG in qr_code_data
        self.qr_code_data = base64.b64encode(png_bytes).decode('utf-8')
        
        # Save as file to qr_code_image (sent to Cloudinary if configured)
        self.qr_code_image.save(f"qr_code_{self.member_id}.png", File(img_io))
    
    # Step 3: Save member to database
    super().save(*args, **kwargs)
```

### 3. **Post-Save Signal Processing**

After the member is saved, the `post_save` signal handler executes:

```python
@receiver(post_save, sender=Member)
def send_qr_code_on_creation(sender, instance, created, **kwargs):
    """Triggered only on member creation (not updates)"""
    if created and instance.email and not instance.is_visitor:
        send_qr_code_email(instance)
```

**Conditions for email sending:**
- ✅ First time member creation (not updates)
- ✅ Member has email address
- ✅ Member is NOT a visitor

## Data Generated Automatically

| Field | Type | Value | Storage |
|-------|------|-------|---------|
| `member_id` | String | UUID[:8].upper() e.g., "74A58F19" | Database |
| `qr_code_data` | Text | Base64-encoded PNG | Database |
| `qr_code_image` | ImageField | PNG file | Cloudinary (if configured) or local `media/` |

## Email Sending

### Email Template
The system sends an HTML email with:
- Member greeting
- Member ID in code block
- QR code embedded as base64 data URI (inline image)
- QR code as PNG attachment
- Usage instructions
- Contact information

### Email Configuration
The email backend is configured in `.env`:
```dotenv
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@example.com
```

**Development**: Uses console backend (prints to stdout)  
**Production**: Uses real SMTP (Gmail, SendGrid, etc.)

## API Endpoints

### Get Member
```
GET /api/members/{id}/
```

**Response:**
```json
{
  "id": 4,
  "member_id": "74A58F19",
  "full_name": "Test User",
  "email": "test@example.com",
  "qr_code_data": "iVBORw0KGgoAAAANSUhEUgAAASI...",
  "qr_code_image": "https://res.cloudinary.../qr_code_74A58F19.png",
  "created_at": "2026-03-05T08:34:14Z"
}
```

### Get QR Code
```
GET /api/members/{id}/qr_code/
```

**Response (with base64 data):**
```json
{
  "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAAASI...",
  "member_id": "74A58F19"
}
```

**Response (with Cloudinary URL):**
```json
{
  "qr_code_url": "https://res.cloudinary.com/my-cloud/image/upload/v123/qr_codes/qr_code_74A58F19.png",
  "member_id": "74A58F19"
}
```

### Send QR Email
```
POST /api/members/{id}/send_qr_email/
```

**Response:**
```json
{
  "success": true,
  "message": "QR code email sent to john@example.com"
}
```

## Storage Options

### Local Storage (Default)
- Location: `backend/media/qr_codes/`
- File naming: `qr_code_{MEMBER_ID}.png`
- URLs: `/media/qr_codes/qr_code_74A58F19.png`

### Cloudinary Storage (When Configured)
- Requires: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- URLs: `https://res.cloudinary.com/{CLOUD_NAME}/image/upload/.../qr_code_{MEMBER_ID}.png`
- Advantages: CDN distribution, automatic optimization, no server storage

## Database Model

```python
class Member(models.Model):
    member_id = CharField(unique=True)           # Auto-generated UUID[:8]
    full_name = CharField(required=True)         # User must provide
    email = EmailField(optional)                 # Optional, triggers email if set
    is_visitor = BooleanField(default=False)     # If True, no email sent
    
    qr_code_data = TextField()                   # Base64 PNG (always present)
    qr_code_image = ImageField()                 # File reference (optional)
    
    created_at = DateTimeField(auto_now_add)
    updated_at = DateTimeField(auto_now)
```

## Serializers

### MemberSerializer
```python
class MemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        read_only_fields = [
            'id', 'member_id', 'qr_code_image', 'qr_code_data',
            'created_at', 'updated_at'
        ]
        
    def validate_full_name(self, value):
        """Ensure full_name is not empty"""
        if not value.strip():
            raise ValidationError("Full name cannot be empty")
        return value.strip()
    
    def validate_email(self, value):
        """Prevent duplicate emails for non-visitors"""
        if value:
            existing = Member.objects.filter(
                email=value.lower(),
                is_visitor=False
            ).exclude(pk=self.instance.pk if self.instance else None)
            if existing.exists():
                raise ValidationError("Email already in use")
        return value
```

## Validation Rules

| Field | Rule | Example | Action |
|-------|------|---------|--------|
| `full_name` | Required, non-empty | "John Doe" | API returns 400 if empty |
| `email` | Unique for non-visitors | "john@example.com" | API returns 400 if duplicate |
| `member_id` | Auto-generated, unique | "74A58F19" | System generates if not provided |
| `is_visitor` | True = no email sent | `true` | Email skipped for visitors |

## Testing

### Test Script
```bash
cd backend
python test_member_creation.py
```

**Tests included:**
- ✅ Basic member creation
- ✅ QR code generation (base64)
- ✅ QR code image file creation
- ✅ Email sending
- ✅ Database persistence
- ✅ Visitor member (no email)
- ✅ Member without email
- ✅ API serializer validation

### Unit Tests
```bash
python manage.py test members --verbosity=2
```

## Troubleshooting

### Issue: Member created but no QR code
**Cause**: Exception in `save()` method  
**Fix**: Check Django logs, ensure PIL/Pillow is installed
```bash
pip install Pillow
```

### Issue: Email not sent
**Cause**: Email backend not configured  
**Fix**: Check `.env` configuration, ensure member is not a visitor
```dotenv
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
```

### Issue: QR code not saving to Cloudinary
**Cause**: Missing Cloudinary credentials  
**Fix**: Set environment variables and restart Django
```dotenv
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Issue: Duplicate email error
**Cause**: Email already exists in database  
**Fix**: Use different email or update existing member
```python
# Update existing
member = Member.objects.get(email="john@example.com")
member.full_name = "John Doe Updated"
member.save()
```

## Performance Considerations

| Operation | Time | Notes |
|-----------|------|-------|
| QR code generation | ~50ms | Uses qrcode library |
| Email sending | Variable | Async with Celery recommended |
| Cloud upload (Cloudinary) | ~200-500ms | Depends on network |
| Database save | ~10-50ms | Standard Django ORM |

## Security Considerations

1. **QR Code Data**: Stored in plain text database (not sensitive)
2. **Email**: Validate email format before sending
3. **Member ID**: Unique per member, safe to expose in API
4. **Base64 QR**: Can be exposed in APIs, safe for display
5. **File Permissions**: Qr code images accessible to authenticated users only

## Files Involved

| File | Purpose |
|------|---------|
| `members/models.py` | Member model with `save()` override |
| `members/serializers.py` | MemberSerializer for API validation |
| `members/views.py` | MemberViewSet with QR code endpoint |
| `members/email_service.py` | Email sending function |
| `members/urls.py` | API URL routing |
| `test_member_creation.py` | Integration test script |

## Related Documentation

- [CLOUDINARY_SETUP_GUIDE.md](CLOUDINARY_SETUP_GUIDE.md) - Storage configuration
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Full API reference
- [README.md](README.md) - Project overview
