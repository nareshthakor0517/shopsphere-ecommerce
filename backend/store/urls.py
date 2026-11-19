from django.urls import path, include
from rest_framework.routers import DefaultRouter
from users.views import RegisterView, SellerRegisterView, LoginView, SellerLoginView, AdminLoginView, MeView
from catalog.views import ProductViewSet, CloudinarySignatureView, ProductImageUploadView, ProductImageRenameView, ProductImageRemoveView, SellerCategoryView, SellerProductDraftView, PublishSellerProductDraftView
from cart.views import CartViewSet, WishlistViewSet
from payments.views import CreateRazorpayOrderView, VerifyPaymentView
from orders.views import OrderListView, AdminOrderStatusView
from .api_views.overview import DashboardView
from .api_views.admin import AdminUserViewSet, AdminPayoutView
from rest_framework_simplejwt.views import TokenRefreshView
router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("cart", CartViewSet, basename="cart")
router.register("wishlist", WishlistViewSet, basename="wishlist")
router.register("admin/users", AdminUserViewSet, basename="admin-users")
urlpatterns = [
    path("auth/register/", RegisterView.as_view()), path("auth/seller/register/", SellerRegisterView.as_view()), path("auth/login/", LoginView.as_view()), path("auth/seller/login/", SellerLoginView.as_view()), path("auth/admin/login/", AdminLoginView.as_view()), path("auth/me/", MeView.as_view()),
    path("auth/refresh/", TokenRefreshView.as_view()),
    path("seller/categories/", SellerCategoryView.as_view()),
    path("seller/categories/<int:category_id>/", SellerCategoryView.as_view()),
    path("seller/drafts/", SellerProductDraftView.as_view()),
    path("seller/drafts/<uuid:draft_id>/", SellerProductDraftView.as_view()),
    path("seller/drafts/<uuid:draft_id>/publish/", PublishSellerProductDraftView.as_view()),
    path("uploads/cloudinary-signature/", CloudinarySignatureView.as_view()),
    path("uploads/product-images/", ProductImageUploadView.as_view()),
    path("uploads/product-images/rename/", ProductImageRenameView.as_view()),
    path("uploads/product-images/remove/", ProductImageRemoveView.as_view()),
    path("payments/create-order/", CreateRazorpayOrderView.as_view()), path("payments/verify/", VerifyPaymentView.as_view()),
    path("orders/", OrderListView.as_view()), path("orders/<int:order_id>/status/", AdminOrderStatusView.as_view()), path("admin/orders/<int:order_id>/status/", AdminOrderStatusView.as_view()), path("dashboard/", DashboardView.as_view()),
    path("admin/payouts/", AdminPayoutView.as_view()), path("admin/payouts/<int:payout_id>/", AdminPayoutView.as_view()),
    path("", include(router.urls)),
]
