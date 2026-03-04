from django.db import migrations, models
import base64


def migrate_images_to_base64(apps, schema_editor):
    Member = apps.get_model('members', 'Member')
    for m in Member.objects.all():
        if m.qr_code_image and not m.qr_code_data:
            try:
                # read file content
                with m.qr_code_image.open('rb') as f:
                    data = f.read()
                m.qr_code_data = base64.b64encode(data).decode('utf-8')
                m.save(update_fields=['qr_code_data'])
            except Exception:
                # skip if file missing or unreadable
                pass


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0005_member_current_absenteeism_ratio_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='member',
            name='qr_code_data',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.RunPython(migrate_images_to_base64, reverse_code=migrations.RunPython.noop),
    ]
