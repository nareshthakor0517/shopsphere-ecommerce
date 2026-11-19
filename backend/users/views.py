from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, SellerRegisterSerializer, UserSerializer
from .phone import normalize_mobile_number
from .models import SellerProfile, User


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        if request.data.get("account_type", "customer") != "customer":
            return Response({"detail": "Seller accounts must use the seller registration page."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )


class SellerRegisterView(RegisterView):
    serializer_class = SellerRegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({"user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    required_role = "user"

    def post(self, request):
        identifier = str(request.data.get("identifier") or request.data.get("username") or "").strip()
        password = request.data.get("password", "")
        if not identifier or not isinstance(password, str):
            return Response(
                {"detail": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        account_matches = Q(username__iexact=identifier) | Q(email__iexact=identifier) | Q(full_name__iexact=identifier)
        mobile_number = normalize_mobile_number(identifier)
        if mobile_number:
            account_matches |= Q(mobile_number=mobile_number)
        all_matching_users = User.objects.filter(account_matches).distinct()
        matching_users = all_matching_users.filter(is_active=True)
        if matching_users.count() > 1:
            return Response(
                {"detail": "This full name matches more than one account. Sign in with your username, email, or mobile number."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = matching_users.first()
        if user is None:
            inactive_user = all_matching_users.filter(is_active=False).first()
            if inactive_user and inactive_user.check_password(password):
                if inactive_user.role == "sales":
                    try:
                        if inactive_user.seller_profile.approval_status == "revoked":
                            return Response({"detail": "Your seller access has been revoked. Please contact ShopSphere support."}, status=status.HTTP_403_FORBIDDEN)
                    except SellerProfile.DoesNotExist:
                        pass
                return Response({"detail": "Your account is blocked. Please contact ShopSphere support."}, status=status.HTTP_403_FORBIDDEN)
        if user is None or not user.check_password(password):
            return Response(
                {"detail": "Invalid username, email, mobile number, full name, or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if self.required_role and user.role != self.required_role:
            expected = {"user": "customer", "sales": "seller", "admin": "admin"}[self.required_role]
            return Response({"detail": f"This sign-in is for {expected} accounts."}, status=status.HTTP_403_FORBIDDEN)
        if user.role == "sales":
            try:
                approval_status = user.seller_profile.approval_status
            except SellerProfile.DoesNotExist:
                approval_status = "pending"
            if approval_status == "pending":
                return Response({"detail": "Your seller application is pending admin approval. You can sign in after it is approved."}, status=status.HTTP_403_FORBIDDEN)
            if approval_status == "rejected":
                return Response({"detail": "Your seller application was not approved. Please contact ShopSphere support."}, status=status.HTTP_403_FORBIDDEN)
            if approval_status == "revoked":
                return Response({"detail": "Your seller access has been revoked. Please contact ShopSphere support."}, status=status.HTTP_403_FORBIDDEN)
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }
        )


class SellerLoginView(LoginView):
    required_role = "sales"


class AdminLoginView(LoginView):
    required_role = "admin"


class MeView(APIView):
    def get(self, request):
        if request.user.role == "sales":
            try:
                approval_status = request.user.seller_profile.approval_status
            except SellerProfile.DoesNotExist:
                approval_status = "pending"
            if approval_status != "approved":
                message = {
                    "pending": "Your seller application is pending admin approval.",
                    "rejected": "Your seller application was not approved. Please contact ShopSphere support.",
                    "revoked": "Your seller access has been revoked. Please contact ShopSphere support.",
                }.get(approval_status, "Your seller account is not approved.")
                return Response({"detail": message}, status=status.HTTP_403_FORBIDDEN)
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        user = request.user
        if user.role != "sales":
            return Response({"detail": "Only seller profile settings can be changed here."}, status=status.HTTP_403_FORBIDDEN)
        full_name = str(request.data.get("full_name", user.full_name)).strip()
        email = str(request.data.get("email", user.email)).strip().lower()
        if full_name != user.full_name or email != user.email.lower():
            return Response(
                {"detail": "Personal information cannot be changed from seller settings. Contact support for corrections."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        store_name = request.data.get("store_name")
        profile = SellerProfile.objects.filter(user=user).first()
        if store_name is not None and (profile is None or str(store_name).strip() != profile.store_name):
            return Response(
                {"detail": "Store name cannot be changed from seller settings. Contact support for corrections."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(UserSerializer(user).data)
