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
    sellers_7d_ago = random.randint(5, 60)
    seller_delta_pct = round(random.uniform(-15, 40), 1)
    sellers_now = max(1, int(sellers_7d_ago * (1 + seller_delta_pct / 100)))
    price_crash_risk = seller_delta_pct > 20.0
    random.seed()
    return {
        "sellersNow": sellers_now,
        "sellers7dAgo": sellers_7d_ago,
        "sellerDeltaPct": seller_delta_pct,
        "priceCrashRisk": price_crash_risk,
        "trendLabel": (
            "🔴 High Risk: Potential Price Crash" if price_crash_risk
            else "🟡 Moderate" if seller_delta_pct > 10
            else "🟢 Stable"
        ),
    }


# ===================================================================
# 3. SALES TAX
# ===================================================================

STATE_TAX_RATES: dict[str, float] = {
    "AL": 0.04, "AK": 0.0, "AZ": 0.056, "AR": 0.065, "CA": 0.0725,
    "CO": 0.029, "CT": 0.0635, "DE": 0.0, "FL": 0.06, "GA": 0.04,
    "HI": 0.04, "ID": 0.06, "IL": 0.0625, "IN": 0.07, "IA": 0.06,
    "KS": 0.065, "KY": 0.06, "LA": 0.0445, "ME": 0.055, "MD": 0.06,
    "MA": 0.0625, "MI": 0.06, "MN": 0.06875, "MS": 0.07, "MO": 0.04225,
    "MT": 0.0, "NE": 0.055, "NV": 0.0685, "NH": 0.0, "NJ": 0.06625,
    "NM": 0.05125, "NY": 0.04, "NC": 0.0475, "ND": 0.05, "OH": 0.0575,
    "OK": 0.045, "OR": 0.0, "PA": 0.06, "RI": 0.07, "SC": 0.06,
    "SD": 0.045, "TN": 0.07, "TX": 0.0625, "UT": 0.061, "VT": 0.06,
    "VA": 0.053, "WA": 0.065, "WV": 0.06, "WI": 0.05, "WY": 0.04,
    "DC": 0.06, "PR": 0.115,
}

ZIP_TO_STATE: dict[str, str] = {
    "006":"PR","007":"PR","008":"PR","009":"PR",
    "010":"MA","011":"MA","012":"MA","013":"MA","014":"MA","015":"MA","016":"MA","017":"MA","018":"MA","019":"MA",
    "020":"MA","021":"MA","022":"MA","023":"MA","024":"MA","025":"MA","026":"MA","027":"MA",
    "028":"RI","029":"RI",
    "030":"NH","031":"NH","032":"NH","033":"NH","034":"NH",
    "035":"VT","036":"VT","037":"VT","038":"VT","039":"ME",
    "040":"ME","041":"ME","042":"ME","043":"ME","044":"ME","045":"ME","046":"ME","047":"ME","048":"ME","049":"ME",
    "050":"VT","051":"VT","052":"VT","053":"VT","054":"VT",
    "055":"MN","056":"MN","057":"SD","058":"ND","059":"MT",
    "060":"CT","061":"CT","062":"CT","063":"CT","064":"CT","065":"CT","066":"CT","067":"CT","068":"CT","069":"CT",
    "070":"NJ","071":"NJ","072":"NJ","073":"NJ","074":"NJ","075":"NJ","076":"NJ","077":"NJ","078":"NJ","079":"NJ",
    "080":"NJ","081":"NJ","082":"NJ","083":"NJ","084":"NJ","085":"NJ","086":"NJ","087":"NJ","088":"NJ","089":"NJ",
    "100":"NY","101":"NY","102":"NY","103":"NY","104":"NY","105":"NY","106":"NY","107":"NY","108":"NY","109":"NY",
    "110":"NY","111":"NY","112":"NY","113":"NY","114":"NY","115":"NY","116":"NY","117":"NY","118":"NY","119":"NY",
    "120":"NY","121":"NY","122":"NY","123":"NY","124":"NY","125":"NY","126":"NY","127":"NY","128":"NY","129":"NY",
    "130":"NY","131":"NY","132":"NY","133":"NY","134":"NY","135":"NY","136":"NY","137":"NY","138":"NY","139":"NY",
    "140":"NY","141":"NY","142":"NY","143":"NY","144":"NY","145":"NY","146":"NY","147":"NY","148":"NY","149":"NY",
    "150":"PA","151":"PA","152":"PA","153":"PA","154":"PA","155":"PA","156":"PA","157":"PA","158":"PA","159":"PA",
    "160":"PA","161":"PA","162":"PA","163":"PA","164":"PA","165":"PA","166":"PA","167":"PA","168":"PA","169":"PA",
    "170":"PA","171":"PA","172":"PA","173":"PA","174":"PA","175":"PA","176":"PA","177":"PA","178":"PA","179":"PA",
    "180":"PA","181":"PA","182":"PA","183":"PA","184":"PA","185":"PA","186":"PA","187":"PA","188":"PA","189":"PA",
    "190":"PA","191":"PA","192":"PA","193":"PA","194":"PA",
    "195":"DE","196":"DE","197":"DE","198":"DE","199":"DE",
    "200":"DC","201":"VA","202":"DC","203":"DC","204":"DC","205":"DC",
    "206":"MD","207":"MD","208":"MD","209":"MD","210":"MD","211":"MD","212":"MD","214":"MD","215":"MD","216":"MD","217":"MD","218":"MD","219":"MD",
    "220":"VA","221":"VA","222":"VA","223":"VA","224":"VA","225":"VA","226":"VA","227":"VA","228":"VA","229":"VA",
    "230":"VA","231":"VA","232":"VA","233":"VA","234":"VA","235":"VA","236":"VA","237":"VA","238":"VA","239":"VA","240":"VA",
    "241":"WV","242":"WV","243":"WV","244":"WV","245":"WV","246":"WV","247":"WV","248":"WV","249":"WV",
    "250":"WV","251":"WV","252":"WV","253":"WV","254":"WV","255":"WV","256":"WV","257":"WV","258":"WV","259":"WV",
    "260":"WV","261":"WV","262":"WV","263":"WV","264":"WV","265":"WV","266":"WV","267":"WV","268":"WV",
    "270":"NC","271":"NC","272":"NC","273":"NC","274":"NC","275":"NC","276":"NC","277":"NC","278":"NC","279":"NC",
    "280":"NC","281":"NC","282":"NC","283":"NC","284":"NC","285":"NC","286":"NC","287":"NC","288":"NC","289":"NC",
    "290":"SC","291":"SC","292":"SC","293":"SC","294":"SC","295":"SC","296":"SC","297":"SC","298":"SC","299":"SC",
    "300":"GA","301":"GA","302":"GA","303":"GA","304":"GA","305":"GA","306":"GA","307":"GA","308":"GA","309":"GA",
    "310":"GA","311":"GA","312":"GA","313":"GA","314":"GA","315":"GA","316":"GA","317":"GA","318":"GA","319":"GA",
    "320":"FL","321":"FL","322":"FL","323":"FL","324":"FL","325":"FL","326":"FL","327":"FL","328":"FL","329":"FL",
    "330":"FL","331":"FL","332":"FL","333":"FL","334":"FL","335":"FL","336":"FL","337":"FL","338":"FL","339":"FL","340":"FL",
    "350":"AL","351":"AL","352":"AL","354":"AL","355":"AL","356":"AL","357":"AL","358":"AL","359":"AL",
    "360":"AL","361":"AL","362":"AL","363":"AL","364":"AL","365":"AL","366":"AL","367":"AL","368":"AL","369":"AL",
    "370":"TN","371":"TN","372":"TN","373":"TN","374":"TN","375":"TN","376":"TN","377":"TN","378":"TN","379":"TN",
    "380":"TN","381":"TN","382":"TN","383":"TN","384":"TN","385":"TN",
    "386":"MS","387":"MS","388":"MS","389":"MS","390":"MS","391":"MS","392":"MS","393":"MS","394":"MS","395":"MS","396":"MS","397":"MS",
    "400":"KY","401":"KY","402":"KY","403":"KY","404":"KY","405":"KY","406":"KY","407":"KY","408":"KY","409":"KY",
    "410":"KY","411":"KY","412":"KY","413":"KY","414":"KY","415":"KY","416":"KY","417":"KY","418":"KY",
    "420":"KY","421":"KY","422":"KY","423":"KY","424":"KY","425":"KY","426":"KY","427":"KY",
    "430":"OH","431":"OH","432":"OH","433":"OH","434":"OH","435":"OH","436":"OH","437":"OH","438":"OH","439":"OH",
    "440":"OH","441":"OH","442":"OH","443":"OH","444":"OH","445":"OH","446":"OH","447":"OH","448":"OH","449":"OH",
    "450":"OH","451":"OH","452":"OH","453":"OH","454":"OH","455":"OH","456":"OH","457":"OH","458":"OH",
    "460":"IN","461":"IN","462":"IN","463":"IN","464":"IN","465":"IN","466":"IN","467":"IN","468":"IN","469":"IN",
    "470":"IN","471":"IN","472":"IN","473":"IN","474":"IN","475":"IN","476":"IN","477":"IN","478":"IN","479":"IN",
    "480":"MI","481":"MI","482":"MI","483":"MI","484":"MI","485":"MI","486":"MI","487":"MI","488":"MI","489":"MI",
    "490":"MI","491":"MI","492":"MI","493":"MI","494":"MI","495":"MI","496":"MI","497":"MI","498":"MI","499":"MI",
    "500":"IA","501":"IA","502":"IA","503":"IA","504":"IA","505":"IA","506":"IA","507":"IA","508":"IA","509":"IA",
    "510":"IA","511":"IA","512":"IA","513":"IA","514":"IA","515":"IA","516":"IA",
    "520":"WI","521":"WI","522":"WI","523":"WI","524":"WI","525":"WI","526":"WI","527":"WI","528":"WI","529":"WI",
    "530":"WI","531":"WI","532":"WI","534":"WI","535":"WI","537":"WI","538":"WI","539":"WI",
    "540":"MN","541":"MN","542":"MN","543":"MN","544":"MN","545":"MN","546":"MN","547":"MN","548":"MN","549":"MN",
    "550":"MN","551":"MN","553":"MN","554":"MN","555":"MN","556":"MN","557":"MN","558":"MN","559":"MN",
    "560":"SD","561":"SD","562":"SD","563":"SD","564":"SD","565":"SD","566":"SD","567":"SD",
    "570":"ND","571":"ND","572":"ND","573":"ND","574":"ND","575":"ND","576":"ND","577":"ND","578":"ND","579":"ND",
    "580":"ND","581":"ND","582":"ND","583":"ND","584":"ND",
    "585":"MT","586":"MT","587":"MT","588":"MT","589":"MT","590":"MT","591":"MT","592":"MT","593":"MT","594":"MT","595":"MT","596":"MT","597":"MT","598":"MT","599":"MT",
    "600":"IL","601":"IL","602":"IL","603":"IL","604":"IL","605":"IL","606":"IL","607":"IL","608":"IL","609":"IL",
    "610":"IL","611":"IL","612":"IL","613":"IL","614":"IL","615":"IL","616":"IL","617":"IL","618":"IL","619":"IL",
    "620":"IL","621":"IL","622":"IL","623":"IL","624":"IL","625":"IL","626":"IL","627":"IL","628":"IL","629":"IL",
    "630":"MO","631":"MO","633":"MO","634":"MO","635":"MO","636":"MO","637":"MO","638":"MO","639":"MO",
    "640":"MO","641":"MO","644":"MO","645":"MO","646":"MO","647":"MO","648":"MO","649":"MO",
    "650":"MO","651":"MO","652":"MO","653":"MO","654":"MO","655":"MO","656":"MO","657":"MO","658":"MO",
    "660":"KS","661":"KS","662":"KS","664":"KS","665":"KS","666":"KS","667":"KS","668":"KS","669":"KS",
    "670":"KS","671":"KS","672":"KS","673":"KS","674":"KS","675":"KS","676":"KS","677":"KS","678":"KS","679":"KS",
    "680":"NE","681":"NE","683":"NE","684":"NE","685":"NE","686":"NE","687":"NE","688":"NE","689":"NE",
    "690":"NE","691":"NE","692":"NE","693":"NE",
    "700":"LA","701":"LA","703":"LA","704":"LA","705":"LA","706":"LA","707":"LA","708":"LA","710":"LA","711":"LA","712":"LA","713":"LA","714":"LA",
    "716":"AR","717":"AR","718":"AR","719":"AR","720":"AR","721":"AR","722":"AR","723":"AR","724":"AR","725":"AR","726":"AR","727":"AR","728":"AR","729":"AR",
    "730":"OK","731":"OK","734":"OK","735":"OK","736":"OK","737":"OK","738":"OK","739":"OK","740":"OK","741":"OK","743":"OK","744":"OK","745":"OK","746":"OK","747":"OK","748":"OK","749":"OK",
    "750":"TX","751":"TX","752":"TX","753":"TX","754":"TX","755":"TX","756":"TX","757":"TX","758":"TX","759":"TX",
    "760":"TX","761":"TX","762":"TX","763":"TX","764":"TX","765":"TX","766":"TX","767":"TX","768":"TX","769":"TX",
    "770":"TX","771":"TX","772":"TX","773":"TX","774":"TX","775":"TX","776":"TX","777":"TX","778":"TX","779":"TX",
    "780":"TX","781":"TX","782":"TX","783":"TX","784":"TX","785":"TX","786":"TX","787":"TX","788":"TX","789":"TX",
    "790":"TX","791":"TX","792":"TX","793":"TX","794":"TX","795":"TX","796":"TX","797":"TX","798":"TX","799":"TX",
    "800":"CO","801":"CO","802":"CO","803":"CO","804":"CO","805":"CO","806":"CO","807":"CO","808":"CO","809":"CO",
    "810":"CO","811":"CO","812":"CO","813":"CO","814":"CO","815":"CO","816":"CO",
    "820":"WY","821":"WY","822":"WY","823":"WY","824":"WY","825":"WY","826":"WY","827":"WY","828":"WY","829":"WY","830":"WY","831":"WY",
    "832":"ID","833":"ID","834":"ID","835":"ID","836":"ID","837":"ID","838":"ID",
    "840":"UT","841":"UT","842":"UT","843":"UT","844":"UT","845":"UT","846":"UT","847":"UT",
    "850":"AZ","851":"AZ","852":"AZ","853":"AZ","855":"AZ","856":"AZ","857":"AZ","858":"AZ","859":"AZ","860":"AZ","863":"AZ","864":"AZ","865":"AZ",
    "870":"NM","871":"NM","872":"NM","873":"NM","874":"NM","875":"NM","877":"NM","878":"NM","879":"NM",
    "880":"TX","881":"TX","882":"TX","883":"TX","884":"TX","885":"TX",
    "889":"NV","890":"NV","891":"NV","893":"NV","894":"NV","895":"NV","897":"NV","898":"NV",
    "900":"CA","901":"CA","902":"CA","903":"CA","904":"CA","905":"CA","906":"CA","907":"CA","908":"CA","909":"CA",
    "910":"CA","911":"CA","912":"CA","913":"CA","914":"CA","915":"CA","916":"CA","917":"CA","918":"CA","919":"CA",
    "920":"CA","921":"CA","922":"CA","923":"CA","924":"CA","925":"CA","926":"CA","927":"CA","928":"CA",
    "930":"CA","931":"CA","932":"CA","933":"CA","934":"CA","935":"CA","936":"CA","937":"CA","938":"CA","939":"CA",
    "940":"CA","941":"CA","942":"CA","943":"CA","944":"CA","945":"CA","946":"CA","947":"CA","948":"CA","949":"CA",
    "950":"CA","951":"CA","952":"CA","953":"CA","954":"CA","955":"CA","956":"CA","957":"CA","958":"CA","959":"CA","960":"CA","961":"CA",
    "967":"HI","968":"HI",
    "970":"OR","971":"OR","972":"OR","973":"OR","974":"OR","975":"OR","976":"OR","977":"OR","978":"OR","979":"OR",
    "980":"WA","981":"WA","982":"WA","983":"WA","984":"WA","985":"WA","986":"WA","988":"WA","989":"WA",
    "990":"WA","991":"WA","992":"WA","993":"WA","994":"WA",
    "995":"AK","996":"AK","997":"AK","998":"AK","999":"AK",
}


