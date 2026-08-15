// ============================================
// MAP CORE - Rendering Engine & State Management
// ============================================

// ============================================
// DYNAMIC VIEWPORT HEIGHT
// ============================================
// Fixes the issue where 100vh doesn't account for browser chrome
// (address bar, bookmarks bar, etc.) when not in fullscreen mode

function updateViewportHeight() {
    // Use requestAnimationFrame to batch the read/write and avoid forced reflow
    requestAnimationFrame(() => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    });
}

// Update on resize
window.addEventListener('resize', updateViewportHeight);

// Update on fullscreen change (all browser prefixes)
document.addEventListener('fullscreenchange', updateViewportHeight);
document.addEventListener('webkitfullscreenchange', updateViewportHeight);
document.addEventListener('mozfullscreenchange', updateViewportHeight);
document.addEventListener('MSFullscreenChange', updateViewportHeight);

// Update when window gains/loses focus (catches toolbar changes)
window.addEventListener('focus', updateViewportHeight);

// Initial calculation
updateViewportHeight();

// Canvas and context
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

// Cached DOM elements for info display (avoid querying every frame)
const zoomLevelEl = document.getElementById('zoomLevel');
const posXEl = document.getElementById('posX');
const posYEl = document.getElementById('posY');

// Map data (use var for cross-file access)
var mapData = {
    width: 200,
    height: 150,
    data: []
};

// ============================================
// MAP CONFIGURATION
// ============================================
// Centralized config - change these values when switching to different maps
// This avoids hardcoding map names throughout the codebase
var MAP_CONFIG = {
    // Default map to load on page start (must exist in maps/ folder)
    defaultMap: 'ExampleMapDownstairs.json',

    // Primary building - this building uses simple floor labels ("Upstairs"/"Downstairs")
    // Other buildings show their name in the label (e.g., "CTE Downstairs")
    primaryBuilding: {
        name: 'ExampleMap',  // Building prefix for display logic
        lower: 'ExampleMapDownstairs.json',
        upper: 'ExampleMapUpstairs.json'
    }
};

// Track current loaded map file (use var for cross-file access)
var currentMapFile = MAP_CONFIG.defaultMap;

// Initialize empty map
function initializeEmptyMap() {
    mapData.data = [];
    for (let y = 0; y < mapData.height; y++) {
        mapData.data[y] = [];
        for (let x = 0; x < mapData.width; x++) {
            mapData.data[y][x] = 0;
        }
    }
}
initializeEmptyMap();

// ============================================
// THEME SYSTEM
// ============================================

// Current theme state (use var for cross-file access)
var currentTheme = 'light';

// Light mode tile colors (original)
const COLORS_LIGHT = {
    0: '#FFFFFF',   // White background
    1: '#002A5D',   // WB Blue
    2: '#FC5A1E',   // WB Orange
    3: '#96BEE6',   // Blount Blue (walkable hallway)
    4: '#000000',   // Black (wall)
    5: '#000000',   // Black (doorway - looks like wall but walkable)
    6: '#96BEE6',   // Blount Blue (avoid zone - looks like hallway but pathfinder avoids)
    7: '#E8F1F8'    // Faded Blount Blue (sidewalk - outdoor visual, not walkable)
};

// Dark mode tile colors (eye-friendly)
const COLORS_DARK = {
    0: '#3a3a4e',   // Dark grey background (one shade lighter than textboxes)
    1: '#4d7ab3',   // Lighter WB Blue (for contrast)
    2: '#FC5A1E',   // WB Orange (unchanged - good contrast)
    3: '#2d4a6a',   // Darker Blount Blue (walkable hallway)
    4: '#0a0a0a',   // Near-black (wall)
    5: '#0a0a0a',   // Near-black (doorway)
    6: '#2d4a6a',   // Darker Blount Blue (avoid zone - looks like hallway but pathfinder avoids)
    7: '#353a50'    // Faded Blount Blue (sidewalk - outdoor visual, not walkable)
};

// Canvas element colors for each theme (textboxes, grids, etc.)
const CANVAS_COLORS = {
    light: {
        background: '#FFFFFF',
        textboxBg: '#FFFFFF',
        textboxBgEditing: '#FFFFC8',
        textboxText: '#000000',
        textboxBorderStudent: '#D0D0D0',
        textboxBorderEditor: '#646464',
        gridLine: '#C8C8C8',
        hallwayGrid: '#a8c7e1',
        arrowIndicatorBg: '#22c55e',
        arrowIndicatorText: '#FFFFFF',
        roomBadgeBg: '#fee2e2',
        roomBadgeText: '#b91c1c',
        resizeHandle: '#3b82f6',
        startMarkerFill: '#FFFFFF',
        startMarkerStroke: '#002A5D',
        endMarkerFill: '#FC5A1E',
        endMarkerStroke: '#002A5D',
        stairButtonBg: '#FC5A1E',
        stairButtonBorder: '#002A5D',
        stairButtonText: '#FFFFFF',
        starFill: '#FBBF24',
        starStroke: '#92400E',
        doorSwingArc: '#6b7280',
        doorSwingLine: '#4b5563',
        sidewalkGrid: '#d5e4f0'
    },
    dark: {
        background: '#3a3a4e',
        textboxBg: '#2a2a3e',
        textboxBgEditing: '#3a3a2e',
        textboxText: '#e5e7eb',
        textboxBorderStudent: '#4b5563',
        textboxBorderEditor: '#6b7280',
        gridLine: '#3a3a4e',
        hallwayGrid: '#3d5a7a',
        arrowIndicatorBg: '#22c55e',
        arrowIndicatorText: '#FFFFFF',
        roomBadgeBg: '#fecaca',
        roomBadgeText: '#dc2626',
        resizeHandle: '#60a5fa',
        startMarkerFill: '#3a3a4e',
        startMarkerStroke: '#4d7ab3',
        endMarkerFill: '#FC5A1E',
        endMarkerStroke: '#4d7ab3',
        stairButtonBg: '#FC5A1E',
        stairButtonBorder: '#4d7ab3',
        stairButtonText: '#FFFFFF',
        starFill: '#FBBF24',
        starStroke: '#92400E',
        doorSwingArc: '#9ca3af',
        doorSwingLine: '#d1d5db',
        sidewalkGrid: '#404459'
    }
};

// Get current theme's tile colors
function getColors() {
    return currentTheme === 'dark' ? COLORS_DARK : COLORS_LIGHT;
}

// Get current theme's canvas element colors
function getCanvasColors() {
    return CANVAS_COLORS[currentTheme];
}

// Initialize theme from localStorage or system preference
function initTheme() {
    const stored = localStorage.getItem('mapEditorTheme');
    if (stored && (stored === 'light' || stored === 'dark')) {
        currentTheme = stored;
    } else {
        // Fall back to OS preference
        currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    applyTheme();
}

// Apply current theme to document and trigger canvas re-render
function applyTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    needsRedraw = true;
    updateThemeToggleButton();
}

// Toggle between light and dark themes
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('mapEditorTheme', currentTheme);
    applyTheme();
}

// Update the theme toggle button text/icon
function updateThemeToggleButton() {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        if (currentTheme === 'dark') {
            btn.innerHTML = '<i data-lucide="sun"></i> <span class="theme-label">' + t('editor.light') + '</span>';
            btn.setAttribute('aria-label', t('editor.switchToLight'));
        } else {
            btn.innerHTML = '<i data-lucide="moon"></i> <span class="theme-label">' + t('editor.dark') + '</span>';
            btn.setAttribute('aria-label', t('editor.switchToDark'));
        }
        if (window.lucide) lucide.createIcons();
    }
}

// Legacy COLORS reference for any external code that might use it
const COLORS = COLORS_LIGHT;

// ============================================
// STATE MANAGEMENT
// ============================================

// Editor state (use var for cross-file access)
var currentTile = 1;
var currentMode = 'pan';
var tileSize = 8;
var cameraX = 0;
var cameraY = 0;
var mapRotation = 0;  // Map rotation in radians (0 = north up)
var isMouseDown = false;
var lastMouseX = 0;
var lastMouseY = 0;
var bucketFillOrigin = null;

// Textboxes (use var for cross-file access)
var textboxes = [];
var editingTextbox = null;

