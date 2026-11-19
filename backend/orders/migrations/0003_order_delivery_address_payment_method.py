from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("orders", "0002_rename_company_order_tables")]

    operations = [
        migrations.AddField(
            model_name="order",
            name="delivery_address",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_method",
            field=models.CharField(default="razorpay", max_length=20),
        ),
    ]
