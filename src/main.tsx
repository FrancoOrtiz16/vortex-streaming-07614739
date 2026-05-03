import { createRoot } from "react-dom/client";
import "./lib/cacheControl"; // 🛡️ GUARDIÁN DE CACHÉ - Primera línea de ejecución
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
