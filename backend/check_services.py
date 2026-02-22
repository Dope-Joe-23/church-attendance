import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'church_config.settings')
django.setup()

from services.models import Service

print("=" * 80)
print("SERVICE STRUCTURE ANALYSIS")
print("=" * 80)

# Parent recurring services
parents = Service.objects.filter(is_recurring=True, parent_service__isnull=True, date__isnull=True)
print(f"\n1. PARENT RECURRING SERVICES (Templates): {parents.count()}")
for p in parents[:5]:
    instances = p.instances.all().order_by('-date')
    print(f"\n   Parent ID {p.id}: '{p.name}' ({p.recurrence_pattern})")
    print(f"   └─ Has {instances.count()} instances")
    for inst in instances[:3]:
        print(f"      └─ Instance ID {inst.id}: {inst.date}")

# One-time services
one_time = Service.objects.filter(is_recurring=False)
print(f"\n2. ONE-TIME SERVICES: {one_time.count()}")
for o in one_time[:5]:
    print(f"   ID {o.id}: '{o.name}' (date: {o.date})")

# All recurring instances
recurring_instances = Service.objects.filter(parent_service__isnull=False)
print(f"\n3. RECURRING INSTANCES (services with parent): {recurring_instances.count()}")

print("\n" + "=" * 80)
