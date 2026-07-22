import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  getItems,
  createOrder,
  getUserOrders,
  getUserProfile,
  saveUserProfile
} from '../lib/firestoreService';
import { 
  ShoppingBag, 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  MapPin, 
  Phone, 
  User, 
  CheckCircle,
  AlertTriangle,
  Trash2,
  FileText,
  ChevronRight,
  ChevronUp,
  Clock,
  Mail,
  Lock,
  LogOut,
  Receipt,
  Printer,
  Sparkles,
  Calendar,
  Truck,
  History
} from 'lucide-react';
import { Link } from 'react-router-dom';

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

const CATEGORY_COLORS = {
  "Golisoda": "from-cyan-500 to-blue-600 text-cyan-700 bg-cyan-50 border-cyan-200",
  "Cool Drinks": "from-amber-500 to-orange-600 text-amber-700 bg-amber-50 border-amber-200",
  "ORS": "from-rose-500 to-red-600 text-rose-700 bg-rose-50 border-rose-200",
  "Milk": "from-teal-500 to-emerald-600 text-teal-700 bg-teal-50 border-teal-200",
  "Curd": "from-indigo-500 to-blue-600 text-indigo-700 bg-indigo-50 border-indigo-200",
  "Lassi": "from-purple-500 to-pink-600 text-purple-700 bg-purple-50 border-purple-200",
  "Butter Milk": "from-emerald-500 to-green-600 text-emerald-700 bg-emerald-50 border-emerald-200",
  "Snacks": "from-yellow-500 to-amber-600 text-yellow-700 bg-yellow-50 border-yellow-200",
  "Mixture": "from-rose-500 to-pink-600 text-rose-700 bg-rose-50 border-rose-200"
};

const CATEGORY_GRADIENTS = {
  "Golisoda": "from-cyan-400 to-blue-500",
  "Cool Drinks": "from-amber-400 to-orange-500",
  "ORS": "from-rose-400 to-red-500",
  "Milk": "from-teal-400 to-emerald-500",
  "Curd": "from-indigo-400 to-blue-500",
  "Lassi": "from-purple-400 to-pink-500",
  "Butter Milk": "from-emerald-400 to-green-500",
  "Snacks": "from-yellow-400 to-amber-500",
  "Mixture": "from-rose-400 to-pink-500"
};

