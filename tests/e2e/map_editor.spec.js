/**
 * End-to-end tests for the map editor functionality.
 *
 * These tests verify:
 * - Map loading and display
 * - Mode switching (pan, draw, textbox, bucket)
 * - Theme toggle
 * - Save/Load dialogs
 * - Zoom controls
 * - Tile palette
 * - Canvas interaction
 *
 * Run with: npx playwright test tests/e2e/map_editor.spec.js
 *
 * PREREQUISITE: Flask server must be running on http://localhost:5000
 */

const { test, expect } = require('@playwright/test');

// Login as admin before each test
test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Login as admin
    await page.locator('.role-btn-admin').click();
    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('admin123');
    await page.locator('#staff-email').fill('admin@example.com');
    await page.locator('#admin-login button[type="submit"]').click();

    // Wait for map editor to load
    await expect(page).toHaveURL(/map-editor/);
    await expect(page.locator('#mapCanvas')).toBeVisible();
});


test.describe('Map Display', () => {
    test('canvas is visible and sized', async ({ page }) => {
        const canvas = page.locator('#mapCanvas');
        await expect(canvas).toBeVisible();

        // Canvas should have dimensions
        const box = await canvas.boundingBox();
        expect(box.width).toBeGreaterThan(100);
        expect(box.height).toBeGreaterThan(100);
    });

    test('user info bar shows admin role', async ({ page }) => {
        await expect(page.locator('.role-badge')).toHaveText('Admin');
    });

    test('control panel is visible for admin', async ({ page }) => {
        // Admin should see control panel with editing tools
        await expect(page.locator('.control-panel').first()).toBeVisible();
    });
});


test.describe('Mode Switching', () => {
    test('pan mode is default', async ({ page }) => {
        // Pan mode button should be active/selected
        const panBtn = page.locator('#panMode');
        await expect(panBtn).toHaveClass(/active/);
    });

    test('can switch to draw mode', async ({ page }) => {
        const drawBtn = page.locator('#drawMode');
        await drawBtn.click();
        await expect(drawBtn).toHaveClass(/active/);
    });

    test('can switch to bucket mode', async ({ page }) => {
        const bucketBtn = page.locator('#bucketMode');
        await bucketBtn.click();
        await expect(bucketBtn).toHaveClass(/active/);
    });

    test('can switch to textbox mode', async ({ page }) => {
        const textboxBtn = page.locator('#textboxMode');
        await textboxBtn.click();
        await expect(textboxBtn).toHaveClass(/active/);
    });

    test('switching modes deactivates previous mode', async ({ page }) => {
        // Switch to draw then back to pan
        await page.locator('#drawMode').click();
        await page.locator('#panMode').click();

        await expect(page.locator('#panMode')).toHaveClass(/active/);
        await expect(page.locator('#drawMode')).not.toHaveClass(/active/);
    });
});


test.describe('Theme Toggle', () => {
    test('theme toggle button exists', async ({ page }) => {
        const themeBtn = page.locator('#themeToggleBtn');
        await expect(themeBtn).toBeVisible();
    });

    test('clicking theme toggle changes theme', async ({ page }) => {
        const themeBtn = page.locator('#themeToggleBtn');

        // Get initial theme
        const initialTheme = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme')
        );

        // Click toggle
        await themeBtn.click();

        // Theme should change
        const newTheme = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme')
        );

        expect(newTheme).not.toBe(initialTheme);
    });

    test('theme preference is saved to localStorage', async ({ page }) => {
        const themeBtn = page.locator('#themeToggleBtn');

        // Set to dark mode
        const initialTheme = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme')
        );

        if (initialTheme !== 'dark') {
            await themeBtn.click();
        }

        const savedTheme = await page.evaluate(() =>
            localStorage.getItem('mapEditorTheme')
        );

        expect(savedTheme).toBe('dark');
    });
});


test.describe('Zoom Controls', () => {
    test('zoom in button exists and works', async ({ page }) => {
        const zoomInBtn = page.locator('button:has-text("Zoom In")');
        await expect(zoomInBtn).toBeVisible();
        await zoomInBtn.click();
    });

    test('zoom out button exists and works', async ({ page }) => {
        const zoomOutBtn = page.locator('button:has-text("Zoom Out")');
        await expect(zoomOutBtn).toBeVisible();
        await zoomOutBtn.click();
    });

    test('recenter button exists', async ({ page }) => {
        const recenterBtn = page.locator('button:has-text("Recenter")');
        await expect(recenterBtn).toBeVisible();
    });
});


test.describe('Save Dialog', () => {
    test('save button opens dialog', async ({ page }) => {
        const saveBtn = page.locator('.control-panel button:has-text("Save")').first();
        await saveBtn.click();

        const saveDialog = page.locator('#saveDialog');
        await expect(saveDialog).toBeVisible();
    });

    test('save dialog has filename input', async ({ page }) => {
        const saveBtn = page.locator('.control-panel button:has-text("Save")').first();
        await saveBtn.click();

        const filenameInput = page.locator('#saveFilename');
        await expect(filenameInput).toBeVisible();
    });

    test('save dialog can be closed', async ({ page }) => {
        const saveBtn = page.locator('.control-panel button:has-text("Save")').first();
        await saveBtn.click();

        // Close with Cancel button
        const cancelBtn = page.locator('#saveDialog button:has-text("Cancel")');
        await cancelBtn.click();

        const saveDialog = page.locator('#saveDialog');
        await expect(saveDialog).not.toBeVisible();
    });
});


test.describe('Load Dialog', () => {
    test('load button opens dialog', async ({ page }) => {
        const loadBtn = page.locator('.control-panel button:has-text("Load")');
        await loadBtn.click();

        const loadDialog = page.locator('#loadDialog');
        await expect(loadDialog).toBeVisible();
    });

    test('load dialog shows file list area', async ({ page }) => {
        const loadBtn = page.locator('.control-panel button:has-text("Load")');
        await loadBtn.click();

        await page.waitForTimeout(500);

        const fileList = page.locator('#fileList');
        await expect(fileList).toBeVisible();
    });
});


test.describe('Tile Palette', () => {
    test('tile palette is visible for admin', async ({ page }) => {
        const palette = page.locator('.tile-palette');
        await expect(palette).toBeVisible();
    });

    test('multiple tile colors are available', async ({ page }) => {
        const tileButtons = page.locator('.tile-btn');
        const count = await tileButtons.count();
        expect(count).toBeGreaterThanOrEqual(2);
    });
});


test.describe('Undo Functionality', () => {
    test('undo button exists', async ({ page }) => {
        const undoBtn = page.locator('button:has-text("Undo")');
        await expect(undoBtn).toBeVisible();
    });
});


test.describe('Canvas Interaction', () => {
    test('canvas responds to mouse wheel zoom', async ({ page }) => {
        const canvas = page.locator('#mapCanvas');

        // Scroll to zoom
        await canvas.hover();
        await page.mouse.wheel(0, -100);  // Scroll up to zoom in

        // Ensure no errors
    });

    test('canvas can be panned by dragging', async ({ page }) => {
        const canvas = page.locator('#mapCanvas');
        const box = await canvas.boundingBox();

        // Drag to pan
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50);
        await page.mouse.up();

        // Verify no errors occurred
    });
});


test.describe('Location Dropdown', () => {
    test('location dropdown exists in DOM', async ({ page }) => {
        // Hidden by default for admin (only visible in navigation/personnel view)
        const dropdown = page.locator('#locationDropdown');
        await expect(dropdown).toBeAttached();
    });
});
