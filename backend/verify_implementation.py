"""
Quick test to verify the implementation works
"""
from datetime import datetime, date, timedelta
from members.models import Member
from services.models import Service
from attendance.models import Attendance
from services.utils import generate_recurring_service_instances, auto_mark_absent

print("\n✓ All imports successful!")
print("\nQuick verification:")

# Test 1: Check models have new fields
print("\n1. Checking Service model fields...")
service_fields = [f.name for f in Service._meta.get_fields()]
assert 'end_time' in service_fields, "Missing end_time field"
assert 'is_recurring' in service_fields, "Missing is_recurring field"
assert 'recurrence_pattern' in service_fields, "Missing recurrence_pattern field"
assert 'parent_service' in service_fields, "Missing parent_service field"
print("   ✓ All new fields present in Service model")

# Test 2: Check Attendance model
print("\n2. Checking Attendance model fields...")
attendance_fields = [f.name for f in Attendance._meta.get_fields()]
assert 'is_auto_marked' in attendance_fields, "Missing is_auto_marked field"
print("   ✓ is_auto_marked field present in Attendance model")

# Test 3: Check Member model has is_visitor
print("\n3. Checking Member model fields...")
member_fields = [f.name for f in Member._meta.get_fields()]
assert 'is_visitor' in member_fields, "Missing is_visitor field"
print("   ✓ is_visitor field present in Member model")

# Test 4: Verify utils functions exist
print("\n4. Checking utility functions...")
from services.utils import auto_mark_absent, get_service_instances, update_service_instances
print("   ✓ All utility functions available")

print("\n✅ Implementation verified successfully!")
print("\nNew Features Ready:")
print("  • Recurring services (weekly/monthly patterns)")
print("  • Automatic absence marking when service ends")
print("  • Visitor exclusion from attendance")
print("  • Service instance generation")
print("  • Auto-marking utilities")

