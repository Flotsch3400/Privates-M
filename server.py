#!/usr/bin/env python3
"""Tracky – lokaler Server.

Startet die Web-App auf http://localhost:8765, speichert alle Daten in
data.json (im selben Ordner) und holt aktuelle Kurse aus dem Internet:
  - Aktien, ETFs, Fonds, Devisen: Yahoo Finance (ohne API-Schlüssel)
  - Kryptowährungen: CoinGecko (ohne API-Schlüssel)
Alle Preise werden in Euro umgerechnet.

Nur Python 3 (Standardbibliothek) wird benötigt.
"""
import json
import os
import shutil
import sys
import threading
import time
import urllib.parse
import urllib.request
import webbrowser
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("VERMOEGEN_PORT", "8765"))
ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data.json")
BACKUPS = os.path.join(ROOT, "backups")
UA = {"User-Agent": "Mozilla/5.0 (Tracky)", "Accept": "application/json"}
LOCK = threading.Lock()
CACHE = {}  # url -> (time, payload)


def get_json(url, ttl=60):
    hit = CACHE.get(url)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=12) as r:
        payload = json.loads(r.read().decode("utf-8"))
    CACHE[url] = (time.time(), payload)
    return payload


def fx_to_eur(ccy):
    """Faktor, mit dem ein Preis in `ccy` multipliziert wird, um EUR zu erhalten."""
    if not ccy or ccy.upper() == "EUR":
        return 1.0, "EUR"
    factor = 1.0
    if ccy in ("GBp", "GBX"):  # Pence
        factor, ccy = 0.01, "GBP"
    if ccy == "ZAc":
        factor, ccy = 0.01, "ZAR"
    if ccy == "ILA":
        factor, ccy = 0.01, "ILS"
    data = get_json(f"https://query1.finance.yahoo.com/v8/finance/chart/EUR{ccy.upper()}=X?range=1d&interval=1d", ttl=600)
    rate = data["chart"]["result"][0]["meta"]["regularMarketPrice"]
    return factor / rate, ccy


def yahoo_quote(symbol):
    url = "https://query1.finance.yahoo.com/v8/finance/chart/" + urllib.parse.quote(symbol) + "?range=5d&interval=1d"
    res = get_json(url)["chart"]["result"][0]
    meta = res["meta"]
    price = meta.get("regularMarketPrice")
    closes = [c for c in (res.get("indicators", {}).get("quote", [{}])[0].get("close") or []) if c is not None]
    prev = closes[-2] if len(closes) >= 2 else meta.get("chartPreviousClose")
    ccy = meta.get("currency") or "EUR"
    f, _ = fx_to_eur(ccy)
    return {
        "symbol": symbol,
        "name": meta.get("longName") or meta.get("shortName") or symbol,
        "price": price,
        "currency": ccy,
        "priceEur": round(price * f, 6),
        "change": (price / prev - 1) if prev else None,
        "time": meta.get("regularMarketTime"),
        "source": "Yahoo Finance",
    }


def crypto_quotes(ids):
    url = "https://api.coingecko.com/api/v3/simple/price?ids=" + urllib.parse.quote(",".join(ids)) + "&vs_currencies=eur&include_last_updated_at=true&include_24hr_change=true"
    data = get_json(url)
    out = {}
    for cid in ids:
        if cid in data and "eur" in data[cid]:
            out[cid] = {"symbol": cid, "priceEur": data[cid]["eur"], "currency": "EUR",
                        "change": (data[cid].get("eur_24h_change") or 0) / 100,
                        "time": data[cid].get("last_updated_at"), "source": "CoinGecko"}
    return out


def search(q, kind):
    if kind == "crypto":
        data = get_json("https://api.coingecko.com/api/v3/search?query=" + urllib.parse.quote(q), ttl=3600)
        return [{"symbol": c["id"], "name": c["name"], "ticker": c.get("symbol", "").upper(), "type": "Krypto",
                 "exchange": "CoinGecko"} for c in data.get("coins", [])[:8]]
    data = get_json("https://query1.finance.yahoo.com/v1/finance/search?quotesCount=8&newsCount=0&q=" + urllib.parse.quote(q), ttl=3600)
    return [{"symbol": x["symbol"], "name": x.get("longname") or x.get("shortname") or x["symbol"],
             "ticker": x["symbol"], "type": x.get("quoteType", ""), "exchange": x.get("exchDisp", "")}
            for x in data.get("quotes", []) if x.get("symbol")]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, fmt, *args):
        if "/api/" in (args[0] if args else ""):
            sys.stderr.write("  " + (fmt % args) + "\n")

    def send_json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(u.query)
        try:
            if u.path == "/api/ping":
                return self.send_json({"ok": True})
            if u.path == "/api/data":
                with LOCK:
                    if not os.path.exists(DATA):
                        return self.send_json(None)
                    with open(DATA, encoding="utf-8") as f:
                        return self.send_json(json.load(f))
            if u.path == "/api/quotes":
                out, errors = {}, {}
                for s in filter(None, qs.get("stocks", [""])[0].split(",")):
                    try:
                        out["stock:" + s] = yahoo_quote(s)
                    except Exception as e:  # noqa: BLE001
                        errors["stock:" + s] = str(e)
                cids = list(filter(None, qs.get("crypto", [""])[0].split(",")))
                if cids:
                    try:
                        for k, v in crypto_quotes(cids).items():
                            out["crypto:" + k] = v
                    except Exception as e:  # noqa: BLE001
                        for c in cids:
                            errors["crypto:" + c] = str(e)
                for c in cids:
                    if "crypto:" + c not in out and "crypto:" + c not in errors:
                        errors["crypto:" + c] = "Unbekannte CoinGecko-ID"
                return self.send_json({"quotes": out, "errors": errors, "fetchedAt": int(time.time())})
            if u.path == "/api/search":
                return self.send_json(search(qs.get("q", [""])[0], qs.get("kind", ["stock"])[0]))
        except Exception as e:  # noqa: BLE001
            return self.send_json({"error": str(e)}, 502)
        if u.path in ("/data.json",) or u.path.startswith("/backups"):
            return self.send_error(404)
        return super().do_GET()

    def do_PUT(self):
        if urllib.parse.urlparse(self.path).path != "/api/data":
            return self.send_error(404)
        n = int(self.headers.get("Content-Length", "0"))
        try:
            obj = json.loads(self.rfile.read(n).decode("utf-8"))
            assert isinstance(obj, dict) and "accounts" in obj and "snapshots" in obj
        except Exception:  # noqa: BLE001
            return self.send_json({"error": "Ungültige Daten"}, 400)
        with LOCK:
            if os.path.exists(DATA):
                os.makedirs(BACKUPS, exist_ok=True)
                stamp = datetime.now().strftime("%Y-%m-%d")
                dst = os.path.join(BACKUPS, f"data-{stamp}.json")
                if not os.path.exists(dst):  # eine Sicherung pro Tag
                    shutil.copy2(DATA, dst)
            tmp = DATA + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(obj, f, ensure_ascii=False, indent=1)
            os.replace(tmp, DATA)
        return self.send_json({"ok": True})


def main():
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    url = f"http://localhost:{PORT}/"
    print(f"\n  Tracky läuft auf {url}\n  Daten: {DATA}\n  Beenden mit Strg+C\n")
    if "--no-browser" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n  Beendet.")


if __name__ == "__main__":
    main()
