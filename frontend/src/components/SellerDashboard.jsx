import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import api from "../api";
import { resolveImageUrl } from "../imageUrl";
import "../ShopSphereDashboard.css";

/* ---------- icons (same SVG paths as original) ---------- */
const Ic = ({ p }) => <svg className="i" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: p }} />;
const TREND = '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>';
const TREND_DOWN = '<path d="M3 7l6 6 4-4 8 8M15 17h6v-6"/>';
const TREND_FLAT = '<path d="M4 12h16"/>';
const EDIT = '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>';
const TRASH = '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>';
const SEARCH = '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>';
const PLUS = '<path d="M12 5v14M5 12h14"/>';
const DL = '<path d="M12 3v12M7 11l5 5 5-5M4 21h16"/>';
const MENU = '<path d="M4 7h16M4 12h16M4 17h16"/>';
const CLOSE = '<path d="M6 6l12 12M18 6L6 18"/>';
const MOON = '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>';
const BELL = '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>';
const SETI = '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.2-.8.2-1.2z"/>';
const OUT = '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>';
const NAV = [
  ["Dashboard", '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'],
  ["Products", '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>'],
  ["Orders", '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>'],
  ["Inventory", '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 14h6"/>'],
  ["Categories", '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'],
  ["Customers", '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6"/>'],
];

/* ---------- data ---------- */
const EM = { Mobiles: "📱", Laptops: "💻", Audio: "🎧", "Smart Watches": "⌚", Cameras: "📷", Accessories: "🔌", Gaming: "🎮", Tablets: "📲" };
const COL = ["#fde8d7", "#dfe8fb", "#e6f6e3", "#f6e3f1", "#fff2c9", "#e2f3f6", "#ece6fb"];
const ST = ["paid", "processing", "shipped", "cancelled"];
const stc = { paid: "#22b345", pending: "#e8a317", processing: "#7a68e8", shipped: "#3b82f6", cancelled: "#e5484d" };
const R = ["dashboard", "products", "orders", "inventory", "categories", "customers", "settings", "logout"];
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const orderNumber = (id) => `SS-${String(id).padStart(6, "0")}`;
const statusLabel = (status) => String(status || "paid").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const mapApiOrder = (order, sellerId) => {
  const items = (order.items || []).filter((item) => Number(item.seller) === Number(sellerId));
  return { ...order, id: order.id, orderNumber: orderNumber(order.id), items, c: order.customer_name || "Customer", p: items.map((item) => `${item.product_name} × ${item.quantity}`).join(", "), amt: items.reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0), st: order.status, d: new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) };
};
const PRODUCT_SUBCATEGORIES = {
  Mobiles: ["Smartphones", "Feature Phones"], Laptops: ["Gaming Laptops", "Ultrabooks", "MacBooks"],
  Audio: ["Headphones", "Earbuds", "Speakers"], Headphones: ["Over-ear", "On-ear", "In-ear"],
  "Smart Watches": ["Fitness Watches", "Smart Watches"], Cameras: ["DSLR", "Mirrorless", "Action Cameras"],
  Accessories: ["Chargers", "Cases", "Cables", "Storage"], Gaming: ["Consoles", "Controllers", "Games"],
  Tablets: ["Android Tablets", "iPads"],
};
const STANDARD_CATEGORIES = Object.keys(PRODUCT_SUBCATEGORIES).filter((category) => category !== "Headphones");
const PRODUCT_BRANDS = {
  Mobiles: ["Apple", "Samsung", "OnePlus", "Xiaomi", "Redmi", "Realme", "Vivo", "OPPO", "Motorola", "Google", "Nothing", "Other"],
  Laptops: ["Apple", "Dell", "HP", "Lenovo", "ASUS", "Acer", "MSI", "Microsoft", "Samsung", "Other"],
  Audio: ["Sony", "JBL", "Bose", "Sennheiser", "Apple", "Samsung", "Beats", "boAt", "Noise", "Other"],
  Headphones: ["Sony", "JBL", "Bose", "Sennheiser", "Apple", "Samsung", "Beats", "boAt", "Noise", "Other"],
  "Smart Watches": ["Apple", "Samsung", "Garmin", "Fitbit", "Amazfit", "Noise", "boAt", "Titan", "Other"],
  Cameras: ["Canon", "Nikon", "Sony", "Fujifilm", "Panasonic", "GoPro", "DJI", "Other"],
  Accessories: ["Apple", "Anker", "Belkin", "Spigen", "UGREEN", "boAt", "Portronics", "Other"],
  Gaming: ["Sony", "Microsoft", "Nintendo", "Razer", "Logitech", "ASUS ROG", "Other"],
  Tablets: ["Apple", "Samsung", "Lenovo", "Xiaomi", "OnePlus", "Huawei", "Other"],
};
const PRODUCT_SPEC_FIELDS = {
  Mobiles: ["Model Number", "Operating System", "Processor / Chipset", "RAM", "Internal Storage", "Expandable Storage", "Display Size", "Display Type", "Display Resolution", "Refresh Rate", "Rear Camera", "Front Camera", "Battery Capacity", "Charging", "Network", "SIM Type", "5G Support", "Wi-Fi", "Bluetooth", "NFC", "USB Port", "Fingerprint Sensor", "Face Unlock", "Water / Dust Resistance", "Dimensions", "Weight", "Color", "In the Box"],
  Laptops: ["Model Number", "Processor Brand", "Processor Model", "Processor Generation", "RAM Size", "RAM Type", "Storage Type", "Storage Capacity", "Graphics Brand", "Graphics Model", "Screen Size", "Display Resolution", "Display Type", "Refresh Rate", "Operating System", "Ports", "Wi-Fi", "Bluetooth", "Webcam", "Battery", "Keyboard", "Dimensions", "Weight", "Color", "In the Box"],
  Audio: ["Model Number", "Product Type", "Wearing Style", "Connectivity", "Bluetooth Version", "Driver Size", "Frequency Response", "Microphone", "Noise Cancellation", "Battery Life", "Charging Time", "Charging Port", "Water Resistance", "Compatibility", "Color", "Weight", "In the Box"],
  Headphones: ["Model Number", "Wearing Style", "Connectivity", "Bluetooth Version", "Driver Size", "Frequency Response", "Microphone", "Noise Cancellation", "Battery Life", "Charging Time", "Charging Port", "Water Resistance", "Compatibility", "Color", "Weight", "In the Box"],
  "Smart Watches": ["Model Number", "Display Type", "Display Size", "Resolution", "Battery Capacity", "Battery Life", "Water Resistance", "Health Sensors", "Sports Modes", "GPS", "Connectivity", "Bluetooth Version", "Calling Support", "Compatible OS", "Strap Material", "Color", "Weight", "In the Box"],
  Cameras: ["Model Number", "Camera Type", "Sensor Type", "Sensor Resolution", "Lens Mount", "Included Lens", "Optical Zoom", "Digital Zoom", "Video Resolution", "Image Stabilization", "Autofocus", "ISO Range", "Screen Type", "Connectivity", "Battery", "Storage Media", "Dimensions", "Weight", "Color", "In the Box"],
  Accessories: ["Model Number", "Accessory Type", "Material", "Compatibility", "Connector Type", "Power Output", "Input", "Output", "Capacity", "Dimensions", "Color", "Weight", "In the Box"],
  Gaming: ["Model Number", "Platform", "Console Generation", "Storage Capacity", "Resolution Support", "Frame Rate", "Connectivity", "Wireless Standard", "Controller Included", "Compatible Games", "Power Requirements", "Dimensions", "Color", "Weight", "In the Box"],
  Tablets: ["Model Number", "Operating System", "Processor / Chipset", "RAM", "Internal Storage", "Expandable Storage", "Display Size", "Display Type", "Display Resolution", "Rear Camera", "Front Camera", "Battery Capacity", "Charging", "Cellular Network", "SIM Type", "Wi-Fi", "Bluetooth", "USB Port", "Stylus Support", "Dimensions", "Weight", "Color", "In the Box"],
};
const PRODUCT_SPEC_EXAMPLES = {
  "Model Number": "e.g. A3101",
  "Operating System": "e.g. Android 15",
  "Processor / Chipset": "e.g. Apple A18 Pro",
  "Processor Brand": "e.g. Intel",
  "Processor Model": "e.g. Core Ultra 7 155H",
  "Processor Generation": "e.g. 14th Gen",
  RAM: "e.g. 8 GB",
  "RAM Size": "e.g. 16 GB",
  "RAM Type": "e.g. DDR5",
  "Internal Storage": "e.g. 256 GB",
  "Storage Capacity": "e.g. 1 TB",
  "Storage Type": "e.g. NVMe SSD",
  "Expandable Storage": "e.g. Up to 1 TB",
  "Display Size": "e.g. 6.7 inches",
  "Screen Size": "e.g. 15.6 inches",
  "Display Type": "e.g. AMOLED",
  "Display Resolution": "e.g. 2796 × 1290 px",
  Resolution: "e.g. 466 × 466 px",
  "Refresh Rate": "e.g. 120 Hz",
  "Rear Camera": "e.g. 48 MP + 12 MP",
  "Front Camera": "e.g. 12 MP",
  "Battery Capacity": "e.g. 5000 mAh",
  "Battery Life": "e.g. Up to 18 hours",
  Charging: "e.g. 45 W fast charging",
  Network: "e.g. 5G, 4G LTE",
  "SIM Type": "e.g. Dual Nano SIM",
  "5G Support": "e.g. Yes",
  "Wi-Fi": "e.g. Wi-Fi 6E",
  Bluetooth: "e.g. Bluetooth 5.3",
  "Bluetooth Version": "e.g. Bluetooth 5.3",
  "USB Port": "e.g. USB-C",
  "Graphics Brand": "e.g. NVIDIA",
  "Graphics Model": "e.g. GeForce RTX 4060",
  Ports: "e.g. 2× USB-C, HDMI",
  Webcam: "e.g. 1080p Full HD",
  Battery: "e.g. 70 Wh",
  Connectivity: "e.g. Bluetooth, USB-C",
  "Driver Size": "e.g. 40 mm",
  "Frequency Response": "e.g. 20 Hz – 20 kHz",
  "Water Resistance": "e.g. 5 ATM",
  "Sensor Resolution": "e.g. 24.2 MP",
  "Video Resolution": "e.g. 4K at 60 fps",
  "Optical Zoom": "e.g. 5×",
  "Accessory Type": "e.g. USB-C charger",
  Compatibility: "e.g. iPhone 15 and newer",
  "Power Output": "e.g. 30 W",
  Capacity: "e.g. 20,000 mAh",
  Platform: "e.g. PlayStation 5",
  Color: "e.g. Midnight Black",
  Weight: "e.g. 210 g",
  Dimensions: "e.g. 159.9 × 76.7 × 8.3 mm",
  "In the Box": "e.g. Device, cable, quick-start guide",
};
const makeProductSlug = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const mapApiProduct = (product) => ({
  name: product.name, id: product.id, cat: product.category, price: Number(product.price), stock: product.stock,
  profit: null, created_at: product.created_at, persisted: true,
  sku: product.sku || "", subcategory: product.subcategory || "", brand: product.brand || "",
  description: product.description || "", short_description: product.short_description || "", mrp: product.mrp || "",
  image_url: product.image_url || "", image_urls: product.image_urls || (product.image_url ? [product.image_url] : []),
  specifications: product.specifications || {}, low_stock_threshold: product.low_stock_threshold ?? 5,
  tax_rate: product.tax_rate || "", weight: product.weight || "", length: product.length || "", width: product.width || "", height: product.height || "",
  shipping_charges: product.shipping_charges || "0", free_shipping: product.free_shipping || false,
  warranty_period: product.warranty_period || "", return_policy: product.return_policy || "", replacement_available: product.replacement_available || false,
  seo_title: product.seo_title || "", meta_description: product.meta_description || "", slug: product.slug || "", status: product.status || "draft",
  updated_at: product.updated_at || product.created_at,
});
const mapApiDraft = (draft) => ({
  ...mapApiProduct({ ...draft.data, id: draft.id, status: "draft" }),
  draft_id: draft.id,
  product_id: draft.product_id,
  updated_at: draft.updated_at,
  persisted: false,
});

