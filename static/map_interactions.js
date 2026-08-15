// ============================================
// MAP INTERACTIONS - Mouse Events, UI Controls, File Management
// ============================================
//
// This file handles all user interactions for the map application.
// It's organized into logical sections that could be split into
// separate modules in the future:
//
// SECTIONS:
// - CUSTOM CURSORS - SVG cursor definitions
// - MOUSE EVENT HANDLERS - Canvas mouse interactions
// - ZOOM CONTROLS - Zoom in/out/recenter
// - MODE SELECTION - Pan/draw/bucket/textbox modes
// - TILE SELECTION - Tile palette
// - FILE MANAGEMENT - Save/load dialogs
// - MAP LOADING - Load maps from server
// - LOCATION DROPDOWN - Floor selection UI
// - TEXTBOX EDITING - Textbox dialog
// - KEYBOARD SHORTCUTS - Hotkey handlers
// - PATHFINDING - A* algorithm
// - ROOM INDEX - Searchable room database
// - ROUTE CALCULATION - Cross-floor routing
// - AUTOCOMPLETE - Search suggestions UI
//
// ============================================

// ============================================
// MOBILE: Clear stuck hover/focus on buttons
// ============================================
// On touch devices, :hover sticks after tapping a button until another
// interactive element is tapped. This listener blurs any focused button
// on ANY touch anywhere on the screen, clearing the stuck highlight
// immediately — whether the user taps the canvas, pans, zooms, etc.
document.addEventListener('touchstart', function() {
    var active = document.activeElement;
    if (active && active.tagName === 'BUTTON') {
        active.blur();
    }
}, { passive: true });

// ============================================
// CUSTOM CURSORS
// ============================================

// Pencil cursor for draw mode
const PENCIL_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' stroke='%23fff' stroke-width='1' d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'/%3E%3C/svg%3E") 2 22, crosshair`;

// Paint bucket - wide squat bucket tilted with paint pouring from left corner
const BUCKET_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cg transform='rotate(-45 12 10)'%3E%3Cpath fill='%23888' stroke='%23000' stroke-width='1' d='M5 8h14l-2 10H7L5 8z'/%3E%3Cellipse fill='%23aaa' stroke='%23000' stroke-width='1' cx='12' cy='8' rx='7' ry='3'/%3E%3C/g%3E%3Cpath fill='%2396BEE6' stroke='%23fff' stroke-width='0.5' d='M5 13c0 2 1 4 2 7c0.5 1.5-0.5 3-2 3s-2-1-2-2.5c0-2 1-5.5 2-7.5z'/%3E%3C/svg%3E") 4 22, cell`;

// Text "T" icon for textbox mode
const TEXT_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' fill='%23fff' stroke='%23000' stroke-width='1.5'/%3E%3Ctext x='12' y='17' font-family='Arial,sans-serif' font-size='14' font-weight='bold' text-anchor='middle' fill='%23000'%3ET%3C/text%3E%3C/svg%3E") 12 12, text`;

// Text "T" icon hover state - WB Orange background with white text
const TEXT_CURSOR_HOVER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' fill='%23FC5A1E' stroke='%23fff' stroke-width='1.5'/%3E%3Ctext x='12' y='17' font-family='Arial,sans-serif' font-size='14' font-weight='bold' text-anchor='middle' fill='%23fff'%3ET%3C/text%3E%3C/svg%3E") 12 12, pointer`;

// Info panel "i" icon for info panel mode
const INFO_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%233b82f6' stroke='%23fff' stroke-width='1.5'/%3E%3Ctext x='12' y='17' font-family='Arial,sans-serif' font-size='14' font-weight='bold' text-anchor='middle' fill='%23fff'%3Ei%3C/text%3E%3C/svg%3E") 12 12, pointer`;

// ============================================
// HELPER FUNCTIONS
// ============================================

// Hide the loading screen (called after map loads)
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
        loadingScreen.classList.add('hidden');
    }
}

// Maximum number of search suggestions to show in autocomplete
const MAX_SEARCH_RESULTS = 8;

/**
 * Expand sparse map format to dense 2D array.
 * Sparse format: { size: [height, width], tiles: [[row, col, value], ...] }
 * Dense format: [[0,0,1,0,...], [0,0,0,0,...], ...]
 *
 * Returns the dense map, or null if data is already dense or invalid.
 */
function expandSparseMap(data) {
    // Check if this is sparse format (has size and tiles arrays)
    if (!data.size || !Array.isArray(data.tiles)) {
        return null; // Not sparse format
    }

    const [height, width] = data.size;

    // Initialize empty map filled with zeros
    const denseMap = [];
    for (let row = 0; row < height; row++) {
        denseMap[row] = new Array(width).fill(0);
    }

    // Fill in non-zero tiles
    for (const tile of data.tiles) {
        const [row, col, value] = tile;
        if (row >= 0 && row < height && col >= 0 && col < width) {
            denseMap[row][col] = value;
        }
    }

    return denseMap;
}

// Note: Helper functions are defined in map_core.js (loaded first):
// - getTextboxPosition(), getTextboxDimensions()
// - getCurrentFloor(), getFloorFromFilename(), getMapFileForFloor()

// Check if a textbox is description-only (first line starts with "|" or "*|")
// These textboxes are visible on the map but excluded from autocomplete search
// Example: "| Open to Main Gym |" or "*| Open to Main Gym |" are purely descriptive
function isDescriptionOnly(text) {
    if (!text) return false;
    // Trim entire text first to handle leading newlines, then get first line
    let firstLine = text.trim().split('\n')[0].trim();
    // Strip the non-teacher marker (*) if present, then check for description marker (|)
    if (firstLine.startsWith('*')) {
        firstLine = firstLine.substring(1).trim();
    }
    return firstLine.startsWith('|');
}

// Check if currently in navigation view (either by role or manual toggle)
function isInNavigationView() {
    return document.body.classList.contains('navigation-view') ||
           document.body.classList.contains('role-personnel');
}

// Check if a textbox represents a staircase (for showing floor switch button)
// Must have "Stairs" in first line but NOT "Downstairs" or "Upstairs"
function isStaircaseTextbox(textbox) {
    if (!textbox || !textbox.text) return false;
    const firstLine = textbox.text.split('\n')[0].trim().toLowerCase();
    return firstLine.includes('stairs') &&
           !firstLine.includes('downstairs') &&
           !firstLine.includes('upstairs');
}

// Check if a textbox represents an elevator
function isElevatorTextbox(textbox) {
    if (!textbox || !textbox.text) return false;
    const firstLine = textbox.text.split('\n')[0].trim().toLowerCase();
    return firstLine.includes('elevator');
}

// ============================================
// LOCATION POPUP (Google Maps style)
// ============================================

// Currently selected location data for the directions button
let selectedLocationData = null;

// Deferred click detection for distinguishing clicks from pans
// This prevents the popup from showing when user intends to pan but starts on a textbox
let pendingTextboxClick = null;  // Stores {textbox, index, screenX, screenY} if mousedown was on a textbox
let pendingTextboxEdit = null;   // Stores {index} if mousedown was on textbox in edit mode (teacher/admin)
let mouseDownStartX = 0;         // Track mouse position at mousedown
let mouseDownStartY = 0;         // to measure movement distance
let pendingClickTimeout = null;  // Timeout for delayed single-click popup (allows double-click detection)
const DOUBLE_CLICK_DELAY = 300;  // Max ms to wait for double-click before showing popup

