// Helper: Strip special prefixes from display names (*, |, ^, ~)
// These prefixes have special meanings but shouldn't be shown to users
function stripDisplayPrefixes(text) {
    if (!text) return text;
    // Strip leading special characters used for textbox formatting
    return text.replace(/^[\*\|\^~]+\s*/, '');
}

// Called when user clicks "Directions To" button in location popup
// Autofills the END location input with the selected location
function getDirectionsToLocation() {
    // selectedLocationData is set in map_interactions.js when popup opens
    if (typeof selectedLocationData === 'undefined' || !selectedLocationData) return;

    const endInput = document.getElementById('endLocation');
    if (!endInput) return;

    // Set the end location value and data
    endInput.value = buildLocationLabel(selectedLocationData);
    endInput.dataset.roomData = JSON.stringify(selectedLocationData);

    // Populate the styled display overlay
    populateDisplayOverlay('endLocation', selectedLocationData);

    // Hide the popup
    hideLocationPopup();

    // Expand route panel if collapsed (mobile or desktop)
    if (typeof expandRoutePanelDesktop === 'function') {
        expandRoutePanelDesktop();  // Desktop: removes .collapsed class
    }
    const routePanel = document.getElementById('routePanel');
    if (routePanel && !routePanel.classList.contains('expanded')) {
        routePanel.classList.add('expanded');  // Mobile: adds .expanded class
    }

    // Focus the start input to prompt user to enter start location
    const startInput = document.getElementById('startLocation');
    if (startInput && !startInput.dataset.roomData) {
        startInput.focus();
    }
}

// Called when user clicks "Directions From" button in location popup
// Autofills the START location input with the selected location
function getDirectionsFromLocation() {
    // selectedLocationData is set in map_interactions.js when popup opens
    if (typeof selectedLocationData === 'undefined' || !selectedLocationData) return;

    const startInput = document.getElementById('startLocation');
    if (!startInput) return;

    // Set the start location value and data
    startInput.value = buildLocationLabel(selectedLocationData);
    startInput.dataset.roomData = JSON.stringify(selectedLocationData);

    // Populate the styled display overlay
    populateDisplayOverlay('startLocation', selectedLocationData);

    // Hide the popup
    hideLocationPopup();

    // Expand route panel if collapsed (mobile or desktop)
    if (typeof expandRoutePanelDesktop === 'function') {
        expandRoutePanelDesktop();  // Desktop: removes .collapsed class
    }
    const routePanel = document.getElementById('routePanel');
    if (routePanel && !routePanel.classList.contains('expanded')) {
        routePanel.classList.add('expanded');  // Mobile: adds .expanded class
    }

    // Focus the end input to prompt user to enter destination
    const endInput = document.getElementById('endLocation');
    if (endInput && !endInput.dataset.roomData) {
        endInput.focus();
    }
}

// Swap the From and To locations in the pathfinder
function swapLocations() {
    const startInput = document.getElementById('startLocation');
    const endInput = document.getElementById('endLocation');
    const startDisplay = document.getElementById('startLocationDisplay');
    const endDisplay = document.getElementById('endLocationDisplay');
    if (!startInput || !endInput) return;

    // Save current state
    const startVal = startInput.value;
    const startData = startInput.dataset.roomData || '';
    const endVal = endInput.value;
    const endData = endInput.dataset.roomData || '';

    // Swap input values and data
    startInput.value = endVal;
    startInput.dataset.roomData = endData;
    endInput.value = startVal;
    endInput.dataset.roomData = startData;

    // Rebuild display overlays
    if (endData) {
        try {
            populateDisplayOverlay('startLocation', JSON.parse(endData));
        } catch (e) {
            if (startDisplay) { startDisplay.innerHTML = ''; startDisplay.classList.remove('show'); }
            startInput.classList.remove('has-selection');
        }
    } else {
        if (startDisplay) { startDisplay.innerHTML = ''; startDisplay.classList.remove('show'); }
        startInput.classList.remove('has-selection');
    }

    if (startData) {
        try {
            populateDisplayOverlay('endLocation', JSON.parse(startData));
        } catch (e) {
            if (endDisplay) { endDisplay.innerHTML = ''; endDisplay.classList.remove('show'); }
            endInput.classList.remove('has-selection');
        }
    } else {
        if (endDisplay) { endDisplay.innerHTML = ''; endDisplay.classList.remove('show'); }
        endInput.classList.remove('has-selection');
    }
}

// Helper: Display route info panel, instructions, and collapse panel
function showRouteInfo(route) {
    // Show route info panel
    const routeInfo = document.getElementById('routeInfo');
    if (routeInfo) {
        routeInfo.style.display = 'block';

        // Calculate total steps
        let totalSteps = 0;
        route.segments.forEach(seg => {
            if (seg.path) totalSteps += seg.path.length;
        });

        const distanceEl = document.getElementById('routeDistance');
        if (distanceEl) {
            distanceEl.textContent = t('pathfinder.aboutSteps', { count: totalSteps });
        }

        const floorChangeEl = document.getElementById('floorChangeInfo');
        if (floorChangeEl) {
            if (route.requiresFloorChange) {
                if (route.isDisconnectedRoute && Array.isArray(route.stairsUsed) && route.stairsUsed.length >= 2) {
                    // Disconnected same-floor route (e.g., upstairs gym to upstairs main)
                    floorChangeEl.textContent = t('pathfinder.useThenUse', { stairs1: stripDisplayPrefixes(route.stairsUsed[0]), stairs2: stripDisplayPrefixes(route.stairsUsed[1]) });
                } else if (route.stairsUsed) {
                    floorChangeEl.textContent = t('pathfinder.useToChange', { stairs: stripDisplayPrefixes(route.stairsUsed) });
                } else {
                    floorChangeEl.textContent = t('pathfinder.floorChangeRequired');
                }
                floorChangeEl.style.display = 'block';
            } else {
                floorChangeEl.style.display = 'none';
            }
        }
    }

    // Update route instructions in top bar
    updateRouteInstructions(route);

    // Collapse the route panel so the user can see the map/route
    // (slides off to right on desktop, collapses on mobile)
    collapseRoutePanel();
}

