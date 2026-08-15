// ============================================
// FILE MANAGEMENT (Save/Load)
// ============================================

// ============================================
// REQUEST DEDUPLICATION
// ============================================
// WHY: Without this, if the user rapidly opens Save then Load dialogs,
// we send two identical /api/list-maps requests. With 300 users doing this,
// we're hitting the server twice as much as needed.
//
// HOW: We keep track of in-flight requests. If a request to the same URL
// is already in progress, we return the same Promise instead of starting
// a new request. Once it completes, subsequent requests start fresh.
//
// RESULT: 10 rapid clicks = 1 network request instead of 10
const _pendingRequests = new Map();

function fetchWithDedup(url, options = {}) {
    // Only deduplicate GET requests (safe to share)
    const method = (options.method || 'GET').toUpperCase();
    if (method !== 'GET') {
        return fetch(url, options);
    }

    // Check if this exact request is already in flight
    if (_pendingRequests.has(url)) {
        return _pendingRequests.get(url);
    }

    // Start new request and track it
    const promise = fetch(url, options)
        .then(response => {
            // Clone the response so multiple callers can read it
            // (Response body can only be read once)
            return response.clone().json().then(data => {
                return { ok: response.ok, status: response.status, data };
            });
        })
        .finally(() => {
            // Remove from pending once complete (success or failure)
            _pendingRequests.delete(url);
        });

    _pendingRequests.set(url, promise);
    return promise;
}

function showSaveDialog() {
    if (hasPrivilege('save')) {
        const modal = document.getElementById('saveDialog');
        modal.classList.add('show');
        document.getElementById('saveFilename').value = '';
        trapFocusInModal(modal);

        // Load existing files for overwrite option
        // Use fetchWithDedup to avoid duplicate requests if dialog is opened multiple times quickly
        fetchWithDedup('/api/list-maps')
            .then(result => {
                if (!result.ok) throw new Error(`HTTP ${result.status}`);
                return result.data;
            })
            .then(data => {
                const fileList = document.getElementById('saveFileList');
                fileList.innerHTML = '';

                if (!data.success || !Array.isArray(data.files) || data.files.length === 0) {
                    const p = document.createElement('p');
                    p.style.cssText = 'color: #6b7280; font-size: 0.9rem; padding: 10px;';
                    p.textContent = t('save.noExistingFiles');
                    fileList.appendChild(p);
                } else {
                    data.files.forEach(file => {
                        const isCurrentFile = file.name === currentMapFile;
                        const isEmptyFile = file.isEmpty === true;
                        const canSaveTo = isCurrentFile || isEmptyFile;

                        const div = document.createElement('div');
                        div.className = 'file-item';

                        // Visual styling based on whether file can be saved to
                        if (!canSaveTo) {
                            div.style.opacity = '0.5';
                            div.style.cursor = 'not-allowed';
                            div.title = t('save.cannotOverwrite');
                        }

                        const nameDiv = document.createElement('div');
                        nameDiv.className = 'file-name';

                        // Build filename with status indicators
                        let displayName = formatMapName(file.name);
                        if (isCurrentFile) {
                            displayName += ' (' + t('save.current') + ')';
                            nameDiv.style.color = '#4ade80'; // Green for current file
                        } else if (isEmptyFile) {
                            displayName += ' (' + t('save.blank') + ')';
                            nameDiv.style.color = '#60a5fa'; // Blue for blank files
                        }
                        nameDiv.textContent = displayName;

                        const dateDiv = document.createElement('div');
                        dateDiv.className = 'file-date';
                        dateDiv.textContent = file.modified;

                        div.appendChild(nameDiv);
                        div.appendChild(dateDiv);

                        // Only allow clicking on files that can be saved to
                        if (canSaveTo) {
                            div.onclick = () => selectFileToOverwrite(file.name);
                        } else {
                            div.onclick = () => {
                                showNotify(
                                    t('save.cannotSaveTo', { filename: file.name }),
                                    'warning'
                                );
                            };
                        }

                        fileList.appendChild(div);
                    });
                }
            })
            .catch(err => {
                console.error('Error loading file list:', err);
                const fileList = document.getElementById('saveFileList');
                fileList.innerHTML = '';
                const p = document.createElement('p');
                p.style.cssText = 'color: #ef4444; font-size: 0.9rem; padding: 10px;';
                p.textContent = t('save.errorLoadingFiles');
                fileList.appendChild(p);
            });
    }
}

function selectFileToOverwrite(filename) {
    // Remove .json extension for display in input
    const displayName = filename.endsWith('.json') ? filename.slice(0, -5) : filename;
    document.getElementById('saveFilename').value = displayName;
    document.getElementById('saveFilename').focus();
}

function showLoadDialog() {
    if (hasPrivilege('load')) {
        // Use fetchWithDedup to avoid duplicate requests
        fetchWithDedup('/api/list-maps')
            .then(result => {
                if (!result.ok) throw new Error(`HTTP ${result.status}`);
                return result.data;
            })
            .then(data => {
                const fileList = document.getElementById('fileList');
                fileList.innerHTML = '';

                if (!data.success || !Array.isArray(data.files) || data.files.length === 0) {
                    const p = document.createElement('p');
                    p.style.cssText = 'color: #9ca3af; font-size: 0.9rem; padding: 10px;';
                    p.textContent = t('load.noSavedMaps');
                    fileList.appendChild(p);
                } else {
                    data.files.forEach(file => {
                        const div = document.createElement('div');
                        div.className = 'file-item';
                        const nameDiv = document.createElement('div');
                        nameDiv.className = 'file-name';
                        nameDiv.textContent = formatMapName(file.name);
                        const dateDiv = document.createElement('div');
                        dateDiv.className = 'file-date';
                        dateDiv.textContent = file.modified;
                        div.appendChild(nameDiv);
                        div.appendChild(dateDiv);
                        div.onclick = async () => {
                            // Recalculate flag in case user manually undid all changes
                            updateUnsavedChangesFlag();
                            if (hasUnsavedChanges) {
                                if (!await showConfirm(t('load.unsavedConfirm'))) {
                                    return;
                                }
                            }
                            loadMap(file.name);
                            closeModal('loadDialog');
                        };
                        fileList.appendChild(div);
                    });
                }

                const modal = document.getElementById('loadDialog');
                modal.classList.add('show');
                trapFocusInModal(modal);
            })
            .catch(err => {
                console.error('Error loading file list:', err);
                showNotify(t('save.errorLoadingList'), 'error');
            });
    }
}

