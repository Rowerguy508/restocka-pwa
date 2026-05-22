let toastTimeout = null

export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer')
  if (!container) return
  
  // Clear existing toast
  if (toastTimeout) {
    clearTimeout(toastTimeout)
    container.innerHTML = ''
  }
  
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.textContent = message
  
  container.appendChild(toast)
  
  toastTimeout = setTimeout(() => {
    container.innerHTML = ''
    toastTimeout = null
  }, 3000)
}