from rest_framework.permissions import BasePermission, SAFE_METHODS
class IsAdminOrSellerOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin": return True
        return request.user.role == "sales" and obj.seller_id == request.user.id