// Find clickable textbox at world coordinates (excludes description-only textboxes)
function findClickableTextboxAt(worldX, worldY) {
    for (let i = textboxes.length - 1; i >= 0; i--) {
        const textbox = textboxes[i];
        const pos = getTextboxPosition(textbox);
        const dimensions = getTextboxDimensions(textbox);

        const tbWorldX = pos.x * tileSize;
        const tbWorldY = pos.y * tileSize;
        const tbWorldW = dimensions.width * tileSize;
        const tbWorldH = dimensions.height * tileSize;

        if (worldX >= tbWorldX && worldX <= tbWorldX + tbWorldW &&
            worldY >= tbWorldY && worldY <= tbWorldY + tbWorldH) {
            // Exclude description-only textboxes and marker textboxes
            if (!isDescriptionOnly(textbox.text) && !textbox.isMarker) {
                return { textbox: textbox, index: i };
            }
        }
    }
    return null;
}

// Get room data from a textbox by matching it with the room index
function getRoomDataFromTextbox(textbox, index) {
    const pos = getTextboxPosition(textbox);
    const dimensions = getTextboxDimensions(textbox);

    // Search through roomIndex.all for matching textbox
    // IMPORTANT: Filter by current map file to avoid cross-map mismatches
    // (multiple maps can have textboxes with same index/coordinates, e.g. CTE and Main Campus)
    if (typeof roomIndex !== 'undefined' && roomIndex.all) {
        // First, try to find a match on the current map
        for (const room of roomIndex.all) {
            if (room.mapFile === currentMapFile &&
                (room.textboxIdx === index ||
                 (room.grid_x === pos.x && room.grid_y === pos.y))) {
                // Include full textbox text for staircase matching
                return { ...room, fullText: textbox.text || '' };
            }
        }
    }

    // Fallback: create basic room data from textbox text
    const text = textbox.text || '';
    const lines = text.split('\n').filter(l => !l.startsWith('##') && !l.startsWith('~'));
    // Strip asterisk prefix (used to mark non-teacher labels)
    let name = lines[0] || 'Location';
    if (name.startsWith('*')) {
        name = name.substring(1).trim();
    }

    return {
        textboxIdx: index,
        grid_x: pos.x,
        grid_y: pos.y,
        grid_width: dimensions.width,
        grid_height: dimensions.height,
        name: name,
        label: name,
        fullText: text,  // Include full text for staircase matching
        floor: getCurrentFloor(),
        mapFile: currentMapFile
    };
}

// Show location popup near the click position
function showLocationPopup(textbox, index, screenX, screenY) {
    const popup = document.getElementById('locationPopup');
    if (!popup) return;

    // Get room data from room index or textbox
    const roomData = getRoomDataFromTextbox(textbox, index);
    if (!roomData) {
        hideLocationPopup();
        return;
    }

    // Store for directions button
    selectedLocationData = roomData;

    // Check if this is a staircase or elevator (for floor switch button)
    const isStairs = isStaircaseTextbox(textbox);
    const isElevator = isElevatorTextbox(textbox);
    const isFloorConnection = isStairs || isElevator;

    // Populate popup content
    const nameEl = document.getElementById('locationPopupName');
    const detailsEl = document.getElementById('locationPopupDetails');

    // Set name (prefer teacher for classrooms, otherwise use name/label)
    // Strip asterisk prefix if present (used to mark non-teacher labels)
    let displayName = roomData.teacher || roomData.name || roomData.label || 'Location';
    if (displayName.startsWith('*')) {
        displayName = displayName.substring(1).trim();
    }
    nameEl.textContent = displayName;

    // Build details using safe DOM methods (prevents XSS)
    detailsEl.innerHTML = ''; // Clear existing content

    if (roomData.roomNumber) {
        const roomRow = document.createElement('div');
        roomRow.className = 'detail-row';
        const roomLabel = document.createElement('span');
        roomLabel.className = 'detail-label';
        roomLabel.textContent = t('popup.room');
        roomRow.appendChild(roomLabel);
        roomRow.appendChild(document.createTextNode(' #' + roomData.roomNumber));
        detailsEl.appendChild(roomRow);
    }

    const floorRow = document.createElement('div');
    floorRow.className = 'detail-row';
    const floorLabelSpan = document.createElement('span');
    floorLabelSpan.className = 'detail-label';
    floorLabelSpan.textContent = t('popup.floor');
    floorRow.appendChild(floorLabelSpan);
    const floorLabel = roomData.floor === 'upper' ? t('common.upstairs') : t('common.downstairs');
    floorRow.appendChild(document.createTextNode(' ' + floorLabel));
    detailsEl.appendChild(floorRow);

    // Populate description and images from textbox info panel
    const descriptionEl = document.getElementById('locationPopupDescription');
    const currentTextbox = textboxes[index];

    if (descriptionEl) {
        if (currentTextbox && currentTextbox.description) {
            descriptionEl.textContent = currentTextbox.description;
        } else {
            descriptionEl.textContent = '';
        }
    }

    // Populate images
    let imagesContainer = document.getElementById('locationPopupImages');
    if (!imagesContainer) {
        // Create container if it doesn't exist
        imagesContainer = document.createElement('div');
        imagesContainer.id = 'locationPopupImages';
        imagesContainer.className = 'location-popup-images';
        // Insert after description
        if (descriptionEl && descriptionEl.parentNode) {
            descriptionEl.parentNode.insertBefore(imagesContainer, descriptionEl.nextSibling);
        }
    }
    imagesContainer.innerHTML = '';

    if (currentTextbox && currentTextbox.images && currentTextbox.images.length > 0) {
        currentTextbox.images.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.alt = 'Location image';
            img.onclick = () => window.open(url, '_blank');
            img.onerror = function() { this.style.display = 'none'; };
            imagesContainer.appendChild(img);
        });
    }

    // Handle floor switch button for stairs/elevator
    const floorSwitchContainer = document.getElementById('locationPopupFloorSwitch');
    if (floorSwitchContainer) {
        if (isFloorConnection) {
            // Show the floor switch button
            floorSwitchContainer.style.display = 'block';
            const floorSwitchBtn = document.getElementById('floorSwitchBtn');
            if (floorSwitchBtn) {
                // Determine button text based on current floor
                const currentFloor = getCurrentFloor();
                const goingUp = currentFloor === 'lower';
                floorSwitchBtn.textContent = goingUp ? t('popup.goUpstairs') : t('popup.goDownstairs');
            }
        } else {
            // Hide the floor switch button for non-stair/elevator locations
            floorSwitchContainer.style.display = 'none';
        }
    }

    // Position popup near click (but keep on screen)
    positionLocationPopup(popup, screenX, screenY);

    // Show popup
    popup.classList.add('show');
}

// Hide location popup
function hideLocationPopup() {
    const popup = document.getElementById('locationPopup');
    if (popup) {
        popup.classList.remove('show');
    }
    selectedLocationData = null;
}

