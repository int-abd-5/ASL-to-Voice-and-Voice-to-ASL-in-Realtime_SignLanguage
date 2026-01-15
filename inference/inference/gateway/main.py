from fastapi import FastAPI
from pydantic import BaseModel
import os
import requests
from starlette.responses import StreamingResponse

app = FastAPI(title="api-gateway")

LANGCHAIN_URL = os.getenv("LANGCHAIN_URL", "http://langchain:8001")
TTS_URL       = os.getenv("TTS_URL", "http://tts:8002")

class TextReq(BaseModel):
    text: str

@app.post("/refine-and-tts")
async def refine_and_tts(req: TextReq):
    r = requests.post(f"{LANGCHAIN_URL}/refine", json={"text": req.text})
    r.raise_for_status()
    refined = r.json().get("refined", req.text)

    t = requests.post(
        f"{TTS_URL}/tts",
        json={"text": refined},
        stream=True
    )
    t.raise_for_status()

    def iter_bytes():
        for chunk in t.iter_content(chunk_size=4096):
            if chunk:
                yield chunk

    return StreamingResponse(iter_bytes(), media_type="audio/wav")
