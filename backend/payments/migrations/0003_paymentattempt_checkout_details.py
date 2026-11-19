from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("payments", "0002_rename_company_payment_table")]

    operations = [
        migrations.AddField(
            model_name="paymentattempt",
            name="source",
            field=models.CharField(default="cart", max_length=20),
        ),
        migrations.AddField(
            model_name="paymentattempt",
            name="delivery_address",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
