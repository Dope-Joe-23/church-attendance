#!/usr/bin/env python
"""
Test script to verify member creation works with the fixed validation
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
django.setup()

from rest_framework.test import APIClient
from django.test import TestCase
import json

client = APIClient()
BASE_URL = 'http://localhost:8000/api'

def test_member_creation():
    """Test creating a member with proper validation"""
    
    print("\n=== Testing Member Creation API ===\n")
    
    # Test 1: Valid member creation with email
    print("Test 1: Creating member with email (non-visitor)...")
    data = {
        'full_name': 'Test Member',
        'email': 'test@example.com',
        'phone': '',
        'is_visitor': False
    }
    response = client.post(f'{BASE_URL}/members/', data, format='json')
    print(f"Status: {response.status_code}")
    if response.status_code == 201:
        print(f"✓ Success: Member created")
        print(f"  Member ID: {response.data.get('member_id')}")
    else:
        print(f"✗ Failed: {response.data}")
    
    # Test 2: Valid member creation with phone
    print("\nTest 2: Creating member with phone (non-visitor)...")
    data = {
        'full_name': 'Test Member 2',
        'email': '',
        'phone': '555-1234',
        'is_visitor': False
    }
    response = client.post(f'{BASE_URL}/members/', data, format='json')
    print(f"Status: {response.status_code}")
    if response.status_code == 201:
        print(f"✓ Success: Member created")
        print(f"  Member ID: {response.data.get('member_id')}")
    else:
        print(f"✗ Failed: {response.data}")
    
    # Test 3: Invalid - non-visitor without contact method
    print("\nTest 3: Trying to create non-visitor without email or phone (should fail)...")
    data = {
        'full_name': 'Test Member 3',
        'email': '',
        'phone': '',
        'is_visitor': False
    }
    response = client.post(f'{BASE_URL}/members/', data, format='json')
    print(f"Status: {response.status_code}")
    if response.status_code == 400:
        print(f"✓ Correctly rejected: {response.data}")
    else:
        print(f"✗ Should have failed but got status {response.status_code}")
    
    # Test 4: Valid visitor without contact method
    print("\nTest 4: Creating visitor without contact method (should succeed)...")
    data = {
        'full_name': 'Test Visitor',
        'email': '',
        'phone': '',
        'is_visitor': True
    }
    response = client.post(f'{BASE_URL}/members/', data, format='json')
    print(f"Status: {response.status_code}")
    if response.status_code == 201:
        print(f"✓ Success: Visitor created")
        print(f"  Member ID: {response.data.get('member_id')}")
    else:
        print(f"✗ Failed: {response.data}")

if __name__ == '__main__':
    test_member_creation()
