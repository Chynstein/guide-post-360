/**
 * Tests for unsaved changes tracking.
 *
 * Tests cover:
 * - saveSavedStateSnapshot() - saving clean state snapshot
 * - stateMatchesSaved() - comparing current state to saved snapshot
 * - updateUnsavedChangesFlag() - updating the flag based on state comparison
 * - Undo behavior - verifying flag clears when undoing back to saved state
 *
 * Run with: npm test -- tests/frontend/test_unsaved_changes.js
 */

// ============================================
// Mock global state (simulating map_core.js)
// ============================================

let mapData = {
    width: 10,
    height: 10,
    data: []
};

let textboxes = [];
let hasUnsavedChanges = false;
let savedStateSnapshot = null;
let undoHistory = [];
const MAX_UNDO = 50;

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

// ============================================
// Copy functions from map_core.js
// ============================================

function saveSavedStateSnapshot() {
    savedStateSnapshot = JSON.stringify({
        map: mapData.data,
        textboxes: textboxes
    });
}

function stateMatchesSaved() {
    if (!savedStateSnapshot) return false;
    const currentState = JSON.stringify({
        map: mapData.data,
        textboxes: textboxes
    });
    return currentState === savedStateSnapshot;
}

function updateUnsavedChangesFlag() {
    hasUnsavedChanges = !stateMatchesSaved();
}

function saveUndo() {
    undoHistory.push({
        map: JSON.parse(JSON.stringify(mapData.data)),
        textboxes: JSON.parse(JSON.stringify(textboxes))
    });

    if (undoHistory.length > MAX_UNDO) {
        undoHistory.shift();
    }

    hasUnsavedChanges = true;
}

function undo() {
    if (undoHistory.length > 0) {
        const state = undoHistory.pop();
        mapData.data = state.map;
        textboxes = state.textboxes;

        // Check if we've undone back to the saved state
        updateUnsavedChangesFlag();
    }
}

// ============================================
// Test helpers
// ============================================

function resetState() {
    mapData.width = 10;
    mapData.height = 10;
    initializeEmptyMap();
    textboxes = [];
    hasUnsavedChanges = false;
    savedStateSnapshot = null;
    undoHistory = [];
}

function createTestTextbox(x, y, text) {
    return {
        grid_x: x,
        grid_y: y,
        grid_width: 6,
        grid_height: 3,
        text: text,
        font_size: 20,
        alignment: 'left',
        scroll_offset: 0
    };
}

// ============================================
// TESTS
// ============================================

describe('saveSavedStateSnapshot', () => {
    beforeEach(() => {
        resetState();
    });

    test('saves snapshot of empty map', () => {
        saveSavedStateSnapshot();
        expect(savedStateSnapshot).not.toBeNull();
        expect(typeof savedStateSnapshot).toBe('string');
    });

    test('saves snapshot with textboxes', () => {
        textboxes.push(createTestTextbox(5, 5, 'Room 101'));
        saveSavedStateSnapshot();

        expect(savedStateSnapshot).toContain('Room 101');
    });

    test('saves snapshot with map data', () => {
        mapData.data[0][0] = 1;
        mapData.data[5][5] = 3;
        saveSavedStateSnapshot();

        expect(savedStateSnapshot).toContain('1');
        expect(savedStateSnapshot).toContain('3');
    });
});


describe('stateMatchesSaved', () => {
    beforeEach(() => {
        resetState();
    });

    test('returns false when no snapshot saved', () => {
        expect(stateMatchesSaved()).toBe(false);
    });

    test('returns true when state matches saved snapshot', () => {
        textboxes.push(createTestTextbox(5, 5, 'Room 101'));
        saveSavedStateSnapshot();

        expect(stateMatchesSaved()).toBe(true);
    });

    test('returns false when textbox added after snapshot', () => {
        saveSavedStateSnapshot();
        textboxes.push(createTestTextbox(5, 5, 'Room 101'));

        expect(stateMatchesSaved()).toBe(false);
    });

    test('returns false when textbox modified after snapshot', () => {
        textboxes.push(createTestTextbox(5, 5, 'Room 101'));
        saveSavedStateSnapshot();

        textboxes[0].text = 'Room 102';

        expect(stateMatchesSaved()).toBe(false);
    });

    test('returns false when textbox moved after snapshot', () => {
        textboxes.push(createTestTextbox(5, 5, 'Room 101'));
        saveSavedStateSnapshot();

        textboxes[0].grid_x = 10;

        expect(stateMatchesSaved()).toBe(false);
    });

    test('returns false when map tile changed after snapshot', () => {
        saveSavedStateSnapshot();
        mapData.data[0][0] = 1;

        expect(stateMatchesSaved()).toBe(false);
    });

    test('returns true when state manually restored to match snapshot', () => {
        textboxes.push(createTestTextbox(5, 5, 'Room 101'));
        saveSavedStateSnapshot();

        // Modify
        textboxes[0].text = 'Modified';
        expect(stateMatchesSaved()).toBe(false);

        // Restore
        textboxes[0].text = 'Room 101';
        expect(stateMatchesSaved()).toBe(true);
    });
});