// Main function called when user clicks "Find Route"
async function findRoute() {
    const startInput = document.getElementById('startLocation');
    const endInput = document.getElementById('endLocation');
    const findRouteBtn = document.getElementById('findRouteBtn');

    // Get selected room data from input fields
    let startData, endData;
    try {
        startData = startInput.dataset.roomData ? JSON.parse(startInput.dataset.roomData) : null;
        endData = endInput.dataset.roomData ? JSON.parse(endInput.dataset.roomData) : null;
    } catch (e) {
        showNotify(t('pathfinder.errorReadingData'), 'error');
        return;
    }

    // Provide specific error messages for missing locations
    if (!startData && !endData) {
        showNotify(t('pathfinder.selectBothLocations'), 'warning');
        return;
    }
    if (!startData) {
        showNotify(t('pathfinder.selectStart'), 'warning');
        return;
    }
    if (!endData) {
        showNotify(t('pathfinder.selectDestination'), 'warning');
        return;
    }

    // Check if start and end are the same location
    // Use position and floor to determine if they're the same (works for both classrooms and non-classroom locations)
    const isSameLocation = startData.grid_x === endData.grid_x &&
        startData.grid_y === endData.grid_y &&
        startData.floor === endData.floor;

    if (isSameLocation) {
        showNotify(t('pathfinder.sameLocation'), 'warning');
        return;
    }

    // Check if locations are on different buildings with no known connection
    // (e.g., Main Campus and CTE are separate buildings - no walking path between them yet)
    const startBuilding = getBuilding(startData.mapFile);
    const endBuilding = getBuilding(endData.mapFile);
    if (startBuilding !== endBuilding) {
        // Different buildings with no connection - show error
        const routeError = document.getElementById('routeError');
        if (routeError) {
            routeError.textContent = t('pathfinder.noCrossBuilding');
            routeError.style.display = 'block';
        }
        const routeInfo = document.getElementById('routeInfo');
        if (routeInfo) routeInfo.style.display = 'none';
        return;
    }

    // Show loading state immediately to improve INP (Interaction to Next Paint)
    // This gives instant visual feedback before heavy computation
    const originalBtnText = findRouteBtn.textContent;
    findRouteBtn.disabled = true;
    findRouteBtn.textContent = t('editor.finding');

    // Wait for browser to paint the loading state before heavy computation
    // This dramatically improves perceived responsiveness (INP drops from ~400ms to ~16ms)
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

    // Calculate the route (this is the heavy computation)
    const route = calculateRoute(startData, endData);

    // Restore button state
    findRouteBtn.disabled = false;
    findRouteBtn.textContent = originalBtnText;

    if (!route) {
        // Show inline error instead of alert
        const routeError = document.getElementById('routeError');
        if (routeError) {
            // Check if this is an elevator access issue (no elevator to reach disconnected area)
            if (typeof elevatorAccessRequired !== 'undefined' && elevatorAccessRequired) {
                routeError.textContent = t('pathfinder.notAccessibleElevator');
            } else {
                routeError.textContent = t('pathfinder.noRouteFound');
            }
            routeError.style.display = 'block';
        }
        // Hide route info if visible
        const routeInfo = document.getElementById('routeInfo');
        if (routeInfo) routeInfo.style.display = 'none';
        return;
    }

    // Hide any previous error
    const routeError = document.getElementById('routeError');
    if (routeError) routeError.style.display = 'none';

    // Clear any existing room finder marker (avoid visual clutter with route)
    clearFoundRoom();

    // Set the global route state (used by drawRoute in map_core.js)
    currentRoute = route;

    // If the route starts on a different map than currently loaded, switch to it
    const firstSegmentMap = route.segments[0]?.mapFile;
    if (firstSegmentMap && firstSegmentMap !== currentMapFile) {
        // Show route info before switching maps
        showRouteInfo(route);
        // Set flag to center on route after map loads
        shouldCenterRouteAfterLoad = true;
        // Queue animation for segment 0 after map loads
        routeAnimation.pendingSegment = 0;
        loadMap(firstSegmentMap);
        // The rest of the route display will happen after map loads
        return;
    }

    // Start animation for the first segment
    if (typeof startRouteAnimation === 'function') {
        startRouteAnimation(0);
    }

    // Show route info panel and instructions
    showRouteInfo(route);

    // Check if we need to switch to the start location's map (different floor in same building)
    const startFloor = route.startRoom.floor;
    const currentFloor = getCurrentFloor();
    const startMapFile = route.segments[0]?.mapFile;

    if (startFloor !== currentFloor && startMapFile && startMapFile !== currentMapFile) {
        // Check for unsaved changes before switching floors
        // Recalculate flag in case user manually undid all changes
        updateUnsavedChangesFlag();
        if (hasUnsavedChanges) {
            if (!await showConfirm(t('notify.unsavedStartFloor'))) {
                return;
            }
        }
        // Need to switch floors - set flag and load the correct map
        shouldCenterRouteAfterLoad = true;
        loadMap(startMapFile);
    } else {
        // Already on the correct floor - center on the route
        centerOnRoute();
    }

    // Trigger redraw to show the route
    needsRedraw = true;
}

