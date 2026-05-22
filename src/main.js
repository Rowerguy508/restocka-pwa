import { initState, saveState, clearState, state, supabase } from './utils/supabase.js'
import { renderLogin, renderDashboard, renderProducts, renderOrders, renderSettings } from './views/index.js'
import { showToast } from './utils/toast.js'
import { queueStockWrite } from './utils/offlineQueue.js'

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initState()
  
  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered')
    } catch (e) {
      console.log('SW registration failed:', e)
    }
  }
  
  await router()
})

// Simple router
async function router() {
  const app = document.getElementById('app')
  
  if (!state.user) {
    app.innerHTML = renderLogin()
    attachLoginListeners()
    return
  }
  
  renderLayout(app)
}

function renderLayout(app) {
  app.innerHTML = `
    <div class="main-layout">
      <header class="header">
        <div class="header-left">
          <button class="btn btn-secondary btn-small" id="logoutBtn">Salir</button>
          <div class="branch-badge" id="branchPicker">
            <span>📍</span>
            <span>${state.branch?.name || 'Seleccionar'}</span>
          </div>
        </div>
        <div class="role-toggle">
          <button class="${state.role === 'manager' ? 'active' : ''}" data-role="manager">Manager</button>
          <button class="${state.role === 'owner' ? 'active' : ''}" data-role="owner">Dueño</button>
        </div>
      </header>
      
      <main class="content" id="contentArea">
        ${getCurrentView()}
      </main>
      
      <nav class="tab-nav">
        <button class="tab-btn ${state.currentView === 'dashboard' ? 'active' : ''}" data-view="dashboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>Inicio</span>
        </button>
        <button class="tab-btn ${state.currentView === 'products' ? 'active' : ''}" data-view="products">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m-4-4l-8-4m16 4l-8-4m8 4l-8 4"/>
          </svg>
          <span>Productos</span>
        </button>
        <button class="tab-btn ${state.currentView === 'orders' ? 'active' : ''}" data-view="orders">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
          </svg>
          <span>Órdenes</span>
        </button>
        <button class="tab-btn ${state.currentView === 'settings' ? 'active' : ''}" data-view="settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v4m0 14v4M1 12h4m14 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
          </svg>
          <span>Ajustes</span>
        </button>
      </nav>
    </div>
  `
  
  attachLayoutListeners()
  loadCurrentViewData()
}

function getCurrentView() {
  switch (state.currentView) {
    case 'dashboard':
      return renderDashboard()
    case 'products':
      return renderProducts()
    case 'orders':
      return renderOrders()
    case 'settings':
      return renderSettings()
    default:
      return renderDashboard()
  }
}

async function loadCurrentViewData() {
  const content = document.getElementById('contentArea')
  
  switch (state.currentView) {
    case 'dashboard':
      await loadDashboard(content)
      break
    case 'products':
      await loadProducts(content)
      break
    case 'orders':
      await loadOrders(content)
      break
  }
}

