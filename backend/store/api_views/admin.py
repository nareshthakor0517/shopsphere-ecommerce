from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F, Sum
from django.http import FileResponse
from pathlib import Path
from decimal import Decimal, InvalidOperation
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from users.serializers import AdminUserSerializer
from orders.models import OrderItem
from payments.models import SellerPayout
from payments.models import PaymentAttempt

User = get_user_model()


class IsRoleAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "admin")


class AdminUserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = AdminUserSerializer
    permission_classes = [IsRoleAdmin]

    @action(detail=True, methods=["patch"])
    def set_role(self, request, pk=None):
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response({"detail": "You cannot change your own administrator role."}, status=status.HTTP_400_BAD_REQUEST)
        role = request.data.get("role")
        if role not in ("admin", "sales", "user"):
            return Response({"detail": "Invalid role."}, status=status.HTTP_400_BAD_REQUEST)
        user.role = role
        user.save(update_fields=["role"])
        return Response(AdminUserSerializer(user).data)

    @action(detail=True, methods=["patch"], url_path="set-active")
    def set_active(self, request, pk=None):
        user = self.get_object()
        is_active = request.data.get("is_active")
        if not isinstance(is_active, bool):
            return Response({"detail": "is_active must be true or false."}, status=status.HTTP_400_BAD_REQUEST)
        if user.pk == request.user.pk and not is_active:
            return Response({"detail": "You cannot deactivate your own account."}, status=status.HTTP_400_BAD_REQUEST)
        if user.role == "admin" and not is_active and not User.objects.filter(role="admin", is_active=True).exclude(pk=user.pk).exists():
            return Response({"detail": "At least one active administrator must remain."}, status=status.HTTP_409_CONFLICT)
        user.is_active = is_active
        user.save(update_fields=["is_active"])
        return Response(AdminUserSerializer(user).data)

    @action(detail=True, methods=["patch"], url_path="seller-review")
    def seller_review(self, request, pk=None):
        user = self.get_object()
        if user.role != "sales" or not hasattr(user, "seller_profile"):
            return Response({"detail": "This account has no seller application."}, status=status.HTTP_400_BAD_REQUEST)
        approval_status = request.data.get("approval_status")
        if approval_status not in ("approved", "rejected", "pending", "revoked"):
            return Response({"detail": "Choose approved, rejected, pending, or revoked."}, status=status.HTTP_400_BAD_REQUEST)
        user.seller_profile.approval_status = approval_status
        user.seller_profile.save(update_fields=["approval_status"])
        if approval_status == "revoked":
            user.is_active = False
            user.save(update_fields=["is_active"])
        elif approval_status == "approved" and not user.is_active:
            user.is_active = True
            user.save(update_fields=["is_active"])
        user.refresh_from_db()
        return Response(AdminUserSerializer(user).data)

    @action(detail=True, methods=["delete"], url_path="delete-seller")
    def delete_seller(self, request, pk=None):
        user = self.get_object()
        if user.role != "sales" or not hasattr(user, "seller_profile"):
            return Response({"detail": "This account is not a seller."}, status=status.HTTP_400_BAD_REQUEST)
        has_order_history = OrderItem.objects.filter(seller=user).exists() or user.orders.exists()
        has_payout_history = SellerPayout.objects.filter(seller=user).exists()
        has_payment_history = PaymentAttempt.objects.filter(user=user).exists()
        if has_order_history or has_payout_history or has_payment_history:
            return Response(
                {"detail": "This seller has order or payment history and cannot be deleted. Revoke seller access to keep the records."},
                status=status.HTTP_409_CONFLICT,
            )
        seller_id = user.pk
        user.delete()
        return Response({"deleted": True, "seller_id": seller_id}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="seller-document")
    def seller_document(self, request, pk=None):
        user = self.get_object()
        if user.role != "sales" or not hasattr(user, "seller_profile"):
            return Response({"detail": "This account has no seller application."}, status=status.HTTP_404_NOT_FOUND)
        field = request.query_params.get("field", "")
        if field not in {"profile_photo", "pan_document", "gst_certificate", "address_proof", "bank_proof"}:
            return Response({"detail": "Unknown seller document."}, status=status.HTTP_400_BAD_REQUEST)
        document = getattr(user.seller_profile, field)
        if not document:
            return Response({"detail": "This document was not uploaded."}, status=status.HTTP_404_NOT_FOUND)
        return FileResponse(document.open("rb"), as_attachment=True, filename=Path(document.name).name)


def _seller_earnings(seller_id):
    return OrderItem.objects.filter(
        seller_id=seller_id,
        order__status__in=("paid", "processing", "shipped"),
    ).aggregate(total=Sum(F("unit_price") * F("quantity")))["total"] or Decimal("0.00")


def _seller_payout_summary(seller):
    profile = seller.seller_profile
    earned = _seller_earnings(seller.pk)
    totals = SellerPayout.objects.filter(seller=seller).values("status").annotate(total=Sum("amount"))
    amounts = {row["status"]: row["total"] or Decimal("0.00") for row in totals}
    paid = amounts.get("paid", Decimal("0.00"))
    pending = amounts.get("pending", Decimal("0.00"))
    account = profile.account_number or ""
    return {
        "seller_id": seller.pk,
        "seller_name": profile.store_name or seller.full_name or seller.username,
        "seller_email": seller.email,
        "approval_status": profile.approval_status,
        "is_active": seller.is_active,
        "bank_name": profile.bank_name,
        "account_holder_name": profile.account_holder_name,
        "account_last4": account[-4:] if account else "",
        "ifsc_code": profile.ifsc_code,
        "upi_id": profile.upi_id,
        "earned": earned,
        "paid": paid,
        "pending": pending,
        "available": max(earned - paid - pending, Decimal("0.00")),
        "payout_ready": bool(profile.upi_id or (profile.account_holder_name and profile.bank_name and account and profile.ifsc_code)),
    }


