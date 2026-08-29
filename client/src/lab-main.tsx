import { createRoot } from "react-dom/client";
import { LabApp } from "@/lab/LabApp";
import "./index.css";

createRoot(document.getElementById("lab-root")!).render(<LabApp />);
