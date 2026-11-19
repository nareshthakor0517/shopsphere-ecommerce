# ShopSphere

ShopSphere is a multi-vendor shopping application built with Django REST Framework and React. It supports customer, sales-person and admin roles, with product images stored on Cloudinary and checkout handled through Razorpay.

## Project layout

```text
backend/
  config/                  Django settings and URL configuration
  users/                   Custom user model, registration, login and admin
    migrations/             User model state and safe company-table rename
    serializers.py          Registration and profile validation
    views.py                Register, login and current-user endpoints
  store/                   Admin, dashboard and API route composition
    api_views/              Admin and dashboard endpoints
  catalog/                 Product model, serializer, views, admin and migrations
  cart/                    Cart and wishlist models, serializers, views and admin
  orders/                  Order models, serializers, views and admin
  payments/                Payment-attempt model, checkout views and admin
frontend/
  src/
    components/             Shop, product, account, cart and dashboard UI
    App.jsx                 Page state and feature orchestration
    api.js                  API client and JWT refresh
```

The business models are split into Django apps by domain. Registration creates
a regular customer account and signs it in immediately; role changes remain
admin-only. The `users` app owns the custom `AUTH_USER_MODEL`. Business tables
use the `shopsphere_` prefix; migrations rename the original `store_*` tables
in place, preserving existing records.
`store/urls.py` continues to expose existing API routes while each app owns its
models, serializers and domain views.

## Features

- JWT registration, login, current-user and token-refresh endpoints. Registration requires full name, a case-insensitively unique username, a unique `@gmail.com` email, a unique 10-digit mobile number, and matching passwords of at least 8 characters. Login accepts username, email, mobile number or an unambiguous full name. Registration never accepts a role, so public users cannot grant themselves seller or admin access.
- Public product search, category and price filters, with role protected create, edit and delete actions. Sales people can change only their products; admins can manage all products.
- Seller product entry starts with a category, then offers its matching subcategories and brands. Standard categories are always available; seller-created categories are saved per seller and cannot be removed while products use them.
- Seller drafts are stored separately from catalog products and have no Product ID. Publishing creates a product; saving changes as a draft for an existing product updates it only when that draft is published. Product totals exclude drafts.
- Seller notifications are ordered newest first, show a notification when a draft is saved, and identify low-stock products by name and remaining quantity.
- Seller category cards open the product list filtered to that category, including a useful empty state for categories with no published products. Seller settings keep personal name, email, and store name read-only; sellers can choose a theme, pause/resume all notifications, and manage order, stock, and draft alert preferences.
- Signed Cloudinary uploads, with only the returned hosted image URL saved to a product.
- Per-user cart and wishlist, cart quantity controls, stock checks and responsive product cards.
- Razorpay test checkout. The backend saves the expected amount and product snapshot, verifies the Razorpay signature and fetched payment, then creates the order from that server-side snapshot.
- Customer order history, sales-person orders containing their products and admin sales summaries.
- Separate React components, responsive layouts, and loading, empty and error states.

## Run locally

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set DATABASE_URL in .env to your PostgreSQL connection string.
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

PostgreSQL is the default database. Create a `shopsphere` database and set
`DATABASE_URL` in `backend/.env`, for example
`postgresql://shopsphere_user:your-password@localhost:5432/shopsphere`.
Registration is available from the frontend and at `POST /api/auth/register/`;
it returns access and refresh tokens and signs the new customer in. Use Django
admin to grant an account the `sales` or `admin` role; Django `is_staff` and
ShopSphere's `role` are separate permissions. After running migrations, check
registered accounts with `SELECT * FROM shopsphere_users;` (`store_user` was
renamed in place).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open the URL printed by Vite. The default API URL is `http://127.0.0.1:8000/api`.

## Environment variables

Backend values belong in `backend/.env` and frontend values in `frontend/.env`. The checked-in example files contain placeholders only. Set a strong `SECRET_KEY`, `ALLOWED_HOSTS`, and `CORS_ALLOWED_ORIGINS` for deployment. Cloudinary and Razorpay credentials are needed to use uploads and checkout; those features return a clear configuration error until keys are set. Never put provider secrets in the frontend.

## API routes

| Area | Routes |
| --- | --- |
| Authentication | `POST /api/auth/register/`, `POST /api/auth/login/`, `GET /api/auth/me/`, `POST /api/auth/refresh/` |
| Products | `GET/POST /api/products/`, `GET/PATCH/DELETE /api/products/<id>/` |
| Seller categories | `GET/POST /api/seller/categories/`, `DELETE /api/seller/categories/<id>/` |
| Seller product drafts | `GET/POST /api/seller/drafts/`, `PATCH/DELETE /api/seller/drafts/<uuid>/`, `POST /api/seller/drafts/<uuid>/publish/` |
| Cart and wishlist | `GET/POST /api/cart/`, `PATCH/DELETE /api/cart/<id>/`, `GET/POST /api/wishlist/`, `DELETE /api/wishlist/<id>/` |
| Images | `POST /api/uploads/cloudinary-signature/` |
| Checkout | `POST /api/payments/create-order/`, `POST /api/payments/verify/` |
| Orders and dashboard | `GET /api/orders/`, `GET /api/dashboard/` |
| Admin users | `GET /api/admin/users/`, `PATCH /api/admin/users/<id>/set_role/` |

Product list query parameters: `search`, `category`, `min_price`, and `max_price`.

## Deployment

The backend build script installs Python dependencies, collects static files and applies migrations. Deploy `backend/` to Render with `gunicorn config.wsgi:application` as the start command. Deploy `frontend/` to Vercel and set `VITE_API_URL` to the deployed backend's `/api` URL. Add the deployed frontend origin to `CORS_ALLOWED_ORIGINS`, and configure secrets in each host's environment settings. A live deployment still requires your Render, Vercel, Cloudinary and Razorpay accounts and credentials.

## Before submission

- Create test accounts for all three ShopSphere roles and verify each role's permissions.
- Configure Razorpay test keys and Cloudinary credentials before demonstrating payment and image upload.
- Run the backend and frontend checks locally, exercise the customer and seller flows, and capture screenshots of the finished UI.
- Deploy to your own Render and Vercel projects, then add the live links and demo account instructions here. Do not commit passwords, keys or provider secrets.
- Keep Git commits focused as each milestone is completed and open pull requests from your own repository workflow.
