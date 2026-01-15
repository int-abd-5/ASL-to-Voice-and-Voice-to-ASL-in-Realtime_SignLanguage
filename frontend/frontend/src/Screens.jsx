import React, { useRef, useEffect, useState } from "react";


const primaryBtn = { padding: "8px 12px", borderRadius: 8, background: "#059669", color: "white", border: "none", cursor: "pointer" };
const dangerBtn = { padding: "8px 12px", borderRadius: 8, background: "#dc2626", color: "white", border: "none", cursor: "pointer" };
const plainBtn = { padding: "8px 10px", borderRadius: 8, background: "#e5e7eb", border: "none", cursor: "pointer" };

const SEND_FRAME_INTERVAL_MS = 150;

export function DeafScreen({ onBack, wsUrl }) {
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const [started, setStarted] = useState(false);
  const canvasCaptureRef = useRef(null);
  const [predictions, setPredictions] = useState([]);
  const [images, setImages] = useState([]);

  useEffect(() => {
    return () => {
      stopSendingFrames();
      stopCamera();
      closeWs();
    };
  }, []);

  const sendTranslation = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "send_translation" }));
    }
  };

  const sendFrame = () => {
    if (!videoRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    c.width = videoRef.current.videoWidth || 640;
    c.height = videoRef.current.videoHeight || 480;
    ctx.drawImage(videoRef.current, 0, 0, c.width, c.height);

    c.toBlob((blob) => {
      if (!blob) return;
      const reader = new FileReader();
      reader.onload = () => {
        const arr = new Uint8Array(reader.result);
        wsRef.current.send(JSON.stringify({ frame: Array.from(arr) }));
      };
      reader.readAsArrayBuffer(blob);
    }, "image/jpeg", 0.6);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStarted(true);
    } catch (err) {
      alert("Could not access camera: " + err.message);
    }
  };

  const stopCamera = () => {
    const s = videoRef.current?.srcObject;
    s?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setStarted(false);
  };

  const openWs = () => {
    if (wsRef.current) return;

    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => startSendingFrames(ws);
    ws.onmessage = handleWsMessage;

    wsRef.current = ws;
  };

  const closeWs = () => {
    wsRef.current?.close();
    wsRef.current = null;
  };

  const handleWsMessage = (ev) => {
    if (ev.data instanceof ArrayBuffer) {
   
      const blob = new Blob([ev.data], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      setImages((prev) => [url, ...prev].slice(0, 20));
      return;
    }

    try {
      const text = typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data);
      const json = JSON.parse(text);
      if (json.predictions) setPredictions(json.predictions);
    } catch {}
  };

  const startSendingFrames = (ws) => {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");

    const loop = () => {
      if (!videoRef.current || ws.readyState !== WebSocket.OPEN) return;
      c.width = videoRef.current.videoWidth || 640;
      c.height = videoRef.current.videoHeight || 480;
      ctx.drawImage(videoRef.current, 0, 0, c.width, c.height);
      c.toBlob((blob) => blob && ws.send(blob), "image/jpeg", 0.6);
    };

    const id = setInterval(loop, SEND_FRAME_INTERVAL_MS);
    canvasCaptureRef.current = { id };
  };

  const stopSendingFrames = () => {
    if (canvasCaptureRef.current) clearInterval(canvasCaptureRef.current.id);
    canvasCaptureRef.current = null;
  };

  const handleStart = async () => {
    await startCamera();
    openWs();
  };

  const handleStop = () => {
    stopSendingFrames();
    closeWs();
    stopCamera();
    setPredictions([]);
    setImages([]);
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onBack} style={plainBtn}>Back</button>
        {!started ? (
          <button onClick={handleStart} style={primaryBtn}>Start Camera & Stream</button>
        ) : (
          <button onClick={handleStop} style={dangerBtn}>Stop</button>
        )}
        <button onClick={sendTranslation} style={primaryBtn}>Send Translation</button>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <div style={{ position: "relative", width: 640, height: 480, background: "#000" }}>
          <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <CanvasOverlay predictions={predictions} />
        </div>

        <div style={{ flex: 1 }}>
          <h3>Received Images</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 480, overflowY: "auto" }}>
            {images.map((src, i) => (
              <img key={i} src={src} style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 6 }} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Predictions</h3>
        <div style={{ background: "#fff", padding: 8, borderRadius: 8 }}>
          {predictions.length === 0 ? (
            <div style={{ color: "#666" }}>No predictions yet</div>
          ) : (
            predictions.map((p, i) => (
              <div key={i} style={{ padding: 6, borderBottom: "1px solid #eee" }}>
                <strong>{p.class_name}</strong>{" "}
                <small>({(p.confidence * 100).toFixed(1)}%)</small>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


function CanvasOverlay({ predictions }) {
  const ref = useRef();

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");

    const parent = c.parentElement;
    c.width = parent.clientWidth;
    c.height = parent.clientHeight;

    ctx.clearRect(0, 0, c.width, c.height);

    predictions.forEach((p) => {
      const x = p.x1;
      const y = p.y1;
      const w = p.x2 - p.x1;
      const h = p.y2 - p.y1;
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    });
  }, [predictions]);

  return (
    <canvas
      ref={ref}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}


export function NormalScreen({ onBack, wsUrl }) {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("idle");
  const [aslJson, setAslJson] = useState(null);

  const audioContextRef = useRef(null);
  const wsRef = useRef(null);
  const bufferRef = useRef([]);
  const bufferLenRef = useRef(0);
  const chunkTimerRef = useRef(null);
  const micRef = useRef(null);

  useEffect(() => () => stop(), []);

  const connectWs = () => {
    if (wsRef.current) return;

    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onmessage = (ev) => {
      if (ev.data instanceof ArrayBuffer) {
        const blob = new Blob([ev.data], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        new Audio(url).play().catch(() => {});
        return;
      }

      try {
        const text = typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data);
        const json = JSON.parse(text);
        setAslJson(json);
      } catch {}
    };

    wsRef.current = ws;
  };

  const start = async () => {
    connectWs();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (evt) => {
        const input = evt.inputBuffer.getChannelData(0);
        const copy = new Float32Array(input.length);
        copy.set(input);
        bufferRef.current.push(copy);
        bufferLenRef.current += copy.length;
      };

      const src = ctx.createMediaStreamSource(stream);
      src.connect(processor);
      processor.connect(ctx.destination);

  
      chunkTimerRef.current = setInterval(() => flush(), 2000);

      setRunning(true);
      setStatus("streaming");
    } catch (err) {
      setStatus("mic error");
    }
  };

  const encodeWav = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const write = (off, str) => [...str].forEach((c, i) => view.setUint8(off + i, c.charCodeAt(0)));

    write(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    write(8, "WAVE");
    write(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, "data");
    view.setUint32(40, samples.length * 2, true);

    let o = 44;
    samples.forEach((s) => {
      view.setInt16(o, s * 0x7fff, true);
      o += 2;
    });

    return buffer;
  };

  const mergeFloat32 = (arr, len) => {
    const out = new Float32Array(len);
    let off = 0;
    arr.forEach((b) => {
      out.set(b, off);
      off += b.length;
    });
    return out;
  };

  const flush = () => {
    if (!wsRef.current || bufferLenRef.current === 0) return;

    const merged = mergeFloat32(bufferRef.current, bufferLenRef.current);
    bufferRef.current = [];
    bufferLenRef.current = 0;

    const rate = audioContextRef.current?.sampleRate || 44100;
    const wav = encodeWav(merged, rate);
    wsRef.current.send(wav);
  };

  const stop = () => {
    flush();

    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;

    audioContextRef.current?.close();
    audioContextRef.current = null;

    wsRef.current?.close();
    wsRef.current = null;

    bufferRef.current = [];
    bufferLenRef.current = 0;

    clearInterval(chunkTimerRef.current);

    setRunning(false);
    setStatus("stopped");
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onBack} style={plainBtn}>Back</button>
        {!running ? (
          <button onClick={start} style={primaryBtn}>Start Mic & Stream</button>
        ) : (
          <button onClick={stop} style={dangerBtn}>Stop</button>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <strong>Status:</strong> {status}
      </div>

     
    </div>
  );
};
