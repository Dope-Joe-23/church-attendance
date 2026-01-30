#!/usr/bin/env python
"""
Test script to debug email and QR code generation
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, r'c:\Users\DELL\Desktop\Church_Attendance\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
django.setup()

from members.models import Member
from members.email_service import send_qr_code_email
from django.core.mail import send_mail
from django.conf import settings
import logging

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

print("=" * 60)
print("CHURCH ATTENDANCE - EMAIL & QR CODE TEST")
print("=" * 60)

# Test 1: Verify Email Configuration
print("\n[TEST 1] Email Configuration")
print("-" * 60)
print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
print(f"CHURCH_NAME: {settings.CHURCH_NAME if hasattr(settings, 'CHURCH_NAME') else 'Not configured'}")

# Test 2: Send Test Email
print("\n[TEST 2] Send Test Email")
print("-" * 60)
try:
    result = send_mail(
        'Test Email from Church Attendance System',
        'If you received this email, the email system is working!',
        settings.DEFAULT_FROM_EMAIL,
        ['josephnyatefe22@gmail.com'],
        fail_silently=False,
    )
    print(f"✓ Test email sent successfully!")
    print(f"  Emails sent: {result}")
except Exception as e:
    print(f"✗ Error sending test email")
    print(f"  Error: {type(e).__name__}: {str(e)}")

# Test 3: Create Member with Email
print("\n[TEST 3] Create Member & Send QR Code")
print("-" * 60)
try:
    # Check if member already exists
    test_email = "josephnyatefe22@gmail.com"
    existing = Member.objects.filter(email=test_email).first()
    if existing:
        print(f"Using existing member: {existing.member_id}")
        member = existing
    else:
        print("Creating new member...")
        member = Member.objects.create(
            full_name="Test Member",
            email=test_email,
            phone="555-0001",
            department="Testing"
        )
        print(f"✓ Member created successfully!")
    
    print(f"\n  Member Details:")
    print(f"  - ID: {member.id}")
    print(f"  - Member ID: {member.member_id}")
    print(f"  - Full Name: {member.full_name}")
    print(f"  - Email: {member.email}")
    print(f"  - QR Code Image: {member.qr_code_image}")
    
    # Check if QR code exists
    if member.qr_code_image:
        print(f"  - QR Code URL: {member.qr_code_image.url}")
        qr_path = member.qr_code_image.path
        print(f"  - QR Code Path: {qr_path}")
        print(f"  - QR Code Exists: {os.path.exists(qr_path)}")
    else:
        print(f"  - QR Code: NOT GENERATED")
    
    # Test 4: Manually Send QR Code Email
    print("\n[TEST 4] Manually Send QR Code Email")
    print("-" * 60)
    print("Attempting to send QR code email...")
    success = send_qr_code_email(member)
    if success:
        print(f"✓ QR code email sent successfully!")
    else:
        print(f"✗ Failed to send QR code email")
        
except Exception as e:
    print(f"✗ Error in member creation/email test")
    print(f"  Error: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("TEST COMPLETE - Check your email inbox!")
print("=" * 60)
