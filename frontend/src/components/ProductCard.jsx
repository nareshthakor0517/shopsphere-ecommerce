import { useEffect, useState } from 'react';
import WishlistButton from './WishlistButton';
import { resolveImageUrl } from '../imageUrl';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function ProductCard({ product, user, onAddToCart, onWishlist, isWishlisted = false, onEdit, onDelete, onOpenProduct, compact = false }) {
  const images = [...new Set([...(Array.isArray(product.image_urls) ? product.image_urls : []), product.image_url].map(resolveImageUrl).filter(Boolean))];
  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => setImageIndex(0), [product.id, product.image_url, product.image_urls]);
  const canManage = user?.role === 'admin' || (user?.role === 'sales' && user.id === product.seller);
  return <article className="product">
    <button className="productImage" onClick={() => onOpenProduct(product)} aria-label={`View ${product.name} details`}>{images[imageIndex]
      ? <img src={images[imageIndex]} alt={product.name} loading="lazy" onError={() => setImageIndex(index => index + 1)} />
      : <div className="imageUnavailable"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" /></svg><span>Image unavailable</span></div>}
      <span className="imageQuickView">Quick view ↗</span>
    </button>
    <div className={`productInfo ${compact ? 'compactProductInfo' : ''}`}>
      <small>{product.brand ? `${product.brand} · ${product.category}` : product.category}</small><h3><button className="productTitle" onClick={() => onOpenProduct(product)}>{product.name}</button></h3>
      {!compact && <p>{product.description || 'Thoughtfully selected for everyday use.'}</p>}
      <div className="productMeta"><strong>{money(product.price)}</strong><span>{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span></div>
      <div className={`actions ${compact ? 'compactActions' : ''}`}>
        {!compact && <button className="primary" disabled={product.stock < 1} onClick={() => onAddToCart(product.id)}>Add to cart</button>}
        <WishlistButton productName={product.name} active={isWishlisted} onClick={() => onWishlist(product.id)} />
        {canManage && <>
          <button className="outline" onClick={() => onEdit(product)}>Edit</button>
          <button className="outline danger" onClick={() => onDelete(product.id)}>Delete</button>
        </>}
      </div>
    </div>
  </article>;
}
