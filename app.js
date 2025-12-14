/**
 * Minecraft Shared Map
 * A browser-based coordinate map that syncs with Google Sheets
 */

// =============================================================================
// CONFIGURATION - Edit these values!
// =============================================================================

const CONFIG = {
    // Your Google Sheet ID (from the URL)
    // Example: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
    SHEET_ID: '1tSqstlWiq3SgMKTJjmK4CCFfI-uTpi756MTLnEQHBUg',

    // The sheet/tab name (default is usually "Sheet1")
    SHEET_NAME: 'Sheet1',

    // How often to refresh data (in milliseconds)
    // 60000 = 1 minute, 300000 = 5 minutes
    REFRESH_INTERVAL: 60000,

    // Map settings
    MAP: {
        // Initial view coordinates [x, z]
        CENTER: [0, 0],
        // Initial zoom level (0-8, higher = more zoomed in)
        INITIAL_ZOOM: 2,
        // Min/max zoom
        MIN_ZOOM: 0,
        MAX_ZOOM: 8,
    }
};

// =============================================================================
// CATEGORY DEFINITIONS
// =============================================================================

const CATEGORIES = {
    base: { name: 'Base', icon: '🏠', color: '#4a7c39' },
    farm: { name: 'Farm', icon: '🌾', color: '#c4a000' },
    portal: { name: 'Portal', icon: '🌀', color: '#8b2500' },
    village: { name: 'Village', icon: '🏘️', color: '#6b4423' },
    landmark: { name: 'Landmark', icon: '📍', color: '#2980b9' },
    danger: { name: 'Danger', icon: '⚠️', color: '#c0392b' },
    other: { name: 'Other', icon: '❓', color: '#7f8c8d' }
};

// =============================================================================
// APP STATE
// =============================================================================

let map = null;
let markers = [];
let locations = [];
let currentDimension = 'overworld';
let activeCategories = new Set(Object.keys(CATEGORIES));

// =============================================================================
// MAP INITIALIZATION
// =============================================================================

function initMap() {
    // Create a simple CRS that maps 1:1 with Minecraft coordinates
    // Leaflet uses [lat, lng] but we'll treat it as [z, x] for Minecraft
    const MinecraftCRS = L.CRS.Simple;

    // Initialize the map
    map = L.map('map', {
        crs: MinecraftCRS,
        center: [CONFIG.MAP.CENTER[1], CONFIG.MAP.CENTER[0]], // [z, x]
        zoom: CONFIG.MAP.INITIAL_ZOOM,
        minZoom: CONFIG.MAP.MIN_ZOOM,
        maxZoom: CONFIG.MAP.MAX_ZOOM,
    });

    // Add a grid overlay
    addGrid();

    // Update coordinates display on mouse move
    map.on('mousemove', (e) => {
        const x = Math.round(e.latlng.lng);
        const z = Math.round(e.latlng.lat);
        document.getElementById('coord-x').textContent = x;
        document.getElementById('coord-z').textContent = z;
    });

    // Add origin marker
    const originIcon = L.divIcon({
        className: 'origin-marker',
        html: '<div style="width:12px;height:12px;background:#fff;border:2px solid #000;border-radius:50%;"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });

    L.marker([0, 0], { icon: originIcon })
        .addTo(map)
        .bindPopup('<b>Origin</b><br>X: 0, Z: 0');
}

// Add a coordinate grid to the map
function addGrid() {
    const gridSize = 500; // Grid line every 500 blocks
    const gridRange = 10000; // Grid extends this far in each direction

    const gridLines = [];

    // Vertical lines (constant X)
    for (let x = -gridRange; x <= gridRange; x += gridSize) {
        gridLines.push([[gridRange, x], [-gridRange, x]]);
    }

    // Horizontal lines (constant Z)
    for (let z = -gridRange; z <= gridRange; z += gridSize) {
        gridLines.push([[z, -gridRange], [z, gridRange]]);
    }

    // Style for grid lines
    const gridStyle = {
        color: '#333',
        weight: 1,
        opacity: 0.5
    };

    // Style for axis lines
    const axisStyle = {
        color: '#555',
        weight: 2,
        opacity: 0.8
    };

    // Add grid lines
    gridLines.forEach(line => {
        L.polyline(line, gridStyle).addTo(map);
    });

    // Add axis lines (X and Z axes)
    L.polyline([[0, -gridRange], [0, gridRange]], axisStyle).addTo(map); // X axis
    L.polyline([[-gridRange, 0], [gridRange, 0]], axisStyle).addTo(map); // Z axis
}

// =============================================================================
// GOOGLE SHEETS INTEGRATION
// =============================================================================

async function fetchLocations() {
    // Check if Sheet ID is configured
    if (CONFIG.SHEET_ID === 'YOUR_SHEET_ID_HERE') {
        showError('Please configure your Google Sheet ID in app.js');
        loadDemoData();
        return;
    }

    // Build the URL for the published CSV
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CONFIG.SHEET_NAME)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch sheet data');
        }

        const csvText = await response.text();
        locations = parseCSV(csvText);
        updateMap();
        updateSidebar();
    } catch (error) {
        console.error('Error fetching locations:', error);
        showError('Failed to load data from Google Sheets. Using demo data.');
        loadDemoData();
    }
}

