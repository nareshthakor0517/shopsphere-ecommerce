import uuid

from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Product(models.Model):
    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("pending_approval", "Pending Approval"),
        ("active", "Active"),
        ("rejected", "Rejected"),
        ("out_of_stock", "Out of Stock"),
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="products",
    )
    name = models.CharField(max_length=180, blank=True, default="")
    sku = models.CharField(max_length=80, unique=True, null=True, blank=True)
    description = models.TextField(blank=True)
    short_description = models.CharField(max_length=300, blank=True)
    category = models.CharField(max_length=80, blank=True, default="", db_index=True)
    subcategory = models.CharField(max_length=100, blank=True)
    brand = models.CharField(max_length=100, blank=True, db_index=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    image_url = models.URLField(blank=True)
    image_urls = models.JSONField(default=list, blank=True)
    specifications = models.JSONField(default=dict, blank=True)
    stock = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    length = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    width = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    shipping_charges = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    free_shipping = models.BooleanField(default=False)
    warranty_period = models.CharField(max_length=100, blank=True)
    return_policy = models.CharField(max_length=500, blank=True)
    replacement_available = models.BooleanField(default=False)
    seo_title = models.CharField(max_length=180, blank=True)
    meta_description = models.CharField(max_length=300, blank=True)
    slug = models.SlugField(max_length=220, unique=True, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active", db_index=True)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "shopsphere_products"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.name:
            base = slugify(self.name)[:200] or "product"
            candidate = base
            suffix = 2
            while Product.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                candidate = f"{base[:210 - len(str(suffix))]}-{suffix}"
                suffix += 1
            self.slug = candidate
        super().save(*args, **kwargs)


class ProductImageAsset(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="product_image_assets")
    file_path = models.CharField(max_length=500, unique=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "shopsphere_product_image_assets"

    def __str__(self):
        return self.file_path


class SellerCategory(models.Model):
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="product_categories")
    name = models.CharField(max_length=80)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "shopsphere_seller_categories"
        constraints = [models.UniqueConstraint(fields=("seller", "name"), name="unique_seller_category_name")]
        ordering = ("name",)

    def __str__(self):
        return self.name


class SellerProductDraft(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="product_drafts")
    product = models.ForeignKey(
        Product,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="seller_drafts",
    )
    data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "shopsphere_seller_product_drafts"
        ordering = ("-updated_at",)

    def __str__(self):
        return f"Draft for {self.seller}"