def get_sales_tax_rate(zip_code: str) -> tuple[float, str]:
    prefix = zip_code[:3]
    state = ZIP_TO_STATE.get(prefix)
    if state:
        return STATE_TAX_RATES.get(state, 0.06), state
    return 0.06, "??"


# ===================================================================
# 4. RESTOCK RADAR — SQLite schema
# ===================================================================

DB_PATH = os.getenv("RESTOCK_DB_PATH", "restock_radar.db")


def _init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS stock_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sku INTEGER NOT NULL,
        store_id INTEGER NOT NULL, zip_code TEXT NOT NULL,
        in_stock BOOLEAN NOT NULL, low_stock BOOLEAN DEFAULT 0,
        quantity_est INTEGER DEFAULT NULL, recorded_at REAL NOT NULL,
        UNIQUE(sku, store_id, recorded_at))""")
    c.execute("CREATE INDEX IF NOT EXISTS idx_stock_sku_store ON stock_snapshots(sku, store_id)")
    c.execute("""CREATE TABLE IF NOT EXISTS restock_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sku INTEGER NOT NULL,
        store_id INTEGER NOT NULL, went_oos_at REAL, restocked_at REAL, gap_hours REAL)""")
    c.execute("CREATE INDEX IF NOT EXISTS idx_restock_sku ON restock_events(sku, store_id)")
    # My Finds — saved products with sold tracking
    c.execute("""CREATE TABLE IF NOT EXISTS my_finds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku INTEGER NOT NULL, product_name TEXT NOT NULL,
        category_id TEXT, aisle TEXT,
        store_buy_price REAL NOT NULL, cogs REAL NOT NULL,
        amazon_sell_price REAL, best_roi REAL,
        best_method TEXT, good_buy BOOLEAN,
        zip_code TEXT, store_id INTEGER,
        status TEXT DEFAULT 'scouted',
        sold_price REAL, sold_platform TEXT, sold_at REAL,
        scanned_at REAL NOT NULL, notes TEXT,
        scan_lat REAL, scan_lng REAL,
        analysis_json TEXT)""")
    c.execute("CREATE INDEX IF NOT EXISTS idx_finds_status ON my_finds(status)")
    # Scan history with hot-map location data
    c.execute("""CREATE TABLE IF NOT EXISTS scan_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku INTEGER, product_name TEXT, category_id TEXT,
        zip_code TEXT, store_id INTEGER,
        scan_lat REAL, scan_lng REAL,
        scanned_at REAL NOT NULL)""")
    # Receipt images linked to sourcing trips
    c.execute("""CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_label TEXT, store_id INTEGER,
        image_data TEXT, notes TEXT,
        captured_at REAL NOT NULL)""")
    # Success stories — global community feed
    c.execute("""CREATE TABLE IF NOT EXISTS success_stories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_handle TEXT DEFAULT 'Anonymous',
        product_name TEXT NOT NULL,
        profit_amount REAL NOT NULL,
        store_name TEXT DEFAULT '',
        sold_platform TEXT DEFAULT '',
        category TEXT DEFAULT '',
        emoji TEXT DEFAULT '🎉',
        posted_at REAL NOT NULL)""")
    c.execute("CREATE INDEX IF NOT EXISTS idx_stories_posted ON success_stories(posted_at DESC)")
    # Chat messages — global community chat
    c.execute("""CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_handle TEXT DEFAULT 'Anonymous',
        message TEXT NOT NULL,
        msg_type TEXT DEFAULT 'text',
        product_data TEXT DEFAULT '',
        posted_at REAL NOT NULL)""")
    c.execute("CREATE INDEX IF NOT EXISTS idx_chat_posted ON chat_messages(posted_at DESC)")
    # User feedback
    c.execute("""CREATE TABLE IF NOT EXISTS user_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_handle TEXT DEFAULT 'Anonymous',
        message TEXT NOT NULL,
        rating INTEGER NOT NULL,
        posted_at REAL NOT NULL)""")
    conn.commit()
    conn.close()


_init_db()


def record_stock_snapshot(sku: int, store_id: int, zip_code: str, in_stock: bool, low_stock: bool = False, quantity_est: int | None = None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT OR IGNORE INTO stock_snapshots (sku,store_id,zip_code,in_stock,low_stock,quantity_est,recorded_at) VALUES (?,?,?,?,?,?,?)",
              (sku, store_id, zip_code, in_stock, low_stock, quantity_est, time.time()))
    conn.commit()
    conn.close()


# ===================================================================
# 5. HAZMAT / SAFETY — Category-based flagging
# ===================================================================

HAZMAT_CATEGORIES: set[str] = {
    "abcat0904000",         # Small Kitchen Appliances (lithium batteries)
    "pcmcat242800050021",   # Smartwatches (lithium batteries)
    "pcmcat241600050001",   # Tablets (lithium batteries)
    "abcat0502000",         # Laptops (lithium batteries)
}

HAZMAT_KEYWORDS: list[str] = [
    "battery", "lithium", "perfume", "aerosol", "nail polish",
    "flammable", "butane", "spray paint", "essential oil",
    "sunscreen", "hand sanitizer",
]


def check_hazmat(product_name: str, category_id: str) -> dict:
    lower = product_name.lower()
    keyword_hit = next((kw for kw in HAZMAT_KEYWORDS if kw in lower), None)
    cat_hit = category_id in HAZMAT_CATEGORIES
    is_hazmat = keyword_hit is not None or cat_hit
    reasons = []
    if cat_hit:
        reasons.append("Category may contain lithium batteries")
    if keyword_hit:
        reasons.append(f"Keyword match: '{keyword_hit}'")
    return {
        "isHazmat": is_hazmat,
        "reasons": reasons,
        "warning": "⚠️ Hazmat/Safety: May require special shipping or ungating" if is_hazmat else None,
    }



# ===================================================================
# 7. VIRAL RADAR — Velocity spike + social signal detection
# ===================================================================

SOCIAL_TRENDING_KEYWORDS: dict[str, list[str]] = {
    "tiktok": ["needoh", "squishmallow", "stanley cup", "airpods", "dyson airwrap",
               "lego botanicals", "kindle", "olaplex", "air fryer", "crocs"],
    "instagram": ["gopro", "fujifilm instax", "beats studio", "nintendo switch",
                   "kitchenaid", "yeti", "sonos", "bose", "apple watch"],
}

VELOCITY_BASELINE: dict[str, int] = {
    "abcat0502000": 80, "abcat0101000": 40, "pcmcat209400050001": 120,
    "abcat0204000": 50, "pcmcat241600050001": 90, "abcat0904000": 100,
    "pcmcat242800050021": 70, "pcmcat748302702702": 60,
    "abcat0811001": 110, "pcmcat332000050000": 45,
}


def detect_viral(product_name: str, category_id: str, monthly_sales: int, sku: int) -> dict:
    """Detect velocity spikes (3x+ baseline) and social media trending signals."""
    name_lower = product_name.lower()

    # Social signal detection
    social_platforms: list[str] = []
    social_keywords: list[str] = []
    for platform, keywords in SOCIAL_TRENDING_KEYWORDS.items():
        for kw in keywords:
            if kw in name_lower:
                social_platforms.append(platform)
                social_keywords.append(kw)
                break

    has_social_signal = len(social_platforms) > 0

    # Velocity spike detection — compare to category baseline
    baseline = VELOCITY_BASELINE.get(category_id, 60)
    random.seed(sku + 42)
    # Simulate current vs historical velocity
    historical_avg = max(5, baseline + random.randint(-30, 20))
    current_velocity = monthly_sales
    velocity_multiplier = round(current_velocity / max(1, historical_avg), 1)
    velocity_spike = velocity_multiplier >= 3.0
    random.seed()

    is_viral = velocity_spike or (has_social_signal and velocity_multiplier >= 2.0)

    # Low stock simulation (viral items tend to sell out)
    random.seed(sku + 99)
    low_stock = is_viral and random.random() < 0.6
    stock_estimate = random.randint(1, 5) if low_stock else random.randint(10, 50)
    random.seed()

    return {
        "isViral": is_viral,
        "velocitySpike": velocity_spike,
        "velocityMultiplier": velocity_multiplier,
        "historicalAvgSales": historical_avg,
        "currentVelocity": current_velocity,
        "hasSocialSignal": has_social_signal,
        "socialPlatforms": social_platforms,
        "socialKeywords": social_keywords,
        "lowStock": low_stock,
        "stockEstimate": stock_estimate,
        "viralLabel": (
            "🚀 VIRAL — TikTok Trending" if is_viral and "tiktok" in social_platforms
            else "🚀 VIRAL — IG Trending" if is_viral and "instagram" in social_platforms
            else "🚀 VIRAL — Velocity Spike" if is_viral
            else "📈 Gaining Momentum" if velocity_multiplier >= 2.0
            else None
        ),
    }


# ===================================================================
# 6. AMAZON PRESENCE & BUY BOX — Mock
# ===================================================================

def _mock_amazon_listing(sku: int) -> dict:
    random.seed(sku + 7)
    amazon_is_seller = random.random() < 0.35
    num_fba = random.randint(1, 15)
    num_fbm = random.randint(0, 10)
    buy_box_owner_type = random.choice(["FBA", "FBA", "FBA", "FBM", "Amazon"])
    buy_box_price = None  # filled by caller
    random.seed()
    return {
        "amazonIsSeller": amazon_is_seller,
        "buyBoxOwnerType": buy_box_owner_type,
        "buyBoxPrice": buy_box_price,
        "fbaSellerCount": num_fba,
        "fbmSellerCount": num_fbm,
        "totalSellerCount": num_fba + num_fbm + (1 if amazon_is_seller else 0),
    }


# ===================================================================
# AISLE LOGIC — category-based mock aisle assignment
# ===================================================================

CATEGORY_AISLE_MAP: dict[str, list[str]] = {
    "abcat0502000": ["A12", "A13", "A14"],
    "abcat0101000": ["B01", "B02", "B03"],
    "pcmcat209400050001": ["C05", "C06"],
    "abcat0204000": ["D02", "D03"],
    "pcmcat241600050001": ["A15", "A16"],
    "abcat0904000": ["E10", "E11", "E12"],
    "pcmcat242800050021": ["C07", "C08"],
    "pcmcat748302702702": ["F01", "F02", "F03"],
    "abcat0811001": ["G01", "G02", "G03", "G04"],
    "pcmcat332000050000": ["H01", "H02"],
}


def get_aisle(category_id: str, sku: int) -> str | None:
    aisles = CATEGORY_AISLE_MAP.get(category_id)
    if not aisles:
        return None
    return aisles[sku % len(aisles)]


# ===================================================================
# Shipping Calculator
# ===================================================================

REFERRAL_FEE_RATE = 0.15
FBA_FULFILLMENT_FEE = 4.00
FBA_STORAGE_FEE = 0.15
FBA_INBOUND_SHIPPING_PER_LB = 0.30


def estimate_shipping_rates(weight_lbs: float) -> dict:
    if weight_lbs <= 0:
        weight_lbs = 1.0
    if weight_lbs < 1:
        usps = round(3.50 + weight_lbs * 1.5, 2)
        fedex = round(7.50 + weight_lbs * 0.8, 2)
        ups = round(8.00 + weight_lbs * 0.9, 2)
    elif weight_lbs <= 5:
        usps = round(5.00 + (weight_lbs - 1) * 1.00, 2)
        fedex = round(7.00 + (weight_lbs - 1) * 1.20, 2)
        ups = round(7.50 + (weight_lbs - 1) * 1.30, 2)
    elif weight_lbs <= 10:
        usps = round(9.00 + (weight_lbs - 5) * 1.50, 2)
        fedex = round(9.50 + (weight_lbs - 5) * 1.10, 2)
        ups = round(10.00 + (weight_lbs - 5) * 1.00, 2)
    else:
        usps = round(16.50 + (weight_lbs - 10) * 1.80, 2)
        fedex = round(13.00 + (weight_lbs - 10) * 0.90, 2)
        ups = round(10.00 + (weight_lbs - 10) * 0.50 + 5 * 1.00, 2)
    return {
        "usps": {"carrier": "USPS", "service": "Ground Advantage" if weight_lbs <= 10 else "Priority Mail", "cost": usps},
        "fedex": {"carrier": "FedEx", "service": "Ground" if weight_lbs > 5 else "Home Delivery", "cost": fedex},
        "ups": {"carrier": "UPS", "service": "Ground", "cost": ups},
    }


def cheapest_shipping(rates: dict) -> dict:
    return min(rates.values(), key=lambda r: r["cost"])


# ===================================================================
# Category weight ranges
# ===================================================================

CATEGORY_WEIGHT_RANGES: dict[str, tuple[float, float]] = {
    "abcat0502000": (3.0, 7.0), "abcat0101000": (25.0, 55.0),
    "pcmcat209400050001": (0.3, 1.5), "abcat0204000": (1.0, 4.0),
    "pcmcat241600050001": (1.0, 3.0), "abcat0904000": (3.0, 20.0),
    "pcmcat242800050021": (0.2, 0.8), "pcmcat748302702702": (2.0, 12.0),
    "abcat0811001": (1.0, 12.0), "pcmcat332000050000": (1.0, 5.0),
}


# ===================================================================
# Mock data
# ===================================================================

# State-aware mock store generation
STATE_STORE_DATA: dict[str, list[dict]] = {
    "CA": [
        {"city": "Los Angeles", "area": "Hollywood", "lat": 34.0522, "lng": -118.2437},
        {"city": "Los Angeles", "area": "Westwood", "lat": 34.0596, "lng": -118.4452},
        {"city": "Burbank", "area": "Empire Center", "lat": 34.1808, "lng": -118.3090},
        {"city": "Glendale", "area": "Galleria", "lat": 34.1425, "lng": -118.2551},
        {"city": "Torrance", "area": "Del Amo", "lat": 33.8313, "lng": -118.3510},
    ],
    "NY": [
        {"city": "New York", "area": "Union Square", "lat": 40.7359, "lng": -73.9911},
        {"city": "New York", "area": "Herald Square", "lat": 40.7484, "lng": -73.9879},
        {"city": "Brooklyn", "area": "Atlantic Terminal", "lat": 40.6845, "lng": -73.9788},
        {"city": "Queens", "area": "Rego Park", "lat": 40.7260, "lng": -73.8564},
        {"city": "Bronx", "area": "Bay Plaza", "lat": 40.8712, "lng": -73.8352},
    ],
    "TX": [
        {"city": "Houston", "area": "Galleria", "lat": 29.7604, "lng": -95.3698},
        {"city": "Houston", "area": "Meyerland", "lat": 29.6868, "lng": -95.4502},
        {"city": "Sugar Land", "area": "First Colony", "lat": 29.5938, "lng": -95.6250},
        {"city": "Katy", "area": "Grand Parkway", "lat": 29.7858, "lng": -95.8077},
        {"city": "Pearland", "area": "Town Center", "lat": 29.5636, "lng": -95.2860},
    ],
    "FL": [
        {"city": "Miami", "area": "Midtown", "lat": 25.7617, "lng": -80.1918},
        {"city": "Miami", "area": "Dadeland", "lat": 25.6906, "lng": -80.3139},
        {"city": "Fort Lauderdale", "area": "Sawgrass", "lat": 26.1551, "lng": -80.3215},
        {"city": "Coral Springs", "area": "University", "lat": 26.2712, "lng": -80.2706},
        {"city": "Hialeah", "area": "Westland", "lat": 25.8576, "lng": -80.2781},
    ],
    "IL": [
        {"city": "Chicago", "area": "Mag Mile", "lat": 41.8781, "lng": -87.6298},
        {"city": "Chicago", "area": "Lincoln Park", "lat": 41.9217, "lng": -87.6524},
        {"city": "Schaumburg", "area": "Woodfield", "lat": 42.0334, "lng": -88.0834},
        {"city": "Naperville", "area": "Route 59", "lat": 41.7508, "lng": -88.1535},
        {"city": "Orland Park", "area": "Orland Square", "lat": 41.6186, "lng": -87.8539},
    ],
    "PA": [
        {"city": "Philadelphia", "area": "Center City", "lat": 39.9526, "lng": -75.1652},
        {"city": "Philadelphia", "area": "King of Prussia", "lat": 40.0898, "lng": -75.3843},
        {"city": "Willow Grove", "area": "Willow Grove Park", "lat": 40.1437, "lng": -75.1146},
        {"city": "Plymouth Meeting", "area": "Plymouth Meeting Mall", "lat": 40.1049, "lng": -75.2835},
        {"city": "Springfield", "area": "Springfield Mall", "lat": 39.9312, "lng": -75.3299},
    ],
    "OH": [
        {"city": "Columbus", "area": "Polaris", "lat": 40.1489, "lng": -82.9769},
        {"city": "Columbus", "area": "Easton", "lat": 40.0502, "lng": -82.9159},
        {"city": "Dublin", "area": "Tuttle Crossing", "lat": 40.0992, "lng": -83.1499},
        {"city": "Westerville", "area": "Shoppes at Westerville", "lat": 40.1180, "lng": -82.8874},
        {"city": "Reynoldsburg", "area": "Eastland", "lat": 39.9573, "lng": -82.7960},
    ],
    "GA": [
        {"city": "Atlanta", "area": "Atlantic Station", "lat": 33.7908, "lng": -84.3953},
        {"city": "Atlanta", "area": "Buckhead", "lat": 33.8407, "lng": -84.3798},
        {"city": "Duluth", "area": "Gwinnett Place", "lat": 34.0018, "lng": -84.1460},
        {"city": "Kennesaw", "area": "Town Center", "lat": 34.0234, "lng": -84.6155},
        {"city": "Morrow", "area": "Southlake", "lat": 33.5834, "lng": -84.3388},
    ],
    "WA": [
        {"city": "Seattle", "area": "Northgate", "lat": 47.7085, "lng": -122.3229},
        {"city": "Bellevue", "area": "Bellevue Square", "lat": 47.6159, "lng": -122.2046},
        {"city": "Lynnwood", "area": "Alderwood", "lat": 47.8318, "lng": -122.2779},
        {"city": "Tukwila", "area": "Westfield", "lat": 47.4600, "lng": -122.2588},
        {"city": "Federal Way", "area": "The Commons", "lat": 47.3132, "lng": -122.3124},
    ],
    "NJ": [
        {"city": "Paramus", "area": "Garden State Plaza", "lat": 40.9176, "lng": -74.0755},
        {"city": "Wayne", "area": "Willowbrook", "lat": 40.8876, "lng": -74.2564},
        {"city": "Eatontown", "area": "Monmouth Mall", "lat": 40.2901, "lng": -74.0502},
        {"city": "Edison", "area": "Menlo Park", "lat": 40.5504, "lng": -74.3421},
        {"city": "Union", "area": "Route 22", "lat": 40.6973, "lng": -74.2631},
    ],
    "MA": [
        {"city": "Worcester", "area": "Lincoln Plaza", "lat": 42.2626, "lng": -71.8023},
        {"city": "Shrewsbury", "area": "White City", "lat": 42.2959, "lng": -71.7142},
        {"city": "Millbury", "area": "Shoppes at Blackstone", "lat": 42.1939, "lng": -71.7617},
        {"city": "Framingham", "area": "Shoppers World", "lat": 42.3001, "lng": -71.4162},
        {"city": "Marlborough", "area": "Solomon Pond", "lat": 42.3473, "lng": -71.5681},
    ],
}

# Fallback for states not explicitly listed
DEFAULT_STORE_DATA = [
    {"city": "Downtown", "area": "Main St", "lat": 39.8, "lng": -89.6},
    {"city": "Westside", "area": "Mall Blvd", "lat": 39.78, "lng": -89.65},
    {"city": "Eastgate", "area": "Commerce Dr", "lat": 39.76, "lng": -89.59},
    {"city": "Northpark", "area": "Airport Rd", "lat": 39.74, "lng": -89.72},
    {"city": "Southfield", "area": "Retail Way", "lat": 39.73, "lng": -90.22},
]

STORE_TYPES = ["Big Box", "Big Box", "Big Box", "Big Box", "Express Kiosk"]
STREET_NUMBERS = [100, 250, 400, 800, 1500, 2100, 3000, 4500, 6200]
STREET_NAMES = ["Main St", "Commerce Dr", "Retail Way", "Mall Blvd", "Town Center Dr",
                "Market St", "Broadway", "Tech Park Dr", "Gateway Blvd", "Lakeside Ave"]


def _generate_mock_stores(zip_code: str, radius: int) -> list[dict]:
    """Generate realistic mock stores based on user's ZIP code state."""
    _, state = get_sales_tax_rate(zip_code)
    store_data = STATE_STORE_DATA.get(state, DEFAULT_STORE_DATA)

    random.seed(hash(zip_code))
    stores = []
    for i, sd in enumerate(store_data):
        dist = round(random.uniform(1.0, min(radius * 0.9, 30.0)) * (1 + i * 0.5), 1)
        if dist > radius:
            continue
        area_suffix = sd.get("area", "")
        city = sd["city"]
        st_num = random.choice(STREET_NUMBERS)
        st_name = random.choice(STREET_NAMES)
        phone_area = zip_code[:3]
        stores.append({
            "storeId": 1001 + i,
            "name": f"Best Buy - {area_suffix}" if area_suffix else f"Best Buy - {city}",
            "city": city,
            "region": state if state != "??" else "US",
            "address": f"{st_num} {st_name}",
            "phone": f"{phone_area}-555-{random.randint(1000,9999)}",
            "distance": dist,
            "storeType": STORE_TYPES[i % len(STORE_TYPES)],
            "lat": sd["lat"] + random.uniform(-0.02, 0.02),
            "lng": sd["lng"] + random.uniform(-0.02, 0.02),
        })
    random.seed()
    return stores

