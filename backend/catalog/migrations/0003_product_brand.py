from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("catalog", "0002_rename_company_product_table")]

    operations = [
        migrations.AddField(
            model_name="product",
            name="brand",
            field=models.CharField(blank=True, db_index=True, max_length=100),
        ),
    ]
