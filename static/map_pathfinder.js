// ============================================
// PATHFINDING - A* ALGORITHM
// ============================================
// Note: Uses isWalkableTile() from map_core.js (loaded first)

class AStarPathfinder {
    constructor(mapDataArray) {
        this.map = mapDataArray;
        this.width = mapDataArray[0] ? mapDataArray[0].length : 0;
        this.height = mapDataArray.length;
        // Cost multiplier for AVOID_ZONE tiles (type 6)
        // Higher values make the pathfinder avoid these areas more strongly
        // Value of 3 means: a 10-tile shortcut through avoid zone = 30 cost
        // So hallway paths longer than 30 tiles will use the shortcut
        // This prevents random cut-throughs while allowing logical shortcuts
        this.avoidZoneCostMultiplier = 3;
    }

    // Get the movement cost for a tile
    // Returns higher cost for AVOID_ZONE tiles (type 6) - internal hallways that should be avoided
    getTileCost(x, y) {
        const tileType = this.map[y] && this.map[y][x];
        if (tileType === 6) {  // AVOID_ZONE_TILE
            return this.avoidZoneCostMultiplier;
        }
        return 1;
    }

    // Heuristic: Manhattan distance
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    // Binary search insert to maintain sorted order (by f score)
    // More efficient than sorting the entire array each iteration
    insertSorted(arr, item) {
        let low = 0;
        let high = arr.length;
        while (low < high) {
            const mid = (low + high) >>> 1;
            if (arr[mid].f < item.f) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        arr.splice(low, 0, item);
    }

    // Get valid neighbors (4-directional movement)
    // Prevents doorway-to-doorway movement to avoid paths that "walk along" doorways
    getNeighbors(node) {
        const dirs = [
            { x: 0, y: -1 },  // up
            { x: 1, y: 0 },   // right
            { x: 0, y: 1 },   // down
            { x: -1, y: 0 }   // left
        ];
        const neighbors = [];

        // Check if current tile is a doorway (type 5)
        const currentTile = this.map[node.y] && this.map[node.y][node.x];
        const currentIsDoorway = currentTile === 5;

        for (const dir of dirs) {
            const nx = node.x + dir.x;
            const ny = node.y + dir.y;

            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                // Check if tile is walkable (hallways and doorways)
                if (this.map[ny] && isWalkableTile(this.map[ny][nx])) {
                    // Prevent doorway-to-doorway movement
                    // This ensures paths can only cross ONE doorway tile at a time
                    // and never "walk along" doorways
                    if (currentIsDoorway && this.map[ny][nx] === 5) {
                        continue; // Skip doorway-to-doorway movement
                    }
                    neighbors.push({ x: nx, y: ny });
                }
            }
        }
        return neighbors;
    }

    // Find path using A* algorithm
    findPath(start, end) {
        if (!start || !end) return null;

        // Ensure coordinates are integers
        const startX = Math.floor(start.x);
        const startY = Math.floor(start.y);
        const endX = Math.floor(end.x);
        const endY = Math.floor(end.y);

        // Verify start and end are within bounds and walkable
        if (startX < 0 || startX >= this.width || startY < 0 || startY >= this.height) return null;
        if (endX < 0 || endX >= this.width || endY < 0 || endY >= this.height) return null;
        if (!this.map[startY] || !isWalkableTile(this.map[startY][startX])) return null;
        if (!this.map[endY] || !isWalkableTile(this.map[endY][endX])) return null;

        const openSet = [{ x: startX, y: startY, g: 0, f: this.heuristic({x: startX, y: startY}, {x: endX, y: endY}) }];
        const openSetKeys = new Set([`${startX},${startY}`]); // Track what's in openSet for O(1) lookup
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();

        gScore.set(`${startX},${startY}`, 0);
        const endPos = { x: endX, y: endY };

        while (openSet.length > 0) {
            // Get node with lowest f score (already sorted, just shift)
            const current = openSet.shift();
            const currentKey = `${current.x},${current.y}`;

            // Reached destination
            if (current.x === endX && current.y === endY) {
                return this.reconstructPath(cameFrom, current);
            }

            closedSet.add(currentKey);
            openSetKeys.delete(currentKey);

            for (const neighbor of this.getNeighbors(current)) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;

                if (closedSet.has(neighborKey)) continue;

                // Use variable cost based on whether tile is inside a textbox
                // This makes the pathfinder favor hallways over routing through locations
                const moveCost = this.getTileCost(neighbor.x, neighbor.y);
                const tentativeG = gScore.get(currentKey) + moveCost;

                if (!gScore.has(neighborKey) || tentativeG < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeG);

                    const f = tentativeG + this.heuristic(neighbor, endPos);

                    // Only add if not already in openSet (use Set for O(1) lookup)
                    if (!openSetKeys.has(neighborKey)) {
                        this.insertSorted(openSet, { ...neighbor, g: tentativeG, f });
                        openSetKeys.add(neighborKey);
                    } else {
                        // Node is in openSet with higher cost - need to update it
                        // Remove old entry and re-insert with new cost
                        const oldIdx = openSet.findIndex(n => n.x === neighbor.x && n.y === neighbor.y);
                        if (oldIdx !== -1) {
                            openSet.splice(oldIdx, 1);
                            this.insertSorted(openSet, { ...neighbor, g: tentativeG, f });
                        }
                    }
                }
            }
        }

        return null; // No path found
    }

    // Reconstruct path from cameFrom map
    reconstructPath(cameFrom, current) {
        const path = [{ x: current.x, y: current.y }];
        let key = `${current.x},${current.y}`;

        while (cameFrom.has(key)) {
            const prev = cameFrom.get(key);
            path.unshift({ x: prev.x, y: prev.y });
            key = `${prev.x},${prev.y}`;
        }

        return path;
    }
}

// ============================================
// ROOM INDEX - Searchable Database of Rooms
// ============================================

// Room index storage (rebuilt when map loads)
let roomIndex = {
    byTeacher: {},      // "reeves" -> { grid_x, grid_y, roomNumber, teacher, floor }
    byRoomNumber: {},   // "114" -> { grid_x, grid_y, roomNumber, teacher, floor }
    byName: {},         // "main gym" -> [{ ... }, { ... }] - arrays for multiple locations per name
    byAlias: {},        // "restroom" -> [{ ... }, { ... }] - arrays for multiple locations per alias
    stairs: [],         // [{ name: "Left Stairs", positions: [{x,y},...] }]
    all: [],            // All searchable locations for autocomplete
    byCategory: {       // Category-based filtering
        restrooms: [],
        classrooms: [],
        stairs: [],
        elevators: [],
        exits: []
    }
};

// Helper: Add location to alias index (supports multiple locations per alias)
function addToAliasIndex(key, locationData) {
    const lowerKey = key.toLowerCase();
    if (!roomIndex.byAlias[lowerKey]) {
        roomIndex.byAlias[lowerKey] = [];
    }
    roomIndex.byAlias[lowerKey].push(locationData);
}

// Helper: Add location to name index (supports multiple locations per name)
function addToNameIndex(key, locationData) {
    const lowerKey = key.toLowerCase();
    if (!roomIndex.byName[lowerKey]) {
        roomIndex.byName[lowerKey] = [];
    }
    roomIndex.byName[lowerKey].push(locationData);
}

