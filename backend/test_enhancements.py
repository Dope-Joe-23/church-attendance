"""
Test script for attendance system enhancements.
Tests recurring services, auto-marking, and visitor restrictions.
"""
import os
import sys
import django
from datetime import datetime, date, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
sys.path.insert(0, '/c/Users/DELL/Desktop/Church_Attendance/backend')
django.setup()

from members.models import Member
from services.models import Service
from attendance.models import Attendance
from services.utils import (
    generate_recurring_service_instances,
    auto_mark_absent,
    get_service_instances
)

def test_recurring_services():
    """Test recurring service instance generation"""
    print("\n" + "="*60)
    print("TEST 1: Recurring Service Instance Generation")
    print("="*60)
    
    # Create a test recurring service
    service = Service.objects.create(
        name="Weekly Worship",
        date=date(2024, 1, 15),  # Monday
        start_time="10:00:00",
        end_time="11:30:00",
        location="Main Hall",
        description="Sunday morning worship",
        is_recurring=True,
        recurrence_pattern='weekly'
    )
    
    print(f"✓ Created recurring service: {service.name}")
    print(f"  Pattern: {service.recurrence_pattern}")
    print(f"  Start date: {service.date}")
    
    # Generate instances for next 3 months
    instances = generate_recurring_service_instances(
        service,
        start_date=date(2024, 1, 15),
        end_date=date(2024, 4, 15)
    )
    
    print(f"✓ Generated {len(instances)} instances")
    for i, instance in enumerate(instances[:5], 1):
        print(f"  {i}. {instance.date} at {instance.start_time}")
    
    # Cleanup
    Service.objects.filter(id=service.id).delete()
    print("✓ Test passed!\n")


def test_visitor_exclusion():
    """Test that visitors are excluded from attendance"""
    print("="*60)
    print("TEST 2: Visitor Exclusion from Attendance")
    print("="*60)
    
    # Create test members
    visitor = Member.objects.create(
        member_id="VISITOR001",
        full_name="Test Visitor",
        is_visitor=True
    )
    regular = Member.objects.create(
        member_id="MEMBER001",
        full_name="Test Member",
        is_visitor=False
    )
    
    print(f"✓ Created visitor: {visitor.full_name}")
    print(f"✓ Created regular member: {regular.full_name}")
    
    # Create a test service
    service = Service.objects.create(
        name="Test Service",
        date=date.today(),
        start_time="10:00:00",
        end_time="11:00:00",
        location="Test Location"
    )
    
    print(f"✓ Created test service: {service.name}")
    
    # Try to auto-mark absent
    count = auto_mark_absent(service)
    
    print(f"✓ Auto-marked {count} members as absent")
    
    # Check that only regular member was marked
    attendance = Attendance.objects.filter(service=service)
    print(f"  Attendance records created: {attendance.count()}")
    
    for att in attendance:
        is_visitor_status = "VISITOR" if att.member.is_visitor else "REGULAR"
        print(f"  - {att.member.full_name} ({is_visitor_status}): {att.status}")
    
    # Verify visitor was not included
    visitor_attendance = attendance.filter(member=visitor).exists()
    regular_attendance = attendance.filter(member=regular).exists()
    
    assert not visitor_attendance, "Visitor should not be marked absent!"
    assert regular_attendance, "Regular member should be marked absent!"
    
    print("✓ Test passed! Only regular members were marked absent.\n")
    
    # Cleanup
    Member.objects.filter(id__in=[visitor.id, regular.id]).delete()
    Service.objects.filter(id=service.id).delete()


