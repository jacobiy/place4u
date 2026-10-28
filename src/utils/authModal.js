export const AUTH_MODAL_OPEN_EVENT = 'place4u:open-auth-modal';

export function openAuthModal(view = 'login') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(AUTH_MODAL_OPEN_EVENT, {
      detail: { view: view === 'signup' ? 'signup' : 'login' },
    })
  );
}