// Door swing metadata (use var for cross-file access)
// Key format: 'row,col' -> { direction: 'into'|'out', side: 'top'|'bottom'|'left'|'right', hinge: 'left'|'right' }
var doorMeta = {};
var hoveredTextbox = null;  // Track hovered textbox for highlight effect
var highlightedCategoryTextboxes = [];  // Track textbox indices highlighted by category filter
var draggingTextbox = null;
var resizingTextbox = null;
var dragOffset = { x: 0, y: 0 };
var dragUndoSaved = false;  // Track if undo was saved for current drag operation
const RESIZE_HANDLE_SIZE = 12; // pixels for resize handle detection

// View mode state (use var for cross-file access)
// Initialize based on whether body has navigation-view class (teachers start in navigation view)
var isNavigationView = document.body.classList.contains('navigation-view');

// Undo history (use var for cross-file access)
var undoHistory = [];
const MAX_UNDO = 50;

// Track unsaved changes (use var for cross-file access)
var hasUnsavedChanges = false;

// Snapshot of clean state (when loaded/saved) for comparison
var savedStateSnapshot = null;

// Save snapshot of current state as the "clean" state
function saveSavedStateSnapshot() {
    savedStateSnapshot = JSON.stringify({
        map: mapData.data,
        textboxes: textboxes
    });
}

// Check if current state matches the saved snapshot
function stateMatchesSaved() {
    if (!savedStateSnapshot) return false;
    const currentState = JSON.stringify({
        map: mapData.data,
        textboxes: textboxes
    });
    return currentState === savedStateSnapshot;
}

// Update hasUnsavedChanges based on actual state comparison
function updateUnsavedChangesFlag() {
    hasUnsavedChanges = !stateMatchesSaved();
}

// Flag to center on route after map load (for floor switching, use var for cross-file access)
var shouldCenterRouteAfterLoad = false;

// Flags to preserve zoom and center on staircase after floor switch (use var for cross-file access)
var shouldPreserveZoomAfterLoad = false;
var preservedTileSize = 8;
var shouldCenterOnStaircaseAfterLoad = null;  // e.g., "Left Stairs\n##N" (name + entrance ID)
var shouldOpenStaircaseInfoPanelAfterLoad = false;  // If true, open info panel for staircase after floor switch

// Performance optimization (use var for cross-file access)
var animationFrameId = null;
var needsRedraw = true;

// Route/Pathfinding state (use var for cross-file access)
var currentRoute = {
    active: false,
    startRoom: null,      // { floor, x, y, label }
    endRoom: null,        // { floor, x, y, label }
    segments: [],         // [{ floor, path: [{x,y},...] }, { type: "stairs", name }, ...]
    requiresFloorChange: false,
    stairsUsed: null
};

// Route animation state (use var for cross-file access)
// Dot continuously loops along the path while route is active
var routeAnimation = {
    active: false,           // Whether animation is currently running
    startTime: 0,            // When animation started (performance.now())
    segmentIndex: -1,        // Which segment is being animated (-1 = none)
    progress: 0,             // 0.0 to 1.0 progress through current segment (loops)
    duration: 4000,          // Animation duration per loop in milliseconds
    pendingSegment: null     // Segment to animate next (set by triggers)
};

// Start path animation for a specific segment
function startRouteAnimation(segmentIndex) {
    if (!currentRoute || !currentRoute.active) return;
    if (segmentIndex < 0 || segmentIndex >= currentRoute.segments.length) return;

    const segment = currentRoute.segments[segmentIndex];
    if (segment.type === 'stairs' || !segment.path || segment.path.length < 2) return;

    routeAnimation.active = true;
    routeAnimation.startTime = performance.now();
    routeAnimation.segmentIndex = segmentIndex;
    routeAnimation.progress = 0;
    routeAnimation.pendingSegment = null;
    needsRedraw = true;
}

// Stop route animation (called when route is cleared)
function stopRouteAnimation() {
    routeAnimation.active = false;
    routeAnimation.segmentIndex = -1;
    routeAnimation.progress = 1;
}

// Room Finder state - stores the currently highlighted room (use var for cross-file access)
var foundRoomMarker = null;  // { mapFile, x, y, width, height, label } or null when cleared

// Flag to center on found room after map load (for floor switching)
var shouldCenterRoomAfterLoad = false;

// Walkable tile types (light blue hallways and doorways)
const WALKABLE_TILE = 3;
const DOORWAY_TILE = 5;
const AVOID_ZONE_TILE = 6;  // Walkable but pathfinder avoids unless necessary

// Check if a tile is walkable (hallway, doorway, or avoid zone)
function isWalkableTile(tileType) {
    return tileType === 3 || tileType === 5 || tileType === 6;  // WALKABLE_TILE, DOORWAY_TILE, or AVOID_ZONE_TILE
}

// Get floor from any map filename
function getFloorFromFilename(filename) {
    return filename && filename.includes('Downstairs') ? 'lower' : 'upper';
}

// Get current floor based on loaded map file
function getCurrentFloor() {
    return getFloorFromFilename(currentMapFile);
}

// Get map filename for a floor (uses primary building from MAP_CONFIG)
function getMapFileForFloor(floor) {
    return floor === 'lower' ? MAP_CONFIG.primaryBuilding.lower : MAP_CONFIG.primaryBuilding.upper;
}

// Get the paired floor map for the current building
// e.g., CTEDownstairs.json -> CTEUpstairs.json, MainCampusUpstairs.json -> MainCampusDownstairs.json
// Returns null if no paired map exists
function getPairedFloorMap(currentMap) {
    if (!currentMap) return null;

    const basename = currentMap.replace('.json', '');

    // Determine paired filename
    let pairedName;
    if (basename.endsWith('Downstairs')) {
        pairedName = basename.replace('Downstairs', 'Upstairs') + '.json';
    } else if (basename.endsWith('Upstairs')) {
        pairedName = basename.replace('Upstairs', 'Downstairs') + '.json';
    } else {
        // Map doesn't have a floor designation (e.g., Academy, StadiumArea)
        return null;
    }

    // Check if the paired map exists in availableMaps
    if (typeof availableMaps !== 'undefined' && availableMaps.length > 0) {
        const exists = availableMaps.some(m => m.filename === pairedName);
        if (exists) {
            return pairedName;
        }
    }

    return null;
}

// Get the active route segment for the current map
// Returns the segment object if found, or null if no active route or no segment for this map
// IMPORTANT: Use mapFile (not floor) to correctly handle multiple buildings
function getActiveSegmentForCurrentMap() {
    if (!currentRoute || !currentRoute.active || !currentRoute.segments) {
        return null;
    }
    return currentRoute.segments.find(seg => seg.mapFile === currentMapFile) || null;
}

// Get textbox grid position with fallback to legacy x/y properties
function getTextboxPosition(textbox) {
    return {
        x: textbox.grid_x !== undefined ? textbox.grid_x : textbox.x,
        y: textbox.grid_y !== undefined ? textbox.grid_y : textbox.y
    };
}

// Get textbox grid dimensions with fallback to legacy width/height properties
function getTextboxDimensions(textbox) {
    return {
        width: textbox.grid_width !== undefined ? textbox.grid_width : textbox.width,
        height: textbox.grid_height !== undefined ? textbox.grid_height : textbox.height
    };
}

// Normalize a textbox to the standard format (handles legacy properties)
function normalizeTextbox(textbox) {
    const pos = getTextboxPosition(textbox);
    const dims = getTextboxDimensions(textbox);
    const normalized = {
        grid_x: pos.x,
        grid_y: pos.y,
        grid_width: dims.width,
        grid_height: dims.height,
        text: textbox.text || '',
        font_size: textbox.font_size !== undefined ? textbox.font_size : (textbox.fontSize || 20),
        alignment: textbox.alignment || textbox.align || 'left',
        vertical_alignment: textbox.vertical_alignment || 'top',
        scroll_offset: textbox.scroll_offset || 0
    };
    // Preserve info panel data (description and images) if present
    if (textbox.description) {
        normalized.description = textbox.description;
    }
    if (textbox.images && textbox.images.length > 0) {
        normalized.images = textbox.images;
    }
    if (textbox.isMarker) {
        normalized.isMarker = true;
    }
    if (textbox.manualCategories) {
        normalized.manualCategories = textbox.manualCategories;
    }
    return normalized;
}

// ============================================
// CANVAS MANAGEMENT
// ============================================

// Set canvas size
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    needsRedraw = true;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Use ResizeObserver to detect container size changes from internal layout shifts
// (e.g., route instructions appearing in the user bar changes grid row sizes)
if (window.ResizeObserver) {
    new ResizeObserver(resizeCanvas).observe(canvas.parentElement);
}