// Parse CSV data from Google Sheets
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    // Parse header row
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

    // Expected columns: name, x, z, category, dimension, notes
    const nameIdx = headers.indexOf('name');
    const xIdx = headers.indexOf('x');
    const zIdx = headers.indexOf('z');
    const categoryIdx = headers.indexOf('category');
    const dimensionIdx = headers.indexOf('dimension');
    const notesIdx = headers.indexOf('notes');

    if (nameIdx === -1 || xIdx === -1 || zIdx === -1) {
        console.error('Missing required columns (name, x, z)');
        return [];
    }

    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < 3) continue;

        const name = values[nameIdx]?.trim();
        const x = parseInt(values[xIdx], 10);
        const z = parseInt(values[zIdx], 10);

        if (!name || isNaN(x) || isNaN(z)) continue;

        data.push({
            name,
            x,
            z,
            category: (values[categoryIdx] || 'other').toLowerCase().trim(),
            dimension: (values[dimensionIdx] || 'overworld').toLowerCase().trim(),
            notes: values[notesIdx]?.trim() || ''
        });
    }

    return data;
}

// Parse a single CSV line (handling quoted values)
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);

    // Remove surrounding quotes
    return values.map(v => v.replace(/^"|"$/g, ''));
}

// =============================================================================
// DEMO DATA
// =============================================================================

function loadDemoData() {
    locations = [
        { name: 'Spawn Base', x: 0, z: 50, category: 'base', dimension: 'overworld', notes: 'Main base near spawn' },
        { name: 'Iron Farm', x: 500, z: -200, category: 'farm', dimension: 'overworld', notes: 'Produces 1000 iron/hour' },
        { name: 'Nether Portal Hub', x: 100, z: 100, category: 'portal', dimension: 'overworld', notes: 'Main portal network' },
        { name: 'Village Trading Hall', x: -300, z: 400, category: 'village', dimension: 'overworld', notes: 'All major villager trades' },
        { name: 'Ocean Monument', x: 800, z: 1200, category: 'landmark', dimension: 'overworld', notes: 'Guardian farm potential' },
        { name: 'Witch Hut', x: -600, z: -800, category: 'danger', dimension: 'overworld', notes: 'Witch farm location' },
        { name: 'Mesa Biome', x: 1500, z: -500, category: 'landmark', dimension: 'overworld', notes: 'Terracotta and gold' },
        { name: 'End Portal', x: 1200, z: 300, category: 'portal', dimension: 'overworld', notes: 'Stronghold entrance' },
        { name: 'Nether Fortress', x: 50, z: 80, category: 'danger', dimension: 'nether', notes: 'Blaze spawner inside' },
        { name: 'Bastion Remnant', x: -200, z: 150, category: 'landmark', dimension: 'nether', notes: 'Piglin bartering' },
        { name: 'End City', x: 1000, z: 500, category: 'landmark', dimension: 'end', notes: 'Elytra found here' },
    ];
    updateMap();
    updateSidebar();
}

// =============================================================================
// MAP MARKERS
// =============================================================================

