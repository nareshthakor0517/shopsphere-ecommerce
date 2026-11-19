import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0007_productimageasset"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SellerCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=80)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("seller", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="product_categories", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "shopsphere_seller_categories", "ordering": ("name",)},
        ),
        migrations.AddConstraint(
            model_name="sellercategory",
            constraint=models.UniqueConstraint(fields=("seller", "name"), name="unique_seller_category_name"),
        ),
    ]
