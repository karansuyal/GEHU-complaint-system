import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('gehu_user')
    const token = localStorage.getItem('gehu_token')
    if (stored && token) {
      setUser(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    localStorage.setItem('gehu_token', data.access_token)
    localStorage.setItem('gehu_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const startSession = (data) => {
    localStorage.setItem('gehu_token', data.access_token)
    localStorage.setItem('gehu_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  // With email verification on, registering does NOT log you in: the response
  // is { requires_verification: true, email } and the user finishes on the
  // verify screen. With it off, the response carries a token like before.
  const register = async (payload) => {
    const { data } = await authAPI.register(payload)
    if (data.requires_verification) return { requiresVerification: true, email: data.email }
    return { requiresVerification: false, user: startSession(data) }
  }

  const verifyEmail = async (email, otp) => {
    const { data } = await authAPI.verifyEmail({ email, otp })
    return startSession(data)
  }

  const logout = () => {
    localStorage.removeItem('gehu_token')
    localStorage.removeItem('gehu_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyEmail, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
