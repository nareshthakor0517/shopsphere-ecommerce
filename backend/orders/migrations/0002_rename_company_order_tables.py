from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0001_initial"),
        ("catalog", "0002_rename_company_product_table"),
        ("users", "0002_rename_company_user_table"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="order",
            table="shopsphere_orders",
        ),
        migrations.AlterModelTable(
            name="orderitem",
            table="shopsphere_order_items",
        ),
    ]
