from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

import numpy as np
import cv2
import asyncio
import json
import requests
import os
import random

app = FastAPI(title="ws-server")


LANGCHAIN_URL = os.getenv("LANGCHAIN_URL", "http://langchain:8001")
TTS_URL       = os.getenv("TTS_URL", "http://tts:8002")
STT_URL       = os.getenv("STT_URL", "http://stt:8003")
ML_URL        = os.getenv("ML_URL", "http://ai:8004")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients = {"deaf": None, "normal": None}


def ml_predict(frame):
    _, img_encoded = cv2.imencode(".jpg", frame)
    resp = requests.post(f"{ML_URL}/predict", files={"file": img_encoded.tobytes()})
    resp.raise_for_status()
    return resp.json()

def refine_text(text):
    r = requests.post(f"{LANGCHAIN_URL}/refine", json={"text": text})
    r.raise_for_status()
    return r.json().get("refined", text)


def call_tts(text):
    r = requests.post(f"{TTS_URL}/tts", json={"text": text})
    r.raise_for_status()
    return r.content

def call_stt(audio_bytes):
    r = requests.post(f"{STT_URL}/stt", files={"file": audio_bytes})
    r.raise_for_status()
    return r.json().get("text", "")



@app.websocket("/ws/deaf")
async def ws_deaf(ws: WebSocket):
    await ws.accept()
    clients["deaf"] = ws

    buffer_words = []

    try:
        while True:
            msg = await ws.receive()

            if "bytes" in msg:
           
                np_arr = np.frombuffer(msg["bytes"], np.uint8)
                frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                if frame is None:
                    continue

                ml_output = ml_predict(frame)
                await ws.send_json({"predictions": ml_output})

                buffer_words.extend([o["class_name"] for o in ml_output])

            elif "text" in msg:
                data = json.loads(msg["text"])

                if data.get("action") == "send_translation":
                    text = " ".join(buffer_words)
                    refined = refine_text(text)
                    audio_bytes = call_tts(refined)

                    normal = clients.get("normal")
                    if normal:
                        try:
                            await normal.send_json({"refined_text": refined})
                            await normal.send_bytes(audio_bytes)
                        except:
                            clients["normal"] = None

                    buffer_words = []

    except WebSocketDisconnect:
        clients["deaf"] = None


@app.websocket("/ws/normal")
async def ws_normal(ws: WebSocket):
    await ws.accept()
    clients["normal"] = ws

    try:
        while True:
            audio = await ws.receive_bytes()

            text = call_stt(audio)
            if not text:
                continue

            deaf = clients.get("deaf")
            if deaf:
                try:
                    await deaf.send_json({"asl_text": text})
                except:
                    clients["deaf"] = None

    except WebSocketDisconnect:
        clients["normal"] = None