MOCK_CATEGORIES = [
    {"id":"abcat0502000","name":"Laptops"},{"id":"abcat0101000","name":"TVs"},
    {"id":"pcmcat209400050001","name":"Headphones"},{"id":"abcat0204000","name":"Digital Cameras"},
    {"id":"pcmcat241600050001","name":"Tablets"},{"id":"abcat0904000","name":"Small Kitchen Appliances"},
    {"id":"pcmcat242800050021","name":"Smartwatches"},{"id":"pcmcat748302702702","name":"Home Audio"},
    {"id":"abcat0811001","name":"Video Games"},{"id":"pcmcat332000050000","name":"Networking & Wi-Fi"},
]

MOCK_PRODUCT_NAMES = {
    "abcat0502000":["Apple MacBook Air M3 13\" Laptop - 8GB RAM - 256GB SSD","HP Pavilion 15.6\" Touch Laptop - AMD Ryzen 7 - 16GB","Lenovo IdeaPad Slim 3 14\" - Intel i5 - 512GB SSD","ASUS VivoBook 15 OLED - Ryzen 5 - 8GB RAM","Dell Inspiron 16 2-in-1 - Intel Core i7 - 1TB"],
    "abcat0101000":["Samsung 65\" Class OLED 4K Smart TV","LG 55\" C4 OLED evo 4K Smart TV","Sony 75\" BRAVIA XR X90L 4K HDR TV","TCL 50\" Class S4 4K LED Smart TV","Hisense 65\" U8N Mini-LED ULED 4K TV"],
    "pcmcat209400050001":["Sony WH-1000XM5 Wireless Noise-Canceling Headphones","Apple AirPods Pro (2nd Gen) with USB-C","Bose QuietComfort Ultra Headphones","JBL Tune 770NC Wireless Headphones","Samsung Galaxy Buds3 Pro"],
    "abcat0204000":["Canon EOS R50 Mirrorless Camera with 18-45mm Lens","Sony Alpha a6400 Mirrorless Camera Body","Nikon Z50 Mirrorless Camera Two Lens Kit","GoPro HERO13 Black Action Camera","Fujifilm X-T5 Mirrorless Camera Body"],
    "pcmcat241600050001":["Apple iPad 10th Gen 10.9\" 64GB","Samsung Galaxy Tab S9 FE 10.9\" 128GB","Amazon Fire HD 10 Tablet 32GB","Lenovo Tab M11 11\" 128GB","Apple iPad Air M2 11\" 128GB"],
    "abcat0904000":["Ninja Foodi 6-in-1 10-qt. XL 2-Basket Air Fryer","KitchenAid Artisan Series 5 Quart Stand Mixer","Instant Pot Duo 7-in-1 Electric Pressure Cooker","Vitamix Explorian Blender E310","Keurig K-Supreme SMART Coffee Maker"],
    "pcmcat242800050021":["Apple Watch Series 10 GPS 46mm","Samsung Galaxy Watch7 44mm","Google Pixel Watch 3 41mm","Garmin Venu 3 Smartwatch","Fitbit Sense 2 Health Smartwatch"],
    "pcmcat748302702702":["Sonos Era 300 Wireless Speaker","JBL Charge 5 Portable Bluetooth Speaker","Bose SoundLink Flex Bluetooth Speaker","Marshall Stanmore III Bluetooth Speaker","Sony SRS-XB100 Wireless Speaker"],
    "abcat0811001":["Sony PlayStation 5 Slim Console","Nintendo Switch OLED Model","Xbox Series X 1TB Console","Steam Deck OLED 512GB","Nintendo Switch Lite"],
    "pcmcat332000050000":["TP-Link Deco BE63 Wi-Fi 7 Mesh System (3-Pack)","NETGEAR Nighthawk RAXE500 Tri-Band Wi-Fi 6E Router","eero Pro 6E Mesh Wi-Fi System (3-Pack)","ASUS RT-AXE7800 Tri-Band Wi-Fi 6E Router","TP-Link Archer AX5400 Dual-Band Wi-Fi 6 Router"],
}