// Switch floors when clicking the floor switch button in stair/elevator popup
async function switchFloorFromPopup() {
    // Capture staircase identifier BEFORE hiding popup (which clears selectedLocationData)
    // Text format: "Left Stairs\n↑\n##N" - we need name (line 1) + entrance ID (line 3)
    let staircaseId = null;
    if (selectedLocationData && selectedLocationData.fullText) {
        const lines = selectedLocationData.fullText.split('\n');
        const name = lines[0]?.trim();  // e.g., "Left Stairs"
        const entranceId = lines[2]?.trim();  // e.g., "##N"
        if (name && entranceId && entranceId.startsWith('##')) {
            staircaseId = name + '\n' + entranceId;  // e.g., "Left Stairs\n##N"
        } else if (name) {
            staircaseId = name;  // fallback to name only
        }

        // Special case: CTE Exit-Only Stairs going downstairs should center on CTE Entrance
        // (exit-only stairs lead outside, not to another staircase)
        const currentFloor = getCurrentFloor();
        if (name && name.toLowerCase().includes('exit-only') && currentFloor === 'upper') {
            staircaseId = 'CTE Entrance';
        }
    }

    // Hide the popup
    hideLocationPopup();

    // Check if there's a paired floor for this building
    const targetMapFile = getPairedFloorMap(currentMapFile);
    if (!targetMapFile) {
        // No paired floor exists - show friendly error
        const currentFloor = getCurrentFloor();
        const direction = currentFloor === 'lower' ? t('common.upstairs').toLowerCase() : t('common.downstairs').toLowerCase();
        const buildingName = formatMapName(currentMapFile).replace(/ (Downstairs|Upstairs)$/, '');
        await showAlert(t('notify.floorUnavailable', { direction: direction, building: buildingName }));
        return;
    }

    // Check for unsaved changes before switching floors (only for users who can edit)
    // Students can't make changes, so skip this check for them
    if (hasPrivilege('edit_map') || hasPrivilege('edit_textboxes')) {
        updateUnsavedChangesFlag();
        if (hasUnsavedChanges) {
            if (!await showConfirm(t('notify.unsavedFloorSwitch'))) {
                return;
            }
        }
    }

    // If there's an active multi-floor route, center on the route segment instead of the staircase
    // Single-floor routes (requiresFloorChange=false) should center on staircase like normal
    if (currentRoute && currentRoute.active && currentRoute.requiresFloorChange) {
        // Track progress through route segments
        if (currentRoute.activeSegmentIndex !== undefined) {
            currentRoute.activeSegmentIndex++;
        }

        // Queue animation for after floor loads
        if (typeof routeAnimation !== 'undefined') {
            routeAnimation.pendingSegment = currentRoute.activeSegmentIndex;
        }

        // Set flag to center on route after map loads
        shouldCenterRouteAfterLoad = true;
    } else {
        // No active multi-floor route - center on corresponding staircase, preserve zoom
        shouldPreserveZoomAfterLoad = true;
        preservedTileSize = tileSize;
        shouldCenterOnStaircaseAfterLoad = staircaseId;

        // In navigation view, open the info panel for the matching staircase after floor switch
        // Exception: CTE Exit-only Stairs has no matching staircase (targets CTE Entrance instead)
        if (isInNavigationView() && staircaseId !== 'CTE Entrance') {
            shouldOpenStaircaseInfoPanelAfterLoad = true;
        }
    }

    // Load the other floor
    loadMap(targetMapFile);
}

// Position popup near click coordinates, keeping it fully on screen
function positionLocationPopup(popup, screenX, screenY) {
    const padding = 10;

    // Temporarily position off-screen to measure actual dimensions
    popup.style.left = '-9999px';
    popup.style.top = '-9999px';
    popup.style.visibility = 'hidden';
    popup.classList.add('show');

    // Get actual popup dimensions
    const popupRect = popup.getBoundingClientRect();
    const popupWidth = popupRect.width;
    const popupHeight = popupRect.height;

    popup.style.visibility = '';

    // Default: position to right and below click
    let left = screenX + padding;
    let top = screenY + padding;

    // Adjust if would go off right edge
    if (left + popupWidth > window.innerWidth - padding) {
        left = screenX - popupWidth - padding;
    }

    // Adjust if would go off bottom
    if (top + popupHeight > window.innerHeight - padding) {
        top = screenY - popupHeight - padding;
    }

    // Final clamp: ensure popup never goes off any edge
    left = Math.max(padding, Math.min(left, window.innerWidth - popupWidth - padding));
    top = Math.max(padding, Math.min(top, window.innerHeight - popupHeight - padding));

    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

// Icons for different notification types
const NOTIFY_ICONS = {
    info: 'ℹ️',
    success: '✓',
    error: '✕',
    warning: '⚠',
    confirm: '?'
};

// Store the resolve function for the current notification
let notifyResolve = null;

// Show a notification modal (replaces browser alert)
// type: 'info', 'success', 'error', 'warning'
// Returns a Promise that resolves when the user clicks Ok
function showNotify(message, type = 'info') {
    return new Promise((resolve) => {
        const modal = document.getElementById('notifyModal');
        const icon = document.getElementById('notifyIcon');
        const msg = document.getElementById('notifyMessage');
        const buttons = document.getElementById('notifyButtons');

        // Remove previous type classes
        modal.className = 'modal notify-modal notify-' + type;

        // Set icon and message
        icon.textContent = NOTIFY_ICONS[type] || NOTIFY_ICONS.info;
        msg.textContent = message;

        // Create Ok button
        buttons.innerHTML = '<button class="btn-wb-primary" id="notifyOkBtn">' + t('common.ok') + '</button>';

        // Store resolve and show modal
        notifyResolve = resolve;
        modal.classList.add('show');

        // Focus the Ok button
        document.getElementById('notifyOkBtn').focus();

        // Handle Ok click
        document.getElementById('notifyOkBtn').onclick = () => {
            modal.classList.remove('show');
            if (notifyResolve) {
                notifyResolve();
                notifyResolve = null;
            }
        };
    });
}

// Show an alert modal (replaces browser alert)
// Returns a Promise that resolves when user clicks Ok
function showAlert(message) {
    return showNotify(message, 'warning');
}

// Show a confirmation modal (replaces browser confirm)
// Returns a Promise that resolves to true (confirmed) or false (cancelled)
function showConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('notifyModal');
        const icon = document.getElementById('notifyIcon');
        const msg = document.getElementById('notifyMessage');
        const buttons = document.getElementById('notifyButtons');

        // Set confirm type
        modal.className = 'modal notify-modal notify-confirm';

        // Set icon and message
        icon.textContent = NOTIFY_ICONS.confirm;
        msg.textContent = message;

        // Create Yes/No buttons
        buttons.innerHTML = `
            <button class="btn-wb-confirm" id="notifyYesBtn">${t('common.yes')}</button>
            <button class="btn-wb-secondary" id="notifyNoBtn">${t('common.no')}</button>
        `;

        // Store resolve and show modal
        notifyResolve = resolve;
        modal.classList.add('show');

        // Focus the Yes button
        document.getElementById('notifyYesBtn').focus();

        // Handle button clicks
        document.getElementById('notifyYesBtn').onclick = () => {
            modal.classList.remove('show');
            if (notifyResolve) {
                notifyResolve(true);
                notifyResolve = null;
            }
        };

        document.getElementById('notifyNoBtn').onclick = () => {
            modal.classList.remove('show');
            if (notifyResolve) {
                notifyResolve(false);
                notifyResolve = null;
            }
        };
    });
}

// ============================================
// MOUSE EVENT HANDLERS
// ============================================

