#!/usr/bin/env python
"""
Script to generate 50 test members for debugging pagination issues
Run from backend directory: python generate_test_members_50.py
"""

import os
import sys
import django
from datetime import datetime, timedelta
import random

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
django.setup()

from members.models import Member
from django.utils import timezone

# Sample data
FIRST_NAMES = [
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'Robert', 'Olivia',
    'James', 'Ava', 'William', 'Isabella', 'Richard', 'Mia', 'Joseph', 'Charlotte',
    'Thomas', 'Amelia', 'Charles', 'Harper', 'Christopher', 'Evelyn', 'Daniel', 'Abigail',
    'Matthew', 'Emily', 'Mark', 'Elizabeth', 'Donald', 'Sofia', 'Steven', 'Ella',
    'Paul', 'Madison', 'Andrew', 'Scarlett', 'Joshua', 'Victoria', 'Kenneth', 'Grace',
    'Kevin', 'Chloe', 'Brian', 'Camila', 'George', 'Aria', 'Edward', 'Layla',
    'Ronald', 'Penelope', 'Anthony', 'Nora'
]

LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Young',
    'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Peterson', 'Phillips', 'Campbell',
    'Parker', 'Evans', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales'
]

DEPARTMENTS = ['technical', 'media', 'echoes_of_grace', 'celestial_harmony_choir', 
               'heavenly_vibes', 'prayer_evangelism', 'visitor_care', 'protocol_ushering']

CLASSES = ['airport', 'abesim', 'old_abesim', 'asufufu_adomako', 'baakoniaba',
           'berlin_top_class_1', 'berlin_top_class_2', 'penkwase_class_1', 
           'penkwase_class_2', 'mayfair', 'odumase', 'new_dormaa_kotokrom', 'dumasua',
           'fiapre_class_1', 'fiapre_class_2', 'magazine', 'town_centre', 
           'newtown_estate', 'distance']

COMMITTEES = ['finance', 'audit', 'project', 'life_builders', 'health', 'welfare', 'harvest']

PROFESSIONS = ['Engineer', 'Teacher', 'Doctor', 'Nurse', 'Accountant', 'Manager', 
               'Developer', 'Designer', 'Businessman', 'Farmer', 'Trader', 'Retired']

LOCATIONS = ['Accra', 'Kumasi', 'Sekondi', 'Takoradi', 'Cape Coast', 'Tema', 'Abesim', 
             'Fiapre', 'Oduom', 'Asokwa', 'Asofan', 'Achimota']


def generate_member_id():
    """Generate unique member ID"""
    random_code = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=6))
    return f"MEMBER-{random_code}-{random.randint(1000, 9999)}"


def create_test_members(count=50):
    """Create test members"""
    print(f"🚀 Starting to create {count} test members...")
    created_count = 0
    errors = []
    
    for i in range(1, count + 1):
        try:
            # Generate random data
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            full_name = f"{first_name} {last_name}"
            
            # Generate unique member ID
            member_id = generate_member_id()
            
            # Random email
            email = f"{first_name.lower()}.{last_name.lower()}.{i}@church.local"
            
            # Random phone
            phone = f"+233{random.randint(10000000, 99999999)}"
            
            # Random date of birth (18-80 years old)
            days_back = random.randint(18*365, 80*365)
            dob = datetime.now().date() - timedelta(days=days_back)
            
            # Random profession
            profession = random.choice(PROFESSIONS)
            
            # Random location
            location = random.choice(LOCATIONS)
            
            # Create member
            member = Member.objects.create(
                member_id=member_id,
                full_name=full_name,
                email=email,
                phone=phone,
                date_of_birth=dob,
                profession=profession,
                place_of_residence=location,
                department=random.choice(DEPARTMENTS),
                class_name=random.choice(CLASSES),
                committee=random.choice(COMMITTEES) if random.random() > 0.5 else None,
                marital_status=random.choice(['single', 'married']),
                is_visitor=random.random() > 0.8,  # 20% visitors
                baptised=random.random() > 0.3,  # 70% baptised
                confirmed=random.random() > 0.4,  # 60% confirmed
                attendance_status=random.choice(['active', 'at_risk', 'inactive', 'vacation']),
                last_attendance_date=datetime.now().date() - timedelta(days=random.randint(0, 60))
            )
            
            created_count += 1
            print(f"✅ [{i}/{count}] Created: {full_name} (ID: {member_id})")
            
        except Exception as e:
            error_msg = f"❌ Error creating member {i}: {str(e)}"
            print(error_msg)
            errors.append(error_msg)
    
    # Print summary
    print("\n" + "="*60)
    print(f"SUMMARY: Successfully created {created_count}/{count} test members")
    print("="*60)
    
    if errors:
        print(f"\n⚠️  Found {len(errors)} errors:")
        for error in errors:
            print(f"  {error}")
    
    # Verify in database
    total_members = Member.objects.count()
    print(f"\n📊 Total members in database now: {total_members}")
    
    # Show recent members
    recent = Member.objects.all().order_by('-id')[:10]
    print(f"\n📋 Last 10 created members:")
    for member in recent:
        print(f"  • {member.full_name} ({member.member_id})")


if __name__ == '__main__':
    # Clear old test members first (optional)
    confirm = input("⚠️  Delete existing test members first? (y/n): ").strip().lower()
    if confirm == 'y':
        count = Member.objects.count()
        print(f"Deleting {count} existing members...")
        Member.objects.all().delete()
        print("✅ All members deleted")
    
    create_test_members(50)
    print("\n✨ Done! Test members created successfully.")
    print("\nNow test your API to confirm:")
    print("  • GET /api/members/ should show 20 members (page 1)")
    print("  • GET /api/members/?page=2 should show next 20 members")
    print("  • GET /api/members/?page=3 should show last 10 members")
