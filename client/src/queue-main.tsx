import { createRoot } from "react-dom/client";
import { QueueApp } from "@/queue/QueueApp";
import "./index.css";

createRoot(document.getElementById("queue-root")!).render(<QueueApp />);
