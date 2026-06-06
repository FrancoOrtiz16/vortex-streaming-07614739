const OVERLAY_ID = 'devtools-blocker-overlay-v1';
const CHECK_INTERVAL_MS = 800;
const DEVTOOLS_THRESHOLD_PX = 160;

const blockEvent = (event: Event) => {
  event.stopImmediatePropagation();
  event.preventDefault();
};

const removeBlockerOverlay = () => {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    return;
  }

  overlay.remove();
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  window.removeEventListener('keydown', blockEvent, true);
  window.removeEventListener('contextmenu', blockEvent, true);
  window.removeEventListener('mousedown', blockEvent, true);
  window.removeEventListener('touchstart', blockEvent, true);
};

const createBlockerOverlay = () => {
  if (typeof document === 'undefined' || document.getElementById(OVERLAY_ID)) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.zIndex = '999999999';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.98)';
  overlay.style.color = '#fff';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.textAlign = 'center';
  overlay.style.padding = '2rem';
  overlay.style.fontFamily = 'Inter, ui-sans-serif, system-ui, sans-serif';
  overlay.style.letterSpacing = '0.02em';
  overlay.style.lineHeight = '1.5';
  overlay.style.pointerEvents = 'auto';

  overlay.innerHTML = `
    <div style="max-width: 36rem;">
      <h1 style="font-size: 2rem; margin-bottom: 1rem;">Acceso Restringido</h1>
      <p style="font-size: 1rem; color: rgba(255,255,255,0.8);">
        Se ha detectado el uso de herramientas de desarrollador. Por seguridad, la página está bloqueada y no se permite ninguna interacción.
      </p>
    </div>
  `;

  document.body.appendChild(overlay);
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  window.addEventListener('keydown', blockEvent, true);
  window.addEventListener('contextmenu', blockEvent, true);
  window.addEventListener('mousedown', blockEvent, true);
  window.addEventListener('touchstart', blockEvent, true);
};

const detectDevToolsOpen = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const widthOpen = window.outerWidth - window.innerWidth > DEVTOOLS_THRESHOLD_PX;
  const heightOpen = window.outerHeight - window.innerHeight > DEVTOOLS_THRESHOLD_PX;

  let open = widthOpen || heightOpen;

  try {
    const element = new Image();
    Object.defineProperty(element, 'id', {
      get() {
        open = true;
        return 'devtools-detection';
      },
    });
    // eslint-disable-next-line no-console
    console.log('%c', element);
  } catch {
    // ignore
  }

  const start = performance.now();
  // eslint-disable-next-line no-debugger
  debugger;
  const end = performance.now();
  if (end - start > 100) {
    open = true;
  }

  return open;
};

/**
 * Inicializa un bloqueo de página cuando se detecta que DevTools está abierto.
 * No hace nada si el usuario es admin.
 */
export function initDevToolsBlocker(isAdmin: boolean) {
  if (typeof window === 'undefined' || isAdmin) {
    return undefined;
  }

  let lastState = false;

  const check = () => {
    const open = detectDevToolsOpen();
    if (open && !lastState) {
      lastState = true;
      createBlockerOverlay();
      try {
        window.focus();
      } catch {
        // ignore
      }
    }
  };

  const intervalId = window.setInterval(check, CHECK_INTERVAL_MS);
  check();

  return () => {
    window.clearInterval(intervalId);
    removeBlockerOverlay();
  };
}