// Helper: Classify location into categories based on text content and aliases
function classifyLocationCategories(locationData, textContent) {
    const categories = [];
    const firstLine = (textContent.split('\n')[0] || '').toLowerCase();
    const fullTextLower = textContent.toLowerCase();
    const aliases = (locationData.aliases || []).map(a => a.toLowerCase());

    // Restrooms: check aliases and name
    if (aliases.some(a => a.includes('restroom') || a.includes('toilet') || a.includes('bathroom')) ||
        fullTextLower.includes('bathroom') || fullTextLower.includes('restroom')) {
        categories.push('restrooms');
    }

    // Classrooms: any location with a room number
    if (locationData.roomNumber) {
        categories.push('classrooms');
    }

    // Stairs: first line contains "stairs" but not "downstairs"/"upstairs"
    if (firstLine.includes('stairs') &&
        !firstLine.includes('downstairs') &&
        !firstLine.includes('upstairs')) {
        categories.push('stairs');
    }

    // Elevators: first line contains "elevator"
    if (firstLine.includes('elevator')) {
        categories.push('elevators');
    }

    // Exits: check aliases and name for exit/entrance/door
    if (aliases.some(a => a.includes('exit')) ||
        fullTextLower.includes('entrance') ||
        fullTextLower.includes('exit') ||
        (firstLine.includes('door') && !firstLine.includes('indoor'))) {
        categories.push('exits');
    }

    return categories;
}

// Helper: Add location to category indices
// Uses manualCategories if set on locationData, otherwise falls back to auto-detection
function addToCategories(locationData, textContent) {
    const categories = Array.isArray(locationData.manualCategories)
        ? locationData.manualCategories
        : classifyLocationCategories(locationData, textContent);
    for (const cat of categories) {
        if (roomIndex.byCategory[cat]) {
            roomIndex.byCategory[cat].push(locationData);
        }
    }
}

// Helper: Extract building name from map filename
// e.g., "MainCampusDownstairs.json" -> "MainCampus", "CTEUpstairs.json" -> "CTE"
function getBuilding(mapFile) {
    if (!mapFile) return null;
    const basename = mapFile.replace('.json', '');
    // Remove floor suffix to get building name
    return basename.replace(/(Downstairs|Upstairs)$/, '');
}

// Helper: Get descriptive floor label from map file
// For Main Campus: "Downstairs" / "Upstairs"
// For other buildings: "CTE Downstairs", "Academy", etc.
function getFloorDisplayLabel(mapFile, floor) {
    if (!mapFile) {
        return floor === 'upper' ? 'Upstairs' : 'Downstairs';
    }

    // Primary building uses simple labels (configured in MAP_CONFIG)
    if (typeof MAP_CONFIG !== 'undefined' && mapFile.startsWith(MAP_CONFIG.primaryBuilding.name)) {
        return floor === 'upper' ? 'Upstairs' : 'Downstairs';
    }

    // Other buildings: extract building name and add floor
    // e.g., "CTEDownstairs.json" -> "CTE Downstairs"
    let name = mapFile.replace('.json', '');

    // Add spaces between parts (CTE + Downstairs)
    name = name.replace(/([a-z])([A-Z])/g, '$1 $2');
    name = name.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

    return name;
}

