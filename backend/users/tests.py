from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from .models import SellerProfile
from .serializers import SellerRegisterSerializer


User = get_user_model()


class UserRegistrationTests(APITestCase):
    def test_registration_creates_customer_and_returns_session_tokens(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "new-customer",
                "email": "customer@gmail.com",
                "mobile_number": "9876543210",
                "password": "StrongPass-92831!",
                "confirm_password": "StrongPass-92831!",
                "full_name": "New Customer",
                "role": "admin",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["user"]["role"], "user")
        self.assertEqual(response.data["user"]["full_name"], "New Customer")
        self.assertEqual(response.data["user"]["mobile_number"], "9876543210")
        self.assertTrue(response.data["access"])
        self.assertTrue(response.data["refresh"])
        user = User.objects.get(username="new-customer")
        self.assertTrue(user.check_password("StrongPass-92831!"))

    def test_registration_rejects_password_shorter_than_eight_characters(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "simple-password",
                "email": "simple@gmail.com",
                "mobile_number": "9876543210",
                "password": "123",
                "confirm_password": "123",
                "full_name": "Simple Password",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)

    def test_registration_rejects_passwords_outside_policy(self):
        for index, password in enumerate(("12", "a" * 129)):
            response = self.client.post(
                "/api/auth/register/",
                {
                    "username": f"weak-password-{index}",
                    "email": f"weak-{index}@gmail.com",
                    "mobile_number": f"98765432{index}0",
                    "password": password,
                    "confirm_password": password,
                    "full_name": "Weak Password",
                },
                format="json",
            )
            self.assertEqual(response.status_code, 400)

    def test_registration_rejects_non_gmail_addresses(self):
        payload = {
            "username": "gmail-customer",
            "email": "customer@g.co",
            "mobile_number": "9876543210",
            "password": "StrongPass-92831!",
            "confirm_password": "DifferentPass-92831!",
            "full_name": "Gmail Customer",
        }

        response = self.client.post("/api/auth/register/", payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_registration_requires_matching_passwords(self):
        payload = {
            "username": "mismatch-customer",
            "email": "customer@gmail.com",
            "mobile_number": "9876543210",
            "password": "StrongPass-92831!",
            "confirm_password": "DifferentPass-92831!",
            "full_name": "Mismatch Customer",
        }
        response = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("confirm_password", response.data)

    def test_registration_rejects_duplicate_username_email_and_mobile_case_insensitively(self):
        User.objects.create_user(
            username="existing-user",
            email="existing@gmail.com",
            password="StrongPass-92831!",
            full_name="Existing User",
            mobile_number="+919876543210",
        )
        base_payload = {
            "username": "new-user",
            "email": "new@gmail.com",
            "mobile_number": "9876543211",
            "password": "StrongPass-92831!",
            "confirm_password": "StrongPass-92831!",
            "full_name": "New User",
        }
        for field, value in (
            ("username", "EXISTING-USER"),
            ("email", "EXISTING@gmail.com"),
            ("mobile_number", "9876543210"),
        ):
            payload = {**base_payload, field: value}
            response = self.client.post("/api/auth/register/", payload, format="json")
            self.assertEqual(response.status_code, 400, field)
            self.assertIn(field, response.data)

    def test_registration_requires_exactly_ten_mobile_digits(self):
        payload = {
            "username": "bad-mobile",
            "email": "badmobile@gmail.com",
            "mobile_number": "+919876543210",
            "password": "StrongPass-92831!",
            "confirm_password": "StrongPass-92831!",
            "full_name": "Bad Mobile",
        }
        response = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("mobile_number", response.data)

    def test_registered_customer_can_log_in(self):
        User.objects.create_user(
            username="returning-customer",
            email="returning@example.com",
            password="123",
            full_name="Returning Customer",
            mobile_number="+919876543210",
        )

        for identifier in (
            "returning-customer",
            "RETURNING@example.com",
            "+91 98765 43210",
            "returning customer",
        ):
            response = self.client.post(
                "/api/auth/login/",
                {"identifier": identifier, "password": "123"},
                format="json",
            )
            self.assertEqual(response.status_code, 200, identifier)
            self.assertEqual(response.data["user"]["username"], "returning-customer")
            self.assertTrue(response.data["access"])

    def test_duplicate_full_name_login_requests_unique_identifier(self):
        User.objects.create_user(username="name-one", password="123", full_name="Same Name")
        User.objects.create_user(username="name-two", password="123", full_name="Same Name")

        response = self.client.post(
            "/api/auth/login/",
            {"identifier": "Same Name", "password": "123"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("username, email, or mobile number", response.data["detail"])


class SellerRegistrationValidationTests(APITestCase):
    def setUp(self):
        self.payload = {
            "full_name": "Seller Person",
            "username": "seller.person",
            "email": "seller@gmail.com",
            "mobile_number": "9876543210",
            "password": "StrongPass-92831!",
            "confirm_password": "StrongPass-92831!",
            "store_name": "Seller Store",
            "business_type": "individual",
            "business_address": "10 Market Road",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pin_code": "400001",
            "country": "India",
            "account_holder_name": "Seller Person",
            "bank_name": "Example Bank",
            "account_number": "1234567890",
            "confirm_account_number": "1234567890",
            "ifsc_code": "ABCD0123456",
            "address_proof": SimpleUploadedFile("address.pdf", b"address", content_type="application/pdf"),
            "bank_proof": SimpleUploadedFile("bank.pdf", b"bank", content_type="application/pdf"),
            "terms_accepted": True,
            "privacy_accepted": True,
        }

    def test_seller_registration_accepts_required_account_fields(self):
        serializer = SellerRegisterSerializer(data=self.payload)

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["username"], "seller.person")
        self.assertEqual(serializer.validated_data["email"], "seller@gmail.com")
        self.assertEqual(serializer.validated_data["mobile_number"], "9876543210")

    def test_seller_registration_rejects_non_gmail_and_non_ten_digit_mobile(self):
        for field, value in (("email", "seller@g.co"), ("mobile_number", "+919876543210")):
            serializer = SellerRegisterSerializer(data={**self.payload, field: value})
            self.assertFalse(serializer.is_valid(), field)
            self.assertIn(field, serializer.errors)


class SellerSettingsTests(APITestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            username="settings-seller",
            email="seller@example.com",
            password="test-pass",
            full_name="Original Seller",
            role="sales",
        )
        self.profile = SellerProfile.objects.create(
            user=self.seller,
            store_name="Original Store",
            business_address="Seller address",
        )
        self.client.force_authenticate(self.seller)

    def test_seller_settings_cannot_change_personal_information(self):
        response = self.client.patch(
            "/api/auth/me/",
            {"full_name": "Changed Name", "email": "changed@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.seller.refresh_from_db()
        self.assertEqual(self.seller.full_name, "Original Seller")
        self.assertEqual(self.seller.email, "seller@example.com")

    def test_seller_cannot_change_store_name(self):
        response = self.client.patch(
            "/api/auth/me/",
            {"store_name": "Updated Store"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.profile.refresh_from_db()
        self.seller.refresh_from_db()
        self.assertEqual(self.profile.store_name, "Original Store")
        self.assertEqual(self.seller.full_name, "Original Seller")
        self.assertEqual(self.seller.email, "seller@example.com")
