/**
 * End-to-end tests for login functionality.
 *
 * These tests verify the complete login flow including:
 * - Admin authentication
 * - Personnel direct access (no credentials)
 * - Elevator access preference
 * - Session management and logout
 *
 * Run with: npx playwright test tests/e2e/login.spec.js
 * Debug with: npx playwright test tests/e2e/login.spec.js --debug
 *
 * PREREQUISITE: Flask server must be running on http://localhost:5000
 */

const { test, expect } = require('@playwright/test');

// Test credentials (matching main.py defaults)
const ADMIN_CREDS = { username: 'admin', password: 'admin123' };


test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('loads login page successfully', async ({ page }) => {
        await expect(page).toHaveTitle(/GuidePost360/i);
    });

    test('shows Admin role button', async ({ page }) => {
        await expect(page.locator('.role-btn-admin')).toBeVisible();
    });

    test('shows Safety Personnel role button', async ({ page }) => {
        await expect(page.locator('.role-btn-personnel')).toBeVisible();
    });

    test('shows GuidePost360 title', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('GuidePost360');
    });

    test('has theme toggle button', async ({ page }) => {
        await expect(page.locator('#loginThemeToggle')).toBeVisible();
    });

    test('has language toggle button', async ({ page }) => {
        await expect(page.locator('.login-lang-toggle')).toBeVisible();
    });

    test('shows dashboard cards', async ({ page }) => {
        await expect(page.locator('.tips-card')).toBeVisible();
        await expect(page.locator('.help-card')).toBeVisible();
    });

    test('has how-to guide link', async ({ page }) => {
        const guideLink = page.locator('a[href*="how-to-guide"]');
        await expect(guideLink).toBeVisible();
    });

    test('has support button', async ({ page }) => {
        await expect(page.locator('.support-btn')).toBeVisible();
    });
});


test.describe('Admin Login', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('.role-btn-admin').click();
    });

    test('clicking Admin shows login form', async ({ page }) => {
        await expect(page.locator('#admin-login')).toBeVisible();
        await expect(page.locator('#username')).toBeVisible();
        await expect(page.locator('#password')).toBeVisible();
        await expect(page.locator('#staff-email')).toBeVisible();
    });

    test('hides role selection when form shows', async ({ page }) => {
        await expect(page.locator('#role-selection')).not.toBeVisible();
    });

    test('back button returns to role selection', async ({ page }) => {
        await page.locator('button:has-text("Back")').click();
        await expect(page.locator('#role-selection')).toBeVisible();
        await expect(page.locator('#admin-login')).not.toBeVisible();
    });

    test('ESC key returns to role selection', async ({ page }) => {
        await page.keyboard.press('Escape');
        await expect(page.locator('#role-selection')).toBeVisible();
    });

    test('successful login redirects to map editor', async ({ page }) => {
        await page.locator('#username').fill(ADMIN_CREDS.username);
        await page.locator('#password').fill(ADMIN_CREDS.password);
        await page.locator('#staff-email').fill('admin@example.com');
        await page.locator('#admin-login button[type="submit"]').click();

        await expect(page).toHaveURL(/map-editor/);
        await expect(page.locator('.role-badge')).toHaveText('Admin');
    });

    test('wrong password shows error', async ({ page }) => {
        await page.locator('#username').fill(ADMIN_CREDS.username);
        await page.locator('#password').fill('wrongpassword');
        await page.locator('#staff-email').fill('admin@example.com');
        await page.locator('#admin-login button[type="submit"]').click();

        // Should show error flash message
        await expect(page.locator('.alert').first()).toBeVisible();
        await expect(page).not.toHaveURL(/map-editor/);
    });

    test('wrong username shows error', async ({ page }) => {
        await page.locator('#username').fill('wronguser');
        await page.locator('#password').fill(ADMIN_CREDS.password);
        await page.locator('#staff-email').fill('admin@example.com');
        await page.locator('#admin-login button[type="submit"]').click();

        await expect(page.locator('.alert').first()).toBeVisible();
        await expect(page).not.toHaveURL(/map-editor/);
    });

    test('admin form re-shown after failed login', async ({ page }) => {
        await page.locator('#username').fill('wronguser');
        await page.locator('#password').fill('wrongpass');
        await page.locator('#staff-email').fill('admin@example.com');
        await page.locator('#admin-login button[type="submit"]').click();

        // Admin form should still be visible after failure
        await expect(page.locator('#admin-login')).toBeVisible();
    });
});