// ============================================
// CAMERA & VIEWPORT
// ============================================

// Find content bounds (non-zero tiles)
function findContentBounds() {
    let minX = mapData.width;
    let maxX = -1;
    let minY = mapData.height;
    let maxY = -1;
    let foundContent = false;
    
    for (let y = 0; y < mapData.height; y++) {
        for (let x = 0; x < mapData.width; x++) {
            if (mapData.data[y][x] !== 0) {
                foundContent = true;
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }
    
    if (!foundContent) {
        return { minX: 0, minY: 0, maxX: mapData.width - 1, maxY: mapData.height - 1 };
    }
    
    return { minX, minY, maxX, maxY };
}

// Center camera on content
function centerCamera() {
    const bounds = findContentBounds();
    const contentCenterX = (bounds.minX + bounds.maxX) / 2;
    const contentCenterY = (bounds.minY + bounds.maxY) / 2;

    cameraX = (contentCenterX * tileSize) - (canvas.width / 2);
    cameraY = (contentCenterY * tileSize) - (canvas.height / 2);
}
centerCamera();

// Center camera on the active segment of the current route
// For multi-floor routes, only zooms to the segment the user is currently on
function centerOnRoute() {
    if (!currentRoute || !currentRoute.active) return;

    let segmentIndex = currentRoute.activeSegmentIndex || 0;

    // Find bounds of the ACTIVE segment only
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let foundPath = false;

    // Get the active segment based on activeSegmentIndex
    let activeSegment = currentRoute.segments[segmentIndex];

    // Fallback: If the segment at activeSegmentIndex doesn't match the current map
    // (can happen if user manually switches maps), find the nearest segment on this map
    // Compare mapFile (not floor) for cross-building support
    if (!activeSegment || activeSegment.mapFile !== currentMapFile) {
        // First, try to find a segment on the current map at or after the current index
        for (let i = segmentIndex; i < currentRoute.segments.length; i++) {
            if (currentRoute.segments[i].mapFile === currentMapFile) {
                activeSegment = currentRoute.segments[i];
                segmentIndex = i;
                currentRoute.activeSegmentIndex = i;  // Update the index
                break;
            }
        }
        // If still not found, search from the beginning
        if (!activeSegment || activeSegment.mapFile !== currentMapFile) {
            for (let i = 0; i < segmentIndex; i++) {
                if (currentRoute.segments[i].mapFile === currentMapFile) {
                    activeSegment = currentRoute.segments[i];
                    segmentIndex = i;
                    currentRoute.activeSegmentIndex = i;
                    break;
                }
            }
        }
    }

    if (activeSegment && activeSegment.mapFile === currentMapFile && activeSegment.path && activeSegment.path.length > 0) {
        foundPath = true;
        for (const point of activeSegment.path) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }
    }

    // Include start room marker only if this is the first segment
    // Compare mapFile (not floor) for cross-building support
    if (segmentIndex === 0 && currentRoute.startRoom && currentRoute.startRoom.mapFile === currentMapFile) {
        minX = Math.min(minX, currentRoute.startRoom.x);
        maxX = Math.max(maxX, currentRoute.startRoom.x);
        minY = Math.min(minY, currentRoute.startRoom.y);
        maxY = Math.max(maxY, currentRoute.startRoom.y);
        foundPath = true;
    }

    // Include end room marker only if this is the last segment
    // Compare mapFile (not floor) for cross-building support
    const isLastSegment = segmentIndex === currentRoute.segments.length - 1;
    if (isLastSegment && currentRoute.endRoom && currentRoute.endRoom.mapFile === currentMapFile) {
        minX = Math.min(minX, currentRoute.endRoom.x);
        maxX = Math.max(maxX, currentRoute.endRoom.x);
        minY = Math.min(minY, currentRoute.endRoom.y);
        maxY = Math.max(maxY, currentRoute.endRoom.y);
        foundPath = true;
    }

    if (!foundPath) return;

    // Add padding around the route (in grid tiles)
    const padding = 10;
    minX = Math.max(0, minX - padding);
    maxX = Math.min(mapData.width - 1, maxX + padding);
    minY = Math.max(0, minY - padding);
    maxY = Math.min(mapData.height - 1, maxY + padding);

    // Calculate the center of the route bounds
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Calculate zoom level to fit the route in view
    const routeWidth = (maxX - minX + 1);
    const routeHeight = (maxY - minY + 1);

    // When the map is rotated, the viewport's effective width/height in world space changes
    // We need to calculate how the route bounds will appear on the rotated screen
    const cos = Math.abs(Math.cos(mapRotation));
    const sin = Math.abs(Math.sin(mapRotation));

    // The rotated viewport dimensions in world space
    // (how much world space is visible in each direction after rotation)
    const effectiveViewportWidth = canvas.width * cos + canvas.height * sin;
    const effectiveViewportHeight = canvas.width * sin + canvas.height * cos;

    // Calculate tile size needed to fit route in the rotated viewport
    const fitTileSizeX = effectiveViewportWidth / routeWidth;
    const fitTileSizeY = effectiveViewportHeight / routeHeight;
    const fitTileSize = Math.min(fitTileSizeX, fitTileSizeY);

    // Clamp tile size to reasonable bounds (4-32 for good visibility)
    tileSize = Math.max(4, Math.min(32, Math.floor(fitTileSize)));

    // Center camera on the route
    cameraX = (centerX * tileSize) - (canvas.width / 2);
    cameraY = (centerY * tileSize) - (canvas.height / 2);

    needsRedraw = true;
}

// Center camera on the found room marker
// Uses more padding than route centering for a slightly zoomed-out view
function centerOnRoom() {
    if (!foundRoomMarker) return;

    // Only center if the marker is on the current map (cross-building support)
    if (foundRoomMarker.mapFile !== currentMapFile) return;

    // Calculate the actual center of the room (not top-left corner)
    const roomWidth = foundRoomMarker.width || 4;
    const roomHeight = foundRoomMarker.height || 3;
    const roomCenterX = foundRoomMarker.x + roomWidth / 2;
    const roomCenterY = foundRoomMarker.y + roomHeight / 2;

    // Use larger padding for a more zoomed-out view (20 tiles instead of 10)
    const padding = 20;
    const minX = Math.max(0, roomCenterX - padding);
    const maxX = Math.min(mapData.width - 1, roomCenterX + padding);
    const minY = Math.max(0, roomCenterY - padding);
    const maxY = Math.min(mapData.height - 1, roomCenterY + padding);

    // Calculate the center and zoom
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const viewWidth = (maxX - minX + 1);
    const viewHeight = (maxY - minY + 1);

    // When the map is rotated, the viewport's effective width/height in world space changes
    const cos = Math.abs(Math.cos(mapRotation));
    const sin = Math.abs(Math.sin(mapRotation));
    const effectiveViewportWidth = canvas.width * cos + canvas.height * sin;
    const effectiveViewportHeight = canvas.width * sin + canvas.height * cos;

    // Calculate tile size to fit the view in the rotated viewport
    const fitTileSizeX = effectiveViewportWidth / viewWidth;
    const fitTileSizeY = effectiveViewportHeight / viewHeight;
    const fitTileSize = Math.min(fitTileSizeX, fitTileSizeY);

    // Clamp tile size (slightly lower max for more zoom-out: 24 instead of 32)
    tileSize = Math.max(4, Math.min(24, Math.floor(fitTileSize)));

    // Center camera on the room
    cameraX = (centerX * tileSize) - (canvas.width / 2);
    cameraY = (centerY * tileSize) - (canvas.height / 2);

    needsRedraw = true;
}

// Center camera on a specific staircase after floor switch
// staircaseId format: "Left Stairs\n##N" (name + entrance ID)
// Returns { textbox, index } if found, null otherwise (for opening info panel)
function centerOnStaircase(staircaseId) {
    if (!staircaseId) {
        centerCamera();
        return null;
    }

    const idParts = staircaseId.split('\n');
    // Strip asterisk prefix when comparing (e.g., "*CTE Back Stairs" -> "cte back stairs")
    let targetName = idParts[0]?.toLowerCase();
    if (targetName?.startsWith('*')) {
        targetName = targetName.substring(1);
    }
    const targetEntranceId = idParts[1]?.toUpperCase();  // e.g., "##N"

    // Search through textboxes for matching staircase (case-insensitive)
    for (let i = 0; i < textboxes.length; i++) {
        const textbox = textboxes[i];
        if (!textbox.text) continue;
        const lines = textbox.text.split('\n');
        // Strip asterisk prefix from textbox name too
        let name = lines[0]?.trim().toLowerCase();
        if (name?.startsWith('*')) {
            name = name.substring(1);
        }
        const entranceId = lines[2]?.trim().toUpperCase();  // Skip arrow on line 2

        // Match by name + entrance ID (if provided)
        if (name === targetName) {
            if (!targetEntranceId || entranceId === targetEntranceId) {
                // Center on this textbox
                const centerX = textbox.grid_x + textbox.grid_width / 2;
                const centerY = textbox.grid_y + textbox.grid_height / 2;
                cameraX = (centerX * tileSize) - (canvas.width / 2);
                cameraY = (centerY * tileSize) - (canvas.height / 2);
                clampCamera();
                needsRedraw = true;
                return { textbox, index: i };
            }
        }
    }

    // Fallback: just center camera if staircase not found
    centerCamera();
    return null;
}

// Center and zoom camera to show all textboxes in highlightedCategoryTextboxes array
function centerOnCategoryItems() {
    if (!highlightedCategoryTextboxes || highlightedCategoryTextboxes.length === 0) return;

    // Calculate bounding box of all highlighted textboxes
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const idx of highlightedCategoryTextboxes) {
        const textbox = textboxes[idx];
        if (!textbox) continue;

        const left = textbox.grid_x;
        const top = textbox.grid_y;
        const right = textbox.grid_x + (textbox.grid_width || 4);
        const bottom = textbox.grid_y + (textbox.grid_height || 3);

        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, right);
        maxY = Math.max(maxY, bottom);
    }

    // Add padding around the bounding box
    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(mapData.width - 1, maxX + padding);
    maxY = Math.min(mapData.height - 1, maxY + padding);

    // Calculate center and view size
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const viewWidth = maxX - minX + 1;
    const viewHeight = maxY - minY + 1;

    // Account for rotation when calculating effective viewport size
    const cos = Math.abs(Math.cos(mapRotation));
    const sin = Math.abs(Math.sin(mapRotation));
    const effectiveViewportWidth = canvas.width * cos + canvas.height * sin;
    const effectiveViewportHeight = canvas.width * sin + canvas.height * cos;

    // Calculate tile size to fit the view
    const fitTileSizeX = effectiveViewportWidth / viewWidth;
    const fitTileSizeY = effectiveViewportHeight / viewHeight;
    const fitTileSize = Math.min(fitTileSizeX, fitTileSizeY);

    // Clamp tile size (allow more zoom-out for category views: min 2, max 20)
    tileSize = Math.max(2, Math.min(20, Math.floor(fitTileSize)));

    // Center camera on the bounding box
    cameraX = (centerX * tileSize) - (canvas.width / 2);
    cameraY = (centerY * tileSize) - (canvas.height / 2);

    needsRedraw = true;
}

