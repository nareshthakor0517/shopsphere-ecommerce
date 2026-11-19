# ShopSphere — Implementation Notes

## Application architecture

The React app keeps page state and API orchestration in `frontend/src/App.jsx`; reusable view components live in `frontend/src/components/`. Django models, serializers and domain views are organized into `users`, `catalog`, `cart`, `orders` and `payments` apps. The `users` app owns registration and the custom user model. Business tables use the `shopsphere_` prefix, with migrations renaming the original `store_*` tables in place to preserve data. The `store` app provides admin and dashboard endpoints and composes the existing API routes. PostgreSQL is the configured default database.

## Implemented features

- Customer registration, JWT login and automatic access-token refresh.
- Server-side role enforcement for catalog changes and signed image uploads.
- Product search, category and price filtering, stock-aware cart updates, wishlist, and seller product editing.
- Razorpay order creation with a server-side amount and item snapshot. Verification checks the signature and fetched payment details before an order is recorded. Verification retries for the same completed payment return the existing order.
- Customer, seller and admin order views and role-specific dashboard metrics.
- Initial database migration for the custom user model and store entities.
- Responsive layouts and user-facing loading, error and empty states.

## Setup and external services

The application uses PostgreSQL through `DATABASE_URL`, including for local development. Cloudinary uploads and Razorpay checkout require credentials in the backend environment. Render and Vercel deployment require accounts, environment configuration and deployment URLs supplied by the project owner.

## Remaining submission steps

This workspace does not contain live provider credentials or deployment accounts, so no real Cloudinary upload, Razorpay transaction or hosted deployment has been performed. Create role-specific demo users, configure test credentials, run the project checks and exercise the full flows before submitting. Add real deployment links and screenshots after deploying from your own accounts.
