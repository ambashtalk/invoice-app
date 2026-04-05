import { _electron as electron } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { join } from 'path';
import fs from 'fs';

/**
 * End-to-End Invoice Lifecycle Test
 * 1. Launches Electron with a clean test database
 * 2. Creates a client
 * 3. Creates an invoice (draft)
 * 4. Modifies the invoice and verifies the 'Save & Preview' logic
 * 5. Verifies the PDF Preview page
 */

const TEST_DB = join(__dirname, '../../test-e2e.db');

test.describe('Invoice Lifecycle', () => {
  let electronApp: any;
  let window: any;

  test.beforeAll(async () => {
    // Cleanup old test DB
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

    electronApp = await electron.launch({
      args: [join(__dirname, '../../out/main/index.js')],
      env: { ...process.env, DB_PATH: TEST_DB, NODE_ENV: 'test' }
    });

    window = await electronApp.firstWindow();
    // Wait for the app to load
    await window.waitForLoadState('load');
    await window.waitForSelector('.app-layout', { state: 'visible', timeout: 30000 });
  });

  test.afterAll(async () => {
    await electronApp.close();
    if (fs.existsSync(TEST_DB)) {
       try { fs.unlinkSync(TEST_DB); } catch(e) {}
    }
  });

  test('should create a client successfully', async () => {
    await window.getByRole('link', { name: 'Clients' }).click();
    await window.getByRole('button', { name: 'Add Client' }).first().click(); // .first() for strict mode
    
    await window.getByPlaceholder('Acme Corporation').fill('Test Client Corp');
    await window.getByPlaceholder('billing@company.com').fill('test@corp.com');
    await window.getByPlaceholder('123 Business Street, City - 560001').fill('123 Testing Lane');
    
    await window.getByRole('button', { name: 'Create' }).click();
    await expect(window.locator('.table-container >> text=Test Client Corp')).toBeVisible();
  });


  test('should create a new invoice draft', async () => {
    await window.getByRole('link', { name: 'Invoices' }).first().click();
    await window.getByRole('link', { name: 'New Invoice' }).click();
    
    // Select the client using custom dropdown
    // Dropdown value shows as text when not selected
    await window.getByText('Select Client', { exact: true }).click();
    await window.getByText('Test Client Corp', { exact: true }).click();
    
    // Add a line item
    await window.getByPlaceholder('Description').first().fill('Software Development Service');
    await window.getByPlaceholder('Amount').first().fill('5000');
    
    // 5000 with inclusive tax = 5,000 total
    // Using a more robust locator for the total amount
    await expect(window.locator('.amount-large')).toContainText('5,000.00');
    
    const previewBtn = window.getByRole('button', { name: 'Save & Preview PDF' });
    await expect(previewBtn).toBeVisible();
    
    await previewBtn.click();
    
    // Wait for PDF Preview page to load
    await expect(window).toHaveURL(/.*\/preview/);
    await expect(window.locator('text=Invoice Preview')).toBeVisible();
    await expect(window.locator('text=Software Development Service')).toBeVisible();
    await expect(window.locator('text=Test Client Corp')).toBeVisible();
  });

  test('should verify dirty state logic on edit', async () => {
    // Go back to editor
    await window.getByRole('button', { name: 'Edit' }).click();
    
    // Initially should be "PDF Preview" because it was just saved
    const standardBtn = window.getByRole('button', { name: 'PDF Preview' });
    await expect(standardBtn).toBeVisible();
    
    // Modify something
    await window.getByPlaceholder('Description').first().fill('Software Development - Modified');
    
    // Button should now be "Save & Preview PDF"
    const dirtyBtn = window.getByRole('button', { name: 'Save & Preview PDF' });
    await expect(dirtyBtn).toBeVisible();
    
    await dirtyBtn.click();
    // Verify it saved and navigated to preview
    await expect(window).toHaveURL(/.*\/preview/);
    await expect(window.locator('text=Software Development - Modified')).toBeVisible();
  });
});


