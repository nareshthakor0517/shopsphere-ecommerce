import { resolveImageUrl } from '../imageUrl';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function WishlistPanel({ items, onRemove, onAddToCart }) {
  const total = items.reduce((sum, item) => sum + Number(item.product_detail?.price || 0), 0);

  const addToCart = async (item) => {
    const added = await onAddToCart(item.product_detail.id);
    if (added) await onRemove(item.id);
  };

  return <section className="wishlistPage">
    <div className="wishlistHero">
      <div className="wishlistHeroCopy">
        <span className="wishlistEyebrow"><span aria-hidden="true">♥</span> YOUR PERSONAL COLLECTION</span>
        <h1>Good things, <em>saved.</em></h1>
        <p>Keep your favourites close. When you’re ready, they’re just one click from your cart.</p>
        <div className="wishlistHeroStats">
          <span className="wishlistStatIcon" aria-hidden="true">♡</span>
          <span><b>{items.length} {items.length === 1 ? 'favourite' : 'favourites'}</b><small>waiting for you</small></span>
        </div>
      </div>
      <div className="wishlistHeroArt" aria-hidden="true">
        <span className="wishlistOrbit wishlistOrbitOne" /><span className="wishlistOrbit wishlistOrbitTwo" />
        <span className="wishlistHeroHeart">♥</span><span className="wishlistSpark wishlistSparkOne">✦</span><span className="wishlistSpark wishlistSparkTwo">✧</span>
        <span className="wishlistArtLabel">YOUR NEXT<br />FAVOURITE</span>
      </div>
    </div>

    <div className="wishlistSectionHead">
      <div><span>THE GOOD STUFF</span><h2>Your wishlist</h2></div>
      <div className="wishlistCount">{items.length} saved</div>
    </div>

    {!items.length ? <div className="wishlistEmpty">
      <span className="wishlistEmptyHeart" aria-hidden="true">♡</span>
      <h3>Your next favourite belongs here</h3>
      <p>Tap the heart on anything you love, and it’ll be waiting for you here.</p>
    </div> : <>
      <div className="commerceTableWrap"><table className="commerceTable wishlistTable"><thead><tr><th className="wishlistProductHeading">PRODUCT</th><th>PRICE</th><th>AVAILABILITY</th><th><span className="srOnly">Actions</span></th></tr></thead><tbody>
        {items.map(item => {
          const product = item.product_detail || {};
          const image = resolveImageUrl(product.image_url || product.image);
          const inStock = Number(product.stock) > 0;
          return <tr key={item.id}>
            <td data-label="Product"><div className="commerceProduct">
              <div className="commerceProductImage">{image ? <img src={image} alt={product.name || 'Saved product'} loading="lazy" /> : <span aria-hidden="true">✦</span>}</div>
              <div className="commerceProductInfo"><small className="commerceKicker">{[product.brand, product.category].filter(Boolean).join(' · ') || 'ShopSphere pick'}</small><b>{product.name || 'Saved product'}</b>{product.description && <small className="commerceDescription">{product.description}</small>}</div>
            </div></td>
            <td data-label="Price"><span className="commerceUnitPrice commerceWishlistPrice">{money(product.price)}<small>Inclusive of all taxes</small></span></td>
            <td data-label="Availability"><span className={`commerceStock ${inStock ? '' : 'isUnavailable'}`}><i />{inStock ? 'In stock' : 'Out of stock'}</span></td>
            <td data-label="Actions"><div className="wishlistTableActions">
              <button className="primary wishlistCartButton" disabled={!inStock} onClick={() => addToCart(item)}><span aria-hidden="true">＋</span>{inStock ? 'Add to cart' : 'Unavailable'}</button>
              <button className="commerceRemove" onClick={() => onRemove(item.id)}>Remove</button>
            </div></td>
          </tr>;
        })}
      </tbody></table></div>
      <aside className="wishlistTotalBar">
        <div><span>YOUR SAVED SELECTION</span><b>{items.length} {items.length === 1 ? 'item' : 'items'} <i>·</i> {money(total)}</b></div>
        <small>Prices shown are current and may change.</small>
      </aside>
    </>}
  </section>;
}

