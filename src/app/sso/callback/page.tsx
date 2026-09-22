
"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { consumeSSOToken } from '@/lib/features/auth/auth-slice'
import { Loader2, Check, X } from 'lucide-react'
import { motion } from 'framer-motion'

export default function SSOCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useDispatch()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your account...')

  useEffect(() => {
    const handleSSO = async () => {
      const ssoStatus = searchParams.get('sso')
      const error = searchParams.get('error')

      if (error) {
        setStatus('error')
        setMessage(getErrorMessage(error))
        setTimeout(() => {
          router.push(`/login?error=${error}`)
        }, 3000)
        return
      }

      if (ssoStatus === 'success') {
        setStatus('success')
        setMessage('Welcome to BwengePlus!')
        
        // Consume token to update Redux state
        try {
          await dispatch(consumeSSOToken('') as any).unwrap()
          
          setTimeout(() => {
            router.push('/dashboard/learner')
          }, 2000)
        } catch (err) {
          setStatus('error')
          setMessage('Failed to initialize session')
          setTimeout(() => {
            router.push('/login?error=sso_failed')
          }, 3000)
        }
      } else {
        // No status - still processing
        setTimeout(() => {
          if (status === 'loading') {
            setStatus('error')
            setMessage('SSO verification timeout')
            router.push('/login?error=timeout')
          }
        }, 10000)
      }
    }

    handleSSO()
  }, [searchParams, dispatch, router, status])

  const getErrorMessage = (errorCode: string) => {
    const messages: Record<string, string> = {
      'missing_token': 'SSO token is missing',
      'invalid_token': 'SSO token is invalid or expired',
      'validation_failed': 'Failed to validate with Ongera',
      'user_not_found': 'User account not found',
      'sso_failed': 'SSO authentication failed',
      'timeout': 'SSO verification timeout'
    }
    return messages[errorCode] || 'SSO authentication failed'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-xl shadow-xl p-8 max-w-md w-full text-center"
      >
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Verifying SSO</h2>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Check className="w-8 h-8 text-success" />
            </motion.div>
            <h2 className="text-xl font-bold text-foreground mb-2">Success!</h2>
            <p className="text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground mt-2">Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 bg-destructive/15 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <X className="w-8 h-8 text-destructive" />
            </motion.div>
            <h2 className="text-xl font-bold text-foreground mb-2">SSO Failed</h2>
            <p className="text-muted-foreground">{message}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary"
            >
              Back to Login
            </button>
          </>
        )}
      </motion.div>
    </div>
  )
}