async function saveMap() {
    const filename = document.getElementById('saveFilename').value.trim();

    if (!filename) {
        showNotify(t('save.enterFilename'), 'warning');
        return;
    }

    // Normalize textboxes before saving
    const normalizedTextboxes = textboxes.map(normalizeTextbox);

    // Add .json if not present
    const finalFilename = filename.endsWith('.json') ? filename : filename + '.json';

    // Find the save button to disable during operation
    const saveBtn = document.querySelector('#saveDialog .btn-primary');
    const saveBtnOriginalText = saveBtn ? saveBtn.textContent : '';

    try {
        // Check if file exists and get its status
        const listResponse = await fetch('/api/list-maps');
        if (!listResponse.ok) {
            throw new Error(t('save.errorLoadingList'));
        }
        const listData = await listResponse.json();
        const existingFile = listData.files.find(f => f.name === finalFilename);
        const fileExists = !!existingFile;

        // SAVE PROTECTION: Only allow saving to:
        // 1. The currently loaded file (the one being edited)
        // 2. An empty file (no tiles or textboxes)
        // 3. A new file (doesn't exist yet)
        if (fileExists) {
            const isCurrentFile = finalFilename === currentMapFile;
            const isEmptyFile = existingFile.isEmpty === true;

            if (!isCurrentFile && !isEmptyFile) {
                // Attempting to overwrite a different non-empty file - BLOCK THIS
                showNotify(
                    t('save.cannotSaveToFull', { filename: finalFilename, currentFile: currentMapFile }),
                    'error'
                );
                return;
            }

            // Confirm overwrite (for current file or blank file)
            const displayName = formatMapName(finalFilename);
            const confirmMsg = isCurrentFile
                ? t('save.confirmOverwrite', { name: displayName })
                : t('save.confirmBlank', { name: displayName });
            const confirmed = await showConfirm(confirmMsg);
            if (!confirmed) return;
        }

        // Disable save button to prevent double-clicks during save
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = t('save.saving') || 'Saving...';
        }

        // Proceed with save
        const saveResponse = await fetch('/api/save-map', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: finalFilename,
                map: mapData.data,
                textboxes: normalizedTextboxes,
                doorMeta: doorMeta
            })
        });
        if (!saveResponse.ok) {
            const errorData = await saveResponse.json().catch(() => null);
            throw new Error(errorData?.message || t('save.errorSaving'));
        }
        const saveData = await saveResponse.json();

        showNotify(saveData.message, 'success');
        closeModal('saveDialog');
        // Save snapshot of clean state and clear unsaved changes flag
        saveSavedStateSnapshot();
        hasUnsavedChanges = false;
        // Invalidate cache and reload all maps to refresh autocomplete/search
        invalidateMapCache();
        // Reload all maps from server and rebuild the search index
        // This ensures autocomplete shows updated data across all maps
        await preloadAllMapsForSearch();
    } catch (err) {
        showNotify(err.message || t('save.errorSaving'), 'error');
    } finally {
        // Re-enable save button
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = saveBtnOriginalText;
        }
    }
}

// Helper function to apply loaded map data to the application state
// Used by both cache hits and network fetches to avoid code duplication
function applyLoadedMapData(filename, loadedMap, loadedTextboxes, loadedDoorMeta, skipCacheUpdate = false) {
    // Only save undo if not initial page load
    if (!isInitialLoad) {
        saveUndo();
    }
    isInitialLoad = false;

    // Load map data
    mapData.height = loadedMap.length;
    mapData.width = loadedMap[0] ? loadedMap[0].length : 0;
    mapData.data = loadedMap;

    // Load textboxes
    textboxes = (loadedTextboxes || []).map(normalizeTextbox);

    // Load door swing metadata
    doorMeta = loadedDoorMeta || {};

    // Update cache if not already from cache
    if (!skipCacheUpdate) {
        mapCache[filename] = {
            map: loadedMap,
            textboxes: textboxes.slice(),
            doorMeta: JSON.parse(JSON.stringify(doorMeta)),
            cachedAt: Date.now()
        };
    }

    // Track current map and update location dropdown
    currentMapFile = filename;
    updateLocationName();

    // Build searchable room index for pathfinding
    const floor = getFloorFromFilename(filename);
    buildRoomIndex(floor);

    // Rebuild combined room index from all cached maps
    // (All maps are preloaded on page init via initializeAvailableMaps)
    buildCombinedRoomIndex();

    closeModal('loadDialog');

    // Handle camera positioning
    if (shouldCenterOnStaircaseAfterLoad) {
        // Staircase popup floor switch: center on matching staircase, preserve zoom
        const staircaseId = shouldCenterOnStaircaseAfterLoad;
        shouldCenterOnStaircaseAfterLoad = null;
        if (shouldPreserveZoomAfterLoad) {
            tileSize = preservedTileSize;
            shouldPreserveZoomAfterLoad = false;
        }
        const staircaseResult = centerOnStaircase(staircaseId);

        // Open info panel for the matching staircase (navigation view only)
        // Only if the found textbox is a staircase or elevator (not CTE Entrance, etc.)
        if (shouldOpenStaircaseInfoPanelAfterLoad && staircaseResult) {
            shouldOpenStaircaseInfoPanelAfterLoad = false;
            const { textbox, index } = staircaseResult;
            if (isStaircaseTextbox(textbox) || isElevatorTextbox(textbox)) {
                // Position popup at center of screen since we centered the camera on the staircase
                const rect = canvas.getBoundingClientRect();
                const screenX = rect.left + rect.width / 2;
                const screenY = rect.top + rect.height / 2;
                showLocationPopup(textbox, index, screenX, screenY);
            }
        } else {
            shouldOpenStaircaseInfoPanelAfterLoad = false;
        }
    } else if (shouldCenterRouteAfterLoad) {
        // Route navigation: auto-fit to route segment
        shouldCenterRouteAfterLoad = false;
        centerOnRoute();
        if (typeof routeAnimation !== 'undefined' && routeAnimation.pendingSegment !== null) {
            if (typeof startRouteAnimation === 'function') {
                startRouteAnimation(routeAnimation.pendingSegment);
            }
            routeAnimation.pendingSegment = null;
        }
    } else if (shouldCenterRoomAfterLoad) {
        // Room finder: auto-zoom to show room
        shouldCenterRoomAfterLoad = false;
        centerOnRoom();
    } else if (shouldPreserveZoomAfterLoad) {
        // Manual floor switch: preserve zoom, just center
        shouldPreserveZoomAfterLoad = false;
        tileSize = preservedTileSize;
        centerCamera();
    } else {
        recenter();
    }

    needsRedraw = true;
    saveSavedStateSnapshot();
    hasUnsavedChanges = false;

    // Re-apply category filter if active (highlights items on new map)
    if (typeof reapplyCategoryFilterAfterMapLoad === 'function') {
        reapplyCategoryFilterAfterMapLoad();
    }

    // Update route instructions if active
    if (currentRoute && currentRoute.active) {
        setTimeout(() => updateRouteInstructions(currentRoute), 50);
    }

    // Hide loading screen after render
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            hideLoadingScreen();
        });
    });
}

