from decimal import Decimal

from django.core.validators import URLValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source="seller.username", read_only=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))
    discount_percent = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id", "seller", "seller_name", "name", "sku", "description", "short_description", "category",
            "subcategory", "brand", "price", "mrp", "discount_percent", "image_url", "image_urls",
            "specifications", "stock", "low_stock_threshold", "tax_rate", "weight", "length", "width", "height",
            "shipping_charges", "free_shipping", "warranty_period", "return_policy", "replacement_available",
            "seo_title", "meta_description", "slug", "status", "is_featured", "created_at", "updated_at",
        )
        read_only_fields = ("seller", "seller_name", "created_at", "updated_at", "slug", "discount_percent")

    def __init__(self, *args, **kwargs):
        initial_data = kwargs.get("data")
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if (request and request.data.get("status") == "draft") or (
            isinstance(initial_data, dict) and initial_data.get("status") == "draft"
        ):
            for field in self.fields.values():
                if not field.read_only:
                    field.required = False
                    if isinstance(field, serializers.CharField):
                        field.allow_blank = True
            self.fields["name"].allow_blank = True
            self.fields["category"].allow_blank = True
            self.fields["price"].min_value = Decimal("0")

    def get_discount_percent(self, product):
        if not product.mrp or product.mrp <= product.price:
            return 0
        return round((product.mrp - product.price) / product.mrp * 100, 2)

    def validate_sku(self, value):
        value = value.strip().upper()
        if value and Product.objects.filter(sku__iexact=value).exclude(pk=self.instance.pk if self.instance else None).exists():
            raise serializers.ValidationError("This SKU is already in use.")
        return value or None

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        mrp = attrs.get("mrp", getattr(self.instance, "mrp", None))
        if mrp is not None and price is not None and mrp < price:
            raise serializers.ValidationError({"mrp": "MRP must be equal to or higher than the selling price."})
        tax_rate = attrs.get("tax_rate", getattr(self.instance, "tax_rate", None))
        if tax_rate is not None and not Decimal("0") <= tax_rate <= Decimal("100"):
            raise serializers.ValidationError({"tax_rate": "Tax/GST rate must be between 0 and 100."})
        image_urls = attrs.get("image_urls", getattr(self.instance, "image_urls", [])) or []
        image_url = attrs.get("image_url", getattr(self.instance, "image_url", "")) or ""
        if len(image_urls) > 8:
            raise serializers.ValidationError({"image_urls": "Upload a maximum of 8 product images."})
        validator = URLValidator(schemes=("http", "https"))
        for image in image_urls:
            try:
                validator(image)
            except (DjangoValidationError, TypeError):
                raise serializers.ValidationError({"image_urls": "Every product image must be a valid http or https URL."})
        if image_url:
            try:
                validator(image_url)
            except DjangoValidationError:
                raise serializers.ValidationError({"image_url": "Enter a valid http or https image URL."})
        if image_urls:
            attrs["image_url"] = image_urls[0]
        elif image_url:
            attrs["image_urls"] = [image_url]
        request = self.context.get("request")
        requested_status = attrs.get("status", getattr(self.instance, "status", "draft"))
        if requested_status != "draft":
            name = attrs.get("name", getattr(self.instance, "name", ""))
            category = attrs.get("category", getattr(self.instance, "category", ""))
            subcategory = attrs.get("subcategory", getattr(self.instance, "subcategory", ""))
            sku = attrs.get("sku", getattr(self.instance, "sku", None))
            brand = attrs.get("brand", getattr(self.instance, "brand", ""))
            description = attrs.get("description", getattr(self.instance, "description", ""))
            price_value = attrs.get("price", getattr(self.instance, "price", Decimal("0")))
            mrp_value = attrs.get("mrp", getattr(self.instance, "mrp", None))
            errors = {}
            if not name.strip(): errors["name"] = "Product name is required to publish."
            if not category.strip(): errors["category"] = "Choose a category to publish."
            if not subcategory.strip(): errors["subcategory"] = "Choose a subcategory to publish."
            if not sku: errors["sku"] = "Product SKU is required to publish."
            if not brand.strip(): errors["brand"] = "Brand is required to publish."
            if not description.strip(): errors["description"] = "Product description is required to publish."
            if price_value is None or price_value <= 0: errors["price"] = "Enter a selling price to publish."
            if mrp_value is None or (price_value is not None and mrp_value < price_value): errors["mrp"] = "Enter an MRP equal to or higher than the selling price."
            if not (attrs.get("image_urls", getattr(self.instance, "image_urls", [])) or attrs.get("image_url", getattr(self.instance, "image_url", ""))):
                errors["image_urls"] = "Add at least one product image to publish."
            if errors:
                raise serializers.ValidationError(errors)
        request = self.context.get("request")
        if "is_featured" in attrs and getattr(getattr(request, "user", None), "role", None) != "admin" and attrs["is_featured"]:
            raise serializers.ValidationError({"is_featured": "Only an administrator can feature a product."})
        return attrs
