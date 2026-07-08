import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { 
  getItems, 
  saveItem, 
  deleteItem, 
  getOrders, 
  updateOrderStatus, 
  resetInventoryToDefault 
} from '../lib/firestoreService';
import { 
  ClipboardList, 
  Package, 
  Settings as SettingsIcon, 
  Plus, 
  Edit, 
  Trash2, 
  LogOut, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  Database,
  RefreshCw,
  Search,
  X,
  Save,
  MessageSquare,
  Receipt,
  Printer
} from 'lucide-react';

const CATEGORIES = [
  "All Items",
  "Golisoda",
  "Cool Drinks",
  "ORS",
  "Milk",
  "Curd",
  "Lassi",
  "Butter Milk",
  "Snacks",
  "Mixture"
];

export default function AdminPage({ onLogout }) {
  const [activeTab, setActiveTab] = useState('orders');
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Invoice View Modal state
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

  // Audio mute and notification states
  const [isMuted, setIsMuted] = useState(false);
  const [alertActive, setAlertActive] = useState(false);

  // Modal State for Products
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null if adding
  const [deleteConfirmId, setDeleteConfirmId] = useState(null); // product id pending delete
  
  // Product Form Fields
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Golisoda');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodVariants, setProdVariants] = useState([{ volume: '100ML', price: 10 }]);

  // Stats
  const [stats, setStats] = useState({
    totalSales: 0,
    pendingOrders: 0,
    totalProducts: 0,
    completedOrders: 0
  });

  useEffect(() => {
    // Request desktop notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const triggerSystemNotification = (order) => {
    const title = "New Order Received! 📥";
    const options = {
      body: `Order ID: ${order.id} for ₹${order.total} from ${order.customer.name}`,
      tag: order.id,
      requireInteraction: true,
      silent: false,
      icon: '/favicon.ico',
      badge: '/favicon.ico'
    };

    // Attempt to send message to Service Worker so it shows notification even if closed/background
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options
      });
    } else {
      // Fallback to standard client browser Notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, options);
      }
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Initial products load
    const loadProducts = async () => {
      try {
        const allItems = await getItems();
        setItems(allItems);
      } catch (err) {
        console.error("Failed to load inventory:", err);
      }
    };
    loadProducts();

    // Real-time listener for orders
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const allOrders = [];
      snapshot.forEach((doc) => {
        allOrders.push({ id: doc.id, ...doc.data() });
      });

      setOrders((prevOrders) => {
        // If it's a real-time update (not the first fetch), find any brand new order
        if (prevOrders.length > 0) {
          const prevIds = new Set(prevOrders.map(o => o.id));
          const newOrders = allOrders.filter(o => !prevIds.has(o.id) && o.status === 'Order Received');
          
          if (newOrders.length > 0) {
            setIsMuted(false); // Make sure alarm is active on new order arrival
            newOrders.forEach(ord => {
              triggerSystemNotification(ord);
            });
          }
        }
        return allOrders;
      });

      // Recalculate metrics based on new orders list
      setItems((currentItems) => {
        calculateStats(currentItems, allOrders);
        return currentItems;
      });
      setLoading(false);
    }, (err) => {
      console.error("Orders real-time stream failed:", err);
      setError("Unable to connect to live database. Please check your internet.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Web Audio Context Bell Ringing sound loop
  useEffect(() => {
    const hasActiveAlert = orders.some(o => o.status === 'Order Received');
    setAlertActive(hasActiveAlert);

    if (hasActiveAlert && !isMuted) {
      const playAlarm = () => {
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          
          // Generate a loud metallic bell chime using simple synthesis
          const osc1 = audioCtx.createOscillator();
          const gain1 = audioCtx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(987.77, audioCtx.currentTime); // B5 note
          gain1.gain.setValueAtTime(0.4, audioCtx.currentTime);
          gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0);
          osc1.connect(gain1);
          gain1.connect(audioCtx.destination);
          osc1.start(audioCtx.currentTime);
          osc1.stop(audioCtx.currentTime + 1.0);

          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.1); // E6 note
          gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.1);
          gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.start(audioCtx.currentTime + 0.1);
          osc2.stop(audioCtx.currentTime + 1.2);
        } catch (err) {
          console.error("Audio playback error:", err);
        }
      };

      playAlarm();
      const interval = setInterval(playAlarm, 2500); // sound repeats every 2.5 seconds
      return () => clearInterval(interval);
    }
  }, [orders, isMuted]);

  const loadAllData = async () => {
    try {
      const allItems = await getItems();
      setItems(allItems);
    } catch (err) {}
  };

  const calculateStats = (productsList, ordersList) => {
    const completed = ordersList.filter(o => o.status === 'Delivered');
    const pending = ordersList.filter(o => o.status === 'Order Received' || o.status === 'Getting Ready').length;
    const totalSales = completed.reduce((sum, o) => sum + o.total, 0);

    setStats({
      totalSales,
      pendingOrders: pending,
      totalProducts: productsList.length,
      completedOrders: completed.length
    });
  };

  const playClickSound = (type = 'success') => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.35);
      } else if (type === 'cancel') {
        osc.frequency.setValueAtTime(329.63, audioCtx.currentTime); // E4
        osc.frequency.setValueAtTime(220.00, audioCtx.currentTime + 0.1); // A3
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      if (newStatus === 'Cancelled') {
        playClickSound('cancel');
      } else {
        playClickSound('success');
      }
      await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleReseed = async () => {
    if (!window.confirm("Are you sure you want to reset the inventory? All your custom modifications to products will be deleted and reset to the PDF listing default state.")) {
      return;
    }
    setLoading(true);
    try {
      const resetItems = await resetInventoryToDefault();
      setItems(resetItems);
      alert("Inventory successfully reset to standard items!");
    } catch (err) {
      alert("Failed to reset inventory");
    } finally {
      setLoading(false);
    }
  };

  // Product CRUD
  const openAddProductModal = () => {
    setEditingProduct(null);
    setProdName('');
    setProdCategory('Golisoda');
    setProdImageUrl('');
    setProdDescription('');
    setProdVariants([{ volume: '100ML', price: 10 }]);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdCategory(product.category);
    setProdImageUrl(product.imageUrl || '');
    setProdDescription(product.description || '');
    setProdVariants(product.variants || [{ volume: '100ML', price: 10 }]);
    setIsProductModalOpen(true);
  };

  const handleVariantFieldChange = (index, field, value) => {
    const updatedVariants = [...prodVariants];
    if (field === 'price') {
      updatedVariants[index][field] = Number(value);
    } else {
      updatedVariants[index][field] = value;
    }
    setProdVariants(updatedVariants);
  };

  const addVariantRow = () => {
    setProdVariants([...prodVariants, { volume: '', price: 0 }]);
  };

  const removeVariantRow = (index) => {
    if (prodVariants.length === 1) {
      alert("A product must have at least 1 pricing variant!");
      return;
    }
    setProdVariants(prodVariants.filter((_, i) => i !== index));
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (prodVariants.some(v => !v.volume || v.price <= 0)) {
      alert("Please fill all variants with valid volumes and positive prices.");
      return;
    }

    const newProduct = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: prodName,
      category: prodCategory,
      imageUrl: prodImageUrl,
      description: prodDescription,
      variants: prodVariants
    };

    try {
      await saveItem(newProduct);
      
      let updatedItems;
      if (editingProduct) {
        updatedItems = items.map(i => i.id === newProduct.id ? newProduct : i);
      } else {
        updatedItems = [...items, newProduct];
      }
      
      setItems(updatedItems);
      calculateStats(updatedItems, orders);
      setIsProductModalOpen(false);
      alert(editingProduct ? "Product updated successfully!" : "Product added successfully!");
    } catch (err) {
      alert("Failed to save product details.");
    }
  };

  const handleDeleteProduct = async (productId) => {
    setDeleteConfirmId(null);
    try {
      await deleteItem(productId);
      const updatedItems = items.filter(i => i.id !== productId);
      setItems(updatedItems);
      calculateStats(updatedItems, orders);
    } catch (err) {
      alert("Failed to delete product.");
    }
  };

  // Filter products by search query
  const filteredProducts = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* Admin Header */}
      <header className="sticky top-0 z-20 bg-slate-800 border-b border-slate-700 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/10">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-white">Satya General Store Dashboard</h1>
              <p className="text-xs text-amber-500 font-semibold tracking-wider uppercase">Satya General Store Management</p>
            </div>
          </div>

          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 rounded-xl text-sm font-semibold transition-all duration-200"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Admin Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Active Alarm Chime Banner */}
        {alertActive && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center text-lg animate-bounce">
                🔔
              </span>
              <div>
                <h3 className="font-bold text-sm text-white">New Orders Received!</h3>
                <p className="text-xs text-slate-400 mt-0.5">Ringing alarm is currently playing to alert you of incoming store orders.</p>
              </div>
            </div>
            <button
              onClick={() => { playClickSound('click'); setIsMuted(!isMuted); }}
              className={`px-4 py-2 font-bold text-xs rounded-xl transition-colors shrink-0 shadow-sm ${
                isMuted 
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/10' 
                  : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/10'
              }`}
            >
              {isMuted ? '🔔 Resume Sound' : '🔕 Silence Alarm'}
            </button>
          </div>
        )}

        {/* Statistics Widgets */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold block uppercase">Total Sales (Completed)</span>
              <span className="text-2xl font-extrabold text-white mt-1">₹{stats.totalSales}</span>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold block uppercase">Pending Orders</span>
              <span className="text-2xl font-extrabold text-white mt-1">{stats.pendingOrders}</span>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold block uppercase">Products in Catalog</span>
              <span className="text-2xl font-extrabold text-white mt-1">{stats.totalProducts}</span>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold block uppercase">Completed Orders</span>
              <span className="text-2xl font-extrabold text-white mt-1">{stats.completedOrders}</span>
            </div>
          </div>
        </section>

        {/* Tab Selection */}
        <section className="flex border-b border-slate-700/60">
          <button
            onClick={() => { playClickSound('click'); setActiveTab('orders'); }}
            className={`px-6 py-3.5 text-sm font-semibold tracking-wide border-b-2 transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'orders' 
                ? 'border-amber-500 text-amber-500 font-bold bg-slate-800/30' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Orders Queue</span>
          </button>
          
          <button
            onClick={() => { playClickSound('click'); setActiveTab('inventory'); }}
            className={`px-6 py-3.5 text-sm font-semibold tracking-wide border-b-2 transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'inventory' 
                ? 'border-amber-500 text-amber-500 font-bold bg-slate-800/30' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Inventory Manager</span>
          </button>

          <button
            onClick={() => { playClickSound('click'); setActiveTab('settings'); }}
            className={`px-6 py-3.5 text-sm font-semibold tracking-wide border-b-2 transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'settings' 
                ? 'border-amber-500 text-amber-500 font-bold bg-slate-800/30' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>System Settings</span>
          </button>
        </section>

        {/* Tab Content */}
        <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 shadow-xl">

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-medium">Loading data from Firebase...</p>
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div className="text-center py-16">
                <p className="text-red-400 font-semibold">{error}</p>
                <button
                  onClick={loadAllData}
                  className="mt-4 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl transition-all duration-150"
                >Retry</button>
              </div>
            )}

            {/* ORDERS TAB */}
            {!loading && !error && activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="font-display font-bold text-lg text-white">Active Customer Orders Queue</h2>
                  <button 
                    onClick={loadAllData}
                    className="p-2 border border-slate-700 hover:bg-slate-700 rounded-xl transition-all duration-150 text-slate-400 hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <ClipboardList className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                    <p className="font-medium text-lg">No orders placed yet</p>
                    <p className="text-sm text-slate-600 mt-1">Orders sent by customers from the store homepage will display here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map(order => (
                      <article 
                        key={order.id}
                        className="bg-slate-800 border border-slate-700/50 p-6 rounded-2xl flex flex-col lg:flex-row lg:items-start justify-between gap-6 shadow-sm hover:border-slate-600/50 transition-all duration-200"
                      >
                        {/* Order info */}
                        <div className="space-y-3 flex-grow">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-white uppercase bg-slate-700 px-3 py-1 rounded-lg">
                              ID: {order.id}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">
                              {new Date(order.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800 text-sm">
                            <div className="space-y-1">
                              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Customer Details</p>
                              <p className="font-semibold text-white">{order.customer.name}</p>
                              <p className="text-slate-300">{order.customer.phone}</p>
                              {order.customer.email && <p className="text-xs text-slate-400">{order.customer.email}</p>}
                            </div>
                            <div className="space-y-1">
                              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Delivery & Method</p>
                              <p className="text-slate-355 font-bold">{order.deliveryMethod || 'Take Away (Pickup)'}</p>
                              {order.deliveryMethod === 'Cash on Delivery' && order.customer.address ? (
                                <p className="text-slate-300 text-xs mt-1 whitespace-pre-wrap bg-slate-900/50 p-2 rounded-lg">{order.customer.address}</p>
                              ) : (
                                <p className="text-slate-500 text-xs mt-1 italic">Customer will pick up at store counter.</p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Items summary</p>
                            <ul className="space-y-1 text-sm">
                              {order.items.map((it, idx) => (
                                <li key={idx} className="flex justify-between max-w-md bg-slate-900/20 px-3 py-1.5 rounded-lg text-slate-300">
                                  <span>{it.productName} ({it.volume}) <strong className="text-amber-500">x{it.quantity}</strong></span>
                                  <span className="font-semibold text-white">₹{it.price * it.quantity}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {order.notes && (
                            <div className="text-xs bg-slate-900/30 text-slate-300 border border-slate-800 p-2.5 rounded-lg max-w-md">
                              <strong className="text-amber-500 font-semibold mr-1">Note:</strong> "{order.notes}"
                            </div>
                          )}
                        </div>

                        {/* Order status and total */}
                        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-4 lg:w-52 shrink-0">
                          <div className="text-right">
                            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Order Value</span>
                            <span className="text-2xl font-extrabold text-white">₹{order.total}</span>
                            <span className="text-[10px] block font-semibold text-amber-500 mt-0.5">{order.paymentMethod}</span>
                            {order.deliveryFee > 0 && (
                              <span className="text-[9px] block text-slate-400 font-semibold italic mt-0.5">Includes ₹30 delivery fee</span>
                            )}
                          </div>

                          <div className="space-y-2.5 w-full">
                            <div>
                              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block lg:text-right mb-1">Order Status</label>
                              <select
                                value={order.status}
                                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                className={`w-full text-slate-950 font-bold px-3 py-2 rounded-xl outline-none text-xs shadow-sm ${
                                  order.status === 'Delivered' ? 'bg-emerald-400' :
                                  order.status === 'Cancelled' ? 'bg-red-400' :
                                  order.status === 'Getting Ready' ? 'bg-blue-400' :
                                  'bg-amber-400' // Order Received
                                }`}
                              >
                                <option value="Order Received">📥 Order Received</option>
                                <option value="Getting Ready">📦 Getting Ready</option>
                                <option value="Delivered">✅ Delivered</option>
                                <option value="Cancelled">❌ Cancelled</option>
                              </select>
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="space-y-1.5">
                              {order.status === 'Order Received' && (
                                <button
                                  onClick={() => handleStatusChange(order.id, 'Getting Ready')}
                                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                                >
                                  Confirm Order
                                </button>
                              )}
                              {order.status === 'Getting Ready' && (
                                <button
                                  onClick={() => handleStatusChange(order.id, 'Delivered')}
                                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                                >
                                  Mark as Delivered
                                </button>
                              )}
                              {(order.status === 'Order Received' || order.status === 'Getting Ready') && (
                                <button
                                  onClick={() => handleStatusChange(order.id, 'Cancelled')}
                                  className="w-full py-1.5 border border-red-500/30 hover:bg-red-500/10 text-red-400 font-bold text-[10px] rounded-lg transition-colors"
                                >
                                  Cancel Order
                                </button>
                              )}
                              <button
                                onClick={() => { playClickSound('click'); setSelectedInvoiceOrder(order); }}
                                className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1"
                              >
                                <Receipt className="w-3.5 h-3.5 text-slate-300" />
                                <span>Invoice</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* INVENTORY TAB */}
            {!loading && !error && activeTab === 'inventory' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="font-display font-bold text-lg text-white">Manage Products Stock Catalog</h2>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={openAddProductModal}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl flex items-center gap-1.5 transition-all duration-150 shadow-md shadow-amber-500/10"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Product</span>
                    </button>
                  </div>
                </div>

                {/* Inventory search bar */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    className="w-full bg-slate-900/60 border border-slate-700/80 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white pl-10 pr-4 py-3 rounded-xl outline-none text-sm transition-all duration-200"
                    placeholder="Search product inventory by name or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 bg-slate-900/20 border border-slate-800 rounded-2xl">
                    <p className="font-semibold text-lg text-slate-400">No products match search criteria</p>
                    <p className="text-sm text-slate-600 mt-1">Try another search or click 'Add Product' to add one.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <th className="py-4 px-4">Image</th>
                          <th className="py-4 px-4">Product Name</th>
                          <th className="py-4 px-4">Category</th>
                          <th className="py-4 px-4">Variants (Size / Price)</th>
                          <th className="py-4 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-sm">
                        {filteredProducts.map(product => (
                          <tr key={product.id} className="hover:bg-slate-800/30 transition-colors duration-150">
                             <td className="py-3 px-4">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 mix-blend-multiply p-1"
                                  onError={(e) => { e.target.style.display='none'; }}
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold border border-slate-600">
                                  IMG
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 font-bold text-white">
                              {product.name}
                              <span className="block text-xs text-slate-500 font-normal mt-0.5 line-clamp-1 max-w-xs">
                                {product.description || 'No description provided.'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs rounded font-medium border border-slate-700/50">
                                {product.category}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-wrap gap-1">
                                {product.variants.map((v, i) => (
                                  <span key={i} className="text-xs bg-slate-900 text-slate-300 font-semibold px-2 py-1 rounded border border-slate-800">
                                    {v.volume}: <strong className="text-amber-400">₹{v.price}</strong>
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-right space-x-2 shrink-0">
                              <button
                                onClick={() => openEditProductModal(product)}
                                className="p-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white rounded-lg transition-colors duration-150 inline-flex"
                                title="Edit Product"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(product.id)}
                                className="p-2 border border-slate-700 hover:border-red-500 text-slate-400 hover:text-red-400 rounded-lg transition-colors duration-150 inline-flex"
                                title="Delete Product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS TAB */}
            {!loading && !error && activeTab === 'settings' && (
              <div className="space-y-8 max-w-xl">
                
                {/* Connection Status */}
                <div className="space-y-3 bg-slate-900/30 p-6 rounded-2xl border border-slate-800">
                  <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-amber-500" />
                    <span>Database Engine Status</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="font-semibold text-sm">Connected to Cloud Firebase Firestore</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Project: <span className="text-slate-300 font-mono">{import.meta.env.VITE_FIREBASE_PROJECT_ID}</span> — All data is stored in the cloud.
                  </p>
                </div>



                {/* Database seeding */}
                <div className="space-y-4 bg-slate-900/30 p-6 rounded-2xl border border-slate-800">
                  <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-red-400" />
                    <span>Restore Defaults</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Resetting the inventory database will delete any custom products you added and restore the item inventory back to the default list from the original Google Sheets PDF.
                  </p>
                  <button
                    onClick={handleReseed}
                    className="px-4 py-2.5 border border-red-500/30 hover:bg-red-500/10 text-red-400 font-bold text-sm rounded-xl flex items-center gap-1.5 transition-all duration-150"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reset Stock Inventory Now</span>
                  </button>
                </div>

              </div>
            )}
          </section>
      </main>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsProductModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"></div>
          
          <div className="relative w-full max-w-xl bg-slate-800 border border-slate-700 shadow-2xl p-6 rounded-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsProductModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display font-bold text-xl text-white mb-6">
              {editingProduct ? '✏️ Edit Product Details' : '➕ Add New Product to Stock'}
            </h3>

            <form onSubmit={handleProductSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-900 border border-slate-700 text-white px-3.5 py-2.5 rounded-xl outline-none text-sm focus:border-amber-500"
                    placeholder="E.g., Sprite"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1">Category</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 text-white px-3.5 py-2.5 rounded-xl outline-none text-sm focus:border-amber-500"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                  >
                    {CATEGORIES.slice(1).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3">
                  <label className="block text-slate-300 text-xs font-semibold mb-1">Image URL</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-700 text-white px-3.5 py-2.5 rounded-xl outline-none text-sm focus:border-amber-500"
                    placeholder="https://..."
                    value={prodImageUrl}
                    onChange={(e) => setProdImageUrl(e.target.value.trim())}
                  />
                  {prodImageUrl && (
                    <img
                      src={prodImageUrl}
                      alt="Preview"
                      className="mt-2 h-24 w-full object-cover rounded-xl border border-slate-700"
                      onError={(e) => { e.target.style.display='none'; }}
                    />
                  )}
                </div>
                <div className="col-span-3">
                  <label className="block text-slate-300 text-xs font-semibold mb-1">Short Description</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-700 text-white px-3.5 py-2.5 rounded-xl outline-none text-sm focus:border-amber-500"
                    placeholder="E.g., Carbonated lemon-lime taste"
                    value={prodDescription}
                    onChange={(e) => setProdDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Variants */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 text-xs font-semibold">Pricing Variants</label>
                  <button
                    type="button"
                    onClick={addVariantRow}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold text-amber-400 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Size</span>
                  </button>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {prodVariants.map((v, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        required
                        className="bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg outline-none text-sm flex-grow"
                        placeholder="Size/Volume (e.g. 1L, 250ML, Pack)"
                        value={v.volume}
                        onChange={(e) => handleVariantFieldChange(index, 'volume', e.target.value)}
                      />
                      <div className="relative w-28 shrink-0">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-xs font-semibold">₹</span>
                        <input
                          type="number"
                          required
                          min="1"
                          className="w-full bg-slate-900 border border-slate-700 text-white pl-6 pr-3 py-2 rounded-lg outline-none text-sm focus:border-amber-500"
                          placeholder="Price"
                          value={v.price || ''}
                          onChange={(e) => handleVariantFieldChange(index, 'price', e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariantRow(index)}
                        className="p-2 border border-slate-700 hover:border-red-500 hover:text-red-400 rounded-lg text-slate-400 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-700/60 mt-6">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-700 text-slate-300 hover:bg-slate-700 rounded-xl text-sm font-semibold transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 transition-colors duration-150"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Product</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (() => {
        const prod = items.find(i => i.id === deleteConfirmId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setDeleteConfirmId(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <div className="relative w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-center">
                <h3 className="font-display font-bold text-lg text-white">Delete Product?</h3>
                <p className="text-slate-400 text-sm mt-1">
                  This will permanently remove <span className="text-white font-semibold">"{prod?.name}"</span> from the catalog.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="py-2.5 border border-slate-600 text-slate-300 hover:bg-slate-700 font-semibold text-sm rounded-xl transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteProduct(deleteConfirmId)}
                  className="py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-xl transition-colors duration-150"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Printable Invoice Modal for Admin */}
      {selectedInvoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm print:p-0 print:absolute print:inset-0 print:bg-white print:backdrop-blur-none">
          <div onClick={() => setSelectedInvoiceOrder(null)} className="absolute inset-0 print:hidden" />
          <div className="relative w-full max-w-2xl bg-white text-slate-800 rounded-3xl p-8 overflow-y-auto max-h-[90vh] print:max-h-full print:shadow-none print:border-0 print:rounded-none flex flex-col justify-between print-admin-invoice-container">
            <button
              onClick={() => setSelectedInvoiceOrder(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Print CSS Injector */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                body * {
                  visibility: hidden !important;
                }
                .print-admin-invoice-container, .print-admin-invoice-container * {
                  visibility: visible !important;
                }
                .print-admin-invoice-container {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
              }
            `}} />

            {/* Invoice Content */}
            <div className="space-y-6 print:space-y-4">
              
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">Satya General Store</h2>
                  <p className="text-xs text-slate-500 mt-1">Visakhapatnam, Andhra Pradesh</p>
                  <p className="text-xs text-slate-500">Phone: +91 96036 55683</p>
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-lg text-amber-500 uppercase tracking-widest">Invoice</h3>
                  <p className="text-xs text-slate-500 mt-1">Order Ref: <span className="font-bold text-slate-800">{selectedInvoiceOrder.id}</span></p>
                  <p className="text-xs text-slate-500">Date: {new Date(selectedInvoiceOrder.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Billed To / Delivery Details */}
              <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50 p-4 rounded-2xl print:bg-slate-50/50 text-slate-800">
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Billed To</p>
                  <p className="font-bold text-slate-900 text-sm mt-1">{selectedInvoiceOrder.customer.name}</p>
                  <p className="text-slate-600 mt-0.5">{selectedInvoiceOrder.customer.phone}</p>
                  {selectedInvoiceOrder.customer.email && (
                    <p className="text-slate-600">{selectedInvoiceOrder.customer.email}</p>
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Order Details</p>
                  <p className="font-semibold text-slate-800 mt-1">Method: {selectedInvoiceOrder.deliveryMethod || 'Take Away'}</p>
                  <p className="text-slate-600">Payment: {selectedInvoiceOrder.paymentMethod}</p>
                  {selectedInvoiceOrder.deliveryMethod === 'Cash on Delivery' && (
                    <div className="mt-2 pt-1.5 border-t border-slate-200">
                      <p className="font-semibold text-slate-400 text-[10px] uppercase">Delivery Address</p>
                      <p className="text-slate-700 leading-tight mt-0.5">{selectedInvoiceOrder.customer.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Table of Items */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3.5">Product Details</th>
                      <th className="p-3.5 text-center">Qty</th>
                      <th className="p-3.5 text-right">Price</th>
                      <th className="p-3.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoiceOrder.items.map((it, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="p-3.5">
                          <p className="font-bold text-slate-800">{it.productName}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{it.volume}</p>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-700">{it.quantity}</td>
                        <td className="p-3.5 text-right text-slate-600">₹{it.price}</td>
                        <td className="p-3.5 text-right font-bold text-slate-800">₹{it.price * it.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total calculations */}
              <div className="flex justify-end pt-2 text-slate-800">
                <div className="w-72 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Items Subtotal:</span>
                    <span className="font-semibold">₹{selectedInvoiceOrder.total - (selectedInvoiceOrder.deliveryFee || 0)}</span>
                  </div>
                  {selectedInvoiceOrder.deliveryFee > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery Fee (COD):</span>
                      <span className="font-semibold text-orange-600">+₹{selectedInvoiceOrder.deliveryFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold text-slate-900">
                    <span>Grand Total:</span>
                    <span>₹{selectedInvoiceOrder.total}</span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-8 border-t border-slate-100 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Thank you for shopping at Satya General Store! 🙏
              </div>
            </div>

            {/* Actions (hidden when printing) */}
            <div className="flex gap-3 pt-6 border-t border-slate-100 mt-6 print:hidden">
              <button
                onClick={() => setSelectedInvoiceOrder(null)}
                className="flex-grow py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-sm transition-colors text-center"
              >
                Close Invoice
              </button>
              <button
                onClick={() => window.print()}
                className="flex-grow py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/10"
              >
                <Printer className="w-4 h-4 text-white" />
                <span className="text-white">Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
