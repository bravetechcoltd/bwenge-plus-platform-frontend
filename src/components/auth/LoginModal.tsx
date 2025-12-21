// components/auth/LoginModal.tsx
"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { X, Mail, Lock, Eye, EyeOff, Loader2, Shield } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import type { AppDispatch } from '@/lib/store'
import { loginBwenge, loginWithGoogle } from '@/lib/features/auth/auth-slice'
import { toast } from 'sonner'
import Link from 'next/link'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  redirectTo: string
  message?: string
}

export function LoginModal({ isOpen, onClose, redirectTo, message }: LoginModalProps) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      toast.error('Google login failed - no credential received')
      return
    }

    setIsLoading(true)
    
    try {
      const result = await dispatch(loginWithGoogle(credentialResponse.credential)).unwrap()
      
      toast.success(`Welcome ${result.user.first_name}!`)
      
      // Close modal and redirect to course
      onClose()
      
      // Small delay to ensure state updates
      setTimeout(() => {
        router.push(redirectTo)
      }, 300)
      
    } catch (error: any) {
      console.error('Google login failed:', error)
      toast.error(error || 'Google login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleError = () => {
    toast.error('Google login failed. Please try again.')
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsLoading(true)
    
    try {
      const result = await dispatch(loginBwenge(formData)).unwrap()
      
      toast.success(`Welcome back, ${result.user.first_name}!`)
      
      onClose()
      
      setTimeout(() => {
        router.push(redirectTo)
      }, 300)
      
    } catch (error: any) {
      toast.error(error || 'Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - Higher z-index to cover everything */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
          />

          {/* Modal - Centered with proper spacing and higher z-index */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header with top padding */}
              <div className="relative p-8 pb-4 border-b border-gray-200">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Shield className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
                    <p className="text-sm text-gray-600">
                      {message || "Sign in to continue"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body with proper vertical spacing */}
              <div className="p-8 pt-4 space-y-6">
                {/* Google Login */}
                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-700 text-center">
                    Continue with
                  </p>
                  <div className="flex justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      type="standard"
                      theme="outline"
                      size="large"
                      text="continue_with"
                      shape="rectangular"
                      logo_alignment="left"
                      width="280"
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-4 bg-white text-gray-500">OR</span>
                  </div>
                </div>

                {/* Email Login Form */}
                <form onSubmit={handleEmailLogin} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="your@email.com"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="••••••••"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Link
                      href="/forgot-password"
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign in with Email'
                    )}
                  </button>
                </form>

                {/* Register Link */}
                <p className="text-center text-sm text-gray-600 pt-2">
                  Don't have an account?{' '}
                  <Link
                    href={`/register?redirect=${encodeURIComponent(redirectTo)}`}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    onClick={onClose}
                  >
                    Sign up
                  </Link>
                </p>
              </div>

              {/* Footer with bottom padding */}
              <div className="p-8 pt-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
                <p className="text-xs text-gray-500 text-center">
                  By signing in, you agree to our{' '}
                  <Link href="/terms" className="text-blue-600 hover:underline">Terms</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}