// Toggle elevator mode on/off from the pathfinder panel
// This allows users to switch between stairs and elevator without re-logging in
function toggleElevatorMode(enabled) {
    elevatorAccessRequired = enabled;

    // If there's an active route, clear it since the path options have changed
    // Pass false to keep the input values so user can easily recalculate
    if (currentRoute && currentRoute.active) {
        clearRoute(false);
        // Show a brief message that mode changed
        const routeError = document.getElementById('routeError');
        if (routeError) {
            routeError.style.display = 'block';
            routeError.style.color = '#96BEE6';
            routeError.textContent = enabled
                ? t('pathfinder.elevatorEnabled')
                : t('pathfinder.elevatorDisabled');
            // Clear the message after 3 seconds
            setTimeout(() => {
                if (routeError.textContent.includes('mode')) {
                    routeError.style.display = 'none';
                    routeError.style.color = '';
                }
            }, 3000);
        }
    }
}

// Clear the current route
function clearRoute(clearInputs = true) {
    // Stop any running animation
    if (typeof stopRouteAnimation === 'function') {
        stopRouteAnimation();
    }

    currentRoute = {
        active: false,
        startRoom: null,
        endRoom: null,
        segments: [],
        requiresFloorChange: false,
        stairsUsed: null
    };

    // Clear input fields (optional - skip when just clearing route for mode change)
    if (clearInputs) {
        const startInput = document.getElementById('startLocation');
        const endInput = document.getElementById('endLocation');
        if (startInput) {
            startInput.value = '';
            startInput.dataset.roomData = '';
            startInput.classList.remove('has-selection');
        }
        if (endInput) {
            endInput.value = '';
            endInput.dataset.roomData = '';
            endInput.classList.remove('has-selection');
        }

        // Clear display overlays
        const startDisplay = document.getElementById('startLocationDisplay');
        const endDisplay = document.getElementById('endLocationDisplay');
        if (startDisplay) {
            startDisplay.innerHTML = '';
            startDisplay.classList.remove('show');
        }
        if (endDisplay) {
            endDisplay.innerHTML = '';
            endDisplay.classList.remove('show');
        }
    }

    // Hide route info and error
    const routeInfo = document.getElementById('routeInfo');
    if (routeInfo) {
        routeInfo.style.display = 'none';
    }
    const routeError = document.getElementById('routeError');
    if (routeError) {
        routeError.style.display = 'none';
    }

    // Trigger redraw to clear the route
    needsRedraw = true;

    // Hide route instructions in top bar
    hideRouteInstructions();
}

