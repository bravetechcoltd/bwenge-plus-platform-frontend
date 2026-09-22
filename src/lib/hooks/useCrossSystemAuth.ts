import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { checkOngeraSession, logoutBwenge } from '@/lib/features/auth/auth-slice';
import type { AppDispatch, RootState } from '@/lib/store';
import { toast } from 'sonner';

export function useCrossSystemAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, ssoInitialized, hasOngeraSession, user } = useSelector(
    (state: RootState) => state.bwengeAuth
  );
  
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownExpiredToast = useRef(false);

  useEffect(() => {
    // Only monitor if authenticated AND SSO was used
    if (!isAuthenticated || !ssoInitialized) {
      return;
    }


    // Track user activity
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Activity events
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    // Check Ongera session validity every 3 minutes
    const checkSession = async () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;
      const TEN_MINUTES = 10 * 60 * 1000;

      // Skip if user inactive for 10+ minutes
      if (timeSinceActivity > TEN_MINUTES) {
        return;
      }

      try {
        const result = await dispatch(checkOngeraSession()).unwrap();

        if (!result.has_ongera_session) {
          
          if (!hasShownExpiredToast.current) {
            toast.error(
              'Your Ongera session has expired. You will be logged out.',
              {
                duration: 5000,
                position: 'top-center',
              }
            );
            hasShownExpiredToast.current = true;
          }

          // Wait 2 seconds then logout
          setTimeout(() => {
            dispatch(logoutBwenge(false));
            window.location.href = '/login?reason=session_expired';
          }, 2000);
        } else {
        }
      } catch (error: any) {
        
        // If 401, Ongera session is definitely invalid
        if (error.response?.status === 401) {
          if (!hasShownExpiredToast.current) {
            toast.error('Your session has expired. Please log in again.');
            hasShownExpiredToast.current = true;
          }
          
          dispatch(logoutBwenge(false));
          window.location.href = '/login?reason=session_expired';
        }
      }
    };

    // Initial check after 1 minute
    const initialTimer = setTimeout(checkSession, 60 * 1000);

    // Set up interval (every 3 minutes)
    checkIntervalRef.current = setInterval(checkSession, 3 * 60 * 1000);

    // Cleanup
    return () => {
      
      clearTimeout(initialTimer);
      
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isAuthenticated, ssoInitialized, dispatch]);

  return {
    isMonitoring: isAuthenticated && ssoInitialized,
    hasOngeraSession
  };
}