// Throttle for mouse movement
let lastMoveTime = 0;
const MOUSE_MOVE_THROTTLE_MS = 16;

canvas.addEventListener('mousedown', (e) => {
    // If door swing popup is open, close it and ignore this click
    // (prevents drawing when user clicks canvas to dismiss popup)
    if (doorSwingPopup && doorSwingPopup.classList.contains('show')) {
        closeDoorSwingPopup();
        return;
    }

    // Clear focus from any buttons (fixes highlight persistence on reset rotation, etc.)
    if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
    }

    const rect = canvas.getBoundingClientRect();
    lastMouseX = e.clientX - rect.left;
    lastMouseY = e.clientY - rect.top;
    isMouseDown = true;

    // Track mouse start position for click detection
    mouseDownStartX = lastMouseX;
    mouseDownStartY = lastMouseY;
    pendingTextboxClick = null;  // Reset any pending click
    pendingTextboxEdit = null;   // Reset any pending edit

    // Check if clicking on the stair button (for floor switching)
    // The button is drawn in rotated canvas space, so transform click coords to match
    if (window.stairButtonPosition && currentRoute && currentRoute.requiresFloorChange) {
        const btnPos = window.stairButtonPosition;
        // Transform click coordinates to rotated canvas space
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const relX = lastMouseX - centerX;
        const relY = lastMouseY - centerY;
        const cos = Math.cos(-mapRotation);
        const sin = Math.sin(-mapRotation);
        const rotatedX = relX * cos - relY * sin + centerX;
        const rotatedY = relX * sin + relY * cos + centerY;

        const dx = rotatedX - btnPos.x;
        const dy = rotatedY - btnPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= btnPos.radius) {
            // Clicked on the stair button - switch floors
            switchToOtherFloor();
            isMouseDown = false;
            return;
        }
    }

    // navigation view: defer textbox click to mouseup to distinguish from panning
    // This prevents accidental popup when user intends to pan but starts on a textbox
    if (isInNavigationView()) {
        // Use screenToWorld to account for map rotation
        const worldCoords = screenToWorld(lastMouseX, lastMouseY);
        const result = findClickableTextboxAt(worldCoords.x, worldCoords.y);
        if (result) {
            // Store the pending click - will be handled in mouseup if user didn't pan
            pendingTextboxClick = {
                textbox: result.textbox,
                index: result.index,
                screenX: e.clientX,
                screenY: e.clientY
            };
            // Don't return or prevent panning - let user drag if they want
        }
    }

    // Use screenToWorld to account for map rotation when detecting what was clicked
    const worldCoords = screenToWorld(lastMouseX, lastMouseY);
    const worldX = worldCoords.x;
    const worldY = worldCoords.y;
    const gridX = Math.floor(worldX / tileSize);
    const gridY = Math.floor(worldY / tileSize);

    if (currentMode === 'draw' && hasPrivilege('edit_map')) {
        // Shift+click on a doorway tile opens the door swing configuration panel
        if (e.shiftKey) {
            const tile = mapData.data[gridY] && mapData.data[gridY][gridX];
            if (tile === DOORWAY_TILE) {
                openDoorSwingPanel(gridX, gridY, e.clientX, e.clientY);
                isMouseDown = false;  // Prevent drag drawing
                return;
            }
        }
        // Normal tile drawing - save previous tile for door swing cleanup
        const previousTile = mapData.data[gridY] && mapData.data[gridY][gridX];
        saveUndo();
        setTile(gridX, gridY, currentTile);
        // Clean up door swing data if we just overwrote a doorway tile
        cleanupDoorSwingData(gridX, gridY, previousTile);
        needsRedraw = true;
    } else if (currentMode === 'bucket' && hasPrivilege('edit_map')) {
        bucketFillOrigin = { x: gridX, y: gridY };
        needsRedraw = true;
    } else if (currentMode === 'textbox' && hasPrivilege('edit_textboxes')) {
        let clicked = false;
        for (let i = textboxes.length - 1; i >= 0; i--) {
            const textbox = textboxes[i];
            const pos = getTextboxPosition(textbox);
            const dimensions = getTextboxDimensions(textbox);

            const tbWorldX = pos.x * tileSize;
            const tbWorldY = pos.y * tileSize;
            const tbWidth = dimensions.width * tileSize;
            const tbHeight = dimensions.height * tileSize;

            // Check if clicking on resize handle (bottom-right corner)
            const handleX = tbWorldX + tbWidth - RESIZE_HANDLE_SIZE;
            const handleY = tbWorldY + tbHeight - RESIZE_HANDLE_SIZE;

            if (worldX >= handleX && worldX <= tbWorldX + tbWidth &&
                worldY >= handleY && worldY <= tbWorldY + tbHeight) {
                clicked = true;
                saveUndo();
                resizingTextbox = i;
                break;
            }

            // Check if clicking inside textbox (for dragging or editing)
            if (worldX >= tbWorldX && worldX <= tbWorldX + tbWidth &&
                worldY >= tbWorldY && worldY <= tbWorldY + tbHeight) {
                clicked = true;
                draggingTextbox = i;
                dragOffset.x = worldX - tbWorldX;
                dragOffset.y = worldY - tbWorldY;
                dragUndoSaved = false;  // Reset flag - will save undo on first actual movement
                // Track pending edit - will open edit modal if user doesn't drag
                pendingTextboxEdit = { index: i };
                break;
            }
        }
        // Note: textbox creation moved to dblclick handler
    } else if (currentMode === 'info' && hasPrivilege('edit_textboxes')) {
        // Info mode: click on textbox to edit its info panel
        for (let i = textboxes.length - 1; i >= 0; i--) {
            const textbox = textboxes[i];
            const pos = getTextboxPosition(textbox);
            const dimensions = getTextboxDimensions(textbox);

            const tbWorldX = pos.x * tileSize;
            const tbWorldY = pos.y * tileSize;
            const tbWidth = dimensions.width * tileSize;
            const tbHeight = dimensions.height * tileSize;

            if (worldX >= tbWorldX && worldX <= tbWorldX + tbWidth &&
                worldY >= tbWorldY && worldY <= tbWorldY + tbHeight) {
                editInfoPanel(i);
                break;
            }
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const now = Date.now();
    if (now - lastMoveTime < MOUSE_MOVE_THROTTLE_MS && isMouseDown && currentMode === 'pan') {
        return;
    }
    lastMoveTime = now;
    
    if (isMouseDown) {
        // Use screenToWorld to account for map rotation in editing modes
        const worldCoords = screenToWorld(mouseX, mouseY);
        const worldX = worldCoords.x;
        const worldY = worldCoords.y;
        const gridX = Math.floor(worldX / tileSize);
        const gridY = Math.floor(worldY / tileSize);

        if (currentMode === 'pan') {
            // Calculate screen-space drag delta
            const dx = mouseX - lastMouseX;
            const dy = mouseY - lastMouseY;

            // Rotate the drag vector by -mapRotation to convert screen-space to world-space
            // (inverse of the canvas rotation transform)
            const cos = Math.cos(mapRotation);
            const sin = Math.sin(mapRotation);
            const worldDx = dx * cos + dy * sin;
            const worldDy = -dx * sin + dy * cos;

            cameraX -= worldDx;
            cameraY -= worldDy;

            // Hide location popup when panning
            hideLocationPopup();

            // Clamp camera immediately after panning
            clampCamera();
            needsRedraw = true;
        } else if (currentMode === 'draw' && hasPrivilege('edit_map')) {
            // Save previous tile for door swing cleanup during drag-drawing
            const previousTile = mapData.data[gridY] && mapData.data[gridY][gridX];
            setTile(gridX, gridY, currentTile);
            cleanupDoorSwingData(gridX, gridY, previousTile);
            needsRedraw = true;
        } else if (currentMode === 'textbox' && resizingTextbox !== null) {
            const textbox = textboxes[resizingTextbox];
            const pos = getTextboxPosition(textbox);

            // Calculate new size based on mouse position
            const newWidth = Math.max(2, Math.floor((worldX - pos.x * tileSize) / tileSize) + 1);
            const newHeight = Math.max(1, Math.floor((worldY - pos.y * tileSize) / tileSize) + 1);

            textbox.grid_width = newWidth;
            textbox.grid_height = newHeight;
            needsRedraw = true;
        } else if (currentMode === 'textbox' && draggingTextbox !== null) {
            // Save undo on first actual movement (not just click)
            if (!dragUndoSaved) {
                saveUndo();
                dragUndoSaved = true;
                // Clear pending edit - user is dragging, not clicking to edit
                pendingTextboxEdit = null;
            }
            const textbox = textboxes[draggingTextbox];
            textbox.grid_x = Math.floor((worldX - dragOffset.x) / tileSize);
            textbox.grid_y = Math.floor((worldY - dragOffset.y) / tileSize);
            needsRedraw = true;
        } else if (currentMode === 'bucket' && bucketFillOrigin) {
            needsRedraw = true;
        }
    }

    // Update cursor for resize handles and textbox hover in textbox mode
    if (currentMode === 'textbox' && !isMouseDown) {
        // Use screenToWorld to account for map rotation
        const worldCoords = screenToWorld(mouseX, mouseY);
        const worldX = worldCoords.x;
        const worldY = worldCoords.y;
        let overResize = false;
        let overTextbox = false;

        for (let i = textboxes.length - 1; i >= 0; i--) {
            const textbox = textboxes[i];
            const pos = getTextboxPosition(textbox);
            const dimensions = getTextboxDimensions(textbox);

            const tbWorldX = pos.x * tileSize;
            const tbWorldY = pos.y * tileSize;
            const tbWidth = dimensions.width * tileSize;
            const tbHeight = dimensions.height * tileSize;

            // Check if over textbox body
            if (worldX >= tbWorldX && worldX <= tbWorldX + tbWidth &&
                worldY >= tbWorldY && worldY <= tbWorldY + tbHeight) {
                overTextbox = true;

                // Check if specifically over resize handle
                const handleX = tbWorldX + tbWidth - RESIZE_HANDLE_SIZE;
                const handleY = tbWorldY + tbHeight - RESIZE_HANDLE_SIZE;

                if (worldX >= handleX && worldY >= handleY) {
                    overResize = true;
                }
                break;
            }
        }

        // Resize handle takes priority, then textbox hover, then default
        if (overResize) {
            canvas.style.cursor = 'nwse-resize';
        } else if (overTextbox) {
            canvas.style.cursor = TEXT_CURSOR_HOVER;
        } else {
            canvas.style.cursor = TEXT_CURSOR;
        }
    }

    // Update hover state for textbox highlighting (navigation view only)
    if (isInNavigationView() && !isMouseDown) {
        // Use screenToWorld to account for map rotation
        const worldCoords = screenToWorld(mouseX, mouseY);
        const found = findClickableTextboxAt(worldCoords.x, worldCoords.y);
        const newHovered = found ? found.index : null;

        if (newHovered !== hoveredTextbox) {
            hoveredTextbox = newHovered;
            canvas.style.cursor = hoveredTextbox !== null ? 'pointer' : 'grab';
            needsRedraw = true;
        }
    }

    lastMouseX = mouseX;
    lastMouseY = mouseY;
});

