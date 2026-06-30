import { useState, useEffect, useRef } from 'react';
import { getItems, createOrder } from '../lib/firestoreService';
import { isMock } from '../lib/firebase';
import { SEED_ITEMS } from '../lib/seedData';
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
  Clock
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Items');
  
  // Cart State: array of { product, variant, quantity }
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrderSuccess, setIsOrderSuccess] = useState(false);
  
  // Product variant selections (productId -> variantIndex)
  const [selectedVariants, setSelectedVariants] = useState({});

  // Checkout form details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash at Counter');
  const [notes, setNotes] = useState('');

  // Back-to-top visibility
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch items — load seed data instantly, then refresh from Firebase in background
  useEffect(() => {
    // Helper to init variant selections
    const initVariants = (data) => {
      const initialVariants = {};
      data.forEach(item => { initialVariants[item.id] = 0; });
      return initialVariants;
    };

    // Show seed data immediately so the page never buffers
    setItems(SEED_ITEMS);
    setSelectedVariants(initVariants(SEED_ITEMS));
    setLoading(false);

    // Then try to fetch live data from Firebase with a 4s timeout
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firebase timeout')), 4000)
    );

    Promise.race([getItems(), timeout])
      .then(data => {
        if (data && data.length > 0) {
          setItems(data);
          setSelectedVariants(initVariants(data));
        }
      })
      .catch(err => {
        console.warn("Firebase fetch skipped, using seed data:", err.message);
      });
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

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const orderTotal = getCartTotal();
    const orderItems = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      volume: item.variant.volume,
      price: item.variant.price,
      quantity: item.quantity
    }));

    const orderData = {
      customer: {
        name: customerName,
        phone: customerPhone
      },
      items: orderItems,
      total: orderTotal,
      paymentMethod,
      notes,
      createdAt: new Date().toISOString(),
      status: 'Pending'
    };

    try {
      // Save order to Firestore / Local Storage
      const savedOrder = await createOrder(orderData);

      // Construct WhatsApp Order Message
      let message = `🛍️ *WALK-IN ORDER – Satya General Store*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `*Order ID:* ${savedOrder.id}\n`;
      message += `*Name:* ${customerName}\n`;
      message += `*Phone:* ${customerPhone}\n`;
      message += `*Payment:* ${paymentMethod}\n`;
      if (notes) message += `*Notes:* ${notes}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `*Items:*\n`;
      
      cart.forEach((item, index) => {
        const itemSubtotal = item.variant.price * item.quantity;
        message += `${index + 1}. ${item.product.name} (${item.variant.volume}) × ${item.quantity} = *₹${itemSubtotal}*\n`;
      });
      
      message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `*TOTAL: ₹${orderTotal}*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `I'm at your shop. Please pack my items, I'll collect at the counter. 🙏`;

      const encodedText = encodeURIComponent(message);
      // Satya General Store WhatsApp number (can configure in admin, default is a fallback number)
      const shopWhatsApp = localStorage.getItem('satya_shop_whatsapp') || '919603655683';
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${shopWhatsApp}&text=${encodedText}`;

      // Open WhatsApp in new tab
      window.open(whatsappUrl, '_blank');

      // Clear state
      setCart([]);
      setIsCheckoutOpen(false);
      setIsOrderSuccess(true);
      
      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');

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
      {/* Top Banner Warning if local storage mode */}
      {isMock && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-center text-sm font-semibold flex items-center justify-center gap-2 shadow-inner">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Demo Mode active: Firestore connection is offline. Orders and products will be saved locally.</span>
        </div>
      )}

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
              { step: "2", icon: "💬", title: "WhatsApp", desc: "Send your list to the store" },
              { step: "3", icon: "✅", title: "Collect", desc: "Pick up your items at the counter" }
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
              Browse. Send on <span className="text-emerald-600">WhatsApp.</span><br className="hidden sm:inline" />
              <span className="text-amber-500">Collect at Counter.</span>
            </h2>
            <p className="mt-3 text-base text-slate-500 max-w-lg">
              You're here at Satya General Store! Pick the items you need, add them to your cart, and tap <strong>"Send on WhatsApp"</strong> — the store will pack your order and it'll be ready at the counter.
            </p>
          </div>

          {/* Store Info Card */}
          <div className="mt-8 sm:mt-0 max-w-sm w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-xl space-y-3">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Store Info
            </h3>
            <a
              href={`https://wa.me/919603655683`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 p-3 rounded-xl transition-colors duration-150 group"
            >
              <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.964 9.964 0 001.333 4.993L2 22l5.233-1.371a9.945 9.945 0 004.777 1.21h.005c5.505 0 9.99-4.478 9.99-9.986 0-2.67-1.037-5.178-2.924-7.066A9.919 9.919 0 0012.012 2z"/></svg>
              </div>
              <div>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">WhatsApp / Call</p>
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
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-8">
        
        {/* Mobile: Horizontal Category Pill Bar */}
        <div className="md:hidden -mx-4 px-4 overflow-x-auto pb-2">
          <div className="flex gap-2 w-max">
            {CATEGORIES.map(category => {
              const count = category === 'All Items' ? items.length : items.filter(i => i.category === category).length;
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 border ${
                    isActive
                      ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-700'
                  }`}
                >
                  {category}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop: Sidebar Categories */}
        <aside className="hidden md:block w-64 shrink-0">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm sticky top-28">
            <h3 className="font-bold text-slate-950 mb-3 px-1 font-display">Categories</h3>
            <nav className="space-y-1">
              {CATEGORIES.map(category => {
                const count = category === 'All Items' ? items.length : items.filter(i => i.category === category).length;
                const isActive = selectedCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-between ${
                      isActive
                        ? 'bg-amber-500 text-white font-semibold shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <span>{category}</span>
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>{count}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Catalog Section */}
        <div className="flex-grow space-y-5">
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
              <p className="font-medium">Loading Satya General Store's inventory...</p>
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
                    <div className={`relative h-44 overflow-hidden bg-gradient-to-br ${gradient} shrink-0`}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/40 text-5xl font-black">
                          {item.name.charAt(0)}
                        </div>
                      )}
                      {/* Bottom image fade */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
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
                      <button
                        onClick={() => addToCart(item)}
                        className="flex-1 max-w-[110px] px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/25 active:scale-95 transition-all duration-150"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Cart Button for Mobile */}
      {getCartCount() > 0 && !isCartOpen && (
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
                            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-100"
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
                        className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-colors duration-150"
                      >
                        <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.964 9.964 0 001.333 4.993L2 22l5.233-1.371a9.945 9.945 0 004.777 1.21h.005c5.505 0 9.99-4.478 9.99-9.986 0-2.67-1.037-5.178-2.924-7.066A9.919 9.919 0 0012.012 2z"/></svg>
                        <span>Send on WhatsApp</span>
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
              <span>💬 Send Order on WhatsApp</span>
            </h3>
            <p className="text-slate-500 text-xs mb-5">Tell the store who you are. Your item list will be sent on WhatsApp — just show this message and collect at the counter!</p>
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-5">
              <span className="text-amber-500 text-base">📍</span>
              <p className="text-amber-800 text-xs font-semibold">Walk-in Pickup — Collect your items at the counter</p>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1">
                    Payment at Counter
                  </label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-slate-950 px-3.5 py-2.5 rounded-xl outline-none text-sm transition-all duration-150"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Cash at Counter">Cash at Counter</option>
                    <option value="UPI at Counter">UPI at Counter</option>
                  </select>
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
                <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between text-sm font-extrabold text-slate-950">
                  <span>Grand Total</span>
                  <span>₹{getCartTotal()}</span>
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
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all duration-150"
                >
                  <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.964 9.964 0 001.333 4.993L2 22l5.233-1.371a9.945 9.945 0 004.777 1.21h.005c5.505 0 9.99-4.478 9.99-9.986 0-2.67-1.037-5.178-2.924-7.066A9.919 9.919 0 0012.012 2zm5.71 14.159c-.25.705-1.485 1.34-2.044 1.43-.509.083-1.176.101-1.892-.128a10.297 10.297 0 01-4.225-2.73 11.332 11.332 0 01-2.923-4.52c-.328-.865-.333-1.662-.1-2.072.23-.404.722-.509.972-.509.25 0 .5-.005.717.009.227.014.526-.086.818.618.3.722 1.022 2.49 1.109 2.668.088.177.147.382.029.614-.117.23-.254.382-.397.55-.142.167-.3.35-.429.477-.142.14-.29.294-.125.578.165.284.733 1.209 1.572 1.958.839.749 1.543 1.035 1.892 1.226.35.191.554.162.76-.08.206-.24.878-1.02 1.113-1.371.236-.352.47-.294.79-.176.324.118 2.059 1.01 2.441 1.201.382.191.637.284.73.446.093.162.093.935-.157 1.64z"/>
                  </svg>
                  <span>Order on WhatsApp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Success Dialog */}
      {isOrderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setIsOrderSuccess(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          ></div>
          <div className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 text-center space-y-3">
            <div className="text-5xl">✅</div>
            <h3 className="font-display font-bold text-xl text-slate-900">Order Sent on WhatsApp!</h3>
            <p className="text-slate-500 text-sm">
              Your item list has been sent to Satya General Store on WhatsApp. Head to the counter — your order will be ready for pickup!
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs font-semibold flex items-center gap-2">
              <span>📍</span> Collect your items at the counter
            </div>
            <button
              onClick={() => setIsOrderSuccess(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors duration-150"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 mt-auto border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:flex sm:justify-between sm:items-center">
          <div className="mb-4 sm:mb-0">
            <h4 className="text-white font-bold font-display text-lg">Satya General Store</h4>
            <p className="text-xs text-slate-500 mt-1">© {new Date().getFullYear()} Satya General Store. All rights reserved.</p>
          </div>
          <div className="flex justify-center gap-4 text-xs">
            <span className="text-slate-500">Browse · WhatsApp · Collect</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">Walk-in Takeaway Store</span>
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