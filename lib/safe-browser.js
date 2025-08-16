// Safe localStorage access with error handling
export const safeLocalStorage = {
  getItem: (key) => {
    try {
      if (typeof window === 'undefined') return null
      return localStorage.getItem(key)
    } catch (error) {
      console.warn('localStorage.getItem error:', error)
      return null
    }
  },
  
  setItem: (key, value) => {
    try {
      if (typeof window === 'undefined') return false
      localStorage.setItem(key, value)
      return true
    } catch (error) {
      console.warn('localStorage.setItem error:', error)
      return false
    }
  },
  
  removeItem: (key) => {
    try {
      if (typeof window === 'undefined') return false
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.warn('localStorage.removeItem error:', error)
      return false
    }
  }
}

// Safe window/document access
export const safeWindow = {
  addEventListener: (event, handler) => {
    try {
      if (typeof window !== 'undefined') {
        window.addEventListener(event, handler)
        return true
      }
    } catch (error) {
      console.warn('window.addEventListener error:', error)
    }
    return false
  },
  
  removeEventListener: (event, handler) => {
    try {
      if (typeof window !== 'undefined') {
        window.removeEventListener(event, handler)
        return true
      }
    } catch (error) {
      console.warn('window.removeEventListener error:', error)
    }
    return false
  },
  
  dispatchEvent: (event) => {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(event)
        return true
      }
    } catch (error) {
      console.warn('window.dispatchEvent error:', error)
    }
    return false
  }
}
