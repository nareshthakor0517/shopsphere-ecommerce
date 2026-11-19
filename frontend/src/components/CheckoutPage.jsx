import { useState } from 'react';
import { resolveImageUrl } from '../imageUrl';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const normalizedPhone = value => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : value || '';
};

const blankAddress = user => ({
  full_name: user?.full_name || user?.username || '',
  phone: normalizedPhone(user?.mobile_number),
  address_line: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  delivery_note: '',
});

export default function CheckoutPage({ user, items, source, onBack, onSubmit, busy }) {
  const address = blankAddress(user);
  const [form, setForm] = useState(address);
  const [errors, setErrors] = useState({});
  const total = items.reduce((sum, item) => sum + Number(item.product_detail?.price || 0) * item.quantity, 0);
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const submit = event => {
    event.preventDefault();
    const nextErrors = {};
    if (form.phone.replace(/\D/g, '').length !== 10) nextErrors.phone = 'Enter a valid 10 digit mobile number.';
    if (!/^\d{6}$/.test(form.pincode.trim())) nextErrors.pincode = 'Enter a valid 6 digit PIN code.';
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) onSubmit(form);
  };
  const field = (name, label, props = {}) => {
    const { wide, ...inputProps } = props;
    return <label className={`checkoutField ${wide ? 'checkoutWide' : ''} ${errors[name] ? 'hasError' : ''}`} key={name}>
      <span>{label}</span><input name={name} value={form[name]} onChange={update} required={!['landmark', 'delivery_note'].includes(name)} {...inputProps} />
      {errors[name] && <small>{errors[name]}</small>}
    </label>;
  };

  return <section className="checkoutPage">
    <button className="checkoutBack" onClick={onBack}>← Back to {source === 'cart' ? 'cart' : 'product'}</button>
    <div className="checkoutHeading"><span>ALMOST YOURS</span><h1>Delivery & payment</h1><p>Where should we send your order?</p></div>
    <div className="checkoutLayout">
      <form className="checkoutForm" onSubmit={submit}>
        <section className="checkoutFormSection">
          <div className="checkoutSectionHeading"><span>01</span><div><h2>Delivery address</h2><p>Enter the address where you’d like your order delivered.</p></div></div>
          <div className="checkoutFields">
            {field('full_name', 'Full name', { autoComplete: 'name' })}
            {field('phone', 'Mobile number', { type: 'tel', autoComplete: 'tel', placeholder: '10 digit mobile number' })}
            {field('address_line', 'House / flat, building and street', { autoComplete: 'street-address', wide: true })}
            {field('landmark', 'Landmark (optional)', { wide: true })}
            {field('city', 'City / town', { autoComplete: 'address-level2' })}
            {field('state', 'State', { autoComplete: 'address-level1' })}
            {field('pincode', 'PIN code', { inputMode: 'numeric', autoComplete: 'postal-code', maxLength: 6, placeholder: '6 digit PIN code' })}
            {field('delivery_note', 'Delivery instructions (optional)', { wide: true, placeholder: 'Anything the delivery partner should know?' })}
          </div>
        </section>
        <section className="checkoutFormSection paymentSection">
          <div className="checkoutSectionHeading"><span>02</span><div><h2>Payment method</h2><p>Choose how you’d like to pay.</p></div></div>
          <label className="paymentChoice selected"><input type="radio" name="payment" value="online" checked readOnly /><span className="paymentChoiceIcon">▣</span><span><b>Online payment</b><small>Secure payment via Razorpay · UPI, cards and net banking</small></span><i>Selected</i></label>
          <label className="paymentChoice disabled"><input type="radio" name="payment" value="cod" disabled /><span className="paymentChoiceIcon">⌂</span><span><b>Cash on Delivery</b><small>Not available yet</small></span><i>Coming soon</i></label>
          <p className="checkoutSecureNote"><span>▣</span> Your payment is encrypted and securely processed by Razorpay.</p>
        </section>
        <button className="primary checkoutPayButton" type="submit" disabled={busy}>{busy ? 'Preparing secure payment…' : `Continue to payment · ${money(total)}`} <span aria-hidden="true">→</span></button>
      </form>

      <aside className="checkoutSummary">
        <div className="checkoutSummaryHeading"><h2>Order summary</h2><span>{items.length} {items.length === 1 ? 'item' : 'items'}</span></div>
        <div className="checkoutSummaryItems">{items.map((item, index) => {
          const product = item.product_detail || {};
          const image = resolveImageUrl(product.image_url || product.image);
          return <div className="checkoutSummaryItem" key={`${product.id || index}-${index}`}>
            <div className="checkoutSummaryImage">{image ? <img src={image} alt={product.name || ''} /> : <span aria-hidden="true">✦</span>}<i>{item.quantity}</i></div>
            <div><b>{product.name}</b><small>{money(product.price)} each</small></div>
            <strong>{money(Number(product.price || 0) * item.quantity)}</strong>
          </div>;
        })}</div>
        <div className="checkoutTotal"><span>Subtotal</span><b>{money(total)}</b></div>
        <div className="checkoutDelivery"><span>Delivery</span><b>Calculated after PIN code</b></div>
        <div className="checkoutGrandTotal"><span>Total payable</span><b>{money(total)}</b></div>
        <p className="checkoutTaxNote">Inclusive of applicable taxes. Final delivery charges, if any, will be shown before payment.</p>
      </aside>
    </div>
  </section>;
}
