from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from catalog.models import Product, SellerProductDraft
User = get_user_model()

class ProductRoleTests(TestCase):
    def setUp(self):
        self.seller = User.objects.create_user(username="seller", password="StrongPass123", role="sales")
        self.other = User.objects.create_user(username="other", password="StrongPass123", role="sales")
        self.product = Product.objects.create(seller=self.seller, name="Test item", category="Tech", price=10)
        self.client = APIClient()
    def test_sales_cannot_edit_other_seller_product(self):
        self.client.force_authenticate(self.other)
        response = self.client.patch(f"/api/products/{self.product.id}/", {"name":"Hacked"}, format="json")
        self.assertEqual(response.status_code, 403)
    def test_public_product_list(self):
        response = self.client.get("/api/products/")
        self.assertEqual(response.status_code, 200)


class SellerCategoryTests(TestCase):
    def setUp(self):
        self.seller = User.objects.create_user(username="category-seller", password="test-pass", role="sales")
        self.other_seller = User.objects.create_user(username="other-category-seller", password="test-pass", role="sales")
        self.client = APIClient()
        self.client.force_authenticate(self.seller)

    def test_categories_are_persisted_and_scoped_to_the_seller(self):
        created = self.client.post("/api/seller/categories/", {"name": "Mobiles"}, format="json")
        self.assertEqual(created.status_code, 201)

        duplicate = self.client.post("/api/seller/categories/", {"name": "Mobiles"}, format="json")
        self.assertEqual(duplicate.status_code, 200)
        self.assertEqual(duplicate.data["id"], created.data["id"])

        listed = self.client.get("/api/seller/categories/")
        self.assertEqual([category["name"] for category in listed.data], ["Mobiles"])

        self.client.force_authenticate(self.other_seller)
        other_seller_categories = self.client.get("/api/seller/categories/")
        self.assertEqual(other_seller_categories.data, [])

    def test_category_in_use_by_a_product_cannot_be_deleted(self):
        category = self.client.post("/api/seller/categories/", {"name": "Mobiles"}, format="json").data
        Product.objects.create(
            seller=self.seller,
            name="Test phone",
            category="Mobiles",
            subcategory="Smartphones",
            brand="Example",
            price=10,
        )

        response = self.client.delete(f"/api/seller/categories/{category['id']}/")

        self.assertEqual(response.status_code, 409)