// ============================================
// RENDERING ENGINE
// ============================================

// Find nearest walkable tile to a given position (true closest, not first found)
function findNearestWalkableTile(roomX, roomY, searchRadius = 30) {
    const targetX = roomX;
    const targetY = roomY;
    const startX = Math.floor(roomX);
    const startY = Math.floor(roomY);

    // Check the starting position first
    if (startY >= 0 && startY < mapData.height && startX >= 0 && startX < mapData.width) {
        if (mapData.data[startY] && isWalkableTile(mapData.data[startY][startX])) {
            return { x: startX, y: startY };
        }
    }

    // Search outward and find the CLOSEST walkable tile (by Euclidean distance)
    let bestTile = null;
    let bestDistance = Infinity;

    for (let r = 1; r <= searchRadius; r++) {
        // If we already found a tile closer than this radius, we're done
        if (bestTile && bestDistance < r) {
            break;
        }

        for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // Only check perimeter

                const x = startX + dx;
                const y = startY + dy;

                if (x >= 0 && x < mapData.width && y >= 0 && y < mapData.height) {
                    if (mapData.data[y] && isWalkableTile(mapData.data[y][x])) {
                        // Calculate true distance from target point
                        const distance = Math.sqrt(
                            Math.pow(x + 0.5 - targetX, 2) +
                            Math.pow(y + 0.5 - targetY, 2)
                        );
                        if (distance < bestDistance) {
                            bestDistance = distance;
                            bestTile = { x, y };
                        }
                    }
                }
            }
        }
    }
    return bestTile;
}

