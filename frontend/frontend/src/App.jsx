import React, { useState } from "react";
import { DeafScreen, NormalScreen } from "./Screens";


const WS_URL_VIDEO = "ws://localhost:8000/ws/deaf";
const WS_URL_AUDIO = "ws://localhost:8000/ws/normal";

export default function App() {
  const [mode, setMode] = useState(null);

  const btnStyle = {
    padding: "14px 20px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    background: "#2563eb",
    color: "white",
    fontSize: 16,
  };

  return (
    <div style={{ fontFamily: "Inter, system-ui", padding: 20 }}>
      <h1 style={{ textAlign: "center" }}>Real-time Sign Language Converter</h1>

      {!mode && (
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 40 }}>
          <button style={btnStyle} onClick={() => setMode("deaf")}>
            I'm Deaf (Use camera)
          </button>

          <button style={btnStyle} onClick={() => setMode("normal")}>
            I'm Normal (Use mic)
          </button>
        </div>
      )}

      {mode === "deaf" && (
        <DeafScreen onBack={() => setMode(null)} wsUrl={WS_URL_VIDEO} />
      )}

      {mode === "normal" && (
        <NormalScreen onBack={() => setMode(null)} wsUrl={WS_URL_AUDIO} />
      )}

      <div style={{ marginTop: 36, textAlign: "center", color: "#555" }}>
        <small>Switch between modes using the Back button. Configure WS_URLs in code.</small>
      </div>
    </div>
  );
}
