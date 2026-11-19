import { useState } from 'react';

const topics = [
  { title: 'How can I track my order?', body: 'Sign in and open My orders to see each order, payment status and the latest fulfilment step.' },
  { title: 'Which payment methods are available?', body: 'Payments are handled securely through Razorpay. The payment methods available to you appear during checkout.' },
  { title: 'When will my order be processed?', body: 'After payment is confirmed, the seller updates the order progress. You can follow the latest status in My orders.' },
  { title: 'Can I cancel or return a product?', body: 'Cancellation and return options depend on the order status and the product policy. Check your order and the product details for the applicable information.' },
  { title: 'How do I manage my account?', body: 'Sign in to view your profile and order history. If you cannot access your account, use the sign-in page to check your account status.' },
];

export default function SupportPage({ user, onNavigate }) {
  const [openTopic, setOpenTopic] = useState(0);
  const signedInCustomer = user?.role === 'user';
  const orderDestination = signedInCustomer ? 'orders' : 'login';
  const accountDestination = user ? 'profile' : 'login';
  const cards = [
    { icon: '↗', title: 'Orders & delivery', description: 'Track progress and review order details.', action: 'View my orders', destination: orderDestination },
    { icon: '▣', title: 'Payments', description: 'Check payment status and checkout details.', action: 'Open order history', destination: orderDestination },
    { icon: '♡', title: 'Products & returns', description: 'Review product information and policies.', action: 'Browse products', destination: 'shop' },
    { icon: '♙', title: 'Account access', description: 'View your profile or sign in to continue.', action: user ? 'View profile' : 'Sign in', destination: accountDestination },
  ];

  return <section className="supportPage">
    <header className="supportHero">
      <div className="supportHeroCopy"><small>SHOPSPHERE HELP CENTER</small><h1>Support that gets you moving.</h1><p>Find help with orders, delivery, payments and your account—all in one place.</p>
        <button className="primary" onClick={() => onNavigate(signedInCustomer ? 'orders' : 'login')}>{signedInCustomer ? 'Go to my orders' : 'Sign in for order help'} <span>→</span></button>
      </div>
      <div className="supportHeroIcon" aria-hidden="true"><svg viewBox="0 0 120 120"><path d="M20 63v-8a40 40 0 0 1 80 0v8" /><rect x="14" y="56" width="19" height="31" rx="9" /><rect x="87" y="56" width="19" height="31" rx="9" /><path d="M99 83c0 15-12 23-30 23h-9" /><circle cx="55" cy="106" r="5" /></svg><span>?</span></div>
    </header>

    <section className="supportHelpOptions" aria-labelledby="support-options-title">
      <div className="supportSectionTitle"><small>QUICK SUPPORT</small><h2 id="support-options-title">What can we help with?</h2></div>
      <div className="supportHelpGrid">{cards.map(card => <article className="supportHelpCard" key={card.title}>
        <span className="supportHelpIcon" aria-hidden="true">{card.icon}</span><h3>{card.title}</h3><p>{card.description}</p>
        <button onClick={() => onNavigate(card.destination)}>{card.action}<span aria-hidden="true">→</span></button>
      </article>)}</div>
    </section>

    <div className="supportColumns">
      <section className="supportTopics"><div className="supportSectionTitle"><small>HELP CENTER</small><h2>Frequently asked questions</h2><p>Quick answers to common ShopSphere questions.</p></div>
        {topics.map((topic, index) => <article className={`faqItem ${openTopic === index ? 'open' : ''}`} key={topic.title}>
          <button aria-expanded={openTopic === index} onClick={() => setOpenTopic(current => current === index ? -1 : index)}><span>{topic.title}</span><b>{openTopic === index ? '−' : '+'}</b></button>
          {openTopic === index && <p>{topic.body}</p>}
        </article>)}
      </section>
      <aside className="supportQuickLinks"><small>KEEP EXPLORING</small><h2>Useful links</h2>
        <button onClick={() => onNavigate('shop')}><span className="supportLinkIcon">⌕</span><span><b>Browse the shop</b><small>Explore products across the catalog</small></span><i>→</i></button>
        <button onClick={() => onNavigate(signedInCustomer ? 'cart' : 'login')}><span className="supportLinkIcon">▱</span><span><b>{signedInCustomer ? 'Open your cart' : 'Sign in to your account'}</b><small>{signedInCustomer ? 'Review your items and checkout' : 'Access your orders and account'}</small></span><i>→</i></button>
        <div className="supportNote"><span>✓</span><p><b>Secure checkout</b><br />Payments are handled through Razorpay. Your available payment methods appear at checkout.</p></div>
      </aside>
    </div>
  </section>;
}