// Update route instructions in the top bar
function updateRouteInstructions(route) {
    const instructionsDiv = document.getElementById('routeInstructions');
    const step1 = document.getElementById('routeStep1');
    const step2 = document.getElementById('routeStep2');
    const step3Container = document.getElementById('routeStep3Container');
    const step3 = document.getElementById('routeStep3');

    if (!instructionsDiv) return;

    if (!route || !route.active) {
        instructionsDiv.style.display = 'none';
        return;
    }

    instructionsDiv.style.display = 'flex';

    const currentFloor = getCurrentFloor();
    // Handle both classrooms and non-classroom locations (Library, Gym, etc.)
    const startLabel = route.startRoom.label || route.startRoom.name ||
        (route.startRoom.roomNumber ? t('route.room') + ' ' + route.startRoom.roomNumber : t('route.start'));
    const endLabel = route.endRoom.label || route.endRoom.name ||
        (route.endRoom.roomNumber ? t('route.room') + ' ' + route.endRoom.roomNumber : t('route.destination'));

    if (route.isDisconnectedRoute && Array.isArray(route.stairsUsed) && route.stairsUsed.length >= 2) {
        // Disconnected same-floor route: go down one stair, across, up another
        const stair1 = stripDisplayPrefixes(route.stairsUsed[0]);
        const stair2 = stripDisplayPrefixes(route.stairsUsed[1]);
        const goDown = route.startRoom.floor === 'upper';

        if (step1) step1.textContent = t('route.goTo', { location: stair1 });
        if (step2) step2.textContent = goDown ? t('route.goDownWalkTo', { location: stair2 }) : t('route.goUpWalkTo', { location: stair2 });
        if (step3) step3.textContent = t('route.goToDestination', { location: stripDisplayPrefixes(endLabel).split(' ')[0] });
        if (step3Container) step3Container.style.display = 'inline';

        // Highlight based on current segment index
        if (step1) step1.classList.remove('active');
        if (step2) step2.classList.remove('active');
        if (step3) step3.classList.remove('active');

        const segmentIndex = route.activeSegmentIndex || 0;
        if (segmentIndex === 0) {
            if (step1) step1.classList.add('active');
        } else if (segmentIndex === 1) {
            if (step2) step2.classList.add('active');
        } else {
            if (step3) step3.classList.add('active');
        }
    } else if (route.requiresFloorChange) {
        // Cross-floor route: 3 steps
        const stairName = stripDisplayPrefixes(route.stairsUsed) || 'Stairs';
        const direction = route.direction === 'up' ? t('route.goUpstairs') : t('route.goDownstairs');

        if (step1) step1.textContent = t('route.goTo', { location: stairName });
        if (step2) step2.textContent = direction;
        if (step3) step3.textContent = t('route.goToDestination', { location: stripDisplayPrefixes(endLabel).split(' ')[0] });
        if (step3Container) step3Container.style.display = 'inline';

        // Highlight current step based on which floor we're on
        if (step1) step1.classList.remove('active');
        if (step2) step2.classList.remove('active');
        if (step3) step3.classList.remove('active');

        if (currentFloor === route.startRoom.floor) {
            if (step1) step1.classList.add('active');
        } else {
            if (step3) step3.classList.add('active');
        }
    } else {
        // Same floor route: 2 steps
        if (step1) step1.textContent = t('route.from', { location: stripDisplayPrefixes(startLabel).split(' ')[0] });
        if (step2) step2.textContent = t('route.goToDestination', { location: stripDisplayPrefixes(endLabel).split(' ')[0] });
        if (step3Container) step3Container.style.display = 'none';

        if (step1) step1.classList.remove('active');
        if (step2) step2.classList.add('active');
    }

    // Add click handlers to navigate to specific segments
    // Clear old handlers first to prevent duplicates
    if (step1) step1.onclick = null;
    if (step2) step2.onclick = null;
    if (step3) step3.onclick = null;

    if (route.isDisconnectedRoute) {
        // Disconnected route: 3 segments, one per step
        if (step1) step1.onclick = () => navigateToSegment(0);
        if (step2) step2.onclick = () => navigateToSegment(1);
        if (step3) step3.onclick = () => navigateToSegment(2);
    } else if (route.requiresFloorChange) {
        // Cross-floor route: step 1 -> segment 0, step 2 is transition, step 3 -> segment 1
        if (step1) step1.onclick = () => navigateToSegment(0);
        if (step2) step2.onclick = () => navigateToSegment(0);  // Transition step goes to first segment
        if (step3) step3.onclick = () => navigateToSegment(1);
    } else {
        // Same floor route: both steps navigate to segment 0
        if (step1) step1.onclick = () => navigateToSegment(0);
        if (step2) step2.onclick = () => navigateToSegment(0);
    }
}

// Hide route instructions
function hideRouteInstructions() {
    const instructionsDiv = document.getElementById('routeInstructions');
    if (instructionsDiv) {
        instructionsDiv.style.display = 'none';
    }
}

// Switch to the other floor for cross-floor navigation
async function switchToOtherFloor() {
    if (!currentRoute || !currentRoute.requiresFloorChange) return;

    // Check if there's a paired floor for this building
    const otherFloorFile = getPairedFloorMap(currentMapFile);
    if (!otherFloorFile) {
        // No paired floor exists - show friendly error
        const currentFloor = getCurrentFloor();
        const direction = currentFloor === 'lower' ? t('common.upstairs').toLowerCase() : t('common.downstairs').toLowerCase();
        const buildingName = formatMapName(currentMapFile).replace(/ (Downstairs|Upstairs)$/, '');
        await showAlert(t('notify.floorUnavailable', { direction: direction, building: buildingName }));
        return;
    }

    // Check for unsaved changes before switching floors
    // Recalculate flag in case user manually undid all changes
    updateUnsavedChangesFlag();
    if (hasUnsavedChanges) {
        if (!await showConfirm(t('notify.unsavedFloorSwitch'))) {
            return;
        }
    }

    // Track progress through route segments (works for all multi-floor routes)
    if (currentRoute.activeSegmentIndex !== undefined) {
        currentRoute.activeSegmentIndex++;
    }

    // Queue animation for after floor loads
    if (typeof routeAnimation !== 'undefined') {
        routeAnimation.pendingSegment = currentRoute.activeSegmentIndex;
    }

    // Set flag to center on route after map loads
    shouldCenterRouteAfterLoad = true;

    // Load the other floor
    loadMap(otherFloorFile);

    // Update the route instructions after floor switch
    setTimeout(() => {
        updateRouteInstructions(currentRoute);
    }, 100);
}

// Navigate to a specific segment of the route (used when clicking instruction steps)
function navigateToSegment(segmentIndex) {
    if (!currentRoute || !currentRoute.active) return;
    if (segmentIndex < 0 || segmentIndex >= currentRoute.segments.length) return;

    const targetSegment = currentRoute.segments[segmentIndex];
    const currentFloor = getCurrentFloor();

    // Update segment index
    currentRoute.activeSegmentIndex = segmentIndex;

    // Check if we need to switch maps (use segment's mapFile, not hardcoded function)
    if (targetSegment.mapFile && targetSegment.mapFile !== currentMapFile) {
        shouldCenterRouteAfterLoad = true;
        // Queue animation for after floor switch
        if (typeof routeAnimation !== 'undefined') {
            routeAnimation.pendingSegment = segmentIndex;
        }
        loadMap(targetSegment.mapFile);
    } else {
        // Same floor - just center on the segment and animate
        centerOnRoute();
        if (typeof startRouteAnimation === 'function') {
            startRouteAnimation(segmentIndex);
        }
    }

    // Update instruction highlighting
    updateRouteInstructions(currentRoute);
    needsRedraw = true;
}

