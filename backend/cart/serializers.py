from rest_framework import serializers

from catalog.serializers import ProductSerializer

from .models import CartItem, WishlistItem


class CartSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source="product", read_only=True)

    class Meta:
        model = CartItem
        fields = ("id", "product", "quantity", "product_detail")


class WishlistSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source="product", read_only=True)

    class Meta:
        model = WishlistItem
        fields = ("id", "product", "product_detail")
