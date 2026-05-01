import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Limpieza automática de caché basura
const clearCacheStorage = () => {
  try {
    // Limpiar sessionStorage completamente
    sessionStorage.clear();

    // Limpiar localStorage excepto tokens de autenticación
    const keysToKeep = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('auth') || key.includes('token') || key.includes('session'))) {
        keysToKeep.push(key);
      }
    }

    // Limpiar todo y restaurar solo auth
    const authData = {};
    keysToKeep.forEach(key => {
      authData[key] = localStorage.getItem(key);
    });

    localStorage.clear();

    keysToKeep.forEach(key => {
      localStorage.setItem(key, authData[key]);
    });

    console.log('[Cache Cleanup] Storage limpiado exitosamente. Sesión fresca iniciada.');
  } catch (error) {
    console.warn('[Cache Cleanup] Error limpiando storage:', error);
  }
};

// Ejecutar limpieza en cada carga
clearCacheStorage();

createRoot(document.getElementById("root")!).render(<App />);
