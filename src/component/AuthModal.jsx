import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HiX } from 'react-icons/hi';
import { useLocation, useNavigate } from 'react-router-dom';
import Loading from './loading';
import { AUTH_MODAL_OPEN_EVENT } from '../utils/authModal';
import { supabase } from '../utils/Supabase';
import './AuthModal.css';

const Login = lazy(() => import('../pages/login/Login'));
const Signup = lazy(() => import('../pages/Signup/SignUp'));
const CompleteProfile = lazy(() => import('../pages/Signup/CompleteProfile'));

export default function AuthModal() {
  const [view, setView] = useState(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const openerRef = useRef(null);
  const openedFromPathRef = useRef(null);
  const wasOpenRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isOpen = Boolean(view);
  const isOnboarding = view === 'complete-profile';

  useEffect(() => {
    const pathViews = {
      '/login': 'login',
      '/signup': 'signup',
      '/complete-profile': 'complete-profile',
    };
    const pathView = pathViews[location.pathname];
    if (!pathView) return;

    openedFromPathRef.current = location.pathname;
    setView(pathView);
  }, [location.pathname]);

  useEffect(() => {
    const handleOpen = (event) => {
      openerRef.current = document.activeElement;
      openedFromPathRef.current = location.pathname;
      setView(event.detail?.view === 'signup' ? 'signup' : 'login');
    };

    window.addEventListener(AUTH_MODAL_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(AUTH_MODAL_OPEN_EVENT, handleOpen);
  }, [location.pathname]);

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
      return () => {
        window.clearTimeout(focusTimer);
        document.body.style.overflow = previousOverflow;
      };
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      if (openerRef.current instanceof HTMLElement && openerRef.current.isConnected) {
        openerRef.current.focus();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (view && location.pathname !== openedFromPathRef.current) {
      setView(null);
    }
  }, [location.pathname, view]);

  useEffect(() => {
    if (!view) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (!isOnboarding) setView(null);
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, isOnboarding]);

  const handleClose = () => {
    if (isOnboarding) {
      supabase.auth.signOut().catch(() => {}).finally(() => navigate('/', { replace: true }));
      return;
    }
    if (location.pathname === '/login' || location.pathname === '/signup') {
      navigate('/', { replace: true });
      return;
    }
    setView(null);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {view && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#10252f]/60 p-3 backdrop-blur-[3px] sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (!isOnboarding && event.target === event.currentTarget) setView(null);
          }}
        >
          <motion.section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={
              isOnboarding
                ? 'Complete your Place4U profile'
                : view === 'signup' ? 'Create a Place4U profile' : 'Sign in to Place4U'
            }
            className={`place-auth-modal flex ${isOnboarding ? 'max-h-[96dvh]' : 'max-h-[92dvh]'} w-full flex-col overflow-hidden rounded-[24px] ${view === 'signup' || isOnboarding ? 'max-w-3xl' : 'max-w-xl'}`}
            initial={{ y: 16, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 12, scale: 0.985 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="place-auth-modal__header flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-7">
              <div className="flex min-w-0 items-center">
                <img src="/logo.png" alt="Place4U" className="place-auth-modal__logo h-8 w-auto" />
              </div>
              {isOnboarding ? (
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={handleClose}
                  className="place-auth-modal__signout rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                >
                  Sign out
                </button>
              ) : (
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={handleClose}
                  aria-label={`Close ${view === 'signup' ? 'profile creation' : 'sign in'} dialog`}
                  className="place-auth-modal__close flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors"
                >
                  <HiX className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <Suspense fallback={<div className="p-8"><Loading /></div>}>
                {isOnboarding ? (
                  <CompleteProfile isModal />
                ) : view === 'signup' ? (
                  <Signup isModal onSwitchToLogin={() => setView('login')} />
                ) : (
                  <Login isModal onSwitchToSignup={() => setView('signup')} />
                )}
              </Suspense>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
