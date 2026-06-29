# ⚡ BigQuery Pulse — Live Release Notes & Tweet Studio

**BigQuery Pulse** is a sleek, modern full-stack web application designed for data engineers, Google Cloud architects, and Developer Advocates to monitor real-time Google BigQuery release notes and instantly compose engaging updates for social sharing on X (Twitter).

---

## 🏗️ Architecture Overview

BigQuery Pulse follows a lightweight, decoupled Single-Page Application (SPA) architecture:

```
                      +------------------------------------------+
                      |       Google Cloud Atom Feed (XML)       |
                      +------------------------------------------+
                                           |
                                           | HTTP GET (Atom XML)
                                           v
+-----------------------------------------------------------------------------------+
| Python Flask Backend (app.py)                                                     |
|                                                                                   |
|  1. Ingestion & Extraction: xml.etree.ElementTree & BeautifulSoup4                 |
|  2. Structuring: Normalizes entries into JSON (Feature, Changed, Deprecated, Fix) |
|  3. Smart Cache: In-memory 5-minute TTL caching layer                             |
+-----------------------------------------------------------------------------------+
                                           |
                                           | REST API (GET /api/notes)
                                           v
+-----------------------------------------------------------------------------------+
| Vanilla Web Frontend (templates/index.html, static/css, static/js)                |
|                                                                                   |
|  1. Dynamic Viewport: Supports List View & Grid View rendering                    |
|  2. Theme Engine: Dark/Light Mode with glassmorphic design tokens                 |
|  3. Interactive Tweet Studio: Real-time draft creation, char counts, & hashtags   |
|  4. State Management: localStorage persistence for themes, views, & bookmarks     |
+-----------------------------------------------------------------------------------+
```

---

## 🛠️ Core Tech Stack

### Backend
* **Framework**: [Flask](https://flask.palletsprojects.com/) (Python 3.8+) for routing, API serving, and static template rendering.
* **XML & HTML Parsing**: `xml.etree.ElementTree` for parsing Atom XML entry nodes, and `BeautifulSoup4` for HTML fragment parsing, heading extraction (`<h3>`), and tag sanitization.
* **HTTP Requests**: `requests` with custom user-agent headers and timeout handling.

### Frontend
* **Core & Logic**: Vanilla JavaScript (ES6+) utilizing asynchronous `fetch` calls, dynamic DOM manipulation, and browser `localStorage` state management.
* **Styling & Aesthetics**: Pure Vanilla CSS3 featuring custom design tokens (CSS variables), modern glassmorphic backdrops (`backdrop-filter`), smooth CSS transitions, and flexible Flexbox & CSS Grid layouts. No bulky external CSS frameworks required!
* **Typography & Icons**: Google Fonts ([Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) & [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)) and custom SVG icons.

---

## 🎨 Dynamic Visual Toggles & Customization

### 1. ☀️ / 🌙 Light & Dark Theme Switcher
BigQuery Pulse features a built-in theme engine that allows users to toggle between a sleek dark ecosystem and a clean, vibrant light mode:
* **Animated Navbar Button**: Accessible at all times in the sticky header navigation.
* **Design Token System**: Managed completely via CSS variables (`--bg-dark`, `--bg-card`, `--text-primary`, `--border-color`), switching themes seamlessly without full-page reloads.
* **Automatic Persistence**: Remembers your theme preference across browser sessions using `localStorage.bq_theme`.

### 2. ☰ / 🔲 Dual Layout View Modes
Customizable feed layouts tailored to your reading style:
* **Detailed List View**: Linear feed displaying full release note HTML bodies and documentation links.
* **Compact Grid View**: Multi-column responsive card grid with scrollable content bodies for quick scanning.
* **Automatic Persistence**: Remembers your layout preference across browser sessions using `localStorage.bq_view_mode`.

---

## 🐦 Interactive Tweet Studio

* **Instant Selection**: Click any release note card or tap "Select to Tweet" to populate the composer studio.
* **Smart Formatting**: Automatically extracts the date, category badge, release summary, official documentation URL, and active hashtags into a tweet-ready string.
* **Live Character Count**: Built-in 280-character limit validator with color-coded warnings (`warning` at 250+ chars, `error` at 280+ chars).
* **Quick Hashtag Chips**: One-click toggles for `#BigQuery`, `#GoogleCloud`, `#DataEngineering`, `#SQL`, and `#GCP`.
* **One-Click Share & Copy**: Directly copy formatted text to your clipboard or launch X/Twitter with pre-filled content.

---

## 🚀 Setup & Installation Guide

### Prerequisites
* **Python**: Version 3.8 or higher.
* **Pip**: Python package manager.

### 1. Clone & Navigate to Workspace
```bash
cd /Users/brandalfthegrey/agy-cli-projects/bq-releases-notes
```

### 2. Set Up Virtual Environment
```bash
# Create virtual environment (if not already created)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install flask requests beautifulsoup4
```

### 4. Run the Application
```bash
python app.py
```

### 5. Open in Browser
Visit `http://127.0.0.1:5001` in your web browser to use BigQuery Pulse!

---

## 📡 REST API Reference

### `GET /`
Renders the primary single-page application interface.

### `GET /api/notes`
Returns JSON formatted BigQuery release notes.

**Query Parameters:**
* `refresh` *(optional, boolean)*: Set to `true` to force a live fetch from Google's Atom feed, bypassing the 5-minute server cache.

**Example Response**:
```json
{
  "success": true,
  "last_updated": 1782759400.123,
  "notes": [
    {
      "id": "note-1",
      "date": "June 25, 2026",
      "type": "Feature",
      "html": "<p>BigQuery now supports new vector indexing capabilities...</p>",
      "text": "BigQuery now supports new vector indexing capabilities...",
      "link": "https://cloud.google.com/bigquery/docs/release-notes"
    }
  ]
}
```

---

## 📁 Project Directory Structure

```
bq-releases-notes/
├── app.py              # Flask server, feed fetching, BeautifulSoup parser & REST endpoints
├── templates/
│   └── index.html      # SPA HTML structure with navbar, toolbar, feed section & Tweet Studio
├── static/
│   ├── css/
│   │   └── style.css   # Glassmorphism design tokens, dark/light themes, grid/list layouts
│   └── js/
│       └── main.js     # Client state management, theme/view toggles, search, Tweet Studio logic
├── .gitignore          # Git ignore patterns
└── README.md           # Comprehensive project documentation
```
