from django.conf import settings
from django.db import models

from catalog.models import Product


class CartItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "shopsphere_cart_items"
        unique_together = ("user", "product")


class WishlistItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wishlist_items",
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE)

    class Meta:
        db_table = "shopsphere_wishlist_items"
        unique_together = ("user", "product")
