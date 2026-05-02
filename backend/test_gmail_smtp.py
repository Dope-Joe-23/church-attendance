#!/usr/bin/env python
"""
Diagnostic script to test Gmail SMTP connection and email sending.
"""
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

# Load environment from project root (not backend)
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / '.env')

# Test 1: Check environment variables
print("=" * 70)
print("TEST 1: Checking environment variables")
print("=" * 70)

email_host = os.getenv('EMAIL_HOST', '')
email_port = os.getenv('EMAIL_PORT', '')
email_use_tls = os.getenv('EMAIL_USE_TLS', '')
email_use_ssl = os.getenv('EMAIL_USE_SSL', '')
email_user = os.getenv('EMAIL_HOST_USER', '')
email_password = os.getenv('EMAIL_HOST_PASSWORD', '')

print(f"EMAIL_HOST: {email_host}")
print(f"EMAIL_PORT: {email_port}")
print(f"EMAIL_USE_TLS: {email_use_tls}")
print(f"EMAIL_USE_SSL: {email_use_ssl}")
print(f"EMAIL_HOST_USER: {email_user}")
print(f"EMAIL_HOST_PASSWORD: {'*' * len(email_password) if email_password else '(empty)'}")

# Test 2: Try raw SMTP connection
print("\n" + "=" * 70)
print("TEST 2: Testing raw SMTP connection")
print("=" * 70)

import smtplib
import socket
import ssl

# Test 2A: Basic socket connectivity
print("\nTesting basic socket connectivity to smtp.gmail.com:587...")
try:
    sock = socket.create_connection((email_host, int(email_port)), timeout=5)
    print("✓ Socket connection successful")
    sock.close()
except Exception as e:
    print(f"✗ Socket connection failed: {e}")
    print("Diagnosis: Firewall or network issue. Check if port 587 is open.")

try:
    print(f"\nConnecting to {email_host}:{email_port} with TLS={email_use_tls}...")
    
    if email_use_tls.lower() == 'true':
        smtp = smtplib.SMTP(email_host, int(email_port), timeout=10)
        print("  - SMTP connection made, starting TLS...")
        smtp.starttls()
    else:
        smtp = smtplib.SMTP_SSL(email_host, int(email_port), timeout=10)
    
    print("✓ Connection established")
    
    # Test 3: Try login
    print("\n" + "=" * 70)
    print("TEST 3: Testing SMTP authentication")
    print("=" * 70)
    
    print(f"Logging in as {email_user}...")
    smtp.login(email_user, email_password)
    print("✓ Authentication successful")
    
    # Test 4: Try sending email
    print("\n" + "=" * 70)
    print("TEST 4: Testing email send")
    print("=" * 70)
    
    from_email = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@example.com')
    to_email = 'test@example.com'  # Change this to a real email to receive test email
    
    subject = "Django Church Attendance - SMTP Test"
    body = "This is a test email from your Django application."
    message = f"Subject: {subject}\n\n{body}"
    
    print(f"Sending test email from {from_email} to {to_email}...")
    smtp.sendmail(from_email, to_email, message)
    print(f"✓ Email sent successfully")
    
    smtp.quit()
    print("\n✓ All tests passed!")
    
except smtplib.SMTPAuthenticationError as e:
    print(f"✗ Authentication failed: {e}")
    print("\nFix: Check your EMAIL_HOST_PASSWORD. If you have 2FA enabled on Gmail,")
    print("you must use an app-specific password, not your regular Gmail password.")
    print("Generate one at: https://myaccount.google.com/apppasswords")
except smtplib.SMTPNotSupportedError as e:
    print(f"✗ SMTP command not supported: {e}")
    print("Try using EMAIL_USE_SSL=True with EMAIL_PORT=465 instead")
except smtplib.SMTPServerDisconnected as e:
    print(f"✗ Server disconnected unexpectedly: {e}")
    print("This often means Gmail rejected the TLS handshake.")
    print("Try using EMAIL_USE_SSL=True with EMAIL_PORT=465 instead of TLS/587")
except ssl.SSLError as e:
    print(f"✗ SSL/TLS error: {e}")
    print("Check your Python SSL libraries and certificates.")
except smtplib.SMTPException as e:
    print(f"✗ SMTP error: {e}")
    import traceback
    traceback.print_exc()
except ConnectionRefusedError as e:
    print(f"✗ Connection refused: {e}")
    print("Possible causes: Firewall blocking port 587, network issue, or wrong host")
except TimeoutError as e:
    print(f"✗ Connection timeout: {e}")
    print("Possible causes: Network issue, firewall, or SMTP server not responding")
except Exception as e:
    print(f"✗ Unexpected error: {e}")
    import traceback
    traceback.print_exc()
