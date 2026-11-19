from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.validators import UnicodeUsernameValidator
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.db import transaction

from .models import SellerProfile, User
import re


class SellerProfileSerializer(serializers.ModelSerializer):
    documents = serializers.SerializerMethodField()

    class Meta:
        model = SellerProfile
        fields = ("store_name", "business_type", "business_address", "city", "state", "pin_code", "country",
                  "business_description", "tax_identifier", "pan_number", "approval_status", "documents", "created_at")

    def get_documents(self, profile):
        return {
            "profile_photo": bool(profile.profile_photo),
            "pan_document": bool(profile.pan_document),
            "gst_certificate": bool(profile.gst_certificate),
            "address_proof": bool(profile.address_proof),
            "bank_proof": bool(profile.bank_proof),
        }


class UserSerializer(serializers.ModelSerializer):
    seller_profile = SellerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "mobile_number", "full_name", "role", "date_joined", "seller_profile")
        read_only_fields = fields


class AdminSellerProfileSerializer(SellerProfileSerializer):
    class Meta(SellerProfileSerializer.Meta):
        fields = SellerProfileSerializer.Meta.fields + (
            "account_holder_name", "bank_name", "account_number", "ifsc_code", "upi_id",
            "terms_accepted", "privacy_accepted",
        )


class AdminUserSerializer(UserSerializer):
    seller_profile = AdminSellerProfileSerializer(read_only=True)

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ("is_active",)
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        max_length=150,
        validators=[
            UnicodeUsernameValidator(),
            UniqueValidator(queryset=User.objects.all(), lookup="iexact"),
        ],
    )
    email = serializers.EmailField(validators=[UniqueValidator(queryset=User.objects.all(), lookup="iexact")])
    full_name = serializers.CharField(max_length=150, trim_whitespace=True)
    mobile_number = serializers.CharField(min_length=10, max_length=10)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    confirm_password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    account_type = serializers.ChoiceField(choices=("customer", "seller"), default="customer", write_only=True)
    store_name = serializers.CharField(max_length=120, required=False, allow_blank=True, write_only=True)
    business_type = serializers.ChoiceField(choices=SellerProfile.BUSINESS_TYPES, required=False, write_only=True)
    business_address = serializers.CharField(required=False, allow_blank=True, write_only=True)
    tax_identifier = serializers.CharField(max_length=32, required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ("full_name", "username", "email", "mobile_number", "password", "confirm_password", "account_type", "store_name", "business_type", "business_address", "tax_identifier")

    def validate_email(self, value):
        if value.rsplit("@", 1)[-1].lower() != "gmail.com":
            raise serializers.ValidationError("Use a valid Gmail address ending in @gmail.com.")
        return value.lower()

    def validate_mobile_number(self, value):
        if not re.fullmatch(r"[0-9]{10}", value):
            raise serializers.ValidationError("Enter a 10-digit mobile number.")
        existing_formats = (value, f"+91{value}", f"91{value}")
        if User.objects.filter(mobile_number__in=existing_formats).exists():
            raise serializers.ValidationError("An account with this mobile number already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        if attrs.get("account_type") == "seller":
            for field, label in (("store_name", "Store name"), ("business_address", "Business or pickup address")):
                if not attrs.get(field, "").strip():
                    raise serializers.ValidationError({field: f"{label} is required for seller registration."})
        candidate = User(**{key: value for key, value in attrs.items() if key in {"username", "email", "mobile_number", "full_name"}})
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        account_type = validated_data.pop("account_type", "customer")
        seller_data = {key: validated_data.pop(key, "") for key in ("store_name", "business_type", "business_address", "tax_identifier")}
        seller_data["business_type"] = seller_data["business_type"] or "individual"
        user = User(**validated_data, role="sales" if account_type == "seller" else "user")
        user.set_password(password)
        user.save()
        if account_type == "seller":
            SellerProfile.objects.create(user=user, **seller_data)
        return user


class SellerRegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        max_length=150,
        write_only=True,
        validators=[
            UnicodeUsernameValidator(),
            UniqueValidator(queryset=User.objects.all(), lookup="iexact"),
        ],
    )
    email = serializers.EmailField(validators=[UniqueValidator(queryset=User.objects.all(), lookup="iexact")])
    full_name = serializers.CharField(max_length=150, trim_whitespace=True)
    mobile_number = serializers.CharField(min_length=10, max_length=10)
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    confirm_password = serializers.CharField(write_only=True, min_length=8, max_length=128)
    confirm_account_number = serializers.CharField(write_only=True)
    store_name = serializers.CharField(max_length=120)
    business_type = serializers.ChoiceField(choices=SellerProfile.BUSINESS_TYPES)
    business_address = serializers.CharField()
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100)
    pin_code = serializers.CharField(max_length=12)
    country = serializers.CharField(max_length=100, required=False, default="India")
    business_description = serializers.CharField(required=False, allow_blank=True)
    tax_identifier = serializers.CharField(max_length=32, required=False, allow_blank=True)
    pan_number = serializers.CharField(max_length=10, required=False, allow_blank=True)
    account_holder_name = serializers.CharField(max_length=150)
    bank_name = serializers.CharField(max_length=120)
    account_number = serializers.CharField(max_length=34)
    ifsc_code = serializers.CharField(max_length=11)
    upi_id = serializers.CharField(max_length=120, required=False, allow_blank=True)
    profile_photo = serializers.FileField(required=False, allow_empty_file=False)
    pan_document = serializers.FileField(required=False, allow_empty_file=False)
    gst_certificate = serializers.FileField(required=False, allow_empty_file=False)
    address_proof = serializers.FileField()
    bank_proof = serializers.FileField()
    terms_accepted = serializers.BooleanField()
    privacy_accepted = serializers.BooleanField()

    class Meta:
        model = User
        fields = (
            "full_name", "username", "email", "mobile_number", "password", "confirm_password",
            "store_name", "business_type", "business_address", "city", "state", "pin_code", "country",
            "business_description", "tax_identifier", "pan_number", "account_holder_name", "bank_name",
            "account_number", "confirm_account_number", "ifsc_code", "upi_id", "profile_photo",
            "pan_document", "gst_certificate", "address_proof", "bank_proof", "terms_accepted", "privacy_accepted",
        )

    def validate_email(self, value):
        if value.rsplit("@", 1)[-1].lower() != "gmail.com":
            raise serializers.ValidationError("Use a valid Gmail address ending in @gmail.com.")
        return value.lower()

    def validate_mobile_number(self, value):
        if not re.fullmatch(r"[0-9]{10}", value):
            raise serializers.ValidationError("Enter a 10-digit mobile number.")
        existing_formats = (value, f"+91{value}", f"91{value}")
        if User.objects.filter(mobile_number__in=existing_formats).exists():
            raise serializers.ValidationError("An account with this mobile number already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        if attrs["account_number"] != attrs.pop("confirm_account_number"):
            raise serializers.ValidationError({"confirm_account_number": "Account numbers do not match."})
        if not attrs.pop("terms_accepted"):
            raise serializers.ValidationError({"terms_accepted": "Accept the terms and conditions to continue."})
        if not attrs.pop("privacy_accepted"):
            raise serializers.ValidationError({"privacy_accepted": "Accept the privacy policy to continue."})
        attrs["terms_accepted"] = True
        attrs["privacy_accepted"] = True
        if attrs.get("tax_identifier") and not attrs.get("gst_certificate"):
            raise serializers.ValidationError({"gst_certificate": "Upload the GST certificate when providing a GST number."})
        if attrs.get("pan_number") and not attrs.get("pan_document"):
            raise serializers.ValidationError({"pan_document": "Upload the PAN document when providing a PAN number."})
        if attrs.get("pan_number") and not re.fullmatch(r"[A-Z]{5}[0-9]{4}[A-Z]", attrs["pan_number"].upper()):
            raise serializers.ValidationError({"pan_number": "Enter a valid PAN number."})
        if attrs.get("pan_number"):
            attrs["pan_number"] = attrs["pan_number"].upper()
        if attrs.get("country", "India").strip().lower() == "india" and not re.fullmatch(r"[0-9]{6}", attrs["pin_code"]):
            raise serializers.ValidationError({"pin_code": "Enter a valid 6-digit PIN code for India."})
        if not re.fullmatch(r"[A-Z]{4}0[A-Z0-9]{6}", attrs["ifsc_code"].upper()):
            raise serializers.ValidationError({"ifsc_code": "Enter a valid 11-character IFSC code."})
        attrs["ifsc_code"] = attrs["ifsc_code"].upper()
        candidate = User(full_name=attrs["full_name"], email=attrs["email"])
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)})
        for field in ("profile_photo", "pan_document", "gst_certificate", "address_proof", "bank_proof"):
            upload = attrs.get(field)
            if upload and upload.size > 10 * 1024 * 1024:
                raise serializers.ValidationError({field: "Each upload must be 10 MB or smaller."})
            if upload and upload.content_type not in ("application/pdf", "image/jpeg", "image/png", "image/webp"):
                raise serializers.ValidationError({field: "Upload a PDF, JPG, PNG or WebP file."})
            if field == "profile_photo" and upload and not upload.content_type.startswith("image/"):
                raise serializers.ValidationError({field: "Profile photos must be JPG, PNG or WebP images."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        username = validated_data.pop("username")
        profile_fields = {field.name for field in SellerProfile._meta.fields} - {"id", "user", "created_at"}
        profile_data = {key: validated_data.pop(key) for key in list(validated_data) if key in profile_fields}
        profile_data["approval_status"] = "pending"
        user = User(**validated_data, username=username, role="sales")
        user.set_password(password)
        user.save()
        SellerProfile.objects.create(user=user, **profile_data)
        return user
