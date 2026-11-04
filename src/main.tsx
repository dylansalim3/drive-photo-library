import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DirectionProvider } from "@/components/foundations/direction/direction";
import "@/styles/globals.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DirectionProvider locale="en-US">
      <App />
    </DirectionProvider>
  </StrictMode>,
);
