import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zsewmpjceuomivvbyjgl.supabase.co'
const supabaseAnonKey = 'sb_publishable_-JoQKR7J7MojOUyWrQs07g_v4pdu8se'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// App state
export const state = {
  user: null,
  organization: null,
  branch: null,
  branches: [],
  products: [],
  orders: [],
  role: 'manager', // 'owner' | 'manager'
  currentView: 'dashboard',
  loading: false
}

// Initialize from localStorage
export function initState() {
  const saved = localStorage.getItem('restocka_state')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      Object.assign(state, parsed)
    } catch (e) {
      console.error('Failed to load state:', e)
    }
  }
}

// Save to localStorage
export function saveState() {
  localStorage.setItem('restocka_state', JSON.stringify({
    user: state.user,
    organization: state.organization,
    branch: state.branch,
    branches: state.branches,
    role: state.role
  }))
}

// Clear state (logout)
export function clearState() {
  localStorage.removeItem('restocka_state')
  Object.assign(state, {
    user: null,
    organization: null,
    branch: null,
    branches: [],
    products: [],
    orders: []
  })
}