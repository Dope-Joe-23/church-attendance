# Generated migration to fix old newton_estate values to newtown_estate

from django.db import migrations

def fix_class_name(apps, schema_editor):
    """Fix old newton_estate values to newtown_estate"""
    Member = apps.get_model('members', 'Member')
    updated_count = Member.objects.filter(class_name='newton_estate').update(class_name='newtown_estate')
    if updated_count > 0:
        print(f"✓ Fixed {updated_count} members with newton_estate → newtown_estate")

def reverse_fix_class_name(apps, schema_editor):
    """Reverse: change newtown_estate back to newton_estate (if needed)"""
    # Not recommended, but keeping for reversibility
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('members', '0009_member_marital_status_alter_member_class_name_and_more'),
    ]

    operations = [
        migrations.RunPython(fix_class_name, reverse_fix_class_name),
    ]