// ============================================
// ROOM FINDER FUNCTIONS
// ============================================

// Find and highlight a room on the map
async function findRoom() {
    const input = document.getElementById('roomFinderInput');
    const infoDiv = document.getElementById('roomFinderInfo');

    if (!input) return;

    // Check if we have valid room data from autocomplete selection
    let roomData;
    try {
        roomData = input.dataset.roomData ? JSON.parse(input.dataset.roomData) : null;
    } catch (e) {
        roomData = null;
    }

    if (!roomData) {
        // No valid selection - show error feedback
        if (infoDiv) {
            infoDiv.innerHTML = '<span style="color: #fecaca;">' + t('pathfinder.selectFromSuggestions') + '</span>';
            infoDiv.style.display = 'block';
        }
        return;
    }

    // Clear any existing route (avoid visual clutter with room marker)
    clearRoute();

    // Determine the floor and coordinates
    const roomFloor = roomData.floor || getFloorFromFilename(roomData.mapFile);
    const roomX = roomData.grid_x;
    const roomY = roomData.grid_y;
    const roomWidth = roomData.grid_width || 4;  // Default width if not specified
    const roomHeight = roomData.grid_height || 3; // Default height if not specified
    const roomLabel = roomData.label || roomData.name || roomData.teacher || 'Unknown Room';

    // Set the found room marker (include dimensions for centering the star inside the room)
    foundRoomMarker = {
        mapFile: roomData.mapFile,  // Use mapFile for cross-building support (not just floor)
        x: roomX,
        y: roomY,
        width: roomWidth,
        height: roomHeight,
        label: roomLabel
    };

    // Show info about the found room
    if (infoDiv) {
        const floorLabel = getFloorDisplayLabel(roomData.mapFile, roomFloor);
        infoDiv.innerHTML = `
            <div class="room-name">${roomLabel}</div>
            <div class="room-floor">${floorLabel}</div>
        `;
        infoDiv.style.display = 'block';
    }

    // Collapse the route panel so the user can see the map/room
    // (slides off to right on desktop, collapses on mobile)
    collapseRoutePanel();

    // Check if we need to switch maps (compare mapFile, not floor, for cross-building support)
    if (roomData.mapFile !== currentMapFile) {
        // Need to switch maps first
        // Recalculate flag in case user manually undid all changes
        updateUnsavedChangesFlag();
        if (hasUnsavedChanges) {
            if (!await showConfirm(t('notify.unsavedFindRoom'))) {
                return;
            }
        }

        // Set flag to center on room after map loads
        shouldCenterRoomAfterLoad = true;

        // Load the correct map file for the room
        // (roomData.mapFile contains the actual map filename, e.g., 'CTEDownstairs.json')
        loadMap(roomData.mapFile);
    } else {
        // Same map - just center on the room
        centerOnRoom();
    }

    needsRedraw = true;
}

// Clear the found room marker
function clearFoundRoom() {
    const input = document.getElementById('roomFinderInput');
    const infoDiv = document.getElementById('roomFinderInfo');
    const display = document.getElementById('roomFinderInputDisplay');

    // Clear the marker
    foundRoomMarker = null;

    // Clear the input
    if (input) {
        input.value = '';
        input.dataset.roomData = '';
        input.classList.remove('has-selection');
    }

    // Clear the display overlay
    if (display) {
        display.innerHTML = '';
        display.classList.remove('show');
    }

    // Hide the info
    if (infoDiv) {
        infoDiv.style.display = 'none';
    }

    needsRedraw = true;
}

// ============================================
// AUTOCOMPLETE UI HANDLERS
// ============================================