canvas.addEventListener('mouseup', (e) => {
    // Check if this was a click (not a pan) on a textbox in navigation view
    // Uses same threshold as touch events (10px movement tolerance)
    if (pendingTextboxClick && isInNavigationView()) {
        const dx = Math.abs(lastMouseX - mouseDownStartX);
        const dy = Math.abs(lastMouseY - mouseDownStartY);
        const wasClick = dx < 10 && dy < 10;

        if (wasClick) {
            // User clicked without dragging - schedule popup after delay
            // This allows time to detect if it's actually a double-click (zoom)
            const clickData = pendingTextboxClick;
            // Cancel any existing pending timeout
            if (pendingClickTimeout) {
                clearTimeout(pendingClickTimeout);
            }
            pendingClickTimeout = setTimeout(() => {
                showLocationPopup(
                    clickData.textbox,
                    clickData.index,
                    clickData.screenX,
                    clickData.screenY
                );
                pendingClickTimeout = null;
            }, DOUBLE_CLICK_DELAY);
        }
        pendingTextboxClick = null;
    }

    if (currentMode === 'bucket' && bucketFillOrigin && isMouseDown && hasPrivilege('edit_map')) {
        saveUndo();
        // Use screenToWorld to account for map rotation
        const worldCoords = screenToWorld(lastMouseX, lastMouseY);
        const endX = Math.floor(worldCoords.x / tileSize);
        const endY = Math.floor(worldCoords.y / tileSize);

        bucketFill(bucketFillOrigin.x, bucketFillOrigin.y, endX, endY);
        bucketFillOrigin = null;
        needsRedraw = true;
    }

    if (currentMode === 'textbox' && hasPrivilege('edit_textboxes')) {
        // Check if this was a click (not a drag) on an existing textbox - open edit modal
        if (pendingTextboxEdit !== null) {
            const dx = Math.abs(lastMouseX - mouseDownStartX);
            const dy = Math.abs(lastMouseY - mouseDownStartY);
            const wasClick = dx < 10 && dy < 10;

            if (wasClick) {
                // User clicked without dragging - open edit modal
                editTextbox(pendingTextboxEdit.index);
            }
            pendingTextboxEdit = null;
        }

        if (draggingTextbox !== null || resizingTextbox !== null) {
            draggingTextbox = null;
            resizingTextbox = null;
            needsRedraw = true;
        }
    }

    isMouseDown = false;
});