// Draw route on canvas
function drawRoute() {
    if (!currentRoute.active || !currentRoute.segments) return;

    // Draw path segments for current map - full path always visible
    for (let segIdx = 0; segIdx < currentRoute.segments.length; segIdx++) {
        const segment = currentRoute.segments[segIdx];
        if (segment.type === 'stairs') continue; // Skip stair transitions
        // Compare mapFile (not floor) for cross-building support
        if (segment.mapFile !== currentMapFile) continue; // Only draw current map's path

        const path = segment.path;
        if (!path || path.length < 2) continue;

        // Draw full path line - WB Orange for contrast on light blue
        const lineWidth = Math.max(4, tileSize / 3);
        ctx.beginPath();
        ctx.strokeStyle = '#FC5A1E'; // WB Orange
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const startScreen = {
            x: path[0].x * tileSize - cameraX + tileSize / 2,
            y: path[0].y * tileSize - cameraY + tileSize / 2
        };
        ctx.moveTo(startScreen.x, startScreen.y);

        for (let i = 1; i < path.length; i++) {
            const screenX = path[i].x * tileSize - cameraX + tileSize / 2;
            const screenY = path[i].y * tileSize - cameraY + tileSize / 2;
            ctx.lineTo(screenX, screenY);
        }
        ctx.stroke();

        // Draw moving dot only on the active segment
        if (routeAnimation.active && segIdx === (currentRoute.activeSegmentIndex || 0)) {
            // Use elapsed time with modulo for continuous per-segment looping
            const elapsed = performance.now() - routeAnimation.startTime;
            const segProgress = (elapsed % routeAnimation.duration) / routeAnimation.duration;

            // Calculate dot position along path
            const maxIndex = path.length - 1;
            const exactIndex = maxIndex * segProgress;
            const floorIndex = Math.floor(exactIndex);
            const fraction = exactIndex - floorIndex;

            let dotX, dotY;
            if (fraction > 0 && floorIndex < maxIndex) {
                const p1 = path[floorIndex];
                const p2 = path[floorIndex + 1];
                dotX = (p1.x + (p2.x - p1.x) * fraction) * tileSize - cameraX + tileSize / 2;
                dotY = (p1.y + (p2.y - p1.y) * fraction) * tileSize - cameraY + tileSize / 2;
            } else {
                const p = path[Math.min(floorIndex, maxIndex)];
                dotX = p.x * tileSize - cameraX + tileSize / 2;
                dotY = p.y * tileSize - cameraY + tileSize / 2;
            }

            const dotRadius = lineWidth * 1.2;
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#22c55e';
            ctx.fill();
        }
    }

    // Draw start marker (open circle) - theme-aware colors
    // Compare mapFile (not floor) for cross-building support
    const canvasColors = getCanvasColors();
    if (currentRoute.startRoom && currentRoute.startRoom.mapFile === currentMapFile) {
        const startTile = findNearestWalkableTile(
            currentRoute.startRoom.x,
            currentRoute.startRoom.y
        );
        if (startTile) {
            const screenX = startTile.x * tileSize - cameraX + tileSize / 2;
            const screenY = startTile.y * tileSize - cameraY + tileSize / 2;
            const radius = Math.max(10, tileSize / 2);

            ctx.beginPath();
            ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
            ctx.fillStyle = canvasColors.startMarkerFill;
            ctx.fill();
            ctx.strokeStyle = canvasColors.startMarkerStroke;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }

    // Draw end marker (map pin) - WB Orange with theme-aware border
    // Compare mapFile (not floor) for cross-building support
    if (currentRoute.endRoom && currentRoute.endRoom.mapFile === currentMapFile) {
        const endTile = findNearestWalkableTile(
            currentRoute.endRoom.x,
            currentRoute.endRoom.y
        );
        if (endTile) {
            const pinTipX = endTile.x * tileSize - cameraX + tileSize / 2;
            const pinTipY = endTile.y * tileSize - cameraY + tileSize / 2;
            const pinRadius = Math.max(9, tileSize * 0.45);
            const pinHeight = pinRadius * 2.4;
            const centerY = pinTipY - pinHeight;

            // Draw teardrop pin shape using bezier curves
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(pinTipX, pinTipY);
            ctx.bezierCurveTo(
                pinTipX - pinRadius * 0.8, pinTipY - pinHeight * 0.4,
                pinTipX - pinRadius, centerY + pinRadius * 0.1,
                pinTipX - pinRadius, centerY
            );
            ctx.arc(pinTipX, centerY, pinRadius, Math.PI, 0, false);
            ctx.bezierCurveTo(
                pinTipX + pinRadius, centerY + pinRadius * 0.1,
                pinTipX + pinRadius * 0.8, pinTipY - pinHeight * 0.4,
                pinTipX, pinTipY
            );
            ctx.closePath();
            ctx.fillStyle = canvasColors.endMarkerFill;
            ctx.fill();
            ctx.strokeStyle = canvasColors.endMarkerStroke;
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Inner white dot
            ctx.beginPath();
            ctx.arc(pinTipX, centerY, pinRadius * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.restore();
        }
    }

    // Draw stair indicator if route requires floor change
    if (currentRoute.requiresFloorChange && currentRoute.stairsUsed) {
        let stairScreenX = null;
        let stairScreenY = null;
        let stairTilePos = null;
        let currentSegment = null;

        if (currentRoute.isDisconnectedRoute) {
            // Disconnected route: use tracked segment index
            // NOTE: Do NOT modify currentRoute.activeSegmentIndex here - this runs in render loop
            // and could interfere with centerOnRoute() during async map loading
            let segmentIndex = currentRoute.activeSegmentIndex || 0;
            currentSegment = currentRoute.segments[segmentIndex];

            // Fallback: If segment at current index doesn't match current map, find one that does
            // (for drawing purposes only - don't update the global state)
            // Compare mapFile (not floor) for cross-building support
            if (!currentSegment || currentSegment.mapFile !== currentMapFile) {
                for (let i = 0; i < currentRoute.segments.length; i++) {
                    if (currentRoute.segments[i].mapFile === currentMapFile) {
                        currentSegment = currentRoute.segments[i];
                        segmentIndex = i;
                        // Do NOT update currentRoute.activeSegmentIndex here!
                        break;
                    }
                }
            }

            if (segmentIndex === 0 && currentSegment && currentSegment.mapFile === currentMapFile) {
                // First segment on start floor - show button at first stair (going down)
                stairTilePos = currentSegment.stairEnd || (currentSegment.path && currentSegment.path[currentSegment.path.length - 1]);
            } else if (segmentIndex === 1 && currentSegment && currentSegment.mapFile === currentMapFile) {
                // Middle floor segment - show button at second stair (where to go up)
                stairTilePos = currentSegment.stairEnd || (currentSegment.path && currentSegment.path[currentSegment.path.length - 1]);
            }
            // segmentIndex === 2: no stair button needed, arrived at destination
        } else {
            // Regular cross-floor route
            currentSegment = getActiveSegmentForCurrentMap();

            if (currentSegment) {
                if (currentMapFile === currentRoute.startRoom.mapFile) {
                    // On start map - stair is at the END of this segment's path
                    stairTilePos = currentSegment.stairEnd || (currentSegment.path && currentSegment.path[currentSegment.path.length - 1]);
                } else {
                    // On end map - stair is at the START of this segment's path
                    stairTilePos = currentSegment.stairStart || (currentSegment.path && currentSegment.path[0]);
                }
            }
        }

        if (stairTilePos) {
            // Find the floor connection textbox (stairs or elevator) nearest to this position
            // Use elevator when elevatorAccessRequired is true, otherwise use stairs
            const useElevator = typeof elevatorAccessRequired !== 'undefined' && elevatorAccessRequired;
            const searchTerm = useElevator ? 'elevator' : 'stairs';

            let bestTextbox = null;
            let bestDistance = Infinity;

            for (const textbox of textboxes) {
                if (textbox.text && textbox.text.toLowerCase().includes(searchTerm)) {
                    const pos = getTextboxPosition(textbox);
                    const dims = getTextboxDimensions(textbox);
                    const tbW = dims.width || 4;
                    const tbH = dims.height || 3;

                    // Calculate distance from stair tile to textbox center
                    const tbCenterX = pos.x + tbW / 2;
                    const tbCenterY = pos.y + tbH / 2;
                    const dist = Math.abs(stairTilePos.x - tbCenterX) + Math.abs(stairTilePos.y - tbCenterY);

                    if (dist < bestDistance) {
                        bestDistance = dist;
                        bestTextbox = textbox;
                    }
                }
            }

            if (bestTextbox) {
                // Position on the textbox that's nearest to the actual path endpoint
                const tbX = bestTextbox.grid_x !== undefined ? bestTextbox.grid_x : bestTextbox.x;
                const tbY = bestTextbox.grid_y !== undefined ? bestTextbox.grid_y : bestTextbox.y;
                const tbW = bestTextbox.grid_width !== undefined ? bestTextbox.grid_width : (bestTextbox.width || 4);
                const tbH = bestTextbox.grid_height !== undefined ? bestTextbox.grid_height : (bestTextbox.height || 3);

                stairScreenX = (tbX + tbW / 2) * tileSize - cameraX;
                stairScreenY = (tbY + tbH / 2) * tileSize - cameraY;
            }
        }

        if (stairScreenX !== null && stairScreenY !== null) {
            // Determine arrow direction based on floor change direction
            let showUpArrow;

            if (currentRoute.isDisconnectedRoute) {
                // Disconnected route: start(upper) → middle(lower) → back to start(upper)
                // On start floor (segment 0): going DOWN to middle floor
                // On middle floor (segment 1): going UP back to destination floor
                const segmentIndex = currentRoute.activeSegmentIndex || 0;
                showUpArrow = (segmentIndex === 1); // Middle floor goes UP
            } else {
                const isGoingUp = currentRoute.direction === 'up';
                // Compare mapFile (not floor) for cross-building support
                const isOnStartMap = currentMapFile === currentRoute.startRoom.mapFile;
                // Show up arrow if going up and on start map, or going down and on end map
                showUpArrow = (isGoingUp && isOnStartMap) || (!isGoingUp && !isOnStartMap);
            }

            // Fixed size button - does NOT scale with zoom
            const radius = 18;

            // Store the button position for click detection
            window.stairButtonPosition = {
                x: stairScreenX,
                y: stairScreenY,
                radius: radius
            };

            // Draw background circle - make it prominent
            ctx.beginPath();
            ctx.arc(stairScreenX, stairScreenY, radius, 0, Math.PI * 2);
            ctx.fillStyle = canvasColors.stairButtonBg;
            ctx.fill();
            ctx.strokeStyle = canvasColors.stairButtonBorder;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Draw directional arrow - fixed font size
            ctx.fillStyle = canvasColors.stairButtonText;
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(showUpArrow ? '\u2B06' : '\u2B07', stairScreenX, stairScreenY);
        }
    }
}

// Draw the found room marker (yellow star) on the canvas
function drawFoundRoomMarker() {
    if (!foundRoomMarker) return;

    // Only draw if the marker is on the current map (cross-building support)
    if (foundRoomMarker.mapFile !== currentMapFile) return;

    // Calculate the center of the room (not the entrance)
    // The room's x,y is the top-left corner, so add half the width/height to get center
    const roomWidth = foundRoomMarker.width || 4;
    const roomHeight = foundRoomMarker.height || 3;
    const centerX = foundRoomMarker.x + roomWidth / 2;
    const centerY = foundRoomMarker.y + roomHeight / 2;

    // Calculate screen position at the center of the room
    const screenX = centerX * tileSize - cameraX;
    const screenY = centerY * tileSize - cameraY;

    // Star size scales with both zoom level AND room size
    // Use the smaller dimension to ensure star fits inside the room
    const roomSize = Math.min(roomWidth, roomHeight);
    // Base size scales with room size (larger rooms get larger stars)
    const baseSizeMultiplier = Math.max(0.8, Math.min(2.0, roomSize / 4));
    // Final radius: scales with zoom, room size, and has min/max bounds
    const outerRadius = Math.max(20, Math.min(60, tileSize * 1.2 * baseSizeMultiplier));
    const innerRadius = outerRadius * 0.4;
    const points = 5;

    // Draw a 5-pointed star
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / 2) + (i * Math.PI / points); // Start from top
        const x = screenX + Math.cos(angle) * radius;
        const y = screenY - Math.sin(angle) * radius;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();

    // Fill with bright yellow - use theme colors
    const canvasColors = getCanvasColors();
    ctx.fillStyle = canvasColors.starFill;
    ctx.fill();

    // Dark border for visibility on any background
    ctx.strokeStyle = canvasColors.starStroke;
    ctx.lineWidth = 2;
    ctx.stroke();
}

// ============================================
// DOOR SWING VISUALIZATION
// ============================================

// Draw door swing arcs for all doorways with metadata
function drawDoorSwings() {
    if (!doorMeta || Object.keys(doorMeta).length === 0) return;

    const canvasColors = getCanvasColors();

    for (const key in doorMeta) {
        const [row, col] = key.split(',').map(Number);
        const meta = doorMeta[key];
        if (!meta) continue;

        // Calculate screen position
        const screenX = col * tileSize - cameraX;
        const screenY = row * tileSize - cameraY;
        const tileCenterX = screenX + tileSize / 2;
        const tileCenterY = screenY + tileSize / 2;

        // Cull off-screen door swings for performance
        if (screenX + tileSize < 0 || screenX > canvas.width ||
            screenY + tileSize < 0 || screenY > canvas.height) {
            continue;
        }

        drawSingleDoorSwing(
            ctx, tileCenterX, tileCenterY, tileSize,
            meta.direction, meta.side, meta.hinge,
            canvasColors
        );
    }
}

// Draw a single door swing arc and line
// Note: targetCtx parameter allows drawing to either main canvas or preview canvas
function drawSingleDoorSwing(targetCtx, centerX, centerY, size, direction, side, hinge, colors) {
    const arcRadius = size * 0.9;
    const doorLength = arcRadius * 0.95;

    // Calculate hinge position based on side and hinge
    let hingeX, hingeY;
    switch (side) {
        case 'top':
            hingeY = centerY - size / 2;
            hingeX = hinge === 'left' ? centerX - size / 2 : centerX + size / 2;
            break;
        case 'bottom':
            hingeY = centerY + size / 2;
            hingeX = hinge === 'left' ? centerX - size / 2 : centerX + size / 2;
            break;
        case 'left':
            hingeX = centerX - size / 2;
            hingeY = hinge === 'left' ? centerY - size / 2 : centerY + size / 2;
            break;
        case 'right':
            hingeX = centerX + size / 2;
            hingeY = hinge === 'left' ? centerY - size / 2 : centerY + size / 2;
            break;
        default:
            return;
    }

    // Explicit lookup for all 16 combinations to ensure arc always curves correctly
    // startAngle: where door starts (closed, parallel to edge)
    // swingCW: true = clockwise (positive), false = counterclockwise (negative)
    const config = {
        // Top edge: door starts pointing along the edge
        'top-left-into': { startAngle: 0, swingCW: true },      // swing down into tile
        'top-left-out': { startAngle: 0, swingCW: false },      // swing up out of tile
        'top-right-into': { startAngle: Math.PI, swingCW: false }, // swing down into tile
        'top-right-out': { startAngle: Math.PI, swingCW: true },   // swing up out of tile
        // Bottom edge
        'bottom-left-into': { startAngle: 0, swingCW: false },     // swing up into tile
        'bottom-left-out': { startAngle: 0, swingCW: true },       // swing down out of tile
        'bottom-right-into': { startAngle: Math.PI, swingCW: true }, // swing up into tile
        'bottom-right-out': { startAngle: Math.PI, swingCW: false }, // swing down out of tile
        // Left edge: hinge 'left' = top corner, hinge 'right' = bottom corner
        'left-left-into': { startAngle: Math.PI / 2, swingCW: false },  // swing right into tile
        'left-left-out': { startAngle: Math.PI / 2, swingCW: true },    // swing left out of tile
        'left-right-into': { startAngle: -Math.PI / 2, swingCW: true }, // swing right into tile
        'left-right-out': { startAngle: -Math.PI / 2, swingCW: false }, // swing left out of tile
        // Right edge: hinge 'left' = top corner, hinge 'right' = bottom corner
        'right-left-into': { startAngle: Math.PI / 2, swingCW: true },   // swing left into tile
        'right-left-out': { startAngle: Math.PI / 2, swingCW: false },   // swing right out of tile
        'right-right-into': { startAngle: -Math.PI / 2, swingCW: false }, // swing left into tile
        'right-right-out': { startAngle: -Math.PI / 2, swingCW: true },   // swing right out of tile
    };

    const key = `${side}-${hinge}-${direction}`;
    const swingConfig = config[key];
    if (!swingConfig) return;

    const startAngle = swingConfig.startAngle;
    const swingDirection = swingConfig.swingCW ? 1 : -1;
    const endAngle = startAngle + (swingDirection * Math.PI / 2);

    // Draw dashed arc showing swing path
    targetCtx.save();
    targetCtx.setLineDash([4, 4]);
    targetCtx.strokeStyle = colors.doorSwingArc;
    targetCtx.lineWidth = Math.max(1, size / 16);
    targetCtx.beginPath();
    targetCtx.arc(hingeX, hingeY, arcRadius, startAngle, endAngle, swingDirection < 0);
    targetCtx.stroke();
    targetCtx.setLineDash([]);

    // Draw door line (at 90 degrees open position)
    targetCtx.strokeStyle = colors.doorSwingLine;
    targetCtx.lineWidth = Math.max(2, size / 8);
    targetCtx.lineCap = 'round';
    const doorEndX = hingeX + Math.cos(endAngle) * doorLength;
    const doorEndY = hingeY + Math.sin(endAngle) * doorLength;
    targetCtx.beginPath();
    targetCtx.moveTo(hingeX, hingeY);
    targetCtx.lineTo(doorEndX, doorEndY);
    targetCtx.stroke();

    targetCtx.restore();
}

// Clamp camera to map bounds and ensure integer coordinates
function clampCamera() {
    const mapPixelWidth = mapData.width * tileSize;
    const mapPixelHeight = mapData.height * tileSize;

    // Handle case where map is smaller than viewport - center it
    if (mapPixelWidth <= canvas.width) {
        cameraX = -(canvas.width - mapPixelWidth) / 2;
    } else {
        // Normal clamping for larger maps
        if (cameraX < 0) cameraX = 0;
        if (cameraX > mapPixelWidth - canvas.width) {
            cameraX = mapPixelWidth - canvas.width;
        }
    }

    if (mapPixelHeight <= canvas.height) {
        cameraY = -(canvas.height - mapPixelHeight) / 2;
    } else {
        // Normal clamping for larger maps
        if (cameraY < 0) cameraY = 0;
        if (cameraY > mapPixelHeight - canvas.height) {
            cameraY = mapPixelHeight - canvas.height;
        }
    }

    // Ensure integer coordinates to prevent sub-pixel rendering artifacts
    cameraX = Math.floor(cameraX);
    cameraY = Math.floor(cameraY);
}

// Optimized drawing function with culling
function draw() {
    if (!needsRedraw) return;
    needsRedraw = false;

    // Clamp camera to prevent panning into grey area
    clampCamera();

    // Get theme colors for this frame
    const colors = getColors();
    const canvasColors = getCanvasColors();

    // Fill background with theme color (before rotation transform)
    ctx.fillStyle = canvasColors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply rotation transform around canvas center
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    ctx.save();
    try {
        ctx.translate(centerX, centerY);
        ctx.rotate(mapRotation);
        ctx.translate(-centerX, -centerY);

        // Calculate visible tile range
        // When rotated, we need to draw more tiles to cover corners
        const rotationPadding = Math.abs(mapRotation) > 0.01 ?
            Math.ceil(Math.max(canvas.width, canvas.height) * Math.abs(Math.sin(mapRotation)) / tileSize) + 2 : 0;
        const startX = Math.max(0, Math.floor(cameraX / tileSize) - rotationPadding);
        const startY = Math.max(0, Math.floor(cameraY / tileSize) - rotationPadding);
        const endX = Math.min(mapData.width, Math.ceil((cameraX + canvas.width) / tileSize) + 1 + rotationPadding);
        const endY = Math.min(mapData.height, Math.ceil((cameraY + canvas.height) / tileSize) + 1 + rotationPadding);
        
        // Check if we're in navigation view (either actual student or toggle mode)
        // This must be checked EVERY frame to ensure grid never appears
        const inNavigationView = document.body.classList.contains('navigation-view') || 
                              document.body.classList.contains('role-personnel');
        
        // Draw tiles WITHOUT any grid lines in navigation view
        // Use Math.floor() to ensure integer pixel coordinates (prevents sub-pixel anti-aliasing artifacts)
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                // Safety check to avoid accessing undefined data
                if (!mapData.data[y] || mapData.data[y][x] === undefined) continue;

                const tileType = mapData.data[y][x];
                const screenX = Math.floor(x * tileSize - cameraX);
                const screenY = Math.floor(y * tileSize - cameraY);

                ctx.fillStyle = colors[tileType] || canvasColors.background;
                ctx.fillRect(screenX, screenY, tileSize, tileSize);
            }
        }

        // Draw grid ONLY in editor mode (separate loop for clarity)
        if (!inNavigationView && tileSize >= 8) {
            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    const screenX = Math.floor(x * tileSize - cameraX);
                    const screenY = Math.floor(y * tileSize - cameraY);

                    ctx.strokeStyle = canvasColors.gridLine;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(screenX + 0.5, screenY + 0.5, tileSize - 1, tileSize - 1);
                }
            }
        }
            

        // Draw faint grid lines on hallway tiles (type 3) in all views
        if (tileSize >= 8) {
            ctx.strokeStyle = canvasColors.hallwayGrid;
            ctx.lineWidth = 1;
            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    if (!mapData.data[y] || mapData.data[y][x] === undefined) continue;
                    if (mapData.data[y][x] === 3) { // Hallway tile
                        const screenX = Math.floor(x * tileSize - cameraX);
                        const screenY = Math.floor(y * tileSize - cameraY);
                        ctx.strokeRect(screenX + 0.5, screenY + 0.5, tileSize - 1, tileSize - 1);
                    }
                }
            }
        }

        // Draw barely-visible grid lines on sidewalk tiles (type 7) in all views
        if (tileSize >= 8) {
            ctx.strokeStyle = canvasColors.sidewalkGrid;
            ctx.lineWidth = 1;
            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    if (!mapData.data[y] || mapData.data[y][x] === undefined) continue;
                    if (mapData.data[y][x] === 7) { // Sidewalk tile
                        const screenX = Math.floor(x * tileSize - cameraX);
                        const screenY = Math.floor(y * tileSize - cameraY);
                        ctx.strokeRect(screenX + 0.5, screenY + 0.5, tileSize - 1, tileSize - 1);
                    }
                }
            }
        }
        
        // Draw bucket preview
        if (currentMode === 'bucket' && bucketFillOrigin && isMouseDown) {
            // Use screenToWorld if available (defined in map_interactions.js) to account for rotation
            let currentWorldX, currentWorldY;
            if (typeof screenToWorld === 'function') {
                const worldCoords = screenToWorld(lastMouseX, lastMouseY);
                currentWorldX = worldCoords.x;
                currentWorldY = worldCoords.y;
            } else {
                // Fallback if screenToWorld not yet loaded
                currentWorldX = lastMouseX + cameraX;
                currentWorldY = lastMouseY + cameraY;
            }

            const startX = Math.min(bucketFillOrigin.x, Math.floor(currentWorldX / tileSize));
            const startY = Math.min(bucketFillOrigin.y, Math.floor(currentWorldY / tileSize));
            const endX = Math.max(bucketFillOrigin.x, Math.floor(currentWorldX / tileSize));
            const endY = Math.max(bucketFillOrigin.y, Math.floor(currentWorldY / tileSize));

            const screenX = startX * tileSize - cameraX;
            const screenY = startY * tileSize - cameraY;
            const width = (endX - startX + 1) * tileSize;
            const height = (endY - startY + 1) * tileSize;

            ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
            ctx.fillRect(screenX, screenY, width, height);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, screenY, width, height);
        }
        
        // Calculate rotation padding for textbox culling (in pixels)
        // When rotated, textboxes that appear "off-screen" in world coords may be visible after transform
        const textboxRotationPadding = Math.abs(mapRotation) > 0.01 ?
            Math.ceil(Math.max(canvas.width, canvas.height) * Math.abs(Math.sin(mapRotation))) + 50 : 0;

        // Draw textboxes
        textboxes.forEach((textbox, idx) => {
            // Convert grid coordinates to screen coordinates
            const pos = getTextboxPosition(textbox);
            const dims = getTextboxDimensions(textbox);

            const screenX = pos.x * tileSize - cameraX;
            const screenY = pos.y * tileSize - cameraY;
            const width = dims.width * tileSize;
            const height = dims.height * tileSize;

            // Cull offscreen textboxes (with rotation padding to avoid culling visible rotated content)
            if (screenX + width < -textboxRotationPadding || screenX > canvas.width + textboxRotationPadding ||
                screenY + height < -textboxRotationPadding || screenY > canvas.height + textboxRotationPadding) {
                return;
            }
            
            // Background - skip for marker textboxes (transparent)
            if (!textbox.isMarker) {
                ctx.fillStyle = editingTextbox === idx ? canvasColors.textboxBgEditing : canvasColors.textboxBg;
                ctx.fillRect(screenX, screenY, width, height);
            }

            // Draw border - light in navigation view, full in editor mode
            if (inNavigationView) {
                // Marker textboxes: no border at all in navigation view
                if (!textbox.isMarker) {
                    // Highlight effect when hovering or in category filter (navigation view only)
                    if (hoveredTextbox === idx) {
                        ctx.strokeStyle = '#3b82f6';  // Blue highlight for hover
                        ctx.lineWidth = 3;
                        ctx.strokeRect(screenX, screenY, width, height);
                    } else if (highlightedCategoryTextboxes.includes(idx)) {
                        ctx.strokeStyle = '#FC5A1E';  // Orange highlight for category filter
                        ctx.lineWidth = 3;
                        ctx.strokeRect(screenX, screenY, width, height);
                    } else {
                        // Light outline for navigation view
                        ctx.strokeStyle = canvasColors.textboxBorderStudent;
                        ctx.lineWidth = 1;
                        ctx.strokeRect(screenX, screenY, width, height);
                    }
                }
            } else {
                // Editor mode border - thinner for markers
                ctx.strokeStyle = canvasColors.textboxBorderEditor;
                ctx.lineWidth = textbox.isMarker ? 1 : 2;
                ctx.strokeRect(screenX, screenY, width, height);

                // Draw resize handle in textbox mode
                if (currentMode === 'textbox') {
                    const handleSize = RESIZE_HANDLE_SIZE;
                    const handleX = screenX + width - handleSize;
                    const handleY = screenY + height - handleSize;

                    // Draw resize handle (small square in bottom-right corner)
                    ctx.fillStyle = canvasColors.resizeHandle;
                    ctx.fillRect(handleX, handleY, handleSize, handleSize);

                    // Draw diagonal lines to indicate resize
                    ctx.strokeStyle = canvasColors.textboxBg;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(handleX + 3, handleY + handleSize - 3);
                    ctx.lineTo(handleX + handleSize - 3, handleY + 3);
                    ctx.moveTo(handleX + 6, handleY + handleSize - 3);
                    ctx.lineTo(handleX + handleSize - 3, handleY + 6);
                    ctx.stroke();
                }
            }
            
            // Text - always render regardless of zoom level
            if (width > 0 && height > 0) {
                const baseFontSize = textbox.font_size !== undefined ? textbox.font_size : (textbox.fontSize || 20);
                const fontSize = Math.max(1, baseFontSize * (tileSize / 32));
                ctx.font = textbox.isMarker ? `italic ${fontSize}px Arial` : `${fontSize}px Arial`;
                ctx.fillStyle = canvasColors.textboxText;

                const alignment = textbox.alignment || textbox.align || 'left';
                ctx.textAlign = alignment;

                const verticalAlignment = textbox.vertical_alignment || 'top';

                // Filter out internal identifier lines (starting with ##) and hidden aliases (starting with ~)
                // Note: Single # is allowed for room numbers like #101
                // Also strip trailing ^ (name continuation marker) from display
                const allLines = (textbox.text || '').split('\n');
                const lines = allLines
                    .filter(line => {
                        const trimmed = line.trim();
                        return !trimmed.startsWith('##') && !trimmed.startsWith('~');
                    })
                    .map(line => line.endsWith('^') ? line.slice(0, -1) : line);
                const lineHeight = fontSize * 1.5;
                const scrollOffset = textbox.scroll_offset || 0;
                const maxLines = Math.ceil(height / lineHeight);
                const visibleLines = Math.min(lines.length, maxLines);
                const totalTextHeight = visibleLines * lineHeight;

                // Calculate vertical start position based on alignment
                let verticalOffset = 5; // default top padding
                if (verticalAlignment === 'middle') {
                    verticalOffset = (height - totalTextHeight) / 2;
                } else if (verticalAlignment === 'bottom') {
                    verticalOffset = height - totalTextHeight - 5;
                }

                ctx.save();
                try {
                    // Marker textboxes render with reduced opacity so large labels don't dominate
                    if (textbox.isMarker) {
                        ctx.globalAlpha = 0.45;
                    }
                    ctx.beginPath();
                    ctx.rect(screenX, screenY, width, height);
                    ctx.clip();

                    for (let i = 0; i < visibleLines; i++) {
                        const line = lines[i];
                        const trimmedLine = line.trim();
                        let textX = screenX + 5;
                        if (alignment === 'center') textX = screenX + width / 2;
                        if (alignment === 'right') textX = screenX + width - 5;

                        const textY = screenY + verticalOffset + fontSize + (i * lineHeight) - scrollOffset;

                        // Check if this line contains arrow characters that need green box styling
                        const arrowChars = ['↑', '↓', '▲', '▼'];
                        const hasArrow = arrowChars.some(arrow => line.includes(arrow));

                        if (hasArrow && trimmedLine.length <= 2) {
                            // This line is just an arrow - render with green box
                            const arrowChar = trimmedLine;
                            const boxSize = fontSize * 1.1;
                            const boxX = textX - (alignment === 'center' ? boxSize / 2 : 0);
                            const boxY = textY - fontSize + (fontSize * 0.2);

                            // Draw green rounded rectangle
                            const radius = boxSize * 0.2;
                            ctx.fillStyle = canvasColors.arrowIndicatorBg;
                            ctx.beginPath();
                            ctx.roundRect(boxX - 2, boxY, boxSize + 4, boxSize + 2, radius);
                            ctx.fill();

                            // Draw white arrow
                            ctx.fillStyle = canvasColors.arrowIndicatorText;
                            ctx.fillText(arrowChar, textX, textY, width - 10);

                            // Reset to theme text color for next text
                            ctx.fillStyle = canvasColors.textboxText;
                        } else if (trimmedLine.startsWith('#') && !trimmedLine.startsWith('##')) {
                            // Room number line - render with blue badge/pill styling
                            const roomText = trimmedLine;
                            ctx.font = `bold ${fontSize}px Arial`;
                            const textWidth = ctx.measureText(roomText).width;
                            const badgePadding = fontSize * 0.3;
                            const badgeHeight = fontSize * 1.2;
                            const badgeWidth = textWidth + badgePadding * 2;
                            const radius = badgeHeight / 2;

                            // Calculate badge X position based on alignment
                            let badgeX;
                            if (alignment === 'center') {
                                badgeX = textX - badgeWidth / 2;
                            } else if (alignment === 'right') {
                                badgeX = textX - badgeWidth;
                            } else {
                                badgeX = textX;
                            }
                            const badgeY = textY - fontSize + (fontSize * 0.1);

                            // Draw rounded pill background
                            ctx.fillStyle = canvasColors.roomBadgeBg;
                            ctx.beginPath();
                            ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, radius);
                            ctx.fill();

                            // Draw room number text (centered vertically in the badge)
                            ctx.fillStyle = canvasColors.roomBadgeText;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            const badgeCenterY = badgeY + badgeHeight / 2;
                            ctx.fillText(roomText, badgeX + badgeWidth / 2, badgeCenterY, width - 10);

                            // Reset styles
                            ctx.textAlign = alignment;
                            ctx.textBaseline = 'alphabetic';
                            ctx.fillStyle = canvasColors.textboxText;
                            ctx.font = `${fontSize}px Arial`;
                        } else if (i === 0 && trimmedLine.length > 0 && !trimmedLine.startsWith('*')) {
                            // First line (teacher name) - render bold with underline
                            // Lines starting with * are non-teacher locations and skip this styling
                            ctx.font = `bold ${fontSize}px Arial`;
                            ctx.fillText(line, textX, textY, width - 10);

                            // Draw underline (below the text baseline)
                            const textWidth = ctx.measureText(line).width;
                            const underlineY = textY + fontSize * 0.25;
                            let underlineStartX;
                            if (alignment === 'center') {
                                underlineStartX = textX - textWidth / 2;
                            } else if (alignment === 'right') {
                                underlineStartX = textX - textWidth;
                            } else {
                                underlineStartX = textX;
                            }
                            ctx.beginPath();
                            ctx.strokeStyle = canvasColors.textboxText;
                            ctx.lineWidth = Math.max(1, fontSize * 0.08);
                            ctx.moveTo(underlineStartX, underlineY);
                            ctx.lineTo(underlineStartX + textWidth, underlineY);
                            ctx.stroke();

                            // Reset to normal font for subsequent lines
                            ctx.font = `${fontSize}px Arial`;
                        } else {
                            // Normal text rendering (or * prefixed non-teacher location)
                            const displayLine = trimmedLine.startsWith('*') ? line.replace('*', '') : line;
                            ctx.fillText(displayLine, textX, textY, width - 10);
                        }
                    }
                } finally {
                    // Always restore canvas state, even if an error occurred
                    ctx.restore();
                }
            }
        });

        // Draw route overlay (if active)
        drawRoute();

        // Draw found room marker (if active)
        drawFoundRoomMarker();

        // Draw door swing arcs (on top of everything)
        drawDoorSwings();

    } finally {
        // Restore canvas state (end rotation transform)
        // Using finally ensures state is restored even if an error occurs during drawing
        ctx.restore();
    }

    // Update info display (using cached elements)
    if (zoomLevelEl) zoomLevelEl.textContent = tileSize;
    if (posXEl) posXEl.textContent = Math.floor(cameraX / tileSize);
    if (posYEl) posYEl.textContent = Math.floor(cameraY / tileSize);
}

