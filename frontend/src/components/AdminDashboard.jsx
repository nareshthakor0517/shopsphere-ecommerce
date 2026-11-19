import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import { resolveImageUrl } from "../imageUrl";
import "./AdminDashboardDesign.css";

const NAV = [["Platform", [["dashboard", "Dashboard", "dash"], ["sellers", "Sellers", "store"], ["requests", "Seller Approvals", "reqs"], ["users", "Users", "customers"], ["orders", "Orders", "orders"], ["products", "Products", "products"], ["payouts", "Payouts", "wallet"]]]];
const ROUTES = ["dashboard", "sellers", "requests", "users", "orders", "products", "payouts", "settings"];
const ICONS = {
  dash: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  orders: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  products: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
  customers: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6"/>',
  store: '<path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6"/>',
  reqs: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.2-.8.2-1.2z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>', moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
  sun: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
};
const Icon = ({ name }) => <svg className="i" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[name] || ICONS.dash }} />;
const formatMoney = value => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const formatDate = value => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const initials = name => String(name || "?").trim().split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
const listData = data => Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
const readAdminPrefs = key => { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } };
const adminNoticeTypes = ["orders", "products", "users", "sellerApplications"];
const noticeRoute = type => ({ orders: "orders", products: "products", users: "users", sellerApplications: "requests" }[type] || "dashboard");
const sellerStatus = user => user.seller_profile?.approval_status || "pending";
const statusLabel = status => ({ pending: "Pending", approved: "Approved", rejected: "Rejected", revoked: "Revoked", active: "Active", pending_approval: "Pending", out_of_stock: "Out of stock", draft: "Draft" }[status] || status || "—");
const statusColor = status => ({ pending: "#e8a317", pending_approval: "#e8a317", approved: "#22b345", active: "#22b345", rejected: "#e5484d", revoked: "#e5484d", cancelled: "#e5484d", shipped: "#3b82f6", processing: "#7a68e8", paid: "#22b345" }[String(status || "").toLowerCase()] || "#8b8a99");
const Badge = ({ value }) => <span className="bd" style={{ color: statusColor(value), background: `${statusColor(value)}22` }}>{statusLabel(value)}</span>;
function ProductThumb({ product, image, alt = "Product", size = 42 }) {
  const candidates = [...new Set([image, product?.image_url, ...(Array.isArray(product?.image_urls) ? product.image_urls : [])].filter(Boolean))];
  const [index, setIndex] = useState(0);
  useEffect(() => { setIndex(0); }, [candidates.join("|")]);
  return candidates[index]
    ? <img className="adminProductThumb" style={{ width: size, height: size }} src={resolveImageUrl(candidates[index])} alt={alt} onError={() => setIndex(current => current + 1)} />
    : <span className="adminProductThumb adminProductThumbEmpty" style={{ width: size, height: size }} aria-label={`${alt} image unavailable`}>📦</span>;
}

function Table({ columns, rows, empty = "No records found", className = "" }) {
  const grid = columns.map(column => column.width || "minmax(0, 1fr)").join(" ");
  return <div className={`gt ${className}`}>
    <div className={`gt-h ${className}`} style={{ gridTemplateColumns: grid }}>{columns.map(column => <span key={column.label}>{column.label}</span>)}</div>
    {rows.map(row => <div className={`gt-r ${className}`} key={row.id} style={{ gridTemplateColumns: grid }}>
      {columns.map(column => <div key={column.label} data-l={column.label}>{column.render(row)}</div>)}
    </div>)}
    {!rows.length && <div className="empty">{empty}</div>}
  </div>;
}
const Search = ({ value, onChange, placeholder }) => <label className="search"><Icon name="search" /><input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></label>;
const Head = ({ title, children }) => <div className="top"><h2>{title}</h2>{children}</div>;
const Tabs = ({ value, onChange, items }) => <div className="cats">{items.map(([key, label]) => <button key={key} className={`cat ${value === key ? "on" : ""}`} onClick={() => onChange(key)}>{label}</button>)}</div>;
const Drawer = ({ onClose, children, className = "" }) => <div className="drw-bg" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className={`drw ${className}`} role="dialog" aria-modal="true">{children}</section></div>;

function SellerDetails({ seller, onClose, onReview, reviewing }) {
  const profile = seller.seller_profile || {};
  const [loadingField, setLoadingField] = useState("");
  const [docPreviews, setDocPreviews] = useState({});
  const docs = [["profile_photo", "Profile photo"], ["pan_document", "PAN document"], ["gst_certificate", "GST certificate"], ["address_proof", "Address proof"], ["bank_proof", "Bank proof"]];
  useEffect(() => {
    let cancelled = false;
    const objectUrls = [];
    docs.filter(([field]) => profile.documents?.[field]).forEach(async ([field]) => {
      try {
        const { data } = await api.get(`/admin/users/${seller.id}/seller-document/`, { params: { field }, responseType: "blob" });
        const url = URL.createObjectURL(data);
        if (cancelled) { URL.revokeObjectURL(url); return; }
        objectUrls.push(url);
        setDocPreviews(current => ({ ...current, [field]: { url, blob: data, type: data.type || "" } }));
      } catch { /* Keep the document card and download fallback visible when preview fails. */ }
    });
    return () => { cancelled = true; objectUrls.forEach(url => URL.revokeObjectURL(url)); };
  }, [seller.id]);
  const details = [
    ["Email", seller.email], ["Mobile", seller.mobile_number], ["Business type", profile.business_type === "registered" ? "Registered business" : "Individual seller"],
    ["Address", [profile.business_address, profile.city, profile.state, profile.pin_code, profile.country].filter(Boolean).join(", ")],
    ["Description", profile.business_description], ["GST number", profile.tax_identifier], ["PAN number", profile.pan_number],
    ["Account holder", profile.account_holder_name], ["Bank", profile.bank_name],
    ["Account number", profile.account_number ? `•••• ${profile.account_number.slice(-4)}` : ""], ["IFSC code", profile.ifsc_code], ["UPI ID", profile.upi_id],
  ].filter(([, value]) => value);
  const download = async field => {
    setLoadingField(field);
    try {
      const blob = docPreviews[field]?.blob || (await api.get(`/admin/users/${seller.id}/seller-document/`, { params: { field }, responseType: "blob" })).data;
      const url = docPreviews[field]?.url || URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `${seller.username}-${field}`; anchor.click();
      if (!docPreviews[field]) URL.revokeObjectURL(url);
    } finally { setLoadingField(""); }
  };
  const status = sellerStatus(seller);
  return <Drawer onClose={onClose}>
    <div className="ph"><div><h3>{profile.store_name || seller.full_name || seller.username}</h3><p style={{ marginTop: 6 }}>{seller.full_name} · <Badge value={status} /></p></div><button className="ibs" onClick={onClose} aria-label="Close seller details">×</button></div>
    <p><small>{seller.email} · {seller.mobile_number || "No mobile number"}<br />Applied {formatDate(profile.created_at || seller.date_joined)}</small></p>
    <div className="dg">{details.map(([label, value]) => <div className="dr" key={label}><span>{label}</span><span>{value}</span></div>)}</div>
    <h3 style={{ margin: "26px 0 0", fontSize: 22 }}>Uploaded documents</h3>
    <div className="dc">{docs.map(([field, label]) => <div className="dd" key={field}><b>{label}</b>{profile.documents?.[field]
      ? <>{docPreviews[field] ? (docPreviews[field].type.includes("pdf") ? <iframe title={label} src={docPreviews[field].url} /> : <img src={docPreviews[field].url} alt={label} />) : <div className="docPreviewLoading">Loading preview…</div>}<button className="btn o sm" disabled={loadingField === field} onClick={() => download(field)}>{loadingField === field ? "Loading…" : "Download document"}</button></>
      : <small>Not provided</small>}</div>)}</div>
    <div className="btns" style={{ marginTop: 22, marginLeft: 0 }}>
      {status !== "approved" && <button className="btn p" disabled={reviewing} onClick={() => onReview(seller, "approved")}>{reviewing ? "Saving…" : status === "pending" ? "Approve seller" : "Approve again"}</button>}
      {status === "pending" && <button className="btn o" disabled={reviewing} onClick={() => onReview(seller, "rejected")}>Reject</button>}
      {status === "approved" && <button className="btn o" disabled={reviewing} onClick={() => onReview(seller, "revoked")}>Revoke approval</button>}
    </div>
  </Drawer>;
}

