#!/usr/bin/env python
"""
Test script to verify QR code CORB fix
Confirms that QR codes are returned as base64 data URIs, not URLs
"""
import os
import sys
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
django.setup()

from rest_framework.test import APIClient
from members.models import Member
import base64

client = APIClient()
BASE_URL = 'http://localhost:8000/api'

def test_qr_code_cors_fix():
    """Test that QR codes are returned as base64 data URIs, not URLs"""
    
    print("\n=== Testing QR Code CORB Fix ===\n")
    
    # Create a test member
    print("Creating test member...")
    member = Member.objects.create(
        full_name='Test QR Member',
        email='test@example.com',
        is_visitor=False
    )
    print(f"✓ Member created: {member.member_id}")
    
    # Test 1: Get member from list - should return base64 data URI
    print("\n--- Test 1: Member List Response ---")
    response = client.get(f'{BASE_URL}/members/')
    if response.status_code == 200:
        data = response.json()
        members_list = data.get('results') if isinstance(data, dict) else data
        test_member = next((m for m in members_list if m['member_id'] == member.member_id), None)
        
        if test_member:
            qr_image = test_member.get('qr_code_image', '')
            print(f"Status: 200 ✓")
            print(f"QR Code Image Type: {'base64 data URI' if qr_image.startswith('data:image') else 'URL'}")
            print(f"QR Code Image Preview: {qr_image[:80]}...")
            
            if qr_image.startswith('data:image/png;base64,'):
                print("✓ SUCCESS: QR code returned as base64 data URI (CORB-safe)")
            else:
                print("✗ WARNING: QR code might be URL (could cause CORB issues)")
        else:
            print(f"✗ Member not found in list")
    else:
        print(f"✗ Failed: {response.status_code}")
    
    # Test 2: Get member detail - should also return base64 data URI
    print("\n--- Test 2: Member Detail Response ---")
    response = client.get(f'{BASE_URL}/members/{member.id}/')
    if response.status_code == 200:
        data = response.json()
        qr_image = data.get('qr_code_image', '')
        print(f"Status: 200 ✓")
        print(f"QR Code Image Type: {'base64 data URI' if qr_image.startswith('data:image') else 'URL'}")
        print(f"QR Code Image Preview: {qr_image[:80]}...")
        
        if qr_image.startswith('data:image/png;base64,'):
            print("✓ SUCCESS: QR code returned as base64 data URI (CORB-safe)")
        else:
            print("✗ WARNING: QR code might be URL (could cause CORB issues)")
    else:
        print(f"✗ Failed: {response.status_code}")
    
    # Test 3: Get QR code endpoint
    print("\n--- Test 3: QR Code Endpoint ---")
    response = client.get(f'{BASE_URL}/members/{member.id}/qr_code/')
    if response.status_code == 200:
        data = response.json()
        qr_image = data.get('qr_code_image', '')
        qr_base64 = data.get('qr_code_base64', '')
        
        print(f"Status: 200 ✓")
        print(f"Has qr_code_image (data URI): {qr_image.startswith('data:image/png;base64,')}")
        print(f"Has qr_code_base64 (raw): {bool(qr_base64)}")
        
        if qr_image.startswith('data:image/png;base64,'):
            print("✓ SUCCESS: QR code endpoint returns proper data URI")
        else:
            print("✗ WARNING: QR code endpoint might have issues")
            
        if qr_base64 and len(qr_base64) > 100:
            # Verify it's valid base64
            try:
                decoded = base64.b64decode(qr_base64)
                print(f"✓ Base64 data is valid ({len(decoded)} bytes)")
            except:
                print(f"✗ Base64 data is invalid")
    else:
        print(f"✗ Failed: {response.status_code}")
    
    print("\n=== Test Complete ===")
    print("\nNOTE: CORB errors should no longer appear because:")
    print("- QR codes are now returned as base64 data URIs")
    print("- Data URIs are embedded in JSON, requiring no cross-origin image requests")
    print("- This eliminates the need for image server CORS headers")
    
    # Cleanup
    member.delete()

if __name__ == '__main__':
    test_qr_code_cors_fix()
