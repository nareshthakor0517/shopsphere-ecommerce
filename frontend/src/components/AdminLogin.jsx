import { useState } from 'react';

export default function AdminLogin({ onSubmit, busy, error, notice }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  return <main className="sellerLoginPage adminLoginPage">
    <a className="sellerBrand sellerLoginBrand" href="/" aria-label="ShopSphere home"><span>S</span> ShopSphere</a>
    <section className="sellerLoginCard">
      <div className="sellerLoginIcon">S</div>
      <small className="sellerLoginEyebrow">ADMINISTRATOR</small>
      <h1>Admin sign in</h1>
      <p>Sign in to review seller applications and manage ShopSphere.</p>
      {notice && <div className="sellerLoginNotice" role="status">{notice}</div>}
      {error && <div className="sellerLoginError" role="alert">{error}</div>}
      <form onSubmit={event => { event.preventDefault(); onSubmit(identifier.trim(), password); }}>
        <label>Admin username or email<input autoComplete="username" autoFocus required value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder="Enter your admin username or email" /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Your password" /></label>
        <button className="sellerLoginSubmit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to admin dashboard'} <span>→</span></button>
      </form>
    </section>
    <footer>© {new Date().getFullYear()} ShopSphere · Admin workspace</footer>
  </main>;
}
