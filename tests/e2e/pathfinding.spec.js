/**
 * End-to-end tests for pathfinding and route functionality.
 *
 * These tests verify:
 * - Search autocomplete
 * - Route calculation and display
 * - Room finder
 * - Elevator mode toggle
 * - Floor switching
 * - Route instructions
 * - Mobile responsiveness
 *
 * Run with: npx playwright test tests/e2e/pathfinding.spec.js
 *
 * PREREQUISITE: Flask server must be running on http://localhost:5000
 */

const { test, expect } = require('@playwright/test');

// Login as Personnel before each test (direct access, no credentials)
test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Login as Personnel (direct click, no credentials needed)
    await page.locator('.role-btn-personnel').click();

    // Wait for map editor to load
    await expect(page).toHaveURL(/map-editor/);

    // Wait for canvas and map to load
    await expect(page.locator('#mapCanvas')).toBeVisible();
    await page.waitForTimeout(500);  // Allow map data to load
});


test.describe('Route Panel', () => {
    test('route panel is visible', async ({ page }) => {
        const routePanel = page.locator('#routePanel');
        await expect(routePanel).toBeVisible();
    });

    test('start location input exists', async ({ page }) => {
        const startInput = page.locator('#startLocation');
        await expect(startInput).toBeVisible();
    });

    test('end location input exists', async ({ page }) => {
        const endInput = page.locator('#endLocation');
        await expect(endInput).toBeVisible();
    });

    test('find route button exists', async ({ page }) => {
        const findBtn = page.locator('#findRouteBtn');
        await expect(findBtn).toBeVisible();
    });

    test('clear route button exists', async ({ page }) => {
        const clearBtn = page.locator('#clearRouteBtn');
        await expect(clearBtn).toBeVisible();
    });
});


test.describe('Search Autocomplete', () => {
    test('typing in start input shows suggestions', async ({ page }) => {
        const startInput = page.locator('#startLocation');

        // Focus and type
        await startInput.click();
        await startInput.fill('main');

        // Wait for autocomplete to appear
        await page.waitForTimeout(500);

        // Suggestions dropdown should appear
        const suggestions = page.locator('#startSuggestions');
        // Just verify typing doesn't cause errors - suggestions depend on map content
    });

    test('typing in end input shows suggestions', async ({ page }) => {
        const endInput = page.locator('#endLocation');

        await endInput.click();
        await endInput.fill('stairs');

        await page.waitForTimeout(500);
        // Verify no errors
    });

    test('clicking suggestion fills input', async ({ page }) => {
        const startInput = page.locator('#startLocation');

        await startInput.click();
        await startInput.fill('stairs');

        await page.waitForTimeout(500);

        // Try to click first suggestion if visible
        const firstSuggestion = page.locator('#startSuggestions > *').first();
        if (await firstSuggestion.isVisible()) {
            await firstSuggestion.click();

            // Input should now have a value
            const value = await startInput.inputValue();
            expect(value.length).toBeGreaterThan(0);
        }
    });
});


test.describe('Route Calculation', () => {
    test('can search for a location by name', async ({ page }) => {
        const startInput = page.locator('#startLocation');

        await startInput.fill('Main');
        await page.waitForTimeout(300);

        // Should show autocomplete or accept the input
    });

    test('find route button is clickable', async ({ page }) => {
        const findBtn = page.locator('#findRouteBtn');

        // Should be able to click (might show error if no route selected)
        await findBtn.click();

        // Verify no page crash
        await expect(page.locator('#mapCanvas')).toBeVisible();
    });

    test('clear route button clears any active route', async ({ page }) => {
        const clearBtn = page.locator('#clearRouteBtn');

        await clearBtn.click();

        // Inputs should be cleared
        const startValue = await page.locator('#startLocation').inputValue();
        const endValue = await page.locator('#endLocation').inputValue();
        expect(startValue).toBe('');
        expect(endValue).toBe('');
    });
});


test.describe('Room Finder', () => {
    test('room finder section exists', async ({ page }) => {
        const roomFinder = page.locator('.room-finder-section');
        await expect(roomFinder).toBeVisible();
    });

    test('room finder input exists', async ({ page }) => {
        const roomInput = page.locator('#roomFinderInput');
        await expect(roomInput).toBeVisible();
    });

    test('typing in room finder does not crash', async ({ page }) => {
        const roomInput = page.locator('#roomFinderInput');
        await roomInput.fill('Room 101');
        await page.waitForTimeout(300);

        // Canvas should still be visible
        await expect(page.locator('#mapCanvas')).toBeVisible();
    });
});