CATEGORY_NAME_MAP = {c["id"]: c["name"] for c in MOCK_CATEGORIES}

def _generate_mock_products(category_id: str, store_id: int, count: int = 5):
    names = MOCK_PRODUCT_NAMES.get(category_id, MOCK_PRODUCT_NAMES["abcat0502000"])
    wt_range = CATEGORY_WEIGHT_RANGES.get(category_id, (1.0, 10.0))
    products = []
    for i, name in enumerate(names[:count]):
        sku = abs(6000000 + hash(f"{category_id}-{store_id}-{i}") % 999999)
        regular = round(random.uniform(29.99, 1499.99), 2)
        sale = round(regular * random.uniform(0.70, 1.0), 2)
        weight = round(random.uniform(wt_range[0], wt_range[1]), 1)
        aisle = get_aisle(category_id, sku)
        products.append({
            "sku": sku, "name": name,
            "regularPrice": regular, "salePrice": sale, "onSale": sale < regular,
            "weight": weight, "aisle": aisle,
            "customerReviewAverage": str(round(random.uniform(3.5, 5.0), 1)),
            "customerReviewCount": random.randint(20, 5000),
            "inStoreAvailability": random.choice([True, True, True, False]),
            "onlineAvailability": random.choice([True, True, False]),
            "image": f"https://placehold.co/200x200/1a1a2e/e94560?text={name.split()[0]}",
            "categoryId": category_id, "categoryName": CATEGORY_NAME_MAP.get(category_id, "Other"), "storeId": store_id,
        })
    return products



