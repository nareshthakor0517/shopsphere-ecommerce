from rest_framework import serializers

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_image = serializers.CharField(source="product.image_url", read_only=True)
    product_brand = serializers.CharField(source="product.brand", read_only=True)

    class Meta:
        model = OrderItem
        fields = ("id", "product", "product_name", "product_image", "product_brand", "seller", "quantity", "unit_price")


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer = serializers.IntegerField(source="user_id", read_only=True)
    customer_name = serializers.CharField(source="user.full_name", read_only=True)
    customer_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "customer",
            "customer_name",
            "customer_email",
            "total_amount",
            "status",
            "razorpay_order_id",
            "razorpay_payment_id",
            "delivery_address",
            "payment_method",
            "created_at",
            "items",
        )
