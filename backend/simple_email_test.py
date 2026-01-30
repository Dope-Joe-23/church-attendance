#!/usr/bin/env python
import os
import sys
import django

sys.path.insert(0, r'c:\Users\DELL\Desktop\Church_Attendance\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
django.setup()

from members.email_service import send_qr_code_email
from members.models import Member

# Get the existing member
member = Member.objects.first()
if member:
    print(f"Testing with member: {member.full_name}")
    print(f"Email: {member.email}")
    print(f"QR Code: {member.qr_code_image}")
    print(f"Sending email...")
    result = send_qr_code_email(member)
    print(f"Result: {result}")
else:
    print("No members found")