def _payout_data(payout):
    seller = payout.seller
    profile = getattr(seller, "seller_profile", None)
    account = profile.account_number or "" if profile else ""
    return {
        "id": payout.pk,
        "seller_id": seller.pk,
        "seller_name": profile.store_name if profile else seller.full_name or seller.username,
        "seller_email": seller.email,
        "amount": payout.amount,
        "status": payout.status,
        "reference": payout.reference,
        "bank_name": profile.bank_name if profile else "",
        "account_last4": account[-4:] if account else "",
        "upi_id": profile.upi_id if profile else "",
        "created_at": payout.created_at,
        "paid_at": payout.paid_at,
    }


class AdminPayoutView(APIView):
    permission_classes = [IsRoleAdmin]

    def get(self, request, payout_id=None):
        if payout_id is not None:
            payout = SellerPayout.objects.select_related("seller", "seller__seller_profile").filter(pk=payout_id).first()
            if not payout:
                return Response({"detail": "Payout not found."}, status=status.HTTP_404_NOT_FOUND)
            return Response(_payout_data(payout))
        sellers = User.objects.filter(role="sales", seller_profile__isnull=False).select_related("seller_profile").order_by("full_name", "username")
        payouts = SellerPayout.objects.select_related("seller", "seller__seller_profile").all()
        return Response({
            "sellers": [_seller_payout_summary(seller) for seller in sellers],
            "payouts": [_payout_data(payout) for payout in payouts],
        })

    def post(self, request, payout_id=None):
        if payout_id is not None:
            return Response({"detail": "Invalid payout action."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
        try:
            seller_id = int(request.data.get("seller_id"))
            amount = Decimal(str(request.data.get("amount", "")))
        except (TypeError, ValueError, InvalidOperation):
            return Response({"detail": "Choose a seller and enter a valid payout amount."}, status=status.HTTP_400_BAD_REQUEST)
        if not amount.is_finite() or amount <= 0 or amount.as_tuple().exponent < -2:
            return Response({"detail": "Payout amount must be greater than zero with at most two decimal places."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic():
                seller = User.objects.select_for_update().select_related("seller_profile").get(pk=seller_id, role="sales")
                profile = seller.seller_profile
                if not seller.is_active or profile.approval_status != "approved":
                    return Response({"detail": "Only active, approved sellers can receive payouts."}, status=status.HTTP_409_CONFLICT)
                ready = bool(profile.upi_id or (profile.account_holder_name and profile.bank_name and profile.account_number and profile.ifsc_code))
                if not ready:
                    return Response({"detail": "Seller must provide complete bank or UPI payout details first."}, status=status.HTTP_409_CONFLICT)
                earned = _seller_earnings(seller.pk)
                paid = SellerPayout.objects.filter(seller=seller, status="paid").aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
                pending = SellerPayout.objects.filter(seller=seller, status="pending").aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
                available = earned - paid - pending
                if amount > available:
                    return Response({"detail": f"Payout exceeds the available balance of ₹{max(available, Decimal('0.00'))}."}, status=status.HTTP_400_BAD_REQUEST)
                payout = SellerPayout.objects.create(seller=seller, amount=amount, created_by=request.user)
        except User.DoesNotExist:
            return Response({"detail": "Approved seller not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_payout_data(SellerPayout.objects.select_related("seller", "seller__seller_profile").get(pk=payout.pk)), status=status.HTTP_201_CREATED)

    def patch(self, request, payout_id=None):
        if payout_id is None:
            return Response({"detail": "Payout ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        next_status = request.data.get("status")
        if next_status not in ("paid", "cancelled"):
            return Response({"detail": "Choose paid or cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        reference = str(request.data.get("reference", "")).strip()
        if next_status == "paid" and not reference:
            return Response({"detail": "Enter the bank or UPI transfer reference before marking this payout paid."}, status=status.HTTP_400_BAD_REQUEST)
        if len(reference) > 120:
            return Response({"detail": "Transfer reference must be 120 characters or fewer."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            payout = SellerPayout.objects.select_for_update().select_related("seller").filter(pk=payout_id).first()
            if not payout:
                return Response({"detail": "Payout not found."}, status=status.HTTP_404_NOT_FOUND)
            User.objects.select_for_update().get(pk=payout.seller_id)
            if payout.status != "pending":
                return Response({"detail": "Only pending payouts can be updated."}, status=status.HTTP_409_CONFLICT)
            payout.status = next_status
            if next_status == "paid":
                payout.reference = reference
                payout.paid_at = timezone.now()
                payout.save(update_fields=["status", "reference", "paid_at"])
            else:
                payout.save(update_fields=["status"])
        payout = SellerPayout.objects.select_related("seller", "seller__seller_profile").get(pk=payout_id)
        return Response(_payout_data(payout))
