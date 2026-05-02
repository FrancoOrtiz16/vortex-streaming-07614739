import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const APP_SCHEMA_VERSION = "2026-05-02-v1";
const SCHEMA_VERSION_STORAGE_KEY = "vortex-app-schema-version";

const shouldRunEmergencyCleanup = (): boolean => {
  try {
    const currentVersion = localStorage.getItem(SCHEMA_VERSION_STORAGE_KEY);
    return currentVersion !== APP_SCHEMA_VERSION;
  } catch (error) {
    console.warn('[Emergency Cleanup] No se pudo leer la versión de esquema:', error);
    return true;
  }
};

const clearLegacyStorage = () => {
  try {
    const preservedKeys: string[] = [];
    const preservedData: Record<string, string | null> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && /auth|token|session/i.test(key)) {
        preservedKeys.push(key);
        preservedData[key] = localStorage.getItem(key);
      }
    }

    sessionStorage.clear();
    localStorage.clear();

    preservedKeys.forEach((key) => {
      const value = preservedData[key];
      if (value !== null) {
        localStorage.setItem(key, value);
      }
    });

    localStorage.setItem(SCHEMA_VERSION_STORAGE_KEY, APP_SCHEMA_VERSION);
    console.info('[Emergency Cleanup] Limpieza de storage completada. Tokens/credenciales preservadas:', preservedKeys.join(', '));
  } catch (error) {
    console.warn('[Emergency Cleanup] Error limpiando el storage:', error);
  }
};

if (shouldRunEmergencyCleanup()) {
  clearLegacyStorage();
}

createRoot(document.getElementById("root")!).render(<App />);
