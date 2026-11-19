import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("payments", "0003_paymentattempt_checkout_details"),
        ("users", "0010_sellerprofile_revoked_status"),
    ]

    operations = [
        migrations.CreateModel(
            name="SellerPayout",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("paid", "Paid"), ("cancelled", "Cancelled")], default="pending", max_length=12)),
                ("reference", models.CharField(blank=True, max_length=120)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_seller_payouts", to=settings.AUTH_USER_MODEL)),
                ("seller", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="seller_payouts", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "shopsphere_seller_payouts", "ordering": ("-created_at",)},
        ),
        migrations.AddConstraint(
            model_name="sellerpayout",
            constraint=models.CheckConstraint(condition=models.Q(("amount__gt", 0)), name="seller_payout_amount_positive"),
        ),
    ]