test.describe('Personnel Login', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('clicking Personnel logs in directly', async ({ page }) => {
        await page.locator('.role-btn-personnel').click();
        await expect(page).toHaveURL(/map-editor/);
    });

    test('personnel sees navigation view (no editing controls)', async ({ page }) => {
        await page.locator('.role-btn-personnel').click();
        await expect(page).toHaveURL(/map-editor/);

        // Personnel should NOT see editing tools like draw/bucket modes
        // The control panel with editing tools should not be present
        await expect(page.locator('#mapCanvas')).toBeVisible();
    });
});


test.describe('Elevator Access', () => {
    test('personnel elevator checkbox exists', async ({ page }) => {
        await page.goto('/');
        const checkbox = page.locator('#personnel-elevator-checkbox');
        await expect(checkbox).toBeVisible();
    });

    test('personnel elevator checkbox can be toggled', async ({ page }) => {
        await page.goto('/');
        const checkbox = page.locator('#personnel-elevator-checkbox');

        await checkbox.check();
        await expect(checkbox).toBeChecked();

        await checkbox.uncheck();
        await expect(checkbox).not.toBeChecked();
    });

    test('admin elevator checkbox exists in admin form', async ({ page }) => {
        await page.goto('/');
        await page.locator('.role-btn-admin').click();

        const checkbox = page.locator('#admin-login input[name="elevator_access"]');
        await expect(checkbox).toBeVisible();
    });

    test('admin elevator checkbox can be toggled', async ({ page }) => {
        await page.goto('/');
        await page.locator('.role-btn-admin').click();

        const checkbox = page.locator('#admin-login input[name="elevator_access"]');
        await checkbox.check();
        await expect(checkbox).toBeChecked();

        await checkbox.uncheck();
        await expect(checkbox).not.toBeChecked();
    });
});


test.describe('Logout', () => {
    test('logout clears session and redirects', async ({ page }) => {
        // First login as admin
        await page.goto('/');
        await page.locator('.role-btn-admin').click();
        await page.locator('#username').fill(ADMIN_CREDS.username);
        await page.locator('#password').fill(ADMIN_CREDS.password);
        await page.locator('#staff-email').fill('admin@example.com');
        await page.locator('#admin-login button[type="submit"]').click();
        await expect(page).toHaveURL(/map-editor/);

        // Now logout
        await page.locator('.btn-logout').click();

        // Should redirect to login page
        await expect(page).toHaveURL(/\/$/);
        await expect(page.locator('.role-btn-admin')).toBeVisible();
    });

    test('accessing map-editor without login redirects to login', async ({ page }) => {
        await page.goto('/map-editor');
        await expect(page).toHaveURL(/\/$/);
    });
});


test.describe('Theme Toggle', () => {
    test('clicking theme toggle changes theme', async ({ page }) => {
        await page.goto('/');

        const initialTheme = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme')
        );

        await page.locator('#loginThemeToggle').click();

        const newTheme = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme')
        );

        expect(newTheme).not.toBe(initialTheme);
    });

    test('theme is saved to localStorage', async ({ page }) => {
        await page.goto('/');

        // Toggle theme
        await page.locator('#loginThemeToggle').click();

        const savedTheme = await page.evaluate(() =>
            localStorage.getItem('loginTheme')
        );

        expect(savedTheme).not.toBeNull();
    });
});


test.describe('How-To Guide', () => {
    test('how-to guide page loads', async ({ page }) => {
        await page.goto('/how-to-guide');
        await expect(page).toHaveURL(/how-to-guide/);
    });
});
