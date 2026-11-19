import os
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

import razorpay
from django.db import transaction
from dotenv import load_dotenv
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.models import CartItem
from catalog.models import Product
from orders.models import Order, OrderItem
from orders.serializers import OrderSerializer

from .models import PaymentAttempt


def _razorpay_client():
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    key_id, key_secret = os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")
    if not key_id or not key_secret:
        return None
    return razorpay.Client(auth=(key_id, key_secret))


class CreateRazorpayOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        source = request.data.get("source", "cart")
        if source not in ("cart", "buy_now"):
            return Response({"source": "Choose cart or buy_now."}, status=status.HTTP_400_BAD_REQUEST)
        address = request.data.get("delivery_address")
        required_address = ("full_name", "phone", "address_line", "city", "state", "pincode")
        if not isinstance(address, dict) or any(not str(address.get(key, "")).strip() for key in required_address):
            return Response(
                {"delivery_address": "Enter your name, phone, full address, city, state and PIN code."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        address = {key: str(value).strip() for key, value in address.items() if key in (*required_address, "landmark", "delivery_note")}
        if len(re.sub(r"\D", "", address["phone"])) != 10:
            return Response({"delivery_address": "Enter a valid 10 digit mobile number."}, status=status.HTTP_400_BAD_REQUEST)
        if not re.fullmatch(r"\d{6}", address["pincode"]):
            return Response({"delivery_address": "Enter a valid 6 digit PIN code."}, status=status.HTTP_400_BAD_REQUEST)
        client = _razorpay_client()
        if client is None:
            return Response(
                {"detail": "Configure Razorpay test keys in the backend environment."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if source == "cart":
            cart = list(CartItem.objects.filter(user=request.user).select_related("product"))
            checkout_items = [(item.product, item.quantity) for item in cart]
        else:
            requested_items = request.data.get("items")
            if not isinstance(requested_items, list) or len(requested_items) != 1:
                return Response({"items": "Buy Now accepts exactly one product."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                product_id = int(requested_items[0].get("product"))
                quantity = int(requested_items[0].get("quantity", 1))
                product = Product.objects.get(pk=product_id, status="active")
            except (AttributeError, TypeError, ValueError, Product.DoesNotExist):
                return Response({"items": "The selected product could not be found."}, status=status.HTTP_404_NOT_FOUND)
            if quantity < 1:
                return Response({"items": "Quantity must be at least 1."}, status=status.HTTP_400_BAD_REQUEST)
            checkout_items = [(product, quantity)]
        if not checkout_items:
            return Response({"detail": "Cart is empty." if source == "cart" else "Choose a product first."}, status=status.HTTP_400_BAD_REQUEST)
        for product, quantity in checkout_items:
            if product.status != "active":
                return Response(
                    {"detail": f"{product.name} is no longer available. Remove it from your cart and try again."},
                    status=status.HTTP_409_CONFLICT,
                )
            if product.stock < quantity:
                return Response(
                    {"detail": f"Not enough stock for {product.name}. Update the quantity and try again."},
                    status=status.HTTP_409_CONFLICT,
                )
        total = sum((product.price * quantity for product, quantity in checkout_items), Decimal("0.00"))
        amount = int(total * 100)
        if amount < 100:
            return Response(
                {"detail": "The order total must be at least ₹1."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        snapshot = [
            {
                "product_id": product.id,
                "name": product.name,
                "seller_id": product.seller_id,
                "quantity": quantity,
                "unit_price": str(product.price),
            }
            for product, quantity in checkout_items
        ]
        try:
            remote_order = client.order.create(
                {"amount": amount, "currency": "INR", "receipt": f"user-{request.user.id}"}
            )
        except Exception:
            return Response(
                {"detail": "Razorpay could not create the checkout order. Try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        attempt = PaymentAttempt.objects.create(
            user=request.user,
            razorpay_order_id=remote_order["id"],
            amount=amount,
            items=snapshot,
            source=source,
            delivery_address=address,
        )
        return Response(
            {
                "razorpay_order_id": attempt.razorpay_order_id,
                "amount": amount,
                "currency": attempt.currency,
                "key_id": os.getenv("RAZORPAY_KEY_ID"),
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        client = _razorpay_client()
        if client is None:
            return Response(
                {"detail": "Payment verification is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        data = request.data
        order_id = data.get("razorpay_order_id")
        payment_id = data.get("razorpay_payment_id")
        signature = data.get("razorpay_signature")
        if not all((order_id, payment_id, signature)):
            return Response(
                {"detail": "Razorpay order, payment and signature are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            attempt = PaymentAttempt.objects.get(razorpay_order_id=order_id, user=request.user)
        except PaymentAttempt.DoesNotExist:
            return Response(
                {"detail": "Checkout order was not found for this account."},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            client.utility.verify_payment_signature(
                {
                    "razorpay_order_id": order_id,
                    "razorpay_payment_id": payment_id,
                    "razorpay_signature": signature,
                }
            )
            payment = client.payment.fetch(payment_id)
        except Exception:
            return Response(
                {"detail": "Payment signature verification failed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if (
            payment.get("order_id") != attempt.razorpay_order_id
            or payment.get("amount") != attempt.amount
            or payment.get("currency") != attempt.currency
        ):
            return Response(
                {"detail": "Payment details do not match the checkout order."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if payment.get("status") != "captured":
            return Response(
                {"detail": "Payment has not been captured. No order was created."},
                status=status.HTTP_409_CONFLICT,
            )
        with transaction.atomic():
            attempt = PaymentAttempt.objects.select_for_update().get(pk=attempt.pk)
            if attempt.processed:
                existing = Order.objects.filter(
                    user=request.user,
                    razorpay_order_id=order_id,
                    razorpay_payment_id=payment_id,
                ).first()
                if existing:
                    return Response(
                        {
                            "message": "Payment was already verified.",
                            "order": OrderSerializer(existing).data,
                        },
                        status=status.HTTP_200_OK,
                    )
                return Response(
                    {"detail": "This checkout order has already been processed."},
                    status=status.HTTP_409_CONFLICT,
                )
            if (
                Order.objects.filter(razorpay_order_id=order_id).exists()
                or Order.objects.filter(razorpay_payment_id=payment_id).exists()
            ):
                return Response(
                    {"detail": "This payment has already been processed."},
                    status=status.HTTP_409_CONFLICT,
                )
            try:
                locked_products = {}
                for entry in attempt.items:
                    product = Product.objects.select_for_update().get(pk=entry["product_id"])
                    if product.stock < entry["quantity"]:
                        return Response(
                            {"detail": f"Stock changed while payment was in progress for {product.name}. Contact support with your payment ID."},
                            status=status.HTTP_409_CONFLICT,
                        )
                    locked_products[product.id] = product
                total = (Decimal(attempt.amount) / Decimal(100)).quantize(Decimal("0.01"))
                order = Order.objects.create(
                    user=request.user,
                    total_amount=total,
                    razorpay_order_id=order_id,
                    razorpay_payment_id=payment_id,
                    delivery_address=attempt.delivery_address,
                    payment_method="razorpay",
                )
                for entry in attempt.items:
                    product = locked_products[entry["product_id"]]
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        seller_id=entry["seller_id"],
                        quantity=entry["quantity"],
                        unit_price=Decimal(entry["unit_price"]),
                    )
                    product.stock -= entry["quantity"]
                    if product.stock == 0:
                        product.status = "out_of_stock"
                        product.save(update_fields=["stock", "status", "updated_at"])
                    else:
                        product.save(update_fields=["stock", "updated_at"])
                    if attempt.source == "cart":
                        cart_item = CartItem.objects.filter(
                            user=request.user,
                            product_id=entry["product_id"],
                        ).first()
                        if cart_item and cart_item.quantity <= entry["quantity"]:
                            cart_item.delete()
                        elif cart_item:
                            cart_item.quantity -= entry["quantity"]
                            cart_item.save(update_fields=["quantity"])
                attempt.processed = True
                attempt.save(update_fields=["processed"])
            except (Product.DoesNotExist, InvalidOperation, KeyError, TypeError, ValueError):
                return Response(
                    {
                        "detail": (
                            "The paid checkout could not be matched to its product snapshot. "
                            "Contact support with your payment ID."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )
        return Response(
            {"message": "Payment verified and order created.", "order": OrderSerializer(order).data},
            status=status.HTTP_201_CREATED,
        )
