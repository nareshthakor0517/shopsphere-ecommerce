from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0009_normalize_seller_document_paths"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sellerprofile",
            name="approval_status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending approval"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                    ("revoked", "Revoked"),
                ],
                default="approved",
                max_length=12,
            ),
        ),
    ]