function loadMap(filename) {
    // Prevent race conditions from concurrent loads
    if (isMapLoading) {
        console.warn('Map load already in progress, ignoring request');
        return;
    }
    isMapLoading = true;

    // Check mapCache first (most common case after initial load)
    const cached = mapCache[filename];
    if (cached && cached.map && cached.cachedAt) {
        const age = Date.now() - cached.cachedAt;
        if (age < CACHE_MAX_AGE_MS) {
            // Use cached data - no network request needed
            applyLoadedMapData(filename, cached.map, cached.textboxes, cached.doorMeta || {}, true); // skipCacheUpdate=true
            isMapLoading = false;
            return;
        }
    }

    // Check for preloaded map data (server-embedded or from sessionStorage)
    function getPreloadedData(filename) {
        // First check for server-embedded data (fastest - no parsing needed)
        if (window.PRELOADED_MAP_DATA && window.PRELOADED_MAP_DATA.filename === filename) {
            const data = window.PRELOADED_MAP_DATA.data;
            window.PRELOADED_MAP_DATA = null; // Clear after use
            return { success: true, data: data };
        }

        // Fallback to sessionStorage (from login page preload)
        try {
            const key = `preloaded_map_${filename}`;
            const cached = sessionStorage.getItem(key);
            if (cached) {
                const parsed = JSON.parse(cached);
                // Use if less than 30 seconds old
                if (parsed.timestamp && (Date.now() - parsed.timestamp) < 30000) {
                    sessionStorage.removeItem(key); // Clear after use
                    return { success: true, data: parsed.data };
                }
                sessionStorage.removeItem(key); // Clear stale data
            }
        } catch (e) {
            // Ignore sessionStorage errors
        }
        return null;
    }

    // Wrap in try-catch to ensure isMapLoading is always reset
    try {
        // Try to use preloaded data first, otherwise fetch from network
        const preloaded = getPreloadedData(filename);
        const dataPromise = preloaded
            ? Promise.resolve(preloaded)
            : fetch(`/api/load-map/${filename}`)
                .then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.json();
                });

        dataPromise.then(data => {
            if (data.success) {
                // Handle both sparse and dense map formats
                let loadedMap;
                const sparseMap = expandSparseMap(data.data);
                if (sparseMap) {
                    loadedMap = sparseMap;
                } else {
                    loadedMap = data.data.map;
                }

                // Validate map data structure
                if (!Array.isArray(loadedMap) || loadedMap.length === 0) {
                    throw new Error('Invalid map data structure');
                }

                // Apply the loaded map data
                applyLoadedMapData(filename, loadedMap, data.data.textboxes, data.data.doorMeta || {});
            } else {
                showNotify(t('load.errorLoading') + (data.message || 'Unknown error'), 'error');
            }
        })
        .catch(err => {
            console.error('Error loading map:', err);
            showNotify(t('load.failedToLoad'), 'error');
            // Still hide loading screen on error so user isn't stuck
            hideLoadingScreen();
        })
        .finally(() => {
            isMapLoading = false;
        });
    } catch (syncError) {
        // Handle synchronous errors (e.g., if fetch fails to even start)
        console.error('Synchronous error in loadMap:', syncError);
        isMapLoading = false;
        hideLoadingScreen();
    }
}

// ============================================
// LOCATION DROPDOWN (navigation view)
// ============================================

// Dynamic map list - populated from /api/available-maps on page load
// Each entry: { filename: 'CTEDownstairs.json', displayName: 'CTE Downstairs' }
let availableMaps = [];

// Map filenames to display names (populated dynamically)
let LOCATION_NAMES = {};

// Helper to format map filename to display name
function formatMapName(filename) {
    // First check if we have a defined display name from available maps
    if (LOCATION_NAMES[filename]) {
        return LOCATION_NAMES[filename];
    }
    // Fall back to formatting the filename: remove .json, add spaces between CamelCase
    let name = filename.endsWith('.json') ? filename.slice(0, -5) : filename;
    // Add space between lowercase and uppercase (e.g., "mainCampus" -> "main Campus")
    name = name.replace(/([a-z])([A-Z])/g, '$1 $2');
    // Add space between acronym and next word (e.g., "CTEDownstairs" -> "CTE Downstairs")
    name = name.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    return name;
}

// Default floor to load on page start (references MAP_CONFIG from map_core.js)
// MAP_CONFIG is defined in map_core.js which loads before this file
const DEFAULT_FLOOR = MAP_CONFIG.defaultMap;

// Prevent race conditions during map loading
let isMapLoading = false;

// Track if this is the initial page load (don't save undo for empty initial state)
let isInitialLoad = true;

// ============================================
// MAP CACHE FOR CROSS-FLOOR PATHFINDING
// ============================================
// Stores map data for all available maps so we can calculate paths and search locations
// Keys are filenames (e.g., 'CTEDownstairs.json'), values are { map, textboxes, cachedAt }
let mapCache = {};

// Cache expiration time (5 minutes) - ensures fresh data if maps are updated
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

// Invalidate all cached maps (call after saving or when cache might be stale)
function invalidateMapCache() {
    mapCache = {};
}

// Initialize available maps from the server and populate the dropdown
// This is called once on page load before loading any maps
async function initializeAvailableMaps() {
    try {
        // Use fetchWithDedup in case this is called multiple times
        const result = await fetchWithDedup('/api/available-maps');
        const data = result.data;

        if (data.success && data.maps) {
            availableMaps = data.maps;

            // Build LOCATION_NAMES lookup from the fetched data
            LOCATION_NAMES = {};
            for (const map of availableMaps) {
                LOCATION_NAMES[map.filename] = map.displayName;
            }

            // Populate the dropdown menu
            populateLocationDropdown();

            // Preload all available maps into cache for pathfinder search
            preloadAllMapsForSearch();
        }
    } catch (err) {
        console.error('Failed to load available maps:', err);
        // Fall back to default map
        availableMaps = [{ filename: DEFAULT_FLOOR, displayName: 'Example Map Downstairs' }];
        LOCATION_NAMES[DEFAULT_FLOOR] = 'Example Map Downstairs';
    }
}

// Populate the location dropdown with available maps
function populateLocationDropdown() {
    const menu = document.getElementById('locationMenu');
    if (!menu) return;

    // Clear existing options
    menu.innerHTML = '';

    // Add an option for each available map
    for (const map of availableMaps) {
        const button = document.createElement('button');
        button.className = 'location-option';
        button.textContent = map.displayName;
        button.onclick = () => selectLocation(map.filename, map.displayName);
        menu.appendChild(button);
    }

    // Update the current location name display
    updateLocationName();
}

// Preload all available maps into cache for pathfinder search
// This runs in the background so search works across all maps
async function preloadAllMapsForSearch() {
    // Load maps in parallel for faster initialization
    const loadPromises = availableMaps.map(map => loadMapIntoCache(map.filename));
    await Promise.all(loadPromises);

    // Rebuild the room index with all loaded maps
    if (typeof buildCombinedRoomIndex === 'function') {
        buildCombinedRoomIndex();
    }
}

