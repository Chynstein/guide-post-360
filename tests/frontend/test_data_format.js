/**
 * Tests for data format conversion and textbox handling.
 *
 * Tests cover:
 * - expandSparseMap() - converting sparse map format to dense 2D array
 * - normalizeTextbox() - standardizing textbox properties
 * - getTextboxPosition() / getTextboxDimensions() - property getters
 *
 * Run with: npm test -- tests/frontend/test_data_format.js
 */

// ============================================
// Copy functions from map_interactions.js and map_core.js
// ============================================

/**
 * Expand sparse map format to dense 2D array.
 * Sparse format: { size: [height, width], tiles: [[row, col, value], ...] }
 * Dense format: [[0,0,1,0,...], [0,0,0,0,...], ...]
 */
function expandSparseMap(data) {
    if (!data.size || !Array.isArray(data.tiles)) {
        return null;
    }

    const [height, width] = data.size;
    const denseMap = [];
    for (let row = 0; row < height; row++) {
        denseMap[row] = new Array(width).fill(0);
    }

    for (const tile of data.tiles) {
        const [row, col, value] = tile;
        if (row >= 0 && row < height && col >= 0 && col < width) {
            denseMap[row][col] = value;
        }
    }

    return denseMap;
}

/**
 * Get textbox grid position with fallback to legacy x/y properties.
 */
function getTextboxPosition(textbox) {
    return {
        x: textbox.grid_x !== undefined ? textbox.grid_x : textbox.x,
        y: textbox.grid_y !== undefined ? textbox.grid_y : textbox.y
    };
}

/**
 * Get textbox grid dimensions with fallback to legacy width/height properties.
 */
function getTextboxDimensions(textbox) {
    return {
        width: textbox.grid_width !== undefined ? textbox.grid_width : textbox.width,
        height: textbox.grid_height !== undefined ? textbox.grid_height : textbox.height
    };
}

/**
 * Normalize a textbox to the standard format (handles legacy properties).
 */
function normalizeTextbox(textbox) {
    const pos = getTextboxPosition(textbox);
    const dims = getTextboxDimensions(textbox);
    return {
        grid_x: pos.x,
        grid_y: pos.y,
        grid_width: dims.width,
        grid_height: dims.height,
        text: textbox.text || '',
        font_size: textbox.font_size !== undefined ? textbox.font_size : (textbox.fontSize || 20),
        alignment: textbox.alignment || textbox.align || 'left',
        vertical_alignment: textbox.vertical_alignment || textbox.verticalAlign || 'top',
        scroll_offset: textbox.scroll_offset || 0
    };
}

/**
 * Check if a textbox is description-only (first line starts with "|").
 */
function isDescriptionOnly(text) {
    if (!text) return false;
    const firstLine = text.split('\n')[0].trim();
    return firstLine.startsWith('|');
}


// ============================================
// TESTS
// ============================================

describe('expandSparseMap', () => {
    test('converts sparse map to dense format', () => {
        const sparse = {
            size: [3, 3],
            tiles: [
                [0, 0, 1],
                [1, 1, 3],
                [2, 2, 5]
            ]
        };
        const dense = expandSparseMap(sparse);

        expect(dense).toEqual([
            [1, 0, 0],
            [0, 3, 0],
            [0, 0, 5]
        ]);
    });

    test('returns null for non-sparse data', () => {
        // Dense format (2D array) should return null
        const dense = [[0, 0], [0, 0]];
        expect(expandSparseMap(dense)).toBeNull();
    });

    test('returns null for missing size property', () => {
        const data = { tiles: [[0, 0, 1]] };
        expect(expandSparseMap(data)).toBeNull();
    });

    test('returns null for missing tiles array', () => {
        const data = { size: [3, 3] };
        expect(expandSparseMap(data)).toBeNull();
    });

    test('handles empty tiles array', () => {
        const sparse = { size: [2, 2], tiles: [] };
        const dense = expandSparseMap(sparse);

        expect(dense).toEqual([
            [0, 0],
            [0, 0]
        ]);
    });

    test('ignores out-of-bounds tiles', () => {
        const sparse = {
            size: [2, 2],
            tiles: [
                [0, 0, 1],
                [5, 5, 3],  // out of bounds - should be ignored
                [-1, 0, 2]  // negative index - should be ignored
            ]
        };
        const dense = expandSparseMap(sparse);

        expect(dense).toEqual([
            [1, 0],
            [0, 0]
        ]);
    });

    test('handles large sparse map', () => {
        const sparse = {
            size: [100, 100],
            tiles: [
                [50, 50, 3],
                [99, 99, 5]
            ]
        };
        const dense = expandSparseMap(sparse);

        expect(dense.length).toBe(100);
        expect(dense[0].length).toBe(100);
        expect(dense[50][50]).toBe(3);
        expect(dense[99][99]).toBe(5);
        expect(dense[0][0]).toBe(0);
    });

    test('preserves all tile types', () => {
        const sparse = {
            size: [1, 6],
            tiles: [
                [0, 0, 0],  // empty (redundant but valid)
                [0, 1, 1],  // WB Blue
                [0, 2, 2],  // WB Orange
                [0, 3, 3],  // Hallway
                [0, 4, 4],  // Wall
                [0, 5, 5]   // Doorway
            ]
        };
        const dense = expandSparseMap(sparse);

        expect(dense[0]).toEqual([0, 1, 2, 3, 4, 5]);
    });
});


