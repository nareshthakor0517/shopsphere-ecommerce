import { resolveImageUrl } from '../imageUrl';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const orderNumber = id => `SS-${String(id).padStart(6, '0')}`;

export default function MyOrdersPage({ orders, loading, onShop }) {
  return <section className="myOrdersPage">
    <header className="myOrdersHero"><div><span>YOUR SHOPSPHERE ACCOUNT</span><h1>My orders</h1><p>Every order you’ve placed, all in one place.</p></div><div className="myOrdersCount"><b>{orders.length}</b><span>{orders.length === 1 ? 'order placed' : 'orders placed'}</span></div></header>
    {loading ? <div className="myOrdersEmpty" role="status">Loading your orders…</div> : !orders.length ? <div className="myOrdersEmpty"><span aria-hidden="true">▤</span><h2>Your order list is waiting</h2><p>Once you place an order, its details and delivery address will appear here.</p><button className="primary" onClick={onShop}>Explore the shop <span>→</span></button></div> :
      <div className="myOrdersList">{orders.map(order => {
        const statusSteps = ['paid', 'processing', 'shipped'];
        const currentStep = statusSteps.indexOf(order.status);
        const totalItems = order.items.reduce((total, item) => total + item.quantity, 0);
        return <article className="myOrderCard" key={order.id}>
          <div className="myOrderHead"><div><span>ORDER</span><b>{orderNumber(order.id)}</b></div><div className="myOrderPayment"><span>PAYMENT</span><b><i />{order.payment_method === 'razorpay' ? 'Paid online' : order.payment_method}</b></div><strong className={`myOrderStatus status-${order.status}`}>{order.status.replaceAll('_', ' ')}</strong></div>
          {order.status === 'cancelled' ? <div className="myOrderCancelled">This order was cancelled.</div> : <div className="myOrderProgress" aria-label={`Order status: ${order.status}`}>
            {['Order confirmed', 'Processing', 'Shipped'].map((step, index) => <div className={`myOrderProgressStep ${index <= currentStep ? 'complete' : ''} ${index === currentStep ? 'current' : ''}`} key={step}><i>{index < currentStep ? '✓' : index + 1}</i><span>{step}</span></div>)}
          </div>}
          <div className="myOrderBody"><div className="myOrderItems">{order.items.map(item => <div className="myOrderItem" key={item.id}><span className="myOrderProductImage">{item.product_image ? <img src={resolveImageUrl(item.product_image)} alt={item.product_name} loading="lazy" /> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 7 8.5-4 8.5 4v10l-8.5 4-8.5-4V7Z" /><path d="m3.8 7.2 8.2 4 8.2-4M12 11.2V21" /></svg>}</span><div><b>{item.product_name}</b><small>{item.product_brand && `${item.product_brand} · `}Quantity: {item.quantity} <i>·</i> {money(item.unit_price)} each</small></div><strong>{money(Number(item.unit_price) * item.quantity)}</strong></div>)}</div></div>
          <footer className="myOrderFoot"><span>{totalItems} {totalItems === 1 ? 'item' : 'items'} in this order</span><span><small>Order total</small><b>{money(order.total_amount)}</b></span></footer>
        </article>;
      })}</div>}
  </section>;
}
