import ProductCard from './ProductCard';

export default function ProductGrid({ products, user, wishlist = [], onAddToCart, onWishlist, onEdit, onDelete, onOpenProduct, compact = false, emptyMessage = 'No products found. Try another search.' }) {
  if (!products.length) return <p className="empty">{emptyMessage}</p>;
  return <div className="grid">{products.map(product => <ProductCard key={product.id} product={product}
    user={user} isWishlisted={wishlist.some(item => item.product === product.id)} onAddToCart={onAddToCart}
    onWishlist={onWishlist} onEdit={onEdit} onDelete={onDelete} onOpenProduct={onOpenProduct} compact={compact} />)}</div>;
}
