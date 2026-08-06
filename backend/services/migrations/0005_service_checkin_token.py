from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0004_service_generated_until'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='checkin_token',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='Unguessable token for public self check-in QR. Generated lazily.',
                max_length=64,
                null=True,
                unique=True,
            ),
        ),
    ]
