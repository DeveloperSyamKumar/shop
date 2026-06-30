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
  if (isMock) {
    const items = getLocalData('satya_items', SEED_ITEMS);
    const existingIndex = items.findIndex(i => i.id === item.id);
    if (existingIndex > -1) {
      items[existingIndex] = item;
    } else {
      items.push(item);
    }
    setLocalData('satya_items', items);
    return item;
  }
  try {
    const docRef = doc(db, 'items', item.id);
    await setDoc(docRef, item);
    return item;
  } catch (error) {
    console.error("Error saving item to Firestore:", error);
    throw error;
  }
};

// DELETE ITEM
export const deleteItem = async (itemId) => {
  if (isMock) {
    const items = getLocalData('satya_items', SEED_ITEMS);
    const updated = items.filter(i => i.id !== itemId);
    setLocalData('satya_items', updated);
    return;
  }
  try {
    await deleteDoc(doc(db, 'items', itemId));
  } catch (error) {
    console.error("Error deleting item from Firestore:", error);
    throw error;
  }
};

// RESET INVENTORY TO DEFAULT
export const resetInventoryToDefault = async () => {
  if (isMock) {
    setLocalData('satya_items', SEED_ITEMS);
    return SEED_ITEMS;
  }
  try {
    // Delete existing
    const querySnapshot = await getDocs(collection(db, 'items'));
    for (const d of querySnapshot.docs) {
      await deleteDoc(doc(db, 'items', d.id));
    }
    // Seed
    for (const item of SEED_ITEMS) {
      await setDoc(doc(db, 'items', item.id), item);
    }
    return SEED_ITEMS;
  } catch (error) {
    console.error("Error resetting inventory in Firestore:", error);
    throw error;
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