function updateMap() {
    // Clear existing markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    // Filter locations by dimension and category
    const filtered = locations.filter(loc =>
        loc.dimension === currentDimension &&
        activeCategories.has(loc.category)
    );

    // Add markers for each location
    filtered.forEach(loc => {
        const category = CATEGORIES[loc.category] || CATEGORIES.other;

        // Create custom icon
        const icon = L.divIcon({
            className: 'custom-marker-wrapper',
            html: `<div class="custom-marker marker-${loc.category}" title="${loc.name}">${category.icon}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        // Create marker at [z, x] (Leaflet uses lat/lng, we use z/x)
        const marker = L.marker([loc.z, loc.x], { icon })
            .addTo(map)
            .bindPopup(createPopupContent(loc));

        markers.push(marker);
    });
}

function createPopupContent(loc) {
    const category = CATEGORIES[loc.category] || CATEGORIES.other;
    return `
        <div class="popup-content">
            <h3 class="popup-name">${category.icon} ${loc.name}</h3>
            <p class="popup-category">${category.name}</p>
            <p class="popup-coords">X: ${loc.x} | Z: ${loc.z}</p>
            ${loc.notes ? `<p class="popup-notes">${loc.notes}</p>` : ''}
        </div>
    `;
}

// =============================================================================
// SIDEBAR
// =============================================================================

function updateSidebar() {
    updateCategoryFilters();
    updateLocationList();
}

function updateCategoryFilters() {
    const container = document.getElementById('category-filters');
    container.innerHTML = '';

    Object.entries(CATEGORIES).forEach(([key, cat]) => {
        const btn = document.createElement('button');
        btn.className = `category-filter ${activeCategories.has(key) ? 'active' : ''}`;
        btn.textContent = `${cat.icon} ${cat.name}`;
        btn.onclick = () => toggleCategory(key);
        container.appendChild(btn);
    });
}

function toggleCategory(category) {
    if (activeCategories.has(category)) {
        activeCategories.delete(category);
    } else {
        activeCategories.add(category);
    }
    updateCategoryFilters();
    updateMap();
    updateLocationList();
}

function updateLocationList() {
    const container = document.getElementById('location-list');
    container.innerHTML = '';

    const filtered = locations.filter(loc =>
        loc.dimension === currentDimension &&
        activeCategories.has(loc.category)
    );

    if (filtered.length === 0) {
        container.innerHTML = '<p style="color:#888;text-align:center;">No locations found</p>';
        return;
    }

    filtered.forEach(loc => {
        const category = CATEGORIES[loc.category] || CATEGORIES.other;
        const item = document.createElement('div');
        item.className = 'location-item';
        item.innerHTML = `
            <h4>${category.icon} ${loc.name}</h4>
            <span class="coords">X: ${loc.x} | Z: ${loc.z}</span>
            <span class="category">${category.name}</span>
        `;
        item.onclick = () => panToLocation(loc);
        container.appendChild(item);
    });
}

function panToLocation(loc) {
    map.setView([loc.z, loc.x], Math.max(map.getZoom(), 4));

    // Find and open the marker popup
    markers.forEach(marker => {
        const pos = marker.getLatLng();
        if (pos.lat === loc.z && pos.lng === loc.x) {
            marker.openPopup();
        }
    });
}

// =============================================================================
// UI EVENT HANDLERS
// =============================================================================

function setupEventListeners() {
    // Dimension selector
    document.querySelectorAll('.dim-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.dim-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDimension = btn.dataset.dimension;
            updateMapBackground();
            updateMap();
            updateLocationList();
        };
    });

    // Sidebar toggle
    document.getElementById('sidebar-toggle').onclick = () => {
        document.getElementById('sidebar').classList.toggle('open');
    };
}

function updateMapBackground() {
    const mapEl = document.getElementById('map');
    switch (currentDimension) {
        case 'nether':
            mapEl.style.background = '#1a0a0a';
            break;
        case 'end':
            mapEl.style.background = '#0a0a1a';
            break;
        default:
            mapEl.style.background = '#1a1a2e';
    }
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

function showError(message) {
    console.warn(message);
    // You could also show this in the UI
}

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupEventListeners();
    fetchLocations();

    // Auto-refresh data
    if (CONFIG.REFRESH_INTERVAL > 0) {
        setInterval(fetchLocations, CONFIG.REFRESH_INTERVAL);
    }
});
