/**
 * Tests for the A* Pathfinding algorithm.
 *
 * The pathfinder finds the shortest path between two points on the map,
 * only traversing walkable tiles (type 3 = hallway, type 5 = doorway).
 *
 * Run with: npm test -- tests/frontend/test_pathfinder.js
 */

// ============================================
// Mock the isWalkableTile function (defined in map_core.js)
// ============================================

// Tile types:
// 0 = empty, 1 = WB Blue, 2 = Orange, 3 = Hallway (walkable), 4 = Wall, 5 = Doorway (walkable)
function isWalkableTile(tileType) {
    return tileType === 3 || tileType === 5;
}

// Make isWalkableTile globally available (simulates map_core.js being loaded first)
global.isWalkableTile = isWalkableTile;

// ============================================
// Copy of AStarPathfinder class from map_pathfinder.js
// In a real setup, you'd use module exports, but since the codebase
// uses global variables, we copy the class here for testing.
// ============================================

class AStarPathfinder {
    constructor(mapDataArray) {
        this.map = mapDataArray;
        this.width = mapDataArray[0] ? mapDataArray[0].length : 0;
        this.height = mapDataArray.length;
    }

    // Heuristic: Manhattan distance
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    // Binary search insert to maintain sorted order (by f score)
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
    getNeighbors(node) {
        const dirs = [
            { x: 0, y: -1 },  // up
            { x: 1, y: 0 },   // right
            { x: 0, y: 1 },   // down
            { x: -1, y: 0 }   // left
        ];
        const neighbors = [];

        for (const dir of dirs) {
            const nx = node.x + dir.x;
            const ny = node.y + dir.y;

            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                if (this.map[ny] && isWalkableTile(this.map[ny][nx])) {
                    neighbors.push({ x: nx, y: ny });
                }
            }
        }
        return neighbors;
    }

    // Find path using A* algorithm
    findPath(start, end) {
        if (!start || !end) return null;

        const startX = Math.floor(start.x);
        const startY = Math.floor(start.y);
        const endX = Math.floor(end.x);
        const endY = Math.floor(end.y);

        if (startX < 0 || startX >= this.width || startY < 0 || startY >= this.height) return null;
        if (endX < 0 || endX >= this.width || endY < 0 || endY >= this.height) return null;
        if (!this.map[startY] || !isWalkableTile(this.map[startY][startX])) return null;
        if (!this.map[endY] || !isWalkableTile(this.map[endY][endX])) return null;

        const openSet = [{ x: startX, y: startY, g: 0, f: this.heuristic({x: startX, y: startY}, {x: endX, y: endY}) }];
        const openSetKeys = new Set([`${startX},${startY}`]);
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();

        gScore.set(`${startX},${startY}`, 0);
        const endPos = { x: endX, y: endY };

        while (openSet.length > 0) {
            const current = openSet.shift();
            const currentKey = `${current.x},${current.y}`;

            if (current.x === endX && current.y === endY) {
                return this.reconstructPath(cameFrom, current);
            }

            closedSet.add(currentKey);
            openSetKeys.delete(currentKey);

            for (const neighbor of this.getNeighbors(current)) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;

                if (closedSet.has(neighborKey)) continue;

                const tentativeG = gScore.get(currentKey) + 1;

                if (!gScore.has(neighborKey) || tentativeG < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeG);

                    const f = tentativeG + this.heuristic(neighbor, endPos);

                    if (!openSetKeys.has(neighborKey)) {
                        this.insertSorted(openSet, { ...neighbor, g: tentativeG, f });
                        openSetKeys.add(neighborKey);
                    }
                }
            }
        }

        return null;
    }

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
// TESTS
// ============================================

describe('isWalkableTile', () => {
    test('tile type 3 (hallway) is walkable', () => {
        expect(isWalkableTile(3)).toBe(true);
    });

    test('tile type 5 (doorway) is walkable', () => {
        expect(isWalkableTile(5)).toBe(true);
    });

    test('tile type 0 (empty) is not walkable', () => {
        expect(isWalkableTile(0)).toBe(false);
    });

    test('tile type 1 (WB Blue) is not walkable', () => {
        expect(isWalkableTile(1)).toBe(false);
    });

    test('tile type 4 (wall) is not walkable', () => {
        expect(isWalkableTile(4)).toBe(false);
    });
});


