import { useEffect, useState } from "react";
import { api } from "./lib/api";

export default function App() {
  const [status, setStatus] = useState("checking...");
  useEffect(() => {
    api.get("/health")
      .then(r => setStatus(r.data.status))
      .catch(() => setStatus("down"));
  }, []);
  return (
    <div style={{ padding: 24 }}>
      <h1>React + Flask (no DB)</h1>
      <p>API status: {status}</p>
    </div>
  );
}
