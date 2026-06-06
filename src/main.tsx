import { createRoot } from "react-dom/client";
import "./lib/responsiveInit"; // 🎯 INICIPADOR RESPONSIVO - Carga ANTES que React
import "./lib/cacheControl"; // 🛡️ GUARDIÁN DE CACHÉ - Segunda línea de ejecución
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