// Load a map into cache without switching the display
// Used for cross-floor pathfinding calculations
async function loadMapIntoCache(filename, forceRefresh = false) {
    // Check if cache exists and is still fresh
    if (mapCache[filename] && !forceRefresh) {
        const age = Date.now() - (mapCache[filename].cachedAt || 0);
        if (age < CACHE_MAX_AGE_MS) {
            return mapCache[filename]; // Use cached version
        }
    }

    // Check for preloaded data from login page
    function getPreloadedData(filename) {
        try {
            const key = `preloaded_map_${filename}`;
            const cached = sessionStorage.getItem(key);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.timestamp && (Date.now() - parsed.timestamp) < 30000) {
                    sessionStorage.removeItem(key);
                    return { success: true, data: parsed.data };
                }
                sessionStorage.removeItem(key);
            }
        } catch (e) {}
        return null;
    }

    try {
        // Try preloaded data first, otherwise fetch from network
        const preloaded = getPreloadedData(filename);
        const data = preloaded || await fetch(`/api/load-map/${filename}`).then(r => r.json());

        if (data.success) {
            // Handle both sparse and dense map formats
            let loadedMap;
            const sparseMap = expandSparseMap(data.data);
            if (sparseMap) {
                // Sparse format - already expanded
                loadedMap = sparseMap;
            } else {
                // Dense format (legacy) - use directly
                loadedMap = data.data.map;
            }

            mapCache[filename] = {
                map: loadedMap,
                textboxes: (data.data.textboxes || []).map(normalizeTextbox),
                doorMeta: data.data.doorMeta || {},
                cachedAt: Date.now() // Track when this was cached
            };
            return mapCache[filename];
        }
    } catch (err) {
        // Silently fail - cache miss is handled gracefully
    }
    return null;
}

function toggleLocationMenu() {
    const dropdown = document.getElementById('locationDropdown');
    dropdown.classList.toggle('open');
}

async function selectLocation(filename, displayName) {
    // Recalculate flag in case user manually undid all changes
    updateUnsavedChangesFlag();
    if (hasUnsavedChanges) {
        if (!await showConfirm(t('notify.unsavedSwitch'))) {
            closeLocationMenu();
            return;
        }
    }

    // If there's an active route, update the segment index based on the map being loaded
    // IMPORTANT: Use mapFile (not floor) to correctly handle multiple buildings
    // (e.g., MainCampusDownstairs and CTEDownstairs both have floor='lower')
    if (currentRoute && currentRoute.active && currentRoute.segments) {
        // Find the segment for the new map and update the index
        for (let i = 0; i < currentRoute.segments.length; i++) {
            if (currentRoute.segments[i].mapFile === filename) {
                currentRoute.activeSegmentIndex = i;
                break;
            }
        }

        // Update route instructions after a short delay (after map loads)
        setTimeout(() => {
            if (typeof updateRouteInstructions === 'function') {
                updateRouteInstructions(currentRoute);
            }
        }, 100);
    }

    // Preserve zoom when manually switching floors via dropdown
    shouldPreserveZoomAfterLoad = true;
    preservedTileSize = tileSize;

    loadMap(filename);
    closeLocationMenu();
}

function closeLocationMenu() {
    const dropdown = document.getElementById('locationDropdown');
    if (dropdown) {
        dropdown.classList.remove('open');
    }
}

function updateLocationName() {
    const nameSpan = document.getElementById('currentLocationName');
    if (!nameSpan) return;

    const displayName = LOCATION_NAMES[currentMapFile] || currentMapFile;
    nameSpan.textContent = displayName;

    // Remove data-i18n so applyTranslations() doesn't overwrite with "Loading..."
    nameSpan.removeAttribute('data-i18n');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('locationDropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
    }

    // Close location popup when clicking outside (but not on canvas - that's handled separately)
    const locationPopup = document.getElementById('locationPopup');
    if (locationPopup && locationPopup.classList.contains('show')) {
        if (!locationPopup.contains(e.target) && e.target.tagName !== 'CANVAS') {
            hideLocationPopup();
        }
    }
});

// ============================================
// TEXTBOX EDITING
// ============================================

function editTextbox(index) {
    editingTextbox = index;
    const textbox = textboxes[index];

    document.getElementById('textboxContent').value = textbox.text;
    const fontSize = textbox.font_size !== undefined ? textbox.font_size : (textbox.fontSize || 20);
    document.getElementById('fontSizeSlider').value = fontSize;
    document.getElementById('fontSizeDisplay').textContent = fontSize;
    document.getElementById('textAlign').value = textbox.alignment || textbox.align || 'left';
    document.getElementById('textVerticalAlign').value = textbox.vertical_alignment || 'top';
    document.getElementById('markerToggle').checked = !!textbox.isMarker;

    const modal = document.getElementById('textboxDialog');
    modal.classList.add('show');
    trapFocusInModal(modal);
}

// Maximum textbox content length to prevent rendering issues
const MAX_TEXTBOX_LENGTH = 500;
const MAX_TEXTBOX_LINES = 20;

function saveTextbox() {
    if (editingTextbox !== null) {
        // Save undo state before making changes
        saveUndo();

        let text = document.getElementById('textboxContent').value;

        // Validate and truncate if necessary
        if (text.length > MAX_TEXTBOX_LENGTH) {
            text = text.slice(0, MAX_TEXTBOX_LENGTH);
            showNotify(t('textbox.charTruncated', { max: MAX_TEXTBOX_LENGTH }), 'warning');
        }

        // Limit number of lines
        const lines = text.split('\n');
        if (lines.length > MAX_TEXTBOX_LINES) {
            text = lines.slice(0, MAX_TEXTBOX_LINES).join('\n');
            showNotify(t('textbox.lineTruncated', { max: MAX_TEXTBOX_LINES }), 'warning');
        }

        textboxes[editingTextbox].text = text;
        textboxes[editingTextbox].font_size = parseInt(document.getElementById('fontSizeSlider').value, 10);
        textboxes[editingTextbox].alignment = document.getElementById('textAlign').value;
        textboxes[editingTextbox].vertical_alignment = document.getElementById('textVerticalAlign').value;
        textboxes[editingTextbox].isMarker = document.getElementById('markerToggle').checked || undefined;

        closeModal('textboxDialog');
        editingTextbox = null;
        needsRedraw = true;
    }
}

async function deleteTextbox() {
    if (editingTextbox !== null && await showConfirm(t('textbox.removeConfirm'))) {
        // Save undo state before deletion so it can be undone
        saveUndo();
        textboxes.splice(editingTextbox, 1);
        closeModal('textboxDialog');
        editingTextbox = null;
        needsRedraw = true;
    }
}

document.getElementById('fontSizeSlider').addEventListener('input', (e) => {
    document.getElementById('fontSizeDisplay').textContent = e.target.value;
});

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Remove focus trap listener to prevent accumulation on repeated open/close
        if (modal._trapHandler) {
            modal.removeEventListener('keydown', modal._trapHandler);
            modal._trapHandler = null;
        }
        modal.classList.remove('show');
        // Restore focus to the element that opened the modal
        if (modal._previousFocus && modal._previousFocus.focus) {
            modal._previousFocus.focus();
        }
    }
    editingTextbox = null;
}

