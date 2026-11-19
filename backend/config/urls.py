from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from catalog.views import ProductImageServeView
urlpatterns = [path("admin/", admin.site.urls), path("api/", include("store.urls"))]
urlpatterns.insert(0, path("media/<path:image_path>", ProductImageServeView.as_view()))
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
