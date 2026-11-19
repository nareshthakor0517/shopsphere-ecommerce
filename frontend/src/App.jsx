import { useCallback, useEffect, useMemo, useState } from 'react';
import api from './api';
import AuthForm from './components/AuthForm';
import CartPanel from './components/CartPanel';
import CheckoutPage from './components/CheckoutPage';
import DashboardPanel from './components/DashboardPanel';
import HeroSection from './components/HeroSection';
import ProductForm from './components/ProductForm';
import ProductGrid from './components/ProductGrid';
import ProductDetail from './components/ProductDetail';
import ProfilePage from './components/ProfilePage';
import CategoryArtwork from './components/CategoryArtwork';
import CollectionPage from './components/CollectionPage';
import StoreQuickRail from './components/StoreQuickRail';
import SupportPage from './components/SupportPage';
import SiteFooter from './components/SiteFooter';
import SiteHeader from './components/SiteHeader';
import WishlistPanel from './components/WishlistPanel';
import OrderConfirmation from './components/OrderConfirmation';
import MyOrdersPage from './components/MyOrdersPage';
import SellerRegistration from './components/SellerRegistration';
import SellerLogin from './components/SellerLogin';
import SellerDashboard from './components/SellerDashboard';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';

const blankProduct = () => ({ name: '', description: '', category: 'Mobiles', brand: '', price: '', stock: '5', image_url: '' });
const migrateLegacySession = () => {
  if (typeof window === 'undefined' || sessionStorage.getItem('access')) return;
  ['access', 'refresh', 'user'].forEach(key => {
    const value = localStorage.getItem(key);
    if (value) sessionStorage.setItem(key, value);
    localStorage.removeItem(key);
  });
};
const readUser = () => {
  try {
    migrateLegacySession();
    const user = JSON.parse(sessionStorage.getItem('user') || 'null');
    if (!user) return null;
    return { ...user, full_name: user.full_name || user.name || '' };
  } catch { return null; }
};
const shopCategories = [
  { name: 'Mobiles', kind: 'phone', terms: ['mobile', 'phone', 'smartphone'] },
  { name: 'Laptops', kind: 'laptop', terms: ['laptop', 'computer'] },
  { name: 'Audio', kind: 'headphones', terms: ['audio', 'headphone', 'earphone', 'speaker'] },
  { name: 'Accessories', kind: 'accessories', terms: ['accessor'] },
  { name: 'Smart watches', kind: 'watch', terms: ['watch'] },
  { name: 'TV & more', kind: 'tablet', terms: ['tv', 'television', 'tablet', 'display'] },
];
const popularCategories = [
  { name: 'Smartphones', kind: 'phone', terms: ['smartphone', 'mobile', 'phone'] },
  { name: 'Laptops', kind: 'laptop', terms: ['laptop', 'computer'] },
  { name: 'Headphones', kind: 'headphones', terms: ['headphone', 'audio', 'earphone'] },
  { name: 'Tablets', kind: 'tablet', terms: ['tablet', 'ipad'] },
  { name: 'Gaming', kind: 'console', terms: ['gaming', 'game', 'console'] },
  { name: 'Cameras', kind: 'camera', terms: ['camera', 'photography'] },
];