// Focus trap for modals - keeps focus within modal when open
function trapFocusInModal(modal) {
    const focusableElements = modal.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Store the element that opened the modal
    modal._previousFocus = document.activeElement;

    // Focus the first focusable element
    if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 50);
    }

    // Create keydown handler for this modal
    modal._trapHandler = function(e) {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
            // Shift + Tab: if on first element, go to last
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            // Tab: if on last element, go to first
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    };

    modal.addEventListener('keydown', modal._trapHandler);
}

// Open modal with focus management
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        trapFocusInModal(modal);
    }
}

async function logout() {
    // Recalculate flag in case user manually undid all changes
    updateUnsavedChangesFlag();
    if (hasUnsavedChanges) {
        if (!await showConfirm(t('notify.unsavedLogout'))) {
            return;
        }
    }
    // Show loading screen immediately so user sees feedback
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
    // Clear unsaved changes flag to prevent beforeunload dialog
    hasUnsavedChanges = false;
    window.location.href = '/logout';
}

// ============================================
// INFO PANEL EDITING
// ============================================

// Info panel editing state
var editingInfoPanelTextbox = null;
var infoPanelImages = [];
var infoPanelAutoCategories = [];
var infoPanelHasManualOverride = false;
var infoPanelCategoriesReset = false;

// Compute auto-detected categories for a textbox (reuses classifyLocationCategories from map_pathfinder.js)
function getAutoCategories(textbox) {
    const text = textbox.text || '';
    const lines = text.split('\n');
    const aliases = [];
    let roomNumber = null;
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (trimmed.startsWith('~')) {
            aliases.push(trimmed.substring(1).trim());
        }
        if (i === 1 && trimmed.startsWith('#')) {
            roomNumber = trimmed.replace('#', '').trim();
        }
    }
    const locationData = { aliases: aliases, roomNumber: roomNumber };
    return classifyLocationCategories(locationData, text);
}

function editInfoPanel(index) {
    editingInfoPanelTextbox = index;
    const textbox = textboxes[index];

    // Get display name from first line of text
    const lines = textbox.text.split('\n');
    let displayName = lines[0] || 'Location';
    if (displayName.startsWith('*')) {
        displayName = displayName.substring(1).trim();
    }
    if (displayName.startsWith('|')) {
        displayName = displayName.substring(1).trim();
    }
    document.getElementById('infoPanelLocationName').textContent = displayName;

    // Load existing description
    const descTextarea = document.getElementById('infoPanelDescription');
    descTextarea.value = textbox.description || '';
    updateDescriptionCharCount();

    // Load existing images
    infoPanelImages = textbox.images ? [...textbox.images] : [];
    renderInfoPanelImages();

    // Load category checklist
    infoPanelAutoCategories = getAutoCategories(textbox);
    infoPanelHasManualOverride = false;
    infoPanelCategoriesReset = false;

    const hasManual = Array.isArray(textbox.manualCategories);
    const activeCategories = hasManual ? textbox.manualCategories : infoPanelAutoCategories;

    // Set checkbox states
    document.querySelectorAll('#categoryChecklist input[type="checkbox"]').forEach(function(cb) {
        cb.checked = activeCategories.includes(cb.value);
    });

    // Show/hide auto badges
    document.querySelectorAll('.category-auto-badge').forEach(function(badge) {
        var cat = badge.dataset.category;
        badge.style.display = (!hasManual && infoPanelAutoCategories.includes(cat)) ? '' : 'none';
    });

    // Show/hide reset button
    document.getElementById('resetCategoriesBtn').style.display = hasManual ? '' : 'none';

    const modal = document.getElementById('infoPanelDialog');
    modal.classList.add('show');
    trapFocusInModal(modal);
}

function updateDescriptionCharCount() {
    const textarea = document.getElementById('infoPanelDescription');
    const countEl = document.getElementById('descriptionCharCount');
    if (textarea && countEl) {
        countEl.textContent = textarea.value.length;
    }
}

// Add event listener for character count
document.addEventListener('DOMContentLoaded', function() {
    const descTextarea = document.getElementById('infoPanelDescription');
    if (descTextarea) {
        descTextarea.addEventListener('input', updateDescriptionCharCount);
    }
});

function renderInfoPanelImages() {
    // Render the URL list
    const listEl = document.getElementById('infoPanelImageList');
    listEl.innerHTML = '';

    infoPanelImages.forEach((url, index) => {
        const item = document.createElement('div');
        item.className = 'image-list-item';
        item.innerHTML = `
            <span class="image-url" title="${escapeHtml(url)}">${escapeHtml(url)}</span>
            <button type="button" class="btn-remove-image" onclick="removeInfoPanelImage(${index})" title="Remove">&times;</button>
        `;
        listEl.appendChild(item);
    });

    // Render preview thumbnails
    const previewEl = document.getElementById('infoPanelImagePreview');
    previewEl.innerHTML = '';

    infoPanelImages.forEach((url, index) => {
        const img = document.createElement('img');
        img.src = url;
        img.alt = `Image ${index + 1}`;
        img.onerror = function() {
            this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="%23374151" width="80" height="80"/><text x="40" y="45" text-anchor="middle" fill="%239ca3af" font-size="10">Error</text></svg>';
        };
        previewEl.appendChild(img);
    });
}

function addInfoPanelImage() {
    const input = document.getElementById('newImageUrl');
    const url = input.value.trim();

    if (!url) {
        showNotify(t('infoPanel.enterUrl'), 'warning');
        return;
    }

    // Basic URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showNotify(t('infoPanel.invalidUrl'), 'warning');
        return;
    }

    // Limit number of images
    if (infoPanelImages.length >= 5) {
        showNotify(t('infoPanel.maxImages'), 'warning');
        return;
    }

    infoPanelImages.push(url);
    input.value = '';
    renderInfoPanelImages();
}

function removeInfoPanelImage(index) {
    infoPanelImages.splice(index, 1);
    renderInfoPanelImages();
}

function saveInfoPanel() {
    if (editingInfoPanelTextbox !== null) {
        saveUndo();

        const description = document.getElementById('infoPanelDescription').value.trim();

        // Store the description and images
        textboxes[editingInfoPanelTextbox].description = description;
        textboxes[editingInfoPanelTextbox].images = [...infoPanelImages];

        // Handle manual categories
        if (infoPanelHasManualOverride) {
            // User changed checkboxes — save as manual override
            var checkedCategories = [];
            document.querySelectorAll('#categoryChecklist input[type="checkbox"]').forEach(function(cb) {
                if (cb.checked) checkedCategories.push(cb.value);
            });
            textboxes[editingInfoPanelTextbox].manualCategories = checkedCategories;
        } else if (infoPanelCategoriesReset) {
            // User clicked "Reset to Auto" — remove manual override
            delete textboxes[editingInfoPanelTextbox].manualCategories;
        }
        // Otherwise: user didn't touch categories — leave manualCategories as-is

        closeModal('infoPanelDialog');
        editingInfoPanelTextbox = null;
        infoPanelImages = [];
        needsRedraw = true;
        hasUnsavedChanges = true;

        showNotify(t('infoPanel.saved'), 'success');
    }
}

