from fastapi import FastAPI
from pydantic import BaseModel
import os
import json

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableSequence
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferMemory

app = FastAPI(title="langchain-server")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MODEL_NAME = "tngtech/deepseek-r1t2-chimera:free"

llm = ChatOpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
    model=MODEL_NAME,
    temperature=0.7
)

memory = ConversationBufferMemory(return_messages=True)

class Message(BaseModel):
    text: str

refine_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You refine ASL-to-English text. "
     "Single alphabet means a name. "
     "Return JSON:\n"
     "{ \"text\": \"<refined>\", \"metadata\": { \"word_count\": <num>, \"confidence\": \"high\" } }"
    ),
    ("human", "{input}")
])

refine_chain = RunnableSequence(
    steps=[
        lambda x: {"input": x["text"]},
        refine_prompt,
        llm
    ]
)

@app.post("/refine")
async def refine(msg: Message):
    memory.save_context(
        {"input": msg.text},
        {"output": ""}
    )
    result = refine_chain.invoke({"text": msg.text}).content
    return {"refined": result}

class ASLInput(BaseModel):
    text: str

asl_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "Convert English to ASL grammar. "
     "Return only JSON:\n"
     "{ \"asl_gloss\": [...], \"image_ids\": [...], \"confidence\": \"high\" }"
    ),
    ("human", "{input}")
])

asl_chain = RunnableSequence(
    steps=[
        lambda x: {"input": x["text"]},
        asl_prompt,
        llm
    ]
)

@app.post("/asl")
async def asl(msg: ASLInput):
    out = asl_chain.invoke({"text": msg.text}).content
    out = out.replace("```json", "").replace("```", "").strip()
    parsed = json.loads(out)
    return parsed
