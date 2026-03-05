#!/usr/bin/env python
"""
Test script for member creation and QR code generation
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
django.setup()

from members.models import Member
import base64

def test_member_creation():
    """Test creating a member and verifying QR code generation"""
    print("=" * 60)
    print("TESTING MEMBER CREATION WITH QR CODE GENERATION")
    print("=" * 60)
    
    # Clean up test data if it exists
    Member.objects.filter(full_name__startswith="Test QR").delete()
    
    print("\n1. Creating a new member...")
    try:
        member = Member.objects.create(
            full_name="Test QR Code User",
            email="test@example.com",
            phone="555-0123",
            department="test",
            is_visitor=False
        )
        print(f"✓ Member created successfully")
        print(f"  - ID: {member.id}")
        print(f"  - Member ID: {member.member_id}")
        print(f"  - Full Name: {member.full_name}")
    except Exception as e:
        print(f"✗ Failed to create member: {e}")
        return False
    
    print("\n2. Checking member_id generation...")
    if member.member_id:
        print(f"✓ Member ID generated: {member.member_id}")
    else:
        print("✗ Member ID was not generated")
        return False
    
    print("\n3. Checking QR code base64 data...")
    if member.qr_code_data:
        print(f"✓ QR code data generated ({len(member.qr_code_data)} characters)")
        
        # Verify it's valid base64
        try:
            decoded = base64.b64decode(member.qr_code_data)
            print(f"✓ Base64 data is valid")
            
            # Check if it's a valid PNG
            if decoded.startswith(b"\x89PNG"):
                print(f"✓ PNG signature is valid")
            else:
                print(f"✗ PNG signature is invalid")
                return False
        except Exception as e:
            print(f"✗ Failed to decode base64: {e}")
            return False
    else:
        print("✗ QR code data was not generated")
        return False
    
    print("\n4. Checking QR code image file...")
    if member.qr_code_image:
        print(f"✓ QR code image file created: {member.qr_code_image.name}")
        print(f"  - File size: {member.qr_code_image.size} bytes")
    else:
        print("⚠ QR code image file was not created (but data exists)")
    
    print("\n5. Verifying member is saved in database...")
    reloaded = Member.objects.get(pk=member.pk)
    if reloaded.qr_code_data == member.qr_code_data:
        print(f"✓ Member and QR data persisted in database")
    else:
        print("✗ QR data was not persisted")
        return False
    
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED ✓")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = test_member_creation()
    sys.exit(0 if success else 1)
