from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower
from django.utils.text import slugify
from pathlib import Path


def seller_upload_path(instance, filename):
    seller_name = slugify(instance.user.full_name.strip()) or slugify(instance.user.username) or "seller"
    document_name = Path(filename).stem.split("__", 1)[0]
    document_name = slugify(document_name) or "document"
    extension = Path(filename).suffix.lower()
    return f"seller/{document_name}/{seller_name}_{document_name}{extension}"


class User(AbstractUser):
    first_name = None
    last_name = None
    full_name = models.CharField(max_length=150, blank=True)
    mobile_number = models.CharField(max_length=20, unique=True, blank=True, null=True)
    ROLE_CHOICES = (
        ("admin", "Admin"),
        ("sales", "Sales Person"),
        ("user", "User"),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="user")

    class Meta:
        db_table = "shopsphere_users"
        constraints = [
            models.UniqueConstraint(Lower("username"), name="users_username_ci_uniq"),
            models.UniqueConstraint(
                Lower("email"),
                condition=~Q(email=""),
                name="users_email_ci_uniq",
            ),
        ]

    def get_full_name(self):
        return self.full_name.strip()

    def get_short_name(self):
        return self.full_name.strip()


class SellerProfile(models.Model):
    BUSINESS_TYPES = (("individual", "Individual"), ("registered", "Registered business"))
    APPROVAL_STATUSES = (("pending", "Pending approval"), ("approved", "Approved"), ("rejected", "Rejected"), ("revoked", "Revoked"))
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="seller_profile")
    store_name = models.CharField(max_length=120)
    business_type = models.CharField(max_length=16, choices=BUSINESS_TYPES, default="individual")
    business_address = models.TextField()
    tax_identifier = models.CharField(max_length=32, blank=True)
    pan_number = models.CharField(max_length=10, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pin_code = models.CharField(max_length=12, blank=True)
    country = models.CharField(max_length=100, default="India")
    business_description = models.TextField(blank=True)
    account_holder_name = models.CharField(max_length=150, blank=True)
    bank_name = models.CharField(max_length=120, blank=True)
    account_number = models.CharField(max_length=34, blank=True)
    ifsc_code = models.CharField(max_length=11, blank=True)
    upi_id = models.CharField(max_length=120, blank=True)
    profile_photo = models.FileField(upload_to=seller_upload_path, blank=True)
    pan_document = models.FileField(upload_to=seller_upload_path, blank=True)
    gst_certificate = models.FileField(upload_to=seller_upload_path, blank=True)
    address_proof = models.FileField(upload_to=seller_upload_path, blank=True)
    bank_proof = models.FileField(upload_to=seller_upload_path, blank=True)
    terms_accepted = models.BooleanField(default=False)
    privacy_accepted = models.BooleanField(default=False)
    approval_status = models.CharField(max_length=12, choices=APPROVAL_STATUSES, default="approved")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "shopsphere_seller_profiles"

    def __str__(self):
        return self.store_name
