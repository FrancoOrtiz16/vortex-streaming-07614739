import { createRoot } from "react-dom/client";
import { initializeCacheControl } from "./lib/cacheControl"; // 🛡️ GUARDIÁN DE CACHÉ - Primera línea de ejecución
import App from "./App.tsx";
import "./index.css";

// 🔥 EJECUTAR CACHE CONTROL INMEDIATAMENTE
initializeCacheControl();

createRoot(document.getElementById("root")!).render(<App />);