// Show suggestions dropdown with search results
function showSuggestions(inputId, dropdownId, results) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    dropdown.innerHTML = '';

    // Check if user has typed something
    const input = document.getElementById(inputId);
    const hasQuery = input && input.value.trim().length > 0;

    if (results.length === 0) {
        if (hasQuery) {
            // Show "no results" message when user typed but nothing found
            const noResults = document.createElement('div');
            noResults.className = 'suggestion-item no-results';
            noResults.textContent = t('pathfinder.noResults');
            noResults.style.color = '#9ca3af';
            noResults.style.fontStyle = 'italic';
            noResults.style.cursor = 'default';
            dropdown.appendChild(noResults);
            dropdown.classList.add('show');
        } else {
            dropdown.classList.remove('show');
        }
        return;
    }

    // Create suggestion items using safe DOM methods (prevents XSS)
    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'teacher-name';

        const detailDiv = document.createElement('div');
        detailDiv.className = 'room-number';

        // Determine if this is a teacher (underlined) or location (not underlined)
        // Use result.type which is set during indexing based on * prefix
        const isTeacher = result.type === 'classroom';

        // Get the primary name (teacher name or location name)
        const primaryName = result.teacher || result.name || 'Location';

        // Build the display name - primary name plus subtitle if present (for locations)
        let displayText = primaryName;
        if (!isTeacher && result.subtitles && result.subtitles.length > 0) {
            const subtitle = result.subtitles[0];
            // Add subtitle in parentheses if it doesn't already have them
            if (subtitle.startsWith('(')) {
                displayText = `${primaryName} ${subtitle}`;
            } else {
                displayText = `${primaryName} (${subtitle})`;
            }
        }

        // First line: name (+ room number badge if has room number)
        nameDiv.textContent = isTeacher ? primaryName : displayText;
        if (!isTeacher) {
            nameDiv.classList.add('location-name');
        }

        // Add room number badge inline with name if present
        if (result.roomNumber) {
            const roomBadge = document.createElement('span');
            roomBadge.className = 'room-number-badge';
            roomBadge.textContent = '#' + result.roomNumber;
            nameDiv.appendChild(document.createTextNode(' '));
            nameDiv.appendChild(roomBadge);
        }

        // Second line: floor indicator (always show)
        const floorLabel = getFloorDisplayLabel(result.mapFile, result.floor);
        detailDiv.textContent = floorLabel;
        detailDiv.classList.add('floor-label');

        item.appendChild(nameDiv);
        item.appendChild(detailDiv);

        // Third line: description (if present) - shown in small adjustable font
        if (result.description && result.description.trim()) {
            const descDiv = document.createElement('div');
            descDiv.className = 'suggestion-description';

            // Truncate long descriptions for the preview
            const maxLen = 80;
            let descText = result.description.trim();
            if (descText.length > maxLen) {
                descText = descText.substring(0, maxLen).trim() + '...';
            }
            descDiv.textContent = descText;

            // Adjust font size based on description length
            // Shorter descriptions get slightly larger font, longer ones get smaller
            if (descText.length <= 30) {
                descDiv.style.fontSize = '0.75rem';
            } else if (descText.length <= 50) {
                descDiv.style.fontSize = '0.7rem';
            } else {
                descDiv.style.fontSize = '0.65rem';
            }

            item.appendChild(descDiv);
        }

        item.addEventListener('click', () => {
            selectSuggestion(inputId, dropdownId, result);
        });
        dropdown.appendChild(item);
    });

    dropdown.classList.add('show');
}

// Helper: Populate styled display overlay for a location input
// Called when selecting from autocomplete or using directions buttons
function populateDisplayOverlay(inputId, result) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(inputId + 'Display');

    if (!display || !input) return;

    display.innerHTML = '';

    // Determine if this is a teacher (underlined) or location (not underlined)
    // Use result.type which is set during indexing based on * prefix
    const isTeacher = result.type === 'classroom';
    const primaryName = result.teacher || result.name || 'Location';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'display-name';
    if (isTeacher) {
        nameSpan.classList.add('teacher');
    }
    nameSpan.textContent = primaryName;

    const detailSpan = document.createElement('span');
    detailSpan.className = 'display-badge';

    if (result.roomNumber) {
        // Has room number - show room badge
        detailSpan.textContent = '#' + result.roomNumber;
    } else {
        // General location - show floor label
        const floorLabel = getFloorDisplayLabel(result.mapFile, result.floor);
        detailSpan.textContent = floorLabel;
        detailSpan.classList.add('floor-label');
    }

    display.appendChild(nameSpan);
    display.appendChild(detailSpan);
    display.classList.add('show');
    input.classList.add('has-selection');
}

// Handle selecting a suggestion
function selectSuggestion(inputId, dropdownId, result) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    if (input) {
        // Use the label property which works for both classrooms and general locations
        input.value = result.label || result.name || `${result.teacher} (#${result.roomNumber})`;
        input.dataset.roomData = JSON.stringify(result);
    }

    // Populate styled display overlay
    populateDisplayOverlay(inputId, result);

    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

// Auto-fill the top autocomplete suggestion if user hasn't selected one
// Returns true if selection is valid (either already had one or successfully auto-filled)
// Returns false if no matches found (input cleared and error shown)
function autoFillTopSuggestion(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    if (!input) return false;

    // Skip if already has valid selection
    if (input.dataset.roomData) return true;

    // Skip if input is empty
    const query = input.value.trim();
    if (!query) return false;

    // Search for matches
    const results = searchRooms(query);

    if (results.length > 0) {
        // Auto-select the top result
        selectSuggestion(inputId, dropdownId, results[0]);
        showNotify(t('pathfinder.selected', { label: results[0].label }), 'info', 2000);
        return true;
    } else {
        // No matches - clear input and show error
        input.value = '';
        input.dataset.roomData = '';
        const display = document.getElementById(inputId + 'Display');
        if (display) {
            display.classList.remove('show');
            input.classList.remove('has-selection');
        }
        showNotify(t('pathfinder.noMatchingLocation'), 'error');
        return false;
    }
}

// Hide all suggestion dropdowns
function hideAllSuggestions() {
    document.querySelectorAll('.suggestions-dropdown').forEach(dropdown => {
        dropdown.classList.remove('show');
    });
}

