from django.db.models import Sum
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.models import CartItem, WishlistItem
from catalog.models import Product
from orders.models import Order
from users.models import User


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == "admin":
            sales = Order.objects.aggregate(value=Sum("total_amount"))["value"] or 0
            return Response({"total_products": Product.objects.exclude(status="draft").count(), "total_users": User.objects.count(),
                             "total_orders": Order.objects.count(), "total_sales": sales})
        if user.role == "sales":
            return Response({"my_products": Product.objects.filter(seller=user).exclude(status="draft").count(),
                             "orders_containing_my_products": Order.objects.filter(items__seller=user).distinct().count()})
        return Response({"my_orders": Order.objects.filter(user=user).count(),
                         "cart_items": CartItem.objects.filter(user=user).count(),
                         "wishlist_items": WishlistItem.objects.filter(user=user).count()})