export default function StorePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Items');
  
  // Cart State: array of { product, variant, quantity }
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  // Product variant selections (productId -> variantIndex)
  const [selectedVariants, setSelectedVariants] = useState({});

  // User Auth State
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authAddress, setAuthAddress] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Dashboard & Profile
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [dashboardTab, setDashboardTab] = useState('orders'); // 'orders' or 'profile'
  const [userOrders, setUserOrders] = useState([]);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Checkout form details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('Take Away'); // 'Take Away' or 'Cash on Delivery'
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash at Counter');
  const [notes, setNotes] = useState('');

  const [storeSettings, setStoreSettings] = useState({ takeawayEnabled: true, deliveryEnabled: true, buyingEnabled: true });

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'store');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStoreSettings({
          takeawayEnabled: data.takeawayEnabled !== false,
          deliveryEnabled: data.deliveryEnabled !== false,
          buyingEnabled: data.buyingEnabled !== false,
        });
      } else {
        setStoreSettings({ takeawayEnabled: true, deliveryEnabled: true, buyingEnabled: true });
      }
    }, (err) => {
      console.error("Failed to sync settings on store page:", err);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!storeSettings.takeawayEnabled && deliveryMethod === 'Take Away') {
      setDeliveryMethod('Cash on Delivery');
      setPaymentMethod('Cash on Delivery');
    } else if (!storeSettings.deliveryEnabled && deliveryMethod === 'Cash on Delivery') {
      setDeliveryMethod('Take Away');
      setPaymentMethod('Cash at Counter');
    }
  }, [storeSettings, deliveryMethod]);

  // Live Tracking State
  const [activeOrderId, setActiveOrderId] = useState(() => {
    return localStorage.getItem('satya_active_order_id') || null;
  });
  const [activeOrder, setActiveOrder] = useState(null);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);

  // Invoice State
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

  // Back-to-top visibility
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen to Auth State changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load user profile details
        try {
          const profile = await getUserProfile(currentUser.uid);
          if (profile) {
            setCustomerName(profile.name || '');
            setCustomerPhone(profile.phone || '');
            setCustomerAddress(profile.address || '');
            
            setProfileName(profile.name || '');
            setProfilePhone(profile.phone || '');
            setProfileAddress(profile.address || '');
          }
        } catch (err) {
          console.error("Error loading user profile:", err);
        }
      } else {
        setProfileName('');
        setProfilePhone('');
        setProfileAddress('');
      }
    });
    return () => unsub();
  }, []);

  // Live listener for active order
  useEffect(() => {
    if (!activeOrderId) {
      setActiveOrder(null);
      return;
    }

    const unsub = onSnapshot(doc(db, 'orders', activeOrderId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setActiveOrder({ id: docSnap.id, ...data });
      } else {
        setActiveOrder(null);
      }
    }, (err) => {
      console.error("Live order tracking error:", err);
    });

    return () => unsub();
  }, [activeOrderId]);

  // Load orders when dashboard opens
  const loadUserOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const orders = await getUserOrders(user.uid);
      setUserOrders(orders);
    } catch (err) {
      console.error("Error loading user orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (isDashboardOpen && user) {
      loadUserOrders();
    }
  }, [isDashboardOpen, user]);

  // Fetch items from Firestore on mount
  useEffect(() => {
    const initVariants = (data) => {
      const initialVariants = {};
      data.forEach(item => { initialVariants[item.id] = 0; });
      return initialVariants;
    };

    setLoading(true);
    setError(null);
    getItems()
      .then(data => {
        setItems(data);
        setSelectedVariants(initVariants(data));
      })
      .catch(err => {
        console.error('Failed to load items from Firestore:', err);
        setError('Unable to connect to the store. Please check your internet connection and refresh.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleVariantChange = (productId, variantIndex) => {
    setSelectedVariants(prev => ({
      ...prev,
      [productId]: variantIndex
    }));
  };

  const addToCart = (product) => {
    if (!product) {
      console.error("addToCart: product is undefined");
      return;
    }
    const variants = product.variants || [];
    const variantIndex = selectedVariants[product.id] || 0;
    const variant = variants[variantIndex] || variants[0];
    
    if (!variant) {
      console.error("addToCart: variant is undefined for product", product);
      return;
    }

    setCart(prevCart => {
      // Clean up cart array to filter out any null/undefined entries
      const cleanCart = Array.isArray(prevCart) ? prevCart.filter(item => item && item.product && item.variant) : [];
      
      const existingItemIndex = cleanCart.findIndex(
        item => item.product.id === product.id && 
                item.variant && 
                item.variant.volume === variant.volume
      );

      if (existingItemIndex > -1) {
        const updatedCart = [...cleanCart];
        updatedCart[existingItemIndex].quantity = (updatedCart[existingItemIndex].quantity || 0) + 1;
        return updatedCart;
      } else {
        return [...cleanCart, { product, variant, quantity: 1 }];
      }
    });

    // Ripple-effect drawer opening for visual feedback
    setIsCartOpen(true);
  };

  const updateQuantity = (index, delta) => {
    setCart(prevCart => {
      const cleanCart = Array.isArray(prevCart) ? prevCart.filter(item => item && item.product && item.variant) : [];
      if (index < 0 || index >= cleanCart.length) return cleanCart;
      
      const updatedCart = [...cleanCart];
      const newQty = (updatedCart[index].quantity || 0) + delta;
      
      if (newQty <= 0) {
        updatedCart.splice(index, 1);
      } else {
        updatedCart[index].quantity = newQty;
      }
      return updatedCart;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    if (!Array.isArray(cart)) return 0;
    return cart.reduce((total, item) => {
      if (!item || !item.variant || typeof item.variant.price !== 'number') return total;
      return total + (item.variant.price * (item.quantity || 1));
    }, 0);
  };

  const getCartCount = () => {
    if (!Array.isArray(cart)) return 0;
    return cart.reduce((count, item) => {
      if (!item || typeof item.quantity !== 'number') return count;
      return count + item.quantity;
    }, 0);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    
    if (isForgotPassword) {
      try {
        await sendPasswordResetEmail(auth, authEmail);
        setAuthSuccess('Password reset link sent to your email!');
      } catch (err) {
        setAuthError(err.message.replace('Firebase:', ''));
      }
      return;
    }

    if (isSignUpMode) {
      if (!authEmail || !authPassword || !authName || !authPhone) {
        setAuthError('Please fill in Name, Phone, Email, and Password.');
        return;
      }
      try {
        const credentials = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        const userUid = credentials.user.uid;
        
        await saveUserProfile(userUid, {
          name: authName,
          phone: authPhone,
          address: authAddress,
          email: authEmail
        });
        
        setProfileName(authName);
        setProfilePhone(authPhone);
        setProfileAddress(authAddress);
        setCustomerName(authName);
        setCustomerPhone(authPhone);
        setCustomerAddress(authAddress);

        setIsAuthModalOpen(false);
        setAuthEmail('');
        setAuthPassword('');
        setAuthName('');
        setAuthPhone('');
        setAuthAddress('');
        setIsSignUpMode(false);
      } catch (err) {
        setAuthError(err.message.replace('Firebase:', ''));
      }
    } else {
      try {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        setIsAuthModalOpen(false);
        setAuthEmail('');
        setAuthPassword('');
      } catch (err) {
        setAuthError('Invalid email or password. Please try again.');
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setIsDashboardOpen(false);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      await saveUserProfile(user.uid, {
        name: profileName,
        phone: profilePhone,
        address: profileAddress
      });
      setCustomerName(profileName);
      setCustomerPhone(profilePhone);
      setCustomerAddress(profileAddress);
      setIsProfileEditing(false);
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Failed to update profile.");
    }
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const itemsTotal = getCartTotal();
    const deliveryFee = deliveryMethod === 'Cash on Delivery' ? 30 : 0;
    const orderTotal = itemsTotal + deliveryFee;

    const orderItems = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      volume: item.variant.volume,
      price: item.variant.price,
      quantity: item.quantity
    }));

    const orderData = {
      userId: user?.uid || null,
      customer: {
        name: customerName,
        phone: customerPhone,
        email: user?.email || '',
        address: deliveryMethod === 'Cash on Delivery' ? customerAddress : ''
      },
      items: orderItems,
      deliveryMethod,
      deliveryFee,
      total: orderTotal,
      paymentMethod: deliveryMethod === 'Cash on Delivery' ? 'Cash on Delivery' : paymentMethod,
      notes,
      createdAt: new Date().toISOString(),
      status: 'Order Received'
    };

    try {
      const savedOrder = await createOrder(orderData);
      
      setCart([]);
      setIsCheckoutOpen(false);
      setNotes('');

      setActiveOrderId(savedOrder.id);
      localStorage.setItem('satya_active_order_id', savedOrder.id);
      setIsTrackerOpen(true);

      if (user?.uid) {
        await saveUserProfile(user.uid, {
          name: customerName,
          phone: customerPhone,
          address: deliveryMethod === 'Cash on Delivery' ? customerAddress : profileAddress
        });
      }
    } catch (err) {
      console.error("Order submission failed:", err);
      alert("Failed to create order. Please check connection and try again.");
    }
  };

  // Filters logic
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Items' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

      {/* Header bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Satya General Store
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {activeOrderId && (
              <button
                onClick={() => setIsTrackerOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 font-bold text-xs rounded-xl transition-colors duration-150"
              >
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                <span>Track Order</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setDashboardTab('orders'); setIsDashboardOpen(true); }}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors shadow-sm"
                >
                  <User className="w-4 h-4 text-amber-500" />
                  <span className="hidden sm:inline">My Account</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="p-2.5 border border-slate-200 hover:bg-red-50 hover:border-red-100 text-red-500 hover:text-red-600 rounded-xl transition-colors shadow-sm"
                  title="Sign Out"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setIsSignUpMode(false); setIsForgotPassword(false); setAuthError(''); setAuthSuccess(''); setIsAuthModalOpen(true); }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors shadow-sm shadow-amber-500/10 animate-fade-in"
              >
                <User className="w-4 h-4" />
                <span>Login</span>
              </button>
            )}

            {/* Cart button — hidden when buying is disabled */}
            {storeSettings.buyingEnabled && (
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-3 bg-amber-50 border border-amber-100 hover:bg-amber-100/80 rounded-xl text-amber-700 transition-all duration-200 shadow-sm"
                aria-label="Shopping Cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {getCartCount() > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-orange-600 text-white font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center border border-white shadow-md animate-bounce">
                    {getCartCount()}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-amber-50 via-orange-50/50 to-white py-10 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top label */}
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              You're at the shop — Order right here!
            </span>
          </div>

          {/* 3-Step How it works */}
          <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
            {[
              { step: "1", icon: "🛍️", title: "Browse", desc: "Pick your items from the catalog" },
              { step: "2", icon: "📦", title: "Order Now", desc: "Direct COD or Pickup order" },
              { step: "3", icon: "🕒", title: "Track", desc: "Watch live status updates" }
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="text-center bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center text-xl">{icon}</div>
                <div className="w-5 h-5 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center -mt-1">{step}</div>
                <p className="font-bold text-slate-900 text-sm">{title}</p>
                <p className="text-slate-400 text-[11px] leading-tight hidden sm:block">{desc}</p>
              </div>
            ))}
          </div>

          <div className="sm:flex sm:items-start sm:justify-between gap-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Browse. Order Online.<br className="hidden sm:inline" />
              <span className="text-amber-500">Track Live Status.</span>
            </h2>
            <p className="mt-3 text-base text-slate-500 max-w-lg">
              You're here at Satya General Store! Add the items you need to your cart, click <strong>"Order Now"</strong>, choose COD or Pickup, and track your order's progress in real-time.
            </p>
          </div>

          {/* Store Info Card */}
          <div className="mt-8 sm:mt-0 max-w-sm w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-xl space-y-3">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Store Info
            </h3>
            <a
              href="tel:+919603655683"
              className="flex items-center gap-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 p-3 rounded-xl transition-colors duration-150 group"
            >
              <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Call Store</p>
                <p className="text-sm font-bold text-slate-800">+91 96036 55683</p>
              </div>
            </a>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Open Hours</p>
                <p className="text-sm font-semibold text-slate-700">7:00 AM – 10:00 PM · Daily</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Location</p>
                <p className="text-sm font-semibold text-slate-700">Visakhapatnam, Andhra Pradesh</p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-2 sm:px-6 lg:px-8 py-6 flex flex-row gap-2 md:gap-8">
        
        {/* Sidebar Categories — narrow on mobile, full on desktop */}
        <aside className="w-16 md:w-56 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm sticky top-28 overflow-hidden min-h-[calc(100vh-7rem)]">
            {/* Desktop header */}
            <h3 className="hidden md:block font-bold text-slate-950 mb-0 px-4 pt-4 pb-2 font-display text-sm">Categories</h3>
            <nav className="flex flex-col">
              {CATEGORIES.map(category => {
                const count = category === 'All Items' ? items.length : items.filter(i => i.category === category).length;
                const isActive = selectedCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-center md:text-left transition-all duration-200 flex flex-col md:flex-row items-center md:justify-between gap-0.5 md:gap-0 border-b border-slate-100 last:border-0 ${
                      isActive
                        ? 'bg-amber-500 text-white font-semibold'
                        : 'text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                    }`}
                  >
                    {/* Mobile: compact stacked label */}
                    <span className="md:hidden w-full px-1 py-2.5 text-[10px] font-bold leading-tight text-center block">
                      {category === 'All Items' ? 'All' : category.split(' ').map((word, i) => (
                        <span key={i} className="block">{word}</span>
                      ))}
                    </span>
                    {/* Desktop: full label + count */}
                    <span className="hidden md:block flex-1 px-3.5 py-2.5 text-sm">{category}</span>
                    <span className={`hidden md:inline-block text-[11px] font-bold px-1.5 py-0.5 rounded-full mr-3 ${
                      isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>{count}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Catalog Section */}
        <div className="flex-grow min-w-0 space-y-5">
          {/* View-Only Banner when buying is disabled */}
          {!storeSettings.buyingEnabled && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-fade-in">
              <span className="text-xl">👁️</span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Browse Mode — View Only</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Online ordering is currently not available. You can browse our full catalog and see prices. To place an order, contact us directly at <strong className="text-amber-700 font-semibold">+91 96036 55683</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Banner for store closed/ordering paused */}
          {!storeSettings.takeawayEnabled && !storeSettings.deliveryEnabled && storeSettings.buyingEnabled && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm animate-fade-in">
              <span className="text-xl">⚠️</span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Ordering is Temporarily Paused</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  We are not accepting online orders at the moment. Please contact the store directly at <strong className="text-amber-700 font-semibold">+91 96036 55683</strong> to check availability.
                </p>
              </div>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-950 pl-12 pr-12 py-3.5 rounded-2xl outline-none shadow-sm transition-all duration-200"
              placeholder="Search cool drinks, mixtures, lassi, snacks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-medium">Loading products from Satya General Store...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-red-100 p-8 shadow-sm">
              <AlertTriangle className="w-16 h-16 text-red-300 mx-auto mb-4" />
              <h3 className="font-display font-bold text-lg text-slate-800">Connection Error</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all duration-150"
              >Retry</button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
              <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="font-display font-bold text-lg text-slate-800">No products found</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                We couldn't find anything matching "{searchQuery}". Try selecting another category or typing another item name.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {filteredItems.map(item => {
                const selectedVarIndex = selectedVariants[item.id] || 0;
                const currentVariant = item.variants[selectedVarIndex] || item.variants[0];
                const colors = CATEGORY_COLORS[item.category] || "from-slate-500 to-slate-600 text-slate-700 bg-slate-50 border-slate-200";
                const gradient = CATEGORY_GRADIENTS[item.category] || "from-slate-400 to-slate-500";
                const [bgFrom, bgTo, textCol, bgCol, borderCol] = colors.split(' ');

                return (
                  <article
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group"
                  >
                    {/* Product Image */}
                    <div className={`relative h-44 overflow-hidden bg-white shrink-0`}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500 mix-blend-multiply"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white/40 text-5xl font-black`}>
                          {item.name.charAt(0)}
                        </div>
                      )}
                      {/* Bottom image fade */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                      {/* Category badge */}
                      <span className={`absolute top-3 left-3 px-2.5 py-1 text-[11px] font-bold rounded-lg ${bgCol} ${textCol} ${borderCol} border shadow-sm backdrop-blur-sm`}>
                        {item.category}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-grow flex flex-col">
                      <h3 className="font-display font-bold text-[15px] text-slate-900 leading-tight">
                        {item.name}
                      </h3>
                      <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 leading-relaxed flex-grow">
                        {item.description || "Fresh and authentic product from our store."}
                      </p>

                      {/* Variants Selector */}
                      {item.variants.length > 1 && (
                        <div className="mt-3">
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Size / Volume</label>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {item.variants.map((v, idx) => (
                              <button
                                key={v.volume}
                                type="button"
                                onClick={() => handleVariantChange(item.id, idx)}
                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all duration-150 ${
                                  selectedVarIndex === idx
                                    ? 'bg-amber-50 border-amber-500 text-amber-700 font-bold shadow-sm'
                                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                              >
                                {v.volume}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Price + Add */}
                    <div className="px-4 pb-4 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Price</span>
                        <span className="text-2xl font-extrabold text-slate-900 leading-tight">₹{currentVariant.price}</span>
                      </div>
                      {storeSettings.buyingEnabled ? (
                        <button
                          onClick={() => addToCart(item)}
                          className="flex-1 max-w-[110px] px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/25 active:scale-95 transition-all duration-150"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add</span>
                        </button>
                      ) : (
                        <span className="flex-1 max-w-[110px] px-3 py-2 bg-slate-100 text-slate-400 font-semibold text-[11px] rounded-xl text-center border border-slate-200 leading-tight">
                          👁️ View Only
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Cart Button for Mobile — hidden when buying is disabled */}
      {storeSettings.buyingEnabled && getCartCount() > 0 && !isCartOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="md:hidden fixed bottom-6 right-6 z-40 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 border border-amber-400 animate-pulse"
        >
          <ShoppingCart className="w-5 h-5 text-slate-950" />
          <span>View Cart ({getCartCount()})</span>
          <span className="bg-slate-950 text-white font-extrabold text-xs px-2 py-0.5 rounded-full">
            ₹{getCartTotal()}
          </span>
        </button>
      )}

      {/* Sliding Drawer Cart */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop */}
            <div 
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
            ></div>

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full">
                
                {/* Drawer Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2 text-slate-900">
                    <ShoppingCart className="w-5 h-5 text-amber-500" />
                    <h2 className="font-display font-bold text-lg">Your Cart ({getCartCount()})</h2>
                  </div>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-all duration-150"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Body */}
                <div className="flex-grow overflow-y-auto p-6 space-y-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                      <ShoppingCart className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                      <p className="font-medium text-slate-500">Your shopping cart is empty</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">Add delicious snacks or golisoda to start ordering.</p>
                    </div>
                  ) : (
                    cart.filter(item => item && item.product && item.variant).map((item, index) => (
                      <div 
                        key={`${item.product.id}-${item.variant.volume}`}
                        className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors duration-150"
                      >
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-14 h-14 rounded-xl object-contain shrink-0 border border-slate-100 bg-white mix-blend-multiply p-1"
                            onError={(e) => { e.target.style.display='none'; }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl shrink-0 bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center text-slate-500 font-bold text-lg">
                            {item.product.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-grow">
                          <h4 className="font-bold text-slate-900 text-sm leading-tight">{item.product.name}</h4>
                          <span className="inline-block mt-0.5 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {item.variant.volume}
                          </span>
                          <div className="flex items-center justify-between gap-4 mt-3">
                            <span className="text-sm font-extrabold text-slate-800">
                              ₹{item.variant.price * item.quantity}
                              <span className="text-[10px] text-slate-400 font-semibold ml-1">
                                (₹{item.variant.price} each)
                              </span>
                            </span>
                            
                            {/* Quantity buttons */}
                            <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                              <button
                                onClick={() => updateQuantity(index, -1)}
                                className="p-1.5 hover:bg-slate-50 text-slate-500 transition-colors duration-150"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-3 text-xs font-bold text-slate-800">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(index, 1)}
                                className="p-1.5 hover:bg-slate-50 text-slate-500 transition-colors duration-150"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Drawer Footer */}
                {cart.length > 0 && (
                  <div className="border-t border-slate-100 p-6 bg-slate-50 space-y-4">
                    <div className="flex items-center justify-between text-slate-900 font-bold">
                      <span className="text-slate-500 font-semibold text-sm">Estimated Total:</span>
                      <span className="text-2xl font-extrabold text-slate-950">₹{getCartTotal()}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={clearCart}
                        className="py-3 border border-slate-200 text-slate-600 hover:bg-slate-200/50 font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 transition-colors duration-150"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Clear All</span>
                      </button>
                      <button
                        onClick={() => setIsCheckoutOpen(true)}
                        disabled={!storeSettings.takeawayEnabled && !storeSettings.deliveryEnabled}
                        className={`py-3 font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-colors duration-150 ${
                          (!storeSettings.takeawayEnabled && !storeSettings.deliveryEnabled)
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Order Now</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Form Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div 
            onClick={() => setIsCheckoutOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          ></div>

          {/* Dialog Card */}
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display font-bold text-xl text-slate-900 mb-1 flex items-center gap-2">
              <span>🛍️ Checkout details</span>
            </h3>
            <p className="text-slate-500 text-xs mb-5">Provide your details to submit your order directly to the store.</p>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              
              {/* Delivery Option Selector */}
              <div className="space-y-2">
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider">
                  Delivery Option
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={!storeSettings.takeawayEnabled}
                    onClick={() => {
                      setDeliveryMethod('Take Away');
                      setPaymentMethod('Cash at Counter');
                    }}
                    className={`p-3.5 border rounded-xl flex flex-col items-center justify-center text-center gap-1 transition-all ${
                      !storeSettings.takeawayEnabled
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                        : deliveryMethod === 'Take Away'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-lg">🛍️</span>
                    <span className="text-xs font-bold">Take Away</span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {storeSettings.takeawayEnabled ? '(Free Pickup)' : 'Temporarily Offline'}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!storeSettings.deliveryEnabled}
                    onClick={() => {
                      setDeliveryMethod('Cash on Delivery');
                      setPaymentMethod('Cash on Delivery');
                    }}
                    className={`p-3.5 border rounded-xl flex flex-col items-center justify-center text-center gap-1 transition-all ${
                      !storeSettings.deliveryEnabled
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                        : deliveryMethod === 'Cash on Delivery'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-lg">🛵</span>
                    <span className="text-xs font-bold">Cash on Delivery</span>
                    <span className="text-[10px] text-orange-600 font-bold">
                      {storeSettings.deliveryEnabled ? '(+₹30 Delivery Fee)' : 'Temporarily Offline'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1" htmlFor="name">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="name"
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-slate-950 pl-10 pr-4 py-2.5 rounded-xl outline-none text-sm transition-all duration-150"
                    placeholder="E.g., Syam Kumar"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1" htmlFor="phone">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    required
                    pattern="[6-9][0-9]{9}"
                    title="Enter a valid 10-digit Indian mobile number"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-slate-950 pl-10 pr-4 py-2.5 rounded-xl outline-none text-sm transition-all duration-150"
                    placeholder="E.g., 9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Conditionally display address input if COD selected */}
              {deliveryMethod === 'Cash on Delivery' && (
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1" htmlFor="address">
                    Delivery Address
                  </label>
                  <textarea
                    id="address"
                    required
                    rows="3"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-slate-950 px-3.5 py-2.5 rounded-xl outline-none text-sm transition-all duration-150"
                    placeholder="Your complete address (e.g. flat, building, street, landmark)..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  {deliveryMethod === 'Cash on Delivery' ? (
                    <input
                      type="text"
                      readOnly
                      className="w-full bg-slate-100 border border-slate-200 text-slate-500 px-3.5 py-2.5 rounded-xl text-sm select-none"
                      value="Cash on Delivery"
                    />
                  ) : (
                    <select
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-slate-950 px-3.5 py-2.5 rounded-xl outline-none text-sm transition-all duration-150"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="Cash at Counter">Cash at Counter</option>
                      <option value="UPI at Counter">UPI at Counter</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1" htmlFor="notes">
                    Notes (Optional)
                  </label>
                  <input
                    id="notes"
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-slate-950 px-3.5 py-2.5 rounded-xl outline-none text-sm transition-all duration-150"
                    placeholder="E.g., extra cold, mix bag"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Order summary breakdown */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-6">
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs uppercase tracking-wider mb-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>Order Summary</span>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1.5 text-xs text-slate-600">
                  {cart.filter(item => item && item.product && item.variant).map(item => (
                    <div key={`${item.product.id}-${item.variant.volume}`} className="flex justify-between">
                      <span>{item.product.name} ({item.variant.volume}) x{item.quantity}</span>
                      <span className="font-bold text-slate-800">₹{item.variant.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200/60 pt-2 mt-2 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Items Subtotal</span>
                    <span className="font-bold text-slate-800">₹{getCartTotal()}</span>
                  </div>
                  {deliveryMethod === 'Cash on Delivery' && (
                    <div className="flex justify-between text-orange-600 font-semibold">
                      <span>Delivery Fee</span>
                      <span>+₹30</span>
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between text-sm font-extrabold text-slate-950">
                  <span>Grand Total</span>
                  <span>₹{getCartTotal() + (deliveryMethod === 'Cash on Delivery' ? 30 : 0)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm rounded-xl transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all duration-150"
                >
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <span>Confirm Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsAuthModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-xl text-slate-900">
                {isForgotPassword ? 'Reset Password' : isSignUpMode ? 'Create Account' : 'Welcome Back'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isForgotPassword ? 'Enter your email to receive a password reset link' : isSignUpMode ? 'Register to manage orders and profile' : 'Sign in to access your orders dashboard'}
              </p>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}
            {authSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{authSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {isSignUpMode && !isForgotPassword && (
                <>
                  <div>
                    <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="E.g., Syam Kumar"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-slate-950 px-3.5 py-2.5 rounded-xl outline-none text-sm transition-all"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      pattern="[6-9][0-9]{9}"
                      title="Enter a valid 10-digit mobile number"
                      placeholder="E.g., 9876543210"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-slate-950 px-3.5 py-2.5 rounded-xl outline-none text-sm transition-all"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1">Default Delivery Address (Optional)</label>
                    <textarea
                      placeholder="E.g., Flat 101, Satya Apartments..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-slate-950 px-3.5 py-2 rounded-xl outline-none text-sm transition-all"
                      rows="2"
                      value={authAddress}
                      onChange={(e) => setAuthAddress(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-slate-950 pl-10 pr-4 py-2.5 rounded-xl outline-none text-sm transition-all"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                  />
                </div>
              </div>

              {!isForgotPassword && (
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-slate-950 pl-10 pr-4 py-2.5 rounded-xl outline-none text-sm transition-all"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-amber-500/10"
              >
                {isForgotPassword ? 'Send Reset Link' : isSignUpMode ? 'Register Account' : 'Sign In'}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 text-center text-xs text-slate-500 space-y-2">
              {!isForgotPassword && !isSignUpMode && (
                <>
                  <button onClick={() => { setIsForgotPassword(true); setAuthError(''); setAuthSuccess(''); }} className="text-amber-600 hover:underline font-semibold block mx-auto">
                    Forgot Password?
                  </button>
                  <p>
                    Don't have an account?{' '}
                    <button onClick={() => { setIsSignUpMode(true); setAuthError(''); setAuthSuccess(''); }} className="text-amber-600 hover:underline font-bold">
                      Sign Up
                    </button>
                  </p>
                </>
              )}
              {isSignUpMode && (
                <p>
                  Already have an account?{' '}
                  <button onClick={() => { setIsSignUpMode(false); setAuthError(''); setAuthSuccess(''); }} className="text-amber-600 hover:underline font-bold">
                    Sign In
                  </button>
                </p>
              )}
              {isForgotPassword && (
                <button onClick={() => { setIsForgotPassword(false); setAuthError(''); setAuthSuccess(''); }} className="text-amber-600 hover:underline font-semibold block mx-auto">
                  Back to Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Dashboard Modal */}
      {isDashboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsDashboardOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-3xl bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-display font-extrabold text-xl">Customer Account</h3>
                <p className="text-xs text-amber-50/80 mt-0.5">{user?.email}</p>
              </div>
              <button onClick={() => setIsDashboardOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-100 shrink-0">
              <button
                onClick={() => setDashboardTab('orders')}
                className={`flex-1 py-4 text-center text-sm font-bold border-b-2 transition-all ${
                  dashboardTab === 'orders' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Order History
              </button>
              <button
                onClick={() => setDashboardTab('profile')}
                className={`flex-1 py-4 text-center text-sm font-bold border-b-2 transition-all ${
                  dashboardTab === 'profile' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Profile Settings
              </button>
            </div>

            {/* Content Container (Scrollable) */}
            <div className="flex-grow overflow-y-auto p-6 bg-slate-50 animate-fade-in">
              
              {/* ORDERS TAB */}
              {dashboardTab === 'orders' && (
                <div className="space-y-4">
                  {loadingOrders ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                      <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                      <p className="text-xs">Loading your orders...</p>
                    </div>
                  ) : userOrders.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                      <History className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-bounce-subtle" />
                      <p className="font-semibold text-slate-700">No orders found</p>
                      <p className="text-xs text-slate-400 mt-1">When you place orders, they will show up here.</p>
                    </div>
                  ) : (
                    userOrders.map((ord) => (
                      <div key={ord.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-200 hover:shadow-md transition-all">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div>
                            <span className="text-xs font-black text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">ID: {ord.id}</span>
                            <span className="text-[11px] text-slate-400 font-semibold block sm:inline sm:ml-3">
                              {new Date(ord.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            ord.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                            ord.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                            ord.status === 'Getting Ready' ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800' // Order Received
                          }`}>
                            {ord.status}
                          </span>
                        </div>

                        {/* Summary breakdown */}
                        <div className="text-xs text-slate-600 space-y-1">
                          <p className="font-bold text-slate-700 mb-2">Items Ordered:</p>
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between max-w-md bg-slate-50/50 px-3 py-1.5 rounded-lg mb-1">
                              <span>{it.productName} ({it.volume}) x{it.quantity}</span>
                              <span className="font-semibold text-slate-800">₹{it.price * it.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 font-semibold">Total: </span>
                            <span className="font-extrabold text-sm text-slate-900">₹{ord.total}</span>
                            <span className="text-[10px] text-slate-400 ml-2">({ord.deliveryMethod})</span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => { setSelectedInvoiceOrder(ord); }}
                              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <Receipt className="w-3.5 h-3.5 text-slate-400" />
                              <span>Invoice</span>
                            </button>
                            {ord.status !== 'Delivered' && ord.status !== 'Cancelled' && (
                              <button
                                onClick={() => { setActiveOrderId(ord.id); setIsTrackerOpen(true); }}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                              >
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                                <span>Track Live</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* PROFILE TAB */}
              {dashboardTab === 'profile' && (
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                  {isProfileEditing ? (
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                      <div>
                        <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1">Full Name</label>
                        <input
                          type="text"
                          required
                          className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-slate-950 px-3.5 py-2.5 rounded-xl outline-none text-sm transition-all"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1">Phone Number</label>
                        <input
                          type="tel"
                          required
                          pattern="[6-9][0-9]{9}"
                          title="Enter a valid 10-digit mobile number"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-slate-950 px-3.5 py-2.5 rounded-xl outline-none text-sm transition-all"
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1">Default Delivery Address</label>
                        <textarea
                          rows="3"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-slate-950 px-3.5 py-2.5 rounded-xl outline-none text-sm transition-all"
                          placeholder="Your complete address..."
                          value={profileAddress}
                          onChange={(e) => setProfileAddress(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsProfileEditing(false)}
                          className="flex-1 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-sm transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
                        >
                          Save Profile
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Full Name</p>
                          <p className="text-sm font-semibold text-slate-800 mt-0.5">{profileName || '(Not set)'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Phone Number</p>
                          <p className="text-sm font-semibold text-slate-800 mt-0.5">{profilePhone || '(Not set)'}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Default Delivery Address</p>
                          <p className="text-sm font-semibold text-slate-800 mt-0.5 whitespace-pre-wrap bg-slate-50 border border-slate-100 p-3.5 rounded-xl leading-relaxed">{profileAddress || '(Not set)'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsProfileEditing(true)}
                        className="w-full py-2.5 border border-amber-200 hover:border-amber-300 text-amber-600 hover:bg-amber-50/50 font-bold rounded-xl text-sm transition-colors text-center shadow-sm"
                      >
                        Edit Profile Details
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Order Tracker Modal */}
      {isTrackerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsTrackerOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 text-center overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsTrackerOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            {activeOrder ? (
              <div className="space-y-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black rounded-full uppercase tracking-wider mb-2">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                    Live Tracking Active
                  </span>
                  <h3 className="font-display font-extrabold text-xl text-slate-900">Order Status Tracker</h3>
                  <p className="text-xs text-slate-400 mt-1">Order ID: <span className="font-mono font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md">{activeOrder.id}</span></p>
                </div>

                {/* Vertical Stepper representing status */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 max-w-sm mx-auto space-y-6 text-left">
                  {[
                    {
                      label: 'Order Received',
                      desc: 'Shop has received your order details',
                      icon: '📥',
                      active: true,
                      done: activeOrder.status === 'Order Received' || activeOrder.status === 'Getting Ready' || activeOrder.status === 'Delivered'
                    },
                    {
                      label: 'Getting Ready',
                      desc: 'Items are being packed and verified',
                      icon: '📦',
                      active: activeOrder.status === 'Getting Ready' || activeOrder.status === 'Delivered',
                      done: activeOrder.status === 'Getting Ready' || activeOrder.status === 'Delivered'
                    },
                    {
                      label: 'Delivered',
                      desc: activeOrder.deliveryMethod === 'Cash on Delivery' ? 'Our rider has delivered your order' : 'Your order is ready to collect at counter',
                      icon: activeOrder.deliveryMethod === 'Cash on Delivery' ? '🛵' : '✅',
                      active: activeOrder.status === 'Delivered',
                      done: activeOrder.status === 'Delivered'
                    }
                  ].map((step, idx) => {
                    const isCurrent = activeOrder.status === step.label;
                    return (
                      <div key={idx} className="flex gap-4 items-start relative last:pb-0">
                        {idx < 2 && (
                          <div className={`absolute left-5 top-10 bottom-0 w-0.5 -mt-2 -mb-6 ${
                            step.done && (idx === 0 ? (activeOrder.status === 'Getting Ready' || activeOrder.status === 'Delivered') : activeOrder.status === 'Delivered')
                              ? 'bg-emerald-500' : 'bg-slate-200'
                          }`} />
                        )}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 font-bold text-base shadow-sm z-10 transition-all ${
                          isCurrent ? 'bg-amber-500 border-amber-500 text-white ring-4 ring-amber-100 animate-pulse-subtle' :
                          step.done ? 'bg-emerald-500 border-emerald-500 text-white' :
                          'bg-white border-slate-200 text-slate-400'
                        }`}>
                          {step.done ? '✓' : step.icon}
                        </div>
                        <div className="space-y-0.5">
                          <p className={`text-sm font-bold ${isCurrent ? 'text-amber-600' : step.done ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {step.label}
                          </p>
                          <p className="text-[11px] text-slate-500 leading-tight">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {activeOrder.status === 'Cancelled' && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-bold flex items-center gap-2 text-left">
                    <span className="text-base">❌</span>
                    <span>This order has been cancelled by Satya General Store. Please contact the shop.</span>
                  </div>
                )}

                {/* Collection details summary */}
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Payment Mode:</span>
                    <span className="font-bold text-slate-800">{activeOrder.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">Method:</span>
                    <span className="font-bold text-slate-800">{activeOrder.deliveryMethod}</span>
                  </div>
                  {activeOrder.deliveryMethod === 'Cash on Delivery' && (
                    <div className="border-t border-slate-200/60 pt-2">
                      <span className="text-slate-400 font-semibold block mb-0.5">Delivery Address:</span>
                      <p className="font-bold text-slate-800 bg-white border border-slate-100 p-2.5 rounded-lg leading-tight">{activeOrder.customer.address}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setSelectedInvoiceOrder(activeOrder); }}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Receipt className="w-4 h-4 text-slate-400" />
                    <span>View Invoice</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsTrackerOpen(false);
                      if (activeOrder.status === 'Delivered' || activeOrder.status === 'Cancelled') {
                        localStorage.removeItem('satya_active_order_id');
                        setActiveOrderId(null);
                      }
                    }}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors shadow-sm shadow-amber-500/10"
                  >
                    Close Tracker
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-slate-400">
                <p>Loading order details...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {selectedInvoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:absolute print:inset-0 bg-slate-900/60 backdrop-blur-sm print:bg-white print:backdrop-blur-none">
          <div onClick={() => setSelectedInvoiceOrder(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden"></div>
          <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-100 shadow-2xl p-8 overflow-y-auto max-h-[90vh] print:max-h-full print:shadow-none print:border-0 print:rounded-none flex flex-col justify-between print-invoice-container">
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
                .print-invoice-container, .print-invoice-container * {
                  visibility: visible !important;
                }
                .print-invoice-container {
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
              <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50 p-4 rounded-2xl print:bg-slate-50/50">
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Billed To</p>
                  <p className="font-bold text-slate-800 text-sm mt-1">{selectedInvoiceOrder.customer.name}</p>
                  <p className="text-slate-600 mt-0.5">{selectedInvoiceOrder.customer.phone}</p>
                  {selectedInvoiceOrder.customer.email && (
                    <p className="text-slate-600">{selectedInvoiceOrder.customer.email}</p>
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Order Details</p>
                  <p className="font-semibold text-slate-800 mt-1">Method: {selectedInvoiceOrder.deliveryMethod}</p>
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
              <div className="flex justify-end pt-2">
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
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Track Order Button */}
      {activeOrderId && !isTrackerOpen && (
        <button
          onClick={() => setIsTrackerOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-3 rounded-full shadow-lg shadow-rose-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 duration-150 animate-bounce-subtle"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-100 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-200"></span>
          </span>
          <span className="text-xs">Track Active Order</span>
        </button>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:flex sm:justify-between sm:items-center">
          <div className="mb-4 sm:mb-0">
            <h4 className="text-white font-bold font-display text-lg">Satya General Store</h4>
            <p className="text-xs text-slate-500 mt-1">© {new Date().getFullYear()} Satya General Store. All rights reserved.</p>
          </div>
          <div className="flex justify-center gap-4 text-xs">
            <span className="text-slate-500">Browse · Order Online · Track Status</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">Walk-in & Home Delivery Store</span>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 left-6 z-40 w-11 h-11 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg shadow-amber-500/30 flex items-center justify-center transition-all duration-200 active:scale-95"
          aria-label="Back to top"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}