async function loadDashboard(container) {
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>'
  
  try {
    const orgId = state.organization?.id
    
    // Get products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', orgId)
    
    if (productsError) throw productsError
    
    // Get stock levels
    const { data: stockLevels } = await supabase
      .from('stock_levels')
      .select('product_id, quantity')
      .eq('organization_id', orgId)
    
    // Compute stock map
    const stockMap = {}
    stockLevels?.forEach(sl => {
      if (!stockMap[sl.product_id]) stockMap[sl.product_id] = 0
      stockMap[sl.product_id] += sl.quantity || 0
    })
    
    const productsWithStock = products?.map(p => ({
      ...p,
      stock: stockMap[p.id] || 0
    }))
    
    console.log('Products (with stock):', productsWithStock)
    
    // Calculate low stock (stock below safety_min)
    const lowStock = productsWithStock?.filter(p => p.safety_min && p.safety_min > 0 && p.stock <= p.safety_min) || []
    const totalProducts = productsWithStock?.length || 0
    
    // Get orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*, suppliers(name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(5)
    
    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${totalProducts}</div>
          <div class="stat-label">Total Productos</div>
        </div>
        <div class="stat-card alert">
          <div class="stat-value">${lowStock.length}</div>
          <div class="stat-label">Stock Bajo</div>
        </div>
        <div class="stat-card success">
          <div class="stat-value">${orders?.filter(o => o.status === 'received').length || 0}</div>
          <div class="stat-label">Recibidas Hoy</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${orders?.filter(o => o.status === 'sent').length || 0}</div>
          <div class="stat-label">Pendientes</div>
        </div>
      </div>
      
      ${lowStock.length > 0 ? `
      <div class="reorder-section">
        <h3>⚠️ REORDENAR</h3>
        ${lowStock.map(p => `
          <div class="reorder-item" onclick="window.openReorderModal('${p.id}', '${p.name.replace(/'/g, "\\'")}', ${p.safety_min}, ${p.stock})">
            <span class="reorder-item-name">${p.name}</span>
            <span class="reorder-item-qty"> Stock: ${p.stock} / Min: ${p.safety_min}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}
      
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title">ÚLTIMAS ÓRDENES</span>
        </div>
        ${orders?.length ? `
          <div class="order-list">
            ${orders.map(o => `
              <div class="order-item">
                <div class="order-info">
                  <h4>#${o.id.slice(0, 8)}</h4>
                  <div class="order-meta">
                    <span>${new Date(o.created_at).toLocaleDateString('es-DO')}</span>
                    <span>•</span>
                    <span>${o.suppliers?.name || 'Sin proveedor'}</span>
                  </div>
                </div>
                <span class="order-status ${o.status}">${getStatusLabel(o.status)}</span>
              </div>
            `).join('')}
          </div>
        ` : '<div class="empty-state"><p>No hay órdenes recientes</p></div>'}
      </div>
    `
  } catch (err) {
    console.error('Dashboard error:', err)
    container.innerHTML = `<div class="empty-state"><p>Error cargando datos</p></div>`
  }
}

async function loadProducts(container) {
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>'
  
  try {
    const orgId = state.organization.id
    
    // Get products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', orgId)
      .eq('active', true)
      .order('name')
    
    if (productsError) throw productsError
    
    // Get locations
    const { data: locations } = await supabase
      .from('locations')
      .select('id, name')
      .eq('organization_id', orgId)
      .eq('archived', false)
    
    // Get stock levels
    const { data: stockLevels } = await supabase
      .from('stock_levels')
      .select('product_id, location_id, quantity')
      .eq('organization_id', orgId)
    
    // Build product map with stock data
    const stockMap = {}
    stockLevels?.forEach(sl => {
      if (!stockMap[sl.product_id]) stockMap[sl.product_id] = 0
      stockMap[sl.product_id] += sl.quantity || 0
    })
    
    const productsWithStock = products?.map(p => ({
      ...p,
      stock: stockMap[p.id] || 0
    }))
    
    state.products = productsWithStock || []
    
    container.innerHTML = `
      <input type="text" id="productSearch" placeholder="Buscar productos..." style="width: 100%; margin-bottom: 16px;">
      <div class="product-list" id="productList">
        ${renderProductList(state.products)}
      </div>
    `
    
    attachProductListeners()
  } catch (err) {
    console.error('Products error:', err)
    container.innerHTML = `<div class="empty-state"><p>Error cargando productos</p></div>`
  }
}

function renderProductList(products) {
  if (!products.length) {
    return '<div class="empty-state"><p>No hay productos</p></div>'
  }
  
  return products.map(p => `
    <div class="product-item ${(!p.stock || p.stock <= p.safety_min) ? 'low-stock' : ''}" data-id="${p.id}">
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-stock ${(!p.stock || p.stock <= p.safety_min) ? 'low' : ''}">Stock: ${p.stock || 0} / Mín: ${p.safety_min || 0}</div>
      </div>
      <div class="stock-controls">
        <button class="stock-btn" data-action="decrement" data-id="${p.id}">−</button>
        <span class="stock-val">${p.stock || 0}</span>
        <button class="stock-btn" data-action="increment" data-id="${p.id}">+</button>
      </div>
    </div>
  `).join('')
}

async function loadOrders(container) {
  // Read orders from localStorage (demo mode)
  const storedOrders = JSON.parse(localStorage.getItem('orders') || '[]')
  state.orders = storedOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  
  container.innerHTML = `
    <div class="card" style="margin-bottom: 16px;">
      <button class="btn btn-primary" id="newOrderBtn" style="width: 100%;">Nueva Orden</button>
    </div>
    <div class="order-list">
      ${state.orders.length ? state.orders.map(o => `
        <div class="order-item">
          <div class="order-info">
            <h4>#${o.id.slice(0, 8)}</h4>
            <div class="order-meta">
              <span>${new Date(o.created_at).toLocaleDateString('es-DO')}</span>
              <span>•</span>
              <span>${o.productName || 'Producto'}</span>
              <span>•</span>
              <span>Cant: ${o.quantity}</span>
            </div>
            ${o.notes ? `<div class="order-notes">${o.notes}</div>` : ''}
          </div>
          <span class="order-status ${o.status}">${getStatusLabel(o.status)}</span>
        </div>
      `).join('') : '<div class="empty-state"><p>No hay órdenes</p></div>'}
    </div>
  `
  
  document.getElementById('newOrderBtn')?.addEventListener('click', () => {
    showToast('Crea órdenes desde productos con stock bajo', 'info')
  })
}

function getStatusLabel(status) {
  const labels = {
    'draft': 'Borrador',
    'sent': 'Enviada',
    'received': 'Recibida'
  }
  return labels[status] || status
}

// Event Listeners
function attachLoginListeners() {
  const form = document.getElementById('loginForm')
  const email = document.getElementById('emailInput')
  const password = document.getElementById('passwordInput')
  
  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const btn = form.querySelector('button[type="submit"]')
    btn.disabled = true
    btn.textContent = 'Iniciando...'
    
    try {
      // Sign in via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value
      })
      
      if (authError) throw authError
      
      state.user = authData.user
      
      // Get organization from first product
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('organization_id')
        .limit(1)
      
      if (productsError || !products?.length) {
        // Try suppliers table
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('organization_id')
          .limit(1)
        
        if (suppliers?.length) {
          state.organization = { id: suppliers[0].organization_id }
        } else {
          throw new Error('No tienes acceso a ninguna organización')
        }
      } else {
        state.organization = { id: products[0].organization_id }
      }
      
      // Get branches/locations for this org
      const { data: locations } = await supabase
        .from('locations')
        .select('id, name')
        .eq('organization_id', state.organization.id)
        .eq('archived', false)
        .order('name')
      
      state.branches = locations || []
      
      // Set first branch as default if not set
      if (!state.branch && state.branches.length) {
        state.branch = { id: state.branches[0].id, name: state.branches[0].name }
      }
      
      saveState()
      await router()
      showToast('¡Bienvenido!', 'success')
    } catch (err) {
      console.error('Login error:', err)
      showToast(err.message || 'Error al iniciar sesión', 'error')
    } finally {
      btn.disabled = false
      btn.textContent = 'Entrar'
    }
  })
}

function attachLayoutListeners() {
  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut()
    clearState()
    await router()
  })
  
  // Role toggle
  document.querySelectorAll('.role-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      state.role = btn.dataset.role
      saveState()
      document.querySelectorAll('.role-toggle button').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
    })
  })
  
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentView = btn.dataset.view
      renderLayout(document.getElementById('app'))
    })
  })
  
  // Branch picker - show modal with branch list
  const picker = document.getElementById('branchPicker')
  picker?.addEventListener('click', () => {
    if (state.branches.length <= 1) {
      showToast('Solo tienes una sucursal', 'info')
      return
    }
    
    // Show branch picker modal
    const modal = document.createElement('div')
    modal.id = 'branchPickerModal'
    modal.className = 'modal-overlay'
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Seleccionar Sucursal</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          ${state.branches.map(b => `
            <button class="branch-option ${state.branch?.id === b.id ? 'active' : ''}" data-id="${b.id}" data-name="${b.name}">
              <span class="branch-name">${b.name}</span>
              ${state.branch?.id === b.id ? '<span class="checkmark">✓</span>' : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `
    
    document.body.appendChild(modal)
    
    // Close modal handler
    modal.querySelector('.modal-close')?.addEventListener('click', () => modal.remove())
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove()
    })
    
    // Branch selection handler
    modal.querySelectorAll('.branch-option').forEach(btn => {
      btn.addEventListener('click', () => {
        state.branch = { id: btn.dataset.id, name: btn.dataset.name }
        saveState()
        document.getElementById('branchPicker').querySelector('span:last-child').textContent = btn.dataset.name
        modal.remove()
        showToast(`Sucursal: ${btn.dataset.name}`, 'success')
        
        // Reload products with new branch stock
        if (state.currentView === 'products') {
          loadProducts(document.getElementById('contentArea'))
        } else if (state.currentView === 'dashboard') {
          loadDashboard(document.getElementById('contentArea'))
        }
      })
    })
  })
}

// Reorder Modal - open from low-stock items
window.openReorderModal = async function(productId, productName, safetyMin, currentStock) {
  const suggestedQty = Math.max(safetyMin * 2 - currentStock, safetyMin)
  
  const modal = document.createElement('div')
  modal.className = 'modal-overlay'
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">Ordenar: ${productName}</span>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Stock actual: <strong>${currentStock}</strong></label>
        </div>
        <div class="form-group">
          <label>Mínimo: <strong>${safetyMin}</strong></label>
        </div>
        <div class="form-group">
          <label>Cantidad a ordenar</label>
          <input type="number" id="orderQty" value="${suggestedQty}" min="1" class="form-input">
        </div>
        <div class="form-group">
          <label>Notas (opcional)</label>
          <textarea id="orderNotes" class="form-input" rows="2" placeholder="Ej: Urgente, para mañana..."></textarea>
        </div>
        <button class="btn btn-primary" id="submitOrderBtn" style="width: 100%; margin-top: 12px;">
          Crear Orden
        </button>
      </div>
    </div>
  `
  
  document.body.appendChild(modal)
  
  // Close handlers
  modal.querySelector('.modal-close')?.addEventListener('click', () => modal.remove())
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove()
  })
  
  // Submit order
  modal.querySelector('#submitOrderBtn')?.addEventListener('click', async () => {
    const qty = parseInt(modal.querySelector('#orderQty').value) || suggestedQty
    const notes = modal.querySelector('#orderNotes').value
    
    try {
      const orgId = state.organization?.id
      if (!orgId) {
        showToast('Error: organización no encontrada', 'error')
        return
      }
      
      // Submit order - store in localStorage (simple demo)
// Later: replace with actual orders table when schema ready
const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]')
const newOrder = {
  id: crypto.randomUUID(),
  product_id: productId,
  productName: productName,
  quantity: qty,
  notes: notes,
  status: 'draft',
  created_at: new Date().toISOString()
}
existingOrders.push(newOrder)
localStorage.setItem('orders', JSON.stringify(existingOrders))

showToast('Orden guardada (demo)', 'success')
modal.remove()
if (state.currentView === 'dashboard') {
  loadDashboard(document.getElementById('contentArea'))
}
    } catch (err) {
      console.error('Order error:', err)
      showToast('Error: ' + err.message, 'error')
    }
  })
}