# ===================================================================
# AI SCOUT OPINION — Simulated LLM analysis placeholder
# ===================================================================

SEASONAL_ITEMS = {
    "tv": "Q4", "headphone": "Q4", "speaker": "Q4", "console": "Q4",
    "switch": "Q4", "playstation": "Q4", "xbox": "Q4", "air fryer": "Q4",
    "mixer": "Q4", "blender": "Q4", "grill": "Q2", "camera": "Q2",
    "tablet": "Q3", "laptop": "Q3", "watch": "Q4", "fitbit": "Q1",
}

MONTH_TO_QUARTER = {1:"Q1",2:"Q1",3:"Q1",4:"Q2",5:"Q2",6:"Q2",7:"Q3",8:"Q3",9:"Q3",10:"Q4",11:"Q4",12:"Q4"}

def generate_scout_opinion(
    product_name: str, roi: float, monthly_sales: int, competitor_count: int,
    gated: bool, amazon_is_seller: bool, crash_risk: bool,
    demand_score: int, good_buy: bool, weight: float,
) -> str:
    """Simulate an LLM-generated pro tip analyzing trend, seasonality, and competition.
    Structured for easy replacement with a real AI API (OpenAI, Claude, etc.)."""
    import datetime
    name_lower = product_name.lower()
    current_q = MONTH_TO_QUARTER.get(datetime.datetime.now().month, "Q4")

    # Detect peak season match
    peak_q = None
    for keyword, q in SEASONAL_ITEMS.items():
        if keyword in name_lower:
            peak_q = q
            break
    in_season = peak_q == current_q if peak_q else False

    parts = []

    # Seasonality
    if in_season:
        parts.append(f"This is peak season for this category — demand and prices are at their highest right now.")
    elif peak_q:
        parts.append(f"Peak demand is typically in {peak_q}; buying now to sell then could maximize your return.")

    # Competition
    if competitor_count <= 5:
        parts.append("Very low competition — you'd have strong pricing power.")
    elif competitor_count >= 30:
        parts.append("Crowded listing with 30+ sellers; consider a slight undercut to win the Buy Box.")
    elif amazon_is_seller:
        parts.append("Amazon is on this listing, which makes winning the Buy Box harder — FBA might help you compete.")

    # Velocity
    if monthly_sales >= 200:
        parts.append("Excellent sales velocity — this moves fast and won't sit in inventory long.")
    elif monthly_sales >= 50:
        parts.append("Solid sales velocity; expect to sell within 2-4 weeks.")
    elif monthly_sales < 15:
        parts.append("Slow mover — only buy if the margin is worth tying up your capital for a month+.")

    # Gating
    if gated:
        parts.append("Requires ungating approval — verify your account status before buying.")

    # Crash risk
    if crash_risk:
        parts.append("Seller count is spiking — wait 48 hours to see if prices stabilize before committing.")

    # Weight/shipping insight
    if weight > 20:
        parts.append(f"At {weight} lbs, shipping eats into margin — FBA inbound is your best bet.")

    # Final verdict flavor
    if good_buy and roi >= 80:
        parts.append("This is a premium flip opportunity — act fast before stock runs out.")
    elif good_buy:
        parts.append("Solid opportunity that checks all the boxes.")
    elif roi > 30 and not good_buy:
        parts.append("Decent margin but one or more risk factors are holding it back — proceed with caution.")

    if not parts:
        parts.append("Standard opportunity — no major red flags but no standout signals either.")

    return " ".join(parts[:3])


def _generate_profit_analysis(product: dict, zip_code: str = "62701",
                              target_roi: float = 50.0,
                              store_discount_pct: float = 0.0) -> dict:
    store_price_original = product["salePrice"]
    weight = product.get("weight", round(random.uniform(1.0, 10.0), 1))
    category_id = product.get("categoryId", "")
    aisle = product.get("aisle") or get_aisle(category_id, product["sku"])

    # --- Discount Stacker ---
    discount_amount = round(store_price_original * store_discount_pct / 100, 2) if store_discount_pct > 0 else 0.0
    store_price = round(store_price_original - discount_amount, 2)

    # --- IP / Gating ---
    gated, gated_brand = is_gated(product["name"])

    # --- Hazmat ---
    hazmat = check_hazmat(product["name"], category_id)

    # --- Sales tax ---
    tax_rate, tax_state = get_sales_tax_rate(zip_code)
    sales_tax = round(store_price * tax_rate, 2)
    cogs = round(store_price + sales_tax, 2)

    # --- Market trend ---
    market_trend = _mock_market_trend(product["sku"])

    # --- Amazon listing mock ---
    amazon_listing = _mock_amazon_listing(product["sku"])
    amazon_sell_price = round(store_price_original * random.uniform(1.25, 2.10), 2)
    amazon_listing["buyBoxPrice"] = amazon_sell_price

    # Note: viral detection needs monthly_sales which is computed later,
    # so we do a preliminary estimate here and refine after
    _prelim_sales = random.randint(5, 500)

    # --- Shipping rates ---
    shipping_rates = estimate_shipping_rates(weight)
    cheapest = cheapest_shipping(shipping_rates)

    # --- FBM ---
    fbm_referral_fee = round(amazon_sell_price * REFERRAL_FEE_RATE, 2)
    fbm_shipping_cost = cheapest["cost"]
    fbm_total_fees = round(fbm_referral_fee + fbm_shipping_cost, 2)
    fbm_net_revenue = round(amazon_sell_price - fbm_total_fees, 2)
    fbm_profit = round(fbm_net_revenue - cogs, 2)
    fbm_roi = round((fbm_profit / cogs) * 100, 1) if cogs > 0 else 0.0

    # --- FBA ---
    fba_referral_fee = round(amazon_sell_price * REFERRAL_FEE_RATE, 2)
    fba_inbound_shipping = round(weight * FBA_INBOUND_SHIPPING_PER_LB, 2)
    fba_total_fees = round(fba_referral_fee + FBA_FULFILLMENT_FEE + FBA_STORAGE_FEE + fba_inbound_shipping, 2)
    fba_net_revenue = round(amazon_sell_price - fba_total_fees, 2)
    fba_profit = round(fba_net_revenue - cogs, 2)
    fba_roi = round((fba_profit / cogs) * 100, 1) if cogs > 0 else 0.0

    # --- Velocity ---
    amazon_monthly_sales = random.randint(5, 500)
    competitor_count = random.randint(2, 50)
    demand_score = min(100, max(1, int(
        amazon_monthly_sales / 5
        + float(product.get("customerReviewAverage", "4.0")) * 5
        + (10 if product.get("onSale") else 0)
    )))
    positive_velocity = amazon_monthly_sales >= 10

    # --- YES/NO ---
    best_roi = max(fbm_roi, fba_roi)
    best_profit = fbm_profit if fbm_roi >= fba_roi else fba_profit
    best_method = "FBM" if fbm_roi >= fba_roi else "FBA"

    roi_ok = best_roi >= target_roi
    not_gated = not gated
    stable_sellers = not market_trend["priceCrashRisk"]
    good_buy = roi_ok and not_gated and stable_sellers and positive_velocity

    rejection_reasons: list[str] = []
    if not roi_ok:
        rejection_reasons.append(f"ROI {best_roi:.1f}% < {target_roi:.0f}%")
    if gated:
        rejection_reasons.append(f"Gated brand: {gated_brand}")
    if not stable_sellers:
        rejection_reasons.append("Seller count spike >20%")
    if not positive_velocity:
        rejection_reasons.append(f"Low velocity: {amazon_monthly_sales}/mo")
    if hazmat["isHazmat"]:
        rejection_reasons.append("Hazmat/Safety flag")

    # --- Viral Radar ---
    viral = detect_viral(product["name"], category_id, amazon_monthly_sales, product["sku"])

    scout_opinion = generate_scout_opinion(
        product["name"], best_roi, amazon_monthly_sales, competitor_count,
        gated, amazon_listing["amazonIsSeller"], market_trend["priceCrashRisk"],
        demand_score, good_buy, weight,
    )

    # Compute primary rejection reason for card display
    primary_reason = None
    if not good_buy:
        if gated:
            primary_reason = "GATED"
        elif not stable_sellers:
            primary_reason = "PRICE CRASH RISK"
        elif not roi_ok:
            primary_reason = "LOW ROI"
        elif not positive_velocity:
            primary_reason = "LOW SALES"
        elif hazmat["isHazmat"]:
            primary_reason = "HAZMAT"
        else:
            primary_reason = "RISK"

    return {
        "sku": product["sku"],
        "productName": product["name"],
        "aisle": aisle,
        "categoryName": CATEGORY_NAME_MAP.get(category_id, product.get("categoryName", "Other")),
        "scoutOpinion": scout_opinion,
        "storeBuyPrice": store_price_original,
        "storeDiscount": {"pct": store_discount_pct, "amount": discount_amount, "adjustedPrice": store_price},
        "salesTax": sales_tax, "salesTaxRate": tax_rate, "salesTaxState": tax_state,
        "cogs": cogs, "amazonSellPrice": amazon_sell_price, "weight": weight,
        "ipRisk": {"isGated": gated, "brand": gated_brand,
                   "warning": f"⚠️ Gated/IP Risk: {gated_brand} is a restricted brand on Amazon" if gated else None},
        "hazmat": hazmat,
        "viral": viral,
        "amazonListing": amazon_listing,
        "marketTrend": market_trend,
        "shipping": {"usps": shipping_rates["usps"], "fedex": shipping_rates["fedex"],
                     "ups": shipping_rates["ups"], "cheapest": cheapest},
        "fbm": {
            "label": "Ship it Yourself", "referralFee": fbm_referral_fee, "referralFeeRate": REFERRAL_FEE_RATE,
            "shippingCost": fbm_shipping_cost, "shippingCarrier": cheapest["carrier"], "shippingService": cheapest["service"],
            "totalFees": fbm_total_fees, "netRevenue": fbm_net_revenue, "profit": fbm_profit, "roi": fbm_roi,
            "goodBuy": fbm_roi >= target_roi and not gated and stable_sellers and positive_velocity,
        },
        "fba": {
            "label": "Send to Amazon", "referralFee": fba_referral_fee, "referralFeeRate": REFERRAL_FEE_RATE,
            "fulfillmentFee": FBA_FULFILLMENT_FEE, "storageFee": FBA_STORAGE_FEE,
            "inboundShipping": fba_inbound_shipping, "inboundShippingRate": FBA_INBOUND_SHIPPING_PER_LB,
            "totalFees": fba_total_fees, "netRevenue": fba_net_revenue, "profit": fba_profit, "roi": fba_roi,
            "goodBuy": fba_roi >= target_roi and not gated and stable_sellers and positive_velocity,
        },
        "recommendation": {
            "bestMethod": best_method, "bestProfit": best_profit, "bestROI": best_roi,
            "goodBuy": good_buy, "rejectionReasons": rejection_reasons,
            "primaryRejectionReason": primary_reason,
            "demandScore": demand_score, "estimatedMonthlySales": amazon_monthly_sales,
            "positiveVelocity": positive_velocity, "competitorCount": competitor_count,
            "targetROI": target_roi,
        },
    }


