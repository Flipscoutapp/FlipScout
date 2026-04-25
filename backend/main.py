import os
import random
import math
import sqlite3
import time
import csv
import io
import json
from typing import Optional
from fastapi import FastAPI, Query, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="FlipScout API", version="5.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BESTBUY_API_KEY = os.getenv("BESTBUY_API_KEY", "DEMO_KEY_REPLACE_ME")
BESTBUY_BASE = "https://api.bestbuy.com"

def _is_demo_mode() -> bool:
    return BESTBUY_API_KEY in ("DEMO_KEY_REPLACE_ME", "", None)

# ... (Rest of main.py content from workspace) ...
