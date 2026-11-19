import { useState } from 'react';

export default function SellerLogin({ onSubmit, busy, error, notice }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  return <main className="sellerLoginPage">
    <a className="sellerBrand sellerLoginBrand" href="/" aria-label="ShopSphere home"><span>S</span> ShopSphere</a>
    <section className="sellerLoginCard">
      <div className="sellerLoginIcon">S</div>
      <small className="sellerLoginEyebrow">SELLER WORKSPACE</small>
      <h1>Welcome back</h1>
      <p>Sign in to manage your ShopSphere store.</p>
      {notice && <div className="sellerLoginNotice" role="status">{notice}</div>}
      {error && <div className="sellerLoginError" role="alert">{error}</div>}
      <form onSubmit={event => { event.preventDefault(); onSubmit(identifier.trim(), password); }}>
        <label>Full name, email, or mobile number<input autoComplete="username" autoFocus required value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder="Enter your seller account details" /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Your password" /></label>
        <button className="sellerLoginSubmit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to seller dashboard'} <span>→</span></button>
      </form>
      <div className="sellerLoginFooter"><span>New to ShopSphere?</span><a href="/seller/register">Create a seller account</a></div>
    </section>
    <footer>© {new Date().getFullYear()} ShopSphere · Seller workspace</footer>
  </main>;
}
