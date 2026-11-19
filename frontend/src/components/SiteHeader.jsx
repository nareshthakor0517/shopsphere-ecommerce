export default function SiteHeader({ user, cartCount, orderCount = 0, search, activePage, onSearch, onNavigate, onLogout }) {
  const displayName = user?.full_name || user?.username;
  const shop = () => { onNavigate('shop'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const navItems = [
    ['shop', 'Home'], ['collection', 'Shop'], ['categories', 'Categories'], ['brands', 'Brands'],
    ['support', 'Support'],
  ];
  return <header className="storeHeader">
    <div className="storeHeaderInner storeMainNav">
      <button className="brandMark" onClick={shop} aria-label="ShopSphere home"><span className="brandGlyph">S</span>
        <span className="brandWords"><span className="brandName">Shop<span>Sphere</span></span><small>SMART TECH. BETTER LIFE.</small></span></button>
      <nav aria-label="Main navigation">
        {navItems.map(([page, label]) => <button key={page} className={`navLink ${activePage === page ? 'active' : ''}`}
          aria-current={activePage === page ? 'page' : undefined} onClick={() => page === 'shop' ? shop() : onNavigate(page)}>{label}</button>)}
      </nav>
      <div className="storeActions">
        <div className="headerSearch isOpen">
          <span className="iconButton searchIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.2 4.2" /></svg>
          </span>
          <input id="header-product-search" aria-label="Search products" placeholder="Search products..." value={search}
            onChange={event => onSearch(event.target.value)} />
          {search && <button className="clearSearch" aria-label="Clear search" title="Clear search" onClick={() => { onSearch(''); onNavigate('shop'); }}>×</button>}
        </div>
        {user ? <>
          <button className="iconButton" aria-label="Wishlist" title="Wishlist" onClick={() => onNavigate('wishlist')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 8.8c0 4.1-8.4 10-8.4 10s-8.4-5.9-8.4-10A4.4 4.4 0 0 1 12 6.3a4.4 4.4 0 0 1 8.4 2.5Z" /></svg>
          </button>
          {user.role === 'user' && <button className={`myOrdersLink ${activePage === 'orders' ? 'active' : ''}`} aria-label={`My orders, ${orderCount} orders`} title="My orders" onClick={() => onNavigate('orders')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 7 8.5-4 8.5 4v10l-8.5 4-8.5-4V7Z" /><path d="m3.8 7.2 8.2 4 8.2-4M12 11.2V21M8 5l8.5 4" /></svg><span>My orders</span><b>{orderCount}</b>
          </button>}
          <button className="iconButton userIcon" aria-label={`Profile: ${displayName}`} title={`Profile: ${displayName}`} onClick={() => onNavigate('profile')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.5-3.5 3.2-5.5 7-5.5s6.5 2 7 5.5" /></svg>
          </button>
          <button className="iconButton cartIcon" aria-label={`Shopping cart, ${cartCount} items`} title={`Shopping cart (${cartCount})`} onClick={() => onNavigate('cart')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.5L21 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg><span>{cartCount}</span>
          </button>
        </> : <>
          <button className="iconButton userIcon" aria-label="Sign in to your account" title="Sign in" onClick={() => onNavigate('login')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.5-3.5 3.2-5.5 7-5.5s6.5 2 7 5.5" /></svg>
          </button>
          <button className="iconButton cartIcon" aria-label="Sign in to use your shopping cart" title="Shopping cart" onClick={() => onNavigate('login')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.5L21 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg><span>0</span>
          </button>
        </>}
        {['admin', 'sales'].includes(user?.role) && <button className="staffLink" onClick={() => onNavigate('dashboard')}>Workspace</button>}
        {user && <button className="signOutLink" onClick={onLogout}>Sign out</button>}
      </div>
    </div>
  </header>;
}