// Animation loop
function animate() {
    // Update route animation progress (loops continuously)
    if (routeAnimation.active) {
        const elapsed = performance.now() - routeAnimation.startTime;
        routeAnimation.progress = (elapsed % routeAnimation.duration) / routeAnimation.duration;

        // Check for pending segment animation (queued during floor switch)
        if (routeAnimation.pendingSegment !== null) {
            const pending = routeAnimation.pendingSegment;
            routeAnimation.pendingSegment = null;
            startRouteAnimation(pending);
        }
        needsRedraw = true;
    }

    draw();
    animationFrameId = requestAnimationFrame(animate);
}

function stopAnimation() {
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// Clean up animation frame on page unload to prevent memory leaks
window.addEventListener('beforeunload', stopAnimation);

// Initialize theme before first render
initTheme();

animate();

// ============================================
// HELPER FUNCTIONS
// ============================================

function setTile(x, y, tile) {
    if (x >= 0 && x < mapData.width && y >= 0 && y < mapData.height) {
        mapData.data[y][x] = tile;
    }
}

function bucketFill(startX, startY, endX, endY) {
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            setTile(x, y, currentTile);
        }
    }
}

function hasPrivilege(priv) {
    return userPrivileges.includes(priv);
}

function saveUndo() {
    undoHistory.push({
        map: JSON.parse(JSON.stringify(mapData.data)),
        textboxes: JSON.parse(JSON.stringify(textboxes)),
        doorMeta: JSON.parse(JSON.stringify(doorMeta))
    });

    if (undoHistory.length > MAX_UNDO) {
        undoHistory.shift();
    }

    // Mark that we have unsaved changes
    hasUnsavedChanges = true;
}

function undo() {
    if (undoHistory.length > 0 && (hasPrivilege('edit_map') || hasPrivilege('edit_textboxes'))) {
        const state = undoHistory.pop();
        mapData.data = state.map;
        textboxes = state.textboxes;
        doorMeta = state.doorMeta || {};
        needsRedraw = true;

        // Check if we've undone back to the saved state
        updateUnsavedChangesFlag();
    }
}

// ============================================
// UNSAVED CHANGES WARNING
// ============================================

// Warn user before closing/refreshing if there are unsaved changes
window.addEventListener('beforeunload', (e) => {
    // Recalculate flag in case user manually undid all changes
    updateUnsavedChangesFlag();
    if (hasUnsavedChanges) {
        e.preventDefault();
        // Most browsers show their own message, but we set returnValue for compatibility
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
    }
});