function CustomerDetails({ customer, products, onClose }) {
  const address = customer.adminOrders.find(order => order.delivery_address && Object.keys(order.delivery_address).length)?.delivery_address || {};
  const addressFields = Object.entries(address).filter(([, value]) => value !== null && value !== undefined && String(value).trim() && typeof value !== "object");
  const itemRows = customer.adminOrders.flatMap(order => (order.items || []).map(item => ({ ...item, orderId: order.id, orderStatus: order.status, orderDate: order.created_at })));
  return <Drawer onClose={onClose} className="customerAdminDrawer">
    <div className="ph"><div><small>Customer profile</small><h3>{customer.full_name || customer.username}</h3><p>{customer.email || "Email unavailable"}</p></div><button className="ibs" onClick={onClose} aria-label="Close customer details">×</button></div>
    <div className="customerAdminSummary">
      <div><small>Customer ID</small><b>{customer.id}</b></div><div><small>Orders placed</small><b>{customer.adminOrders.length}</b></div><div><small>Total spend</small><b>{formatMoney(customer.adminSpend)}</b></div>
      {customer.mobile_number && <div><small>Mobile</small><b>{customer.mobile_number}</b></div>}
      <div><small>Joined</small><b>{formatDate(customer.date_joined)}</b></div>
      {addressFields.map(([key, value]) => <div key={key}><small>{key.replaceAll("_", " ")}</small><b>{String(value)}</b></div>)}
    </div>
    <h3 className="customerAdminOrdersTitle">Recent orders</h3>
    <Table rows={itemRows} empty="This customer has not placed any orders" columns={[
      { label: "Order ID", width: "92px", render: item => <b>#{item.orderId}</b> },
      { label: "Product", width: "1.6fr", render: item => { const product = products.find(entry => Number(entry.id) === Number(item.product)); return <div className="adminOrderProduct"><ProductThumb product={product} image={item.product_image} alt={item.product_name || "Product"} /><span>{item.product_name || product?.name || "Product"}</span></div>; } },
      { label: "Qty", width: "60px", render: item => item.quantity },
      { label: "Price", render: item => formatMoney(Number(item.unit_price) * Number(item.quantity)) },
      { label: "Status", render: item => <Badge value={item.orderStatus} /> },
      { label: "Date", render: item => formatDate(item.orderDate) },
    ]} />
  </Drawer>;
}

function AdminSettings({ user, settings, onSave }) {
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(settings), [settings]);
  const update = (key, value) => { setSaved(false); setDraft(current => ({ ...current, [key]: value })); };
  const updateNotice = (key, value) => { setSaved(false); setDraft(current => ({ ...current, notifications: { ...current.notifications, [key]: value } })); };
  return <>
    <Head title="Settings" />
    <div className="adminSettingsGrid">
      <section className="panel set adminSettingsCard"><div className="ph"><div><h3>Administrator profile</h3><small>Account details used for this dashboard.</small></div></div>
        <div className="kv"><span>Name</span><b>{user?.full_name || user?.username || "Admin"}</b></div>
        <div className="kv"><span>Email</span><b>{user?.email || "—"}</b></div>
        <div className="kv"><span>Role</span><Badge value="Admin" /></div>
        <p className="settingsHelp">Account identity is managed by your administrator account.</p>
      </section>
      <section className="panel set adminSettingsCard"><div className="ph"><div><h3>Appearance</h3><small>Choose the admin dashboard theme.</small></div></div>
        <label htmlFor="admin-theme">Dashboard theme</label><select id="admin-theme" className="in" value={draft.theme} onChange={event => update("theme", event.target.value)}><option value="light">Light</option><option value="dark">Dark</option></select>
      </section>
      <section className="panel set adminSettingsCard adminNotificationSettings"><div className="ph"><div><h3>Notifications</h3><small>Choose which platform activity appears in the notification menu.</small></div></div>
        <label className="tg2"><span><b>Pause all notifications</b><small>Keep existing alerts, but stop showing new alerts until resumed.</small></span><input type="checkbox" checked={Boolean(draft.notificationsPaused)} onChange={event => update("notificationsPaused", event.target.checked)} /></label>
        {[["orders", "Orders and order status changes"], ["products", "New products"], ["users", "New users and account access changes"], ["sellerApplications", "Seller applications"]].map(([key, label]) => <label className={`tg2 ${draft.notificationsPaused ? "disabled" : ""}`} key={key}><span>{label}</span><input type="checkbox" checked={draft.notifications?.[key] !== false} disabled={Boolean(draft.notificationsPaused)} onChange={event => updateNotice(key, event.target.checked)} /></label>)}
      </section>
      <div className="adminSettingsSave"><span>{saved ? "Settings saved on this device." : "Changes apply to this admin dashboard."}</span><button className="btn p" onClick={() => { onSave(draft); setSaved(true); }}>Save settings</button></div>
    </div>
  </>;
}