// Release mouse state when cursor leaves the canvas (prevents stuck panning)
canvas.addEventListener('mouseleave', (e) => {
    if (isMouseDown) {
        // Cancel any pending textbox click/edit
        pendingTextboxClick = null;
        pendingTextboxEdit = null;

        // Cancel any ongoing bucket fill
        if (currentMode === 'bucket' && bucketFillOrigin) {
            bucketFillOrigin = null;
            needsRedraw = true;
        }

        // Release textbox drag/resize
        if (currentMode === 'textbox' && (draggingTextbox !== null || resizingTextbox !== null)) {
            draggingTextbox = null;
            resizingTextbox = null;
            needsRedraw = true;
        }

        isMouseDown = false;
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (currentMode === 'draw' && hasPrivilege('edit_map')) {
        saveUndo();
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        // Use screenToWorld to account for map rotation (consistent with other handlers)
        const worldCoords = screenToWorld(mouseX, mouseY);
        const gridX = Math.floor(worldCoords.x / tileSize);
        const gridY = Math.floor(worldCoords.y / tileSize);
        // Save previous tile for door swing cleanup
        const previousTile = mapData.data[gridY] && mapData.data[gridY][gridX];
        setTile(gridX, gridY, 0);
        cleanupDoorSwingData(gridX, gridY, previousTile);
        needsRedraw = true;
    }
});

canvas.addEventListener('dblclick', (e) => {
    // Cancel any pending single-click popup (user is double-clicking, not single-clicking)
    if (pendingClickTimeout) {
        clearTimeout(pendingClickTimeout);
        pendingClickTimeout = null;
    }

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Pan mode: double-click to zoom in (works for students and in pan mode)
    if (currentMode === 'pan' && hasPrivilege('zoom')) {
        zoomToPoint(mouseX, mouseY, 2.0);
        return;
    }

    // Textbox mode: double-click to create new textbox
    if (currentMode === 'textbox' && hasPrivilege('edit_textboxes')) {
        // Use screenToWorld to account for map rotation
        const worldCoords = screenToWorld(mouseX, mouseY);
        const worldX = worldCoords.x;
        const worldY = worldCoords.y;
        const gridX = Math.floor(worldX / tileSize);
        const gridY = Math.floor(worldY / tileSize);

        // Check if double-clicking on an existing textbox
        let clickedOnTextbox = false;
        for (let i = textboxes.length - 1; i >= 0; i--) {
            const textbox = textboxes[i];
            const pos = getTextboxPosition(textbox);
            const dimensions = getTextboxDimensions(textbox);

            const tbWorldX = pos.x * tileSize;
            const tbWorldY = pos.y * tileSize;
            const tbWidth = dimensions.width * tileSize;
            const tbHeight = dimensions.height * tileSize;

            if (worldX >= tbWorldX && worldX <= tbWorldX + tbWidth &&
                worldY >= tbWorldY && worldY <= tbWorldY + tbHeight) {
                clickedOnTextbox = true;
                break;
            }
        }

        // Double-click on empty area creates a new textbox
        if (!clickedOnTextbox) {
            saveUndo();
            textboxes.push({
                grid_x: gridX,
                grid_y: gridY,
                grid_width: 6,
                grid_height: 3,
                text: t('editor.newTextbox'),
                font_size: 20,
                alignment: 'left',
                scroll_offset: 0
            });
            needsRedraw = true;
        }
    }
});

canvas.addEventListener('wheel', (e) => {
    if (hasPrivilege('zoom')) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Store old tile size for precise camera adjustment
        const oldTileSize = tileSize;

        // Calculate world position at mouse (in grid units)
        const worldX = (mouseX + cameraX) / oldTileSize;
        const worldY = (mouseY + cameraY) / oldTileSize;

        // Normalize deltaY for consistent zoom across devices (trackpad vs mouse)
        // deltaMode: 0 = pixels, 1 = lines, 2 = pages
        let delta = e.deltaY;
        if (e.deltaMode === 1) {
            delta *= 20; // lines to pixels approximation
        } else if (e.deltaMode === 2) {
            delta *= 400; // pages to pixels approximation
        }

        // Clamp delta to prevent extreme zoom jumps
        delta = Math.max(-100, Math.min(100, delta));

        // Calculate zoom factor (smoother exponential curve)
        const zoomFactor = Math.pow(0.990, delta);

        // Apply zoom with bounds, round to integer to prevent sub-pixel rendering artifacts
        const newTileSize = Math.max(4, Math.min(512, oldTileSize * zoomFactor));
        tileSize = Math.round(newTileSize);

        // Recalculate camera to keep mouse position fixed on same world point
        cameraX = worldX * tileSize - mouseX;
        cameraY = worldY * tileSize - mouseY;

        // Clamp camera after zooming
        clampCamera();
        needsRedraw = true;
    }
}, { passive: false });

// ============================================
// TOUCH EVENT HANDLERS (Mobile & Touchscreen Support)
// ============================================

let touchStartX = 0;
let touchStartY = 0;
let lastTouchX = 0;
let lastTouchY = 0;
let initialPinchDistance = 0;
let initialPinchAngle = 0;  // For rotation gesture
let initialMapRotation = 0; // Map rotation when pinch started
let initialTileSize = 0;
let isTouching = false;
let isPinching = false;

// Double-tap detection for touch events
let lastTapTime = 0;
let lastTapX = 0;
let lastTapY = 0;
const DOUBLE_TAP_DELAY = 300;  // Max ms between taps for double-tap
const DOUBLE_TAP_DISTANCE = 30;  // Max px distance between taps

// Pending single-tap action (delayed to allow double-tap detection)
let pendingSingleTapTimeout = null;
let pendingSingleTapAction = null;

