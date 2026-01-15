from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from transformers import pipeline
import soundfile as sf
import torch
import io
import os

app = FastAPI(title="tts-server")

device = 0 if torch.cuda.is_available() else -1
tts_pipe = pipeline(
    "text-to-speech",
    model=os.getenv("TTS_MODEL", "facebook/mms-tts-eng"),
    device=device
)

class TTSRequest(BaseModel):
    text: str

def synthesize(text: str) -> bytes:
    out = tts_pipe(text)
    audio = out["audio"]
    sr = out["sampling_rate"]
    bio = io.BytesIO()
    sf.write(bio, audio, sr, format="WAV")
    bio.seek(0)
    return bio

@app.post("/tts")
async def tts(req: TTSRequest):
    try:
        bio = synthesize(req.text)
        return StreamingResponse(bio, media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
