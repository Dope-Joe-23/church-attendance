from django.db import migrations


def backfill_default_tenant(apps, schema_editor):
    Tenant = apps.get_model('tenants', 'Tenant')
    Member = apps.get_model('members', 'Member')
    Service = apps.get_model('services', 'Service')
    Attendance = apps.get_model('attendance', 'Attendance')

    tenant, _ = Tenant.objects.get_or_create(
        slug='default',
        defaults={
            'name': 'Default Church',
            'status': 'active',
            'plan': 'starter',
        },
    )

    for model in (Member, Service, Attendance):
        model.objects.filter(tenant__isnull=True).update(tenant_id=tenant.pk)


def reverse_backfill_default_tenant(apps, schema_editor):
    Tenant = apps.get_model('tenants', 'Tenant')
    Member = apps.get_model('members', 'Member')
    Service = apps.get_model('services', 'Service')
    Attendance = apps.get_model('attendance', 'Attendance')

    tenant = Tenant.objects.filter(slug='default').first()
    if not tenant:
        return

    for model in (Member, Service, Attendance):
        model.objects.filter(tenant_id=tenant.pk).update(tenant_id=None)
    tenant.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0004_attendance_tenant'),
        ('members', '0014_member_tenant_alter_member_class_name'),
        ('services', '0006_service_tenant'),
        ('tenants', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(backfill_default_tenant, reverse_backfill_default_tenant),
    ]
