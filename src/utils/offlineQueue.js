// Offline queue for stock writes
import { openDB } from 'idb'

const DB_NAME = 'restocka-offline'
const STORE_NAME = 'pending-writes'

// Open IndexedDB
async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

// Queue a stock write for later
export async function queueStockWrite(data) {
  const db = await getDB()
  await db.add(STORE_NAME, {
    ...data,
    timestamp: Date.now()
  })
  
  // Try to sync immediately if online
  if (navigator.onLine) {
    await flushQueue()
  }
}

// Flush queued writes to server
export async function flushQueue() {
  if (!navigator.onLine) return
  
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  const all = await store.getAll()
  
  for (const item of all) {
    try {
      await syncWrite(item)
      await store.delete(item.id)
    } catch (e) {
      console.log('Sync failed, keeping for retry:', e)
      break // Stop on first failure
    }
  }
}

// Sync single write to Supabase
async function syncWrite(item) {
  const { supabase } = await import('../utils/supabase.js')
  
  await supabase.from('stock_levels').upsert({
    organization_id: item.orgId,
    location_id: item.locationId,
    product_id: item.productId,
    quantity: item.quantity,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'organization_id,location_id,product_id'
  })
}

// Listen for online event
if (typeof window !== 'undefined') {
  window.addEventListener('online', flushQueue)
}

// Init: flush on page load if online
if (typeof window !== 'undefined' && navigator.onLine) {
  flushQueue()
}