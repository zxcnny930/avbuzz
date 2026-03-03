[中文](#中文) | [English](#english)

---

# 中文

# AVBUZZ — FANZA AV 新片 Discord Bot

> **R18+ 成人內容** — 本專案索引 FANZA 成人影片資料，使用者須年滿 18 歲並遵守當地法律。

從 FANZA 免費 GraphQL API 查詢 AV 新片、排行榜、女優追蹤、搜尋，自動推送到 Discord / Telegram。

## 功能

| 功能 | 說明 |
|------|------|
| 📅 每日新片 | JST 00:05 自動推送當日新上架影片 |
| 🎭 女優追蹤 | 追蹤指定女優，有新片自動通知（每 6 小時檢查） |
| 🔥 排行榜 | 銷售 / 評分 / 收藏 Top 10 |
| 📈 今日熱門 | 今日新片按人氣排序 |
| 🔍 搜尋 | 按女優名、番號、關鍵字搜尋 |
| 🎲 隨機推薦 | 從約 28 萬部影片中隨機推薦一部 |
| 📊 系統狀態 | `/status` 查看 API 健康狀態、延遲、運行時間 |
| 🔎 番號查詢 | `/code` 直接輸入番號精確查詢作品資訊 |
| 📰 每週精選 | 每週日 JST 20:00 自動推送最高評分 / 最多收藏 / 最暢銷 Top 5 |
| 🔔 推送開關 | 使用者可自行開關每日推送 / 女優追蹤 / 每週精選 |
| 📱 Telegram | 同步推送到 Telegram 頻道 |

## 快速開始

```bash
git clone https://github.com/zxcnny930/avbuzz.git
cd avbuzz
npm install
cp config.example.json config.json  # 填入你的 token
npm start
```

### 設定 config.json

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

Telegram 欄位留空即可只用 Discord。

### Discord Bot 建立

1. 到 [discord.com/developers](https://discord.com/developers/applications) → 建立 App → **Bot** → 複製 Token
2. **OAuth2** → **URL Generator** → scopes: `bot` → permissions: `Send Messages`, `Embed Links` → 邀請 Bot
3. 右鍵伺服器 → **複製伺服器 ID**（需開啟開發者模式）
4. 右鍵頻道 → **複製頻道 ID**

## Discord 指令

| 指令 | 說明 |
|------|------|
| `/new [date]` | 新片列表（預設今天 JST） |
| `/today` | 今日熱門（按人氣排序） |
| `/ranking <sales\|review\|bookmark>` | 排行榜 Top 10 |
| `/search <keyword>` | 搜尋（女優名、番號、關鍵字） |
| `/random` | 隨機推薦一部影片 |
| `/track <name>` | 追蹤女優 |
| `/untrack <name>` | 取消追蹤 |
| `/tracklist` | 列出追蹤清單 |
| `/status` | 查看系統狀態與 API 健康 |
| `/code <id>` | 番號精確查詢（如 SSIS-001） |
| `/digest` | 本週精選摘要（評分 / 收藏 / 銷售 Top 5） |
| `/notify <daily\|actress> <on\|off>` | 開關推送通知 |

## VPS 部署 (systemd)

```bash
scp -r . root@your-vps:/root/avbuzz/
ssh root@your-vps
cd /root/avbuzz && npm install
cp config.example.json config.json && nano config.json
cp avbuzz.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable avbuzz && systemctl start avbuzz
journalctl -u avbuzz -f  # 查看日誌
```

## OpenClaw Skill

AVBUZZ 也可以作為 [ClawHub](https://clawhub.ai) 技能，讓 AI 直接用 curl 查詢 FANZA 資料，不需要 Discord Bot。

```bash
npx clawhub install avbuzz
```

## 技術細節

- **資料來源**: FANZA 隱藏 GraphQL API (`POST https://api.video.dmm.co.jp/graphql`)，免費、無需認證
- **Stack**: Node.js ES modules, discord.js v14, native fetch
- **持久化**: JSON 檔案（`data/` 目錄）
- **排程**: 自製 setInterval + JST 時區判斷

> **注意**: FANZA GraphQL API 為非官方逆向工程端點，可能隨時變更或停止服務。本專案與 DMM / FANZA 無任何關聯。

## 授權

**雙重授權** — 非商業使用免費（[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/)）。商業使用需另行取得授權。

---

# English

# AVBUZZ — FANZA AV New Release Discord Bot

> **R18+ Adult Content** — This project indexes adult video content from FANZA. Users must be 18+ and comply with local laws.

Query AV new releases, rankings, actress tracking, and search from FANZA's free GraphQL API. Auto-push to Discord / Telegram.

## Features

| Feature | Description |
|---------|-------------|
| Daily Releases | Auto-push new releases at JST 00:05 |
| Actress Tracking | Track actresses, get alerts on new releases (every 6h) |
| Rankings | Sales / Review / Bookmark Top 10 |
| Today's Hot | Today's releases sorted by popularity |
| Search | By actress name, video code, or keyword |
| Random | Random recommendation from ~280K videos |
| System Status | `/status` — API health, latency, uptime |
| Code Lookup | `/code` — exact video code search |
| Weekly Digest | Auto-push top rated / bookmarked / best-selling Top 5 every Sunday JST 20:00 |
| Notification Toggle | Users can toggle daily push / actress alerts / weekly digest on/off |
| Telegram | Cross-post to Telegram channels |

## Quick Start

```bash
git clone https://github.com/zxcnny930/avbuzz.git
cd avbuzz
npm install
cp config.example.json config.json  # Fill in your tokens
npm start
```

### config.json

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

Leave Telegram fields empty to run Discord-only.

### Discord Bot Setup

1. Go to [discord.com/developers](https://discord.com/developers/applications) → Create App → **Bot** → Copy Token
2. **OAuth2** → **URL Generator** → scopes: `bot` → permissions: `Send Messages`, `Embed Links` → Invite bot
3. Right-click server → **Copy Server ID** (enable Developer Mode first)
4. Right-click channel → **Copy Channel ID**

## Discord Commands

| Command | Description |
|---------|-------------|
| `/new [date]` | New releases (default: today JST) |
| `/today` | Today's trending (by popularity) |
| `/ranking <sales\|review\|bookmark>` | Top 10 by category |
| `/search <keyword>` | Search by actress, title, code |
| `/random` | Random video recommendation |
| `/track <name>` | Track an actress |
| `/untrack <name>` | Stop tracking |
| `/tracklist` | Show tracked actresses |
| `/status` | System status and API health |
| `/code <id>` | Exact video code lookup (e.g., SSIS-001) |
| `/digest` | Weekly top picks (rating / bookmark / sales Top 5) |
| `/notify <daily\|actress> <on\|off>` | Toggle push notifications |

## VPS Deployment (systemd)

```bash
scp -r . root@your-vps:/root/avbuzz/
ssh root@your-vps
cd /root/avbuzz && npm install
cp config.example.json config.json && nano config.json
cp avbuzz.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable avbuzz && systemctl start avbuzz
journalctl -u avbuzz -f  # View logs
```

## OpenClaw Skill

AVBUZZ is also available as a [ClawHub](https://clawhub.ai) skill, allowing AI to query FANZA data directly via curl — no Discord bot needed.

```bash
npx clawhub install avbuzz
```

## Technical Details

- **Data Source**: FANZA hidden GraphQL API (`POST https://api.video.dmm.co.jp/graphql`) — free, no auth
- **Stack**: Node.js ES modules, discord.js v14, native fetch
- **Persistence**: JSON files (`data/` directory)
- **Scheduler**: Custom setInterval + JST timezone logic

> **Note**: The FANZA GraphQL API is an unofficial reverse-engineered endpoint and may change or become unavailable at any time. This project is not affiliated with DMM or FANZA.

## License

**Dual License** — Free for non-commercial use under [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/). Commercial use requires a separate license from the author.