# ===================================================================
# Best Buy API helper
# ===================================================================

async def _bestbuy_get(path: str, params: dict | None = None) -> dict | None:
    if _is_demo_mode():
        return None
    url = f"{BESTBUY_BASE}{path}"
    params = params or {}
    params["apiKey"] = BESTBUY_API_KEY
    params["format"] = "json"
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()
        except Exception:
            return None


# ===================================================================
# Endpoints
# ===================================================================

@app.get("/")
async def root():
    return {"app": "FlipScout", "version": "5.0.0", "mode": "demo" if _is_demo_mode() else "live"}


@app.get("/api/stores")
async def get_stores(
    zip_code: str = Query(..., min_length=5, max_length=5, pattern=r"^\d{5}$"),
    radius: int = Query(25, ge=1, le=250),
):
    live = await _bestbuy_get(f"/v1/stores(area({zip_code},{radius}))",
        {"show": "storeId,storeType,name,longName,city,region,address,phone,lat,lng,distance", "pageSize": "50"})
    if live and "stores" in live:
        stores = live["stores"]
    else:
        stores = _generate_mock_stores(zip_code, radius)
    return {"zipCode": zip_code, "radius": radius, "total": len(stores), "stores": stores}


@app.get("/api/categories")
async def get_categories():
    return {"categories": MOCK_CATEGORIES}


@app.get("/api/products")
async def get_products(
    zip_code: str = Query(..., min_length=5, max_length=5, pattern=r"^\d{5}$"),
    radius: int = Query(25, ge=1, le=250),
    category_id: str = Query("all"),
    page_size: int = Query(20, ge=1, le=100),
):
    if category_id == "all":
        products = []
        for cat in MOCK_CATEGORIES[:5]:
            products.extend(_generate_mock_products(cat["id"], 1001, count=4))
        return {"zipCode": zip_code, "categoryId": "all", "total": len(products), "products": products}

    search_all = category_id in ("all", "")

    if not search_all and not _is_demo_mode():
        live = await _bestbuy_get(
            f"/v1/products(categoryPath.id={category_id}&inStoreAvailability=true)",
            {"show": "sku,name,regularPrice,salePrice,onSale,customerReviewAverage,customerReviewCount,inStoreAvailability,onlineAvailability,image,weight",
             "pageSize": str(page_size), "sort": "bestSellingRank.asc"})
        if live and "products" in live:
            products = live["products"]
            wt_range = CATEGORY_WEIGHT_RANGES.get(category_id, (1.0, 10.0))
            for p in products:
                p["categoryId"] = category_id
                if not p.get("weight"):
                    p["weight"] = round(random.uniform(wt_range[0], wt_range[1]), 1)
                p["aisle"] = get_aisle(category_id, p.get("sku", 0))
            return {"zipCode": zip_code, "categoryId": category_id, "total": len(products), "products": products}

    # Demo mode or live "all" fallback
    stores_resp = await get_stores(zip_code=zip_code, radius=radius)
    store_ids = [s["storeId"] for s in stores_resp["stores"][:3]]
    products = []
    if search_all:
        cat_ids = [c["id"] for c in MOCK_CATEGORIES]
        per_cat = max(1, page_size // len(cat_ids))
        for cat in cat_ids:
            sid = store_ids[0] if store_ids else 1001
            products.extend(_generate_mock_products(cat, sid, count=per_cat))
    else:
        for sid in store_ids:
            products.extend(_generate_mock_products(category_id, sid, count=5))
    products = products[:page_size]
    return {"zipCode": zip_code, "categoryId": category_id, "total": len(products), "products": products}


@app.get("/api/trending")
async def get_trending(category_id: str = Query("abcat0502000")):
    live = await _bestbuy_get(f"/v1/products/trendingViewed(categoryId={category_id})")
    if live and "results" in live:
        results = []
        for r in live["results"]:
            results.append({
                "sku": r.get("sku"), "name": r.get("names", {}).get("title", ""),
                "salePrice": r.get("prices", {}).get("current", 0), "regularPrice": r.get("prices", {}).get("regular", 0),
                "image": r.get("images", {}).get("standard", ""),
                "customerReviewAverage": str(r.get("customerReviews", {}).get("averageScore", "")),
                "customerReviewCount": r.get("customerReviews", {}).get("count", 0), "rank": r.get("rank", 0),
            })
        return {"categoryId": category_id, "trending": results}
    names = MOCK_PRODUCT_NAMES.get(category_id, MOCK_PRODUCT_NAMES["abcat0502000"])
    trending = []
    for i, name in enumerate(names):
        sku = abs(7000000 + hash(f"trend-{category_id}-{i}") % 999999)
        regular = round(random.uniform(49.99, 1299.99), 2)
        sale = round(regular * random.uniform(0.75, 1.0), 2)
        trending.append({"sku": sku, "name": name, "salePrice": sale, "regularPrice": regular,
            "image": f"https://placehold.co/200x200/1a1a2e/e94560?text={name.split()[0]}",
            "customerReviewAverage": str(round(random.uniform(3.8, 5.0), 1)),
            "customerReviewCount": random.randint(50, 5000), "rank": i + 1})
    return {"categoryId": category_id, "trending": trending}


@app.get("/api/profit-analysis")
async def get_profit_analysis(
    zip_code: str = Query(..., min_length=5, max_length=5, pattern=r"^\d{5}$"),
    radius: int = Query(25, ge=1, le=250),
    category_id: str = Query("all"),
    target_roi: float = Query(50.0, ge=1, le=500),
    store_discount: float = Query(0.0, ge=0, le=100, description="Store discount pct (e.g. 5 for RedCard)"),
):
    products_resp = await get_products(zip_code=zip_code, radius=radius, category_id=category_id, page_size=20)
    products = products_resp.get("products", [])
    analyses = [_generate_profit_analysis(p, zip_code, target_roi, store_discount) for p in products]
    analyses.sort(key=lambda a: a["recommendation"]["bestROI"], reverse=True)

    good_buys = sum(1 for a in analyses if a["recommendation"]["goodBuy"])
    gated_count = sum(1 for a in analyses if a["ipRisk"]["isGated"])
    crash_risk_count = sum(1 for a in analyses if a["marketTrend"]["priceCrashRisk"])
    hazmat_count = sum(1 for a in analyses if a["hazmat"]["isHazmat"])
    amazon_seller_count = sum(1 for a in analyses if a["amazonListing"]["amazonIsSeller"])
    tax_rate, tax_state = get_sales_tax_rate(zip_code)

    viral_count = sum(1 for a in analyses if a.get("viral", {}).get("isViral"))

    return {
        "zipCode": zip_code, "categoryId": category_id,
        "totalAnalyzed": len(analyses), "goodBuys": good_buys,
        "gatedCount": gated_count, "crashRiskCount": crash_risk_count,
        "hazmatCount": hazmat_count, "amazonSellerCount": amazon_seller_count,
        "viralCount": viral_count,
        "salesTaxRate": tax_rate, "salesTaxState": tax_state,
        "targetROI": target_roi, "storeDiscount": store_discount,
        "analyses": analyses,
    }


@app.get("/api/shipping-estimate")
async def get_shipping_estimate(weight: float = Query(..., gt=0, le=150)):
    rates = estimate_shipping_rates(weight)
    cheap = cheapest_shipping(rates)
    return {"weight": weight, "rates": rates, "cheapest": cheap,
            "recommendation": f"Use {cheap['carrier']} {cheap['service']} at ${cheap['cost']:.2f}"}


@app.get("/api/open-box")
async def get_open_box(category_id: str = Query("abcat0502000")):
    live_data = None
    if not _is_demo_mode():
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                resp = await client.get(f"{BESTBUY_BASE}/beta/products/openBox(categoryId={category_id})",
                                        params={"apiKey": BESTBUY_API_KEY})
                resp.raise_for_status()
                live_data = resp.json()
            except Exception:
                pass
    if live_data and "results" in live_data:
        return {"categoryId": category_id, "openBox": live_data["results"]}
    names = MOCK_PRODUCT_NAMES.get(category_id, MOCK_PRODUCT_NAMES["abcat0502000"])
    items = []
    for i, name in enumerate(names[:3]):
        regular = round(random.uniform(99.99, 999.99), 2)
        current = round(regular * random.uniform(0.55, 0.80), 2)
        items.append({
            "sku": str(abs(8000000 + hash(f"ob-{category_id}-{i}") % 999999)),
            "names": {"title": name}, "prices": {"current": current, "regular": regular},
            "offers": [{"condition": "excellent", "prices": {"current": round(current * 0.92, 2), "regular": regular}},
                       {"condition": "certified", "prices": {"current": current, "regular": regular}}],
            "savings": round(regular - current, 2), "savingsPercent": round((1 - current / regular) * 100, 1),
        })
    return {"categoryId": category_id, "openBox": items}



# ===================================================================
# DEAL SCORE — Lead strength classification
# ===================================================================

def compute_deal_score(roi: float, monthly_sales: int, gated: bool, amazon_is_seller: bool, crash_risk: bool) -> dict:
    """Assign deal strength factoring IP risk and Amazon presence."""
    if gated or crash_risk:
        return {"score": 0, "label": "⛔ Blocked", "color": "red"}
    if amazon_is_seller and roi < 40:
        return {"score": 20, "label": "⚠️ Risky", "color": "yellow"}
    points = 0
    if roi >= 80: points += 40
    elif roi >= 50: points += 30
    elif roi >= 30: points += 15
    if monthly_sales >= 200: points += 30
    elif monthly_sales >= 50: points += 20
    elif monthly_sales >= 15: points += 10
    if not amazon_is_seller: points += 15
    if not crash_risk: points += 15
    if points >= 80:
        return {"score": points, "label": "🏆 Undisputed", "color": "green"}
    if points >= 55:
        return {"score": points, "label": "💪 Strong", "color": "green"}
    if points >= 35:
        return {"score": points, "label": "👍 Good", "color": "yellow"}
    return {"score": points, "label": "🤔 Weak", "color": "gray"}


# ===================================================================
# AI LISTING DRAFTER — Placeholder for AI text gen API
# ===================================================================

def draft_listing(product_name: str, category: str, buy_price: float, sell_price: float) -> dict:
    """Mock AI-generated eBay listing. Structured for real API integration."""
    title = f"{product_name} - NEW/Sealed - Free Fast Shipping"
    if len(title) > 80:
        title = title[:77] + "..."
    description = (
        f"\n🔥 {product_name}\n\n"
        f"✅ Brand New / Factory Sealed\n"
        f"✅ Ships within 1 business day\n"
        f"✅ 30-day hassle-free returns\n\n"
        f"Category: {category}\n\n"
        f"Don't miss this deal — limited stock available!\n\n"
        f"Tags: {product_name.lower().replace(' ', ', ')}\n"
    )
    return {
        "title": title,
        "description": description,
        "suggestedPrice": sell_price,
        "category": category,
        "source": "ai-placeholder",
    }


# ===================================================================
# LEADS GENERATOR — Background scanner mock
# ===================================================================

def _generate_leads(zip_code: str, target_roi: float = 50.0, store_discount: float = 0.0, count: int = 8, category_filter: list[str] | None = None) -> list[dict]:
    """Simulate a background scan of clearance/deal pages across categories.
    category_filter: if provided, only scan these category IDs."""
    leads = []
    all_cats = [c["id"] for c in MOCK_CATEGORIES]
    cat_ids = [c for c in all_cats if c in category_filter] if category_filter else all_cats
    if not cat_ids:
        cat_ids = all_cats
    for _ in range(count):
        cat_id = random.choice(cat_ids)
        names = MOCK_PRODUCT_NAMES.get(cat_id, MOCK_PRODUCT_NAMES["abcat0502000"])
        name = random.choice(names)
        wt_range = CATEGORY_WEIGHT_RANGES.get(cat_id, (1.0, 10.0))
        sku = abs(random.randint(5000000, 9999999))
        regular = round(random.uniform(39.99, 999.99), 2)
        clearance_pct = random.uniform(0.35, 0.75)
        sale = round(regular * clearance_pct, 2)
        weight = round(random.uniform(wt_range[0], wt_range[1]), 1)
        product = {
            "sku": sku, "name": name, "regularPrice": regular,
            "salePrice": sale, "onSale": True, "weight": weight,
            "customerReviewAverage": str(round(random.uniform(3.8, 5.0), 1)),
            "customerReviewCount": random.randint(50, 3000),
            "categoryId": cat_id, "aisle": get_aisle(cat_id, sku),
        }
        analysis = _generate_profit_analysis(product, zip_code, target_roi, store_discount)
        deal = compute_deal_score(
            analysis["recommendation"]["bestROI"],
            analysis["recommendation"]["estimatedMonthlySales"],
            analysis["ipRisk"]["isGated"],
            analysis["amazonListing"]["amazonIsSeller"],
            analysis["marketTrend"]["priceCrashRisk"],
        )
        analysis["dealScore"] = deal
        analysis["clearancePct"] = round((1 - clearance_pct) * 100, 1)
        cat_name = next((c["name"] for c in MOCK_CATEGORIES if c["id"] == cat_id), "Unknown")
        analysis["categoryName"] = cat_name
        leads.append(analysis)
    leads.sort(key=lambda l: l.get("dealScore", {}).get("score", 0), reverse=True)
    return leads


# ===================================================================
# NEW ENDPOINTS
# ===================================================================

# --- Viral Radar ---

@app.get("/api/viral")
async def get_viral_items(
    zip_code: str = Query("62701", min_length=5, max_length=5, pattern=r"^\d{5}$"),
    target_roi: float = Query(50.0, ge=1, le=500),
    store_discount: float = Query(0.0, ge=0, le=100),
    count: int = Query(5, ge=1, le=20),
):
    """Get top viral/trending items — velocity spikes + social signals."""
    # Generate a pool of leads and filter to viral ones
    all_leads = _generate_leads(zip_code, target_roi, store_discount, count=30)
    viral_items = [l for l in all_leads if l.get("viral", {}).get("isViral")]
    # If not enough naturally viral, boost some high-velocity items
    if len(viral_items) < count:
        remaining = [l for l in all_leads if l not in viral_items and l["recommendation"]["estimatedMonthlySales"] >= 100]
        remaining.sort(key=lambda x: x["recommendation"]["estimatedMonthlySales"], reverse=True)
        viral_items.extend(remaining[:count - len(viral_items)])
    viral_items = viral_items[:count]
    return {
        "zipCode": zip_code,
        "totalViral": len(viral_items),
        "items": viral_items,
    }


# --- Leads ---

@app.get("/api/leads")
async def get_leads(
    zip_code: str = Query("62701", min_length=5, max_length=5, pattern=r"^\d{5}$"),
    target_roi: float = Query(50.0, ge=1, le=500),
    store_discount: float = Query(0.0, ge=0, le=100),
    count: int = Query(8, ge=1, le=30),
):
    leads = _generate_leads(zip_code, target_roi, store_discount, count)
    return {
        "zipCode": zip_code, "totalLeads": len(leads),
        "undisputed": sum(1 for l in leads if "Undisputed" in l.get("dealScore", {}).get("label", "")),
        "strong": sum(1 for l in leads if "Strong" in l.get("dealScore", {}).get("label", "")),
        "viralCount": sum(1 for l in leads if l.get("viral", {}).get("isViral")),
        "leads": leads,
    }


# --- My Finds ---

class SaveFindRequest(BaseModel):
    sku: int
    product_name: str
    category_id: str = ""
    aisle: str = ""
    store_buy_price: float
    cogs: float
    amazon_sell_price: float = 0
    best_roi: float = 0
    best_method: str = ""
    good_buy: bool = False
    zip_code: str = ""
    store_id: int = 0
    notes: str = ""
    scan_lat: float = 0
    scan_lng: float = 0
    analysis_json: str = ""

class MarkSoldRequest(BaseModel):
    sold_price: float
    sold_platform: str

@app.post("/api/finds")
async def save_find(req: SaveFindRequest):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""INSERT INTO my_finds
        (sku,product_name,category_id,aisle,store_buy_price,cogs,amazon_sell_price,
         best_roi,best_method,good_buy,zip_code,store_id,status,notes,
         scan_lat,scan_lng,scanned_at,analysis_json)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (req.sku, req.product_name, req.category_id, req.aisle,
         req.store_buy_price, req.cogs, req.amazon_sell_price,
         req.best_roi, req.best_method, req.good_buy,
         req.zip_code, req.store_id, "scouted", req.notes,
         req.scan_lat, req.scan_lng, time.time(), req.analysis_json))
    find_id = c.lastrowid
    conn.commit()
    conn.close()
    # Also record scan history
    conn2 = sqlite3.connect(DB_PATH)
    c2 = conn2.cursor()
    c2.execute("INSERT INTO scan_history (sku,product_name,category_id,zip_code,store_id,scan_lat,scan_lng,scanned_at) VALUES (?,?,?,?,?,?,?,?)",
               (req.sku, req.product_name, req.category_id, req.zip_code, req.store_id, req.scan_lat, req.scan_lng, time.time()))
    conn2.commit()
    conn2.close()
    return {"id": find_id, "status": "scouted"}