// Set up autocomplete for an input field
// inputId: ID of the input element
// dropdownId: ID of the suggestions dropdown
// options: { expandPanel: boolean } - whether to expand route panel on mobile focus
function setupAutocomplete(inputId, dropdownId, options = {}) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(inputId + 'Display');
    if (!input) return;

    input.addEventListener('input', (e) => {
        // Clear category filter when user starts typing
        if (activeCategoryFilter) {
            activeCategoryFilter = null;
            updateCategoryButtonStates();
        }
        const results = searchRooms(e.target.value);
        showSuggestions(inputId, dropdownId, results);
        // Clear stored data when user types (need to re-select)
        input.dataset.roomData = '';
        // Hide styled display when typing
        if (display) {
            display.classList.remove('show');
            input.classList.remove('has-selection');
        }
    });

    input.addEventListener('focus', (e) => {
        if (e.target.value.length > 0) {
            // If we have stored room data (user clicked overlay to edit), show that item
            // This prevents "No results" when the input has label text like "Harris (#208)"
            let results;
            if (input.dataset.roomData) {
                try {
                    const storedData = JSON.parse(input.dataset.roomData);
                    results = [storedData];
                } catch (err) {
                    results = searchRooms(e.target.value);
                }
            } else {
                results = searchRooms(e.target.value);
            }
            showSuggestions(inputId, dropdownId, results);
        }
        // Auto-expand the route panel on mobile when focusing (if enabled)
        if (options.expandPanel && window.innerWidth <= 767) {
            const routePanel = document.getElementById('routePanel');
            if (routePanel) {
                routePanel.classList.add('expanded');
            }
        }
    });

    // Auto-fill top suggestion when user clicks/taps outside without selecting
    input.addEventListener('blur', () => {
        // Small delay to allow click on suggestion to register first
        setTimeout(() => {
            // Only auto-fill if dropdown is not visible (user didn't click a suggestion)
            const dropdown = document.getElementById(dropdownId);
            if (!dropdown || !dropdown.classList.contains('show')) {
                autoFillTopSuggestion(inputId, dropdownId);
            }
        }, 150);
    });

    // Click on styled display to edit
    if (display) {
        display.addEventListener('click', () => {
            display.classList.remove('show');
            input.classList.remove('has-selection');
            input.focus();
            input.select();
        });
    }
}

// Set up autocomplete event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Set up all autocomplete inputs
    setupAutocomplete('startLocation', 'startSuggestions');
    setupAutocomplete('endLocation', 'endSuggestions');
    setupAutocomplete('roomFinderInput', 'roomFinderSuggestions', { expandPanel: true });

    // Close dropdowns when clicking outside
    document.addEventListener('click', handleOutsideClick);

    // Handle Enter key to trigger find route or find room
    document.addEventListener('keydown', handleEnterKey);

    // Cleanup event listeners on page unload to prevent memory leaks
    window.addEventListener('pagehide', () => {
        document.removeEventListener('click', handleOutsideClick);
        document.removeEventListener('keydown', handleEnterKey);
    });
});

// Named handlers for cleanup (defined outside DOMContentLoaded so they can be referenced)
function handleOutsideClick(e) {
    if (!e.target.closest('.autocomplete-container')) {
        hideAllSuggestions();
    }
}

function handleEnterKey(e) {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement) {
            if (activeElement.id === 'startLocation' || activeElement.id === 'endLocation') {
                hideAllSuggestions();
                // Auto-fill if needed, but don't auto-trigger route finding
                const inputId = activeElement.id;
                const dropdownId = inputId === 'startLocation' ? 'startSuggestions' : 'endSuggestions';
                autoFillTopSuggestion(inputId, dropdownId);
            } else if (activeElement.id === 'roomFinderInput') {
                hideAllSuggestions();
                // Auto-fill if needed, but don't auto-trigger room finding
                autoFillTopSuggestion('roomFinderInput', 'roomFinderSuggestions');
            }
        }
    }
}

// ============================================
// MOBILE KEYBOARD DETECTION
// ============================================
// Detects when the on-screen keyboard appears on mobile devices
// and adjusts the UI so the pathfinder panel and autocomplete
// suggestions remain visible above the keyboard.

// Track keyboard state to avoid redundant updates
let isKeyboardVisible = false;