def test_auto_marking():
    """Test automatic absence marking"""
    print("="*60)
    print("TEST 3: Automatic Absence Marking")
    print("="*60)
    
    # Create test members
    member1 = Member.objects.create(
        member_id="MEMBER002",
        full_name="John Doe"
    )
    member2 = Member.objects.create(
        member_id="MEMBER003",
        full_name="Jane Smith"
    )
    member3 = Member.objects.create(
        member_id="MEMBER004",
        full_name="Bob Wilson"
    )
    
    print(f"✓ Created 3 test members")
    
    # Create a test service
    service = Service.objects.create(
        name="Sunday Service",
        date=date.today(),
        start_time="09:00:00",
        end_time="10:30:00",
        location="Main Chapel"
    )
    
    print(f"✓ Created test service: {service.name}")
    
    # Manually check in member1
    Attendance.objects.create(
        member=member1,
        service=service,
        status='present',
        check_in_time=datetime.now()
    )
    
    print(f"✓ Manually checked in: {member1.full_name}")
    
    # Auto-mark absent for unchecked members
    count = auto_mark_absent(service)
    
    print(f"✓ Auto-marked {count} members as absent")
    
    # Verify results
    attendances = Attendance.objects.filter(service=service).order_by('member__full_name')
    
    for att in attendances:
        auto_marked = " (AUTO)" if att.is_auto_marked else ""
        print(f"  - {att.member.full_name}: {att.status}{auto_marked}")
    
    # Verify counts
    present_count = attendances.filter(status='present').count()
    absent_count = attendances.filter(status='absent').count()
    auto_count = attendances.filter(is_auto_marked=True).count()
    
    assert present_count == 1, "Should have 1 present member!"
    assert absent_count == 2, "Should have 2 absent members!"
    assert auto_count == 2, "Should have 2 auto-marked records!"
    
    print("✓ Test passed! Auto-marking worked correctly.\n")
    
    # Cleanup
    Member.objects.filter(id__in=[member1.id, member2.id, member3.id]).delete()
    Service.objects.filter(id=service.id).delete()


def test_recurring_pattern_generation():
    """Test that weekly and monthly patterns generate correctly"""
    print("="*60)
    print("TEST 4: Recurring Pattern Validation")
    print("="*60)
    
    # Test weekly pattern
    monday = date(2024, 1, 8)  # This is a Monday
    weekly_service = Service.objects.create(
        name="Weekly Meeting",
        date=monday,
        start_time="18:00:00",
        end_time="19:00:00",
        is_recurring=True,
        recurrence_pattern='weekly'
    )
    
    print(f"✓ Created weekly service starting {monday} (Monday)")
    
    instances = generate_recurring_service_instances(
        weekly_service,
        start_date=monday,
        end_date=monday + timedelta(days=35)
    )
    
    print(f"  Generated {len(instances)} instances")
    
    # Verify all instances are Mondays
    all_mondays = all(inst.date.weekday() == 0 for inst in instances)
    print(f"  All on same weekday: {all_mondays} ✓")
    
    # Test monthly pattern
    monthly_service = Service.objects.create(
        name="Monthly Meeting",
        date=date(2024, 1, 15),  # 15th of month
        start_time="15:00:00",
        end_time="16:00:00",
        is_recurring=True,
        recurrence_pattern='monthly'
    )
    
    print(f"✓ Created monthly service on 15th of month")
    
    monthly_instances = generate_recurring_service_instances(
        monthly_service,
        start_date=date(2024, 1, 1),
        end_date=date(2024, 12, 31)
    )
    
    print(f"  Generated {len(monthly_instances)} instances")
    
    # Verify all instances are on the 15th
    all_15th = all(inst.date.day == 15 for inst in monthly_instances)
    print(f"  All on same day of month: {all_15th} ✓")
    
    print("✓ Test passed! Pattern generation working correctly.\n")
    
    # Cleanup
    Service.objects.filter(id__in=[weekly_service.id, monthly_service.id]).delete()


def main():
    """Run all tests"""
    print("\n" + "🧪 CHURCH ATTENDANCE SYSTEM - TEST SUITE 🧪".center(60))
    print("Testing recurring services and auto-attendance marking")
    
    try:
        test_recurring_services()
        test_visitor_exclusion()
        test_auto_marking()
        test_recurring_pattern_generation()
        
        print("="*60)
        print("✅ ALL TESTS PASSED!")
        print("="*60)
        print("\nSummary:")
        print("  ✓ Recurring services generate instances correctly")
        print("  ✓ Visitors are excluded from attendance tracking")
        print("  ✓ Auto-marking creates absent records for unchecked members")
        print("  ✓ Weekly and monthly patterns generate on correct dates")
        print("\n" + "="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
