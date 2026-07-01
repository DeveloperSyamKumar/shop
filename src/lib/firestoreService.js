import { db } from './firebase';
import { SEED_ITEMS } from './seedData';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';

// ─── ITEMS ───────────────────────────────────────────────────────────────────

export const getItems = async () => {
  const q = query(collection(db, 'items'));
  const snapshot = await getDocs(q);
  const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Auto-seed Firestore if collection is empty (first-time setup)
  if (items.length === 0) {
    console.log('Firestore items empty — seeding defaults...');
    for (const item of SEED_ITEMS) {
      await setDoc(doc(db, 'items', item.id), item);
    }
    return SEED_ITEMS;
  }

  return items;
};

export const saveItem = async (item) => {
  await setDoc(doc(db, 'items', item.id), item);
  return item;
};

export const deleteItem = async (itemId) => {
  await deleteDoc(doc(db, 'items', itemId));
};

export const resetInventoryToDefault = async () => {
  // Read existing items to preserve custom imageUrls
  const snapshot = await getDocs(collection(db, 'items'));
  const existingImageMap = {};
  snapshot.docs.forEach(d => {
    const data = d.data();
    if (data.imageUrl) existingImageMap[d.id] = data.imageUrl;
  });

  // Delete all existing items
  for (const d of snapshot.docs) {
    await deleteDoc(doc(db, 'items', d.id));
  }

  // Re-seed defaults but keep any custom imageUrl that was previously set
  const seededItems = [];
  for (const item of SEED_ITEMS) {
    const mergedItem = {
      ...item,
      imageUrl: existingImageMap[item.id] || item.imageUrl
    };
    await setDoc(doc(db, 'items', item.id), mergedItem);
    seededItems.push(mergedItem);
  }
  return seededItems;
};

// ─── ORDERS ──────────────────────────────────────────────────────────────────

export const getOrders = async () => {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const createOrder = async (order) => {
  const newOrder = {
    ...order,
    id: order.id || `ORD-${Date.now()}`,
    createdAt: order.createdAt || new Date().toISOString(),
    status: order.status || 'Pending',
  };
  await setDoc(doc(db, 'orders', newOrder.id), newOrder);
  return newOrder;
};

export const updateOrderStatus = async (orderId, status) => {
  await setDoc(doc(db, 'orders', orderId), { status }, { merge: true });
};