/* ---------- small pieces ---------- */
const Bd = ({ s }) => <span className="bd" style={{ color: stc[s] || "#667085", background: (stc[s] || "#667085") + "22" }}>{statusLabel(s)}</span>;
const Head = ({ t, children }) => <div className="top"><h2>{t}</h2>{children}</div>;

const Spark = ({ a, c }) => {
  const w = 120, h = 50, m = Math.max(...a), n = Math.min(...a);
  const pts = a.map((v, i) => [(i * w) / (a.length - 1), h - 6 - ((v - n) / (m - n || 1)) * (h - 14)]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const l = pts[Math.floor(a.length * 0.6)];
  return (
    <svg className="sk" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={"g" + c} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a68e8" stopOpacity=".25" /><stop offset="1" stopColor="#7a68e8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w} ${h} L0 ${h}Z`} fill={`url(#g${c})`} />
      <path d={d} fill="none" stroke="#7a68e8" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <circle cx={l[0]} cy={l[1]} r="3" fill="var(--card)" stroke="#7a68e8" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

const Stats = ({ products, orders }) => {
  const now = new Date();
  const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0);
  const previousStart = new Date(start); previousStart.setDate(start.getDate() - 7);
  const validOrders = orders.filter((order) => order.st !== "cancelled");
  const units = (order) => order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const value = (order) => order.amt;
  const inRange = (date, from, to) => date >= from && date <= to;
  const currentOrders = validOrders.filter((order) => inRange(new Date(order.created_at), start, now));
  const previousOrders = validOrders.filter((order) => new Date(order.created_at) >= previousStart && new Date(order.created_at) < start);
  const publishedProducts = products.filter((product) => product.status !== "draft");
  const currentProducts = publishedProducts.filter((product) => product.created_at && inRange(new Date(product.created_at), start, now)).length;
  const previousProducts = publishedProducts.filter((product) => product.created_at && new Date(product.created_at) >= previousStart && new Date(product.created_at) < start).length;
  const metrics = [
    { title: "Total Product", amount: publishedProducts.length, current: currentProducts, previous: previousProducts, series: Array.from({ length: 7 }, (_, offset) => { const day = new Date(start); day.setDate(start.getDate() + offset); return publishedProducts.filter((p) => p.created_at && new Date(p.created_at).toDateString() === day.toDateString()).length; }) },
    { title: "Product Sold", amount: validOrders.reduce((sum, order) => sum + units(order), 0), current: currentOrders.reduce((sum, order) => sum + units(order), 0), previous: previousOrders.reduce((sum, order) => sum + units(order), 0), series: Array.from({ length: 7 }, (_, offset) => { const day = new Date(start); day.setDate(start.getDate() + offset); return validOrders.filter((order) => new Date(order.created_at).toDateString() === day.toDateString()).reduce((sum, order) => sum + units(order), 0); }) },
    { title: "Revenue", amount: money(validOrders.reduce((sum, order) => sum + value(order), 0)), current: currentOrders.reduce((sum, order) => sum + value(order), 0), previous: previousOrders.reduce((sum, order) => sum + value(order), 0), series: Array.from({ length: 7 }, (_, offset) => { const day = new Date(start); day.setDate(start.getDate() + offset); return validOrders.filter((order) => new Date(order.created_at).toDateString() === day.toDateString()).reduce((sum, order) => sum + value(order), 0); }) },
    { title: "Orders", amount: validOrders.length, current: currentOrders.length, previous: previousOrders.length, series: Array.from({ length: 7 }, (_, offset) => { const day = new Date(start); day.setDate(start.getDate() + offset); return validOrders.filter((order) => new Date(order.created_at).toDateString() === day.toDateString()).length; }) },
  ].map((metric) => ({ ...metric, change: metric.previous ? `${Math.round(((metric.current - metric.previous) / metric.previous) * 100)}%` : "—" }));
  return (
    <div className="stats">
      {metrics.map((s, i) => (
        <div className="stat" key={i}>
          <p>{s.title}</p>
          <div className="row">
            <div><strong>{s.amount}</strong><div className="up" style={{ color: !s.previous ? "var(--muted)" : s.current < s.previous ? "#e5484d" : undefined }}><Ic p={!s.previous ? TREND_FLAT : s.current < s.previous ? TREND_DOWN : TREND} />{s.change} <span>vs Last Week</span></div></div>
            <Spark a={s.series.length ? s.series : [0, 0, 0, 0, 0, 0, 0]} c={i} />
          </div>
        </div>
      ))}
    </div>
  );
};

/* ---------- Products ---------- */
function Products({ P, setP, CATS, setCATS, theme, user, ORD, toast, selectedCategory }) {
  const [q, setQ] = useState(""), [fp, setFp] = useState(""), [fs, setFs] = useState(""), [cat, setCat] = useState("");
  const [sort, setSort] = useState({ k: null, d: 1 }), [open, setOpen] = useState(null), [actionPos, setActionPos] = useState(null);
  const [modal, setModal] = useState(null), [f, setF] = useState({});
  const [saving, setSaving] = useState(false), [uploadingImages, setUploadingImages] = useState(false), [saveError, setSaveError] = useState("");
  const nameRef = useRef();
  const subcategories = PRODUCT_SUBCATEGORIES[f.category] || [];

  useEffect(() => { setCat(selectedCategory || ""); }, [selectedCategory]);

  useEffect(() => {
    if (!modal) return undefined;
    const onKeyDown = (event) => { if (event.key === "Escape") setModal(null); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal]);

  useEffect(() => {
    const h = (e) => !e.target.closest(".mw, .sellerActionMenu") && setOpen(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnViewportChange = () => setOpen(null);
    window.addEventListener("scroll", closeOnViewportChange, true);
    window.addEventListener("resize", closeOnViewportChange);
    return () => { window.removeEventListener("scroll", closeOnViewportChange, true); window.removeEventListener("resize", closeOnViewportChange); };
  }, [open]);

  const draftView = cat === "__drafts__";
  let L = P.filter((p) =>
    (!q || (p.name + p.id).toLowerCase().includes(q.toLowerCase())) &&
    (draftView ? p.status === "draft" : p.status !== "draft" && (!cat || p.cat === cat)) &&
    (!fs || (fs === "low" ? Number(p.stock) <= Number(p.low_stock_threshold ?? 5) : fs === "in" ? Number(p.stock) > 0 : true)));
  if (fp) { const [a, b] = fp.split("-").map(Number); L = L.filter((p) => p.price >= a && p.price <= b); }
  if (sort.k) L = [...L].sort((a, b) => (a[sort.k] > b[sort.k] ? 1 : -1) * sort.d);

  const openModal = (p) => {
    setOpen(null);
    setSaveError("");
    setF(p ? {
      name: p.name, sku: p.sku || "", category: p.cat, subcategory: p.subcategory || "", brand: (PRODUCT_BRANDS[p.cat] || ["Other"]).includes(p.brand) ? p.brand : "Other",
      description: p.description || "", short_description: p.short_description || "", price: p.price, mrp: p.mrp || "", stock: p.stock,
      low_stock_threshold: p.low_stock_threshold ?? 5, tax_rate: p.tax_rate || "", images: p.image_urls || (p.image_url ? [p.image_url] : []),
      customBrand: (PRODUCT_BRANDS[p.cat] || []).includes(p.brand) ? "" : p.brand || "", specifications: p.specifications || {}, weight: p.weight || "", length: p.length || "", width: p.width || "", height: p.height || "",
      shipping_charges: p.shipping_charges || "0", free_shipping: p.free_shipping || false, warranty_period: p.warranty_period || "",
      return_policy: p.return_policy || "", replacement_available: p.replacement_available || false, seo_title: p.seo_title || "",
      meta_description: p.meta_description || "", status: p.status || "draft",
    } : {
      name: "", sku: "", category: "", subcategory: "", brand: "", description: "", short_description: "", price: "", mrp: "", stock: "",
      low_stock_threshold: 5, tax_rate: "", images: [], specifications: {}, customBrand: "", weight: "", length: "", width: "", height: "",
      shipping_charges: "0", free_shipping: false, warranty_period: "", return_policy: "", replacement_available: false,
      seo_title: "", meta_description: "", status: "draft",
    });
    setModal({ edit: p || null });
  };
  const updateField = (key, value) => setF((current) => ({ ...current, [key]: value }));
  const uploadImages = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if ((f.images?.length || 0) + files.length > 8) return setSaveError("You can add up to 8 images in total.");
    const invalid = files.find((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) return setSaveError("Choose JPG, PNG or WebP images under 5 MB each.");
    setUploadingImages(true);
    setSaveError("");
    try {
      const body = new FormData();
      files.forEach((file) => body.append("images", file));
      body.append("product_name", f.name || "");
      body.append("start_index", String(f.images?.length || 0));
      const { data } = await api.post("/uploads/product-images/", body, { headers: { "Content-Type": "multipart/form-data" } });
      const uploadedUrls = data.urls || [];
      updateField("images", [...(f.images || []), ...uploadedUrls]);
    } catch (error) {
      setSaveError(error.response?.data?.detail || error.message || "Could not upload product images.");
    } finally { setUploadingImages(false); }
  };
  const persistImageOrder = async (orderedImages) => {
    const oldImages = [...f.images];
    let createdUrls = [];
    setUploadingImages(true);
    setSaveError("");
    try {
      const nameForFiles = modal.edit?.persisted ? modal.edit.name : f.name.trim();
      const { data: renameData } = await api.post("/uploads/product-images/rename/", { urls: orderedImages, product_name: nameForFiles });
      const urlMap = renameData.url_map || {};
      const nextImages = orderedImages.map((url) => urlMap[url] || url);
      createdUrls = Object.values(urlMap).filter((url) => !orderedImages.includes(url));
      let product;
      if (modal.edit?.persisted) {
        ({ data: product } = await api.patch(`/products/${modal.edit.id}/`, { image_urls: nextImages, image_url: nextImages[0] || "" }));
      }
      updateField("images", nextImages);
      if (product) setP((items) => items.map((item) => item.id === product.id ? mapApiProduct(product) : item));
      const obsoleteUrls = oldImages.filter((url) => !nextImages.includes(url));
      await Promise.allSettled(obsoleteUrls.map((url) => api.post("/uploads/product-images/remove/", { url })));
    } catch (error) {
      if (createdUrls.length) await Promise.allSettled(createdUrls.map((url) => api.post("/uploads/product-images/remove/", { url })));
      setSaveError(error.response?.data?.detail || "Could not save this image order. Please try again.");
    } finally { setUploadingImages(false); }
  };
  const setPrimaryImage = (index) => persistImageOrder([f.images[index], ...f.images.filter((_, imageIndex) => imageIndex !== index)]);
  const moveImage = (index, direction) => {
    const destination = index + direction;
    if (destination < 0 || destination >= f.images.length) return;
    const images = [...f.images];
    [images[index], images[destination]] = [images[destination], images[index]];
    persistImageOrder(images);
  };
  const removeImage = async (index) => {
    const imageUrl = f.images[index];
    const remainingImages = f.images.filter((_, imageIndex) => imageIndex !== index);
    if (modal.edit?.persisted) {
      await persistImageOrder(remainingImages);
      return;
    }
    setUploadingImages(true);
    setSaveError("");
    try {
      await api.post("/uploads/product-images/remove/", { url: imageUrl });
      updateField("images", remainingImages);
    } catch (error) {
      setSaveError(error.response?.data?.detail || "Could not remove this image. Please try again.");
    } finally { setUploadingImages(false); }
  };
  const saveP = async (action = "draft") => {
    const pr = Number(f.price), mrp = Number(f.mrp), st = Number(f.stock);
    const selectedBrand = (f.brand === "Other" ? f.customBrand : f.brand || "").trim();
    if (action === "publish") {
      if (!f.name.trim() || !f.sku.trim() || !f.category || !f.subcategory || !selectedBrand || !f.description.trim()) return setSaveError("Fill Product Name, SKU, Category, Subcategory, Brand and Product Description before publishing.");
      if (!f.images?.length) return setSaveError("Add at least one product image before publishing.");
      if (!(pr > 0) || !(mrp >= pr) || !Number.isInteger(st) || st < 0) return setSaveError("Enter a valid selling price, MRP at least equal to price, and whole-number stock before publishing.");
    } else if (f.price !== "" && (!(pr > 0) || (f.mrp !== "" && mrp < pr))) {
      return setSaveError("If entered, selling price must be positive and MRP must be at least the selling price.");
    }
    setSaving(true);
    setSaveError("");
    let imageUrls = [...(f.images || [])];
    let renamedUrls = [];
    let keepDraftOpen = false;
    const payload = {
      name: f.name.trim(), sku: f.sku.trim().toUpperCase(), category: f.category, subcategory: f.subcategory, brand: selectedBrand,
      description: f.description.trim(), short_description: f.short_description.trim(), ...(f.price === "" ? {} : { price: pr }), mrp: f.mrp === "" ? null : mrp, stock: f.stock === "" ? 0 : st,
      low_stock_threshold: Number(f.low_stock_threshold || 0), tax_rate: f.tax_rate === "" ? null : Number(f.tax_rate),
      image_urls: imageUrls, image_url: imageUrls[0] || "", specifications: f.specifications,
      weight: f.weight === "" ? null : Number(f.weight), length: f.length === "" ? null : Number(f.length),
      width: f.width === "" ? null : Number(f.width), height: f.height === "" ? null : Number(f.height),
      shipping_charges: Number(f.shipping_charges || 0), free_shipping: Boolean(f.free_shipping), warranty_period: f.warranty_period.trim(),
      return_policy: f.return_policy.trim(), replacement_available: Boolean(f.replacement_available),
      seo_title: "", meta_description: "", status: action === "publish" ? "active" : "draft",
    };
    try {
      if (imageUrls.length && f.name.trim()) {
        const { data } = await api.post("/uploads/product-images/rename/", { urls: imageUrls, product_name: f.name.trim() });
        const urlMap = data.url_map || {};
        renamedUrls = Object.values(urlMap);
        imageUrls = imageUrls.map((url) => urlMap[url] || url);
        payload.image_urls = imageUrls;
        payload.image_url = imageUrls[0] || "";
      }
      if (action === "draft") {
        const draftPayload = { ...payload, status: "draft" };
        const requestData = {
          data: draftPayload,
          ...(modal.edit?.persisted ? { product_id: modal.edit.id } : {}),
        };
        const { data } = modal.edit?.draft_id
          ? await api.patch(`/seller/drafts/${modal.edit.draft_id}/`, requestData)
          : await api.post("/seller/drafts/", requestData);
        const savedDraft = mapApiDraft(data);
        setP((items) => [...items.filter((product) => product.draft_id !== modal.edit?.draft_id), savedDraft]);
        setModal({ edit: savedDraft });
        keepDraftOpen = true;
        toast("Draft saved. You can continue editing and save again.");
      } else if (modal.edit?.draft_id) {
        const { data } = await api.post(`/seller/drafts/${modal.edit.draft_id}/publish/`, { data: payload });
        const publishedProduct = mapApiProduct(data);
        setP((items) => {
          const withoutDraft = items.filter((product) => product.draft_id !== modal.edit.draft_id);
          const hasProduct = withoutDraft.some((product) => product.id === data.id);
          return hasProduct
            ? withoutDraft.map((product) => product.id === data.id ? publishedProduct : product)
            : [publishedProduct, ...withoutDraft];
        });
      } else if (modal.edit?.persisted) {
        const { data } = await api.patch(`/products/${modal.edit.id}/`, payload);
        setP((items) => items.map((product) => product.id === data.id ? mapApiProduct(data) : product));
      } else {
        const { data } = await api.post("/products/", payload);
        setP((items) => [mapApiProduct(data), ...items]);
      }
      if (action === "publish") {
        setCATS((categories) => categories.includes(f.category) || !f.category ? categories : [...categories, f.category].sort((a, b) => a.localeCompare(b)));
      }
      const oldUrls = f.images.filter((url) => !imageUrls.includes(url));
      await Promise.allSettled(oldUrls.map((url) => api.post("/uploads/product-images/remove/", { url })));
      if (!keepDraftOpen) setModal(null);
    } catch (error) {
      if (renamedUrls.length) await Promise.allSettled(renamedUrls.map((url) => api.post("/uploads/product-images/remove/", { url })));
      const data = error.response?.data;
      const detail = data?.detail || Object.entries(data || {}).map(([field, messages]) => `${field.replaceAll("_", " ")}: ${Array.isArray(messages) ? messages.join(" ") : messages}`).join(" · ");
      setSaveError(detail || "Could not save this product. Check your details and try again.");
    } finally { setSaving(false); }
  };
  const report = () => {
    const c = "Name,ID,Category,Price,Stock,Profit\n" + L.filter((p) => !p.draft_id).map((p) => [p.name, p.id, p.cat, p.price, p.stock, p.profit ?? ""].join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(c); a.download = "products-report.csv"; a.click();
  };
  const th = (k, t) => <th onClick={() => setSort({ k, d: sort.k === k ? -sort.d : 1 })}>{t} ⇅</th>;

  return (
    <div className="content">
      <div className="top">
        <h2>Products</h2>
        <label className="search"><Ic p={SEARCH} /><input placeholder="Search here..." value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <div className="btns">
          <button className="btn p" onClick={() => openModal()}><Ic p={PLUS} />Add Products</button>
          <button className="btn o" onClick={report}><Ic p={DL} />View Reports</button>
        </div>
      </div>
      <Stats products={P} orders={ORD} />
      <div className="panel">
        <div className="ph"><h3>Product List</h3>
          <div className="filters">
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">All Categories</option>{CATS.map((c) => <option key={c}>{c}</option>)}<option value="__drafts__">Drafts</option>
            </select>
            <select value={fp} onChange={(e) => setFp(e.target.value)}>
              <option value="">Any Price</option><option value="0-50">Under ₹50</option>
              <option value="50-200">₹50 to ₹200</option><option value="200-9999">Above ₹200</option>
            </select>
            <select value={fs} onChange={(e) => setFs(e.target.value)}>
              <option value="">All Stock</option><option value="in">In Stock</option><option value="low">Low Stock</option>
            </select>
          </div>
        </div>
        <div className="cats">
          {["All", ...CATS, "Drafts"].map((c) => (
            <button key={c} className={"cat" + ((c === "All" && !cat) || (c === "Drafts" && draftView) || c === cat ? " on" : "")} onClick={() => setCat(c === "All" ? "" : c === "Drafts" ? "__drafts__" : c)}>{c}</button>
          ))}
        </div>
        <div className="tw"><table>
          <thead><tr>{th("id", draftView ? "Draft" : "Product ID")}<th>Product</th>{th("price", "Price")}{th("stock", "Stock")}<th>Action</th></tr></thead>
          <tbody>
            {L.length ? L.map((p) => (
              <tr key={p.id} className={"row" + (open === p.id ? " act" : "")}>
                <td data-l={p.draft_id ? "Draft" : "Product ID"}>{p.draft_id ? "Draft" : p.id}</td>
                <td data-l="Product" className="nm"><div className="pn"><div className="th" style={{ background: COL[Math.max(0, CATS.indexOf(p.cat)) % 7] }}>{p.image_url ? <img src={resolveImageUrl(p.image_url)} alt={p.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : EM[p.cat] || "📦"}</div>{p.name}</div></td>
                <td data-l="Price">{money(p.price)}</td>
                <td data-l="Stock" className={Number(p.stock) <= Number(p.low_stock_threshold ?? 5) ? "low" : ""}>{p.stock} {p.stock === 1 ? "pc" : "pcs"}</td>
                <td className="ac">
                  <span className="mw" style={{ position: "relative", display: "inline-block" }}>
                    <button className="more" aria-label={`Actions for ${p.name}`} aria-expanded={open === p.id} onClick={(event) => {
                      if (open === p.id) { setOpen(null); return; }
                      const rect = event.currentTarget.getBoundingClientRect();
                      const menuHeight = 108;
                      const top = rect.bottom + menuHeight + 10 <= window.innerHeight ? rect.bottom + 8 : Math.max(8, rect.top - menuHeight - 8);
                      setActionPos({ top, left: Math.max(8, Math.min(window.innerWidth - 168, rect.right - 150)) });
                      setOpen(p.id);
                    }}>•••</button>
                  </span>
                </td>
              </tr>
            )) : <tr><td className="empty" colSpan="5">{draftView ? "No saved drafts yet." : cat ? `No products in ${cat} yet. Add a product in this category to see it here.` : "No products found."}</td></tr>}
          </tbody>
        </table></div>
      </div>

      {open && actionPos && (() => {
        const product = P.find((item) => item.id === open);
        if (!product) return null;
        return createPortal(
          <div className="sellerActionMenu" style={{ top: actionPos.top, left: actionPos.left }} role="menu" aria-label={`Actions for ${product.name}`}>
            <button role="menuitem" onClick={() => openModal(product)}><Ic p={EDIT} />Edit</button>
            <button role="menuitem" onClick={async () => { try { if (product.draft_id) await api.delete(`/seller/drafts/${product.draft_id}/`); else if (product.persisted) await api.delete(`/products/${product.id}/`); setP((items) => items.filter((x) => x.id !== product.id)); setOpen(null); } catch (error) { setSaveError(error.response?.data?.detail || "Could not remove this product"); } }}><Ic p={TRASH} />Remove</button>
          </div>, document.body,
        );
      })()}

      {modal && createPortal(
        <div className="sellerDashRoot sellerModalPortal" data-theme={theme}>
          <div className="modal show" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
            <form className="box sellerProductDialog" role="dialog" aria-modal="true" aria-labelledby="seller-product-title" noValidate onSubmit={(event) => { event.preventDefault(); saveP("publish"); }}>
              <h3 id="seller-product-title">{modal.edit ? "Edit Product" : "Add Product"}</h3>
              <div className="sellerProductSection"><h4>1. Basic Product Information</h4><div className="sellerProductGrid">
                <label>Product Name *<input ref={nameRef} required maxLength="180" value={f.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. iPhone 15 Pro" /></label>
                <label>Product SKU / Code *<input required maxLength="80" value={f.sku} onChange={(e) => updateField("sku", e.target.value.toUpperCase())} placeholder="e.g. APP-IP15P-256" /></label>
                <label>Category *<select required value={f.category} onChange={(e) => { const category = e.target.value; setF((current) => ({ ...current, category, subcategory: "", brand: "", customBrand: "", specifications: {} })); }}><option value="">Select category</option>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
                <label>Subcategory *{subcategories.length ? <select required disabled={!f.category} value={f.subcategory} onChange={(e) => updateField("subcategory", e.target.value)}><option value="">Select subcategory</option>{subcategories.map((subcategory) => <option key={subcategory}>{subcategory}</option>)}</select> : <input required disabled={!f.category} maxLength="100" value={f.subcategory} onChange={(e) => updateField("subcategory", e.target.value)} placeholder={f.category ? "Enter subcategory" : "Select a category first"} />}</label>
                <label>Brand *<select required disabled={!f.category} value={f.brand} onChange={(e) => updateField("brand", e.target.value)}><option value="">Select a brand</option>{(PRODUCT_BRANDS[f.category] || ["Other"]).map((brand) => <option key={brand}>{brand}</option>)}</select></label>
                {f.brand === "Other" && <label>Brand name *<input required maxLength="100" value={f.customBrand || ""} onChange={(e) => updateField("customBrand", e.target.value)} placeholder="Enter brand name" /></label>}
                <label>Short Description (Optional)<input maxLength="300" value={f.short_description} onChange={(e) => updateField("short_description", e.target.value)} placeholder="A quick summary for buyers" /></label>
                <label className="sellerProductFull">Product Description *<textarea required maxLength="3000" rows="4" value={f.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Describe features, condition and what is included." /></label>
              </div></div>

              <div className="sellerProductSection"><h4>2. Product Images</h4>
                <p className="sellerImageHelp">{uploadingImages ? "Updating image order and saved image names…" : `${f.images.length}/8 images · Add JPG, PNG or WebP files (max 5 MB each). Image 1 is the main image; use the arrows to choose the display order.`}</p>
                <div className="sellerImageGrid">
                  {f.images.map((image, index) => <div className="sellerImageCard" key={`${image}-${index}`}>
                    <div className="sellerImagePreview"><img src={resolveImageUrl(image)} alt={`Product image ${index + 1}`} /><span>Image {index + 1}{index === 0 ? " · Main" : ""}</span></div>
                    <div className="sellerImageActions">
                      <button type="button" aria-label={`Move image ${index + 1} earlier`} disabled={uploadingImages || saving || index === 0} onClick={() => moveImage(index, -1)}>←</button>
                      <button type="button" aria-label={`Move image ${index + 1} later`} disabled={uploadingImages || saving || index === f.images.length - 1} onClick={() => moveImage(index, 1)}>→</button>
                      {index > 0 && <button type="button" disabled={uploadingImages || saving} onClick={() => setPrimaryImage(index)}>Make main</button>}
                    <button type="button" className="sellerImageRemove" disabled={uploadingImages || saving} onClick={() => removeImage(index)}>{uploadingImages ? "Removing…" : "Remove"}</button>
                    </div>
                  </div>)}
                  <div className="sellerImageAddTile">
                    <label className="sellerImageAddButton" htmlFor="seller-product-images" aria-disabled={uploadingImages || f.images.length >= 8}>{uploadingImages ? "Uploading…" : "+ Add images"}</label>
                    <small>{f.images.length >= 8 ? "Maximum 8 images" : "Images appear here after upload"}</small>
                    <input id="seller-product-images" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploadingImages || f.images.length >= 8} onChange={uploadImages} />
                  </div>
                </div>
              </div>

              <div className="sellerProductSection"><h4>3. Pricing & Inventory</h4><div className="sellerProductGrid">
                <label>Selling Price (₹) *<input type="number" min="0.01" step="0.01" required value={f.price} onChange={(e) => updateField("price", e.target.value)} /></label>
                <label>MRP / Original Price (₹) *<input type="number" min={f.price || "0.01"} step="0.01" required value={f.mrp} onChange={(e) => updateField("mrp", e.target.value)} /></label>
                <label>Discount (Automatic)<div className="sellerReadonlyField">{Number(f.mrp) > Number(f.price) ? `${(((Number(f.mrp) - Number(f.price)) / Number(f.mrp)) * 100).toFixed(2)}% OFF` : "0% OFF"}</div></label>
                <label>Available Stock *<input type="number" min="0" step="1" required value={f.stock} onChange={(e) => updateField("stock", e.target.value)} /></label>
                <label>Low Stock Alert Quantity<input type="number" min="0" step="1" value={f.low_stock_threshold} onChange={(e) => updateField("low_stock_threshold", e.target.value)} /></label>
                <label>Tax / GST Rate (%)<input type="number" min="0" max="100" step="0.01" value={f.tax_rate} onChange={(e) => updateField("tax_rate", e.target.value)} placeholder="As applicable" /></label>
              </div></div>

              <div className="sellerProductSection"><h4>4. Product Specifications</h4><div className="sellerProductGrid">
                {(PRODUCT_SPEC_FIELDS[f.category] || ["Model", "Color", "Compatibility"]).map((specification) => <label key={specification}>{specification}<input value={f.specifications[specification] || ""} onChange={(e) => updateField("specifications", { ...f.specifications, [specification]: e.target.value })} placeholder={PRODUCT_SPEC_EXAMPLES[specification] || `e.g. Add ${specification.toLowerCase()}`} /></label>)}
              </div></div>

              <div className="sellerProductSection"><h4>5. Shipping & Warranty</h4><div className="sellerProductGrid">
                <label>Product Weight (kg)<input type="number" min="0" step="0.01" value={f.weight} onChange={(e) => updateField("weight", e.target.value)} /></label>
                <label>Length (cm)<input type="number" min="0" step="0.01" value={f.length} onChange={(e) => updateField("length", e.target.value)} /></label>
                <label>Width (cm)<input type="number" min="0" step="0.01" value={f.width} onChange={(e) => updateField("width", e.target.value)} /></label>
                <label>Height (cm)<input type="number" min="0" step="0.01" value={f.height} onChange={(e) => updateField("height", e.target.value)} /></label>
                <label>Shipping Charges (₹)<input type="number" min="0" step="0.01" value={f.shipping_charges} onChange={(e) => updateField("shipping_charges", e.target.value)} /></label>
                <label>Warranty Period<input value={f.warranty_period} onChange={(e) => updateField("warranty_period", e.target.value)} placeholder="e.g. 1 year" /></label>
                <label className="sellerCheckField"><input type="checkbox" checked={f.free_shipping} onChange={(e) => updateField("free_shipping", e.target.checked)} /> Free Shipping</label>
                <label className="sellerCheckField"><input type="checkbox" checked={f.replacement_available} onChange={(e) => updateField("replacement_available", e.target.checked)} /> Replacement Available</label>
                <label className="sellerProductFull">Return Policy<textarea rows="2" maxLength="500" value={f.return_policy} onChange={(e) => updateField("return_policy", e.target.value)} placeholder="Add your return policy details" /></label>
              </div></div>

              <div className="sellerProductSection"><h4>6. Save or Publish</h4><div className="sellerFeaturedNote">Save a draft and continue editing later, or publish it when all required details are ready.</div></div>

              {saveError && <p className="sellerProductError" role="alert">{saveError}</p>}
              <div className="btns"><button type="button" className="btn o" disabled={saving || uploadingImages} onClick={() => setModal(null)}>Cancel</button><button type="button" className="btn o" disabled={saving || uploadingImages} onClick={() => saveP("draft")}>{saving ? "Saving…" : "Save Draft"}</button><button type="submit" className="btn p" disabled={saving || uploadingImages}>{uploadingImages ? "Uploading images…" : saving ? "Saving…" : "Publish Product"}</button></div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/* ---------- other pages ---------- */
function Dashboard({ P, ORD }) {
  const [weekOffset, setWeekOffset] = useState(0), [hoveredDay, setHoveredDay] = useState(null);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6 + weekOffset * 7);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  const weekRange = `${weekStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
  const weekly = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart); date.setDate(weekStart.getDate() + index);
    const dayOrders = ORD.filter((order) => order.st !== "cancelled" && new Date(order.created_at).toDateString() === date.toDateString());
    return {
      label: date.toLocaleDateString("en-IN", { weekday: "short" }),
      fullDate: date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
      revenue: dayOrders.reduce((sum, order) => sum + order.amt, 0),
      orders: dayOrders.length,
      units: dayOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0), 0),
    };
  });
  const maxSales = Math.max(...weekly.map((day) => day.revenue), 1);
  const low = P.filter((p) => p.status !== "draft" && p.name?.trim() && Number(p.stock) <= Number(p.low_stock_threshold ?? 5));
  const listedProducts = P.filter((product) => product.status !== "draft" && product.name?.trim());
  const countBy = (getLabel) => {
    const counts = new Map();
    listedProducts.forEach((product) => {
      const label = String(getLabel(product) || "").trim();
      if (!label) return;
      const key = label.toLocaleLowerCase();
      const current = counts.get(key);
      counts.set(key, { label: current?.label || label, count: (current?.count || 0) + 1 });
    });
    return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 5);
  };
  const topCategories = countBy((product) => product.cat);
  const topBrands = countBy((product) => product.brand);
  const renderProductBreakdown = (rows, emptyMessage) => rows.length ? (
    <div className="sellerDashboardBreakdown">
      {rows.map(({ label, count }) => (
        <div className="sellerDashboardBreakdownRow" key={label}>
          <div className="sellerDashboardBreakdownLabel" title={label}>{label}</div>
          <div className="sellerDashboardBreakdownTrack" aria-label={`${count} ${count === 1 ? "product" : "products"}`}><i style={{ width: `${(count / rows[0].count) * 100}%` }} /></div>
          <b>{count}</b>
        </div>
      ))}
    </div>
  ) : <div className="empty">{emptyMessage}</div>;
  return (
    <div className="content">
      <Head t="Dashboard" /><Stats products={P} orders={ORD} />
      <div className="two">
        <div className="panel"><div className="ph"><h3>Weekly Sales</h3><div className="weeklySalesNav"><button type="button" className="lk" aria-label="Show previous week sales" onClick={() => { setWeekOffset((value) => value - 1); setHoveredDay(null); }}>← Previous</button><span>{weekRange}</span><button type="button" className="lk" aria-label="Show next week sales" disabled={weekOffset === 0} onClick={() => { setWeekOffset((value) => Math.min(0, value + 1)); setHoveredDay(null); }}>Next →</button></div></div>
          <div className="weeklyChartStage"><svg viewBox="0 0 360 140" style={{ width: "100%" }}>
            {weekly.map((day, i) => (
              <g key={day.label}>
                <rect x={i * 50 + 12} y={110 - (day.revenue / maxSales) * 90} width="28" height={Math.max(1, (day.revenue / maxSales) * 90)} rx="7" fill="var(--pri)" opacity={i === 6 ? 1 : 0.35} tabIndex="0" role="graphics-symbol" aria-label={`${day.label}: ${day.orders} orders, ${day.units} products, ${money(day.revenue)} sales`} onMouseEnter={() => setHoveredDay(i)} onMouseLeave={() => setHoveredDay(null)} onFocus={() => setHoveredDay(i)} onBlur={() => setHoveredDay(null)}>
                  <title>{`${day.label}: ${day.units} ${day.units === 1 ? "product" : "products"} ordered · ${day.orders} ${day.orders === 1 ? "order" : "orders"} · ${money(day.revenue)} revenue`}</title>
                </rect>
                <text x={i * 50 + 26} y="130" textAnchor="middle" fontSize="11" fill="var(--muted)">{day.label}</text>
              </g>
            ))}
          </svg>{hoveredDay !== null && <div className="weeklySalesTooltip" style={{ left: `${((hoveredDay + 0.5) / 7) * 100}%` }} role="tooltip"><b>{weekly[hoveredDay].fullDate}</b><span>{weekly[hoveredDay].orders} {weekly[hoveredDay].orders === 1 ? "order" : "orders"}</span><span>{weekly[hoveredDay].units} {weekly[hoveredDay].units === 1 ? "product" : "products"} ordered</span><strong>{money(weekly[hoveredDay].revenue)}</strong></div>}</div>
        </div>
        <div className="panel"><div className="ph"><h3>Recent Orders</h3><a href="#orders" className="lk">View all</a></div>
          {ORD.slice(0, 5).map((o) => (
            <div className="lr" key={o.id}><div className="g"><b>{o.orderNumber}</b><br /><small>{o.c} · {o.p}</small></div><Bd s={o.st} /><b>{money(o.amt)}</b></div>
          ))}
        </div>
        <div className="panel"><div className="ph"><h3>Low Stock Alerts</h3><a href="#inventory" className="lk">Restock</a></div>
          {low.length ? low.map((p) => <div className="lr" key={p.id}><div className="g"><b>{p.name}</b></div><span className="low">Stock: {p.stock} left</span></div>) : <div className="empty">All items are well stocked</div>}
        </div>
        <div className="panel"><div className="ph"><h3>Top Categories</h3><small>Products by category</small></div>
          {renderProductBreakdown(topCategories, "No categorized products yet")}
        </div>
        <div className="panel"><div className="ph"><h3>Top Brands</h3><small>Products by brand</small></div>
          {renderProductBreakdown(topBrands, "No brands used in products yet")}
        </div>
      </div>
    </div>
  );
}

function Orders({ ORD, setORD, toast }) {
  const [of, setOf] = useState("All");
  const [savingOrder, setSavingOrder] = useState(null);
  const L = ORD.filter((o) => of === "All" || o.st === of);
  const advanceOrder = async (order) => {
    const next = order.st === "paid" ? "processing" : "shipped";
    setSavingOrder(order.id);
    try {
      const { data } = await api.patch(`/orders/${order.id}/status/`, { status: next });
      setORD((current) => current.map((item) => item.id === order.id ? { ...item, status: data.status, st: data.status } : item));
      toast(`${order.orderNumber}: ${statusLabel(next)}`);
    } catch (error) { toast(error.response?.data?.detail || "Could not update this order."); }
    finally { setSavingOrder(null); }
  };
  return (
    <div className="content"><Head t="Orders" />
      <div className="panel">
        <div className="cats">
          {["All", ...ST].map((s) => <button key={s} className={"cat" + (s === of ? " on" : "")} onClick={() => setOf(s)}>{s === "All" ? s : s === "paid" ? "Pending" : statusLabel(s)} ({s === "All" ? ORD.length : ORD.filter((o) => o.st === s).length})</button>)}
        </div>
        {L.length ? <div className="sellerOrdersTableWrap"><table className="sellerOrdersTable"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Qty</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>
          {L.map((o) => <tr key={o.id}>
            <td><b>{o.orderNumber}</b></td><td>{o.c}</td>
            <td><div className="sellerOrdersItems">{o.items.map((item) => <div className="sellerOrdersProduct" key={item.id}><span>{item.product_image ? <img src={resolveImageUrl(item.product_image)} alt={item.product_name} /> : "📦"}</span><b>{item.product_name}</b></div>)}</div></td>
            <td><div className="sellerOrdersQty">{o.items.map((item) => <b key={item.id}>{item.quantity}</b>)}</div></td>
            <td><b className="sellerOrdersAmount">{money(o.amt)}</b></td><td><Bd s={o.st === "paid" ? "pending" : o.st} /></td><td>{o.d}</td>
            <td>{o.st === "paid" || o.st === "processing" ? <button className="btn o sm" disabled={savingOrder === o.id} onClick={() => advanceOrder(o)}>{savingOrder === o.id ? "Saving…" : o.st === "paid" ? "Start processing" : "Mark shipped"}</button> : <span className="sellerOrderComplete">{statusLabel(o.st)}</span>}</td>
          </tr>)}
        </tbody></table></div> : <div className="empty">No orders</div>}
      </div>
    </div>
  );
}

function Inventory({ P, setP, toast }) {
  const bump = async (id, d) => {
    const product = P.find((item) => item.id === id);
    if (!product?.persisted) return;
    try {
      const { data } = await api.patch(`/products/${id}/`, { stock: Math.max(0, Number(product.stock) + d) });
      setP((items) => items.map((item) => item.id === id ? mapApiProduct(data) : item)); toast("Stock updated");
    } catch (error) { toast(error.response?.data?.detail || "Could not update stock"); }
  };
  return (
    <div className="content"><Head t="Inventory" />
      <div className="panel">
        {P.filter((p) => p.status !== "draft").map((p) => (
          <div className="lr" key={p.id}>
            <div className="g"><b>{p.name}</b><br /><small>{p.cat} · ID {p.id}</small>
              <div className="bar"><i style={{ width: Math.min(100, p.stock / Math.max(1, p.low_stock_threshold || 5)) + "%", background: p.stock <= Number(p.low_stock_threshold ?? 5) ? "var(--red)" : "var(--pri)" }} /></div></div>
            <span className={p.stock <= Number(p.low_stock_threshold ?? 5) ? "low" : ""}>{p.stock} pcs{p.stock <= Number(p.low_stock_threshold ?? 5) ? " · Low" : ""}</span>
            <button className="btn o sm" onClick={() => bump(p.id, -10)}>−10</button>
            <button className="btn p sm" onClick={() => bump(p.id, 10)}>+10</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Categories({ P, CATS, setCATS, savedCategories, setSavedCategories, toast, onSelectCategory }) {
  const [nc, setNc] = useState("");
  const add = async () => {
    const n = nc.trim(); if (!n) return;
    if (CATS.some((c) => c.toLowerCase() === n.toLowerCase())) return toast("Category already exists");
    try {
      const { data } = await api.post("/seller/categories/", { name: n });
      setSavedCategories((items) => [...items, data].sort((a, b) => a.name.localeCompare(b.name)));
      setCATS((items) => [...new Set([...items, data.name])].sort((a, b) => a.localeCompare(b)));
      setNc(""); toast("Category added and ready for products");
    } catch (error) { toast(error.response?.data?.name?.[0] || error.response?.data?.detail || "Could not add category"); }
  };
  const del = async (c) => {
    if (STANDARD_CATEGORIES.includes(c)) return toast("Standard categories can't be deleted");
    if (P.some((p) => p.cat === c)) return toast("Remove or reclassify its products before this category can disappear");
    const saved = savedCategories.find((item) => item.name === c);
    if (!saved) return toast("This category is already part of a saved product");
    try {
      await api.delete(`/seller/categories/${saved.id}/`);
      setSavedCategories((items) => items.filter((item) => item.id !== saved.id));
      setCATS((items) => items.filter((item) => item !== c));
      toast("Category deleted");
    } catch (error) { toast(error.response?.data?.detail || "Could not delete category"); }
  };
  return (
    <div className="content">
      <Head t="Categories"><div className="btns"><input className="in" placeholder="New category" value={nc} onChange={(e) => setNc(e.target.value)} /><button className="btn p sm" onClick={add}>Add</button></div></Head>
      <div className="cg">
        {CATS.map((c, i) => (
          <div className="panel cc" key={c}>
            <button className="categoryBrowse" type="button" onClick={() => onSelectCategory(c)} aria-label={`View ${c} products`}>
              <span className="th" style={{ background: COL[i % 7] }}>{EM[c] || "📦"}</span><b>{c}</b>
              <small>{P.filter((p) => !p.draft_id && p.status !== "draft" && p.cat === c).length} products · View list</small>
            </button>
            <button className="btn o sm" disabled={STANDARD_CATEGORIES.includes(c) || P.some((p) => p.cat === c)} onClick={() => del(c)}>{STANDARD_CATEGORIES.includes(c) ? "Standard" : P.some((p) => p.cat === c) ? "In use" : "Delete"}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Customers({ ORD, P }) {
  const [cq, setCq] = useState("");
  const [selected, setSelected] = useState(null);
  const customers = new Map();
  ORD.forEach((order) => {
    const key = order.customer ?? order.customer_email ?? order.customer_name ?? order.c;
    const customer = customers.get(key) || { id: key, n: order.customer_name || order.c || "Customer", e: order.customer_email || "", orders: [], spend: 0, address: order.delivery_address || {} };
    customer.orders.push(order);
    if (order.st !== "cancelled") customer.spend += order.amt;
    if (order.delivery_address && Object.keys(order.delivery_address).length) customer.address = order.delivery_address;
    customers.set(key, customer);
  });
  const L = [...customers.values()]
    .map((customer) => ({ ...customer, orders: [...customer.orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) }))
    .filter((customer) => `${customer.n} ${customer.e}`.toLowerCase().includes(cq.toLowerCase()));
  const addressFields = selected?.address && typeof selected.address === "object"
    ? Object.entries(selected.address).filter(([, value]) => value !== null && value !== undefined && String(value).trim() && typeof value !== "object")
    : [];
  return (
    <div className="content">
      <Head t="Customers"><input className="in" placeholder="Search customers" value={cq} onChange={(e) => setCq(e.target.value)} /></Head>
      <div className="panel">
        {L.length ? <div className="customerTableWrap"><table className="customerTable">
          <thead><tr><th>Customer</th><th>Email</th><th>Orders</th><th>Total spend</th><th>Details</th></tr></thead>
          <tbody>{L.map((customer) => {
            const initials = customer.n.split(" ").filter(Boolean).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
            return <tr key={customer.id}>
              <td><div className="customerIdentity"><div className="av sm">{initials || "C"}</div><b>{customer.n}</b></div></td>
              <td>{customer.e || "—"}</td>
              <td>{customer.orders.length}</td>
              <td><b>{money(customer.spend)}</b></td>
              <td><button className="customerViewButton" onClick={() => setSelected(customer)}>View details</button></td>
            </tr>;
          })}</tbody>
        </table></div> : <div className="empty">No customers found</div>}
      </div>
      {selected && createPortal(
        <div className="sellerCustomerOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section className="sellerCustomerDialog" role="dialog" aria-modal="true" aria-labelledby="seller-customer-title">
            <header><div><small>Customer profile</small><h3 id="seller-customer-title">{selected.n}</h3><span>{selected.e || "Email unavailable"}</span></div><button className="customerClose" aria-label="Close customer details" onClick={() => setSelected(null)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></header>
            <div className="customerDetailsGrid">
              <div className="detailField"><small>Customer ID</small><b>{selected.id}</b></div>
              <div className="detailField"><small>Orders placed</small><b>{selected.orders.length}</b></div>
              <div className="detailField"><small>Total spend</small><b>{money(selected.spend)}</b></div>
              {addressFields.map(([key, value]) => <div className="detailField" key={key}><small>{key.replaceAll("_", " ")}</small><b>{String(value)}</b></div>)}
            </div>
            <h4>Recent orders</h4>
            <div className="customerOrderTableWrap"><table className="customerOrderTable">
              <thead><tr><th>Order ID</th><th>Product</th><th>Qty</th><th>Price</th><th>Status</th></tr></thead>
              <tbody>{selected.orders.flatMap((order) => order.items.map((item) => {
                const product = P.find((entry) => Number(entry.id) === Number(item.product));
                const image = item.product_image || product?.image_url || product?.image_urls?.[0];
                return <tr key={`${order.id}-${item.id}`}>
                <td><b>{order.orderNumber}</b></td>
                <td><div className="customerProductCell"><div className="customerProductImage">{image ? <img src={resolveImageUrl(image)} alt={item.product_name || "Product"} onError={(event) => { const fallback = product?.image_urls?.find((url) => url && url !== image); if (fallback && !event.currentTarget.dataset.fallbackTried) { event.currentTarget.dataset.fallbackTried = "true"; event.currentTarget.src = resolveImageUrl(fallback); } else event.currentTarget.hidden = true; }} /> : "📦"}</div><span>{item.product_name}</span></div></td>
                <td>{item.quantity}</td>
                <td>{money(Number(item.unit_price) * Number(item.quantity))}</td>
                <td><Bd s={order.st} /></td>
              </tr>;
              }) )}</tbody>
            </table></div>
          </section>
        </div>, document.body,
      )}
    </div>
  );
}

function Settings({ SET, theme, onSave }) {
  const [d, setD] = useState({ ...SET, theme });
  const [saving, setSaving] = useState(false);
  const up = (k, val) => setD({ ...d, [k]: val });
  const submit = async () => { setSaving(true); try { await onSave(d); } catch { /* save handler shows the API error */ } finally { setSaving(false); } };
  return (
    <div className="content"><Head t="Settings" />
      <div className="settingsLayout">
        <section className="panel set settingsCard">
          <div className="settingsCardHeading"><span className="settingsIcon">♙</span><div><h3>Account information</h3><p>These details are read-only for account security.</p></div></div>
          <label htmlFor="seller-settings-name">Full name</label><input id="seller-settings-name" className="in" value={d.name} readOnly aria-readonly="true" />
          <label htmlFor="seller-settings-email">Email address</label><input id="seller-settings-email" className="in" type="email" value={d.email} readOnly aria-readonly="true" />
          <label htmlFor="seller-settings-store">Store name</label><input id="seller-settings-store" className="in" value={d.store} readOnly aria-readonly="true" />
          <p className="settingsHelp">Need to correct account or store information? Contact ShopSphere support.</p>
        </section>

        <section className="panel set settingsCard">
          <div className="settingsCardHeading"><span className="settingsIcon">⚙</span><div><h3>Appearance</h3><p>Choose how your seller workspace looks.</p></div></div>
          <label htmlFor="seller-settings-theme">Dashboard theme</label>
          <select id="seller-settings-theme" value={d.theme} onChange={(e) => up("theme", e.target.value)}><option value="light">Light</option><option value="dark">Dark</option></select>
        </section>

        <section className="panel set settingsCard settingsNotifications">
          <div className="settingsCardHeading"><span className="settingsIcon">♧</span><div><h3>Notifications</h3><p>Pause alerts or choose the updates you want to see.</p></div></div>
          <label className="settingsPause"><span><b>Pause all notifications</b><small>Hide notifications until you turn them back on. Your alerts will be kept.</small></span><input type="checkbox" checked={Boolean(d.nPaused)} onChange={(e) => up("nPaused", e.target.checked)} /></label>
          <div className={d.nPaused ? "settingsAlertOptions paused" : "settingsAlertOptions"}>
            {[["nOrd", "Orders and new customers"], ["nStock", "Low stock alerts"], ["nDraft", "Saved draft alerts"]].map(([key, label]) => (
              <label className="tg" key={key}><span>{label}</span><input type="checkbox" checked={Boolean(d[key])} disabled={d.nPaused} onChange={(e) => up(key, e.target.checked)} /></label>
            ))}
          </div>
          {d.nPaused && <p className="settingsPausedNote" role="status">Notifications are paused. Resume them any time to see your existing alerts again.</p>}
        </section>

        <div className="settingsSaveBar"><span>Settings are saved on this device.</span><button className="btn p" disabled={saving} onClick={submit}>{saving ? "Saving…" : "Save changes"}</button></div>
      </div>
    </div>
  );
}

/* ---------- app shell ---------- */
export default function ShopSphereDashboard({ user, onLogout }) {
  const get = () => { const r = window.location.hash.slice(1); return R.includes(r) ? r : "dashboard"; };
  const prefKey = `shopsphere-seller-settings-${user?.id || "me"}`;
  const noticeKey = `shopsphere-seller-read-notices-${user?.id || "me"}`;
  const dismissedNoticeKey = `shopsphere-seller-dismissed-notices-${user?.id || "me"}`;
  const readPrefs = () => { try { return JSON.parse(localStorage.getItem(prefKey) || "{}"); } catch { return {}; } };
  const readNoticePrefs = () => { try { return JSON.parse(localStorage.getItem(noticeKey) || "[]"); } catch { return []; } };
  const readDismissedNoticePrefs = () => { try { return JSON.parse(localStorage.getItem(dismissedNoticeKey) || "[]"); } catch { return []; } };
  const [route, setRoute] = useState(get);
  const [side, setSide] = useState(false), [sideCollapsed, setSideCollapsed] = useState(false), [np, setNp] = useState(false), [theme, setTheme] = useState(() => readPrefs().theme || "light"), [tm, setTm] = useState("");
  const [P, setP] = useState([]), [CATS, setCATS] = useState(STANDARD_CATEGORIES), [savedCategories, setSavedCategories] = useState([]);
  const [ORD, setORD] = useState([]), [readNotices, setReadNotices] = useState(readNoticePrefs);
  const [dismissedNotices, setDismissedNotices] = useState(readDismissedNoticePrefs);
  const [SET, setSET] = useState(() => ({ nOrd: true, nStock: true, nDraft: true, ...readPrefs(), name: user?.full_name || user?.username || "Seller", email: user?.email || "", store: user?.seller_profile?.store_name || user?.username || "Seller" }));
  const [selectedCategory, setSelectedCategory] = useState("");

  const toast = (m) => { setTm(m); setTimeout(() => setTm(""), 2200); };
  const refreshData = async (showError = false) => {
    const [productResult, orderResult, categoryResult, draftResult] = await Promise.allSettled([
      api.get("/products/"), api.get("/orders/"), api.get("/seller/categories/"), api.get("/seller/drafts/"),
    ]);
    const list = (response) => Array.isArray(response.data) ? response.data : response.data.results || [];
    let products = P.filter((product) => product.status !== "draft"), orders = ORD, categories = savedCategories;
    let dataFailed = false;
    if (productResult.status === "fulfilled") {
      products = list(productResult.value)
        .filter((product) => Number(product.seller) === Number(user?.id) && product.status !== "draft")
        .map(mapApiProduct);
    } else dataFailed = true;
    if (orderResult.status === "fulfilled") {
      orders = list(orderResult.value).map((order) => mapApiOrder(order, user?.id)).filter((order) => order.items.length);
      setORD(orders);
    } else dataFailed = true;
    if (categoryResult.status === "fulfilled") {
      categories = list(categoryResult.value); setSavedCategories(categories);
    } else dataFailed = true;
    let drafts = P.filter((product) => product.draft_id);
    if (draftResult.status === "fulfilled") {
      drafts = list(draftResult.value).map(mapApiDraft);
    } else dataFailed = true;
    setP([...products, ...drafts]);
    if (productResult.status === "fulfilled" || categoryResult.status === "fulfilled") {
      setCATS([...new Set([...STANDARD_CATEGORIES, ...categories.map((category) => category.name), ...products.map((product) => product.cat)].filter(Boolean))].sort((a, b) => a.localeCompare(b)));
    }
    if (showError && dataFailed) toast("Could not load products, drafts, orders or categories. Check the server connection.");
  };
  useEffect(() => {
    let active = true;
    const refresh = async (showError = false) => { if (active) await refreshData(showError); };
    refresh(true);
    const timer = window.setInterval(() => refresh(false), 8000);
    const onFocus = () => refresh(false);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(false); };
    const onStorage = (event) => { if (event.key === "shopsphere-seller-data-changed") refresh(false); };
    window.addEventListener("focus", onFocus); document.addEventListener("visibilitychange", onVisible); window.addEventListener("storage", onStorage);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("storage", onStorage); };
  }, [user?.id]);
  useEffect(() => { try { localStorage.setItem(prefKey, JSON.stringify({ ...SET, theme })); } catch { /* storage may be unavailable */ } }, [prefKey, SET, theme]);
  useEffect(() => { try { localStorage.setItem(noticeKey, JSON.stringify(readNotices)); } catch { /* storage may be unavailable */ } }, [noticeKey, readNotices]);
  useEffect(() => { try { localStorage.setItem(dismissedNoticeKey, JSON.stringify(dismissedNotices)); } catch { /* storage may be unavailable */ } }, [dismissedNoticeKey, dismissedNotices]);
  useEffect(() => {
    const h = () => { setRoute(get()); setSide(false); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", h);
    const c = (e) => !e.target.closest("#np,#bell") && setNp(false);
    document.addEventListener("click", c);
    return () => { window.removeEventListener("hashchange", h); document.removeEventListener("click", c); };
  }, []);

  const orderNotices = SET.nOrd ? ORD.filter((order) => order.st !== "cancelled").map((order) => ({ id: `order-${order.id}`, t: `New order from ${order.c} · ${order.orderNumber}`, tm: `${order.p} · ${statusLabel(order.st)}`, r: "orders", kind: "order", created_at: order.created_at })) : [];
  const firstCustomerOrders = ORD.filter((order) => order.st !== "cancelled").reduce((customers, order) => {
    const key = String(order.user_id ?? order.user ?? order.customer_email ?? order.c).toLowerCase();
    customers.set(key, [...(customers.get(key) || []), order]);
    return customers;
  }, new Map());
  const customerNotices = SET.nOrd ? [...firstCustomerOrders.entries()].filter(([, orders]) => orders.length === 1).map(([key, [order]]) => ({ id: `customer-${key}`, t: `New customer: ${order.c}`, tm: order.customer_email || "Placed their first order", r: "customers", kind: "customer", created_at: order.created_at })) : [];
  const stockNotices = SET.nStock ? P.filter((product) => !product.draft_id && product.status !== "draft" && product.stock <= Number(product.low_stock_threshold ?? 5)).map((product) => ({
    id: `stock-${product.id}-${product.stock}-${product.updated_at || product.created_at}`,
    t: `Low stock: ${product.name || "Untitled product"}`,
    tm: `${product.stock} left · Restock recommended`,
    r: "inventory",
    kind: "stock",
    created_at: product.updated_at || product.created_at,
  })) : [];
  const draftNotices = SET.nDraft ? P.filter((product) => product.draft_id).map((draft) => ({
    id: `draft-${draft.draft_id}-${draft.updated_at || "saved"}`,
    t: `Draft saved: ${draft.name || "Untitled product"}`,
    tm: "Saved to drafts · Continue editing or publish when ready",
    r: "products",
    kind: "draft",
    created_at: draft.updated_at,
  })) : [];
  const NT = [...orderNotices, ...customerNotices, ...stockNotices, ...draftNotices]
    .sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime())
    .slice(0, 50)
    .map((notice) => ({ ...notice, u: !readNotices.includes(notice.id) }));
  const vis = SET.nPaused ? [] : NT.filter((notice) => !dismissedNotices.includes(notice.id)), cnt = vis.filter((notice) => notice.u).length;
  const onNt = (notice) => { setReadNotices((current) => [...new Set([...current, notice.id])]); setNp(false); window.location.hash = notice.r; };
  const dismissNotices = (ids) => setDismissedNotices((current) => [...new Set([...current, ...ids])]);
  const save = async (d) => {
    const next = {
      ...d,
      name: user?.full_name || user?.username || "Seller",
      email: user?.email || "",
      store: user?.seller_profile?.store_name || user?.username || "Seller",
    };
    try {
      localStorage.setItem(prefKey, JSON.stringify(next));
    } catch (error) {
      toast("Could not save settings on this device.");
      throw error;
    }
    setSET(next);
    setTheme(next.theme);
    toast(next.nPaused ? "Notifications paused. Your alerts are saved." : "Settings saved and applied");
  };
  const initials = SET.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const openCategoryProducts = (categoryName) => {
    setSelectedCategory(categoryName);
    setRoute("products");
    if (window.location.hash !== "#products") window.location.hash = "products";
  };
  const link = (href, label, icon) => (
    <a key={href} href={href === "logout" ? "/seller/login" : "#" + href} title={label} aria-label={label} className={route === href ? "on" : ""} onClick={(event) => { setSide(false); if (href === "logout") { event.preventDefault(); onLogout?.(); } else if (href === "products") setSelectedCategory(""); }}><Ic p={icon} /><span>{label}</span></a>
  );

  return (
    <div className="sellerDashRoot" data-theme={theme}>
      <div className={"scrim" + (side ? " show" : "")} onClick={() => setSide(false)} />
      <div className={`app${side ? " sidebar-open" : ""}${sideCollapsed ? " sidebar-collapsed" : ""}`}>
        <aside id="seller-sidebar" className={side ? "open" : ""}>
          <div className="brand"><div className="logo">S</div><span>{SET.store}</span></div>
          <nav>{NAV.map(([n, ic]) => link(n.toLowerCase(), n, ic))}</nav>
          <div className="sp" />
          <nav>{link("settings", "Settings", SETI)}{link("logout", "Log Out", OUT)}</nav>
        </aside>
        <main>
          <header>
            <button className="ib menu-btn" aria-label={window.matchMedia("(max-width: 860px)").matches ? (side ? "Close sidebar" : "Open sidebar") : (sideCollapsed ? "Expand sidebar" : "Collapse sidebar")} aria-expanded={window.matchMedia("(max-width: 860px)").matches ? side : !sideCollapsed} aria-controls="seller-sidebar" onClick={() => {
              if (window.matchMedia("(max-width: 860px)").matches) setSide(!side);
              else setSideCollapsed(!sideCollapsed);
            }}><Ic p={side ? CLOSE : MENU} /></button>
            <div className="hl"><small>Welcome Back!</small><h1>{SET.store}.</h1></div>
            <button className="ib" aria-label="Theme" title="Toggle theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><Ic p={MOON} /></button>
            <button className="ib" id="bell" aria-label={SET.nPaused ? "Notifications paused" : `Notifications${cnt ? `, ${cnt} unread` : ""}`} aria-expanded={np} aria-controls="np" title={SET.nPaused ? "Notifications paused" : "Notifications"} onClick={() => setNp(!np)}>
              <Ic p={BELL} /><span className="dot" style={{ display: cnt ? "grid" : "none" }}>{cnt}</span>
            </button>
            <div className="user"><div className="av">{initials}</div><div><b>{SET.name}</b><span>Seller</span></div></div>
          </header>

          {route === "dashboard" && <Dashboard P={P} ORD={ORD} CATS={CATS} />}
          {route === "products" && <Products P={P} setP={setP} CATS={CATS} setCATS={setCATS} theme={theme} user={user} ORD={ORD} toast={toast} selectedCategory={selectedCategory} />}
          {route === "orders" && <Orders ORD={ORD} setORD={setORD} toast={toast} />}
          {route === "inventory" && <Inventory P={P} setP={setP} toast={toast} />}
          {route === "categories" && <Categories P={P} CATS={CATS} setCATS={setCATS} savedCategories={savedCategories} setSavedCategories={setSavedCategories} toast={toast} onSelectCategory={openCategoryProducts} />}
          {route === "customers" && <Customers ORD={ORD} P={P} />}
          {route === "settings" && <Settings SET={SET} theme={theme} onSave={save} />}
          {route === "logout" && (
            <div className="content">
              <div className="panel lo">
                <div className="th" style={{ background: "var(--pri-soft)" }}>👋</div>
                <h3>You’ve been signed out</h3><p><small>Thanks for managing {SET.store} today.</small></p>
                <button className="btn p" onClick={() => onLogout?.()}>Sign in again</button>
              </div>
            </div>
          )}
        </main>
      </div>

      <div id="np" className={np ? "show" : ""}>
        <div className="nh"><b>Notifications <span>{cnt} unread</span></b><button onClick={() => setReadNotices((current) => [...new Set([...current, ...vis.map((n) => n.id)])])}>Mark all read</button></div>
        <div className="notificationList">
          {SET.nPaused ? <div className="settingsPausedEmpty">Notifications are paused. Your alerts are saved; resume them in Settings.</div> : vis.length ? vis.map((n) => <div key={n.id} className={`ni ${n.kind || ""}${n.u ? " un" : ""}`}>
            <button type="button" className="notificationOpen" onClick={() => onNt(n)}><i aria-hidden="true">{n.kind === "stock" ? "!" : n.kind === "customer" ? "+" : n.kind === "draft" ? "✎" : "↗"}</i><span>{n.t}<small>{n.tm}</small></span>{n.u && <b aria-label="Unread" />}</button>
            <button type="button" className="notificationDelete" aria-label={`Delete ${n.t}`} title="Delete notification" onClick={() => dismissNotices([n.id])}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg></button>
          </div>) : <div className="empty">No notifications</div>}
        </div>
        <div className="notificationActions">
          <button type="button" disabled={!vis.length} onClick={() => dismissNotices(vis.map((n) => n.id))}>Delete all</button>
        </div>
      </div>
      {tm && <div className="toast">{tm}</div>}
    </div>
  );
}