export default function App() {
  const pathMode = () => window.location.pathname === '/seller/register' ? 'seller-register' : window.location.pathname === '/seller/login' ? 'seller-login' : window.location.pathname === '/seller/dashboard' ? 'seller-dashboard' : window.location.pathname === '/admin/login' ? 'admin-login' : window.location.pathname === '/admin/dashboard' ? 'admin-dashboard' : window.location.pathname === '/register' ? 'register' : window.location.pathname === '/login' ? 'login' : 'shop';
  const [user, setUser] = useState(readUser);
  const [products, setProducts] = useState([]);
  const [bestSellerProducts, setBestSellerProducts] = useState([]);
  const [dashboardProducts, setDashboardProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [returnPage, setReturnPage] = useState('shop');
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [activeBrand, setActiveBrand] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [mode, setModeState] = useState(pathMode);
  const [dashboardAuthChecking, setDashboardAuthChecking] = useState(() => Boolean(
    sessionStorage.getItem('access') && ['/admin/dashboard', '/seller/dashboard'].includes(window.location.pathname),
  ));
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ username: '', login_identifier: '', email: '', mobile_number: '', password: '', confirm_password: '', full_name: '', account_type: 'customer', store_name: '', business_type: 'individual', business_address: '', tax_identifier: '', ...blankProduct() });
  const [editingProduct, setEditingProduct] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [sellerBusy, setSellerBusy] = useState(false);
  const [sellerError, setSellerError] = useState('');
  const [sellerLoginError, setSellerLoginError] = useState('');
  const [sellerLoginNotice, setSellerLoginNotice] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoginNotice, setAdminLoginNotice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const message = useCallback(text => {
    setNotice(text);
    window.clearTimeout(message.timer);
    message.timer = window.setTimeout(() => setNotice(''), 4200);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const { data } = await api.get('/products/', { params: {
        search, category, min_price: minPrice || undefined, max_price: maxPrice || undefined,
      } });
      setProducts(data);
    } catch (error) {
      message(error.response?.data?.detail || 'Could not load products. Check the backend connection.');
    } finally { setLoadingProducts(false); }
  }, [search, category, minPrice, maxPrice, message]);

  useEffect(() => {
    if (!user?.id) {
      setWishlist([]);
      return undefined;
    }
    let active = true;
    api.get('/wishlist/')
      .then(({ data }) => { if (active) setWishlist(data); })
      .catch(() => { if (active) message('Could not load your wishlist.'); });
    return () => { active = false; };
  }, [user?.id, message]);

  const loadAccountData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await api.get('/cart/');
      setCart(data);
    } catch { message('Could not load your cart. Please sign in again.'); }
  }, [user?.id, user?.role, message]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => {
    let active = true;
    api.get('/products/best-sellers/').then(({ data }) => { if (active) setBestSellerProducts(data); }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => { loadAccountData(); }, [loadAccountData]);
  useEffect(() => {
    if (!user?.id || !sessionStorage.getItem('access')) { setDashboardAuthChecking(false); return undefined; }
    let current = true;
    const dashboardPath = window.location.pathname;
    if (['/admin/dashboard', '/seller/dashboard'].includes(dashboardPath)) setDashboardAuthChecking(true);
    api.get('/auth/me/').then(({ data }) => {
      if (!current) return;
      setUser(data);
      sessionStorage.setItem('user', JSON.stringify(data));
      setDashboardAuthChecking(false);
      if (dashboardPath === '/admin/dashboard' && data.role !== 'admin') setMode('admin-login', true);
      if (dashboardPath === '/seller/dashboard' && data.role !== 'sales') setMode(data.role === 'admin' ? 'admin-dashboard' : 'seller-login', true);
    }).catch(() => {
      if (!current) return;
      sessionStorage.removeItem('access'); sessionStorage.removeItem('refresh'); sessionStorage.removeItem('user');
      setUser(null);
      setDashboardAuthChecking(false);
      if (dashboardPath === '/admin/dashboard') setMode('admin-login', true);
      if (dashboardPath === '/seller/dashboard') setMode('seller-login', true);
    });
    return () => { current = false; };
  }, [user?.id]);
  useEffect(() => {
    const expireSession = event => {
      const wasAdmin = window.location.pathname.startsWith('/admin/');
      const wasSeller = window.location.pathname.startsWith('/seller/');
      const previousUser = readUser() || user;
      const destination = wasAdmin ? 'admin-login' : wasSeller ? 'seller-login' : 'login';
      const paths = { login: '/login', 'seller-login': '/seller/login', 'admin-login': '/admin/login' };
      setUser(null); setCart([]); setWishlist([]); setPendingPayment(null);
      setModeState(destination);
      window.history.replaceState({}, '', paths[destination]);
      if (previousUser?.role === 'user' && event?.detail?.blocked) setAuthError('Your account is blocked. Please contact ShopSphere support.');
      else if (previousUser?.role === 'sales' && event?.detail?.blocked) setSellerLoginError('Your account is blocked. Please contact ShopSphere support.');
      else if (previousUser?.role === 'admin' && event?.detail?.blocked) setAdminLoginError('Your account is blocked. Please contact ShopSphere support.');
      else message('Your session expired. Please sign in again.');
    };
    window.addEventListener('shopsphere:session-expired', expireSession);
    return () => window.removeEventListener('shopsphere:session-expired', expireSession);
  }, [message, user]);

  useEffect(() => {
    if (!user?.id || user.role !== 'user' || !sessionStorage.getItem('access')) return undefined;
    let active = true;
    let checking = false;
    const checkAccount = async () => {
      if (!active || checking || document.visibilityState === 'hidden') return;
      checking = true;
      try { await api.get('/auth/me/'); }
      catch { /* The response interceptor clears revoked sessions and routes to login. */ }
      finally { checking = false; }
    };
    const interval = window.setInterval(() => { if (active) checkAccount(); }, 2500);
    window.addEventListener('focus', checkAccount);
    checkAccount();
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', checkAccount);
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (mode !== 'seller-dashboard' || user?.role !== 'sales' || !sessionStorage.getItem('access')) return undefined;
    let active = true;
    let checking = false;
    const checkSellerApproval = async () => {
      if (checking) return;
      checking = true;
      try {
        const { data } = await api.get('/auth/me/');
        if (active && (data.role !== 'sales' || data.seller_profile?.approval_status !== 'approved')) {
          throw Object.assign(new Error('Seller approval is no longer active'), { response: { status: 403 } });
        }
      } catch (error) {
        if (!active || error.response?.status !== 403) return;
        sessionStorage.removeItem('access'); sessionStorage.removeItem('refresh'); sessionStorage.removeItem('user');
        setUser(null); setCart([]); setWishlist([]); setOrders([]); setStats({}); setPendingPayment(null);
        setMode('seller-login', true);
        setSellerLoginNotice('Your seller approval is no longer active. Please contact ShopSphere support.');
      } finally { checking = false; }
    };
    checkSellerApproval();
    const interval = window.setInterval(checkSellerApproval, 1500);
    window.addEventListener('focus', checkSellerApproval);
    document.addEventListener('visibilitychange', checkSellerApproval);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', checkSellerApproval);
      document.removeEventListener('visibilitychange', checkSellerApproval);
    };
  }, [mode, user?.id, user?.role]);

  const updateForm = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const setMode = (destination, replace = false) => {
    if (user && ['login', 'register'].includes(destination)) {
      destination = 'shop';
      replace = true;
    }
    setModeState(destination);
    const paths = { login: '/login', register: '/register', 'seller-register': '/seller/register', 'seller-login': '/seller/login', 'seller-dashboard': '/seller/dashboard', 'admin-login': '/admin/login', 'admin-dashboard': '/admin/dashboard' };
    const path = paths[destination] || '/';
    if (window.location.pathname !== path || window.location.hash) window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
  };
  useEffect(() => {
    if (user && ['login', 'register'].includes(mode)) setMode('shop', true);
  }, [user?.id, mode]);
  useEffect(() => {
    if (mode === 'admin-dashboard' && (!sessionStorage.getItem('access') || user?.role !== 'admin')) {
      setMode('admin-login', true);
    } else if (mode === 'seller-dashboard' && (!sessionStorage.getItem('access') || user?.role !== 'sales')) {
      setMode('seller-login', true);
    }
  }, [mode, user?.role]);
  useEffect(() => {
    const syncRoute = () => {
      const nextMode = pathMode();
      const currentUser = readUser();
      if (currentUser && ['login', 'register'].includes(nextMode)) {
        window.history.replaceState({}, '', '/');
        setModeState('shop');
        return;
      }
      if (nextMode === 'admin-dashboard' && (!sessionStorage.getItem('access') || readUser()?.role !== 'admin')) {
        window.history.replaceState({}, '', '/admin/login');
        setModeState('admin-login');
        return;
      }
      if (nextMode === 'seller-dashboard' && (!sessionStorage.getItem('access') || readUser()?.role !== 'sales')) {
        window.history.replaceState({}, '', '/seller/login');
        setModeState('seller-login');
        return;
      }
      setModeState(nextMode);
    };
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);
  const refreshAccount = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const [orderResponse, dashboardResponse, productResponse] = await Promise.all([
        api.get('/orders/'), api.get('/dashboard/'), api.get('/products/'),
      ]);
      setOrders(orderResponse.data);
      setStats(dashboardResponse.data);
      setDashboardProducts(productResponse.data);
    } catch (error) { message(error.response?.data?.detail || 'Could not load your dashboard.'); }
    finally { setLoadingOrders(false); }
  };
  const loadMyOrders = useCallback(async () => {
    if (!user?.id || user.role !== 'user') return;
    setLoadingOrders(true);
    try {
      const { data } = await api.get('/orders/');
      setOrders(data);
    } catch (error) { message(error.response?.data?.detail || 'Could not load your orders.'); }
    finally { setLoadingOrders(false); }
  }, [user?.id, user?.role, message]);
  useEffect(() => {
    if (user?.role === 'user') {
      setOrders([]);
      loadMyOrders();
    }
  }, [user?.id, user?.role, loadMyOrders]);
  useEffect(() => {
    if (mode !== 'orders' || user?.role !== 'user') return undefined;
    let active = true;
    const syncOrders = async () => {
      try { const { data } = await api.get('/orders/'); if (active) setOrders(data); } catch { /* Keep the visible order progress if a refresh temporarily fails. */ }
    };
    const timer = window.setInterval(syncOrders, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [mode, user?.id, user?.role]);
  const navigate = async destination => {
    if (destination === 'dashboard' && user?.role === 'sales') destination = 'seller-dashboard';
    if (destination === 'dashboard' && user?.role === 'admin') destination = 'admin-dashboard';
    if (['shop', 'collection', 'categories', 'brands'].includes(destination)) {
      setSearch('');
      setCategory('');
      setMinPrice('');
      setMaxPrice('');
      setActiveBrand('');
      setShowAll(false);
    }
    setMode(destination);
    if (destination !== 'shop') window.scrollTo({ top: 0, behavior: 'smooth' });
    if (destination === 'dashboard') await refreshAccount();
    if (destination === 'orders' && user?.role === 'user') await loadMyOrders();
    if (destination === 'wishlist' && user) {
      try { const { data } = await api.get('/wishlist/'); setWishlist(data); }
      catch { message('Could not load your wishlist.'); }
    }
  };

  const saveSession = (data, destination = 'shop') => {
    sessionStorage.setItem('access', data.access);
    sessionStorage.setItem('refresh', data.refresh);
    sessionStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setMode(destination, true);
    message(data.user ? `Welcome${data.user.full_name ? `, ${data.user.full_name}` : ' to ShopSphere'}!` : 'Signed in.');
  };
  const authenticate = async event => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    try {
      const endpoint = ['login', 'admin-dashboard'].includes(mode) ? '/auth/login/' : '/auth/register/';
      const payload = ['login', 'admin-dashboard'].includes(mode)
        ? { identifier: form.login_identifier.trim(), password: form.password }
        : {
            username: form.username,
            email: form.email,
            mobile_number: form.mobile_number.trim(),
            password: form.password,
            confirm_password: form.confirm_password,
            full_name: form.full_name.trim(),
            account_type: 'customer',
          };
      const { data } = await api.post(endpoint, payload);
      const destination = ['login', 'admin-dashboard'].includes(mode) && data.user?.role === 'admin' ? 'admin-dashboard'
        : ['login', 'admin-dashboard'].includes(mode) && data.user?.role === 'sales' ? 'seller-dashboard' : 'shop';
      saveSession(data, destination);
      setForm(current => ({ ...current, password: '', confirm_password: '' }));
    } catch (error) {
      const details = error.response?.data;
      const detail = typeof details === 'string' ? details : details?.detail || Object.entries(details || {})
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(' ') : value}`).join(' · ');
      setAuthError(detail || 'Could not sign in. Check your details and try again.');
      message(detail || 'Could not sign in. Check your details and try again.');
    } finally { setAuthBusy(false); }
  };
  const submitSellerRegistration = async payload => {
    setSellerBusy(true);
    setSellerError('');
    try {
      const { data } = await api.post('/auth/seller/register/', payload);
      setSellerLoginNotice('Your application was submitted and is pending admin approval. You can sign in after approval.');
      setMode('seller-login');
    } catch (error) {
      const details = error.response?.data;
      const detail = typeof details === 'string' ? details : details?.detail || Object.entries(details || {})
        .map(([key, value]) => `${key.replaceAll('_', ' ')}: ${Array.isArray(value) ? value.join(' ') : value}`).join(' · ');
      setSellerError(detail || 'Could not submit your seller application. Check your details and try again.');
    } finally { setSellerBusy(false); }
  };
  const sellerLogin = async (identifier, password) => {
    setSellerBusy(true);
    setSellerLoginError('');
    try {
      const { data } = await api.post('/auth/seller/login/', { identifier, password });
      saveSession(data, 'seller-dashboard');
    } catch (error) {
      setSellerLoginError(error.response?.data?.detail || 'Could not sign in. Check your seller details and try again.');
    } finally { setSellerBusy(false); }
  };
  const adminLogin = async (identifier, password) => {
    setAuthBusy(true);
    setAdminLoginError('');
    try {
      const { data } = await api.post('/auth/admin/login/', { identifier, password });
      saveSession(data, 'admin-dashboard');
    } catch (error) {
      setAdminLoginError(error.response?.data?.detail || 'Could not sign in. Check your admin username and password.');
    } finally { setAuthBusy(false); }
  };
  const logout = () => {
    sessionStorage.removeItem('access'); sessionStorage.removeItem('refresh'); sessionStorage.removeItem('user');
    setUser(null); setCart([]); setWishlist([]); setOrders([]); setStats({}); setPendingPayment(null); setMode('shop');
    message('You have been signed out.');
  };
  const logoutSeller = () => {
    sessionStorage.removeItem('access'); sessionStorage.removeItem('refresh'); sessionStorage.removeItem('user');
    setUser(null); setCart([]); setWishlist([]); setOrders([]); setStats({}); setPendingPayment(null);
    setMode('seller-login', true); setSellerLoginNotice('You have been signed out.');
  };
  const logoutAdmin = () => {
    sessionStorage.removeItem('access'); sessionStorage.removeItem('refresh'); sessionStorage.removeItem('user');
    setUser(null); setCart([]); setWishlist([]); setOrders([]); setStats({}); setPendingPayment(null);
    setMode('admin-login', true); setAdminLoginNotice('You have been signed out.');
  };

  const addToCart = async productId => {
    if (!user) { navigate('login'); message('Sign in to add products to your cart.'); return false; }
    try { await api.post('/cart/', { product: productId, quantity: 1 }); await loadAccountData(); message('Added to cart.'); return true; }
    catch (error) { message(error.response?.data?.detail || error.response?.data?.quantity?.[0] || 'Could not add this product to your cart.'); return false; }
  };
  const addToWishlist = async productId => {
    if (!user) { navigate('login'); message('Sign in to save products to your wishlist.'); return; }
    try {
      const { data: items } = await api.get('/wishlist/');
      setWishlist(items);
      const savedItem = items.find(item => item.product === productId);
      if (savedItem) {
        await api.delete(`/wishlist/${savedItem.id}/`);
        setWishlist(current => current.filter(item => item.id !== savedItem.id));
        message('Removed from your wishlist.');
        return;
      }
      const { data: item } = await api.post('/wishlist/', { product: productId });
      setWishlist(current => [...current.filter(saved => saved.product !== productId), item]);
      message('Saved to your wishlist.');
    } catch (error) { message(error.response?.data?.detail || 'Could not update your wishlist.'); }
  };
  const removeWishlist = async itemId => {
    try { await api.delete(`/wishlist/${itemId}/`); setWishlist(items => items.filter(item => item.id !== itemId)); }
    catch { message('Could not remove this saved product.'); }
  };
  const updateCartQuantity = async (itemId, quantity) => {
    if (!Number.isInteger(quantity) || quantity < 1) return;
    const item = cart.find(entry => entry.id === itemId);
    if (item && quantity > Number(item.product_detail?.stock || 0)) {
      message(`Only ${item.product_detail.stock} item(s) are available.`);
      return;
    }
    try { const { data } = await api.patch(`/cart/${itemId}/`, { quantity }); setCart(items => items.map(item => item.id === itemId ? data : item)); }
    catch (error) { message(error.response?.data?.quantity?.[0] || 'Could not update the cart quantity.'); }
  };
  const removeCartItem = async itemId => {
    try { await api.delete(`/cart/${itemId}/`); setCart(items => items.filter(item => item.id !== itemId)); }
    catch { message('Could not remove this item.'); }
  };

  const beginEdit = product => {
    setEditingProduct(product.id);
    setForm(current => ({ ...current, name: product.name, description: product.description, category: product.category, brand: product.brand || '',
      price: product.price, stock: String(product.stock), image_url: product.image_url }));
    setMode('edit');
  };
  const saveProduct = async event => {
    event.preventDefault();
    const payload = { name: form.name.trim(), description: form.description.trim(), category: form.category.trim(), brand: form.brand.trim(),
      price: form.price, stock: Number(form.stock), image_url: form.image_url };
    try {
      if (editingProduct) await api.patch(`/products/${editingProduct}/`, payload);
      else await api.post('/products/', payload);
      message(editingProduct ? 'Product updated.' : 'Product created.');
      setEditingProduct(null); setForm(current => ({ ...current, ...blankProduct() }));
      await loadProducts(); setMode('shop');
    } catch (error) {
      const details = error.response?.data;
      message(details?.detail || Object.entries(details || {}).map(([key, value]) => `${key}: ${value}`).join(' · ') || 'Could not save the product.');
    }
  };
  const deleteProduct = async productId => {
    try { await api.delete(`/products/${productId}/`); await loadProducts(); message('Product deleted.'); }
    catch (error) { message(error.response?.data?.detail || 'You do not have permission to delete this product.'); }
  };
  const uploadImage = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      message('Choose a JPG, PNG or WebP image under 5 MB.'); event.target.value = ''; return;
    }
    setUploading(true);
    try {
      const { data } = await api.post('/uploads/cloudinary-signature/');
      const body = new FormData();
      body.append('file', file); body.append('api_key', data.api_key); body.append('timestamp', data.timestamp);
      body.append('folder', data.folder); body.append('allowed_formats', data.allowed_formats);
      body.append('max_file_size', data.max_file_size); body.append('signature', data.signature);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${data.cloud_name}/image/upload`, { method: 'POST', body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Cloudinary rejected the image.');
      updateForm('image_url', result.secure_url); message('Image uploaded.');
    } catch (error) { message(error.response?.data?.detail || error.message || 'Image upload failed.'); }
    finally { setUploading(false); event.target.value = ''; }
  };

  const verifyPayment = async response => {
    setPendingPayment(response);
    try {
      const { data } = await api.post('/payments/verify/', response);
      setPendingPayment(null);
      await Promise.all([loadAccountData(), loadProducts()]);
      setConfirmedOrder(data.order);
      setOrders(current => [data.order, ...current.filter(order => order.id !== data.order.id)]);
      setMode('order-confirmed');
      message('Payment verified. Your order is placed.');
    } catch (error) {
      message(error.response?.data?.detail || 'Payment could not be verified yet. Retry verification or contact support.');
    } finally { setCheckoutBusy(false); }
  };

  const beginCheckout = (source, items) => {
    if (!user) { navigate('login'); message('Sign in before checkout.'); return; }
    if (!items?.length) { message(source === 'cart' ? 'Your cart is empty.' : 'Choose an available product first.'); return; }
    setCheckoutSession({ source, items });
    setMode('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const startPayment = async deliveryAddress => {
    if (!checkoutSession) return;
    setCheckoutBusy(true);
    try {
      const { data } = await api.post('/payments/create-order/', {
        source: checkoutSession.source,
        items: checkoutSession.source === 'buy_now' ? checkoutSession.items.map(item => ({ product: item.product_detail.id, quantity: item.quantity })) : undefined,
        delivery_address: deliveryAddress,
      });
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve; script.onerror = () => reject(new Error('Could not load Razorpay Checkout.'));
          document.body.appendChild(script);
        });
      }
      const checkoutWindow = new window.Razorpay({ key: data.key_id, amount: data.amount, currency: data.currency,
        name: 'ShopSphere', description: checkoutSession.source === 'buy_now' ? 'Buy now order' : 'Your ShopSphere cart order', order_id: data.razorpay_order_id,
        prefill: { name: deliveryAddress.full_name, email: user.email, contact: deliveryAddress.phone }, theme: { color: '#2363cc' },
        handler: verifyPayment,
        modal: { ondismiss: () => setCheckoutBusy(false) },
      });
      checkoutWindow.open();
    } catch (error) {
      message(error.response?.data?.detail || error.message || 'Checkout could not be started.');
      setCheckoutBusy(false);
    }
  };
  const buyNow = product => beginCheckout('buy_now', [{ product_detail: product, quantity: 1 }]);

  const cartCount = useMemo(() => cart.reduce((count, item) => count + item.quantity, 0), [cart]);
  const categories = useMemo(() => [...new Set(products.map(product => product.category).filter(Boolean))].sort(), [products]);
  const categoryFilter = item => categories.find(value => item.terms.some(term => value.toLowerCase().includes(term))) || item.name;
  const collectionCategories = shopCategories.map(item => ({ name: item.name, kind: item.kind, value: categoryFilter(item) }));
  const browsePopularCategory = item => {
    setCategory(categoryFilter(item)); setSearch(''); setShowAll(false); setMode('categories');
  };
  const homeBestSellerProducts = [...bestSellerProducts, ...products.filter(product => !bestSellerProducts.some(bestSeller => bestSeller.id === product.id))].slice(0, 4);
  const updatePriceFilter = (key, value) => {
    if (key === 'min') {
      setMinPrice(value);
      if (value && maxPrice && Number(value) > Number(maxPrice)) setMaxPrice('');
    } else {
      setMaxPrice(value);
      if (value && minPrice && Number(value) < Number(minPrice)) setMinPrice('');
    }
  };
  const openProduct = product => { setReturnPage(mode); setSelectedProduct(product); setMode('product'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const browseCategory = value => {
    setCategory(value);
    setShowAll(false);
    setMode('shop');
    window.setTimeout(() => document.getElementById('best-sellers')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };
  const showAllProducts = () => {
    setCategory('');
    setSearch('');
    setShowAll(true);
    setMode('shop');
    window.setTimeout(() => document.getElementById('best-sellers')?.scrollIntoView({ behavior: 'smooth' }), 0);
  };
  const searchProducts = value => {
    setSearch(value);
    setCategory('');
    setShowAll(Boolean(value.trim()));
    setMode('shop');
  };

  if (mode === 'seller-register') return <SellerRegistration onSubmit={submitSellerRegistration} busy={sellerBusy} error={sellerError} />;
  if (mode === 'seller-login') return <SellerLogin onSubmit={sellerLogin} busy={sellerBusy} error={sellerLoginError} notice={sellerLoginNotice} />;
  if (mode === 'admin-login') return <AdminLogin onSubmit={adminLogin} busy={authBusy} error={adminLoginError} notice={adminLoginNotice} />;
  if (mode === 'seller-dashboard') return dashboardAuthChecking
    ? <div className="sessionGate" role="status">Checking your seller session…</div>
    : user?.role === 'sales'
    ? <SellerDashboard user={user} onLogout={logoutSeller} />
    : <SellerLogin onSubmit={sellerLogin} busy={sellerBusy} error="Please sign in with your seller account to continue." notice={sellerLoginNotice} />;
  if (mode === 'admin-dashboard') return dashboardAuthChecking
    ? <div className="sessionGate" role="status">Checking your admin session…</div>
    : user?.role === 'admin'
    ? <AdminDashboard user={user} onLogout={logoutAdmin} />
    : <AdminLogin onSubmit={adminLogin} busy={authBusy} error="Sign in with an administrator account to continue." notice={adminLoginNotice} />;

  return <div className="appShell">
    <SiteHeader user={user} cartCount={cartCount} orderCount={orders.length} search={search} activePage={mode === 'product' ? returnPage : mode} onSearch={searchProducts} onNavigate={navigate} onLogout={logout} />
    <main>
      {notice && <div className="notice" role="status"><span>{notice}</span><div className="noticeActions">
        {pendingPayment && <button className="retryButton" onClick={() => verifyPayment(pendingPayment)}>Retry verification</button>}
        <button aria-label="Dismiss message" onClick={() => setNotice('')}>×</button>
      </div></div>}
      {mode === 'shop' && <>
        <HeroSection products={products} onExplore={() => document.getElementById('best-sellers')?.scrollIntoView({ behavior: 'smooth' })} />
        <section className="quickCategorySection" aria-label="Shop departments">
          {shopCategories.map(item => <button className="quickCategory" key={item.name} onClick={() => browseCategory(categoryFilter(item))}>
            <CategoryArtwork kind={item.kind} /><span><b>{item.name}</b><small>Shop now</small></span>
          </button>)}
        </section>
        <section className="categorySection">
          <div className="sectionHead"><div><small>EXPLORE OUR COLLECTION</small><h2>Popular categories</h2></div>
            <button className="link" onClick={() => navigate('categories')}>View all →</button></div>
          <div className="popularCategoryGrid">{popularCategories.map(item => <button className="popularCategory" key={item.name} onClick={() => browsePopularCategory(item)}>
            <span className="popularCategoryArt"><CategoryArtwork kind={item.kind} /></span><b>{item.name}</b>
          </button>)}</div>
        </section>
        <section id="best-sellers" className="bestSellersSection">
          <div className="sectionHead"><div><small>{search ? 'MATCHING YOUR SEARCH' : category ? 'SHOP BY CATEGORY' : 'OUR CUSTOMER FAVORITES'}</small>
            <h2>{search ? 'Search results' : category ? category : showAll ? 'All products' : 'Best sellers'}</h2></div>
            <button className="link" onClick={() => navigate('collection')}>View all →</button></div>
          {loadingProducts ? <p className="empty" role="status">Loading products…</p> : <ProductGrid products={search.trim() || category || showAll ? products : homeBestSellerProducts} user={user}
              wishlist={wishlist} onAddToCart={addToCart} onWishlist={addToWishlist} onEdit={beginEdit} onDelete={deleteProduct} onOpenProduct={openProduct} compact
            emptyMessage={search ? `No products match “${search}”. Try another search.` : category ? `No products found in ${category}.` : showAll ? 'Products will appear here as soon as they are added to the catalog.' : 'Best sellers will appear here after customers place orders.'} />}
        </section>
        <StoreQuickRail onNavigate={navigate} />
      </>}
      {['collection', 'categories', 'brands'].includes(mode) && <CollectionPage key={mode}
        type={mode === 'collection' ? 'shop' : mode} products={products} categories={collectionCategories} user={user} wishlist={wishlist}
        activeCategory={category} onCategory={setCategory} activeBrand={activeBrand} onBrand={setActiveBrand} onAddToCart={addToCart} onWishlist={addToWishlist}
        minPrice={minPrice} maxPrice={maxPrice} onPriceChange={updatePriceFilter}
        onEdit={beginEdit} onDelete={deleteProduct} onOpenProduct={openProduct} loading={loadingProducts} />}
      {mode === 'support' && <SupportPage user={user} onNavigate={navigate} />}
      {mode === 'profile' && user && <ProfilePage user={user} onNavigate={navigate} />}
      {mode === 'product' && selectedProduct && <ProductDetail product={selectedProduct} onBack={() => setMode(returnPage)}
        onAddToCart={addToCart} onBuyNow={buyNow} onWishlist={addToWishlist} isWishlisted={wishlist.some(item => item.product === selectedProduct.id)} />}
      {(mode === 'login' || mode === 'register' || mode === 'seller-register') && <AuthForm mode={mode === 'seller-register' ? 'register' : mode} sellerSignup={mode === 'seller-register'} values={form} onChange={updateForm} onSubmit={authenticate}
        busy={authBusy} error={authError}
        onSwitch={() => setMode(mode === 'login' ? 'register' : 'login')}
        onSellerSignup={mode !== 'seller-register' ? () => setMode('seller-register') : undefined}
        onSellerLogin={mode !== 'seller-register' ? () => setMode('seller-login') : undefined}
        onAdminLogin={mode === 'login' ? () => setMode('admin-login') : undefined} />}
      {(mode === 'add' || mode === 'edit') && <ProductForm values={form} editing={Boolean(editingProduct)} uploading={uploading}
        onChange={updateForm} onUpload={uploadImage} onSubmit={saveProduct} onCancel={() => { setEditingProduct(null); setForm(current => ({ ...current, ...blankProduct() })); setMode('shop'); }} />}
      {mode === 'cart' && <CartPanel items={cart} onQuantity={updateCartQuantity} onRemove={removeCartItem} onCheckout={() => beginCheckout('cart', cart)} busy={checkoutBusy} />}
      {mode === 'wishlist' && <WishlistPanel items={wishlist} onRemove={removeWishlist} onAddToCart={addToCart} />}
      {mode === 'checkout' && checkoutSession && <CheckoutPage user={user} items={checkoutSession.items} source={checkoutSession.source}
        onBack={() => setMode(checkoutSession.source === 'cart' ? 'cart' : 'product')} onSubmit={startPayment} busy={checkoutBusy} />}
      {mode === 'order-confirmed' && confirmedOrder && <OrderConfirmation order={confirmedOrder} onShop={() => navigate('shop')} onOrders={() => navigate('orders')} />}
      {mode === 'orders' && user?.role === 'user' && <MyOrdersPage orders={orders} loading={loadingOrders} onShop={() => navigate('shop')} />}
      {mode === 'dashboard' && <DashboardPanel user={user} stats={stats} orders={orders} products={dashboardProducts}
        onRefresh={refreshAccount} onProfile={() => navigate('profile')} onAddProduct={() => { setEditingProduct(null); setMode('add'); }}
        onEdit={beginEdit} onDelete={deleteProduct} onOpenProduct={openProduct} loading={loadingOrders} />}
    </main>
    <SiteFooter />
  </div>;
}
