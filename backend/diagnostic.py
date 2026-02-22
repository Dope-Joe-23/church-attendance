#!/usr/bin/env python
import os
import sys
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
django.setup()

from services.models import Service
from services.serializers import ServiceSerializer
from members.models import Member
from attendance.models import Attendance

print("=" * 80)
print("CHURCH ATTENDANCE - DIAGNOSTIC REPORT")
print("=" * 80)

# 1. Database Stats
print("\n1. DATABASE STATISTICS")
print("-" * 80)
services_count = Service.objects.count()
members_count = Member.objects.count()
attendance_count = Attendance.objects.count()

print(f"  Total Services:    {services_count}")
print(f"  Total Members:     {members_count}")
print(f"  Total Attendance:  {attendance_count}")

# 2. Service Details
print("\n2. SERVICE DETAILS")
print("-" * 80)
if services_count > 0:
    # Parent recurring services
    parents = Service.objects.filter(is_recurring=True, parent_service__isnull=True)
    print(f"  Parent Recurring Templates: {parents.count()}")
    for p in parents:
        print(f"    ID: {p.id} | Name: {p.name} | Pattern: {p.recurrence_pattern}")
    
    # Instances
    instances = Service.objects.filter(parent_service__isnull=False)
    print(f"\n  Service Instances: {instances.count()}")
    for inst in instances[:5]:  # Show first 5
        print(f"    ID: {inst.id} | Name: {inst.name} | Date: {inst.date}")
    if instances.count() > 5:
        print(f"    ... and {instances.count() - 5} more")
    
    # One-time services
    onetime = Service.objects.filter(is_recurring=False, parent_service__isnull=True)
    print(f"\n  One-Time Services: {onetime.count()}")
    for ot in onetime[:5]:
        print(f"    ID: {ot.id} | Name: {ot.name} | Date: {ot.date}")
    if onetime.count() > 5:
        print(f"    ... and {onetime.count() - 5} more")
else:
    print("  NO SERVICES IN DATABASE")

# 3. Serialization Check
print("\n3. SERIALIZATION TEST")
print("-" * 80)
if services_count > 0:
    service = Service.objects.first()
    serializer = ServiceSerializer(service)
    print(f"  Sample Service JSON:")
    print(f"  {json.dumps(serializer.data, indent=2, default=str)}")
else:
    print("  Cannot test serialization - no services in database")

# 4. Queryset Ordering Check
print("\n4. QUERYSET ORDERING")
print("-" * 80)
all_services = Service.objects.all().order_by('-date', '-start_time')
print(f"  Services with NULL dates: {Service.objects.filter(date__isnull=True).count()}")
print(f"  Services with non-NULL dates: {Service.objects.filter(date__isnull=False).count()}")
print(f"  Total in expected order: {all_services.count()}")

# 5. API Response Simulation
print("\n5. API RESPONSE SIMULATION")
print("-" * 80)
page_size = 20
services_page1 = Service.objects.all().order_by('-date', '-start_time')[:page_size]
serializer = ServiceSerializer(services_page1, many=True)

response_data = {
    "count": Service.objects.count(),
    "next": None if services_count <= page_size else "http://localhost:8000/api/services/?page=2",
    "previous": None,
    "results": serializer.data
}

print(f"  Response Structure:")
print(f"  - Count: {response_data['count']}")
print(f"  - Results Count: {len(response_data['results'])}")
print(f"  - Sample Result Count: {len(response_data['results']) if response_data['results'] else 0}")

if response_data['results']:
    print(f"\n  First Service in Response:")
    print(f"  {json.dumps(response_data['results'][0], indent=2, default=str)}")

print("\n" + "=" * 80)
print("END OF REPORT")
print("=" * 80)