async function clearInfoPanel() {
    if (await showConfirm(t('infoPanel.clearConfirm'))) {
        document.getElementById('infoPanelDescription').value = '';
        updateDescriptionCharCount();
        infoPanelImages = [];
        renderInfoPanelImages();
        resetCategoriesToAuto();
        infoPanelCategoriesReset = true;
    }
}

function onCategoryCheckboxChanged() {
    infoPanelHasManualOverride = true;

    // Hide all auto badges since user is now manually overriding
    document.querySelectorAll('.category-auto-badge').forEach(function(badge) {
        badge.style.display = 'none';
    });

    // Show the reset button
    document.getElementById('resetCategoriesBtn').style.display = '';
}

function resetCategoriesToAuto() {
    infoPanelHasManualOverride = false;
    infoPanelCategoriesReset = true;

    // Reset checkboxes to auto-detected state
    document.querySelectorAll('#categoryChecklist input[type="checkbox"]').forEach(function(cb) {
        cb.checked = infoPanelAutoCategories.includes(cb.value);
    });

    // Restore auto badges
    document.querySelectorAll('.category-auto-badge').forEach(function(badge) {
        var cat = badge.dataset.category;
        badge.style.display = infoPanelAutoCategories.includes(cat) ? '' : 'none';
    });

    // Hide reset button
    document.getElementById('resetCategoriesBtn').style.display = 'none';
}

// Helper to escape HTML for safe display
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// DOOR SWING EDITING (Floating Popup - created dynamically)
// ============================================

// Currently editing door swing position
var editingDoorSwingPos = null;
var doorSwingState = { direction: 'into', side: 'top', hinge: 'left' };
var doorSwingPopup = null;

// Create the door swing popup dynamically (bypasses template rendering issues)
function createDoorSwingPopup() {
    if (doorSwingPopup) return doorSwingPopup;

    const popup = document.createElement('div');
    popup.id = 'doorSwingPopup';
    popup.className = 'door-swing-popup';
    popup.innerHTML = `
        <div class="door-swing-header">
            <span class="door-swing-title">${t('doorSwing.title')}</span>
            <button class="door-swing-close" onclick="closeDoorSwingPopup()">&times;</button>
        </div>
        <div class="door-swing-body">
            <div class="door-swing-section" data-option="direction">
                <label>${t('doorSwing.direction')}</label>
                <div class="door-swing-toggle-group">
                    <button type="button" class="door-swing-toggle" data-value="into">${t('doorSwing.intoRoom')}</button>
                    <button type="button" class="door-swing-toggle" data-value="out">${t('doorSwing.outToHall')}</button>
                </div>
            </div>
            <div class="door-swing-section" data-option="side">
                <label>${t('doorSwing.side')}</label>
                <div class="door-swing-toggle-group door-swing-sides">
                    <button type="button" class="door-swing-toggle" data-value="top">${t('doorSwing.top')}</button>
                    <button type="button" class="door-swing-toggle" data-value="bottom">${t('doorSwing.bottom')}</button>
                    <button type="button" class="door-swing-toggle" data-value="left">${t('doorSwing.left')}</button>
                    <button type="button" class="door-swing-toggle" data-value="right">${t('doorSwing.right')}</button>
                </div>
            </div>
            <div class="door-swing-section" data-option="hinge">
                <label>${t('doorSwing.hingeSide')}</label>
                <div class="door-swing-toggle-group">
                    <button type="button" class="door-swing-toggle" data-value="left">${t('doorSwing.hingeLeft')}</button>
                    <button type="button" class="door-swing-toggle" data-value="right">${t('doorSwing.hingeRight')}</button>
                </div>
            </div>
            <div class="door-swing-preview">
                <canvas id="doorSwingPreviewCanvas" width="120" height="120"></canvas>
            </div>
            <div class="door-swing-actions">
                <button class="btn-save" onclick="saveDoorSwing()">${t('common.save')}</button>
                <button class="btn-remove" onclick="removeDoorSwing()">${t('doorSwing.removeSwing')}</button>
            </div>
        </div>
    `;

    // Add click handlers to toggle buttons
    popup.querySelectorAll('.door-swing-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.closest('.door-swing-section');
            const option = section.dataset.option;
            const value = btn.dataset.value;
            setDoorSwingOption(option, value);
        });
    });

    // Prevent clicks inside popup from reaching canvas
    popup.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });

    document.body.appendChild(popup);
    doorSwingPopup = popup;
    return popup;
}

function openDoorSwingPanel(col, row, screenX, screenY) {
    editingDoorSwingPos = { col, row };
    const key = `${row},${col}`;

    // Load existing data or use defaults
    const existing = doorMeta[key];
    if (existing) {
        doorSwingState = { ...existing };
    } else {
        doorSwingState = { direction: 'into', side: 'top', hinge: 'left' };
    }

    // Create popup if needed
    const popup = createDoorSwingPopup();

    // Update toggle button states and preview before measuring
    updateDoorSwingToggles();
    updateDoorSwingPreview();

    // Show popup off-screen first to measure its actual size
    popup.style.left = '-9999px';
    popup.style.top = '0px';
    popup.classList.add('show');

    // Measure actual rendered size
    const popupRect = popup.getBoundingClientRect();
    const popupWidth = popupRect.width;
    const popupHeight = popupRect.height;

    // Position popup near the click, but keep it on screen
    let left = screenX + 20;
    let top = screenY - popupHeight / 2;

    // Keep on screen
    if (left + popupWidth > window.innerWidth) {
        left = screenX - popupWidth - 20;
    }
    if (left < 10) left = 10;
    if (top < 10) top = 10;
    if (top + popupHeight > window.innerHeight - 10) {
        top = window.innerHeight - popupHeight - 10;
    }

    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
}

function closeDoorSwingPopup() {
    if (doorSwingPopup) {
        doorSwingPopup.classList.remove('show');
    }
    editingDoorSwingPos = null;
}

function setDoorSwingOption(option, value) {
    doorSwingState[option] = value;
    updateDoorSwingToggles();
    updateDoorSwingPreview();
}

function updateDoorSwingToggles() {
    if (!doorSwingPopup) return;

    doorSwingPopup.querySelectorAll('.door-swing-section').forEach(section => {
        const option = section.dataset.option;
        const currentValue = doorSwingState[option];

        section.querySelectorAll('.door-swing-toggle').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.value === currentValue);
        });
    });
}