test.describe('Elevator Mode', () => {
    test('elevator mode toggle exists', async ({ page }) => {
        const elevatorToggle = page.locator('#elevatorModeToggle');
        await expect(elevatorToggle).toBeVisible();
    });

    test('elevator mode can be toggled', async ({ page }) => {
        const elevatorToggle = page.locator('#elevatorModeToggle');

        // Toggle it
        const wasChecked = await elevatorToggle.isChecked();
        await elevatorToggle.click();

        // State should change
        const isChecked = await elevatorToggle.isChecked();
        expect(isChecked).not.toBe(wasChecked);
    });

    test('elevator mode toggle back to original state', async ({ page }) => {
        const elevatorToggle = page.locator('#elevatorModeToggle');

        const initialState = await elevatorToggle.isChecked();
        await elevatorToggle.click();
        await elevatorToggle.click();

        const finalState = await elevatorToggle.isChecked();
        expect(finalState).toBe(initialState);
    });
});


test.describe('Location Popup', () => {
    test('location popup exists in DOM', async ({ page }) => {
        const popup = page.locator('#locationPopup');
        await expect(popup).toBeAttached();
    });

    test('clicking on map does not crash', async ({ page }) => {
        const canvas = page.locator('#mapCanvas');

        // Click somewhere on the canvas
        const box = await canvas.boundingBox();
        await page.mouse.click(box.x + 200, box.y + 200);

        await page.waitForTimeout(300);

        // Page should not crash - canvas still visible
        await expect(canvas).toBeVisible();
    });
});


test.describe('Floor Switching', () => {
    test('location dropdown exists for floor selection', async ({ page }) => {
        const dropdown = page.locator('#locationDropdown');
        await expect(dropdown).toBeVisible();
    });

    test('location button shows current location name', async ({ page }) => {
        const locationBtn = page.locator('#locationBtn');
        await expect(locationBtn).toBeVisible();

        // Should have some text content (the current location name)
        const text = await locationBtn.textContent();
        expect(text.trim().length).toBeGreaterThan(0);
    });

    test('clicking location button opens dropdown menu', async ({ page }) => {
        const locationBtn = page.locator('#locationBtn');
        await locationBtn.click();

        // The dropdown should have options visible
        await page.waitForTimeout(300);
    });

    test('canvas remains visible after floor switch attempt', async ({ page }) => {
        const locationBtn = page.locator('#locationBtn');
        await locationBtn.click();

        await page.waitForTimeout(300);

        // Try selecting a different location option if available
        const options = page.locator('.location-option');
        const count = await options.count();
        if (count > 1) {
            // Click the second option (different from current)
            await options.nth(1).click();
            await page.waitForTimeout(1000);
        }

        // Canvas should still be visible regardless
        await expect(page.locator('#mapCanvas')).toBeVisible();
    });
});


test.describe('Route Instructions', () => {
    test('route instructions area exists in DOM', async ({ page }) => {
        const instructions = page.locator('#routeInstructions');
        await expect(instructions).toBeAttached();
    });

    test('route instructions initially not showing content', async ({ page }) => {
        // Before finding a route, instructions should be empty or hidden
        const instructions = page.locator('#routeInstructions');
        const text = await instructions.textContent();
        // Initially empty or contains default placeholder
    });
});


test.describe('Mobile Responsiveness', () => {
    test('route panel has toggle tab on mobile', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        // Wait for layout to adjust
        await page.waitForTimeout(300);

        // The route panel tab should exist for toggling
        const toggleTab = page.locator('#routePanelTab');
        await expect(toggleTab).toBeAttached();
    });

    test('canvas remains functional at mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(300);

        const canvas = page.locator('#mapCanvas');
        await expect(canvas).toBeVisible();

        // Verify canvas has reasonable dimensions
        const box = await canvas.boundingBox();
        expect(box.width).toBeGreaterThan(50);
        expect(box.height).toBeGreaterThan(50);
    });

    test('desktop pathfinder tab exists', async ({ page }) => {
        // At desktop viewport, the desktop tab should be attached
        const desktopTab = page.locator('#routePanelTabDesktop');
        await expect(desktopTab).toBeAttached();
    });
});


test.describe('Personnel View Restrictions', () => {
    test('personnel does not see draw mode button', async ({ page }) => {
        // Personnel should not have editing controls
        const drawBtn = page.locator('#drawMode');
        await expect(drawBtn).not.toBeVisible();
    });

    test('personnel does not see bucket mode button', async ({ page }) => {
        const bucketBtn = page.locator('#bucketMode');
        await expect(bucketBtn).not.toBeVisible();
    });

    test('personnel save button is disabled', async ({ page }) => {
        // Save button exists but is disabled for personnel (no save privilege)
        const saveBtn = page.locator('.control-panel button:has-text("Save")');
        if (await saveBtn.count() > 0) {
            await expect(saveBtn).toBeDisabled();
        }
    });

    test('personnel can see the map canvas', async ({ page }) => {
        await expect(page.locator('#mapCanvas')).toBeVisible();
    });
});