// Calculate distance between two touch points
function getTouchDistance(touches) {
    // Defensive check - requires at least 2 touches
    if (!touches || touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Get center point between two touches
function getTouchCenter(touches, rect) {
    // Defensive check - requires at least 2 touches
    if (!touches || touches.length < 2) {
        return { x: 0, y: 0 };
    }
    return {
        x: ((touches[0].clientX + touches[1].clientX) / 2) - rect.left,
        y: ((touches[0].clientY + touches[1].clientY) / 2) - rect.top
    };
}

// Get angle between two touch points (for rotation gesture)
function getTouchAngle(touches) {
    // Defensive check - requires at least 2 touches
    if (!touches || touches.length < 2) return 0;
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.atan2(dy, dx);
}

// Convert screen coordinates to world coordinates (accounting for rotation)
// Used for click/tap detection when the map is rotated
function screenToWorld(screenX, screenY) {
    // Get canvas center (rotation pivot point)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Translate screen point relative to center
    const dx = screenX - centerX;
    const dy = screenY - centerY;

    // Apply inverse rotation (rotate back by -mapRotation)
    const cos = Math.cos(-mapRotation);
    const sin = Math.sin(-mapRotation);
    const rotatedX = dx * cos - dy * sin;
    const rotatedY = dx * sin + dy * cos;

    // Translate back from center and add camera offset to get world coords
    const worldX = rotatedX + centerX + cameraX;
    const worldY = rotatedY + centerY + cameraY;

    return { x: worldX, y: worldY };
}

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();

    // Clear focus from any buttons (fixes highlight persistence on reset rotation, etc.)
    if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
    }

    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 1) {
        // Single touch - prepare for pan
        isTouching = true;
        isPinching = false;
        const touch = e.touches[0];
        touchStartX = touch.clientX - rect.left;
        touchStartY = touch.clientY - rect.top;
        lastTouchX = touchStartX;
        lastTouchY = touchStartY;
    } else if (e.touches.length === 2 && hasPrivilege('zoom')) {
        // Two fingers - prepare for pinch zoom and rotation
        isPinching = true;
        isTouching = false;
        initialPinchDistance = getTouchDistance(e.touches);
        initialPinchAngle = getTouchAngle(e.touches);
        initialMapRotation = mapRotation;
        initialTileSize = tileSize;
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 1 && isTouching && !isPinching) {
        // Single touch drag - pan the map
        const touch = e.touches[0];
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;

        const dx = touchX - lastTouchX;
        const dy = touchY - lastTouchY;

        // Rotate the drag vector by -mapRotation to convert screen-space to world-space
        // (inverse of the canvas rotation transform)
        const cos = Math.cos(mapRotation);
        const sin = Math.sin(mapRotation);
        const worldDx = dx * cos + dy * sin;
        const worldDy = -dx * sin + dy * cos;

        cameraX -= worldDx;
        cameraY -= worldDy;

        // Hide location popup when panning
        hideLocationPopup();

        clampCamera();
        needsRedraw = true;

        lastTouchX = touchX;
        lastTouchY = touchY;
    } else if (e.touches.length === 2 && isPinching && hasPrivilege('zoom')) {
        // Pinch zoom and rotation
        const currentDistance = getTouchDistance(e.touches);
        const center = getTouchCenter(e.touches, rect);

        // Guard against division by zero if fingers start at same point
        if (initialPinchDistance < 1) return;

        // Calculate world position at pinch center (before zoom)
        const worldX = (center.x + cameraX) / tileSize;
        const worldY = (center.y + cameraY) / tileSize;

        // Calculate new tile size based on pinch ratio, round to integer to prevent sub-pixel artifacts
        const scale = currentDistance / initialPinchDistance;
        tileSize = Math.round(Math.max(4, Math.min(512, initialTileSize * scale)));

        // Apply rotation (only in pan mode to avoid conflicts with editing)
        // Use 0.7x sensitivity to make rotation feel less twitchy on mobile
        if (currentMode === 'pan') {
            const currentAngle = getTouchAngle(e.touches);
            const angleDelta = (currentAngle - initialPinchAngle) * 0.7;
            mapRotation = initialMapRotation + angleDelta;
        }

        // Adjust camera to keep pinch center stationary
        cameraX = worldX * tileSize - center.x;
        cameraY = worldY * tileSize - center.y;

        clampCamera();
        needsRedraw = true;
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();

    if (e.touches.length === 0) {
        // All fingers lifted - check if this was a tap (not a drag)
        const dx = Math.abs(lastTouchX - touchStartX);
        const dy = Math.abs(lastTouchY - touchStartY);
        const wasTap = dx < 10 && dy < 10; // Allow small movement tolerance

        if (wasTap && !isPinching) {
            // Check if tapping on the stair button
            // The button is drawn in rotated canvas space, so transform tap coords to match
            if (window.stairButtonPosition && currentRoute && currentRoute.requiresFloorChange) {
                const btnPos = window.stairButtonPosition;
                // Transform tap coordinates to rotated canvas space
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const relX = touchStartX - centerX;
                const relY = touchStartY - centerY;
                const cos = Math.cos(-mapRotation);
                const sin = Math.sin(-mapRotation);
                const rotatedX = relX * cos - relY * sin + centerX;
                const rotatedY = relX * sin + relY * cos + centerY;

                const tapDx = rotatedX - btnPos.x;
                const tapDy = rotatedY - btnPos.y;
                const distance = Math.sqrt(tapDx * tapDx + tapDy * tapDy);

                if (distance <= btnPos.radius + 10) { // Extra 10px for easier touch targeting
                    switchToOtherFloor();
                    return;
                }
            }

            // Pan mode: double-tap to zoom in (works in navigation view and pan mode)
            // Check for double-tap FIRST before handling single-tap actions
            if (currentMode === 'pan' && hasPrivilege('zoom')) {
                const now = Date.now();
                const tapDx = Math.abs(touchStartX - lastTapX);
                const tapDy = Math.abs(touchStartY - lastTapY);
                const isDoubleTap = (now - lastTapTime < DOUBLE_TAP_DELAY) &&
                                   (tapDx < DOUBLE_TAP_DISTANCE) &&
                                   (tapDy < DOUBLE_TAP_DISTANCE);

                if (isDoubleTap) {
                    // Double-tap detected: cancel any pending single-tap action
                    if (pendingSingleTapTimeout) {
                        clearTimeout(pendingSingleTapTimeout);
                        pendingSingleTapTimeout = null;
                        pendingSingleTapAction = null;
                    }
                    // Double-tap: zoom in 2x centered on tap position
                    zoomToPoint(touchStartX, touchStartY, 2.0);
                    // Reset tap tracking to prevent triple-tap issues
                    lastTapTime = 0;
                } else {
                    // First tap: record for double-tap detection
                    lastTapTime = now;
                    lastTapX = touchStartX;
                    lastTapY = touchStartY;

                    // navigation view: schedule single-tap action (show popup) after delay
                    // This allows time to detect if it's actually a double-tap
                    if (isInNavigationView()) {
                        const rect = canvas.getBoundingClientRect();
                        const worldCoords = screenToWorld(touchStartX, touchStartY);
                        const result = findClickableTextboxAt(worldCoords.x, worldCoords.y);
                        if (result) {
                            // Set highlight for tapped textbox (like hover on desktop)
                            hoveredTextbox = result.index;
                            needsRedraw = true;
                            const screenX = touchStartX + rect.left;
                            const screenY = touchStartY + rect.top;
                            // Cancel any existing pending action
                            if (pendingSingleTapTimeout) {
                                clearTimeout(pendingSingleTapTimeout);
                            }
                            // Schedule the popup to show after double-tap window passes
                            pendingSingleTapAction = { textbox: result.textbox, index: result.index, screenX, screenY };
                            pendingSingleTapTimeout = setTimeout(() => {
                                if (pendingSingleTapAction) {
                                    showLocationPopup(
                                        pendingSingleTapAction.textbox,
                                        pendingSingleTapAction.index,
                                        pendingSingleTapAction.screenX,
                                        pendingSingleTapAction.screenY
                                    );
                                    pendingSingleTapAction = null;
                                }
                                pendingSingleTapTimeout = null;
                            }, DOUBLE_TAP_DELAY);
                        } else if (hoveredTextbox !== null) {
                            // Clear highlight when tapping empty area
                            hoveredTextbox = null;
                            needsRedraw = true;
                        }
                    }
                }
            } else if (isInNavigationView()) {
                // Not in pan mode but still navigation view - show popup immediately (no zoom possible)
                const rect = canvas.getBoundingClientRect();
                const worldCoords = screenToWorld(touchStartX, touchStartY);
                const result = findClickableTextboxAt(worldCoords.x, worldCoords.y);
                if (result) {
                    // Set highlight for tapped textbox (like hover on desktop)
                    hoveredTextbox = result.index;
                    needsRedraw = true;
                    const screenX = touchStartX + rect.left;
                    const screenY = touchStartY + rect.top;
                    showLocationPopup(result.textbox, result.index, screenX, screenY);
                } else if (hoveredTextbox !== null) {
                    // Clear highlight when tapping empty area
                    hoveredTextbox = null;
                    needsRedraw = true;
                }
            }

            // Teacher/Admin textbox mode: single-tap to edit, double-tap to create
            if (currentMode === 'textbox' && hasPrivilege('edit_textboxes')) {
                // Use screenToWorld to account for map rotation
                const worldCoords = screenToWorld(touchStartX, touchStartY);
                const worldX = worldCoords.x;
                const worldY = worldCoords.y;
                const gridX = Math.floor(worldX / tileSize);
                const gridY = Math.floor(worldY / tileSize);

                // Check if tapping on an existing textbox
                let tappedTextboxIndex = -1;
                for (let i = textboxes.length - 1; i >= 0; i--) {
                    const textbox = textboxes[i];
                    const pos = getTextboxPosition(textbox);
                    const dimensions = getTextboxDimensions(textbox);

                    const tbWorldX = pos.x * tileSize;
                    const tbWorldY = pos.y * tileSize;
                    const tbWidth = dimensions.width * tileSize;
                    const tbHeight = dimensions.height * tileSize;

                    if (worldX >= tbWorldX && worldX <= tbWorldX + tbWidth &&
                        worldY >= tbWorldY && worldY <= tbWorldY + tbHeight) {
                        tappedTextboxIndex = i;
                        break;
                    }
                }

                const now = Date.now();
                const tapDx = Math.abs(touchStartX - lastTapX);
                const tapDy = Math.abs(touchStartY - lastTapY);
                const isDoubleTap = (now - lastTapTime < DOUBLE_TAP_DELAY) &&
                                   (tapDx < DOUBLE_TAP_DISTANCE) &&
                                   (tapDy < DOUBLE_TAP_DISTANCE);

                if (tappedTextboxIndex >= 0) {
                    // Single tap on existing textbox - open edit modal
                    editTextbox(tappedTextboxIndex);
                } else if (isDoubleTap) {
                    // Double tap on empty area - create new textbox
                    saveUndo();
                    textboxes.push({
                        grid_x: gridX,
                        grid_y: gridY,
                        grid_width: 6,
                        grid_height: 3,
                        text: t('editor.newTextbox'),
                        font_size: 20,
                        alignment: 'left',
                        scroll_offset: 0
                    });
                    needsRedraw = true;
                }

                // Record this tap for double-tap detection
                lastTapTime = now;
                lastTapX = touchStartX;
                lastTapY = touchStartY;
            }
        }

        isTouching = false;
        isPinching = false;
    } else if (e.touches.length === 1) {
        // One finger remaining after pinch - switch to pan mode
        isPinching = false;
        isTouching = true;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        lastTouchX = touch.clientX - rect.left;
        lastTouchY = touch.clientY - rect.top;
    }
}, { passive: false });

