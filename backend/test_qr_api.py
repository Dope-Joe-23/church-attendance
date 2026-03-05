#!/usr/bin/env python
"""Test the QR code API endpoints"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
django.setup()

from members.models import Member
from rest_framework.test import APIClient
from django.test import TestCase, Client
from django.test.client import RequestFactory

print("\n" + "="*70)
print("QR CODE API ENDPOINT TEST")
print("="*70)

# Create a test member
print("\n[Setup] Creating test member...")
Member.objects.filter(full_name="API Test Member").delete()
member = Member.objects.create(
    full_name="API Test Member",
    email="api-test@example.com"
)
print(f"✓ Created member ID {member.id} with member_id={member.member_id}")

# Test 1: Using APIClient
print("\n[TEST 1] Testing with APIClient...")
try:
    client = APIClient()
    
    # Test getting member
    response = client.get(f'/api/members/{member.id}/')
    print(f"  GET /api/members/{member.id}/ -> {response.status_code}")
    if response.status_code == 200:
        print(f"  ✓ Member retrieved")
        data = response.json()
        print(f"    - member_id: {data.get('member_id')}")
        print(f"    - qr_code_data present: {bool(data.get('qr_code_data'))}")
    
    # Test getting QR code
    response = client.get(f'/api/members/{member.id}/qr_code/')
    print(f"  GET /api/members/{member.id}/qr_code/ -> {response.status_code}")
    if response.status_code == 200:
        print(f"  ✓ QR code retrieved")
        data = response.json()
        if 'qr_code_base64' in data:
            print(f"    - qr_code_base64 present (len={len(data['qr_code_base64'])})")
        if 'qr_code_url' in data:
            print(f"    - qr_code_url: {data['qr_code_url']}")
    else:
        print(f"  ✗ QR code endpoint returned {response.status_code}")
        print(f"    Response: {response.content}")
        
except Exception as e:
    print(f"  ✗ Error: {e}")
    import traceback
    traceback.print_exc()

# Test 2: Using Django test client
print("\n[TEST 2] Testing with Django Client...")
try:
    from django.test import Client
    client = Client()
    
    response = client.get(f'/api/members/{member.id}/')
    print(f"  GET /api/members/{member.id}/ -> {response.status_code}")
    
except Exception as e:
    print(f"  ✗ Error: {e}")

# Test 3: Direct view testing
print("\n[TEST 3] Testing view directly...")
try:
    from members.views import MemberViewSet
    from rest_framework.test import APIRequestFactory
    
    factory = APIRequestFactory()
    view = MemberViewSet.as_view({'get': 'retrieve'})
    request = factory.get(f'/api/members/{member.id}/')
    response = view(request, pk=member.id)
    print(f"  Direct view call: {response.status_code}")
    if response.status_code == 200:
        print(f"  ✓ View returned data")
        print(f"    - member_id: {response.data.get('member_id')}")
    
except Exception as e:
    print(f"  ✗ Error: {e}")
    import traceback
    traceback.print_exc()

# Test 4: Check URLs are configured
print("\n[TEST 4] Checking URL configuration...")
try:
    from django.urls import get_resolver
    resolver = get_resolver()
    
    # Try to match the member detail URL
    match = resolver.resolve(f'/api/members/{member.id}/')
    print(f"  ✓ URL matched: {match.func.__name__}")
    print(f"    - View: {match.func}")
    print(f"    - Kwargs: {match.kwargs}")
    
    # Try to match the qr_code URL
    try:
        qr_match = resolver.resolve(f'/api/members/{member.id}/qr_code/')
        print(f"  ✓ QR code URL matched: {qr_match.func.__name__}")
    except:
        print(f"  ✗ QR code URL not matching")
        print(f"    Available patterns:")
        for pattern in resolver.url_patterns:
            print(f"      - {pattern.pattern}")
    
except Exception as e:
    print(f"  ✗ Error checking URLs: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*70)
