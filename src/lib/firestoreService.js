import { db, isMock } from './firebase';
import { SEED_ITEMS } from './seedData';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';

// Helper for local storage
const getLocalData = (key, defaultVal) => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  try {
    const parsed = JSON.parse(data);
    // Sanity check to protect against stale/corrupt localStorage data from previous runs
    if (key === 'satya_items') {
      if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].variants || !parsed[0].id || !parsed[0].imageUrl) {
        console.warn("Invalid or outdated localStorage format for satya_items. Re-seeding database.");
        localStorage.setItem(key, JSON.stringify(defaultVal));
        return defaultVal;
      }
    }
    if (key === 'satya_orders') {
      if (!Array.isArray(parsed)) {
        localStorage.setItem(key, JSON.stringify([]));
        return [];
      }
    }
    return parsed;
  } catch (e) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
};

const setLocalData = (key, val) => {
  localStorage.setItem(key, JSON.stringify(val));
};

// GET ITEMS
export const getItems = async () => {
  if (isMock) {
    return getLocalData('satya_items', SEED_ITEMS);
  }
  try {
    const q = query(collection(db, 'items'));
    const querySnapshot = await getDocs(q);
    const items = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });
    // If empty in database, seed it initially
    if (items.length === 0) {
      console.log("Firestore empty. Seeding initial items...");
      for (const item of SEED_ITEMS) {
        await setDoc(doc(db, 'items', item.id), item);
        items.push(item);
      }
    }
    return items;
  } catch (error) {
    console.error("Error fetching items from Firestore:", error);
    return getLocalData('satya_items', SEED_ITEMS);
  }
};

// SAVE ITEM (Add or Update)
export const saveItem = async (item) => {
  const saveToLocal = () => {
    const items = getLocalData('satya_items', SEED_ITEMS);
    const existingIndex = items.findIndex(i => i.id === item.id);
    if (existingIndex > -1) {
      items[existingIndex] = item;
    } else {
      items.push(item);
    }
    setLocalData('satya_items', items);
    return item;
  };

  if (isMock) return saveToLocal();

  try {
    const timeout = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 4000));
    const docRef = doc(db, 'items', item.id);
    await Promise.race([setDoc(docRef, item), timeout]);
    // Also update localStorage as a local cache
    saveToLocal();
    return item;
  } catch (error) {
    console.warn("Firestore save failed/timed out. Falling back to localStorage:", error.message);
    return saveToLocal();
  }
};

// DELETE ITEM
export const deleteItem = async (itemId) => {
  const deleteFromLocal = () => {
    const items = getLocalData('satya_items', SEED_ITEMS);
    const updated = items.filter(i => i.id !== itemId);
    setLocalData('satya_items', updated);
  };

  if (isMock) { deleteFromLocal(); return; }

  try {
    const timeout = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 4000));
    await Promise.race([deleteDoc(doc(db, 'items', itemId)), timeout]);
    deleteFromLocal();
  } catch (error) {
    console.warn("Firestore delete failed/timed out. Falling back to localStorage:", error.message);
    deleteFromLocal();
  }
};

// RESET INVENTORY TO DEFAULT
export const resetInventoryToDefault = async () => {
  const resetLocal = () => {
    setLocalData('satya_items', SEED_ITEMS);
    return SEED_ITEMS;
  };

  if (isMock) return resetLocal();

  try {
    const timeout = (ms) => new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms));
    // Delete existing
    const querySnapshot = await Promise.race([getDocs(collection(db, 'items')), timeout(4000)]);
    for (const d of querySnapshot.docs) {
      await Promise.race([deleteDoc(doc(db, 'items', d.id)), timeout(4000)]);
    }
    // Seed
    for (const item of SEED_ITEMS) {
      await Promise.race([setDoc(doc(db, 'items', item.id), item), timeout(4000)]);
    }
    return resetLocal();
  } catch (error) {
    console.warn("Firestore reset failed/timed out. Falling back to localStorage:", error.message);
    return resetLocal();
  }
};

// GET ORDERS
export const getOrders = async () => {
  if (isMock) {
    return getLocalData('satya_orders', []);
  }
  try {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    return orders;
  } catch (error) {
    console.error("Error fetching orders from Firestore:", error);
    return getLocalData('satya_orders', []);
  }
};

// CREATE ORDER
export const createOrder = async (order) => {
  const newOrder = {
    ...order,
    id: order.id || `ORD-${Date.now()}`,
    createdAt: order.createdAt || new Date().toISOString(),
    status: order.status || 'Pending'
  };

  if (isMock) {
    const orders = getLocalData('satya_orders', []);
    orders.unshift(newOrder);
    setLocalData('satya_orders', orders);
    return newOrder;
  }
  try {
    await setDoc(doc(db, 'orders', newOrder.id), newOrder);
    return newOrder;
  } catch (error) {
    console.error("Error creating order in Firestore:", error);
    throw error;
  }
};

// UPDATE ORDER STATUS
export const updateOrderStatus = async (orderId, status) => {
  if (isMock) {
    const orders = getLocalData('satya_orders', []);
    const existingIndex = orders.findIndex(o => o.id === orderId);
    if (existingIndex > -1) {
      orders[existingIndex].status = status;
      setLocalData('satya_orders', orders);
    }
    return;
  }
  try {
    const docRef = doc(db, 'orders', orderId);
    await setDoc(docRef, { status }, { merge: true });
  } catch (error) {
    console.error("Error updating order status in Firestore:", error);
    throw error;
  }
};