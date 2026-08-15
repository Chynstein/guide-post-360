/**
 * Tests for room search and indexing functionality.
 *
 * Tests cover:
 * - Room index building from textboxes
 * - Searching by teacher name, room number, and aliases
 * - Staircase and elevator detection
 *
 * Run with: npm test -- tests/frontend/test_room_search.js
 */

// ============================================
// Helper functions from map_interactions.js
// ============================================

function isDescriptionOnly(text) {
    if (!text) return false;
    const firstLine = text.split('\n')[0].trim();
    return firstLine.startsWith('|');
}

function isStaircaseTextbox(textbox) {
    if (!textbox || !textbox.text) return false;
    const firstLine = textbox.text.split('\n')[0].trim().toLowerCase();
    return firstLine.includes('stairs') &&
           !firstLine.includes('downstairs') &&
           !firstLine.includes('upstairs');
}

function isElevatorTextbox(textbox) {
    if (!textbox || !textbox.text) return false;
    const firstLine = textbox.text.split('\n')[0].trim().toLowerCase();
    return firstLine.includes('elevator');
}

function getTextboxPosition(textbox) {
    return {
        x: textbox.grid_x !== undefined ? textbox.grid_x : textbox.x,
        y: textbox.grid_y !== undefined ? textbox.grid_y : textbox.y
    };
}


// ============================================
// Room Index Implementation (from map_pathfinder.js)
// ============================================

function createEmptyRoomIndex() {
    return {
        byTeacher: {},
        byRoomNumber: {},
        byName: {},
        byAlias: {},
        stairs: [],
        all: []
    };
}

function addToAliasIndex(roomIndex, key, locationData) {
    const lowerKey = key.toLowerCase();
    if (!roomIndex.byAlias[lowerKey]) {
        roomIndex.byAlias[lowerKey] = [];
    }
    roomIndex.byAlias[lowerKey].push(locationData);
}

function addToNameIndex(roomIndex, key, locationData) {
    const lowerKey = key.toLowerCase();
    if (!roomIndex.byName[lowerKey]) {
        roomIndex.byName[lowerKey] = [];
    }
    roomIndex.byName[lowerKey].push(locationData);
}

/**
 * Build a room index from an array of textboxes.
 * This is a simplified version of the buildRoomIndex function.
 */
function buildRoomIndex(textboxes, floor = 'lower') {
    const roomIndex = createEmptyRoomIndex();

    textboxes.forEach((textbox, idx) => {
        const text = textbox.text || '';

        // Skip description-only textboxes
        if (isDescriptionOnly(text)) return;

        const lines = text.split('\n');
        const pos = getTextboxPosition(textbox);

        // Check for staircase
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
        }

        // Parse room format: "TeacherName\n#RoomNumber"
        if (lines.length >= 2 && lines[1].startsWith('#')) {
            const teacher = lines[0].trim();
            const roomNumber = lines[1].replace('#', '').trim();

            const aliases = [];
            for (let i = 2; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('~')) {
                    aliases.push(line.substring(1).trim());
                }
            }

            const roomData = {
                textboxIdx: idx,
                grid_x: pos.x,
                grid_y: pos.y,
                teacher: teacher,
                roomNumber: roomNumber,
                aliases: aliases,
                floor: floor,
                label: `${teacher} (#${roomNumber})`
            };

            roomIndex.byTeacher[teacher.toLowerCase()] = roomData;
            roomIndex.byRoomNumber[roomNumber] = roomData;

            for (const alias of aliases) {
                addToAliasIndex(roomIndex, alias, roomData);
            }

            roomIndex.all.push(roomData);
            return;
        }

        // General locations (Gym, Library, etc.)
        const locationName = lines[0].trim();
        if (!locationName) return;

        const aliases = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('~')) {
                aliases.push(line.substring(1).trim());
            }
        }

        const locationData = {
            textboxIdx: idx,
            grid_x: pos.x,
            grid_y: pos.y,
            name: locationName,
            aliases: aliases,
            floor: floor,
            label: locationName,
            type: 'location'
        };

        addToNameIndex(roomIndex, locationName, locationData);
        for (const alias of aliases) {
            addToAliasIndex(roomIndex, alias, locationData);
        }

        roomIndex.all.push(locationData);
    });

    return roomIndex;
}

