from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
import whisper
import uuid
import os

app = FastAPI(title="stt-server")

model = whisper.load_model(os.getenv("WHISPER_MODEL", "base"))

def chunk_to_text(audio_bytes: bytes) -> str:
    audio_id = str(uuid.uuid4())
    file_path = f"temp_audio/{audio_id}.wav"
    os.makedirs("temp_audio", exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(audio_bytes)
    res = model.transcribe(file_path)
    os.remove(file_path)
    return res.get("text", "").strip()

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    audio = await file.read()
    text = chunk_to_text(audio)
    return {"text": text}

@app.websocket("/ws/deaf")
async def ws_deaf(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_bytes()
            text = chunk_to_text(data)
            await ws.send_json({"text": text})
    except WebSocketDisconnect:
        pass