describe('updateUnsavedChangesFlag', () => {
    beforeEach(() => {
        resetState();
    });

    test('sets hasUnsavedChanges to false when state matches', () => {
        saveSavedStateSnapshot();
        hasUnsavedChanges = true;

        updateUnsavedChangesFlag();

        expect(hasUnsavedChanges).toBe(false);
    });

    test('sets hasUnsavedChanges to true when state differs', () => {
        saveSavedStateSnapshot();
        hasUnsavedChanges = false;

        textboxes.push(createTestTextbox(5, 5, 'New Room'));
        updateUnsavedChangesFlag();

        expect(hasUnsavedChanges).toBe(true);
    });

    test('sets hasUnsavedChanges to true when no snapshot exists', () => {
        hasUnsavedChanges = false;

        updateUnsavedChangesFlag();

        expect(hasUnsavedChanges).toBe(true);
    });
});


describe('undo with unsaved changes tracking', () => {
    beforeEach(() => {
        resetState();
    });

    test('clears hasUnsavedChanges when undoing single change back to saved state', () => {
        // Save initial state as "clean"
        saveSavedStateSnapshot();
        expect(hasUnsavedChanges).toBe(false);

        // Make a change (saveUndo + modify)
        saveUndo();
        textboxes.push(createTestTextbox(5, 5, 'New Room'));
        expect(hasUnsavedChanges).toBe(true);

        // Undo the change
        undo();
        expect(hasUnsavedChanges).toBe(false);
        expect(textboxes.length).toBe(0);
    });

    test('clears hasUnsavedChanges when undoing multiple changes back to saved state', () => {
        // Save initial state with one textbox as "clean"
        textboxes.push(createTestTextbox(5, 5, 'Original'));
        saveSavedStateSnapshot();

        // Make first change
        saveUndo();
        textboxes[0].text = 'Modified 1';
        expect(hasUnsavedChanges).toBe(true);

        // Make second change
        saveUndo();
        textboxes[0].text = 'Modified 2';
        expect(hasUnsavedChanges).toBe(true);

        // Undo first change - still not at saved state
        undo();
        expect(hasUnsavedChanges).toBe(true);
        expect(textboxes[0].text).toBe('Modified 1');

        // Undo second change - back to saved state
        undo();
        expect(hasUnsavedChanges).toBe(false);
        expect(textboxes[0].text).toBe('Original');
    });

    test('keeps hasUnsavedChanges true when undo does not reach saved state', () => {
        // Save initial empty state as "clean"
        saveSavedStateSnapshot();

        // Add textbox (change 1)
        saveUndo();
        textboxes.push(createTestTextbox(5, 5, 'Room 1'));

        // Modify textbox (change 2)
        saveUndo();
        textboxes[0].text = 'Room 1 Modified';

        // Add another textbox (change 3)
        saveUndo();
        textboxes.push(createTestTextbox(10, 10, 'Room 2'));

        // Undo once - still have 2 textboxes with modification
        undo();
        expect(hasUnsavedChanges).toBe(true);

        // Undo again - back to 1 modified textbox
        undo();
        expect(hasUnsavedChanges).toBe(true);

        // Undo again - back to clean empty state
        undo();
        expect(hasUnsavedChanges).toBe(false);
        expect(textboxes.length).toBe(0);
    });

    test('handles map tile changes with undo', () => {
        // Save initial state
        saveSavedStateSnapshot();

        // Draw a tile
        saveUndo();
        mapData.data[0][0] = 1;
        expect(hasUnsavedChanges).toBe(true);

        // Draw another tile
        saveUndo();
        mapData.data[1][1] = 2;
        expect(hasUnsavedChanges).toBe(true);

        // Undo second tile
        undo();
        expect(hasUnsavedChanges).toBe(true);
        expect(mapData.data[0][0]).toBe(1);
        expect(mapData.data[1][1]).toBe(0);

        // Undo first tile - back to saved state
        undo();
        expect(hasUnsavedChanges).toBe(false);
        expect(mapData.data[0][0]).toBe(0);
    });

    test('handles textbox move and undo', () => {
        // Initial state with textbox
        textboxes.push(createTestTextbox(5, 5, 'Moveable'));
        saveSavedStateSnapshot();

        // Move the textbox
        saveUndo();
        textboxes[0].grid_x = 10;
        textboxes[0].grid_y = 10;
        expect(hasUnsavedChanges).toBe(true);

        // Undo the move
        undo();
        expect(hasUnsavedChanges).toBe(false);
        expect(textboxes[0].grid_x).toBe(5);
        expect(textboxes[0].grid_y).toBe(5);
    });

    test('handles textbox edit and undo', () => {
        // Initial state with textbox
        textboxes.push(createTestTextbox(5, 5, 'Original Text'));
        saveSavedStateSnapshot();

        // Edit the textbox text
        saveUndo();
        textboxes[0].text = 'Edited Text';
        expect(hasUnsavedChanges).toBe(true);

        // Undo the edit
        undo();
        expect(hasUnsavedChanges).toBe(false);
        expect(textboxes[0].text).toBe('Original Text');
    });

    test('handles textbox font size change and undo', () => {
        // Initial state with textbox
        textboxes.push(createTestTextbox(5, 5, 'Test'));
        saveSavedStateSnapshot();

        // Change font size
        saveUndo();
        textboxes[0].font_size = 32;
        expect(hasUnsavedChanges).toBe(true);

        // Undo
        undo();
        expect(hasUnsavedChanges).toBe(false);
        expect(textboxes[0].font_size).toBe(20);
    });

    test('handles delete textbox and undo', () => {
        // Initial state with textbox
        textboxes.push(createTestTextbox(5, 5, 'To Delete'));
        saveSavedStateSnapshot();

        // Delete the textbox
        saveUndo();
        textboxes.pop();
        expect(hasUnsavedChanges).toBe(true);
        expect(textboxes.length).toBe(0);

        // Undo the delete
        undo();
        expect(hasUnsavedChanges).toBe(false);
        expect(textboxes.length).toBe(1);
        expect(textboxes[0].text).toBe('To Delete');
    });
});