/**
 * Search rooms by query (case insensitive, partial matching).
 */
function searchRooms(roomIndex, query) {
    if (!query || query.length < 1) return [];

    const lowerQuery = query.toLowerCase();
    const results = [];
    const seen = new Set();

    // Search by teacher name
    for (const [key, data] of Object.entries(roomIndex.byTeacher)) {
        if (key.includes(lowerQuery) && !seen.has(data.label)) {
            results.push(data);
            seen.add(data.label);
        }
    }

    // Search by room number
    for (const [key, data] of Object.entries(roomIndex.byRoomNumber)) {
        if (key.includes(lowerQuery) && !seen.has(data.label)) {
            results.push(data);
            seen.add(data.label);
        }
    }

    // Search by name
    for (const [key, locations] of Object.entries(roomIndex.byName)) {
        if (key.includes(lowerQuery)) {
            for (const loc of locations) {
                if (!seen.has(loc.label)) {
                    results.push(loc);
                    seen.add(loc.label);
                }
            }
        }
    }

    // Search by alias
    for (const [key, locations] of Object.entries(roomIndex.byAlias)) {
        if (key.includes(lowerQuery)) {
            for (const loc of locations) {
                if (!seen.has(loc.label)) {
                    results.push(loc);
                    seen.add(loc.label);
                }
            }
        }
    }

    return results;
}


// ============================================
// TESTS
// ============================================

describe('isStaircaseTextbox', () => {
    test('returns true for staircase textboxes', () => {
        expect(isStaircaseTextbox({ text: 'Left Stairs' })).toBe(true);
        expect(isStaircaseTextbox({ text: 'Gym Stairs\n↑' })).toBe(true);
        expect(isStaircaseTextbox({ text: 'STAIRS' })).toBe(true);
    });

    test('returns false for "Downstairs" or "Upstairs"', () => {
        expect(isStaircaseTextbox({ text: 'Downstairs Hallway' })).toBe(false);
        expect(isStaircaseTextbox({ text: 'Upstairs Lobby' })).toBe(false);
        expect(isStaircaseTextbox({ text: 'Room (Downstairs)' })).toBe(false);
    });

    test('returns false for non-staircase textboxes', () => {
        expect(isStaircaseTextbox({ text: 'Room 101' })).toBe(false);
        expect(isStaircaseTextbox({ text: 'Main Gym' })).toBe(false);
    });

    test('returns false for null/empty textbox', () => {
        expect(isStaircaseTextbox(null)).toBe(false);
        expect(isStaircaseTextbox({})).toBe(false);
        expect(isStaircaseTextbox({ text: '' })).toBe(false);
    });
});


describe('isElevatorTextbox', () => {
    test('returns true for elevator textboxes', () => {
        expect(isElevatorTextbox({ text: 'Elevator' })).toBe(true);
        expect(isElevatorTextbox({ text: 'Main Elevator\n↑' })).toBe(true);
        expect(isElevatorTextbox({ text: 'ELEVATOR' })).toBe(true);
    });

    test('returns false for non-elevator textboxes', () => {
        expect(isElevatorTextbox({ text: 'Stairs' })).toBe(false);
        expect(isElevatorTextbox({ text: 'Room 101' })).toBe(false);
    });

    test('returns false for null/empty textbox', () => {
        expect(isElevatorTextbox(null)).toBe(false);
        expect(isElevatorTextbox({})).toBe(false);
    });
});


