/**
 * Jest setup file for WBMapApp frontend tests.
 *
 * This file runs before each test file and sets up the testing environment.
 * It mocks browser APIs that aren't available in Node.js (Canvas, localStorage, etc.)
 *
 * Run tests with: npm test
 */

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: jest.fn(key => localStorageMock.store[key] || null),
    setItem: jest.fn((key, value) => {
        localStorageMock.store[key] = String(value);
    }),
    removeItem: jest.fn(key => {
        delete localStorageMock.store[key];
    }),
    clear: jest.fn(() => {
        localStorageMock.store = {};
    })
};
global.localStorage = localStorageMock;

// Mock sessionStorage (same interface as localStorage)
global.sessionStorage = { ...localStorageMock, store: {} };

// Mock window.matchMedia for theme detection
global.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
}));

// Mock Canvas API
const createMockContext = () => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: [] })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    fillText: jest.fn(),
    strokeText: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    arc: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
    quadraticCurveTo: jest.fn(),
    bezierCurveTo: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    translate: jest.fn(),
    transform: jest.fn(),
    getTransform: jest.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
    resetTransform: jest.fn(),
    createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn()
    })),
    createRadialGradient: jest.fn(() => ({
        addColorStop: jest.fn()
    })),
    createPattern: jest.fn(),
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over'
});

// Mock HTMLCanvasElement
const canvasMock = {
    getContext: jest.fn(() => createMockContext()),
    width: 800,
    height: 600,
    style: {},
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getBoundingClientRect: jest.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600
    }))
};

// Mock document.getElementById for canvas
const originalGetElementById = document.getElementById.bind(document);
document.getElementById = jest.fn(id => {
    if (id === 'mapCanvas') {
        return canvasMock;
    }
    return originalGetElementById(id);
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Clear all mocks after each test
afterEach(() => {
    jest.clearAllMocks();
    localStorageMock.store = {};
});

// Increase timeout for slower tests
jest.setTimeout(10000);
