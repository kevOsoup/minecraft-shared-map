# Minecraft Shared Map

A shared, browser-based map for Minecraft worlds. Plot and view important locations (bases, farms, portals, landmarks) on a coordinate grid—no server mods required.

## Features

- Flat Minecraft coordinate grid (X/Z)
- Clickable markers with popups
- Multiple dimensions (Overworld, Nether, End)
- Auto-syncs from Google Sheets
- Category filtering
- Shareable URL for friends
- Free to host (GitHub Pages)
- Mobile-friendly

## Quick Start

### 1. Create Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Set up these columns in Row 1:

| Name | X | Z | Category | Dimension | Notes |
|------|---|---|----------|-----------|-------|
| Spawn Base | 0 | 50 | base | overworld | Main base |
| Iron Farm | 500 | -200 | farm | overworld | 1000/hr |

**Column definitions:**
- **Name** (required): Location name
- **X** (required): X coordinate
- **Z** (required): Z coordinate
- **Category**: `base`, `farm`, `portal`, `village`, `landmark`, `danger`, or `other`
- **Dimension**: `overworld`, `nether`, or `end`
- **Notes**: Any additional info

### 2. Publish Your Sheet

1. In Google Sheets, go to **File → Share → Publish to web**
2. Select **Entire Document** and **Web page**
3. Click **Publish**
4. Copy your Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
                                          ^^^^^^^^^^^^^^^^^^^^
   ```

### 3. Configure the Map

1. Open `app.js`
2. Find the `CONFIG` section at the top
3. Replace `YOUR_SHEET_ID_HERE` with your actual Sheet ID:

```javascript
const CONFIG = {
    SHEET_ID: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    SHEET_NAME: 'Sheet1',
    // ...
};
```

### 4. Deploy to GitHub Pages

1. Create a new repository on GitHub
2. Push this code to the repository:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/minecraft-shared-map.git
git push -u origin main
```

3. Go to your repo's **Settings → Pages**
4. Under "Source", select **main** branch
5. Click **Save**
6. Your map will be live at `https://YOUR_USERNAME.github.io/minecraft-shared-map/`

## Categories

| Category | Icon | Use for |
|----------|------|---------|
| base | 🏠 | Player bases, homes |
| farm | 🌾 | Mob farms, crop farms |
| portal | 🌀 | Nether portals, End portal |
| village | 🏘️ | Villages, trading halls |
| landmark | 📍 | Biomes, structures, POIs |
| danger | ⚠️ | Hostile areas, dungeons |
| other | ❓ | Everything else |

## Configuration Options

In `app.js`, you can customize:

```javascript
const CONFIG = {
    SHEET_ID: 'your-sheet-id',
    SHEET_NAME: 'Sheet1',           // Change if using a different tab
    REFRESH_INTERVAL: 60000,        // Auto-refresh (ms), 0 to disable

    MAP: {
        CENTER: [0, 0],             // Initial view [x, z]
        INITIAL_ZOOM: 2,            // Starting zoom (0-8)
        MIN_ZOOM: 0,
        MAX_ZOOM: 8,
    }
};
```

## Adding Custom Categories

Edit the `CATEGORIES` object in `app.js`:

```javascript
const CATEGORIES = {
    base: { name: 'Base', icon: '🏠', color: '#4a7c39' },
    // Add your own:
    mineshaft: { name: 'Mineshaft', icon: '⛏️', color: '#8b4513' },
};
```

## Local Development

Just open `index.html` in a browser. No build step needed.

For live reload during development, you can use any static server:

```bash
# Python
python -m http.server 8000

# Node.js (npx)
npx serve

# Then open http://localhost:8000
```

## Alternative Hosting

### Netlify

1. Push to GitHub
2. Go to [Netlify](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub repo
5. Deploy!

### Vercel

1. Push to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repo
4. Deploy!

## Troubleshooting

**Map shows demo data instead of my locations**
- Check that your Sheet ID is correct in `app.js`
- Make sure the sheet is published (File → Share → Publish to web)
- Verify column headers match exactly: `Name`, `X`, `Z`, `Category`, `Dimension`, `Notes`

**Locations not updating**
- Google Sheets can take a few minutes to propagate changes
- Try hard-refreshing the page (Ctrl+Shift+R / Cmd+Shift+R)
- Check browser console for errors (F12)

**CORS errors**
- Make sure the sheet is published as "Web page" not just shared

## License

MIT - Do whatever you want with it!
