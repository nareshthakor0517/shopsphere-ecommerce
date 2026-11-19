import json
import mimetypes
import os
import time
from decimal import Decimal, InvalidOperation
from urllib.parse import urlsplit

import cloudinary
from django.core.files.storage import default_storage
from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction
from django.db.models.deletion import ProtectedError
from django.http import FileResponse, Http404
from django.conf import settings
from django.db.models import IntegerField, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from django.utils.text import slugify
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Product, ProductImageAsset, SellerCategory, SellerProductDraft
from .serializers import ProductSerializer


class ProductImageServeView(APIView):
    """Serve public product uploads in development and production alike."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, image_path):
        normalized = image_path.replace("\\", "/")
        if not normalized.startswith("products/") or ".." in normalized.split("/"):
            raise Http404
        try:
            image_file = default_storage.open(normalized, "rb")
        except (FileNotFoundError, OSError, ValueError):
            raise Http404
        content_type = mimetypes.guess_type(normalized)[0] or "application/octet-stream"
        response = FileResponse(image_file, content_type=content_type)
        response["Cache-Control"] = "public, max-age=3600"
        response["X-Content-Type-Options"] = "nosniff"
        return response


class SellerCategoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _seller(self, request):
        if request.user.role != "sales":
            raise PermissionDenied("Only sellers can manage their categories.")

    def get(self, request):
        self._seller(request)
        return Response([{"id": category.id, "name": category.name} for category in SellerCategory.objects.filter(seller=request.user)])

    def post(self, request):
        self._seller(request)
        name = str(request.data.get("name", "")).strip()
        if not name or len(name) > 80:
            raise ValidationError({"name": "Enter a category name up to 80 characters."})
        category, created = SellerCategory.objects.get_or_create(seller=request.user, name=name)
        return Response({"id": category.id, "name": category.name}, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request, category_id):
        self._seller(request)
        category = SellerCategory.objects.filter(seller=request.user, id=category_id).first()
        if category is None:
            raise Http404
        if Product.objects.filter(seller=request.user, category__iexact=category.name).exists():
            return Response({"detail": "This category is assigned to a product and cannot be deleted."}, status=status.HTTP_409_CONFLICT)
        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SellerProductDraftView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _seller(self, request):
        if request.user.role != "sales":
            raise PermissionDenied("Only sellers can manage product drafts.")

    @staticmethod
    def _draft_data(request, instance=None):
        data = request.data.get("data", request.data)
        if not isinstance(data, dict):
            raise ValidationError({"data": "Product draft data must be an object."})
        serializer = ProductSerializer(
            instance,
            data={**data, "status": "draft"},
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        return json.loads(json.dumps(serializer.validated_data, cls=DjangoJSONEncoder))

    @staticmethod
    def _response_data(draft):
        return {
            "id": str(draft.id),
            "product_id": draft.product_id,
            "data": draft.data,
            "updated_at": draft.updated_at,
        }

    def get(self, request):
        self._seller(request)
        drafts = SellerProductDraft.objects.filter(seller=request.user).select_related("product")
        return Response([self._response_data(draft) for draft in drafts])

    def post(self, request):
        self._seller(request)
        product = None
        product_id = request.data.get("product_id")
        if product_id:
            product = Product.objects.filter(pk=product_id, seller=request.user).first()
            if product is None:
                raise ValidationError({"product_id": "Choose one of your own products."})
        data = self._draft_data(request, instance=product)
        draft = SellerProductDraft.objects.create(seller=request.user, product=product, data=data)
        return Response(self._response_data(draft), status=status.HTTP_201_CREATED)

    def _get_draft(self, request, draft_id):
        draft = SellerProductDraft.objects.filter(seller=request.user, id=draft_id).first()
        if draft is None:
            raise Http404
        return draft

    def patch(self, request, draft_id):
        self._seller(request)
        draft = self._get_draft(request, draft_id)
        draft.data = self._draft_data(request, instance=draft.product)
        draft.save(update_fields=("data", "updated_at"))
        return Response(self._response_data(draft))

    def delete(self, request, draft_id):
        self._seller(request)
        draft = self._get_draft(request, draft_id)
        draft.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublishSellerProductDraftView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, draft_id):
        if request.user.role != "sales":
            raise PermissionDenied("Only sellers can publish product drafts.")
        draft = SellerProductDraft.objects.select_for_update().filter(
            seller=request.user,
            id=draft_id,
        ).first()
        if draft is None:
            raise Http404

        payload = draft.data
        if "data" in request.data:
            data = request.data["data"]
            if not isinstance(data, dict):
                raise ValidationError({"data": "Product draft data must be an object."})
            payload = SellerProductDraftView._draft_data(request, instance=draft.product)
        product = draft.product
        if product is not None and product.seller_id != request.user.id:
            raise PermissionDenied("You can publish drafts only for your own products.")
        serializer = ProductSerializer(
            product,
            data={**payload, "status": "active"},
            partial=product is not None,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        saved_product = serializer.save(seller=request.user) if product is None else serializer.save(status="active")
        draft.delete()
        return Response(
            ProductSerializer(saved_product, context={"request": request}).data,
            status=status.HTTP_201_CREATED if product is None else status.HTTP_200_OK,
        )


def seller_image_folder(user):
    return slugify(user.username) or str(user.id)


def seller_image_name(user):
    return slugify(user.full_name.strip()) or slugify(user.username) or "seller"


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer

    def get_queryset(self):
        queryset = Product.objects.select_related("seller").all()
        user = self.request.user
        if user.is_authenticated and user.role == "sales":
            queryset = queryset.filter(seller=user)
        elif not (user.is_authenticated and user.role == "admin"):
            queryset = queryset.filter(status="active")
        params = self.request.query_params
        search = params.get("search")
        category = params.get("category")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(description__icontains=search)
                | Q(category__icontains=search)
                | Q(brand__icontains=search)
            )
        if category:
            queryset = queryset.filter(category__iexact=category)
        for key, lookup in (("min_price", "price__gte"), ("max_price", "price__lte")):
            value = params.get(key)
            if value:
                try:
                    amount = Decimal(value)
                    if amount < 0:
                        raise InvalidOperation
                except (InvalidOperation, ValueError):
                    raise ValidationError({key: "Enter a valid non-negative amount."})
                queryset = queryset.filter(**{lookup: amount})
        return queryset.order_by("-created_at")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    @action(detail=False, methods=["get"], url_path="best-sellers", permission_classes=[permissions.AllowAny])
    def best_sellers(self, request):
        from orders.models import OrderItem

        sold_units = OrderItem.objects.filter(
            product_id=OuterRef("pk"), order__status__in=("paid", "processing", "shipped")
        ).values("product_id").annotate(total=Sum("quantity")).values("total")[:1]
        products = self.get_queryset().annotate(
            sold_quantity=Coalesce(Subquery(sold_units, output_field=IntegerField()), Value(0))
        ).filter(sold_quantity__gt=0).order_by("-sold_quantity", "-created_at")[:6]
        data = ProductSerializer(products, many=True, context={"request": request}).data
        for product, serialized in zip(products, data):
            serialized["sold_quantity"] = product.sold_quantity
        return Response(data)

    def perform_create(self, serializer):
        if self.request.user.role not in ("admin", "sales"):
            raise PermissionDenied("Only Admin or Sales Person can add products.")
        if serializer.validated_data.get("status") == "draft":
            raise ValidationError({"status": "Save drafts from the seller dashboard; publish to create a product."})
        defaults = {"seller": self.request.user}
        if self.request.user.role == "sales" and "status" not in self.request.data:
            defaults["status"] = "pending_approval"
        serializer.save(**defaults)

    def _can_manage(self, product):
        return self.request.user.role == "admin" or (
            self.request.user.role == "sales" and product.seller_id == self.request.user.id
        )

    def perform_update(self, serializer):
        product = self.get_object()
        if not self._can_manage(product):
            raise PermissionDenied("You can manage only your own products.")
        if serializer.validated_data.get("status", product.status) == "draft":
            raise ValidationError({"status": "Save drafts from the seller dashboard; publish to create a product."})
        serializer.save()

    def perform_destroy(self, instance):
        if not self._can_manage(instance):
            raise PermissionDenied("You can delete only your own products.")
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError({"detail": "This product is in order history and cannot be deleted. Reject it to remove it from the storefront."})


class CloudinarySignatureView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in ("admin", "sales"):
            raise PermissionDenied("Only Admin or Sales Person can upload product images.")
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
        api_key = os.getenv("CLOUDINARY_API_KEY")
        api_secret = os.getenv("CLOUDINARY_API_SECRET")
        if not all((cloud_name, api_key, api_secret)):
            return Response(
                {"detail": "Configure Cloudinary credentials in the backend environment."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret, secure=True)
        timestamp = int(time.time())
        params = {
            "timestamp": timestamp,
            "folder": "shopsphere/products",
            "allowed_formats": "jpg,png,webp",
            "max_file_size": 5 * 1024 * 1024,
        }
        signature = cloudinary.utils.api_sign_request(params, api_secret)
        return Response({**params, "signature": signature, "api_key": api_key, "cloud_name": cloud_name})


class ProductImageUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in ("admin", "sales"):
            raise PermissionDenied("Only Admin or Sales Person can upload product images.")
        files = request.FILES.getlist("images")
        if not files:
            raise ValidationError({"images": "Select at least one image to upload."})
        if len(files) > 8:
            raise ValidationError({"images": "Upload a maximum of 8 images at a time."})
        allowed_types = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
        product_name = slugify(request.data.get("product_name", "")) or "product"
        seller_slug = seller_image_name(request.user)
        start_index = request.data.get("start_index", 0)
        try:
            start_index = max(0, min(int(start_index), 7))
        except (TypeError, ValueError):
            start_index = 0
        if start_index + len(files) > 8:
            raise ValidationError({"images": "A product can have up to 8 images."})
        urls = []
        for uploaded in files:
            extension = allowed_types.get(uploaded.content_type)
            if not extension:
                raise ValidationError({"images": "Use JPG, PNG or WebP images."})
            if uploaded.size > 5 * 1024 * 1024:
                raise ValidationError({"images": "Each image must be 5 MB or smaller."})
        for index, uploaded in enumerate(files, start=start_index + 1):
            extension = allowed_types[uploaded.content_type]
            image_label = f"main-img-{index}" if index == 1 else f"img-{index}"
            stored_name = default_storage.save(
                f"products/{product_name}_{seller_slug}_{image_label}{extension}", uploaded
            )
            ProductImageAsset.objects.get_or_create(owner=request.user, file_path=stored_name)
            urls.append(request.build_absolute_uri(default_storage.url(stored_name)))
        return Response({"urls": urls}, status=status.HTTP_201_CREATED)


class ProductImageRenameView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in ("admin", "sales"):
            raise PermissionDenied("Only Admin or Sales Person can manage product images.")
        urls = request.data.get("urls", [])
        if not isinstance(urls, list) or len(urls) > 8:
            raise ValidationError({"urls": "Provide a list of up to 8 product image URLs."})
        product_slug = slugify(request.data.get("product_name", "")) or "product"
        media_prefix = settings.MEDIA_URL.lstrip("/")
        seller_name = seller_image_name(request.user)
        legacy_prefixes = (f"products/{seller_image_folder(request.user)}/", f"products/{request.user.id}/")
        url_map = {}
        for index, url in enumerate(urls, start=1):
            path = urlsplit(url).path.lstrip("/")
            if not path.startswith(media_prefix):
                continue
            source_name = path[len(media_prefix):]
            is_owned_asset = ProductImageAsset.objects.filter(owner=request.user, file_path=source_name).exists()
            is_legacy_asset = source_name.startswith(legacy_prefixes)
            if ".." in source_name.split("/") or not source_name.startswith("products/") or not (is_owned_asset or is_legacy_asset) or not default_storage.exists(source_name):
                continue
            extension = os.path.splitext(source_name)[1].lower()
            image_label = f"main-img-{index}" if index == 1 else f"img-{index}"
            target_name = f"products/{product_slug}_{seller_name}_{image_label}{extension}"
            if source_name == target_name:
                url_map[url] = url
                continue
            with default_storage.open(source_name, "rb") as source_file:
                new_name = default_storage.save(target_name, source_file)
            ProductImageAsset.objects.get_or_create(owner=request.user, file_path=new_name)
            url_map[url] = request.build_absolute_uri(default_storage.url(new_name))
        return Response({"url_map": url_map})


class ProductImageRemoveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in ("admin", "sales"):
            raise PermissionDenied("Only Admin or Sales Person can manage product images.")
        image_url = request.data.get("url", "")
        if not image_url:
            raise ValidationError({"url": "An image URL is required."})

        for product in Product.objects.filter(seller=request.user).only("id", "image_url", "image_urls"):
            existing_urls = product.image_urls or []
            if image_url in existing_urls or product.image_url == image_url:
                product.image_urls = [url for url in existing_urls if url != image_url]
                product.image_url = product.image_urls[0] if product.image_urls else ""
                product.save(update_fields=("image_urls", "image_url", "updated_at"))

        path = urlsplit(image_url).path.lstrip("/")
        media_prefix = settings.MEDIA_URL.lstrip("/")
        stored_name = path[len(media_prefix):] if path.startswith(media_prefix) else ""
        owned_asset = ProductImageAsset.objects.filter(owner=request.user, file_path=stored_name).first()
        legacy_prefixes = (f"products/{seller_image_folder(request.user)}/", f"products/{request.user.id}/")
        if owned_asset:
            default_storage.delete(stored_name)
            owned_asset.delete()
        elif ".." not in stored_name.split("/") and stored_name.startswith(legacy_prefixes):
            default_storage.delete(stored_name)
        return Response({"removed": True})