class SellerProductDraftTests(TestCase):
    def setUp(self):
        self.seller = User.objects.create_user(username="draft-seller", password="test-pass", role="sales")
        self.other_seller = User.objects.create_user(username="other-draft-seller", password="test-pass", role="sales")
        self.client = APIClient()
        self.client.force_authenticate(self.seller)

    def product_data(self, **overrides):
        return {
            "name": "Draft phone",
            "sku": "DRAFT-PHONE-1",
            "category": "Mobiles",
            "subcategory": "Smartphones",
            "brand": "Example",
            "description": "A test product description.",
            "price": "100.00",
            "mrp": "120.00",
            "stock": 5,
            "image_url": "https://example.com/product.webp",
            "image_urls": ["https://example.com/product.webp"],
            "status": "active",
            **overrides,
        }

    def test_saving_a_draft_does_not_create_or_count_a_product(self):
        response = self.client.post(
            "/api/seller/drafts/",
            {"data": {"name": "Unfinished product"}},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.data["product_id"])
        self.assertEqual(Product.objects.count(), 0)
        self.assertEqual(SellerProductDraft.objects.filter(seller=self.seller).count(), 1)

        dashboard = self.client.get("/api/dashboard/")
        self.assertEqual(dashboard.data["my_products"], 0)

        listed = self.client.get("/api/seller/drafts/")
        self.assertEqual(len(listed.data), 1)
        self.assertEqual(listed.data[0]["id"], response.data["id"])

    def test_product_endpoint_rejects_drafts(self):
        response = self.client.post(
            "/api/products/",
            {"name": "Unpublished product", "status": "draft"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Product.objects.count(), 0)

    def test_existing_draft_can_be_saved_repeatedly(self):
        created = self.client.post(
            "/api/seller/drafts/",
            {"data": {"name": "First draft version"}},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        draft_id = created.data["id"]

        first_update = self.client.patch(
            f"/api/seller/drafts/{draft_id}/",
            {"data": {"name": "Second draft version"}},
            format="json",
        )
        second_update = self.client.patch(
            f"/api/seller/drafts/{draft_id}/",
            {"data": {"name": "Latest draft version"}},
            format="json",
        )

        self.assertEqual(first_update.status_code, 200)
        self.assertEqual(second_update.status_code, 200)
        self.assertEqual(second_update.data["id"], draft_id)
        self.assertEqual(second_update.data["data"]["name"], "Latest draft version")
        self.assertEqual(SellerProductDraft.objects.filter(seller=self.seller).count(), 1)
        self.assertEqual(Product.objects.count(), 0)

    def test_publishing_a_draft_creates_a_product_and_removes_the_draft(self):
        draft = self.client.post(
            "/api/seller/drafts/",
            {"data": {"name": "Unfinished product"}},
            format="json",
        ).data

        response = self.client.post(
            f"/api/seller/drafts/{draft['id']}/publish/",
            {"data": self.product_data()},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Product.objects.filter(seller=self.seller, status="active").count(), 1)
        self.assertFalse(SellerProductDraft.objects.filter(id=draft["id"]).exists())
        self.assertEqual(self.client.get("/api/dashboard/").data["my_products"], 1)

    def test_invalid_publish_keeps_the_saved_draft(self):
        draft = self.client.post(
            "/api/seller/drafts/",
            {"data": {"name": "Unfinished product"}},
            format="json",
        ).data

        response = self.client.post(f"/api/seller/drafts/{draft['id']}/publish/", format="json")

        self.assertEqual(response.status_code, 400)
        self.assertTrue(SellerProductDraft.objects.filter(id=draft["id"]).exists())
        self.assertEqual(Product.objects.count(), 0)

    def test_publishing_a_draft_for_an_existing_product_updates_that_product(self):
        product = Product.objects.create(
            seller=self.seller,
            name="Old name",
            sku="EXISTING-1",
            category="Mobiles",
            subcategory="Smartphones",
            brand="Example",
            description="An existing product.",
            price=100,
            mrp=120,
            image_url="https://example.com/product.webp",
            image_urls=["https://example.com/product.webp"],
        )
        draft = self.client.post(
            "/api/seller/drafts/",
            {"product_id": product.id, "data": self.product_data(name="Updated name", sku="EXISTING-1")},
            format="json",
        )
        self.assertEqual(draft.status_code, 201)

        response = self.client.post(
            f"/api/seller/drafts/{draft.data['id']}/publish/",
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], product.id)
        self.assertEqual(Product.objects.filter(seller=self.seller).count(), 1)
        product.refresh_from_db()
        self.assertEqual(product.name, "Updated name")
        self.assertFalse(SellerProductDraft.objects.filter(id=draft.data["id"]).exists())

    def test_drafts_are_private_to_their_seller(self):
        draft = self.client.post(
            "/api/seller/drafts/",
            {"data": {"name": "Private draft"}},
            format="json",
        ).data
        self.client.force_authenticate(self.other_seller)

        response = self.client.get("/api/seller/drafts/")
        self.assertEqual(response.data, [])
        update_response = self.client.patch(
            f"/api/seller/drafts/{draft['id']}/",
            {"data": {"name": "Unauthorized edit"}},
            format="json",
        )
        self.assertEqual(update_response.status_code, 404)
        publish_response = self.client.post(f"/api/seller/drafts/{draft['id']}/publish/", format="json")
        self.assertEqual(publish_response.status_code, 404)

    def test_legacy_draft_product_rows_are_not_counted(self):
        Product.objects.create(seller=self.seller, name="Legacy draft", status="draft")

        response = self.client.get("/api/dashboard/")

        self.assertEqual(response.data["my_products"], 0)

        admin = User.objects.create_user(username="draft-count-admin", password="test-pass", role="admin")
        self.client.force_authenticate(admin)
        admin_dashboard = self.client.get("/api/dashboard/")
        self.assertEqual(admin_dashboard.data["total_products"], 0)