// Build searchable index from textboxes
// Called automatically when a map is loaded
function buildRoomIndex(floor) {
    // Clear previous index for this floor (keep other floor's data)
    roomIndex.byTeacher = {};
    roomIndex.byRoomNumber = {};
    roomIndex.byName = {};
    roomIndex.byAlias = {};
    roomIndex.stairs = [];
    roomIndex.all = [];

    textboxes.forEach((textbox, idx) => {
        const text = textbox.text || '';

        // Skip description-only textboxes (first line starts with "|")
        if (isDescriptionOnly(text)) return;
        // Skip marker textboxes - they're visual labels, not searchable destinations
        if (textbox.isMarker) return;

        const lines = text.split('\n');
        const pos = getTextboxPosition(textbox);

        // Check if it's a staircase entry point (e.g., "Left Stairs", "Gym Stairs")
        // Must have "Stairs" as a word in the first line, NOT "Downstairs" or "Upstairs"
        const firstLineLower = lines[0].trim().toLowerCase();
        const isStaircase = firstLineLower.includes('stairs') &&
            !firstLineLower.includes('downstairs') &&
            !firstLineLower.includes('upstairs');

        if (isStaircase) {
            const stairName = lines[0].trim();
            const existing = roomIndex.stairs.find(s => s.name === stairName);
            if (existing) {
                existing.positions.push({ x: pos.x, y: pos.y });
            } else {
                roomIndex.stairs.push({
                    name: stairName,
                    positions: [{ x: pos.x, y: pos.y }],
                    floor: floor
                });
            }
            // Don't return - also add stairs to the general locations index so they're searchable
        }

        // Parse room format: "TeacherName\n#RoomNumber\n[Subtitle]\n[~alias]..."
        // Lines starting with * are non-teacher locations (strip * for display)
        if (lines.length >= 2 && lines[1].startsWith('#')) {
            const firstLine = lines[0].trim();
            const isNonTeacher = firstLine.startsWith('*');
            const teacher = isNonTeacher ? firstLine.substring(1).trim() : firstLine;
            const roomNumber = lines[1].replace('#', '').trim();

            // Extract subtitles and aliases from lines after room number
            const subtitles = [];
            const aliases = [];
            for (let i = 2; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                if (line.startsWith('~')) {
                    aliases.push(line.substring(1).trim());
                } else if (!line.startsWith('##')) {
                    subtitles.push(line);
                }
            }

            const roomData = {
                textboxIdx: idx,
                grid_x: pos.x,
                grid_y: pos.y,
                teacher: teacher,
                roomNumber: roomNumber,
                subtitles: subtitles,
                aliases: aliases,
                floor: floor,
                label: `${teacher} (#${roomNumber})`,
                type: isNonTeacher ? 'location' : 'classroom'
            };

            // Index by teacher name (lowercase for case-insensitive search)
            roomIndex.byTeacher[teacher.toLowerCase()] = roomData;

            // Index by room number
            roomIndex.byRoomNumber[roomNumber] = roomData;

            // Index subtitles and aliases for search
            for (const subtitle of subtitles) {
                addToAliasIndex(subtitle, roomData);
            }
            for (const alias of aliases) {
                addToAliasIndex(alias, roomData);
            }

            // Add to "all" list for autocomplete
            roomIndex.all.push(roomData);
            return;
        }

        // General locations (Gym, Library, Bathroom, Vending, etc.)
        // These are textboxes that don't match the teacher/room format
        // Strip * prefix if present (non-teacher marker)
        let locationName = lines[0].trim();
        if (locationName.startsWith('*')) {
            locationName = locationName.substring(1).trim();
        }
        if (!locationName) return;

        // Handle multi-line names using ^ continuation marker
        // Lines ending with ^ are joined to form the full name
        let subtitleStartIndex = 1;
        while (locationName.endsWith('^')) {
            // Remove the ^ and add next line if available
            locationName = locationName.slice(0, -1).trim();
            if (subtitleStartIndex < lines.length) {
                const nextLine = lines[subtitleStartIndex].trim();
                if (nextLine && !nextLine.startsWith('~') && !nextLine.startsWith('##')) {
                    locationName += ' ' + nextLine;
                    subtitleStartIndex++;
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        // Remove trailing ^ if the last continuation line also had one
        if (locationName.endsWith('^')) {
            locationName = locationName.slice(0, -1).trim();
        }

        // Extract subtitles and aliases (starting after any continuation lines)
        const subtitles = [];
        const aliases = [];
        for (let i = subtitleStartIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            if (line.startsWith('~')) {
                aliases.push(line.substring(1).trim());
            } else if (!line.startsWith('##') && line.length > 2) {
                subtitles.push(line);
            }
        }

        // Create label
        let label = locationName;
        if (subtitles.length > 0) {
            label = `${locationName} ${subtitles[0]}`;
        }

        const locationData = {
            textboxIdx: idx,
            grid_x: pos.x,
            grid_y: pos.y,
            name: locationName,
            subtitles: subtitles,
            aliases: aliases,
            floor: floor,
            label: label,
            type: 'location'
        };

        // Index by name (use array to support multiple locations with same name)
        addToNameIndex(locationName, locationData);

        // Index subtitles and aliases
        for (const subtitle of subtitles) {
            addToAliasIndex(subtitle, locationData);
        }
        for (const alias of aliases) {
            addToAliasIndex(alias, locationData);
        }

        roomIndex.all.push(locationData);
    });
}

// Build a combined room index from ALL cached maps
// This allows users to search for rooms on any map regardless of current view
function buildCombinedRoomIndex() {
    // Clear the index
    roomIndex.byTeacher = {};
    roomIndex.byRoomNumber = {};
    roomIndex.byName = {};  // For general locations like "Main Gym", "Library", "Vending"
    roomIndex.byAlias = {}; // For aliases and subtitles
    roomIndex.stairs = [];
    roomIndex.all = [];
    roomIndex.byCategory = {
        restrooms: [],
        classrooms: [],
        stairs: [],
        elevators: [],
        exits: []
    };

    // Process each cached map (dynamically from mapCache)
    // mapCache is populated by initializeAvailableMaps() which loads all non-blank maps
    for (const filename of Object.keys(mapCache)) {
        const cached = mapCache[filename];
        if (!cached || !cached.textboxes) continue;

        // Determine floor based on filename (lower if contains 'Downstairs', upper otherwise)
        const floor = getFloorFromFilename(filename);

        cached.textboxes.forEach((textbox, idx) => {
            const text = textbox.text || '';
            if (!text.trim()) return; // Skip empty textboxes

            // Skip description-only textboxes (first line starts with "|")
            if (isDescriptionOnly(text)) return;

            const lines = text.split('\n');
            const pos = getTextboxPosition(textbox);
            const dimensions = getTextboxDimensions(textbox);

            // Check if it's a staircase entry point (e.g., "Left Stairs", "Gym Stairs")
            // Must have "Stairs" as a word in the first line, NOT "Downstairs" or "Upstairs"
            const firstLineLower = lines[0].trim().toLowerCase();
            const isStaircase = firstLineLower.includes('stairs') &&
                !firstLineLower.includes('downstairs') &&
                !firstLineLower.includes('upstairs');

            if (isStaircase) {
                const stairName = lines[0].trim();
                const existing = roomIndex.stairs.find(s => s.name === stairName && s.floor === floor);
                if (existing) {
                    existing.positions.push({ x: pos.x, y: pos.y });
                } else {
                    roomIndex.stairs.push({
                        name: stairName,
                        positions: [{ x: pos.x, y: pos.y }],
                        floor: floor
                    });
                }
                // Don't return - also add stairs to the general locations index so they're searchable
            }

            // Parse room format: "TeacherName\n#RoomNumber\n[Subtitle]\n[~alias]..."
            // Lines starting with * are non-teacher locations (strip * for display)
            if (lines.length >= 2 && lines[1].startsWith('#')) {
                const firstLine = lines[0].trim();
                const isNonTeacher = firstLine.startsWith('*');
                const teacher = isNonTeacher ? firstLine.substring(1).trim() : firstLine;
                const roomNumber = lines[1].replace('#', '').trim();

                // Extract subtitles and aliases from lines after room number
                // Subtitles: visible text (like "The Pit")
                // Aliases: lines starting with ~ (hidden search terms like "~band room")
                const subtitles = [];
                const aliases = [];
                for (let i = 2; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    if (line.startsWith('~')) {
                        // Hidden alias - strip the ~ prefix
                        aliases.push(line.substring(1).trim());
                    } else if (!line.startsWith('##')) {
                        // Visible subtitle (also searchable)
                        subtitles.push(line);
                    }
                }

                const roomData = {
                    textboxIdx: idx,
                    grid_x: pos.x,
                    grid_y: pos.y,
                    grid_width: dimensions.width,
                    grid_height: dimensions.height,
                    teacher: teacher,
                    roomNumber: roomNumber,
                    subtitles: subtitles,  // Visible subtitles like "The Pit"
                    aliases: aliases,       // Hidden aliases like "band room"
                    floor: floor,
                    mapFile: filename,
                    label: `${teacher} (#${roomNumber})`,
                    type: isNonTeacher ? 'location' : 'classroom',
                    description: textbox.description || '',  // Info panel description
                    manualCategories: textbox.manualCategories || null
                };

                // Use floor-prefixed keys to avoid collisions between floors
                const teacherKey = `${floor}:${teacher.toLowerCase()}`;
                const roomKey = `${floor}:${roomNumber}`;

                roomIndex.byTeacher[teacherKey] = roomData;
                roomIndex.byRoomNumber[roomKey] = roomData;

                // Also index without floor prefix for simple lookups
                // (last one wins if same teacher/room on both floors)
                roomIndex.byTeacher[teacher.toLowerCase()] = roomData;
                roomIndex.byRoomNumber[roomNumber] = roomData;

                // Index subtitles and aliases for search
                for (const subtitle of subtitles) {
                    addToAliasIndex(`${floor}:${subtitle}`, roomData);
                    addToAliasIndex(subtitle, roomData);
                }
                for (const alias of aliases) {
                    addToAliasIndex(`${floor}:${alias}`, roomData);
                    addToAliasIndex(alias, roomData);
                }

                roomIndex.all.push(roomData);
                addToCategories(roomData, text);
                return;
            }

            // General locations (Gym, Library, Bathroom, Vending, etc.)
            // These are textboxes that don't match the teacher/room format
            // Strip * prefix if present (non-teacher marker) - keep track of it for type
            let rawLocationName = lines[0].trim();
            if (!rawLocationName) return;
            const isNonTeacherLocation = rawLocationName.startsWith('*');
            let locationName = isNonTeacherLocation ? rawLocationName.substring(1).trim() : rawLocationName;

            // Handle multi-line names using ^ continuation marker
            // Lines ending with ^ are joined to form the full name
            let subtitleStartIndex = 1;
            while (locationName.endsWith('^')) {
                // Remove the ^ and add next line if available
                locationName = locationName.slice(0, -1).trim();
                if (subtitleStartIndex < lines.length) {
                    const nextLine = lines[subtitleStartIndex].trim();
                    if (nextLine && !nextLine.startsWith('~') && !nextLine.startsWith('##')) {
                        locationName += ' ' + nextLine;
                        subtitleStartIndex++;
                    } else {
                        break;
                    }
                } else {
                    break;
                }
            }
            // Remove trailing ^ if the last continuation line also had one
            if (locationName.endsWith('^')) {
                locationName = locationName.slice(0, -1).trim();
            }

            // Extract subtitles and aliases (starting after any continuation lines)
            // Subtitles: visible text (like "(Upstairs)")
            // Aliases: lines starting with ~ (hidden search terms like "~Restroom")
            const subtitles = [];
            const aliases = [];
            for (let i = subtitleStartIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                if (line.startsWith('~')) {
                    // Hidden alias - strip the ~ prefix
                    aliases.push(line.substring(1).trim());
                } else if (!line.startsWith('##')) {
                    // Visible subtitle (also searchable) - skip emojis (single character lines)
                    if (line.length > 2) {
                        subtitles.push(line);
                    }
                }
            }

            // Create a clean label - use first line, add first subtitle if exists
            let label = locationName;
            if (subtitles.length > 0) {
                label = `${locationName} ${subtitles[0]}`;
            }

            // Extract room number from names starting with # (e.g., "#103 CTE" → "103")
            const roomNumMatch = locationName.match(/^#(\d+)/);
            const roomNumber = roomNumMatch ? roomNumMatch[1] : null;

            const locationData = {
                textboxIdx: idx,
                grid_x: pos.x,
                grid_y: pos.y,
                grid_width: dimensions.width,
                grid_height: dimensions.height,
                name: locationName,
                roomNumber: roomNumber,
                subtitles: subtitles,
                aliases: aliases,
                floor: floor,
                mapFile: filename,
                label: label,
                // Names with * prefix are non-teacher locations, names without are teacher-like
                // e.g., "Hips" (no asterisk) should be underlined, "*Library" should not
                type: isNonTeacherLocation ? 'location' : 'classroom',
                description: textbox.description || '',  // Info panel description
                manualCategories: textbox.manualCategories || null
            };

            // Index by name (use arrays to support multiple locations with same name)
            addToNameIndex(`${floor}:${locationName}`, locationData);
            addToNameIndex(locationName, locationData);

            // Also add full label for multi-word searches
            if (label !== locationName) {
                addToNameIndex(`${floor}:${label}`, locationData);
                addToNameIndex(label, locationData);
            }

            // Index subtitles and aliases for search
            for (const subtitle of subtitles) {
                addToAliasIndex(`${floor}:${subtitle}`, locationData);
                addToAliasIndex(subtitle, locationData);
            }
            for (const alias of aliases) {
                addToAliasIndex(`${floor}:${alias}`, locationData);
                addToAliasIndex(alias, locationData);
            }

            roomIndex.all.push(locationData);
            addToCategories(locationData, text);
        });
    }
}

// Get all locations in a specific category, sorted alphabetically
function getLocationsByCategory(category) {
    const locations = roomIndex.byCategory[category] || [];
    return [...locations].sort((a, b) =>
        (a.label || a.name || '').localeCompare(b.label || b.name || '')
    );
}

// Strip punctuation for fuzzy matching (e.g., "blair m" matches "Blair, M")
// Removes commas, periods, colons, semicolons, and extra spaces
function stripPunctuation(str) {
    return str.replace(/[,.:;'"!?()]/g, '').replace(/\s+/g, ' ').trim();
}

// Calculate relevance score for autocomplete ranking
// Higher score = more relevant match
// Scoring hierarchy: word-boundary > mid-word, primary > subtitle, first word > later word
function calculateMatchScore(query, data) {
    // Match type is the dominant factor - word boundary matches always beat mid-word
    const MATCH_TYPE = { WORD_BOUNDARY: 1000000, MID_WORD: 100000 };
    // Field priority - primary name (line 0) beats subtitles, aliases are close to primary (alternative names)
    const FIELD_BONUS = { PRIMARY: 80000, ALIAS: 70000, ROOM_NUMBER: 60000, SUBTITLE: 40000 };
    // Position within field - first word beats later words
    const POSITION_BONUS = { EXACT: 15000, FIRST_WORD: 10000, LATER_WORD: 5000 };

    let bestScore = 0;

    function scoreField(fieldValue, fieldBonus) {
        if (!fieldValue) return 0;
        // Strip punctuation for fuzzy matching (e.g., "blair m" matches "Blair, M")
        const lower = stripPunctuation(fieldValue.toLowerCase());
        if (!lower.includes(query)) return 0;

        let matchType = 0, positionBonus = 0;

        if (lower === query) {
            // Exact match - entire string equals query
            matchType = MATCH_TYPE.WORD_BOUNDARY;
            positionBonus = POSITION_BONUS.EXACT;
        } else if (lower.startsWith(query)) {
            // Query matches at the start of the string (first word)
            matchType = MATCH_TYPE.WORD_BOUNDARY;
            positionBonus = POSITION_BONUS.FIRST_WORD;
        } else {
            // Check for word-start match in later words
            const words = lower.split(/\s+/);
            for (let i = 1; i < words.length; i++) {
                if (words[i].startsWith(query)) {
                    matchType = MATCH_TYPE.WORD_BOUNDARY;
                    positionBonus = POSITION_BONUS.LATER_WORD;
                    break;
                }
            }
            // If no word-start match found, it's a mid-word match
            if (matchType === 0) {
                matchType = MATCH_TYPE.MID_WORD;
            }
        }

        return matchType + fieldBonus + positionBonus;
    }

    // Score each field type and keep the best score
    const primary = data.teacher || data.name || '';
    bestScore = Math.max(bestScore, scoreField(primary, FIELD_BONUS.PRIMARY));

    if (data.roomNumber) {
        bestScore = Math.max(bestScore, scoreField(data.roomNumber, FIELD_BONUS.ROOM_NUMBER));
    }

    for (const sub of (data.subtitles || [])) {
        bestScore = Math.max(bestScore, scoreField(sub, FIELD_BONUS.SUBTITLE));
    }

    for (const alias of (data.aliases || [])) {
        bestScore = Math.max(bestScore, scoreField(alias, FIELD_BONUS.ALIAS));
    }

    return bestScore;
}

// Search all locations by query (teacher name, room number, or location name)
// Returns array of matching locations (max 8 results)
function searchRooms(query) {
    if (!query || query.trim().length < 1) return [];

    // Strip punctuation for fuzzy matching (e.g., "blair m" matches "Blair, M")
    query = stripPunctuation(query.toLowerCase().trim());
    const results = [];
    const seen = new Set(); // Prevent duplicates using unique key

    // Helper to create unique key for deduplication
    const getKey = (data) => `${data.floor}:${data.grid_x}:${data.grid_y}`;

    // Search by teacher name (partial match)
    for (const [teacher, data] of Object.entries(roomIndex.byTeacher)) {
        const key = getKey(data);
        if (stripPunctuation(teacher).includes(query) && !seen.has(key)) {
            results.push(data);
            seen.add(key);
        }
    }

    // Search by room number (partial match)
    for (const [roomNum, data] of Object.entries(roomIndex.byRoomNumber)) {
        const key = getKey(data);
        if (stripPunctuation(roomNum).includes(query) && !seen.has(key)) {
            results.push(data);
            seen.add(key);
        }
    }

    // Search by location name (partial match) - for gyms, bathrooms, etc.
    // byName stores arrays since multiple locations can share the same name
    for (const [name, dataArray] of Object.entries(roomIndex.byName || {})) {
        if (stripPunctuation(name).includes(query)) {
            for (const data of dataArray) {
                const key = getKey(data);
                if (!seen.has(key)) {
                    results.push(data);
                    seen.add(key);
                }
            }
        }
    }

    // Search by aliases and subtitles (partial match)
    // This includes visible subtitles like "The Pit" and hidden aliases like "~band room"
    // byAlias stores arrays since multiple locations can share the same alias
    for (const [alias, dataArray] of Object.entries(roomIndex.byAlias || {})) {
        if (stripPunctuation(alias).includes(query)) {
            for (const data of dataArray) {
                const key = getKey(data);
                if (!seen.has(key)) {
                    results.push(data);
                    seen.add(key);
                }
            }
        }
    }

    // Sort by relevance score (higher = more relevant)
    results.sort((a, b) => {
        const scoreA = calculateMatchScore(query, a);
        const scoreB = calculateMatchScore(query, b);

        // Higher score first
        if (scoreB !== scoreA) {
            return scoreB - scoreA;
        }

        // Tiebreaker: alphabetical by label
        return (a.label || '').localeCompare(b.label || '');
    });

    return results.slice(0, MAX_SEARCH_RESULTS);
}

// ============================================
// ROUTE CALCULATION - Single & Cross-Floor
// ============================================

// Helper: Find nearest walkable tile on a specific floor's cached map
function findNearestWalkableTileOnFloor(roomX, roomY, floorMapData, searchRadius = 30) {
    if (!floorMapData || !floorMapData.length) return null;

    const height = floorMapData.length;
    const width = floorMapData[0] ? floorMapData[0].length : 0;

    let nearest = null;
    let minDist = Infinity;

    for (let r = 1; r <= searchRadius; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;

                const x = Math.floor(roomX) + dx;
                const y = Math.floor(roomY) + dy;

                if (x >= 0 && x < width && y >= 0 && y < height) {
                    const tile = floorMapData[y][x];
                    if (tile === 3 || tile === 5) { // Walkable tiles
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < minDist) {
                            minDist = dist;
                            nearest = { x, y };
                        }
                    }
                }
            }
        }
        if (nearest) break;
    }
    return nearest;
}

// Helper: Find ALL room entrances on a specific floor's cached map
// Returns array of all hallway tiles adjacent to doors for this room
function findAllRoomEntrancesOnFloor(textbox, floorMapData) {
    if (!textbox || !floorMapData) return [];

    const pos = getTextboxPosition(textbox);
    const dimensions = getTextboxDimensions(textbox);
    const gridX = Math.floor(pos.x);
    const gridY = Math.floor(pos.y);
    const gridWidth = Math.floor(dimensions.width);
    const gridHeight = Math.floor(dimensions.height);

    const margin = 2;
    const startX = Math.max(0, gridX - margin);
    const startY = Math.max(0, gridY - margin);
    const endX = gridX + gridWidth + margin;
    const endY = gridY + gridHeight + margin;

    let entrances = [];
    const height = floorMapData.length;
    const width = floorMapData[0] ? floorMapData[0].length : 0;

    for (let y = startY; y <= endY && y < height; y++) {
        for (let x = startX; x <= endX && x < width; x++) {
            if (!floorMapData[y]) continue;
            const tile = floorMapData[y][x];

            if (tile === 5) { // Door tile
                // Verify door is actually on the room's edge (not a neighbor's door within margin)
                // Door should be within 1 tile of the room's actual bounds
                const doorNearRoom = (
                    x >= gridX - 1 && x <= gridX + gridWidth &&
                    y >= gridY - 1 && y <= gridY + gridHeight
                );
                if (!doorNearRoom) continue;

                // Check if adjacent to hallway or avoid zone (for rooms inside larger areas like Library)
                const dirs = [
                    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
                    { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
                ];

                for (const dir of dirs) {
                    const adjX = x + dir.dx;
                    const adjY = y + dir.dy;
                    if (adjY >= 0 && adjY < height && adjX >= 0 && adjX < width) {
                        const adjTile = floorMapData[adjY] && floorMapData[adjY][adjX];
                        // Accept hallway (3) or avoid zone (6) as entrance points
                        // This allows finding entrances for rooms inside larger areas
                        if (adjTile === 3 || adjTile === 6) {
                            // Avoid duplicates (same tile)
                            if (!entrances.some(e => e.x === adjX && e.y === adjY)) {
                                entrances.push({ x: adjX, y: adjY });
                            }
                        }
                    }
                }
            }
        }
    }

    if (entrances.length === 0) {
        // Fallback: find nearest walkable tile to room center
        const centerX = gridX + gridWidth / 2;
        const centerY = gridY + gridHeight / 2;
        const fallback = findNearestWalkableTileOnFloor(centerX, centerY, floorMapData);
        if (fallback) {
            return [fallback];
        }
        // Last resort fallback
        return [{ x: Math.floor(centerX), y: Math.floor(gridY + gridHeight) }];
    }

    return entrances;
}

// Helper: Find single room entrance (for backwards compatibility)
// Returns the entrance closest to room center
function findRoomEntranceOnFloor(textbox, floorMapData) {
    const entrances = findAllRoomEntrancesOnFloor(textbox, floorMapData);
    if (entrances.length === 0) return null;
    if (entrances.length === 1) return entrances[0];

    const pos = getTextboxPosition(textbox);
    const dimensions = getTextboxDimensions(textbox);
    const roomCenterX = pos.x + dimensions.width / 2;
    const roomCenterY = pos.y + dimensions.height / 2;

    entrances.sort((a, b) => {
        const distA = Math.abs(a.x - roomCenterX) + Math.abs(a.y - roomCenterY);
        const distB = Math.abs(b.x - roomCenterX) + Math.abs(b.y - roomCenterY);
        return distA - distB;
    });

    return entrances[0];
}

// Floor connections (stairs and elevator) between floors
// Built dynamically from cached maps instead of hardcoding
// This scans all cached maps for stair/elevator textboxes (^ prefix) and builds connections
let _cachedFloorConnections = null;
let _floorConnectionsCacheKey = null;

function buildFloorConnections() {
    // Check if mapCache exists and has data
    if (typeof mapCache === 'undefined' || Object.keys(mapCache).length === 0) {
        return {};
    }

    // Create a cache key based on which maps are loaded
    const cacheKey = Object.keys(mapCache).filter(k => mapCache[k]).sort().join(',');
    if (_floorConnectionsCacheKey === cacheKey && _cachedFloorConnections) {
        return _cachedFloorConnections;
    }

    const connections = {};

    // Helper: Check if textbox is a staircase (same logic as isStaircaseTextbox in map_interactions.js)
    function isStairTextbox(textbox) {
        if (!textbox || !textbox.text) return false;
        const firstLine = textbox.text.split('\n')[0].trim().toLowerCase();
        return firstLine.includes('stairs') &&
               !firstLine.includes('downstairs') &&
               !firstLine.includes('upstairs');
    }

    // Helper: Check if textbox is an elevator (same logic as isElevatorTextbox in map_interactions.js)
    function isElevatorTextbox(textbox) {
        if (!textbox || !textbox.text) return false;
        const firstLine = textbox.text.split('\n')[0].trim().toLowerCase();
        return firstLine.includes('elevator');
    }

    // Helper: Get connection name from textbox (first line, without any identifier suffix)
    function getConnectionName(textbox) {
        if (!textbox || !textbox.text) return null;
        // Get first line and remove any #identifier suffix
        return textbox.text.split('\n')[0].split('#')[0].trim();
    }

    // Scan each cached map for stair/elevator textboxes
    for (const [filename, cacheEntry] of Object.entries(mapCache)) {
        if (!cacheEntry || !cacheEntry.textboxes) continue;

        // Determine if this is a lower or upper floor map
        const filenameLower = filename.toLowerCase();
        const isLower = filenameLower.includes('downstairs') ||
                        filenameLower.includes('lower') ||
                        filenameLower.includes('ground');
        const isUpper = filenameLower.includes('upstairs') ||
                        filenameLower.includes('upper') ||
                        filenameLower.includes('second');

        if (!isLower && !isUpper) continue; // Skip single-floor maps

        const floorType = isLower ? 'lower' : 'upper';

        // Find stair/elevator textboxes
        for (const textbox of cacheEntry.textboxes) {
            const isStairs = isStairTextbox(textbox);
            const isElevator = isElevatorTextbox(textbox);

            if (!isStairs && !isElevator) continue;

            const connectionName = getConnectionName(textbox);
            if (!connectionName) continue;

            // Initialize connection entry if needed
            if (!connections[connectionName]) {
                connections[connectionName] = { lower: null, upper: null, isStairs: isStairs };
            }

            // Set the map file for this floor
            connections[connectionName][floorType] = filename;
        }
    }

    // Remove incomplete connections (need both floors)
    for (const [name, conn] of Object.entries(connections)) {
        if (!conn.lower || !conn.upper) {
            delete connections[name];
        }
    }

    _cachedFloorConnections = connections;
    _floorConnectionsCacheKey = cacheKey;
    return connections;
}

// Get active floor connections based on elevator access preference
// If elevator access is required, only use the elevator (no stairs)
// Otherwise, use only stairs (elevator is for accessibility)
function getActiveFloorConnections() {
    // Build connections dynamically from cached maps
    const allConnections = buildFloorConnections();

    if (typeof elevatorAccessRequired !== 'undefined' && elevatorAccessRequired) {
        // Elevator access required - only use elevators, disable stairs
        const elevatorsOnly = {};
        for (const [name, data] of Object.entries(allConnections)) {
            if (!data.isStairs) {
                elevatorsOnly[name] = data;
            }
        }
        return elevatorsOnly;
    } else {
        // Normal access - use stairs only
        const stairsOnly = {};
        for (const [name, data] of Object.entries(allConnections)) {
            if (data.isStairs) {
                stairsOnly[name] = data;
            }
        }
        return stairsOnly;
    }
}

// Helper: Pair stair entrances between floors for multi-entrance staircases like Gym Stairs
// Returns array of paired entrances: [{start: {x,y,identifier}, end: {x,y,identifier}}, ...]
// Pairs are matched by identifier first (e.g., #south, #north), then by position as fallback
function pairStairEntrances(startEntrances, endEntrances) {
    const pairs = [];
    const usedEndIndices = new Set();

    // First pass: match by identifier (e.g., #south matches #south)
    for (const startEnt of startEntrances) {
        if (startEnt.identifier) {
            const matchIndex = endEntrances.findIndex((endEnt, idx) =>
                !usedEndIndices.has(idx) && endEnt.identifier === startEnt.identifier
            );
            if (matchIndex !== -1) {
                pairs.push({
                    start: startEnt,
                    end: endEntrances[matchIndex]
                });
                usedEndIndices.add(matchIndex);
            }
        }
    }

    // Second pass: for entrances without identifiers, fall back to position matching
    const unmatchedStart = startEntrances.filter(e => !pairs.some(p => p.start === e));
    const unmatchedEnd = endEntrances.filter((e, idx) => !usedEndIndices.has(idx));

    if (unmatchedStart.length > 0 && unmatchedEnd.length > 0) {
        // Sort both arrays by y, then x to establish consistent ordering
        const sortByPos = (a, b) => {
            if (a.y !== b.y) return a.y - b.y;
            return a.x - b.x;
        };

        const sortedStart = [...unmatchedStart].sort(sortByPos);
        const sortedEnd = [...unmatchedEnd].sort(sortByPos);

        // Pair by index
        const pairCount = Math.min(sortedStart.length, sortedEnd.length);
        for (let i = 0; i < pairCount; i++) {
            pairs.push({
                start: sortedStart[i],
                end: sortedEnd[i]
            });
        }
    }

    return pairs;
}

// Helper: Extract internal identifier from textbox (lines starting with ##)
// Returns the identifier without the ## prefix, or null if none found
// Note: Single # is reserved for room numbers (e.g., #101)
function extractTextboxIdentifier(textbox) {
    const text = textbox.text || '';
    const lines = text.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('##')) {
            return trimmed.substring(2).toLowerCase(); // Remove ## and lowercase
        }
    }
    return null;
}

// Helper: Find ALL floor connection entrances on a specific floor for a given connection name
// Works for both stairs and elevator
// Returns an array of entrance objects: { x, y, identifier }
// The identifier is used to match entrances across floors
// mapFile: The actual map filename to search (e.g., 'CTEDownstairs.json')
function findAllStairEntrancesOnFloor(connectionName, mapFile, floorMapData) {
    const cached = mapCache[mapFile];

    if (!cached || !cached.textboxes) {
        return [];
    }

    // Determine if we're looking for stairs or elevator
    const isElevator = connectionName.toLowerCase().includes('elevator');

    let connectionTextboxes;
    if (isElevator) {
        // Find elevator textbox
        connectionTextboxes = cached.textboxes.filter(textbox => {
            const text = (textbox.text || '').toLowerCase();
            return text.includes('elevator');
        });
    } else {
        // Find stair textboxes matching this name
        // Use word boundary regex to match "Stairs" as standalone word
        // This avoids matching "Upstairs" or "Downstairs" in bathroom subtitles
        const searchName = connectionName.replace(' Stairs', '').toLowerCase();
        const stairsWordRegex = /\bstairs\b/i;  // Matches "Stairs" but not "Upstairs"/"Downstairs"
        connectionTextboxes = cached.textboxes.filter(textbox => {
            const text = (textbox.text || '').toLowerCase();
            return stairsWordRegex.test(text) && text.includes(searchName);
        });
    }

    if (connectionTextboxes.length === 0) {
        return [];
    }

    // Get entrance for each textbox, including identifier
    const entrances = [];
    for (const stairTextbox of connectionTextboxes) {
        // Extract internal identifier (e.g., #south, #north, #sw, #ne)
        const identifier = extractTextboxIdentifier(stairTextbox);

        // Use findRoomEntranceOnFloor to get the hallway-side entrance
        const entrance = findRoomEntranceOnFloor(stairTextbox, floorMapData);

        if (entrance) {
            entrances.push({ ...entrance, identifier });
        } else {
            // Fallback: find nearest walkable tile to textbox center
            const centerX = (stairTextbox.grid_x || stairTextbox.x) + ((stairTextbox.grid_width || stairTextbox.width) / 2);
            const centerY = (stairTextbox.grid_y || stairTextbox.y) + ((stairTextbox.grid_height || stairTextbox.height) / 2);
            const fallback = findNearestWalkableTileOnFloor(centerX, centerY, floorMapData);
            if (fallback) entrances.push({ ...fallback, identifier });
        }
    }

    return entrances;
}

// Calculate route between two rooms (may span floors)
// Now supports full cross-floor pathfinding using cached map data
function calculateRoute(startRoom, endRoom) {
    const startFloor = startRoom.floor;
    const endFloor = endRoom.floor;

    // Get the actual map file from the room data (not hardcoded Main Campus)
    const startMapFile = startRoom.mapFile;
    const endMapFile = endRoom.mapFile;

    // Get map data from cache (or current mapData if it's the current floor)
    const startMapData = mapCache[startMapFile]?.map || (currentMapFile === startMapFile ? mapData.data : null);
    const endMapData = mapCache[endMapFile]?.map || (currentMapFile === endMapFile ? mapData.data : null);

    if (!startMapData || !endMapData) {
        console.error('Map data not available for one or both floors');
        return null;
    }

    // Get textbox data from cache or current textboxes
    const startTextboxes = mapCache[startMapFile]?.textboxes || (currentMapFile === startMapFile ? textboxes : null);
    const endTextboxes = mapCache[endMapFile]?.textboxes || (currentMapFile === endMapFile ? textboxes : null);

    // Get the textbox for start and end rooms
    const startTextbox = startTextboxes ? startTextboxes[startRoom.textboxIdx] : null;
    const endTextbox = endTextboxes ? endTextboxes[endRoom.textboxIdx] : null;

    // If we can't find the textbox by index, use the room data directly
    const startTbData = startTextbox || {
        grid_x: startRoom.grid_x,
        grid_y: startRoom.grid_y,
        grid_width: startRoom.grid_width || 4,
        grid_height: startRoom.grid_height || 3
    };
    const endTbData = endTextbox || {
        grid_x: endRoom.grid_x,
        grid_y: endRoom.grid_y,
        grid_width: endRoom.grid_width || 4,
        grid_height: endRoom.grid_height || 3
    };

    // Find ALL entrance points for both rooms
    const startEntrances = findAllRoomEntrancesOnFloor(startTbData, startMapData);
    const endEntrances = findAllRoomEntrancesOnFloor(endTbData, endMapData);

    if (startEntrances.length === 0 || endEntrances.length === 0) {
        return null;
    }

    // Same floor - try all entrance combinations and pick shortest path
    if (startFloor === endFloor) {
        // Find path using A* with AVOID_ZONE tile penalties (type 6)
        // The pathfinder will prefer regular hallways over avoid zones
        const pathfinder = new AStarPathfinder(startMapData);

        let bestPath = null;
        let bestStartEntrance = null;
        let bestEndEntrance = null;

        for (const startEnt of startEntrances) {
            for (const endEnt of endEntrances) {
                const path = pathfinder.findPath(startEnt, endEnt);
                if (path && (!bestPath || path.length < bestPath.length)) {
                    bestPath = path;
                    bestStartEntrance = startEnt;
                    bestEndEntrance = endEnt;
                }
            }
        }

        if (bestPath) {
            return {
                active: true,
                startRoom: { ...startRoom, x: bestStartEntrance.x, y: bestStartEntrance.y },
                endRoom: { ...endRoom, x: bestEndEntrance.x, y: bestEndEntrance.y },
                segments: [{ floor: startFloor, path: bestPath, mapFile: startMapFile }],
                requiresFloorChange: false,
                stairsUsed: null,
                totalDistance: bestPath.length
            };
        }

        // ===============================================
        // DISCONNECTED SAME-FLOOR ROUTING
        // No direct path found - try routing through the OTHER floor
        // (e.g., upstairs gym area to upstairs main area via downstairs)
        // ===============================================
        const otherFloor = startFloor === 'lower' ? 'upper' : 'lower';
        const otherMapFile = getPairedFloorMap(startMapFile);

        // If no paired floor exists, can't route through other floor
        if (!otherMapFile) {
            return null;
        }

        const otherMapData = mapCache[otherMapFile]?.map || (currentMapFile === otherMapFile ? mapData.data : null);

        if (!otherMapData) {
            return null;
        }

        // Helper: Get stair entrance closest to a reference point
        const getClosestStairEntrance = (entrances, refPoint) => {
            if (entrances.length === 0) return null;
            if (entrances.length === 1) return entrances[0];
            return entrances.reduce((best, curr) => {
                const bestDist = Math.abs(best.x - refPoint.x) + Math.abs(best.y - refPoint.y);
                const currDist = Math.abs(curr.x - refPoint.x) + Math.abs(curr.y - refPoint.y);
                if (currDist < bestDist) return curr;
                return best;
            });
        };

        // Helper: Find matching entrance by identifier, or fall back to closest position
        const getMatchingEntrance = (entrances, referenceEntrance) => {
            if (entrances.length === 0) return null;
            if (entrances.length === 1) return entrances[0];
            // If reference has identifier, find matching identifier first
            if (referenceEntrance && referenceEntrance.identifier) {
                const match = entrances.find(e => e.identifier === referenceEntrance.identifier);
                if (match) return match;
            }
            // Fall back to closest position
            return getClosestStairEntrance(entrances, referenceEntrance);
        };

        // Helper: For Gym Stairs, prefer bottom-left entrance (closest to other stairs)
        const getGymStairEntrance = (entrances) => {
            if (entrances.length === 0) return null;
            if (entrances.length === 1) return entrances[0];
            return entrances.reduce((best, curr) => {
                if (curr.y > best.y || (curr.y === best.y && curr.x < best.x)) return curr;
                return best;
            });
        };

        let bestDisconnectedRoute = null;
        let bestDisconnectedDistance = Infinity;

        // Create pathfinder for the other floor
        const otherFloorPathfinder = new AStarPathfinder(otherMapData);

        // Helper: Get entrance closest to a reference point (for optimizing disconnected routes)
        const getClosestEntrance = (entrances, refPoint) => {
            if (entrances.length === 0) return null;
            if (entrances.length === 1) return entrances[0];
            return entrances.reduce((best, curr) => {
                const bestDist = Math.abs(best.x - refPoint.x) + Math.abs(best.y - refPoint.y);
                const currDist = Math.abs(curr.x - refPoint.x) + Math.abs(curr.y - refPoint.y);
                return currDist < bestDist ? curr : best;
            });
        };

        // Try combinations of TWO DIFFERENT floor connections (stairs or elevator)
        const activeConnections = getActiveFloorConnections();

        // Filter connections to only those matching this building
        const currentBuilding = getBuilding(startMapFile);
        const buildingConnections = Object.entries(activeConnections).filter(([name, conn]) =>
            getBuilding(conn.lower) === currentBuilding
        );

        for (const [stair1Name, stair1Conn] of buildingConnections) {
            for (const [stair2Name, stair2Conn] of buildingConnections) {
                if (stair1Name === stair2Name) continue; // Must use different stairs

                // Get map files for each stair based on floor
                const stair1MapCurrent = startFloor === 'lower' ? stair1Conn.lower : stair1Conn.upper;
                const stair1MapOther = otherFloor === 'lower' ? stair1Conn.lower : stair1Conn.upper;
                const stair2MapCurrent = startFloor === 'lower' ? stair2Conn.lower : stair2Conn.upper;
                const stair2MapOther = otherFloor === 'lower' ? stair2Conn.lower : stair2Conn.upper;

                // Get single best entrance for each stair on each floor
                const stair1EntrancesCurrent = findAllStairEntrancesOnFloor(stair1Name, stair1MapCurrent, startMapData);
                const stair2EntrancesCurrent = findAllStairEntrancesOnFloor(stair2Name, stair2MapCurrent, startMapData);
                const stair1EntrancesOther = findAllStairEntrancesOnFloor(stair1Name, stair1MapOther, otherMapData);
                const stair2EntrancesOther = findAllStairEntrancesOnFloor(stair2Name, stair2MapOther, otherMapData);

                // For start room: pick entrance closest to stair1
                // First get an initial stair1 entrance to use as reference
                const stair1InitialRef = stair1EntrancesCurrent[0];
                if (!stair1InitialRef) continue;
                const roomStartEnt = getClosestEntrance(startEntrances, stair1InitialRef);
                if (!roomStartEnt) continue;

                // Pick stair1 entrance on current floor closest to start room
                const stair1Current = getClosestStairEntrance(stair1EntrancesCurrent, roomStartEnt);
                if (!stair1Current) continue;

                // Pick stair1 entrance on other floor that matches by identifier or position
                const stair1Other = getMatchingEntrance(stair1EntrancesOther, stair1Current);
                if (!stair1Other) continue;

                // For stair2 on other floor: Gym Stairs uses bottom-left, others closest to stair1Other
                const stair2Other = stair2Name === 'Gym Stairs'
                    ? getGymStairEntrance(stair2EntrancesOther)
                    : getClosestStairEntrance(stair2EntrancesOther, stair1Other);
                if (!stair2Other) continue;

                // Pick stair2 entrance on current floor that matches by identifier or position
                const stair2Current = getMatchingEntrance(stair2EntrancesCurrent, stair2Other);
                if (!stair2Current) continue;

                // For end room: pick entrance closest to stair2
                const roomEndEnt = getClosestEntrance(endEntrances, stair2Current);
                if (!roomEndEnt) continue;

                // Segment 1: Start room → Stair1 (on current floor)
                const pathToStair1 = pathfinder.findPath(roomStartEnt, stair1Current);
                if (!pathToStair1) continue;

                // Segment 2: Stair1 → Stair2 (on OTHER floor)
                const pathAcrossOtherFloor = otherFloorPathfinder.findPath(stair1Other, stair2Other);
                if (!pathAcrossOtherFloor) continue;

                // Segment 3: Stair2 → End room (on current floor)
                const pathFromStair2 = pathfinder.findPath(stair2Current, roomEndEnt);
                if (!pathFromStair2) continue;

                const totalDistance = pathToStair1.length + pathAcrossOtherFloor.length + pathFromStair2.length;

                if (totalDistance < bestDisconnectedDistance) {
                    bestDisconnectedDistance = totalDistance;
                    bestDisconnectedRoute = {
                        active: true,
                        startRoom: { ...startRoom, x: roomStartEnt.x, y: roomStartEnt.y },
                        endRoom: { ...endRoom, x: roomEndEnt.x, y: roomEndEnt.y },
                        segments: [
                            { floor: startFloor, path: pathToStair1, stairEnd: stair1Current, mapFile: startMapFile },
                            { floor: otherFloor, path: pathAcrossOtherFloor, stairStart: stair1Other, stairEnd: stair2Other, mapFile: otherMapFile },
                            { floor: startFloor, path: pathFromStair2, stairStart: stair2Current, mapFile: startMapFile }
                        ],
                        requiresFloorChange: true,
                        stairsUsed: [stair1Name, stair2Name],
                        totalDistance: totalDistance,
                        isDisconnectedRoute: true,
                        direction: startFloor === 'lower' ? 'up-down' : 'down-up',
                        activeSegmentIndex: 0  // Track progress through disconnected route
                    };
                }
            }
        }

        if (bestDisconnectedRoute) {
            return bestDisconnectedRoute;
        }

        return null;
    }

    // ===============================================
    // CROSS-FLOOR ROUTING
    // Calculate paths on BOTH floors and find optimal staircase
    // Also optimizes for best room entrance combinations
    // ===============================================

    let bestRoute = null;
    let bestTotalDistance = Infinity;

    // Get active floor connections based on accessibility preference
    const activeConnections = getActiveFloorConnections();

    // Filter connections to only those matching this building
    // (e.g., CTE routes should only use CTE stairs, Main Campus routes should only use Main Campus stairs)
    const startBuilding = getBuilding(startMapFile);
    const relevantConnections = Object.entries(activeConnections).filter(([name, conn]) =>
        getBuilding(conn.lower) === startBuilding
    );

    // Try each floor connection and calculate total distance
    for (const [stairName, stairConn] of relevantConnections) {
        // Get the map files for this connection based on floor
        const stairMapStart = startFloor === 'lower' ? stairConn.lower : stairConn.upper;
        const stairMapEnd = endFloor === 'lower' ? stairConn.lower : stairConn.upper;

        // Find ALL stair entrances on both floors (may have multiple textboxes per stair)
        const stairEntrancesStart = findAllStairEntrancesOnFloor(stairName, stairMapStart, startMapData);
        const stairEntrancesEnd = findAllStairEntrancesOnFloor(stairName, stairMapEnd, endMapData);

        if (stairEntrancesStart.length === 0 || stairEntrancesEnd.length === 0) {
            continue;
        }

        // For multi-entrance stairs (like Gym Stairs with 4 entrances), use paired matching
        // This ensures if you enter the bottom-right staircase, you exit bottom-right on other floor
        const isMultiEntranceStair = stairEntrancesStart.length > 1 && stairEntrancesEnd.length > 1;

        if (isMultiEntranceStair) {
            // Pair stair entrances by position - matching stairs across floors
            const pairedEntrances = pairStairEntrances(stairEntrancesStart, stairEntrancesEnd);

            // Try each paired entrance (start[i] connects to end[i])
            for (const pair of pairedEntrances) {
                for (const roomStartEnt of startEntrances) {
                    for (const roomEndEnt of endEntrances) {
                        // Calculate path on START floor: room entrance → staircase
                        const pathfinderStart = new AStarPathfinder(startMapData);
                        const pathToStairs = pathfinderStart.findPath(roomStartEnt, pair.start);

                        if (!pathToStairs) continue;

                        // Calculate path on END floor: staircase → room entrance
                        const pathfinderEnd = new AStarPathfinder(endMapData);
                        const pathFromStairs = pathfinderEnd.findPath(pair.end, roomEndEnt);

                        if (!pathFromStairs) continue;

                        // Total distance is sum of both paths
                        const totalDistance = pathToStairs.length + pathFromStairs.length;

                        if (totalDistance < bestTotalDistance) {
                            bestTotalDistance = totalDistance;
                            bestRoute = {
                                active: true,
                                startRoom: { ...startRoom, x: roomStartEnt.x, y: roomStartEnt.y },
                                endRoom: { ...endRoom, x: roomEndEnt.x, y: roomEndEnt.y },
                                segments: [
                                    { floor: startFloor, path: pathToStairs, stairEnd: pair.start, mapFile: startMapFile },
                                    { floor: endFloor, path: pathFromStairs, stairStart: pair.end, mapFile: endMapFile }
                                ],
                                requiresFloorChange: true,
                                stairsUsed: stairName,
                                stairPositions: {
                                    [startFloor]: pair.start,
                                    [endFloor]: pair.end
                                },
                                totalDistance: totalDistance,
                                direction: startFloor === 'lower' ? 'up' : 'down',
                                activeSegmentIndex: 0  // Track progress through route
                            };
                        }
                    }
                }
            }
        } else {
            // Single entrance stairs - try all combinations (original logic)
            for (const roomStartEnt of startEntrances) {
                for (const stairTileStart of stairEntrancesStart) {
                    for (const stairTileEnd of stairEntrancesEnd) {
                        for (const roomEndEnt of endEntrances) {
                            // Calculate path on START floor: room entrance → staircase
                            const pathfinderStart = new AStarPathfinder(startMapData);
                            const pathToStairs = pathfinderStart.findPath(roomStartEnt, stairTileStart);

                            if (!pathToStairs) continue;

                            // Calculate path on END floor: staircase → room entrance
                            const pathfinderEnd = new AStarPathfinder(endMapData);
                            const pathFromStairs = pathfinderEnd.findPath(stairTileEnd, roomEndEnt);

                            if (!pathFromStairs) continue;

                            // Total distance is sum of both paths
                            const totalDistance = pathToStairs.length + pathFromStairs.length;

                            if (totalDistance < bestTotalDistance) {
                                bestTotalDistance = totalDistance;
                                bestRoute = {
                                    active: true,
                                    startRoom: { ...startRoom, x: roomStartEnt.x, y: roomStartEnt.y },
                                    endRoom: { ...endRoom, x: roomEndEnt.x, y: roomEndEnt.y },
                                    segments: [
                                        { floor: startFloor, path: pathToStairs, stairEnd: stairTileStart, mapFile: startMapFile },
                                        { floor: endFloor, path: pathFromStairs, stairStart: stairTileEnd, mapFile: endMapFile }
                                    ],
                                    requiresFloorChange: true,
                                    stairsUsed: stairName,
                                    stairPositions: {
                                        [startFloor]: stairTileStart,
                                        [endFloor]: stairTileEnd
                                    },
                                    totalDistance: totalDistance,
                                    direction: startFloor === 'lower' ? 'up' : 'down',
                                    activeSegmentIndex: 0  // Track progress through route
                                };
                            }
                        }
                    }
                }
            }
        }
    }

    return bestRoute;
}

// Build display label for a location (used by both direction functions)
function buildLocationLabel(locationData) {
    let label = locationData.label || locationData.name;
    if (!label && locationData.teacher) {
        label = locationData.roomNumber
            ? `${locationData.teacher} (#${locationData.roomNumber})`
            : locationData.teacher;
    }
    return label || 'Location';
}