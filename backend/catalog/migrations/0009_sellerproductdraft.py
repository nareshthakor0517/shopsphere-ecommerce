import json
import uuid

import django.db.models.deletion
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.db import migrations, models


PRODUCT_DATA_FIELDS = (
    "name",
    "sku",
    "description",
    "short_description",
    "category",
    "subcategory",
    "brand",
    "price",
    "mrp",
    "image_url",
    "image_urls",
    "specifications",
    "stock",
    "low_stock_threshold",
    "tax_rate",
    "weight",
    "length",
    "width",
    "height",
    "shipping_charges",
    "free_shipping",
    "warranty_period",
    "return_policy",
    "replacement_available",
    "seo_title",
    "meta_description",
    "slug",
    "status",
    "is_featured",
)


def move_product_drafts(apps, schema_editor):
    Product = apps.get_model("catalog", "Product")
    SellerProductDraft = apps.get_model("catalog", "SellerProductDraft")
    database = schema_editor.connection.alias
    for product in Product.objects.using(database).filter(status="draft").iterator():
        data = {field: getattr(product, field) for field in PRODUCT_DATA_FIELDS}
        SellerProductDraft.objects.using(database).create(
            seller_id=product.seller_id,
            data=json.loads(json.dumps(data, cls=DjangoJSONEncoder)),
        )
        product.delete(using=database)


def restore_product_drafts(apps, schema_editor):
    Product = apps.get_model("catalog", "Product")
    SellerProductDraft = apps.get_model("catalog", "SellerProductDraft")
    database = schema_editor.connection.alias
    for draft in SellerProductDraft.objects.using(database).all().iterator():
        Product.objects.using(database).create(seller_id=draft.seller_id, **draft.data)
        draft.delete(using=database)


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0008_sellercategory"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SellerProductDraft",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("data", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("product", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="seller_drafts", to="catalog.product")),
                ("seller", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="product_drafts", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "shopsphere_seller_product_drafts",
                "ordering": ("-updated_at",),
            },
        ),
        migrations.RunPython(move_product_drafts, restore_product_drafts),
    ]
