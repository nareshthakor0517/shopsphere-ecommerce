from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Order, OrderItem
from .serializers import OrderSerializer


class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.prefetch_related("items").order_by("-created_at")
        if user.role == "admin":
            return queryset
        if user.role == "sales":
            return queryset.filter(items__seller=user).distinct()
        return queryset.filter(user=user)


class AdminOrderStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    STATUS_ORDER = {"paid": 0, "processing": 1, "shipped": 2}

    def patch(self, request, order_id):
        if request.user.role not in ("admin", "sales"):
            return Response({"detail": "Only administrators and the order's seller can update order status."}, status=status.HTTP_403_FORBIDDEN)
        next_status = request.data.get("status")
        if next_status not in self.STATUS_ORDER:
            return Response({"detail": "Choose paid, processing, or shipped."}, status=status.HTTP_400_BAD_REQUEST)
        order = Order.objects.prefetch_related("items").filter(pk=order_id).first()
        if not order:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        if request.user.role == "sales" and not OrderItem.objects.filter(order=order, seller=request.user).exists():
            return Response({"detail": "You can only update orders that contain your products."}, status=status.HTTP_403_FORBIDDEN)
        if request.user.role == "sales":
            seller_profile = getattr(request.user, "seller_profile", None)
            if not seller_profile or seller_profile.approval_status != "approved":
                return Response({"detail": "Only approved sellers can update orders."}, status=status.HTTP_403_FORBIDDEN)
        if order.status == "cancelled":
            return Response({"detail": "Cancelled orders cannot be changed without processing a refund."}, status=status.HTTP_409_CONFLICT)
        current_step = self.STATUS_ORDER.get(order.status)
        if current_step is None or self.STATUS_ORDER[next_status] != current_step + 1:
            return Response({"detail": "Order status must move one step at a time from pending to processing to shipped."}, status=status.HTTP_409_CONFLICT)
        order.status = next_status
        order.save(update_fields=["status"])
        return Response(OrderSerializer(order).data)