function updateDoorSwingPreview() {
    const canvas = document.getElementById('doorSwingPreviewCanvas');
    if (!canvas) return;

    const previewCtx = canvas.getContext('2d');
    const size = 80;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Clear canvas
    const canvasColors = getCanvasColors();
    previewCtx.fillStyle = canvasColors.background;
    previewCtx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw tile outline
    previewCtx.strokeStyle = canvasColors.textboxBorderEditor;
    previewCtx.lineWidth = 2;
    previewCtx.strokeRect(centerX - size/2, centerY - size/2, size, size);

    // Draw door swing using the shared drawing function
    drawSingleDoorSwing(
        previewCtx, centerX, centerY, size,
        doorSwingState.direction, doorSwingState.side, doorSwingState.hinge,
        canvasColors
    );
}

function saveDoorSwing() {
    if (!editingDoorSwingPos) return;

    saveUndo();
    const key = `${editingDoorSwingPos.row},${editingDoorSwingPos.col}`;
    doorMeta[key] = { ...doorSwingState };

    closeDoorSwingPopup();
    needsRedraw = true;
    hasUnsavedChanges = true;
}

function removeDoorSwing() {
    if (!editingDoorSwingPos) return;

    saveUndo();
    const key = `${editingDoorSwingPos.row},${editingDoorSwingPos.col}`;
    delete doorMeta[key];

    closeDoorSwingPopup();
    needsRedraw = true;
    hasUnsavedChanges = true;
}

function cleanupDoorSwingData(col, row, previousTile) {
    // Remove door swing data when a doorway tile is overwritten
    // previousTile is the tile type that WAS at this position before being overwritten
    if (previousTile === DOORWAY_TILE) {
        const key = `${row},${col}`;
        if (doorMeta[key]) {
            delete doorMeta[key];
        }
    }
}

// ============================================
// MOBILE RESPONSIVE - Panel Toggles
// ============================================

// Track panel states
let controlPanelOpen = false;
let routePanelExpanded = false;
let routePanelCollapsedDesktop = false;  // Desktop-specific collapsed state

// Check if we're on mobile viewport (including landscape orientation)
function isMobileViewport() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Standard mobile portrait mode
    if (width <= 767) return true;

    // Mobile landscape mode: limited height + landscape orientation
    // This catches phones/tablets rotated sideways where width > 767 but height is small
    if (height <= 500 && width <= 1024 && width > height) return true;

    return false;
}

// Toggle control panel drawer (mobile)
function toggleControlPanel() {
    if (!isMobileViewport()) return;

    controlPanelOpen = !controlPanelOpen;
    const panel = document.getElementById('controlPanel');
    const overlay = document.getElementById('panelOverlay');

    if (controlPanelOpen) {
        panel.classList.add('open');
        overlay.classList.add('show');
    } else {
        panel.classList.remove('open');
        overlay.classList.remove('show');
    }
}

// Toggle route panel bottom sheet (mobile) / side sheet (landscape)
function toggleRoutePanel() {
    if (!isMobileViewport()) return;

    routePanelExpanded = !routePanelExpanded;
    const panel = document.getElementById('routePanel');
    const tab = document.getElementById('routePanelTab');

    if (routePanelExpanded) {
        panel.classList.add('expanded');
        if (tab) tab.classList.add('hidden');
    } else {
        panel.classList.remove('expanded');
        if (tab) tab.classList.remove('hidden');
    }
}

// Collapse route panel - used when finding a route to show the map
// Works on both mobile (collapses bottom sheet) and desktop (slides off to right)
function collapseRoutePanel() {
    const panel = document.getElementById('routePanel');

    if (isMobileViewport()) {
        // Mobile behavior - collapse bottom sheet or side sheet
        routePanelExpanded = false;
        const tab = document.getElementById('routePanelTab');
        if (panel) panel.classList.remove('expanded');
        if (tab) tab.classList.remove('hidden');
    } else {
        // Desktop behavior - slide panel off to the right
        routePanelCollapsedDesktop = true;
        if (panel) panel.classList.add('collapsed');

        // Update ARIA state on desktop tab
        const desktopTab = document.getElementById('routePanelTabDesktop');
        if (desktopTab) desktopTab.setAttribute('aria-expanded', 'false');
    }
}

// Expand route panel on desktop - used to re-open collapsed panel
function expandRoutePanelDesktop() {
    if (isMobileViewport()) return;

    routePanelCollapsedDesktop = false;
    const panel = document.getElementById('routePanel');
    if (panel) panel.classList.remove('collapsed');

    // Update ARIA state on desktop tab
    const desktopTab = document.getElementById('routePanelTabDesktop');
    if (desktopTab) desktopTab.setAttribute('aria-expanded', 'true');
}

// Toggle route panel on desktop (called by desktop tab button)
function toggleRoutePanelDesktop() {
    if (isMobileViewport()) return;

    if (routePanelCollapsedDesktop) {
        expandRoutePanelDesktop();
    } else {
        collapseRoutePanel();
    }
}

// Close panels when resizing between mobile and desktop
window.addEventListener('resize', () => {
    const controlPanel = document.getElementById('controlPanel');
    const routePanel = document.getElementById('routePanel');
    const routeTab = document.getElementById('routePanelTab');
    const overlay = document.getElementById('panelOverlay');

    if (!isMobileViewport()) {
        // Close mobile panels when switching to desktop
        controlPanelOpen = false;
        routePanelExpanded = false;

        if (controlPanel) controlPanel.classList.remove('open');
        if (routePanel) routePanel.classList.remove('expanded');
        if (routeTab) routeTab.classList.remove('hidden');
        if (overlay) overlay.classList.remove('show');
    } else {
        // When switching to mobile, reset desktop collapsed state
        routePanelCollapsedDesktop = false;
        if (routePanel) routePanel.classList.remove('collapsed');
    }
});

// Handle orientation changes on mobile devices
window.addEventListener('orientationchange', () => {
    // Small delay to let the browser complete the orientation change
    setTimeout(() => {
        // Collapse route panel when orientation changes to avoid awkward states
        routePanelExpanded = false;
        const routePanel = document.getElementById('routePanel');
        const routeTab = document.getElementById('routePanelTab');
        if (routePanel) routePanel.classList.remove('expanded');
        if (routeTab) routeTab.classList.remove('hidden');

        // Close control panel when orientation changes
        controlPanelOpen = false;
        const controlPanel = document.getElementById('controlPanel');
        const overlay = document.getElementById('panelOverlay');
        if (controlPanel) controlPanel.classList.remove('open');
        if (overlay) overlay.classList.remove('show');

        // Trigger canvas resize if needed
        if (typeof resizeCanvas === 'function') {
            resizeCanvas();
        }
    }, 100);
});

// Setup route panel interactions for mobile
let lastSwipeTime = 0;  // Track when last swipe happened to prevent click firing after swipe

