from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("store", "0001_initial"),
        ("catalog", "0001_initial"),
        ("cart", "0001_initial"),
        ("orders", "0001_initial"),
        ("payments", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.DeleteModel(name="OrderItem"),
                migrations.DeleteModel(name="CartItem"),
                migrations.DeleteModel(name="WishlistItem"),
                migrations.DeleteModel(name="Order"),
                migrations.DeleteModel(name="PaymentAttempt"),
                migrations.DeleteModel(name="Product"),
                migrations.DeleteModel(name="User"),
            ],
        ),
    ]
