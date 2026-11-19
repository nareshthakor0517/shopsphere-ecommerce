const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function OrderConfirmation({ order, onShop, onOrders }) {
  const address = order?.delivery_address || {};
  return <section className="orderConfirmation">
    <div className="confirmationCard">
      <div className="confirmationCheck" aria-hidden="true">✓</div>
      <span className="confirmationEyebrow">PAYMENT CONFIRMED</span>
      <h1>Your order is on its way.</h1>
      <p>Thanks for shopping with ShopSphere. Your order is confirmed and we’ll deliver it to the address below.</p>
      <div className="confirmationNumber"><small>ORDER NUMBER</small><b>SS-{String(order?.id || '').padStart(6, '0')}</b><span>Payment ID: {order?.razorpay_payment_id || 'Confirmed'}</span></div>
      <div className="confirmationItems">{(order?.items || []).map(item => <div className="confirmationItem" key={item.id}>
        <span><b>{item.product_name}</b><small>Quantity: {item.quantity} · {money(item.unit_price)} each</small></span><strong>{money(Number(item.unit_price) * item.quantity)}</strong>
      </div>)}</div>
      <div className="confirmationTotal"><span>Paid online</span><b>{money(order?.total_amount)}</b></div>
      <div className="confirmationAddress"><span>DELIVERING TO</span><b>{address.full_name}</b><p>{address.address_line}{address.landmark ? `, ${address.landmark}` : ''}<br />{address.city}, {address.state} {address.pincode}<br />Phone: {address.phone}</p></div>
      <div className="confirmationActions"><button className="primary" onClick={onOrders}>View my orders</button><button className="outline" onClick={onShop}>Continue shopping</button></div>
    </div>
  </section>;
}
