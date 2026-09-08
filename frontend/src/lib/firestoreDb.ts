import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import type { 
  Product, 
  Invoice, 
  StoreActivity, 
  Warehouse, 
  Supplier, 
  Customer, 
  Category, 
  StockMovement 
} from '../types';

let dbInstance: Firestore | null = null;
let isInitialized = false;

/**
 * تهيئة الاتصال بقاعدة بيانات Firestore
 * تفحص تلقائياً متغيرات البيئة المعرفة على Vercel أو البيئة السحابية
 */
export function getFirestoreDb(): Firestore | null {
  if (isInitialized) {
    return dbInstance;
  }
  isInitialized = true;

  try {
    // 1. التحقق من وجود حساب خدمة ممرر كنص JSON
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountJson) {
      try {
        const parsed = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
        if (getApps().length === 0) {
          initializeApp({ credential: cert(parsed) });
        }
        dbInstance = getFirestore();
        console.log('[Firestore] Connected via FIREBASE_SERVICE_ACCOUNT JSON successfully.');
        return dbInstance;
      } catch (err) {
        console.error('[Firestore] Failed parsing FIREBASE_SERVICE_ACCOUNT JSON:', err);
      }
    }

    // 2. التحقق من المفاتيح الفردية (Project ID, Client Email, Private Key)
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      // معالجة الأسطر الجديدة في المفتاح الخاص (ضروري لـ Vercel)
      const formattedKey = privateKey.replace(/\\n/g, '\n');
      if (getApps().length === 0) {
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: formattedKey,
          }),
        });
      }
      dbInstance = getFirestore();
      console.log(`[Firestore] Connected via Service Account credentials for project "${projectId}".`);
      return dbInstance;
    }

    // 3. التحقق من معرف المشروع مع بيانات الاعتماد الافتراضية لـ Google Cloud
    if (projectId) {
      if (getApps().length === 0) {
        initializeApp({ projectId });
      }
      dbInstance = getFirestore();
      console.log(`[Firestore] Initialized with Project ID "${projectId}".`);
      return dbInstance;
    }

    console.log('[Firestore] No Firestore credentials found in environment variables. Falling back to in-memory state.');
    return null;
  } catch (error) {
    console.warn('[Firestore] Could not connect to Firestore, fallback to in-memory store:', error);
    dbInstance = null;
    return null;
  }
}

/**
 * مزامنة وجلب كافة المستندات من مجموعة معينة
 */
export async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const snapshot = await db.collection(collectionName).get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (err) {
    console.error(`[Firestore] Error fetching collection "${collectionName}":`, err);
    return [];
  }
}

/**
 * حفظ أو تحديث مستند في Firestore
 */
export async function setFirestoreDoc(collectionName: string, docId: string, data: any): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    await db.collection(collectionName).doc(docId).set(data, { merge: true });
    return true;
  } catch (err) {
    console.error(`[Firestore] Error writing doc "${docId}" to "${collectionName}":`, err);
    return false;
  }
}

/**
 * حذف مستند من Firestore
 */
export async function deleteFirestoreDoc(collectionName: string, docId: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    await db.collection(collectionName).doc(docId).delete();
    return true;
  } catch (err) {
    console.error(`[Firestore] Error deleting doc "${docId}" from "${collectionName}":`, err);
    return false;
  }
}

/**
 * مسح جميع مستندات مجموعة في Firestore
 */
export async function clearFirestoreCollection(collectionName: string): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    const snap = await db.collection(collectionName).get();
    if (snap.empty) return true;
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    return true;
  } catch (err) {
    console.error(`[Firestore] Error clearing collection "${collectionName}":`, err);
    return false;
  }
}

/**
 * تهيئة وبذر البيانات الأولية في Firestore إذا كانت المجموعات فارغة
 */
export async function seedInitialFirestoreData(initialData: {
  products: Product[];
  invoices: Invoice[];
  activities: StoreActivity[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
  customers: Customer[];
  categories: Category[];
  stockMovements: StockMovement[];
}) {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const prodsSnap = await db.collection('products').limit(1).get();
    if (prodsSnap.empty && initialData.products.length > 0) {
      console.log('[Firestore] Seeding initial data to Firestore collections...');
      const batch = db.batch();

      initialData.products.forEach(p => {
        batch.set(db.collection('products').doc(p.id), p);
      });
      initialData.invoices.forEach(inv => {
        batch.set(db.collection('invoices').doc(inv.id), inv);
      });
      initialData.warehouses.forEach(w => {
        batch.set(db.collection('warehouses').doc(w.id), w);
      });
      initialData.suppliers.forEach(s => {
        batch.set(db.collection('suppliers').doc(s.id), s);
      });
      initialData.customers.forEach(c => {
        batch.set(db.collection('customers').doc(c.id), c);
      });
      initialData.categories.forEach(cat => {
        batch.set(db.collection('categories').doc(cat.id), cat);
      });
      initialData.stockMovements.forEach(m => {
        batch.set(db.collection('stock_movements').doc(m.id), m);
      });
      initialData.activities.forEach(a => {
        batch.set(db.collection('activities').doc(a.id), a);
      });

      await batch.commit();
      console.log('[Firestore] Initial data successfully seeded into Firestore.');
    }
  } catch (err) {
    console.error('[Firestore] Failed seeding data to Firestore:', err);
  }
}