describe('edge cases', () => {
    beforeEach(() => {
        resetState();
    });

    test('empty undo history does nothing', () => {
        saveSavedStateSnapshot();
        hasUnsavedChanges = false;

        undo();

        expect(hasUnsavedChanges).toBe(false);
    });

    test('multiple saves update snapshot', () => {
        // First save
        textboxes.push(createTestTextbox(5, 5, 'First'));
        saveSavedStateSnapshot();

        // Make a change
        saveUndo();
        textboxes[0].text = 'Second';
        expect(hasUnsavedChanges).toBe(true);

        // Save again (simulating user clicking Save)
        saveSavedStateSnapshot();
        hasUnsavedChanges = false;

        // Now current state should match
        expect(stateMatchesSaved()).toBe(true);

        // Undo should now show unsaved changes (different from new snapshot)
        undo();
        expect(hasUnsavedChanges).toBe(true);
    });

    test('handles complex object changes correctly', () => {
        // Create textbox with all properties
        const complexTextbox = {
            grid_x: 5,
            grid_y: 5,
            grid_width: 6,
            grid_height: 3,
            text: 'Complex',
            font_size: 20,
            alignment: 'center',
            vertical_alignment: 'middle',
            scroll_offset: 10
        };
        textboxes.push(complexTextbox);
        saveSavedStateSnapshot();

        // Change multiple properties
        saveUndo();
        textboxes[0].alignment = 'left';
        textboxes[0].vertical_alignment = 'top';
        textboxes[0].scroll_offset = 0;
        expect(hasUnsavedChanges).toBe(true);

        // Undo
        undo();
        expect(hasUnsavedChanges).toBe(false);
        expect(textboxes[0].alignment).toBe('center');
        expect(textboxes[0].vertical_alignment).toBe('middle');
        expect(textboxes[0].scroll_offset).toBe(10);
    });
});