@app.get("/api/finds")
async def list_finds(status: str = Query("", description="Filter: scouted, listed, sold, or empty for all")):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    if status:
        c.execute("SELECT * FROM my_finds WHERE status=? ORDER BY scanned_at DESC", (status,))
    else:
        c.execute("SELECT * FROM my_finds ORDER BY scanned_at DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return {"total": len(rows), "finds": rows}


@app.put("/api/finds/{find_id}/sold")
async def mark_sold(find_id: int, req: MarkSoldRequest):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE my_finds SET status='sold', sold_price=?, sold_platform=?, sold_at=? WHERE id=?",
              (req.sold_price, req.sold_platform, time.time(), find_id))
    if c.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Find not found")
    conn.commit()
    conn.close()
    return {"id": find_id, "status": "sold"}


@app.delete("/api/finds/{find_id}")
async def delete_find(find_id: int):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM my_finds WHERE id=?", (find_id,))
    if c.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Find not found")
    conn.commit()
    conn.close()
    return {"deleted": True}


# --- Performance Dashboard ---

@app.get("/api/performance")
async def get_performance():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM my_finds WHERE status='sold'")
    sold = [dict(r) for r in c.fetchall()]
    c.execute("SELECT COUNT(*) as cnt FROM my_finds WHERE status='scouted'")
    scouted_count = c.fetchone()["cnt"]
    c.execute("SELECT COUNT(*) as cnt FROM my_finds")
    total_finds = c.fetchone()["cnt"]
    conn.close()

    total_profit = 0
    total_revenue = 0
    total_cogs = 0
    rois = []
    flip_times = []
    by_platform: dict[str, dict] = {}

    for s in sold:
        profit = round((s["sold_price"] or 0) - (s["cogs"] or 0), 2)
        total_profit += profit
        total_revenue += (s["sold_price"] or 0)
        total_cogs += (s["cogs"] or 0)
        if s["cogs"] and s["cogs"] > 0:
            rois.append(round(profit / s["cogs"] * 100, 1))
        if s["sold_at"] and s["scanned_at"]:
            hours = round((s["sold_at"] - s["scanned_at"]) / 3600, 1)
            flip_times.append(hours)
        plat = s.get("sold_platform") or "Unknown"
        if plat not in by_platform:
            by_platform[plat] = {"count": 0, "revenue": 0, "profit": 0}
        by_platform[plat]["count"] += 1
        by_platform[plat]["revenue"] += (s["sold_price"] or 0)
        by_platform[plat]["profit"] += profit

    avg_roi = round(sum(rois) / len(rois), 1) if rois else 0
    avg_flip_hrs = round(sum(flip_times) / len(flip_times), 1) if flip_times else 0

    return {
        "totalFinds": total_finds,
        "scoutedCount": scouted_count,
        "soldCount": len(sold),
        "totalProfit": round(total_profit, 2),
        "totalRevenue": round(total_revenue, 2),
        "totalCOGS": round(total_cogs, 2),
        "avgROI": avg_roi,
        "avgFlipTimeHours": avg_flip_hrs,
        "byPlatform": by_platform,
        "recentSales": sold[:10],
    }