function attachProductListeners() {
  const search = document.getElementById('productSearch')
  
  search?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase()
    const filtered = state.products.filter(p => 
      p.name.toLowerCase().includes(query)
    )
    document.getElementById('productList').innerHTML = renderProductList(filtered)
  })
  
  // Stock controls
  document.querySelectorAll('.stock-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const productId = btn.dataset.id
      const action = btn.dataset.action
      const product = state.products.find(p => p.id === productId)
      
      if (!product) return
      
      const change = action === 'increment' ? 1 : -1
      const newStock = Math.max(0, product.stock + change)
      
      // Optimistic update
      product.stock = newStock
      
      const item = document.querySelector(`.product-item[data-id="${productId}"]`)
      if (item) {
        item.querySelector('.stock-val').textContent = newStock
        item.querySelector('.product-stock').textContent = `Stock: ${newStock} / Mín: ${product.safety_min}`
        item.querySelector('.product-stock').className = `product-stock ${(!newStock || newStock <= product.safety_min) ? 'low' : ''}`
      }
      
      // Persist to stock_levels table
      try {
        const orgId = state.organization.id
        
        // Get first location if not set
        if (!state.branch?.id) {
          const { data: locs } = await supabase
            .from('locations')
            .select('id')
            .eq('organization_id', orgId)
            .limit(1)
          
          if (locs?.length) {
            state.branch = { id: locs[0].id }
          } else {
            throw new Error('No hay ubicación configurada')
          }
        }
        
        const locationId = state.branch.id
        
        // Check if stock level exists for this product+location
        const { data: existing } = await supabase
          .from('stock_levels')
          .select('id, quantity')
          .eq('organization_id', orgId)
          .eq('location_id', locationId)
          .eq('product_id', productId)
          .maybeSingle()
        
if (existing) {
          // Update existing
          await supabase
            .from('stock_levels')
            .update({ quantity: newStock, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
        } else {
          // Insert new
          await supabase
            .from('stock_levels')
            .insert({
              organization_id: orgId,
              location_id: locationId,
              product_id: productId,
              quantity: newStock
            })
        }

        showToast('Stock actualizado', 'success')
      } catch (err) {
        console.error('Stock update error:', err)
        
        // Queue for offline sync
        if (!navigator.onLine) {
          await queueStockWrite({
            orgId,
            locationId,
            productId,
            quantity: newStock
          })
          showToast('Guardado offline - se-sync cuando tengas conexión', 'success')
        } else {
          // Rollback
          product.stock = newStock - change
          showToast('Error guardando stock', 'error')
        }
      }
    })
  })
}