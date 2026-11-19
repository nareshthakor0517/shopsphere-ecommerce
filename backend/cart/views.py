from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from catalog.models import Product

from .models import CartItem, WishlistItem
from .serializers import CartSerializer, WishlistSerializer


class OwnedModelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CartViewSet(OwnedModelViewSet):
    queryset = CartItem.objects.select_related("product", "product__seller").all()
    serializer_class = CartSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def create(self, request, *args, **kwargs):
        try:
            product = Product.objects.get(pk=request.data.get("product"))
        except (Product.DoesNotExist, TypeError, ValueError):
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            quantity = int(request.data.get("quantity", 1))
        except (TypeError, ValueError):
            raise ValidationError({"quantity": "Enter a whole number."})
        if quantity < 1:
            raise ValidationError({"quantity": "Quantity must be at least 1."})
        if product.stock < 1:
            raise ValidationError({"detail": "This product is out of stock."})
        item, _ = CartItem.objects.get_or_create(
            user=request.user,
            product=product,
            defaults={"quantity": 0},
        )
        if item.quantity + quantity > product.stock:
            raise ValidationError({"quantity": f"Only {product.stock} item(s) are available."})
        item.quantity += quantity
        item.save(update_fields=["quantity"])
        return Response(CartSerializer(item).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        item = self.get_object()
        try:
            quantity = int(request.data.get("quantity", item.quantity))
        except (TypeError, ValueError):
            raise ValidationError({"quantity": "Enter a whole number."})
        if quantity < 1 or quantity > item.product.stock:
            raise ValidationError({"quantity": f"Choose a quantity from 1 to {item.product.stock}."})
        item.quantity = quantity
        item.save(update_fields=["quantity"])
        return Response(CartSerializer(item).data)


class WishlistViewSet(OwnedModelViewSet):
    queryset = WishlistItem.objects.select_related("product").all()
    serializer_class = WishlistSerializer
    http_method_names = ["get", "post", "delete", "head", "options"]

    def create(self, request, *args, **kwargs):
        product_id = request.data.get("product")
        try:
            Product.objects.get(pk=product_id)
        except (Product.DoesNotExist, TypeError, ValueError):
            return Response({"detail": "Product not found."}, status=status.HTTP_404_NOT_FOUND)
        item, created = WishlistItem.objects.get_or_create(user=request.user, product_id=product_id)
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(WishlistSerializer(item).data, status=status_code)
