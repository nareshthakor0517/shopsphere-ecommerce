import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("users", "0005_user_mobile_number")]

    operations = [
        migrations.CreateModel(
            name="SellerProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("store_name", models.CharField(max_length=120)),
                ("business_type", models.CharField(choices=[("individual", "Individual"), ("registered", "Registered business")], default="individual", max_length=16)),
                ("business_address", models.TextField()),
                ("tax_identifier", models.CharField(blank=True, max_length=32)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="seller_profile", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "shopsphere_seller_profiles"},
        ),
    ]