# --- AI Listing Draft ---

@app.get("/api/listing-draft")
async def get_listing_draft(
    product_name: str = Query(...),
    category: str = Query("General"),
    buy_price: float = Query(0),
    sell_price: float = Query(0),
):
    return draft_listing(product_name, category, buy_price, sell_price)


# --- Tax Export CSV ---

@app.get("/api/export/tax-csv")
async def export_tax_csv():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM my_finds ORDER BY scanned_at DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID","SKU","Product","Status","Buy Price","COGS","Sold Price",
                     "Platform","Profit","ROI %","Scanned Date","Sold Date","ZIP","Notes"])
    for r in rows:
        profit = round((r.get("sold_price") or 0) - (r.get("cogs") or 0), 2) if r.get("sold_price") else ""
        roi = round(profit / r["cogs"] * 100, 1) if profit and r.get("cogs") and r["cogs"] > 0 else ""
        scan_date = time.strftime("%Y-%m-%d %H:%M", time.localtime(r["scanned_at"])) if r.get("scanned_at") else ""
        sold_date = time.strftime("%Y-%m-%d %H:%M", time.localtime(r["sold_at"])) if r.get("sold_at") else ""
        writer.writerow([
            r["id"], r["sku"], r["product_name"], r["status"],
            r["store_buy_price"], r["cogs"], r.get("sold_price",""),
            r.get("sold_platform",""), profit, roi,
            scan_date, sold_date, r.get("zip_code",""), r.get("notes",""),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=flipscout_tax_export.csv"},
    )


# --- Scan History ---

@app.get("/api/scan-history")
async def get_scan_history(limit: int = Query(50, ge=1, le=500)):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM scan_history ORDER BY scanned_at DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return {"total": len(rows), "scans": rows}


# --- Receipt Store (placeholder) ---

class SaveReceiptRequest(BaseModel):
    trip_label: str = ""
    store_id: int = 0
    image_data: str = ""
    notes: str = ""

@app.post("/api/receipts")
async def save_receipt(req: SaveReceiptRequest):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO receipts (trip_label,store_id,image_data,notes,captured_at) VALUES (?,?,?,?,?)",
              (req.trip_label, req.store_id, req.image_data, req.notes, time.time()))
    rid = c.lastrowid
    conn.commit()
    conn.close()
    return {"id": rid}

@app.get("/api/receipts")
async def list_receipts():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT id,trip_label,store_id,notes,captured_at FROM receipts ORDER BY captured_at DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return {"total": len(rows), "receipts": rows}



# --- Success Stories — Global community feed ---

MOCK_STORIES = [
    ("FlipKing99", "Sony WH-1000XM5 Headphones", 87.50, "Best Buy", "Amazon", "Headphones", "🎧"),
    ("ResellQueen", "Nintendo Switch OLED", 62.00, "Target", "eBay", "Gaming", "🎮"),
    ("BarcodeBoss", "KitchenAid Stand Mixer", 115.00, "Walmart", "Amazon", "Kitchen", "🍳"),
    ("ThriftHunter", "Apple iPad 10th Gen", 94.00, "Best Buy", "Amazon", "Tablets", "📱"),
    ("FlipMaster", "LEGO Star Wars UCS Set", 220.00, "Target", "eBay", "Toys", "🧱"),
    ("DealSniper", "Dyson V15 Detect", 145.00, "Best Buy", "Amazon", "Home", "🏠"),
    ("ProfitPanda", "Samsung Galaxy Buds3 Pro", 38.00, "Walmart", "Mercari", "Headphones", "🎧"),
    ("ClearanceKid", "Canon EOS R50 Camera Kit", 132.00, "Best Buy", "eBay", "Cameras", "📷"),
    ("AisleSurfer", "TP-Link Deco Mesh 3-Pack", 56.00, "Best Buy", "Amazon", "Networking", "🌐"),
    ("StacksOnStacks", "Ninja Foodi Air Fryer XL", 78.00, "Target", "Amazon", "Kitchen", "🍳"),
    ("RetailArb", "Bose SoundLink Flex", 41.00, "Walmart", "eBay", "Audio", "🔊"),
    ("FlipNinja", "Garmin Venu 3 Smartwatch", 96.00, "Best Buy", "Amazon", "Smartwatches", "⌚"),
    ("BoxBreaker", "Steam Deck OLED 512GB", 158.00, "Best Buy", "eBay", "Gaming", "🎮"),
    ("DealMachine", "Vitamix Explorian E310", 89.00, "Target", "Amazon", "Kitchen", "🍳"),
    ("ScoutElite", "Sony 65\" OLED TV", 310.00, "Best Buy", "Local", "TVs", "📺"),
]

def _seed_stories_if_empty():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM success_stories")
    count = c.fetchone()[0]
    if count == 0:
        now = time.time()
        for i, (handle, product, profit, store, platform, cat, emoji) in enumerate(MOCK_STORIES):
            posted = now - random.randint(300, 86400 * 3) + (i * 60)
            c.execute("INSERT INTO success_stories (user_handle,product_name,profit_amount,store_name,sold_platform,category,emoji,posted_at) VALUES (?,?,?,?,?,?,?,?)",
                      (handle, product, profit, store, platform, cat, emoji, posted))
    conn.commit()
    conn.close()

_seed_stories_if_empty()


class PostStoryRequest(BaseModel):
    user_handle: str = "Anonymous"
    product_name: str
    profit_amount: float
    store_name: str = ""
    sold_platform: str = ""
    category: str = ""
    emoji: str = "🎉"

@app.get("/api/stories")
async def get_stories(limit: int = Query(50, ge=1, le=200)):
    """Get global success stories feed, newest first."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM success_stories ORDER BY posted_at DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    total_profit = sum(r["profit_amount"] for r in rows)
    return {
        "total": len(rows),
        "totalCommunityProfit": round(total_profit, 2),
        "stories": rows,
    }

@app.post("/api/stories")
async def post_story(req: PostStoryRequest):
    """Share a success story to the global community feed."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO success_stories (user_handle,product_name,profit_amount,store_name,sold_platform,category,emoji,posted_at) VALUES (?,?,?,?,?,?,?,?)",
              (req.user_handle, req.product_name, req.profit_amount, req.store_name, req.sold_platform, req.category, req.emoji, time.time()))
    story_id = c.lastrowid
    conn.commit()
    conn.close()
    return {"id": story_id, "status": "posted"}



# ===================================================================
# LIVE CHAT — WebSocket-powered global chat room
# ===================================================================

class ConnectionManager:
    """Manages active WebSocket connections for real-time chat."""
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

chat_manager = ConnectionManager()


MOCK_CHAT_MESSAGES = [
    ("FlipKing99", "Just found a crazy clearance deal at Best Buy 🔥", "text"),
    ("ResellQueen", "Anyone know if Nike is still gated for new sellers?", "text"),
    ("BarcodeBoss", "Pro tip: always check the endcaps first!", "text"),
    ("ThriftHunter", "That LEGO deal from yesterday sold in 2 hours 💰", "text"),
    ("FlipMaster", "RedCard 5% + clearance is the winning combo", "text"),
    ("DealSniper", "Has anyone tried FBA for small kitchen appliances?", "text"),
    ("ProfitPanda", "Just hit $1000 total profit this month! 🎉", "text"),
    ("ClearanceKid", "The Best Buy on Main St just restocked cameras", "text"),
    ("AisleSurfer", "Remember to factor in sales tax — it kills ROI in CA", "text"),
    ("StacksOnStacks", "Shipped 10 items today. FBA prep takes forever 😅", "text"),
]

def _seed_chat_if_empty():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM chat_messages")
    count = c.fetchone()[0]
    if count == 0:
        now = time.time()
        for i, (handle, msg, mtype) in enumerate(MOCK_CHAT_MESSAGES):
            posted = now - (len(MOCK_CHAT_MESSAGES) - i) * 300
            c.execute("INSERT INTO chat_messages (user_handle,message,msg_type,posted_at) VALUES (?,?,?,?)",
                      (handle, msg, mtype, posted))
    conn.commit()
    conn.close()

_seed_chat_if_empty()


@app.get("/api/chat/history")
async def get_chat_history(limit: int = Query(50, ge=1, le=200)):
    """Get recent chat messages, oldest first for display order."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM chat_messages ORDER BY posted_at DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    rows.reverse()
    return {"total": len(rows), "messages": rows}


class SendChatRequest(BaseModel):
    user_handle: str = "Anonymous"
    message: str
    msg_type: str = "text"
    product_data: str = ""

@app.post("/api/chat/send")
async def send_chat_message(req: SendChatRequest):
    """Send a chat message (also stored in DB). Broadcasts to WebSocket clients."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    now = time.time()
    c.execute("INSERT INTO chat_messages (user_handle,message,msg_type,product_data,posted_at) VALUES (?,?,?,?,?)",
              (req.user_handle, req.message, req.msg_type, req.product_data, now))
    msg_id = c.lastrowid
    conn.commit()
    conn.close()
    payload = {
        "id": msg_id,
        "user_handle": req.user_handle,
        "message": req.message,
        "msg_type": req.msg_type,
        "product_data": req.product_data,
        "posted_at": now,
    }
    await chat_manager.broadcast(payload)
    return payload


@app.websocket("/ws/chat")
async def websocket_chat(ws: WebSocket):
    """WebSocket endpoint for real-time chat. Clients receive all broadcasted messages."""
    await chat_manager.connect(ws)
    try:
        while True:
            data = await ws.receive_json()
            user = data.get("user_handle", "Anonymous")
            message = data.get("message", "")
            msg_type = data.get("msg_type", "text")
            product_data = data.get("product_data", "")
            if not message:
                continue
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            now = time.time()
            c.execute("INSERT INTO chat_messages (user_handle,message,msg_type,product_data,posted_at) VALUES (?,?,?,?,?)",
                      (user, message, msg_type, product_data, now))
            msg_id = c.lastrowid
            conn.commit()
            conn.close()
            await chat_manager.broadcast({
                "id": msg_id,
                "user_handle": user,
                "message": message,
                "msg_type": msg_type,
                "product_data": product_data,
                "posted_at": now,
            })
    except WebSocketDisconnect:
        chat_manager.disconnect(ws)



# --- User Feedback ---

class UserFeedbackRequest(BaseModel):
    user_handle: str = "Anonymous"
    message: str
    rating: int

@app.post("/api/user-feedback")
async def post_user_feedback(req: UserFeedbackRequest):
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO user_feedback (user_handle,message,rating,posted_at) VALUES (?,?,?,?)",
              (req.user_handle, req.message, req.rating, time.time()))
    fid = c.lastrowid
    conn.commit()
    conn.close()
    return {"id": fid, "status": "received"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
