import { useEffect, useState } from 'react';
import WishlistButton from './WishlistButton';
import { resolveImageUrl } from '../imageUrl';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function ProductDetail({ product, onBack, onAddToCart, onBuyNow, onWishlist, isWishlisted = false }) {
  const images = [...new Set([...(Array.isArray(product.image_urls) ? product.image_urls : []), product.image_url].map(resolveImageUrl).filter(Boolean))];
  const [activeImage, setActiveImage] = useState(0);
  const [failedImages, setFailedImages] = useState([]);
  useEffect(() => { setActiveImage(0); setFailedImages([]); }, [product.id, product.image_url, product.image_urls]);
  const nextImage = images.findIndex((_, index) => index > activeImage && !failedImages.includes(index));
  const previousImage = images.findLastIndex((_, index) => index < activeImage && !failedImages.includes(index));
  const specifications = product.specifications && typeof product.specifications === 'object' && !Array.isArray(product.specifications)
    ? Object.entries(product.specifications).filter(([, value]) => value != null && String(value).trim())
    : [];
  const productDetails = [
    ['Brand', product.brand],
    ['Category', product.category],
    ['Subcategory', product.subcategory],
    ['SKU', product.sku],
    ['Sold by', product.seller_name],
    ['Warranty', product.warranty_period],
    ['Returns', product.return_policy],
    ['Shipping', product.free_shipping ? 'Free shipping' : Number(product.shipping_charges) > 0 ? money(product.shipping_charges) : 'Shipping included'],
    ['Replacement', product.replacement_available ? 'Available' : 'Not available'],
  ].filter(([, value]) => value != null && String(value).trim());
  const markImageFailed = index => {
    setFailedImages(current => [...new Set([...current, index])]);
    const nextAvailable = images.findIndex((_, candidate) => candidate > index && !failedImages.includes(candidate));
    const previousAvailable = images.findLastIndex((_, candidate) => candidate < index && !failedImages.includes(candidate));
    if (nextAvailable >= 0) setActiveImage(nextAvailable);
    else if (previousAvailable >= 0) setActiveImage(previousAvailable);
  };
  return <section className="productDetail">
    <button className="backLink" onClick={onBack}>← Back to shop</button>
    <div className="detailLayout">
      <div className="detailGallery">
        <div className="detailImage">{images[activeImage] && !failedImages.includes(activeImage)
        ? <img src={images[activeImage]} alt={`${product.name} image ${activeImage + 1}`} onError={() => markImageFailed(activeImage)} />
        : <div className="detailUnavailable"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" /></svg><b>Product image unavailable</b><small>Please upload this product's photos again.</small></div>}
          {previousImage >= 0 && <button className="galleryArrow galleryPrevious" aria-label="Previous product image" onClick={() => setActiveImage(previousImage)}>‹</button>}
          {nextImage >= 0 && <button className="galleryArrow galleryNext" aria-label="Next product image" onClick={() => setActiveImage(nextImage)}>›</button>}
        </div>
        {images.filter((_, index) => !failedImages.includes(index)).length > 1 && <div className="detailThumbnails" aria-label="Product images">
          {images.map((image, index) => !failedImages.includes(index) && <button key={`${image}-${index}`} className={index === activeImage ? 'active' : ''} aria-label={`Show product image ${index + 1}`} aria-pressed={index === activeImage} onClick={() => setActiveImage(index)}>
            <img src={image} alt="" onError={() => markImageFailed(index)} />
          </button>)}
        </div>}
      </div>
      <div className="detailInfo">
        <span className="detailCategory">{[product.brand, product.category].filter(Boolean).join(' · ')}</span>
        <h1>{product.name}</h1>
        <div className="detailRating"><span>✦</span> <small>ShopSphere selection</small></div>
        <div className="detailPrice">{money(product.price)} <small>Inclusive of all taxes</small>
          {Number(product.mrp) > Number(product.price) && <span className="detailOffer"><del>{money(product.mrp)}</del><b>{product.discount_percent || Math.round((product.mrp - product.price) / product.mrp * 100)}% off</b></span>}
        </div>
        <p className="detailDescription">{product.description || 'A thoughtfully selected essential, made to fit seamlessly into your everyday life.'}</p>
        <div className={`stockMessage ${product.stock > 0 ? '' : 'stockEmpty'}`}><i />{product.stock > 0 ? `${product.stock} in stock · Ready to ship` : 'Currently out of stock'}</div>
        <div className="detailActions">
          <button className="primary" disabled={product.stock < 1} onClick={() => onAddToCart(product.id)}>Add to cart <span>→</span></button>
          <button className="buyNowButton" disabled={product.stock < 1} onClick={() => onBuyNow(product)}>Buy now <span>↗</span></button>
          <WishlistButton productName={product.name} active={isWishlisted} onClick={() => onWishlist(product.id)} className="detailWishlist" text={isWishlisted ? 'Saved' : 'Save for later'} />
        </div>
        <div className="detailPerks"><div><b>✓</b><span><strong>Genuine product</strong><small>Quality checked</small></span></div>
          <div><b>↻</b><span><strong>Easy returns</strong><small>Shop with confidence</small></span></div>
          <div><b>⌑</b><span><strong>Secure checkout</strong><small>Your data is protected</small></span></div></div>
        {productDetails.length > 0 && <section className="productDetailFacts" aria-label="Product details">
          <h2>Product details</h2>
          <dl>{productDetails.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section>}
        {specifications.length > 0 && <section className="productSpecifications" aria-label="Product specifications">
          <h2>Specifications</h2>
          <dl>{specifications.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section>}
      </div>
    </div>
  </section>;
}
