from pathlib import Path

from django.core.files.storage import default_storage
from django.db import migrations
from django.utils.text import slugify


DOCUMENT_FIELDS = (
    "profile_photo",
    "pan_document",
    "gst_certificate",
    "address_proof",
    "bank_proof",
)


def move_documents(apps, schema_editor):
    SellerProfile = apps.get_model("users", "SellerProfile")
    for profile in SellerProfile.objects.select_related("user").iterator():
        seller_name = slugify((profile.user.full_name or "").strip()) or slugify(profile.user.username) or "seller"
        updated_fields = []
        for field in DOCUMENT_FIELDS:
            old_path = getattr(profile, field).name
            if not old_path:
                continue
            extension = Path(old_path).suffix.lower()
            target_path = f"seller/{field}/{seller_name}_{field}{extension}"
            if old_path == target_path:
                continue
            if default_storage.exists(old_path):
                with default_storage.open(old_path, "rb") as source:
                    target_path = default_storage.save(target_path, source)
                default_storage.delete(old_path)
            setattr(profile, field, target_path)
            updated_fields.append(field)
        if updated_fields:
            profile.save(update_fields=updated_fields)


class Migration(migrations.Migration):
    dependencies = [("users", "0008_sellerprofile_approval_status")]

    operations = [migrations.RunPython(move_documents, migrations.RunPython.noop)]
