---
name: avbuzz
description: Query AV new releases, rankings, and actress info from FANZA GraphQL API. No authentication required. Supports direct curl queries and optional Discord/Telegram bot deployment.
version: 1.1.0
user-invocable: true
metadata:
  openclaw:
    requires:
      bins:
        - curl
    install:
      - id: curl
        kind: brew
        formula: curl
        label: curl (HTTP client)
    emoji: "\U0001F5F4"
    os:
      - darwin
      - linux
      - win32
  version: 1.1.0
---

# AVBUZZ — FANZA AV Query Skill

> **⚠️ Adult Content (R18+)** — This skill indexes adult video (AV) content from FANZA. Users must be 18+ and comply with local laws.

Query AV new releases, rankings, actress info, and search from FANZA's free GraphQL API. **No API keys or authentication required.**

## API Overview

**Endpoint:** `POST https://api.video.dmm.co.jp/graphql`

**Authentication:** None (public API)

**Content-Type:** `application/json`

All queries use the `legacySearchPPV` GraphQL operation. Results include: video code (番號), title, actresses, maker/studio, release date, cover image URL, star ratings, and bookmark count.

### Determining Today's JST Date

FANZA uses JST (Japan Standard Time, UTC+9). To get today's date in JST:

```bash
date -u -d '+9 hours' '+%Y-%m-%d'
```

On macOS:
```bash
TZ=Asia/Tokyo date '+%Y-%m-%d'
```

Use this date value in any `deliveryStartDate` filter. For yesterday, subtract 1 day:
```bash
date -u -d '+9 hours -1 day' '+%Y-%m-%d'
```

---

## Query Operations

### 1. Today's New Releases

Fetch videos released on a specific date (use JST date, format `YYYY-MM-DD`):

```bash
curl -s -X POST https://api.video.dmm.co.jp/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ legacySearchPPV(limit: 10, offset: 0, sort: DELIVERY_START_DATE, floor: AV, filter: { deliveryStartDate: \"2026-03-03\" }) { result { contents { id title deliveryStartAt contentType maker { name } actresses { id name } packageImage { largeUrl } review { average count } bookmarkCount } pageInfo { totalCount } } } }"}'
```

Change `deliveryStartDate` to any `YYYY-MM-DD` date. Use `offset` for pagination (0, 10, 20...).

### 2. Today's Hot (by Popularity)

Same as new releases but sorted by sales rank:

```bash
curl -s -X POST https://api.video.dmm.co.jp/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ legacySearchPPV(limit: 10, offset: 0, sort: SALES_RANK_SCORE, floor: AV, filter: { deliveryStartDate: \"2026-03-03\" }) { result { contents { id title deliveryStartAt contentType maker { name } actresses { id name } packageImage { largeUrl } review { average count } bookmarkCount } pageInfo { totalCount } } } }"}'
```

### 3. Rankings

Top videos by different criteria. Change `sort` value:

**Sales ranking (best-selling):**
```bash
curl -s -X POST https://api.video.dmm.co.jp/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ legacySearchPPV(limit: 10, sort: SALES_RANK_SCORE, floor: AV) { result { contents { id title deliveryStartAt contentType maker { name } actresses { id name } packageImage { largeUrl } review { average count } bookmarkCount } pageInfo { totalCount } } } }"}'
```

**Review ranking (highest rated):**
```bash
curl -s -X POST https://api.video.dmm.co.jp/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ legacySearchPPV(limit: 10, sort: REVIEW_RANK_SCORE, floor: AV) { result { contents { id title deliveryStartAt contentType maker { name } actresses { id name } packageImage { largeUrl } review { average count } bookmarkCount } pageInfo { totalCount } } } }"}'
```

**Bookmark ranking (most saved):**
```bash
curl -s -X POST https://api.video.dmm.co.jp/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ legacySearchPPV(limit: 10, sort: BOOKMARK_COUNT, floor: AV) { result { contents { id title deliveryStartAt contentType maker { name } actresses { id name } packageImage { largeUrl } review { average count } bookmarkCount } pageInfo { totalCount } } } }"}'
```

Available `sort` values:

| Sort Value | Use When |
|-----------|----------|
| `DELIVERY_START_DATE` | User asks for "latest" / "newest" / "最新" — sorted by release date |
| `SALES_RANK_SCORE` | User asks for "popular" / "best-selling" / "熱門" / "銷售" |
| `REVIEW_RANK_SCORE` | User asks for "highest rated" / "best reviewed" / "評分" |
| `BOOKMARK_COUNT` | User asks for "most saved" / "most bookmarked" / "收藏" |

### 4. Search by Keyword

Search by actress name, title, video code, or any keyword:

```bash
curl -s -X POST https://api.video.dmm.co.jp/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ legacySearchPPV(limit: 10, offset: 0, sort: SALES_RANK_SCORE, floor: AV, queryWord: \"蒼井空\") { result { contents { id title deliveryStartAt contentType maker { name } actresses { id name } packageImage { largeUrl } review { average count } bookmarkCount } pageInfo { totalCount } } } }"}'
```