describe('getTextboxPosition', () => {
    test('returns grid_x/grid_y when available', () => {
        const textbox = { grid_x: 10, grid_y: 20, x: 5, y: 15 };
        const pos = getTextboxPosition(textbox);
        expect(pos).toEqual({ x: 10, y: 20 });
    });

    test('falls back to x/y when grid_x/grid_y not available', () => {
        const textbox = { x: 5, y: 15 };
        const pos = getTextboxPosition(textbox);
        expect(pos).toEqual({ x: 5, y: 15 });
    });

    test('handles zero values correctly', () => {
        const textbox = { grid_x: 0, grid_y: 0 };
        const pos = getTextboxPosition(textbox);
        expect(pos).toEqual({ x: 0, y: 0 });
    });
});


describe('getTextboxDimensions', () => {
    test('returns grid_width/grid_height when available', () => {
        const textbox = { grid_width: 5, grid_height: 3, width: 10, height: 8 };
        const dims = getTextboxDimensions(textbox);
        expect(dims).toEqual({ width: 5, height: 3 });
    });

    test('falls back to width/height when grid props not available', () => {
        const textbox = { width: 10, height: 8 };
        const dims = getTextboxDimensions(textbox);
        expect(dims).toEqual({ width: 10, height: 8 });
    });
});


describe('normalizeTextbox', () => {
    test('normalizes standard textbox', () => {
        const textbox = {
            grid_x: 10,
            grid_y: 20,
            grid_width: 5,
            grid_height: 3,
            text: 'Room 101',
            font_size: 14,
            alignment: 'center',
            vertical_alignment: 'middle'
        };
        const normalized = normalizeTextbox(textbox);

        expect(normalized).toEqual({
            grid_x: 10,
            grid_y: 20,
            grid_width: 5,
            grid_height: 3,
            text: 'Room 101',
            font_size: 14,
            alignment: 'center',
            vertical_alignment: 'middle',
            scroll_offset: 0
        });
    });

    test('normalizes legacy format textbox', () => {
        const legacy = {
            x: 5,
            y: 10,
            width: 4,
            height: 2,
            text: 'Old Room',
            fontSize: 16,  // legacy camelCase
            align: 'right',  // legacy property name
            verticalAlign: 'bottom'  // legacy property name
        };
        const normalized = normalizeTextbox(legacy);

        expect(normalized.grid_x).toBe(5);
        expect(normalized.grid_y).toBe(10);
        expect(normalized.grid_width).toBe(4);
        expect(normalized.grid_height).toBe(2);
        expect(normalized.font_size).toBe(16);
        expect(normalized.alignment).toBe('right');
        expect(normalized.vertical_alignment).toBe('bottom');
    });

    test('applies default values', () => {
        const minimal = { grid_x: 0, grid_y: 0, grid_width: 1, grid_height: 1 };
        const normalized = normalizeTextbox(minimal);

        expect(normalized.text).toBe('');
        expect(normalized.font_size).toBe(20);
        expect(normalized.alignment).toBe('left');
        expect(normalized.vertical_alignment).toBe('top');
        expect(normalized.scroll_offset).toBe(0);
    });

    test('preserves scroll_offset', () => {
        const textbox = {
            grid_x: 0, grid_y: 0, grid_width: 1, grid_height: 1,
            scroll_offset: 50
        };
        const normalized = normalizeTextbox(textbox);
        expect(normalized.scroll_offset).toBe(50);
    });
});


describe('isDescriptionOnly', () => {
    test('returns true for text starting with |', () => {
        expect(isDescriptionOnly('| Open to Main Gym |')).toBe(true);
        expect(isDescriptionOnly('|Description')).toBe(true);
    });

    test('returns true for text with whitespace before |', () => {
        expect(isDescriptionOnly('  | Open to Main Gym |')).toBe(true);
    });

    test('returns false for normal text', () => {
        expect(isDescriptionOnly('Room 101')).toBe(false);
        expect(isDescriptionOnly('Mr. Smith\n#114')).toBe(false);
    });

    test('returns false for empty or null text', () => {
        expect(isDescriptionOnly('')).toBe(false);
        expect(isDescriptionOnly(null)).toBe(false);
        expect(isDescriptionOnly(undefined)).toBe(false);
    });

    test('only checks first line', () => {
        expect(isDescriptionOnly('Room 101\n| description')).toBe(false);
        expect(isDescriptionOnly('| Header\nBody text')).toBe(true);
    });
});
