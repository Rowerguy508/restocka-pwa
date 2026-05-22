export function renderLogin() {
  return `
    <div class="login-screen">
      <div class="login-logo">
        <h1>🥗 ReStocka</h1>
        <p>Control de inventario móvil</p>
      </div>
      
      <form class="login-form" id="loginForm">
        <div class="input-group">
          <label>Correo electrónico</label>
          <input type="email" id="emailInput" placeholder="tu@email.com" required autocomplete="email">
        </div>
        
        <div class="input-group">
          <label>Contraseña</label>
          <input type="password" id="passwordInput" placeholder="••••••••" required autocomplete="current-password">
        </div>
        
        <button type="submit" class="btn btn-primary">Entrar</button>
      </form>
      
      <p style="text-align: center; font-size: 0.75rem; color: var(--text-muted);">
        ¿No tienes cuenta? <a href="https://app.restocka.app/register" style="color: var(--primary);">Regístrate</a>
      </p>
    </div>
    <div class="toast-container" id="toastContainer"></div>
  `
}

export function renderDashboard() {
  return `<div id="dashboardContent"><div class="loading"><div class="spinner"></div></div></div>`
}

export function renderProducts() {
  return `<div id="productsContent"><div class="loading"><div class="spinner"></div></div></div>`
}

export function renderOrders() {
  return `<div id="ordersContent"><div class="loading"><div class="spinner"></div></div></div>`
}

export function renderSettings() {
  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">CUENTA</span>
      </div>
      <div style="padding: 8px 0;">
        <p style="font-size: 0.875rem; color: var(--text-muted);">Correo:</p>
        <p style="margin-bottom: 16px;">${state.user?.email || '-'}</p>
        
        <p style="font-size: 0.875rem; color: var(--text-muted);">Organización:</p>
        <p>${state.organization?.name || '-'}</p>
      </div>
    </div>
    
    <div class="card">
      <div class="card-header">
        <span class="card-title">DATOS</span>
      </div>
      <button class="btn btn-secondary" id="exportDataBtn" style="width: 100%;">
        Exportar mis datos
      </button>
    </div>
    
    <div class="card">
      <button class="btn btn-danger" id="clearCacheBtn" style="width: 100%;">
        Cerrar sesión
      </button>
    </div>
    
    <p style="text-align: center; font-size: 0.75rem; color: var(--text-muted); margin-top: 24px;">
      ReStocka Móvil v1.0.0<br>
      © 2026 ReStocka
    </p>
  `
}