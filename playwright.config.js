/**
 * Playwright configuration for WBMapApp E2E tests.
 *
 * Run tests with:
 *   npx playwright test              # Run all tests
 *   npx playwright test --ui         # Interactive UI mode
 *   npx playwright test --debug      # Debug mode (step through)
 *   npx playwright show-report       # View HTML report after tests
 *
 * Before running: Make sure Flask server is running on http://localhost:5000
 * Start with: python main.py
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    // Test directory
    testDir: './tests/e2e',

    // Test file pattern
    testMatch: '**/*.spec.js',

    // Run tests in parallel
    fullyParallel: true,

    // Fail the build on CI if you accidentally left test.only in the source code
    forbidOnly: !!process.env.CI,

    // Retry on CI only
    retries: process.env.CI ? 2 : 0,

    // Opt out of parallel tests on CI
    workers: process.env.CI ? 1 : undefined,

    // Reporter to use
    reporter: [
        ['list'],  // Console output
        ['html', { outputFolder: 'playwright-report', open: 'never' }]
    ],

    // Shared settings for all projects
    use: {
        // Base URL to use in actions like `await page.goto('/')`
        baseURL: 'http://localhost:5000',

        // Collect trace on failure for debugging
        trace: 'on-first-retry',

        // Take screenshot on failure
        screenshot: 'only-on-failure',

        // Record video on failure
        video: 'on-first-retry',

        // Timeout for each action (click, fill, etc.)
        actionTimeout: 10000,

        // Timeout for navigation
        navigationTimeout: 30000,
    },

    // Global timeout for each test
    timeout: 60000,

    // Configure projects for major browsers
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        // Uncomment to add more browsers:
        // {
        //     name: 'firefox',
        //     use: { ...devices['Desktop Firefox'] },
        // },
        // {
        //     name: 'webkit',
        //     use: { ...devices['Desktop Safari'] },
        // },
        // Test against mobile viewports
        // {
        //     name: 'Mobile Chrome',
        //     use: { ...devices['Pixel 5'] },
        // },
    ],

    // Run your local dev server before starting the tests
    // Uncomment to auto-start Flask server:
    // webServer: {
    //     command: 'python main.py',
    //     url: 'http://localhost:5000',
    //     reuseExistingServer: !process.env.CI,
    //     timeout: 120000,
    // },

    // Output folder for test artifacts
    outputDir: 'test-results/',
});