// Initialize keyboard detection using visualViewport API
function initKeyboardDetection() {
    // Only run on mobile devices (touch-capable with narrow viewport)
    const isMobile = ('ontouchstart' in window || navigator.maxTouchPoints > 0) &&
                     window.innerWidth <= 767;

    if (!isMobile) return;

    // Use visualViewport API if available (well-supported on iOS Safari 13+ and Chrome mobile)
    if (window.visualViewport) {
        // Track the initial viewport height (without keyboard)
        let initialViewportHeight = window.visualViewport.height;

        // Update initial height when orientation changes
        window.addEventListener('orientationchange', () => {
            // Wait for orientation change to complete
            setTimeout(() => {
                if (!isKeyboardVisible) {
                    initialViewportHeight = window.visualViewport.height;
                }
            }, 100);
        });

        // Listen for viewport resize (keyboard show/hide)
        window.visualViewport.addEventListener('resize', () => {
            const currentHeight = window.visualViewport.height;
            const heightDiff = initialViewportHeight - currentHeight;

            // Keyboard is likely visible if viewport shrank by more than 150px
            // (typical keyboard height is 250-350px)
            const keyboardThreshold = 150;

            if (heightDiff > keyboardThreshold) {
                // Keyboard appeared
                if (!isKeyboardVisible) {
                    isKeyboardVisible = true;
                    document.body.classList.add('keyboard-visible');
                    // Set CSS variable for keyboard height
                    document.documentElement.style.setProperty('--keyboard-height', `${heightDiff}px`);
                }
            } else {
                // Keyboard hidden
                if (isKeyboardVisible) {
                    isKeyboardVisible = false;
                    document.body.classList.remove('keyboard-visible');
                    document.documentElement.style.setProperty('--keyboard-height', '0px');
                }
            }
        });

        // Also listen for scroll events on visualViewport (iOS scrolls viewport when keyboard appears)
        window.visualViewport.addEventListener('scroll', () => {
            if (isKeyboardVisible) {
                // Keep the route panel positioned correctly during scroll
                const offsetTop = window.visualViewport.offsetTop;
                document.documentElement.style.setProperty('--keyboard-offset-top', `${offsetTop}px`);
            }
        });
    } else {
        // Fallback for older browsers: use focus/blur events on inputs
        // This is less accurate but provides basic support
        const pathfinderInputs = document.querySelectorAll('#routePanel input');

        pathfinderInputs.forEach(input => {
            input.addEventListener('focus', () => {
                // Assume keyboard is ~40% of screen height on mobile
                const estimatedKeyboardHeight = window.innerHeight * 0.4;
                isKeyboardVisible = true;
                document.body.classList.add('keyboard-visible');
                document.documentElement.style.setProperty('--keyboard-height', `${estimatedKeyboardHeight}px`);
            });

            input.addEventListener('blur', () => {
                // Small delay to handle focus moving between inputs
                setTimeout(() => {
                    const activeEl = document.activeElement;
                    const isStillInPathfinder = activeEl && activeEl.closest('#routePanel');

                    if (!isStillInPathfinder) {
                        isKeyboardVisible = false;
                        document.body.classList.remove('keyboard-visible');
                        document.documentElement.style.setProperty('--keyboard-height', '0px');
                    }
                }, 100);
            });
        });
    }
}

// Initialize keyboard detection when DOM is ready
document.addEventListener('DOMContentLoaded', initKeyboardDetection);

// ============================================
// CATEGORY FILTER FUNCTIONS
// ============================================

// Currently active category filter (null if none)
let activeCategoryFilter = null;

// Flag to re-apply category filter after map load
let pendingCategoryFilter = null;

// Filter locations by category - highlights items on map and zooms to show all
function filterByCategory(category) {
    // Toggle off if same category clicked
    if (activeCategoryFilter === category) {
        clearCategoryFilter();
        return;
    }

    // Set active category
    activeCategoryFilter = category;
    updateCategoryButtonStates();

    // Get all locations in this category
    const allResults = getLocationsByCategory(category);

    // Filter to just current map
    const currentMapResults = allResults.filter(loc => loc.mapFile === currentMapFile);

    // If no items on current map, find map with most items and switch
    if (currentMapResults.length === 0 && allResults.length > 0) {
        // Count items per map
        const mapCounts = {};
        for (const loc of allResults) {
            mapCounts[loc.mapFile] = (mapCounts[loc.mapFile] || 0) + 1;
        }

        // Find map with most items
        let bestMap = null;
        let bestCount = 0;
        for (const [mapFile, count] of Object.entries(mapCounts)) {
            if (count > bestCount) {
                bestCount = count;
                bestMap = mapFile;
            }
        }

        // Set pending filter and load the best map
        if (bestMap) {
            pendingCategoryFilter = category;
            loadMap(bestMap);
        }
        return;
    }

    // Highlight the textboxes on the map
    applyCategoryHighlights(currentMapResults);
}

// Apply category highlights to textboxes on the map
function applyCategoryHighlights(results) {
    // Collapse the route panel so user can see the highlighted items
    if (typeof collapseRoutePanel === 'function') {
        collapseRoutePanel();
    }

    // Clear any existing highlights
    highlightedCategoryTextboxes = [];

    // Get textbox indices from results
    for (const loc of results) {
        if (typeof loc.textboxIdx === 'number') {
            highlightedCategoryTextboxes.push(loc.textboxIdx);
        }
    }

    // Zoom to show all highlighted items
    if (highlightedCategoryTextboxes.length > 0) {
        centerOnCategoryItems();
    }

    needsRedraw = true;
}

// Re-apply category filter after map load (called from applyLoadedMapData)
function reapplyCategoryFilterAfterMapLoad() {
    if (pendingCategoryFilter) {
        const category = pendingCategoryFilter;
        pendingCategoryFilter = null;
        // Get results for the new current map
        const allResults = getLocationsByCategory(category);
        const currentMapResults = allResults.filter(loc => loc.mapFile === currentMapFile);
        applyCategoryHighlights(currentMapResults);
    } else if (activeCategoryFilter) {
        // Category was already active, re-apply to new map
        const allResults = getLocationsByCategory(activeCategoryFilter);
        const currentMapResults = allResults.filter(loc => loc.mapFile === currentMapFile);
        applyCategoryHighlights(currentMapResults);
    }
}

// Clear the active category filter
function clearCategoryFilter() {
    activeCategoryFilter = null;
    pendingCategoryFilter = null;
    highlightedCategoryTextboxes = [];
    updateCategoryButtonStates();
    needsRedraw = true;
}

// Update visual state of category buttons
function updateCategoryButtonStates() {
    document.querySelectorAll('.category-btn').forEach(btn => {
        const category = btn.dataset.category;
        if (category === activeCategoryFilter) {
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
        } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        }
    });
}

