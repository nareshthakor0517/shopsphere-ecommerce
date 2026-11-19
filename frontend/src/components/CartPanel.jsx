import { resolveImageUrl } from '../imageUrl';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function CartPanel({ items, onQuantity, onRemove, onCheckout, busy }) {
  const total = items.reduce((sum, item) => sum + Number(item.product_detail.price) * item.quantity, 0);
  return <section className="cartPage"><div className="sectionHead"><div><small>READY WHEN YOU ARE</small><h2>Your shopping cart</h2></div><span>{items.length} line items</span></div>
    {!items.length ? <div className="wishlistEmpty"><span className="wishlistEmptyHeart" aria-hidden="true">＋</span><h3>Your cart is ready for something good</h3><p>Explore the collection and add a favourite whenever you’re ready.</p></div> : <>
      <div className="commerceTableWrap"><table className="commerceTable cartTable"><thead><tr><th className="cartProductHeading">PRODUCT</th><th>PRICE</th><th>QUANTITY</th><th>ITEM TOTAL</th><th><span className="srOnly">Actions</span></th></tr></thead><tbody>
        {items.map(item => {
          const product = item.product_detail || {};
          const image = resolveImageUrl(product.image_url || product.image);
          return <tr key={item.id}>
            <td data-label="Product"><div className="commerceProduct">
              <div className="commerceProductImage">{image ? <img src={image} alt={product.name || 'Cart product'} loading="lazy" /> : <span aria-hidden="true">✦</span>}</div>
              <div className="commerceProductInfo"><b>{product.name}</b><small>{[product.brand, product.category].filter(Boolean).join(' · ') || 'ShopSphere pick'}</small><span className={`commerceStock ${product.stock > 0 ? '' : 'isUnavailable'}`}><i />{product.stock > 0 ? 'In stock' : 'Out of stock'}</span></div>
            </div></td>
            <td data-label="Price"><span className="commerceUnitPrice">{money(product.price)} <small>each</small></span></td>
            <td data-label="Quantity"><label className="quantityControl"><span className="srOnly">Quantity</span><input aria-label={`Quantity for ${product.name}`} type="number" min="1" max={product.stock} value={item.quantity} onChange={e => onQuantity(item.id, Number(e.target.value))} /></label></td>
            <td data-label="Item total"><b className="commerceLineTotal">{money(Number(product.price) * item.quantity)}</b></td>
            <td data-label="Actions"><button className="commerceRemove" onClick={() => onRemove(item.id)}>Remove</button></td>
          </tr>;
        })}
      </tbody></table></div>
      <div className="cartSummary"><div><span>Subtotal</span><small>Shipping and taxes calculated at checkout</small></div><b>{money(total)}</b></div>
      <button className="primary checkoutButton" disabled={busy} onClick={onCheckout}>{busy ? 'Preparing checkout…' : 'Proceed to checkout'} <span aria-hidden="true">→</span></button>
    </>}
  </section>;
}

