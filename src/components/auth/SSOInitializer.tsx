import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Check, X } from 'lucide-react';

interface SSOInitializerProps {
  ssoToken: string;
  onComplete: () => void;
  onSkip?: () => void;
}

export default function SSOInitializer({ ssoToken, onComplete, onSkip }: SSOInitializerProps) {
  const [status, setStatus] = useState<'initializing' | 'success' | 'error'>('initializing');
  const [message, setMessage] = useState('Preparing access to BwengePlus...');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const initializeSSO = async () => {
      try {
        setMessage('Connecting to BwengePlus...');
        
        // Create hidden iframe to silently authenticate with BwengePlus
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = `${process.env.NEXT_PUBLIC_BWENGE_PLUS_URL}/sso/consume?token=${ssoToken}`;
        
        document.body.appendChild(iframe);

        // Wait for iframe to load
        await new Promise((resolve) => {
          iframe.onload = resolve;
          // Timeout after 5 seconds
          setTimeout(resolve, 5000);
        });

        setStatus('success');
        setMessage('✓ BwengePlus access enabled!');

        // Cleanup iframe after 3 seconds
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 3000);

      } catch (error) {
        console.error('SSO initialization failed:', error);
        setStatus('error');
        setMessage('Failed to connect to BwengePlus');
      }
    };

    initializeSSO();
  }, [ssoToken]);

  // Countdown timer
  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (status === 'success' && countdown === 0) {
      onComplete();
    }
  }, [status, countdown, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Status Icon */}
          <div className="relative">
            {status === 'initializing' && (
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            )}
            
            {status === 'success' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center"
              >
                <Check className="w-8 h-8 text-green-600" />
              </motion.div>
            )}
            
            {status === 'error' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center"
              >
                <X className="w-8 h-8 text-red-600" />
              </motion.div>
            )}
          </div>

          {/* Message */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {status === 'initializing' && 'Setting up SSO'}
              {status === 'success' && 'Success!'}
              {status === 'error' && 'Connection Failed'}
            </h3>
            <p className="text-sm text-gray-600">{message}</p>
          </div>

          {/* Progress Info */}
          {status === 'success' && (
            <div className="text-sm text-gray-500">
              Redirecting in {countdown} seconds...
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 w-full">
            {status === 'initializing' && onSkip && (
              <button
                onClick={onSkip}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Skip for now
              </button>
            )}
            
            {status === 'error' && (
              <>
                <button
                  onClick={onSkip || onComplete}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </>
            )}

            {status === 'success' && (
              <button
                onClick={onComplete}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue to Dashboard
              </button>
            )}
          </div>

          {/* Info */}
          <p className="text-xs text-gray-500 mt-4">
            🔒 Secure single sign-on connection
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}