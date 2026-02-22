import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
django.setup()

from services.models import Service
from rest_framework.serializers import ModelSerializer

# Define a simple serializer for JSON output
class SimpleServiceSerializer(ModelSerializer):
    class Meta:
        model = Service
        fields = '__all__'

# Get all services
services = Service.objects.all()
print(f"Total services in database: {services.count()}")
print("\n--- All Services ---")
for service in services:
    print(f"ID: {service.id}, Name: {service.name}, Date: {service.date}, "
          f"IsRecurring: {service.is_recurring}, ParentService: {service.parent_service_id}")

# Check for parent recurring services
print("\n--- Parent Recurring Services (Templates) ---")
parents = Service.objects.filter(is_recurring=True, parent_service__isnull=True)
print(f"Count: {parents.count()}")
for p in parents:
    print(f"  ID: {p.id}, Name: {p.name}, Pattern: {p.recurrence_pattern}")

# Check for instances
print("\n--- Service Instances ---")
instances = Service.objects.filter(parent_service__isnull=False)
print(f"Count: {instances.count()}")
for inst in instances:
    print(f"  ID: {inst.id}, Name: {inst.name}, Date: {inst.date}, Parent: {inst.parent_service_id}")

# Check for one-time services
print("\n--- One-Time Services ---")
onetime = Service.objects.filter(is_recurring=False, parent_service__isnull=True)
print(f"Count: {onetime.count()}")
for ot in onetime:
    print(f"  ID: {ot.id}, Name: {ot.name}, Date: {ot.date}")
