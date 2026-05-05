import { createRoot } from "react-dom/client";
import "./lib/cacheControl"; // 🛡️ GUARDIÁN DE CACHÉ - Primera línea de ejecución
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Señal al watchdog del index.html: la app montó correctamente
requestAnimationFrame(() => {
  (window as any).__APP_MOUNTED__ = true;
  if ((window as any).__LOADING_TIMEOUT__) {
    clearTimeout((window as any).__LOADING_TIMEOUT__);
  }
  // Reset del contador de intentos cuando montamos OK
  try { sessionStorage.removeItem('vortex_recovery_attempt'); } catch {}
});
