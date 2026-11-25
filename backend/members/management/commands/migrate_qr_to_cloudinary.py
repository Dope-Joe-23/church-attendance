from django.core.management.base import BaseCommand, CommandError
from django.core.files import File
from members.models import Member
from django.conf import settings
from tenants.context import tenant_context
from tenants.models import Tenant
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
            raise CommandError(
                f"Default storage is '{storage_backend}', not a cloudinary backend."
                " Set CLOUDINARY_* env vars and restart before running."
            )

        count = 0
        failed = 0
        for tenant in Tenant._base_manager.all().iterator():
            with tenant_context(tenant):
                members = Member.objects.exclude(qr_code_image='')
                for member in members.iterator(chunk_size=50):
                    try:
                        field = member.qr_code_image
                        try:
                            local_path = field.path
                        except (AttributeError, NotImplementedError):
                            continue
                        if not os.path.isfile(local_path):
                            self.stderr.write(
                                self.style.ERROR(
                                    f"Local file missing for {member.member_id} "
                                    f"({tenant.slug}): {local_path}"
                                )
                            )
                            failed += 1
                            continue

                        self.stdout.write(
                            f"Uploading {local_path} for {member.member_id} ({tenant.slug})..."
                        )
                        with open(local_path, 'rb') as source:
                            field.save(
                                os.path.basename(local_path),
                                File(source),
                                save=True,
                            )
                        os.remove(local_path)
                        count += 1
                    except Exception as error:
                        logger.exception(
                            "Error processing member %s in tenant %s",
                            member.pk,
                            tenant.slug,
                        )
                        self.stderr.write(
                            self.style.ERROR(
                                f"Failed for {member.member_id} ({tenant.slug}): {error}"
                            )
                        )
                        failed += 1

        self.stdout.write(f"Uploaded {count} QR images.")
        if failed:
            raise CommandError(f"QR migration failed for {failed} member(s).")
