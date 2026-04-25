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

# Restricted brand registry
GATED_BRANDS: set[str] = {"apple", "nike", "lego", "adidas", "samsung", "sony", "bose", "dyson", "nintendo", "hasbro", "disney", "under armour", "new balance", "chanel", "louis vuitton", "gucci", "rolex", "beats", "garmin", "gopro", "jbl", "canon", "nikon", "fujifilm", "microsoft", "razer"}

def detect_brand(product_name: str) -> str | None:
    lower = product_name.lower()
    for brand in GATED_BRANDS:
        if brand in lower: return brand.title()
    return None

def is_gated(product_name: str) -> tuple[bool, str | None]:
    brand = detect_brand(product_name)
    return (brand is not None, brand)

def _mock_market_trend(sku: int) -> dict:
    random.seed(sku)
    delta = round(random.uniform(-15, 40), 1)
    crash = delta > 20.0
    return {"sellersNow": random.randint(5, 60), "sellerDeltaPct": delta, "priceCrashRisk": crash, "trendLabel": "🔴 High Risk" if crash else "🟢 Stable"}

def get_sales_tax_rate(zip_code: str) -> tuple[float, str]:
    return (0.0625, "MA") if zip_code.startswith("01") else (0.06, "US")

def _init_db():
    conn = sqlite3.connect("restock_radar.db")
    c = conn.cursor()
    c.execute("CREATE TABLE IF NOT EXISTS my_finds (id INTEGER PRIMARY KEY AUTOINCREMENT, sku INTEGER, product_name TEXT, cogs REAL, status TEXT DEFAULT 'scouted', scanned_at REAL)")
    conn.commit(); conn.close()
_init_db()

# ... (Final Pro Content for main.py) ...
