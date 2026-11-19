import { resolveImageUrl } from "../imageUrl";

const money = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const label = value => value.replaceAll('_', ' ');
const orderNumber = id => `SS-${String(id).padStart(6, '0')}`;

function DashboardChart({ orders, user }) {
  const series = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const total = orders.filter(order => order.status !== 'cancelled' && new Date(order.created_at).toDateString() === date.toDateString())
      .reduce((sum, order) => sum + (user.role === 'sales'
        ? (order.items || []).filter(item => item.seller === user.id).reduce((itemSum, item) => itemSum + Number(item.unit_price) * Number(item.quantity), 0)
        : Number(order.total_amount)), 0);
    return { day: date.toLocaleDateString('en', { weekday: 'short' }), total };
  });
  const max = Math.max(...series.map(point => point.total), 1);
  const points = series.map((point, index) => `${index * 100},${104 - (point.total / max) * 80}`).join(' ');

  return <section className="analyticsCard">
    <div className="panelHeading"><div><h3>Sales &amp; revenue</h3><p>Order activity from the last 7 days</p></div><span className="chartLegend"><i /> Revenue</span></div>
    <div className="chartWrap"><div className="chartAxis"><span>{money(max)}</span><span>{money(max / 2)}</span><span>₹0</span></div>
      <svg className="revenueChart" viewBox="0 0 600 120" preserveAspectRatio="none" role="img" aria-label="Revenue chart for the last seven days">
        <defs><linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#5943d6" stopOpacity=".25" /><stop offset="100%" stopColor="#5943d6" stopOpacity="0" /></linearGradient></defs>
        <path d={`M ${points.replaceAll(' ', ' L ')} L 600,120 L 0,120 Z`} fill="url(#revenue-fill)" />
        <polyline points={points} fill="none" stroke="#5842d5" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        {series.map((point, index) => <circle key={point.day} cx={index * 100} cy={104 - (point.total / max) * 80} r="3.5" fill="#fff" stroke="#5842d5" strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
      </svg>
    </div>
    <div className="chartDays">{series.map(point => <span key={point.day}>{point.day}</span>)}</div>
  </section>;
}

function ProductTable({ products, user, onEdit, onDelete, onOpenProduct }) {
  return <section className="dataCard">
    <div className="panelHeading"><div><h3>{user.role === 'admin' ? 'Products catalog' : 'Your products'}</h3><p>Keep an eye on your live inventory</p></div>
      <span className="tableCount">{products.length} products</span></div>
    {!products.length ? <p className="empty">No products yet. Add your first product to get started.</p> :
      <div className="tableScroll"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{products.slice(0, 8).map(product => <tr key={product.id}>
          <td><button className="tableProduct" onClick={() => onOpenProduct(product)}>
            <span className="tableThumb">{product.image_url ? <img src={resolveImageUrl(product.image_url)} alt="" /> : '✦'}</span>
            <span><b>{product.name}</b><small>#{product.id}</small></span>
          </button></td>
          <td>{product.category}</td><td>{money(product.price)}</td><td>{product.stock}</td>
          <td><span className={`tableStatus ${product.stock < 1 ? 'isOut' : product.stock < 5 ? 'isLow' : ''}`}>{product.stock < 1 ? 'Out of stock' : product.stock < 5 ? 'Low stock' : 'In stock'}</span></td>
          <td><div className="tableActions"><button className="tableAction" onClick={() => onEdit(product)}>Edit</button>
            <button className="tableAction tableDelete" onClick={() => onDelete(product.id)}>Remove</button></div></td>
        </tr>)}</tbody></table></div>}
  </section>;
}

function OrdersTable({ orders, user }) {
  const rows = orders.slice(0, 6).flatMap(order => (order.items || [])
    .filter(item => user?.role !== 'sales' || Number(item.seller) === Number(user.id))
    .map(item => ({ order, item })));
  return <section className="dataCard transactionsCard"><div className="panelHeading"><div><h3>Recent orders</h3><p>Latest customer transactions</p></div></div>
    {!rows.length ? <p className="empty">No orders have been placed yet.</p> :
      <div className="tableScroll recentOrdersScroll"><table className="recentOrdersTable"><thead><tr><th>Order ID</th><th>Product</th><th>Qty</th><th>Price</th><th>Status</th></tr></thead><tbody>
        {rows.map(({ order, item }) => <tr key={`${order.id}-${item.id}`}><td><b className="recentOrdersId">{orderNumber(order.id)}</b></td>
          <td><div className="recentOrderProduct"><span>{item.product_image ? <img src={resolveImageUrl(item.product_image)} alt="" loading="lazy" /> : '✦'}</span><b>{item.product_name}</b></div></td>
          <td>{item.quantity}</td><td>{money(Number(item.unit_price) * Number(item.quantity))}</td>
          <td><span className={`tableStatus ${order.status === 'cancelled' ? 'isOut' : ''}`}>{order.status.replaceAll('_', ' ')}</span></td></tr>)}
      </tbody></table></div>}
  </section>;
}

export default function DashboardPanel({ user, stats, orders, products, onRefresh, onProfile, onAddProduct, onEdit, onDelete, onOpenProduct, loading }) {
  const isAdmin = user?.role === 'admin';
  const isSeller = user?.role === 'sales';
  if (!isAdmin && !isSeller) return <section className="customerDashboard">
    <div className="dashboardWelcome"><div><small>ACCOUNT OVERVIEW</small><h2>Welcome back, {user?.full_name || user?.username}.</h2><p>Your ShopSphere activity at a glance.</p></div>
      <div className="customerDashboardActions"><button className="dashboardProfileLink" onClick={onProfile} aria-label="Back to your profile" title="Back to your profile">← <span>Your profile</span></button>
        <button className="outline" onClick={onRefresh} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button></div></div>
    <div className="stats">{Object.entries(stats).map(([key, value]) => <div className="stat" key={key}><small>{label(key)}</small><b>{value}</b></div>)}</div>
    <OrdersTable orders={orders} user={user} />
  </section>;

  const roleProducts = isSeller ? products.filter(product => product.seller === user.id) : products;
  const sellerOrders = isSeller ? orders.filter(order => order.status !== 'cancelled' && (order.items || []).some(item => Number(item.seller) === Number(user.id))) : [];
  const sellerItems = isSeller ? sellerOrders.flatMap(order => (order.items || []).filter(item => Number(item.seller) === Number(user.id))) : [];
  const revenue = isAdmin ? Number(stats.total_sales || 0) : sellerItems.reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0);
  const unitsSold = sellerItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const metrics = isAdmin
    ? [['Total revenue', money(revenue), '↗ Store lifetime sales'], ['Total orders', stats.total_orders || 0, 'Orders placed'], ['Products', stats.total_products || products.length, 'Live catalog'], ['Customers', stats.total_users || 0, 'Registered accounts']]
    : [['Revenue', money(revenue), 'Paid, non-cancelled sales'], ['Products', roleProducts.length, 'Your listed products'], ['Orders', sellerOrders.length, 'Orders with your items'], ['Units sold', unitsSold, 'Your paid units'], ['Low stock', roleProducts.filter(product => Number(product.stock) < 5).length, 'Your items below 5 in stock']];

  return <section className={`staffDashboard ${isAdmin ? 'adminDashboard' : 'sellerDashboard'}`}>
    <div className="dashboardWelcome"><div><small>{isAdmin ? 'CONTROL CENTER' : 'SELLER WORKSPACE'}</small>
      <h2>{isAdmin ? 'Welcome back, Admin' : `Welcome back, ${user.full_name || user.username}`} <span>{isAdmin ? '✦' : '👋'}</span></h2>
      <p>{isAdmin ? 'Here is what is happening across your store.' : 'Manage your products, inventory and sales in one place.'}</p></div>
      <div className="dashboardButtons"><button className="outline refreshButton" onClick={onRefresh} disabled={loading}>{loading ? 'Loading…' : '↻ Refresh'}</button>
        <button className="primary" onClick={onAddProduct}>＋ Add new product</button></div>
    </div>
    <div className="stats dashboardStats">{metrics.map(([title, value, caption], index) => <div className="metricCard" key={title}>
      <div className={`metricIcon metricIcon-${index}`}>{['₹', '▣', '↗', '♙'][index]}</div><small>{title}</small><b>{value}</b><span>{caption}</span>
    </div>)}</div>
    <div className="dashboardColumns"><DashboardChart orders={orders} user={user} />
      <section className="categoryAnalytics"><div className="panelHeading"><div><h3>Catalog snapshot</h3><p>Inventory by category</p></div></div>
        {roleProducts.length ? <div className="categoryBreakdown">{[...new Set(roleProducts.map(product => product.category))].slice(0, 5).map((category, index) => {
          const count = roleProducts.filter(product => product.category === category).length;
          return <div className="categoryBreakdownRow" key={category}><span className={`categoryDot dot-${index % 5}`} /><span>{category}</span><b>{count}</b>
            <i><span style={{ width: `${Math.max(8, count / roleProducts.length * 100)}%` }} /></i></div>;
        })}</div> : <p className="empty">Add products to see your catalog breakdown.</p>}
        <div className="categoryTotal"><span>Total listed</span><b>{roleProducts.length} products</b></div>
      </section>
    </div>
    <div className="dashboardBottom"><ProductTable products={roleProducts} user={user} onEdit={onEdit} onDelete={onDelete} onOpenProduct={onOpenProduct} />
      <OrdersTable orders={orders} user={user} /></div>
  </section>;
}