export default function AdminDashboard({ user, onLogout }) {
  const adminPrefsKey = `shopsphere-admin-settings-${user?.id || "me"}`;
  const adminNoticesKey = `shopsphere-admin-notifications-${user?.id || "me"}`;
  const [route, setRoute] = useState(() => ROUTES.includes(location.hash.slice(1)) ? location.hash.slice(1) : "dashboard");
  const [users, setUsers] = useState([]), [products, setProducts] = useState([]), [orders, setOrders] = useState([]), [stats, setStats] = useState({}), [payoutData, setPayoutData] = useState({ sellers: [], payouts: [] });
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(""), [message, setMessage] = useState("");
  const [search, setSearch] = useState(""), [tab, setTab] = useState("Pending"), [selectedSeller, setSelectedSeller] = useState(null), [selectedCustomer, setSelectedCustomer] = useState(null);
  const [reviewingSeller, setReviewingSeller] = useState(null), [deletingSeller, setDeletingSeller] = useState(null), [reviewError, setReviewError] = useState("");
  const [confirmAction, setConfirmAction] = useState(null), [sideOpen, setSideOpen] = useState(false), [collapsed, setCollapsed] = useState(false);
  const [adminSettings, setAdminSettings] = useState(() => ({ theme: "light", notificationsPaused: false, notifications: Object.fromEntries(adminNoticeTypes.map(type => [type, true])), ...readAdminPrefs(`shopsphere-admin-settings-${user?.id || "me"}`) }));
  const [notifications, setNotifications] = useState(() => { try { return JSON.parse(localStorage.getItem(`shopsphere-admin-notifications-${user?.id || "me"}`) || "[]"); } catch { return []; } });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationSnapshot = useRef(null);
  const dark = adminSettings.theme === "dark";
  const [savingProduct, setSavingProduct] = useState(null), [savingUser, setSavingUser] = useState(null);
  const [payoutBusy, setPayoutBusy] = useState(false), [payoutSeller, setPayoutSeller] = useState(""), [payoutAmount, setPayoutAmount] = useState("");
  const sellers = useMemo(() => users.filter(account => account.role === "sales" && account.seller_profile), [users]);
  const customers = useMemo(() => users.filter(account => account.role === "user"), [users]);
  const pendingSellers = sellers.filter(account => sellerStatus(account) === "pending");
  const pendingProducts = products.filter(product => product.status === "pending_approval");
  const unreadNotifications = notifications.filter(item => !item.read);
  const toast = text => { setMessage(text); window.setTimeout(() => setMessage(""), 2600); };

  const refresh = useCallback(async () => {
    setLoading(true); setLoadError("");
    const results = await Promise.allSettled([
      api.get("/admin/users/"), api.get("/products/"), api.get("/orders/"), api.get("/dashboard/"), api.get("/admin/payouts/"),
    ]);
    const failures = results.filter(result => result.status === "rejected");
    if (results[0].status === "fulfilled") setUsers(listData(results[0].value.data));
    if (results[1].status === "fulfilled") setProducts(listData(results[1].value.data));
    if (results[2].status === "fulfilled") setOrders(listData(results[2].value.data));
    if (results[3].status === "fulfilled") setStats(results[3].value.data || {});
    if (results[4].status === "fulfilled") setPayoutData(results[4].value.data || { sellers: [], payouts: [] });
    if (failures.length) setLoadError(failures[0].reason?.response?.data?.detail || "Some dashboard data could not be loaded. Use refresh to try again.");
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    let active = true;
    const syncNotifications = async () => {
      const results = await Promise.allSettled([api.get("/orders/"), api.get("/products/"), api.get("/admin/users/")]);
      if (!active || results.some(result => result.status !== "fulfilled")) return;
      const next = {
        orders: listData(results[0].value.data), products: listData(results[1].value.data), users: listData(results[2].value.data),
      };
      const previous = notificationSnapshot.current;
      notificationSnapshot.current = next;
      setOrders(next.orders);
      setProducts(next.products);
      setUsers(next.users);
      if (!previous) return;
      const events = [];
      const addEvent = (type, title, detail, key) => {
        if (adminSettings.notificationsPaused || adminSettings.notifications?.[type] === false) return;
        events.push({ id: `${key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, key, type, title, detail, createdAt: new Date().toISOString(), route: noticeRoute(type), read: false });
      };
      const previousOrders = new Map(previous.orders.map(order => [String(order.id), order]));
      next.orders.forEach(order => {
        const old = previousOrders.get(String(order.id));
        const id = `SS-${String(order.id).padStart(6, "0")}`;
        if (!old) addEvent("orders", "New order received", `${id} · ${formatMoney(order.total_amount)}`, `order-new-${order.id}`);
        else if (old.status !== order.status) {
          const status = String(order.status || "updated").replaceAll("_", " ");
          addEvent("orders", `Order ${status}`, `${id} · ${orderCustomer(order)} · ${formatMoney(order.total_amount)}`, `order-status-${order.id}-${order.status}`);
        }
      });
      const previousProducts = new Map(previous.products.map(product => [String(product.id), product]));
      next.products.forEach(product => {
        if (!previousProducts.has(String(product.id))) addEvent("products", "New product added", `${product.name || "Product"} · Product #${product.id}`, `product-new-${product.id}`);
      });
      const previousUsers = new Map(previous.users.map(account => [String(account.id), account]));
      next.users.forEach(account => {
        const old = previousUsers.get(String(account.id));
        const label = account.full_name || account.username || `User #${account.id}`;
        if (!old) {
          if (account.role === "sales" && account.seller_profile) addEvent("sellerApplications", "New seller application", `${sellerTitle(account)} · ${account.email || ""}`, `seller-application-${account.id}`);
          else if (account.role === "user") addEvent("users", "New user registered", `${label} · ${account.email || ""}`, `user-new-${account.id}`);
          return;
        }
        if (old.is_active !== account.is_active) addEvent("users", account.is_active ? "User access restored" : "User account blocked", label, `user-access-${account.id}-${account.is_active}`);
        const oldApproval = sellerStatus(old), newApproval = sellerStatus(account);
        if (oldApproval !== newApproval && newApproval === "pending") addEvent("sellerApplications", "New seller application", `${sellerTitle(account)} · ${account.email || ""}`, `seller-application-${account.id}-${account.seller_profile?.created_at || "updated"}`);
      });
      if (events.length) setNotifications(current => [...events, ...current].slice(0, 100));
    };
    syncNotifications();
    const timer = window.setInterval(syncNotifications, 7000);
    return () => { active = false; window.clearInterval(timer); };
  }, [adminSettings]);
  useEffect(() => {
    const sync = () => { const next = location.hash.slice(1); setRoute(ROUTES.includes(next) ? next : "dashboard"); setSideOpen(false); };
    window.addEventListener("hashchange", sync); return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => { localStorage.setItem(adminPrefsKey, JSON.stringify(adminSettings)); }, [adminPrefsKey, adminSettings]);
  useEffect(() => { localStorage.setItem(adminNoticesKey, JSON.stringify(notifications)); }, [adminNoticesKey, notifications]);

  const navigate = next => { setRoute(next); location.hash = next; setSideOpen(false); setNotificationsOpen(false); };
  const markNotificationsRead = ids => setNotifications(current => current.map(item => ids.includes(item.id) ? { ...item, read: true } : item));
  const dismissNotification = id => setNotifications(current => current.filter(item => item.id !== id));
  const clearNotifications = () => setNotifications([]);
  const updateSeller = async (seller, approval_status) => {
    const commit = async () => {
      setReviewingSeller(seller.id); setReviewError("");
      try {
        const { data } = await api.patch(`/admin/users/${seller.id}/seller-review/`, { approval_status });
        if (sellerStatus(data) !== approval_status) throw new Error("The server did not save the requested seller status.");
        setUsers(current => current.map(account => account.id === seller.id ? data : account));
        if (approval_status === "approved") setTab("Pending");
        if (approval_status === "revoked") { setTab("Revoked"); navigate("requests"); }
        setSelectedSeller(null);
        toast(`${data.seller_profile?.store_name || data.full_name || data.username}: ${statusLabel(approval_status)}`);
      } catch (error) {
        setReviewError(error.response?.data?.detail || error.message || "Could not update this seller application.");
      } finally { setReviewingSeller(null); setConfirmAction(null); }
    };
    if (approval_status === "rejected" || approval_status === "revoked") {
      setConfirmAction({ text: approval_status === "revoked" ? `Revoke ${seller.seller_profile?.store_name || seller.full_name}'s seller access?` : `Reject ${seller.seller_profile?.store_name || seller.full_name}'s application?`, run: commit });
    } else await commit();
  };
  const deleteSeller = seller => {
    setConfirmAction({
      title: "Confirm seller deletion",
      confirmLabel: "Delete",
      text: `Delete seller #${seller.id} (${sellerTitle(seller)}) and their account? Sellers with order or payment history cannot be deleted.`,
      run: async () => {
        setDeletingSeller(seller.id);
        try {
          await api.delete(`/admin/users/${seller.id}/delete-seller/`);
          setUsers(current => current.filter(account => account.id !== seller.id));
          setSelectedSeller(current => current?.id === seller.id ? null : current);
          toast(`Seller #${seller.id} deleted.`);
        } catch (error) { toast(error.response?.data?.detail || "Could not delete this seller."); }
        finally { setDeletingSeller(null); setConfirmAction(null); }
      },
    });
  };
  const updateProduct = async (product, status) => {
    setSavingProduct(product.id);
    try { const { data } = await api.patch(`/products/${product.id}/`, { status }); setProducts(current => current.map(item => item.id === product.id ? data : item)); toast(`${product.name}: ${statusLabel(status)}`); }
    catch (error) { toast(error.response?.data?.detail || "Could not update product status."); }
    finally { setSavingProduct(null); }
  };
  const deleteProduct = async product => {
    if (!window.confirm(`Delete “${product.name}” permanently?`)) return;
    setSavingProduct(product.id);
    try { await api.delete(`/products/${product.id}/`); setProducts(current => current.filter(item => item.id !== product.id)); toast(`${product.name} deleted.`); }
    catch (error) { toast(error.response?.data?.detail || "Could not delete product."); }
    finally { setSavingProduct(null); }
  };
  const updateUserActive = async account => {
    setSavingUser(account.id);
    try {
      const { data } = await api.patch(`/admin/users/${account.id}/set-active/`, { is_active: !account.is_active });
      setUsers(current => current.map(item => item.id === account.id ? data : item));
      toast(`${data.full_name || data.username}: ${data.is_active ? "Account enabled" : "Account disabled"}`);
    } catch (error) { toast(error.response?.data?.detail || "Could not update account access."); }
    finally { setSavingUser(null); }
  };
  const reloadPayouts = async () => {
    const { data } = await api.get("/admin/payouts/");
    setPayoutData(data || { sellers: [], payouts: [] });
  };
  const createPayout = async event => {
    event.preventDefault();
    if (!payoutSeller || !payoutAmount) return;
    setPayoutBusy(true);
    try {
      await api.post("/admin/payouts/", { seller_id: Number(payoutSeller), amount: payoutAmount });
      await reloadPayouts();
      setPayoutAmount("");
      toast("Payout recorded as pending. Transfer it and add the bank or UPI reference when complete.");
    } catch (error) { toast(error.response?.data?.detail || "Could not create payout."); }
    finally { setPayoutBusy(false); }
  };
  const markPayoutPaid = async payout => {
    const reference = window.prompt(`Enter the bank or UPI transfer reference for ₹${Number(payout.amount).toLocaleString("en-IN")}:`);
    if (reference === null) return;
    setPayoutBusy(true);
    try {
      await api.patch(`/admin/payouts/${payout.id}/`, { status: "paid", reference });
      await reloadPayouts();
      toast(`Payout for ${payout.seller_name} marked paid.`);
    } catch (error) { toast(error.response?.data?.detail || "Could not update payout."); }
    finally { setPayoutBusy(false); }
  };
  const cancelPayout = async payout => {
    if (!window.confirm(`Cancel the pending ₹${Number(payout.amount).toLocaleString("en-IN")} payout for ${payout.seller_name}?`)) return;
    setPayoutBusy(true);
    try { await api.patch(`/admin/payouts/${payout.id}/`, { status: "cancelled" }); await reloadPayouts(); toast("Pending payout cancelled."); }
    catch (error) { toast(error.response?.data?.detail || "Could not cancel payout."); }
    finally { setPayoutBusy(false); }
  };
  const filtered = (rows, valueOf) => rows.filter(row => valueOf(row).toLowerCase().includes(search.trim().toLowerCase()));
  const sellerTitle = account => account.seller_profile?.store_name || account.full_name || account.username;
  const requestRows = filtered(sellers.filter(account => sellerStatus(account) !== "approved" && (tab === "All" || sellerStatus(account) === ({ Pending: "pending", Rejected: "rejected", Revoked: "revoked" }[tab]))), account => `${sellerTitle(account)} ${account.full_name} ${account.email} ${account.mobile_number || ""}`);
  const approvedSellerRows = filtered(sellers.filter(account => sellerStatus(account) === "approved"), account => `${sellerTitle(account)} ${account.full_name} ${account.email} ${account.mobile_number || ""}`);
  const activeOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const orderCustomer = order => order.customer_name || `Customer #${order.customer || order.user || "—"}`;
  const sellerProductCount = seller => products.filter(product => Number(product.seller) === Number(seller.id)).length;
  const sellerOrders = seller => activeOrders.filter(order => (order.items || []).some(item => Number(item.seller) === Number(seller.id)));
  const sellerSales = seller => sellerOrders(seller).filter(order => order.status !== "cancelled").reduce((sum, order) => sum + (order.items || []).filter(item => Number(item.seller) === Number(seller.id)).reduce((lineSum, item) => lineSum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0), 0);
  const statusTabs = ["Pending", "Rejected", "Revoked", "All"];
  const counts = { requests: pendingSellers.length, products: pendingProducts.length };
  const navLink = (key, label, icon) => <a key={key} href={`#${key}`} title={label} aria-label={label} className={route === key ? "on" : ""} onClick={event => { event.preventDefault(); navigate(key); }}><Icon name={icon} /><span className="lb">{label}</span>{counts[key] > 0 && <span className="nb">{counts[key]}</span>}</a>;

  const approvalColumns = [
    { label: "Store / Seller", width: "205px", render: account => <div className="pi"><div className="av sm">{initials(sellerTitle(account))}</div><div><b>{sellerTitle(account)}</b><span className="sub">{account.full_name || account.username}</span></div></div> },
    { label: "Contact", width: "190px", render: account => <div className="sellerContact"><span>{account.email || "—"}</span><small>{account.mobile_number || "No mobile"}</small></div> },
    { label: "Applied", width: "112px", render: account => formatDate(account.seller_profile?.created_at || account.date_joined) },
    { label: "Status", width: "105px", render: account => <Badge value={sellerStatus(account)} /> },
    { label: "Details", width: "112px", render: account => <button className="btn o sm" onClick={() => setSelectedSeller(account)}>View details</button> },
    { label: "Actions", width: "300px", render: account => <div className="acts">
      {sellerStatus(account) !== "approved" && <button className="btn p sm" disabled={reviewingSeller === account.id} onClick={() => updateSeller(account, "approved")}>{sellerStatus(account) === "pending" ? "Approve" : "Approve again"}</button>}
      {sellerStatus(account) === "pending" && <button className="btn o sm" disabled={reviewingSeller === account.id} onClick={() => updateSeller(account, "rejected")}>Reject</button>}
      {sellerStatus(account) === "approved" && <button className="btn o sm" disabled={reviewingSeller === account.id} onClick={() => updateSeller(account, "revoked")}>Revoke</button>}
      <button className="btn o sm" disabled={deletingSeller === account.id} onClick={() => deleteSeller(account)}>{deletingSeller === account.id ? "Deleting…" : "Delete"}</button>
    </div> },
  ];
  const sellerDirectoryColumns = [approvalColumns[0], approvalColumns[1],
    { label: "Business", width: "125px", render: account => account.seller_profile?.business_type === "registered" ? "Registered" : "Individual" },
    { label: "Products", width: "78px", render: account => sellerProductCount(account) },
    { label: "Orders", width: "72px", render: account => sellerOrders(account).length },
    { label: "Sales", width: "120px", render: account => formatMoney(sellerSales(account)) },
    approvalColumns[2], approvalColumns[3], approvalColumns[4],
  ];

  const renderRequests = (all = false) => <>
    <Head title={all ? "Sellers" : "Seller Approvals"}><Search value={search} onChange={setSearch} placeholder="Search sellers" /></Head>
    <div className="panel">{!all && <Tabs value={tab} onChange={setTab} items={statusTabs.map(key => [key, `${key} (${sellers.filter(account => sellerStatus(account) !== "approved" && (key === "All" || sellerStatus(account) === ({ Pending: "pending", Rejected: "rejected", Revoked: "revoked" }[key]))).length})`])} />}
      {reviewError && <div className="err" role="alert">{reviewError}</div>}
      <Table className={all ? "sellerDirectoryTable" : "sellerAdminTable"} columns={all ? sellerDirectoryColumns : approvalColumns} rows={all ? approvedSellerRows : requestRows} empty={all ? "No approved sellers found" : "No seller applications in this group"} />
    </div>
    {selectedSeller && <SellerDetails seller={selectedSeller} onClose={() => setSelectedSeller(null)} onReview={updateSeller} reviewing={reviewingSeller === selectedSeller.id} />}
  </>;

  const renderDashboard = () => {
    const salesBars = Array.from({ length: 10 }, (_, index) => {
      const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (9 - index));
      const dayOrders = activeOrders.filter(order => {
        if (order.status === "cancelled") return false;
        const orderDate = new Date(order.created_at); orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === date.getTime();
      });
      const amount = dayOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
      return { date, amount, orderCount: dayOrders.length };
    });
    const maxDailySales = Math.max(1, ...salesBars.map(day => day.amount));
    const topSellers = sellers.filter(seller => sellerStatus(seller) === "approved")
      .map(seller => ({ seller, sales: sellerSales(seller) })).sort((a, b) => b.sales - a.sales).slice(0, 5);
    const maxSellerSales = Math.max(1, ...topSellers.map(item => item.sales));
    const platformSummary = [
      ["Seller accounts", sellers.length], ["Approved sellers", sellers.filter(seller => sellerStatus(seller) === "approved").length],
      ["Pending applications", pendingSellers.length], ["Active customers", customers.filter(account => account.is_active).length],
      ["Products", products.length], ["Products awaiting review", pendingProducts.length], ["Total orders", orders.length],
      ["Sales volume", formatMoney(stats.total_sales)],
    ];
    return <>
    <Head title="Dashboard"><div className="btns"><button className="btn o" onClick={refresh} disabled={loading}>{loading ? "Refreshing…" : "Refresh data"}</button></div></Head>
    <div className="stats">
      {[["Total products", stats.total_products ?? products.length, "products"], ["Registered users", stats.total_users ?? users.length, "accounts"], ["Total orders", stats.total_orders ?? orders.length, "orders"], ["Total sales", formatMoney(stats.total_sales), "all time"]].map(([label, value, caption]) => <div className="stat" key={label}><p>{label}</p><strong>{value}</strong><small>{caption}</small></div>)}
    </div>
    <div className="two adminDashboardInsights">
      <section className="panel platformSalesPanel"><div className="ph"><div><h3>Platform Sales</h3><small>Daily sales · last 10 days</small></div><b>{formatMoney(salesBars.reduce((sum, day) => sum + day.amount, 0))}</b></div>
        <div className="platformSalesChart" role="group" aria-label="Platform sales for the last ten days">{salesBars.map(({ date, amount, orderCount }, index) => <div className="platformSalesDay" key={date.toISOString()} tabIndex={0} aria-label={`${date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}, ${orderCount} orders, earnings ${formatMoney(amount)}`}><div className="platformSalesTrack"><i style={{ height: `${Math.max(amount ? 7 : 3, amount / maxDailySales * 100)}%` }} /></div><span>{index % 2 === 0 ? `${date.getDate()} ${date.toLocaleDateString("en-IN", { month: "short" })}` : ""}</span><div className="platformSalesTooltip"><b>{date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</b><span>Orders <strong>{orderCount}</strong></span><span>Total earnings <strong>{formatMoney(amount)}</strong></span></div></div>)}</div>
      </section>
      <section className="panel"><div className="ph"><div><h3>Top Sellers</h3><small>By completed order sales</small></div><button className="lk" onClick={() => navigate("sellers")}>View all</button></div>
        {topSellers.map(({ seller, sales }) => <div className="topSellerRow" key={seller.id}><div><span>{sellerTitle(seller)}</span><b>{formatMoney(sales)}</b></div><div className="bar"><i style={{ width: `${sales ? Math.max(2, sales / maxSellerSales * 100) : 0}%`, background: "var(--pri)" }} /></div></div>)}
        {!topSellers.length && <div className="empty">No approved sellers yet</div>}
      </section>
      <section className="panel"><div className="ph"><h3>Pending seller approvals</h3><button className="lk" onClick={() => navigate("requests")}>View all</button></div>
        {pendingSellers.slice(0, 6).map(account => <div className="lr" key={account.id}><div className="g"><b>{sellerTitle(account)}</b><br /><small>{account.full_name} · Applied {formatDate(account.seller_profile?.created_at || account.date_joined)}</small></div><button className="btn p sm" disabled={reviewingSeller === account.id} onClick={() => updateSeller(account, "approved")}>Approve</button><button className="btn o sm" onClick={() => setSelectedSeller(account)}>Details</button></div>)}
        {!loading && !pendingSellers.length && <div className="empty">Nothing pending</div>}
      </section>
      <section className="panel"><div className="ph"><h3>Recent orders</h3><button className="lk" onClick={() => navigate("orders")}>View all</button></div>
        {activeOrders.slice(0, 6).map(order => <div className="lr" key={order.id}><div className="g"><b>{orderCustomer(order)}</b><br /><small>SS-{String(order.id).padStart(6, "0")} · {formatDate(order.created_at)}</small></div><Badge value={order.status === "paid" ? "pending" : order.status} /><b>{formatMoney(order.total_amount)}</b></div>)}
        {!loading && !activeOrders.length && <div className="empty">No orders yet</div>}
      </section>
      <section className="panel"><div className="ph"><h3>Products awaiting review</h3><button className="lk" onClick={() => navigate("products")}>View all</button></div>
        {pendingProducts.slice(0, 6).map(product => <div className="lr" key={product.id}><div className="g"><b>{product.name}</b><br /><small>{product.seller_name || "Seller"} · {product.category}</small></div><button className="btn p sm" disabled={savingProduct === product.id} onClick={() => updateProduct(product, "active")}>Approve</button></div>)}
        {!loading && !pendingProducts.length && <div className="empty">Nothing pending</div>}
      </section>
      <section className="panel"><div className="ph"><div><h3>Platform summary</h3><small>Live marketplace totals</small></div></div><div className="platformSummaryGrid">{platformSummary.map(([label, value]) => <div className="platformSummaryItem" key={label}><span>{label}</span><b>{value}</b></div>)}</div></section>
    </div>
    </>;
  };

  const renderUsers = () => {
    const rows = filtered(customers, account => `${account.full_name} ${account.username} ${account.email} ${account.mobile_number || ""}`).map(account => {
      const accountOrders = activeOrders.filter(order => Number(order.customer) === Number(account.id));
      const spend = accountOrders.reduce((total, order) => total + (order.status === "cancelled" ? 0 : Number(order.total_amount || 0)), 0);
      return { ...account, adminOrders: accountOrders, adminSpend: spend };
    });
    return <><Head title="Users"><Search value={search} onChange={setSearch} placeholder="Search users" /></Head><div className="panel"><Table rows={rows} empty="No users found" columns={[
      { label: "Customer", width: "1.5fr", render: account => <div className="pi"><div className="av sm">{initials(account.full_name || account.username)}</div><div><b>{account.full_name || account.username}</b><span className="sub">{account.username}</span></div></div> },
      { label: "Email", render: account => account.email }, { label: "Mobile", render: account => account.mobile_number || "—" },
      { label: "Orders", width: "80px", render: account => account.adminOrders.length }, { label: "Total spend", render: account => <b>{formatMoney(account.adminSpend)}</b> },
      { label: "Access", width: "130px", render: account => <Badge value={account.is_active ? "active" : "revoked"} /> },
      { label: "Details", width: "140px", render: account => <button className="btn o sm" onClick={() => setSelectedCustomer(account)}>View details</button> },
      { label: "Actions", width: "150px", render: account => <button className={`btn ${account.is_active ? "o" : "p"} sm`} disabled={savingUser === account.id} onClick={() => updateUserActive(account)}>{savingUser === account.id ? "Saving…" : account.is_active ? "Disable" : "Enable"}</button> },
    ]} /></div>{selectedCustomer && <CustomerDetails customer={selectedCustomer} products={products} onClose={() => setSelectedCustomer(null)} />}</>;
  };
  const renderOrders = () => {
    const rows = filtered(activeOrders, order => `${order.id} ${orderCustomer(order)} ${order.items?.map(item => item.product_name).join(" ") || ""} ${order.status}`);
    return <><Head title="Orders"><Search value={search} onChange={setSearch} placeholder="Search orders" /></Head><div className="panel"><Table rows={rows} empty="No orders found" columns={[
      { label: "Order", width: "120px", render: order => <b>SS-{String(order.id).padStart(6, "0")}</b> }, { label: "Customer", width: "minmax(125px, 1fr)", render: order => orderCustomer(order) },
      { label: "Items", width: "minmax(250px, 2fr)", render: order => order.items?.length ? <div className="adminOrderItems">{order.items.map(item => { const product = products.find(entry => Number(entry.id) === Number(item.product)); return <div className="adminOrderProduct" key={item.id}><ProductThumb product={product} image={item.product_image} alt={item.product_name || "Product"} size={38} /><span>{item.product_name || product?.name || "Product"}</span></div>; })}</div> : "—" },
      { label: "Qty", width: "65px", render: order => <div className="adminOrderQuantities">{order.items?.length ? order.items.map(item => <b key={item.id}>{item.quantity}</b>) : "—"}</div> },
      { label: "Amount", width: "130px", render: order => <b className="orderAmount">{formatMoney(order.total_amount)}</b> }, { label: "Date", width: "125px", render: order => formatDate(order.created_at) },
      { label: "Status", width: "110px", render: order => <Badge value={order.status === "paid" ? "pending" : order.status} /> },
    ]} className="ordersAdminTable" /></div></>;
  };
  const renderProducts = () => {
    const rows = [...products].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const orderedProductIds = new Set(orders.flatMap(order => (order.items || []).map(item => Number(item.product))));
    return <><Head title="Products" /><div className="panel">
      <Table rows={rows} empty="Seller products will appear here when submitted" columns={[
        { label: "Product ID", width: "90px", render: product => <b>#{product.id}</b> },
        { label: "Product", width: "1.4fr", render: product => <div className="pi"><ProductThumb product={product} alt={product.name} /><div><b>{product.name}</b><span className="sub">{product.category}</span></div></div> },
        { label: "Seller", render: product => product.seller_name || "—" }, { label: "Price", render: product => formatMoney(product.price) },
        { label: "Stock", width: "80px", render: product => <b>{product.stock}</b> }, { label: "Status", render: product => <Badge value={product.status} /> },
        { label: "Actions", width: "275px", render: product => {
          const ordered = orderedProductIds.has(Number(product.id));
          return <div className="acts">
            {(product.status === "pending_approval" || product.status === "rejected") && <button className="btn p sm" disabled={savingProduct === product.id} onClick={() => updateProduct(product, "active")}>{product.status === "pending_approval" ? "Approve" : "Activate"}</button>}
            {(product.status === "pending_approval" || product.status === "active") && <button className="btn o sm" disabled={savingProduct === product.id} onClick={() => updateProduct(product, "rejected")}>{product.status === "active" ? "Reject listing" : "Reject"}</button>}
            <button className="btn o sm" disabled={savingProduct === product.id || ordered} title={ordered ? "Products in order history cannot be deleted" : "Delete product"} onClick={() => deleteProduct(product)}>{ordered ? "Ordered" : "Delete"}</button>
          </div>;
        } },
      ]} /></div></>;
  };
  const renderPage = () => {
    if (route === "dashboard") return renderDashboard();
    if (route === "sellers") return renderRequests(true);
    if (route === "requests") return renderRequests(false);
    if (route === "users") return renderUsers();
    if (route === "orders") return renderOrders();
    if (route === "products") return renderProducts();
    if (route === "payouts") {
      const totals = payoutData.sellers.reduce((result, seller) => ({
        earned: result.earned + Number(seller.earned || 0), available: result.available + Number(seller.available || 0),
        pending: result.pending + Number(seller.pending || 0), paid: result.paid + Number(seller.paid || 0),
      }), { earned: 0, available: 0, pending: 0, paid: 0 });
      const eligibleSellers = payoutData.sellers.filter(seller => seller.is_active && seller.approval_status === "approved" && seller.payout_ready && Number(seller.available) > 0);
      return <>
        <Head title="Payouts"><button className="btn o" disabled={payoutBusy || loading} onClick={refresh}>{loading ? "Refreshing…" : "Refresh data"}</button></Head>
        <div className="stats payoutStats">{[["Seller earnings", totals.earned], ["Available to pay", totals.available], ["Pending payouts", totals.pending], ["Paid out", totals.paid]].map(([label, amount]) => <div className="stat" key={label}><p>{label}</p><strong>{formatMoney(amount)}</strong></div>)}</div>
        <section className="panel payoutPanel"><div className="ph"><div><h3>Record a seller payout</h3><small>Transfer using the seller’s saved bank or UPI details, then enter the transfer reference to mark it paid.</small></div></div>
          <form className="payoutForm" onSubmit={createPayout}>
            <label>Approved seller<select className="in" value={payoutSeller} onChange={event => setPayoutSeller(event.target.value)} required><option value="">Choose seller</option>{eligibleSellers.map(seller => <option key={seller.seller_id} value={seller.seller_id}>{seller.seller_name} · Available {formatMoney(seller.available)}</option>)}</select></label>
            <label>Amount (₹)<input className="in" type="number" min="0.01" step="0.01" max={eligibleSellers.find(seller => String(seller.seller_id) === payoutSeller)?.available || undefined} value={payoutAmount} onChange={event => setPayoutAmount(event.target.value)} placeholder="Enter amount" required /></label>
            <button className="btn p" type="submit" disabled={payoutBusy || !eligibleSellers.length}>{payoutBusy ? "Saving…" : "Create pending payout"}</button>
          </form>
          {!eligibleSellers.length && <p className="payoutHint">No approved sellers currently have both a positive balance and valid payout details.</p>}
        </section>
        <section className="panel payoutPanel"><div className="ph"><h3>Seller balances</h3></div><Table rows={payoutData.sellers} empty="No seller accounts found" columns={[
          { label: "Seller", width: "1.4fr", render: seller => <div className="pi"><div className="av sm">{initials(seller.seller_name)}</div><div><b>{seller.seller_name}</b><span className="sub">{seller.seller_email}</span></div></div> },
          { label: "Earned", render: seller => formatMoney(seller.earned) }, { label: "Paid", render: seller => formatMoney(seller.paid) },
          { label: "Pending", render: seller => formatMoney(seller.pending) }, { label: "Available", render: seller => <b>{formatMoney(seller.available)}</b> },
          { label: "Payout details", render: seller => seller.upi_id || (seller.account_last4 ? `${seller.bank_name || "Bank"} ···· ${seller.account_last4}` : "Not provided") },
          { label: "Eligibility", render: seller => <Badge value={seller.approval_status === "approved" && seller.payout_ready && seller.is_active ? "active" : "pending"} /> },
        ]} /></section>
        <section className="panel payoutPanel"><div className="ph"><h3>Payout history</h3></div><Table rows={payoutData.payouts} empty="No payouts recorded yet" columns={[
          { label: "Seller", width: "1.2fr", render: payout => <div><b>{payout.seller_name}</b><span className="sub">{payout.seller_email}</span></div> },
          { label: "Amount", render: payout => <b>{formatMoney(payout.amount)}</b> }, { label: "Destination", render: payout => payout.upi_id || (payout.account_last4 ? `${payout.bank_name || "Bank"} ···· ${payout.account_last4}` : "—") },
          { label: "Status", render: payout => <Badge value={payout.status} /> }, { label: "Created", render: payout => formatDate(payout.created_at) },
          { label: "Transfer reference", render: payout => payout.reference || "—" },
          { label: "Actions", width: "210px", render: payout => payout.status === "pending" ? <div className="acts"><button className="btn p sm" disabled={payoutBusy} onClick={() => markPayoutPaid(payout)}>Mark paid</button><button className="btn o sm" disabled={payoutBusy} onClick={() => cancelPayout(payout)}>Cancel</button></div> : "—" },
        ]} /></section>
      </>;
    }
    return <AdminSettings user={user} settings={adminSettings} onSave={setAdminSettings} />;
  };
  const title = { dashboard: "Dashboard", sellers: "Sellers", requests: "Seller Approvals", users: "Users", orders: "Orders", products: "Products", payouts: "Payouts", settings: "Settings" }[route];

  return <div className="adminDashboardRoot" data-theme={dark ? "dark" : "light"}>
    <div className={`scrim ${sideOpen ? "show" : ""}`} onClick={() => setSideOpen(false)} />
    <div className={`app ${collapsed ? "col" : ""}`}>
      <aside id="admin-sidebar" className={sideOpen ? "open" : ""}>
        <div className="brand"><div className="logo">S</div><span className="lb">ShopSphere</span></div>
        <nav>{NAV.map(([group, items]) => <div key={group}><div className="grp">{group}</div>{items.map(([key, label, icon]) => navLink(key, label, icon))}</div>)}</nav>
        <div className="sp" /><nav>{navLink("settings", "Settings", "settings")}<button className="navLogout" onClick={onLogout}><Icon name="out" /><span className="lb">Logout</span></button></nav>
      </aside>
      <main>
        <header>
          <button className="ib menu-btn" aria-label={window.matchMedia("(max-width: 860px)").matches ? (sideOpen ? "Close sidebar" : "Open sidebar") : (collapsed ? "Expand sidebar" : "Collapse sidebar")} aria-expanded={window.matchMedia("(max-width: 860px)").matches ? sideOpen : !collapsed} aria-controls="admin-sidebar" onClick={() => {
            if (window.matchMedia("(max-width: 860px)").matches) setSideOpen(value => !value);
            else setCollapsed(value => !value);
          }}><Icon name={sideOpen ? "close" : "menu"} /></button>
          <div className="hl"><small>Admin Panel</small><h1>{title}</h1></div>
          {loadError && <span className="bd" style={{ color: "#e5484d", background: "#e5484d22" }}>Data issue</span>}
          <button className="ib" onClick={() => setAdminSettings(current => ({ ...current, theme: current.theme === "dark" ? "light" : "dark" }))} aria-label="Toggle theme"><Icon name={dark ? "sun" : "moon"} /></button>
          <div style={{ position: "relative" }}><button className="ib" id="bell" aria-label={`Notifications${unreadNotifications.length ? `, ${unreadNotifications.length} unread` : ""}`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen(value => !value)}><Icon name="bell" />{unreadNotifications.length > 0 && <span className="dot">{unreadNotifications.length > 99 ? "99+" : unreadNotifications.length}</span>}</button>
            {notificationsOpen && <div id="np" className="show"><div className="nh"><b>Notifications <small>{unreadNotifications.length} unread</small></b><div><button disabled={!unreadNotifications.length} onClick={() => markNotificationsRead(unreadNotifications.map(item => item.id))}>Mark all read</button><button disabled={!notifications.length} onClick={clearNotifications}>Clear all</button></div></div>
              <div className="adminNotificationList">{adminSettings.notificationsPaused ? <div className="empty">Notifications are paused. Resume them in Settings.</div> : notifications.length ? notifications.map(item => <div className={`ni ${item.read ? "" : "un"}`} key={item.id}><button className="adminNotificationOpen" onClick={() => { markNotificationsRead([item.id]); navigate(item.route); }}><span className="adminNotificationIcon">{{ orders: "↗", products: "▣", users: "♙", sellerApplications: "＋" }[item.type] || "•"}</span><span><b>{item.title}</b><small>{item.detail}</small><small>{formatDate(item.createdAt)} · {new Date(item.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</small></span>{!item.read && <i aria-label="Unread" />}</button><button className="adminNotificationDismiss" aria-label="Dismiss notification" onClick={() => dismissNotification(item.id)}>×</button></div>) : <div className="empty">You’re all caught up</div>}</div>
              <div className="adminNotificationFooter"><button onClick={() => navigate("settings")}>Notification settings</button></div>
            </div>}
          </div>
          <div className="user"><div className="av">{initials(user?.full_name || user?.username || "Admin")}</div><div><b>{user?.full_name || user?.username || "Admin"}</b><span>Administrator</span></div></div>
        </header>
        {loadError && <div className="err" role="status">{loadError} <button className="lk" onClick={refresh}>Refresh</button></div>}
        <div className="content">{loading && !users.length && !products.length && !orders.length ? <div className="panel empty">Loading dashboard…</div> : renderPage()}</div>
      </main>
    </div>
    {confirmAction && <div className="modal show"><div className="box"><h3>{confirmAction.title || "Confirm seller update"}</h3><p>{confirmAction.text}</p><div className="btns" style={{ marginTop: 20, justifyContent: "flex-end" }}><button className="btn o" disabled={Boolean(reviewingSeller || deletingSeller)} onClick={() => setConfirmAction(null)}>Cancel</button><button className="btn p" disabled={Boolean(reviewingSeller || deletingSeller)} onClick={confirmAction.run}>{confirmAction.confirmLabel || "Confirm"}</button></div></div></div>}
    {message && <div className="toast">{message}</div>}
  </div>;
}
