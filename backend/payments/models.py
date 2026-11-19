from django.conf import settings
from django.db import models
from django.db.models import Q


class PaymentAttempt(models.Model):
    """Server-owned snapshot for a Razorpay checkout in progress."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="payment_attempts",
    )
    razorpay_order_id = models.CharField(max_length=100, unique=True)
    amount = models.PositiveIntegerField(help_text="Expected amount in paise")
    currency = models.CharField(max_length=3, default="INR")
    items = models.JSONField()
    source = models.CharField(max_length=20, default="cart")
    delivery_address = models.JSONField(default=dict, blank=True)
    processed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "shopsphere_payment_attempts"

    def __str__(self):
        return f"{self.razorpay_order_id} ({self.user_id})"


class SellerPayout(models.Model):
    STATUS_CHOICES = (("pending", "Pending"), ("paid", "Paid"), ("cancelled", "Cancelled"))

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="seller_payouts",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="pending")
    reference = models.CharField(max_length=120, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_seller_payouts",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "shopsphere_seller_payouts"
        ordering = ("-created_at",)
        constraints = [models.CheckConstraint(condition=Q(amount__gt=0), name="seller_payout_amount_positive")]

    def __str__(self):
        return f"Payout {self.pk}: {self.seller_id} {self.amount} INR ({self.status})"
