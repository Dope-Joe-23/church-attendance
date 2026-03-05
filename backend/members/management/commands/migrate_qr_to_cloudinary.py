from django.core.management.base import BaseCommand
from django.core.files import File
from members.models import Member
from django.conf import settings
import os
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = ('Upload existing local QR code images to Cloudinary storage. ' 
            'This will iterate over members with a local qr_code_image file, ' 
            'save it using the configured default storage (which should be ' 
            'Cloudinary) and optionally remove the original local file.')

    def handle(self, *args, **options):
        # ensure Cloudinary storage is active
        storage_backend = settings.DEFAULT_FILE_STORAGE
        if 'cloudinary' not in storage_backend:
            self.stdout.write(self.style.WARNING(
                f"Default storage is '{storage_backend}', not a cloudinary backend."
                " Set CLOUDINARY_* env vars and restart before running."))
            return

        members = Member.objects.exclude(qr_code_image='')
        count = 0
        for m in members:
            try:
                field = m.qr_code_image
                # only process files that have a local filesystem path
                if not hasattr(field, 'path'):
                    continue
                local_path = field.path
                if not os.path.exists(local_path):
                    self.stdout.write(self.style.ERROR(f"Local file missing: {local_path}"))
                    continue
                self.stdout.write(f"Uploading {local_path} for member {m.member_id}...")
                with open(local_path, 'rb') as f:
                    # saving with same name will cause cloudinary to upload
                    field.save(os.path.basename(local_path), File(f), save=True)
                # remove local copy if desired
                try:
                    os.remove(local_path)
                    self.stdout.write(self.style.SUCCESS(f"Removed local file {local_path}"))
                except Exception:
                    # not critical
                    pass
                count += 1
            except Exception as e:
                logger.exception(f"Error processing member {m.id}")
                self.stdout.write(self.style.ERROR(f"Failed for member {m.id}: {e}"))
        self.stdout.write(self.style.SUCCESS(f"Finished uploading {count} QR images."))