describe('AStarPathfinder', () => {
    describe('constructor', () => {
        test('initializes with map dimensions', () => {
            const map = [
                [0, 0, 0],
                [0, 3, 0],
                [0, 0, 0]
            ];
            const pathfinder = new AStarPathfinder(map);
            expect(pathfinder.width).toBe(3);
            expect(pathfinder.height).toBe(3);
        });

        test('handles empty map', () => {
            const pathfinder = new AStarPathfinder([]);
            expect(pathfinder.width).toBe(0);
            expect(pathfinder.height).toBe(0);
        });
    });

    describe('heuristic', () => {
        test('calculates Manhattan distance correctly', () => {
            const pathfinder = new AStarPathfinder([[0]]);
            expect(pathfinder.heuristic({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
            expect(pathfinder.heuristic({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
            expect(pathfinder.heuristic({ x: 0, y: 0 }, { x: 5, y: 0 })).toBe(5);
        });
    });

    describe('insertSorted', () => {
        test('inserts item in sorted position by f score', () => {
            const pathfinder = new AStarPathfinder([[0]]);
            const arr = [{ f: 1 }, { f: 3 }, { f: 5 }];
            pathfinder.insertSorted(arr, { f: 2 });
            expect(arr.map(i => i.f)).toEqual([1, 2, 3, 5]);
        });

        test('inserts at beginning for lowest f score', () => {
            const pathfinder = new AStarPathfinder([[0]]);
            const arr = [{ f: 2 }, { f: 3 }];
            pathfinder.insertSorted(arr, { f: 1 });
            expect(arr.map(i => i.f)).toEqual([1, 2, 3]);
        });

        test('inserts at end for highest f score', () => {
            const pathfinder = new AStarPathfinder([[0]]);
            const arr = [{ f: 1 }, { f: 2 }];
            pathfinder.insertSorted(arr, { f: 5 });
            expect(arr.map(i => i.f)).toEqual([1, 2, 5]);
        });
    });

    describe('getNeighbors', () => {
        test('returns walkable neighbors only', () => {
            // Map: center is walkable (3), surrounded by walls (4) except right (3)
            const map = [
                [4, 4, 4],
                [4, 3, 3],  // center (1,1) has one walkable neighbor (2,1)
                [4, 4, 4]
            ];
            const pathfinder = new AStarPathfinder(map);
            const neighbors = pathfinder.getNeighbors({ x: 1, y: 1 });
            expect(neighbors).toHaveLength(1);
            expect(neighbors[0]).toEqual({ x: 2, y: 1 });
        });

        test('returns all four neighbors when all are walkable', () => {
            const map = [
                [0, 3, 0],
                [3, 3, 3],  // center has 4 walkable neighbors
                [0, 3, 0]
            ];
            const pathfinder = new AStarPathfinder(map);
            const neighbors = pathfinder.getNeighbors({ x: 1, y: 1 });
            expect(neighbors).toHaveLength(4);
        });

        test('respects map boundaries', () => {
            const map = [
                [3, 3],
                [3, 3]
            ];
            const pathfinder = new AStarPathfinder(map);
            // Corner position (0,0) should only have 2 neighbors
            const neighbors = pathfinder.getNeighbors({ x: 0, y: 0 });
            expect(neighbors).toHaveLength(2);
        });
    });

    describe('findPath', () => {
        test('finds straight-line path', () => {
            // Horizontal hallway
            const map = [
                [0, 0, 0, 0, 0],
                [3, 3, 3, 3, 3],  // walkable hallway
                [0, 0, 0, 0, 0]
            ];
            const pathfinder = new AStarPathfinder(map);
            const path = pathfinder.findPath({ x: 0, y: 1 }, { x: 4, y: 1 });

            expect(path).not.toBeNull();
            expect(path).toHaveLength(5);
            expect(path[0]).toEqual({ x: 0, y: 1 });
            expect(path[4]).toEqual({ x: 4, y: 1 });
        });

        test('finds path around obstacle', () => {
            // Path must go around wall
            const map = [
                [3, 3, 3],
                [0, 4, 3],  // wall in middle
                [3, 3, 3]
            ];
            const pathfinder = new AStarPathfinder(map);
            const path = pathfinder.findPath({ x: 0, y: 0 }, { x: 0, y: 2 });

            expect(path).not.toBeNull();
            // Must go around: (0,0) -> (1,0) -> (2,0) -> (2,1) -> (2,2) -> (1,2) -> (0,2)
            expect(path.length).toBeGreaterThan(3);
            expect(path[0]).toEqual({ x: 0, y: 0 });
            expect(path[path.length - 1]).toEqual({ x: 0, y: 2 });
        });

        test('returns null when no path exists', () => {
            // Start and end are completely blocked
            const map = [
                [3, 4, 3],
                [4, 4, 4],  // wall blocks path
                [3, 4, 3]
            ];
            const pathfinder = new AStarPathfinder(map);
            const path = pathfinder.findPath({ x: 0, y: 0 }, { x: 2, y: 2 });
            expect(path).toBeNull();
        });

        test('returns null for non-walkable start', () => {
            const map = [
                [0, 3, 3],
                [0, 3, 3],
                [0, 3, 3]
            ];
            const pathfinder = new AStarPathfinder(map);
            const path = pathfinder.findPath({ x: 0, y: 0 }, { x: 2, y: 2 });
            expect(path).toBeNull();
        });

        test('returns null for non-walkable end', () => {
            const map = [
                [3, 3, 0],
                [3, 3, 0],
                [3, 3, 0]
            ];
            const pathfinder = new AStarPathfinder(map);
            const path = pathfinder.findPath({ x: 0, y: 0 }, { x: 2, y: 2 });
            expect(path).toBeNull();
        });

        test('returns null for out-of-bounds start', () => {
            const map = [[3, 3], [3, 3]];
            const pathfinder = new AStarPathfinder(map);
            expect(pathfinder.findPath({ x: -1, y: 0 }, { x: 1, y: 1 })).toBeNull();
            expect(pathfinder.findPath({ x: 5, y: 0 }, { x: 1, y: 1 })).toBeNull();
        });

        test('returns null for null start or end', () => {
            const map = [[3, 3], [3, 3]];
            const pathfinder = new AStarPathfinder(map);
            expect(pathfinder.findPath(null, { x: 1, y: 1 })).toBeNull();
            expect(pathfinder.findPath({ x: 0, y: 0 }, null)).toBeNull();
        });

        test('handles doorway tiles (type 5)', () => {
            // Doorway connects two rooms
            const map = [
                [3, 3, 5, 3, 3],  // 5 is a doorway
                [0, 0, 0, 0, 0]
            ];
            const pathfinder = new AStarPathfinder(map);
            const path = pathfinder.findPath({ x: 0, y: 0 }, { x: 4, y: 0 });

            expect(path).not.toBeNull();
            expect(path).toHaveLength(5);
            // Path should include the doorway tile
            expect(path.some(p => p.x === 2 && p.y === 0)).toBe(true);
        });

        test('finds optimal path (shortest)', () => {
            // There are multiple paths, but A* should find optimal
            const map = [
                [3, 3, 3, 3, 3],
                [3, 4, 4, 4, 3],
                [3, 3, 3, 3, 3]
            ];
            const pathfinder = new AStarPathfinder(map);
            const path = pathfinder.findPath({ x: 0, y: 0 }, { x: 4, y: 0 });

            // Optimal: straight across top (5 tiles)
            expect(path).toHaveLength(5);
        });

        test('handles floating point coordinates by flooring', () => {
            const map = [
                [3, 3, 3],
                [3, 3, 3],
                [3, 3, 3]
            ];
            const pathfinder = new AStarPathfinder(map);
            // 1.7 should be floored to 1
            const path = pathfinder.findPath({ x: 0.5, y: 0.5 }, { x: 1.7, y: 1.9 });

            expect(path).not.toBeNull();
            expect(path[0]).toEqual({ x: 0, y: 0 });
            expect(path[path.length - 1]).toEqual({ x: 1, y: 1 });
        });
    });

    describe('reconstructPath', () => {
        test('reconstructs path in correct order', () => {
            const pathfinder = new AStarPathfinder([[3]]);
            const cameFrom = new Map();
            cameFrom.set('1,1', { x: 1, y: 0 });
            cameFrom.set('1,0', { x: 0, y: 0 });

            const path = pathfinder.reconstructPath(cameFrom, { x: 1, y: 1 });
            expect(path).toEqual([
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 }
            ]);
        });
    });
});