Replace `蒼井空` with any search term. Works with:
- Actress names (Japanese): `波多野結衣`, `蒼井 空` (space may help)
- Video codes: `SSNI`, `IPZ-123`
- Keywords: `VR`, `4K`, studio names
- English terms work too

**Important notes on search:**
- Keyword search is **fuzzy/broad** — partial kanji matches may return unrelated results. If searching for a specific actress returns unexpected results, try adding a space between family and given name, or search for just the family name
- **Video code format:** Users typically write `SSIS-001` but FANZA uses `ssis00001` (lowercase, no hyphen, 5-digit zero-padded number). Try both formats — the API handles uppercase/lowercase, but removing the hyphen and padding zeros improves accuracy
- For exact actress works, prefer the **Actress ID search** (Section 5) over keyword search

### 5. Search by Actress ID

If you know the actress ID (from a previous search result), fetch all her works:

```bash
curl -s -X POST https://api.video.dmm.co.jp/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ legacySearchPPV(limit: 20, sort: DELIVERY_START_DATE, floor: AV, filter: { actressIds: { ids: [{ id: \"26225\" }] } }) { result { contents { id title deliveryStartAt contentType maker { name } actresses { id name } packageImage { largeUrl } review { average count } bookmarkCount } pageInfo { totalCount } } } }"}'
```

Replace `26225` with the actress ID. Note the nested object syntax: `actressIds: { ids: [{ id: "ID" }] }`.

---

## Response Format

All queries return the same structure:

```json
{
  "data": {
    "legacySearchPPV": {
      "result": {
        "contents": [
          {
            "id": "ssni00001",
            "title": "Title in Japanese",
            "deliveryStartAt": "2026-03-03",
            "contentType": "TWO_DIMENSION",
            "maker": { "name": "Studio Name" },
            "actresses": [
              { "id": "26225", "name": "波多野結衣" }
            ],
            "packageImage": {
              "largeUrl": "https://pics.dmm.co.jp/..."
            },
            "review": { "average": 4.5, "count": 123 },
            "bookmarkCount": 456
          }
        ],
        "pageInfo": { "totalCount": 42 }
      }
    }
  }
}
```

### Field Reference

| Field | Description |
|-------|-------------|
| `id` | FANZA product code / 番號 (e.g., `ssni00001`) — display as UPPERCASE |
| `title` | Video title (Japanese) |
| `deliveryStartAt` | Release date (`YYYY-MM-DD`) |
| `contentType` | `TWO_DIMENSION` for normal, `VR` for VR content |
| `maker.name` | Studio/maker name |
| `actresses` | Array of `{ id, name }` — performer info |
| `packageImage.largeUrl` | Cover image URL (DMM CDN) |
| `review.average` | Star rating 1.0–5.0 |
| `review.count` | Number of reviews |
| `bookmarkCount` | Number of user bookmarks/saves |
| `pageInfo.totalCount` | Total matching results (for pagination) |

### Pagination

Use `limit` and `offset` parameters:
- Page 1: `limit: 10, offset: 0`
- Page 2: `limit: 10, offset: 10`
- Page 3: `limit: 10, offset: 20`

Maximum `limit` is 50.

### FANZA Product Page URL

To link to a video's FANZA page:
```
https://www.dmm.co.jp/digital/videoa/-/detail/=/cid={id}/
```
Replace `{id}` with the product code (lowercase).

---

## Error Handling

| HTTP Code | Meaning | Action |
|-----------|---------|--------|
| 200 | Success | Parse `data.legacySearchPPV.result` |
| 200 + `errors` | GraphQL validation error (wrong syntax) | Check query syntax against examples above |
| 429 | Rate limited | Retry after 2-10 seconds (exponential backoff) |
| 500 | Server error | Retry after 5 seconds; if persistent, API may be temporarily down |
| 503 | Service unavailable | API is temporarily down; retry after 30 seconds |
| Timeout | Network issue | Check connectivity; retry after 5 seconds |

Empty results (`contents: [], totalCount: 0`) are NOT errors — they mean no matching content was found.

### VR Content Filtering

The GraphQL API does **NOT** support filtering by `contentType` (VR vs normal). To find VR content:
1. Query normally (by date, keyword, ranking, etc.)
2. Filter results client-side: check `contentType === "VR"` in the response
3. **Recommended fallback:** If client-side filtering returns no VR results (e.g., top-rated are all 2D), combine `queryWord: "VR"` with your desired sort to get VR-specific results

---

## Tips for Effective Queries

