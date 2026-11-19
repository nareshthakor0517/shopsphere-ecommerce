from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("cart", "0001_initial"),
        ("catalog", "0002_rename_company_product_table"),
        ("users", "0002_rename_company_user_table"),
    ]

    operations = [
        migrations.AlterModelTable(
            name="cartitem",
            table="shopsphere_cart_items",
        ),
        migrations.AlterModelTable(
            name="wishlistitem",
            table="shopsphere_wishlist_items",
        ),
    ]
