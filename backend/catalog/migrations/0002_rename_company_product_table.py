from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0001_initial"),
        ("users", "0002_rename_company_user_table"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="product",
            table="shopsphere_products",
        ),
    ]
