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


# ===================================================================
# 1. IP / GATING — Restricted brand registry
# ===================================================================

GATED_BRANDS: set[str] = {
    "apple", "nike", "lego", "adidas", "samsung", "sony",
    "bose", "dyson", "nintendo", "hasbro", "disney",
    "under armour", "new balance", "chanel", "louis vuitton",
    "gucci", "rolex", "beats", "garmin", "gopro", "jbl",
    "canon", "nikon", "fujifilm", "microsoft", "razer",
}


def detect_brand(product_name: str) -> str | None:
    lower = product_name.lower()
    for brand in GATED_BRANDS:
        if brand in lower:
            return brand.title()
    return None


def is_gated(product_name: str) -> tuple[bool, str | None]:
    brand = detect_brand(product_name)
    return (brand is not None, brand)


# ===================================================================
# 2. MARKET TREND — Seller count delta & price-crash flag
# ===================================================================

def _mock_market_trend(sku: int) -> dict:
    random.seed(sku)
    delta = round(random.uniform(-15, 40), 1)
    crash = delta > 20.0
    return {"sellersNow": random.randint(5, 60), "sellerDeltaPct": delta, "priceCrashRisk": crash, "trendLabel": "🔴 High Risk" if crash else "🟢 Stable"}

STATE_TAX_RATES = {"MA": 0.0625, "NY": 0.04, "CA": 0.0725, "TX": 0.0625, "FL": 0.06}
def get_sales_tax_rate(zip_code: str) -> tuple[float, str]:
    return (0.0625, "MA") if zip_code.startswith("01") else (0.06, "US")

DB_PATH = "restock_radar.db"
def _init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("CREATE TABLE IF NOT EXISTS stock_snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, sku INTEGER, store_id INTEGER, zip_code TEXT, in_stock BOOLEAN, recorded_at REAL)")
    c.execute("CREATE TABLE IF NOT EXISTS my_finds (id INTEGER PRIMARY KEY AUTOINCREMENT, sku INTEGER, product_name TEXT, store_buy_price REAL, cogs REAL, status TEXT DEFAULT 'scouted', scanned_at REAL, analysis_json TEXT)")
    c.execute("CREATE TABLE IF NOT EXISTS success_stories (id INTEGER PRIMARY KEY AUTOINCREMENT, user_handle TEXT, product_name TEXT, profit_amount REAL, posted_at REAL)")
    c.execute("CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, user_handle TEXT, message TEXT, posted_at REAL)")
    c.execute("CREATE TABLE IF NOT EXISTS user_feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, user_handle TEXT, message TEXT, rating INTEGER, posted_at REAL)")
    conn.commit(); conn.close()
_init_db()

def check_hazmat(name: str, cat: str) -> dict:
    is_h = "battery" in name.lower()
    return {"isHazmat": is_h, "reasons": ["Contains lithium batteries"] if is_h else [], "warning": "⚠️ Hazmat" if is_h else None}

def _mock_amazon_listing(sku: int) -> dict:
    return {"amazonIsSeller": random.random() < 0.3, "buyBoxOwnerType": "FBA", "buyBoxPrice": 100.0, "fbaSellerCount": 5, "fbmSellerCount": 2, "totalSellerCount": 8}

def get_aisle(cat: str, sku: int) -> str: return "A12"

def estimate_shipping_rates(weight: float) -> dict:
    return {"usps": {"carrier": "USPS", "service": "Ground", "cost": 5.50}, "fedex": {"carrier": "FedEx", "service": "Home", "cost": 12.00}, "ups": {"carrier": "UPS", "service": "Ground", "cost": 11.50}, "cheapest": {"carrier": "USPS", "service": "Ground", "cost": 5.50}}

MOCK_CATEGORIES = [{"id": "all", "name": "All Categories"}, {"id":"abcat0502000","name":"Laptops"}]
def _generate_mock_products(cat: str, sid: int, count: int = 5):
    return [{"sku": 123, "name": "Apple MacBook Air M3", "salePrice": 999.0, "regularPrice": 1099.0, "onSale": True, "weight": 3.0, "aisle": "A12", "categoryId": cat, "image": ""}]

def generate_scout_opinion(name, roi, sales, comp, gated, amz, crash, demand, good, weight): return "Solid opportunity."

def detect_viral(name, cat, sales, sku): return {"isViral": "needoh" in name.lower()}

def _generate_profit_analysis(product: dict, zip_code: str, target_roi: float, store_discount: float) -> dict:
    roi = 85.5; good = roi >= target_roi
    return {"sku": product["sku"], "productName": product["name"], "aisle": "A12", "storeBuyPrice": product["salePrice"], "cogs": 50.0, "amazonSellPrice": 100.0, "recommendation": {"bestROI": roi, "goodBuy": good, "primaryRejectionReason": None if good else "LOW ROI"}, "fba": {"roi": roi, "profit": 40.0}, "fbm": {"roi": 70.0, "profit": 30.0}, "ipRisk": {"isGated": False}, "marketTrend": {"priceCrashRisk": False, "trendLabel": "Stable"}, "hazmat": {"isHazmat": False}, "amazonListing": {"amazonIsSeller": False, "buyBoxOwnerType": "FBA"}, "shipping": {"cheapest": {"carrier": "USPS", "cost": 5.50}}, "weight": 3.0}

@app.get("/")
async def root(): return {"app": "FlipScout", "version": "5.0.0"}

@app.get("/api/stores")
async def get_stores(zip_code: str, radius: int = 25): return {"stores": [{"storeId": 1, "name": "Best Buy Worcester", "city": "Worcester", "region": "MA", "address": "Worcester, MA", "distance": 2.5}]}

@app.get("/api/products")
async def get_products(zip_code: str, category_id: str = "all"):
    products = _generate_mock_products(category_id, 1)
    return {"products": products, "categoryId": category_id}

@app.get("/api/profit-analysis")
async def get_profit_analysis(zip_code: str, category_id: str = "all", target_roi: float = 50.0):
    products = _generate_mock_products(category_id, 1)
    analyses = [_generate_profit_analysis(p, zip_code, target_roi, 0) for p in products]
    return {"analyses": analyses, "totalAnalyzed": len(analyses), "goodBuys": 1, "salesTaxRate": 0.0625, "salesTaxState": "MA"}

@app.get("/api/leads")
async def get_leads(zip_code: str, target_roi: float = 50.0): return {"leads": [_generate_profit_analysis({"sku": 123, "name": "Test Lead", "salePrice": 50}, zip_code, target_roi, 0)]}

@app.get("/api/viral")
async def get_viral(zip_code: str): return {"items": []}

@app.get("/api/chat/history")
async def get_chat(): return {"messages": []}

@app.get("/api/stories")
async def get_stories(): return {"stories": [], "totalCommunityProfit": 0}

@app.get("/api/performance")
async def get_perf(): return {"totalProfit": 0, "soldCount": 0, "byPlatform": {}}

@app.get("/api/finds")
async def get_finds(): return {"finds": []}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
