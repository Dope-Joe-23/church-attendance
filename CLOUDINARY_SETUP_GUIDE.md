# Cloudinary QR Code Storage Setup Guide

## Overview
This document explains how to install and configure Cloudinary for storing QR code images in the Church Attendance System.

## What Has Been Installed

### Packages Added
- **cloudinary** (v1.36.0+) - Python SDK for Cloudinary
- **django-cloudinary-storage** (v0.3.0) - Django integration for Cloudinary file storage

Both are included in [requirements.txt](requirements.txt).

## Installation Steps

### 1. Install Dependencies
The packages are already listed in `requirements.txt`:
```bash
pip install -r requirements.txt
```

Or install individually:
```bash
pip install cloudinary django-cloudinary-storage
```

### 2. Get Cloudinary Credentials
1. Sign up for a free account at [cloudinary.com](https://cloudinary.com/)
2. Navigate to **Dashboard** → **API Environment Variable**
3. You'll see your credentials:
   - `Cloud Name`
   - `API Key`
   - `API Secret`

### 3. Configure Environment Variables

Add these to your `.env` file (at workspace root or `backend/.env`):

```dotenv
CLOUDINARY_CLOUD_NAME=your-cloud-name-here
CLOUDINARY_API_KEY=your-api-key-here
CLOUDINARY_API_SECRET=your-api-secret-here
```

Example `.env` entry:
```dotenv
CLOUDINARY_CLOUD_NAME=my-church-app
CLOUDINARY_API_KEY=1234567890123456789
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
```

### 4. Verify Configuration

The Django settings automatically:
- Load environment variables from `.env` files
- Check if all Cloudinary credentials are present
- Set `DEFAULT_FILE_STORAGE` to `cloudinary_storage.storage.MediaCloudinaryStorage` if credentials are valid
- Fall back to local storage (`django.core.files.storage.FileSystemStorage`) if credentials are missing

To verify settings are loaded correctly:
```bash
cd backend
python manage.py shell
>>> from django.conf import settings
>>> print(settings.CLOUDINARY_STORAGE)
>>> print(settings.DEFAULT_FILE_STORAGE)
```

## How It Works

### QR Code Generation & Storage Flow

1. **Member Creation**: When a new member is created via the API:
   ```python
   member = Member.objects.create(full_name="John Doe", ...)
   ```

2. **QR Code Auto-Generation**: The `Member.save()` method automatically:
   - Generates a unique `member_id` (UUID-based if not provided)
   - Creates a QR code PNG image containing the `member_id`
   - Stores it in `qr_code_data` as base64-encoded PNG
   - (Optional) saves it to `qr_code_image` FileField

3. **Storage Backend**:
   - If Cloudinary is configured: File is uploaded to Cloudinary
   - If not configured: File is saved to local `media/qr_codes/` directory

### API Endpoints

#### Get QR Code
```
GET /api/members/{id}/qr_code/
```

Response (when base64 is available):
```json
{
  "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAAAA...",
  "member_id": "ABC123"
}
```

Response (when Cloudinary URL is available):
```json
{
  "qr_code_url": "https://res.cloudinary.com/my-cloud-name/image/upload/v1234567890/qr_codes/qr_code_ABC123.png",
  "member_id": "ABC123"
}
```

#### Send QR Code via Email
```
POST /api/members/{id}/send_qr_email/
```

This sends the QR code to the member's email address.

## Migration: Move Existing QR Codes to Cloudinary

If you have existing QR code files in `backend/media/qr_codes/`, use the management command:

```bash
cd backend
python manage.py migrate_qr_to_cloudinary
```

This command:
1. Iterates over all members with local `qr_code_image` files
2. Re-saves them using the configured storage backend (Cloudinary)
3. Optionally removes the local copy

## Troubleshooting

### Issue: "AttributeError: 'Settings' object has no attribute 'DEFAULT_FILE_STORAGE'"
**Cause**: Environment variables are not fully set.
**Solution**: Ensure `.env` file exists and is in the root workspace directory or `backend/` directory.

### Issue: QR codes still saving to local directory
**Cause**: Cloudinary credentials are empty.
**Solution**: 
1. Check `.env` file is loaded: `python -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.getenv('CLOUDINARY_CLOUD_NAME'))"`
2. Restart Django/server after updating `.env`
3. Verify credentials in Cloudinary dashboard

### Issue: FileNotFoundError when saving QR codes
**Cause**: Local `media/` or `qr_codes/` directory doesn't exist.
**Solution**: Create the directory:
```bash
mkdir -p backend/media/qr_codes
```

## Storage Backend Fallback Logic

The system gracefully handles missing Cloudinary credentials:

```python
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.getenv('CLOUDINARY_CLOUD_NAME'),
    'API_KEY': os.getenv('CLOUDINARY_API_KEY'),
    'API_SECRET': os.getenv('CLOUDINARY_API_SECRET'),
}

if all(CLOUDINARY_STORAGE.values()):
    # All credentials present → use Cloudinary
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
else:
    # Missing credentials → use local filesystem
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
```

## Production Deployment

### On Render.com or Other PaaS

1. **Production Settings**:
   - Set `DEBUG=False`
   - Set `SECRET_KEY` to a secure random string
   - Add Cloudinary env vars to platform settings

2. **Example Render.yml**:
```yaml
services:
  - type: web
    name: church-api
    env:
      DEBUG: false
      CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME}
      CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY}
      CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET}
```

3. **Test**:
```bash
python manage.py check
python manage.py runserver
```

## Related Files
- [backend/church_config/settings.py](../backend/church_config/settings.py) - Storage configuration
- [backend/members/models.py](../backend/members/models.py) - Member model with QR generation
- [backend/members/views.py](../backend/members/views.py) - QR code API endpoints
- [backend/members/management/commands/migrate_qr_to_cloudinary.py](../backend/members/management/commands/migrate_qr_to_cloudinary.py) - QR migration command
- [requirements.txt](../requirements.txt) - Python dependencies