1. **Date format is JST** — Japan is UTC+9. "Today" in JST may differ from your timezone
2. **Actress names** — Try with and without spaces: `蒼井空` and `蒼井 空`
3. **Sort wisely** — Use `SALES_RANK_SCORE` for popular, `DELIVERY_START_DATE` for newest
4. **VR content** — Check `contentType === "VR"` (normal content is `"TWO_DIMENSION"`) and mark with 🥽
5. **Cover images** — `packageImage.largeUrl` works directly in Discord embeds, Telegram, web, etc.
6. **Error responses** — API returns `{"errors":[...]}` on invalid queries. HTTP 429 means rate limited — retry after a few seconds.

---

## Daily Notifications

This skill provides **on-demand queries only**. The AI queries FANZA when you ask, but cannot autonomously push daily notifications.

For automatic daily new release alerts, deploy the AVBUZZ Discord bot to a VPS (see "Advanced: Discord Bot Deployment" below). The bot supports:
- Daily digest at configurable JST time (default 00:05)
- Actress tracking alerts every 6 hours
- `/notify on` / `/notify off` to toggle daily push per channel

---

## Disclaimer

> **FANZA GraphQL API is undocumented and unofficial.** This skill uses a reverse-engineered API endpoint (`api.video.dmm.co.jp/graphql`) that is not publicly supported by DMM/FANZA. The API could change or become unavailable at any time without notice. Use at your own risk. This project is not affiliated with DMM, FANZA, or any content producers.

---

## Advanced: Discord Bot Deployment

AVBUZZ can also run as a persistent Discord bot with slash commands, automatic daily digests, actress tracking alerts, and Telegram integration.

**GitHub:** [github.com/zxcnny930/avbuzz](https://github.com/zxcnny930/avbuzz)

### Quick Setup

```bash
git clone https://github.com/zxcnny930/avbuzz.git
cd avbuzz
npm install
cp config.example.json config.json  # Edit with your tokens
npm start
```

Requires: `node`, `npm`, `git`

### Configuration

All settings in `config.json`:

```json
{
  "discord": {
    "token": "YOUR_DISCORD_BOT_TOKEN",
    "guildId": "YOUR_GUILD_ID",
    "channelId": "YOUR_CHANNEL_ID"
  },
  "telegram": {
    "botToken": "YOUR_TELEGRAM_BOT_TOKEN",
    "chatId": "YOUR_CHAT_ID"
  },
  "schedule": {
    "dailyPushHourJST": 0,
    "dailyPushMinuteJST": 5,
    "actressCheckIntervalHours": 6
  }
}
```

### Discord Setup

1. Create app at [discord.com/developers](https://discord.com/developers/applications) → **Bot** tab → **Add Bot** → copy Token
2. **OAuth2** → **URL Generator** → scopes: `bot` → permissions: `Send Messages`, `Embed Links` → invite bot
3. Right-click server → **Copy Server ID** (enable Developer Mode first)
4. Right-click channel → **Copy Channel ID**

### Telegram Setup (Optional)

1. Message `@BotFather` on Telegram → `/newbot` → copy Token
2. Send a message, then visit `https://api.telegram.org/bot<TOKEN>/getUpdates` → find `chat.id`
3. Leave both fields empty to run Discord-only

### Discord Slash Commands

| Command | Description |
|---------|-------------|
| `/new [date]` | New releases for date (default: today JST) |
| `/today` | Today's trending (by sales rank) |
| `/ranking <sales\|review\|bookmark>` | Top 10 by category |
| `/search <keyword>` | Search by actress, title, code |
| `/track <name>` | Track actress — alerts on new releases |
| `/untrack <name>` | Stop tracking |
| `/tracklist` | Show all tracked actresses |
| `/random` | Random video recommendation |
| `/status` | System status and API health check |
| `/code <id>` | Exact video code lookup (e.g., SSIS-001) |
| `/digest` | Weekly top picks (rating, bookmark, sales) |

### Scheduling

| Task | Frequency | Description |
|------|-----------|-------------|
| Daily Digest | Once/day (configurable JST time) | Top 20 new releases → Discord + Telegram |
| Actress Check | Every 6h (configurable) | New releases for tracked actresses → alerts |
| Weekly Digest | Sunday JST 20:00 | Top rated, bookmarked, best-selling → Discord + Telegram |

### VPS Deployment (systemd)

```bash
ssh root@your-vps.com
git clone https://github.com/zxcnny930/avbuzz.git /root/avbuzz
cd /root/avbuzz && npm install
cp config.example.json config.json && nano config.json
```

Create `/etc/systemd/system/avbuzz.service`:
```ini
[Unit]
Description=AVBUZZ Discord Bot
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/avbuzz
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload && systemctl enable avbuzz && systemctl start avbuzz
journalctl -u avbuzz -f  # View logs
```

### Reconfiguring

```bash
nano config.json && systemctl restart avbuzz
```

---

## License

**Dual License** — Non-commercial use is free under [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/). Commercial use requires a separate license from the author.

**GitHub:** [github.com/zxcnny930/avbuzz](https://github.com/zxcnny930/avbuzz)
