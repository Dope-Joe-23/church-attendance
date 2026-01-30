#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.insert(0, r'c:\Users\DELL\Desktop\Church_Attendance\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
django.setup()

from members.models import Member
from django.core.mail import send_mail
from django.conf import settings

print("=== EMAIL CONFIGURATION ===")
print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")

print("\n=== SENDING TEST EMAIL ===")
try:
    result = send_mail(
        'Test Email from Church Attendance System',
        'This is a test email to verify the email system is working correctly.',
        settings.DEFAULT_FROM_EMAIL,
        ['josephnyatefe22@gmail.com'],
        fail_silently=False,
    )
    print(f"✓ Test email sent successfully! Emails sent: {result}")
except Exception as e:
    print(f"✗ Error sending test email: {type(e).__name__}: {str(e)}")

print("\n=== CREATING TEST MEMBER ===")
try:
    member = Member.objects.create(
        full_name="Test User",
        email="josephnyatefe22@gmail.com",
        phone="555-1234",
        department="Test"
    )
    print(f"✓ Member created: {member.member_id}")
    print(f"✓ Email: {member.email}")
    print(f"✓ QR Code: {member.qr_code_image}")
    print(f"✓ QR Code URL: {member.qr_code_image.url if member.qr_code_image else 'None'}")
except Exception as e:
    print(f"✗ Error creating member: {type(e).__name__}: {str(e)}")