canvas.addEventListener('touchcancel', (e) => {
    isTouching = false;
    isPinching = false;
}, { passive: false });

// ============================================
// UI CONTROL FUNCTIONS
// ============================================

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(mode + 'Mode').classList.add('active');
    document.getElementById('currentMode').textContent = t('mode.' + mode);

    if (mode === 'pan') canvas.style.cursor = 'grab';
    else if (mode === 'draw') canvas.style.cursor = PENCIL_CURSOR;
    else if (mode === 'bucket') canvas.style.cursor = BUCKET_CURSOR;
    else if (mode === 'textbox') canvas.style.cursor = TEXT_CURSOR;
    else if (mode === 'info') canvas.style.cursor = INFO_CURSOR;

    // Redraw canvas to update mode-dependent visuals (e.g., resize handles in textbox mode)
    needsRedraw = true;
}

function selectTile(tile) {
    currentTile = tile;
    document.querySelectorAll('.tile-btn').forEach(btn => btn.classList.remove('active'));
    const tileBtn = document.querySelector(`.tile-btn[data-tile="${tile}"]`);
    if (tileBtn) tileBtn.classList.add('active');
}

function zoomIn() {
    if (hasPrivilege('zoom')) {
        const centerX = (canvas.width / 2 + cameraX) / tileSize;
        const centerY = (canvas.height / 2 + cameraY) / tileSize;

        tileSize = Math.min(512, tileSize + 4);

        cameraX = centerX * tileSize - canvas.width / 2;
        cameraY = centerY * tileSize - canvas.height / 2;

        // Clamp camera after zooming
        clampCamera();
        needsRedraw = true;
    }
}

// Zoom to a specific point on screen (used for double-tap/click zoom)
function zoomToPoint(screenX, screenY, zoomFactor) {
    if (!hasPrivilege('zoom')) return;

    // Use screenToWorld to account for map rotation
    const worldCoords = screenToWorld(screenX, screenY);
    const worldX = worldCoords.x / tileSize;  // Convert to grid units
    const worldY = worldCoords.y / tileSize;

    // Apply zoom with bounds
    const newTileSize = Math.min(512, Math.max(4, Math.round(tileSize * zoomFactor)));
    tileSize = newTileSize;

    // Recenter camera to keep tap/click point stationary on screen
    // Need to account for rotation: the screen point maps to world through rotation
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const dx = screenX - centerX;
    const dy = screenY - centerY;
    const cos = Math.cos(-mapRotation);
    const sin = Math.sin(-mapRotation);
    const rotatedX = dx * cos - dy * sin;
    const rotatedY = dx * sin + dy * cos;

    cameraX = worldX * tileSize - (rotatedX + centerX);
    cameraY = worldY * tileSize - (rotatedY + centerY);

    clampCamera();
    needsRedraw = true;
}

function zoomOut() {
    if (hasPrivilege('zoom')) {
        const centerX = (canvas.width / 2 + cameraX) / tileSize;
        const centerY = (canvas.height / 2 + cameraY) / tileSize;
        
        tileSize = Math.max(4, tileSize - 4);
        
        cameraX = centerX * tileSize - canvas.width / 2;
        cameraY = centerY * tileSize - canvas.height / 2;
        
        // Clamp camera after zooming
        clampCamera();
        needsRedraw = true;
    }
}

function recenter() {
    tileSize = 8;
    centerCamera();
    needsRedraw = true;
}

// Reset map rotation to north-up (0 radians)
function resetRotation() {
    mapRotation = 0;
    needsRedraw = true;
}

// ============================================
// FULLSCREEN TOGGLE (Desktop Only)
// ============================================

// Check if device is desktop (not mobile/tablet)
function isDesktop() {
    return !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
}

// Toggle fullscreen mode using Fullscreen API
function toggleFullscreen() {
    // Only allow on desktop
    if (!isDesktop()) {
        return;
    }

    if (!document.fullscreenElement &&
        !document.webkitFullscreenElement &&
        !document.mozFullScreenElement &&
        !document.msFullscreenElement) {
        // Enter fullscreen
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

async function clearMap() {
    if (hasPrivilege('clear') && await showConfirm(t('notify.clearMapConfirm'))) {
        saveUndo();
        for (let y = 0; y < mapData.height; y++) {
            for (let x = 0; x < mapData.width; x++) {
                mapData.data[y][x] = 0;
            }
        }
        textboxes = [];
        needsRedraw = true;
    }
}

// ============================================
// VIEW TOGGLE (navigation view Mode)
// ============================================

function toggleView() {
    isNavigationView = !isNavigationView;
    const body = document.body;
    const btn = document.getElementById('viewToggleBtn');
    
    if (isNavigationView) {
        // Switch to navigation view
        body.classList.add('navigation-view');
        btn.innerHTML = '<i data-lucide="edit"></i> ' + t('editor.switchToEditor');
        if (window.lucide) lucide.createIcons();

        // Automatically switch to pan mode (so teacher isn't stuck in textbox edit mode)
        setMode('pan');

        // Force canvas resize for full width
        resizeCanvas();
        needsRedraw = true;
    } else {
        // Switch back to editor view
        body.classList.remove('navigation-view');
        btn.innerHTML = '<i data-lucide="smartphone"></i> ' + t('editor.switchToNav');
        if (window.lucide) lucide.createIcons();
        
        // Force canvas resize back to sidebar layout
        resizeCanvas();
        needsRedraw = true;
    }
}