document.addEventListener('DOMContentLoaded', () => {
    const routeHeader = document.querySelector('.route-header');
    if (routeHeader) {
        routeHeader.addEventListener('click', (e) => {
            // Only toggle on mobile, and only if clicking the header itself
            // Skip if a swipe just happened (within 300ms)
            if (isMobileViewport() && e.target.closest('.route-header') && (Date.now() - lastSwipeTime) > 300) {
                toggleRoutePanel();
            }
        });
    }

    // Auto-expand route panel when user focuses on inputs (mobile)
    const routeInputs = document.querySelectorAll('#startLocation, #endLocation');
    routeInputs.forEach(input => {
        input.addEventListener('focus', () => {
            if (isMobileViewport() && !routePanelExpanded) {
                routePanelExpanded = true;
                const panel = document.getElementById('routePanel');
                if (panel) panel.classList.add('expanded');
            }
        });
    });

    // Swipe gesture support for mobile route panel (on header/drag handle)
    if (routeHeader) {
        let swipeStartX = 0;
        let swipeStartY = 0;
        let swipeStartTime = 0;
        let isSwiping = false;
        const SWIPE_THRESHOLD = 30;  // Minimum distance in pixels
        const SWIPE_TIME_LIMIT = 500;  // Maximum time in ms for a swipe

        routeHeader.addEventListener('touchstart', (e) => {
            if (!isMobileViewport()) return;
            const touch = e.touches[0];
            swipeStartX = touch.clientX;
            swipeStartY = touch.clientY;
            swipeStartTime = Date.now();
            isSwiping = false;
        }, { passive: true });

        routeHeader.addEventListener('touchmove', (e) => {
            if (!isMobileViewport()) return;
            const touch = e.touches[0];
            const deltaY = Math.abs(touch.clientY - swipeStartY);
            const deltaX = Math.abs(touch.clientX - swipeStartX);
            // Mark as swipe if moved enough (prevents click from firing)
            if (deltaY > 10 || deltaX > 10) {
                isSwiping = true;
            }
        }, { passive: true });

        routeHeader.addEventListener('touchend', (e) => {
            if (!isMobileViewport()) return;
            if (!e.changedTouches[0]) return;
            if (!isSwiping) return;  // Let click handler handle taps

            // Mark swipe time to prevent click handler from double-toggling
            lastSwipeTime = Date.now();

            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - swipeStartX;
            const deltaY = touch.clientY - swipeStartY;
            const deltaTime = Date.now() - swipeStartTime;

            // Only process swipes within time limit
            if (deltaTime > SWIPE_TIME_LIMIT) return;

            const isLandscape = window.innerHeight <= 500 && window.innerWidth > window.innerHeight;

            if (isLandscape) {
                // Landscape mode: side sheet from left
                if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
                    if (deltaX < 0 && routePanelExpanded) {
                        toggleRoutePanel();
                    } else if (deltaX > 0 && !routePanelExpanded) {
                        toggleRoutePanel();
                    }
                }
            } else {
                // Portrait mode: bottom sheet
                if (Math.abs(deltaY) > SWIPE_THRESHOLD && Math.abs(deltaY) > Math.abs(deltaX)) {
                    if (deltaY < 0 && !routePanelExpanded) {
                        toggleRoutePanel();
                    } else if (deltaY > 0 && routePanelExpanded) {
                        toggleRoutePanel();
                    }
                }
            }
        }, { passive: true });
    }

    // Swipe support for landscape tab (swipe right on tab to open panel)
    const routePanelTab = document.getElementById('routePanelTab');
    if (routePanelTab) {
        let tabSwipeStartX = 0;

        routePanelTab.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            tabSwipeStartX = touch.clientX;
        }, { passive: true });

        routePanelTab.addEventListener('touchend', (e) => {
            if (!e.changedTouches[0]) return;
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - tabSwipeStartX;

            // Swipe right on tab opens the panel
            if (deltaX > 30) {
                toggleRoutePanel();
            }
        }, { passive: true });
    }
});

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

// Named handler for cleanup
function handleKeyboardShortcuts(e) {
    // Escape key should ALWAYS work - to close modals, clear routes, etc.
    if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal.show');
        if (openModals.length > 0) {
            openModals.forEach(modal => modal.classList.remove('show'));
            return;
        }
        // Clear any active route/highlight if no modal is open
        if (typeof clearRoute === 'function' && currentRoute) {
            clearRoute();
            return;
        }
        // Clear textbox highlight
        if (hoveredTextbox !== null) {
            hoveredTextbox = null;
            needsRedraw = true;
            return;
        }
        return;
    }

    if (document.querySelector('.modal.show')) return;

    // Don't intercept keys when typing in input fields
    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
    if (isTyping) return;

    if (e.key === ' ' && hasPrivilege('edit_map')) {
        e.preventDefault();
        setMode(currentMode === 'draw' ? 'pan' : 'draw');
    } else if (e.key === 't' && hasPrivilege('edit_textboxes')) {
        setMode('textbox');
    } else if (e.key === 'b' && hasPrivilege('edit_map')) {
        // B for bucket fill mode
        setMode('bucket');
    } else if (e.key === 'i' && hasPrivilege('edit_textboxes')) {
        // I for info panel mode
        setMode('info');
    } else if ((e.key === 'a' || e.key === 'A') && currentMode === 'pan' && !e.repeat) {
        // A key: rotate left 45° (pan mode only, ignore key repeat to prevent spin glitches)
        mapRotation -= Math.PI / 4;
        needsRedraw = true;
    } else if ((e.key === 'd' || e.key === 'D') && currentMode === 'pan' && !e.repeat) {
        // D key: rotate right 45° (pan mode only, ignore key repeat to prevent spin glitches)
        mapRotation += Math.PI / 4;
        needsRedraw = true;
    } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undo();
    } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        showSaveDialog();
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        showLoadDialog();
    } else if (e.key >= '1' && e.key <= '4' && hasPrivilege('edit_map')) {
        selectTile(parseInt(e.key, 10));
    } else if (e.key === '0' && hasPrivilege('edit_map')) {
        selectTile(0);
    } else if (e.key === '+' || e.key === '=') {
        zoomIn();
    } else if (e.key === '-') {
        zoomOut();
    } else if (e.key === 'r') {
        recenter();
    } else if (e.key === 'F11' && isDesktop()) {
        // Override browser F11 to use Fullscreen API (which responds to Escape)
        e.preventDefault();
        toggleFullscreen();
    }
}

document.addEventListener('keydown', handleKeyboardShortcuts);

// Cleanup event listeners on page unload to prevent memory leaks
window.addEventListener('pagehide', () => {
    document.removeEventListener('keydown', handleKeyboardShortcuts);
});

// ============================================
// AUTO-LOAD DEFAULT MAP
// ============================================

// Initialize available maps and load default map when page loads
window.addEventListener('load', async () => {
    // First, initialize the available maps list and populate dropdown
    await initializeAvailableMaps();

    // Then load the default map
    loadMap(DEFAULT_FLOOR);
});