describe('buildRoomIndex', () => {
    test('indexes teacher rooms correctly', () => {
        const textboxes = [
            { grid_x: 10, grid_y: 20, text: 'Mr. Smith\n#101' },
            { grid_x: 30, grid_y: 40, text: 'Ms. Jones\n#102' }
        ];
        const index = buildRoomIndex(textboxes);

        expect(index.byTeacher['mr. smith']).toBeDefined();
        expect(index.byTeacher['mr. smith'].roomNumber).toBe('101');
        expect(index.byRoomNumber['101']).toBeDefined();
        expect(index.byRoomNumber['102']).toBeDefined();
    });

    test('indexes general locations', () => {
        const textboxes = [
            { grid_x: 50, grid_y: 60, text: 'Main Gym' },
            { grid_x: 70, grid_y: 80, text: 'Library' }
        ];
        const index = buildRoomIndex(textboxes);

        expect(index.byName['main gym']).toHaveLength(1);
        expect(index.byName['library']).toHaveLength(1);
    });

    test('indexes aliases', () => {
        const textboxes = [
            { grid_x: 10, grid_y: 20, text: "Girl's Bathroom\n~Restroom\n~Toilet" }
        ];
        const index = buildRoomIndex(textboxes);

        expect(index.byAlias['restroom']).toHaveLength(1);
        expect(index.byAlias['toilet']).toHaveLength(1);
    });

    test('indexes staircases', () => {
        const textboxes = [
            { grid_x: 100, grid_y: 50, text: 'Left Stairs\n↑' },
            { grid_x: 110, grid_y: 50, text: 'Left Stairs\n↑' }  // Same staircase, different entrance
        ];
        const index = buildRoomIndex(textboxes);

        expect(index.stairs).toHaveLength(1);
        expect(index.stairs[0].name).toBe('Left Stairs');
        expect(index.stairs[0].positions).toHaveLength(2);
    });

    test('skips description-only textboxes', () => {
        const textboxes = [
            { grid_x: 10, grid_y: 20, text: '| Open to Main Gym |' },
            { grid_x: 30, grid_y: 40, text: 'Actual Room\n#101' }
        ];
        const index = buildRoomIndex(textboxes);

        expect(index.all).toHaveLength(1);
        expect(index.all[0].roomNumber).toBe('101');
    });

    test('populates all array for autocomplete', () => {
        const textboxes = [
            { grid_x: 10, grid_y: 20, text: 'Mr. Smith\n#101' },
            { grid_x: 30, grid_y: 40, text: 'Main Gym' },
            { grid_x: 50, grid_y: 60, text: 'Left Stairs\n↑' }
        ];
        const index = buildRoomIndex(textboxes);

        expect(index.all.length).toBeGreaterThanOrEqual(3);
    });

    test('sets floor property', () => {
        const textboxes = [
            { grid_x: 10, grid_y: 20, text: 'Mr. Smith\n#101' }
        ];
        const index = buildRoomIndex(textboxes, 'upper');

        expect(index.byTeacher['mr. smith'].floor).toBe('upper');
    });
});


describe('searchRooms', () => {
    const textboxes = [
        { grid_x: 10, grid_y: 20, text: 'Mr. Smith\n#101\n~Math Class' },
        { grid_x: 30, grid_y: 40, text: 'Ms. Johnson\n#102' },
        { grid_x: 50, grid_y: 60, text: 'Main Gym\n~Basketball\n~Sports' },
        { grid_x: 70, grid_y: 80, text: "Girl's Bathroom\n~Restroom" }
    ];
    const index = buildRoomIndex(textboxes);

    test('finds by teacher name', () => {
        const results = searchRooms(index, 'smith');
        expect(results).toHaveLength(1);
        expect(results[0].teacher).toBe('Mr. Smith');
    });

    test('finds by room number', () => {
        const results = searchRooms(index, '101');
        expect(results).toHaveLength(1);
        expect(results[0].roomNumber).toBe('101');
    });

    test('finds by location name', () => {
        const results = searchRooms(index, 'gym');
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe('Main Gym');
    });

    test('finds by alias', () => {
        const results = searchRooms(index, 'restroom');
        expect(results).toHaveLength(1);
        expect(results[0].name).toBe("Girl's Bathroom");
    });

    test('case insensitive search', () => {
        expect(searchRooms(index, 'SMITH')).toHaveLength(1);
        expect(searchRooms(index, 'GYM')).toHaveLength(1);
    });

    test('partial matching', () => {
        const results = searchRooms(index, 'smi');  // partial "smith"
        expect(results).toHaveLength(1);
    });

    test('returns empty for no matches', () => {
        const results = searchRooms(index, 'xyz123');
        expect(results).toHaveLength(0);
    });

    test('returns empty for empty query', () => {
        expect(searchRooms(index, '')).toHaveLength(0);
        expect(searchRooms(index, null)).toHaveLength(0);
    });

    test('avoids duplicate results', () => {
        // "math" should only return Smith once, not twice (even if indexed multiple ways)
        const results = searchRooms(index, 'math');
        const labels = results.map(r => r.label);
        const unique = [...new Set(labels)];
        expect(labels.length).toBe(unique.length);
    });
});
