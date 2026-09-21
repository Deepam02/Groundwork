import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';

test.skip(
  process.env.GROUNDWORK_LOCAL_E2E !== 'true',
  'Enable GROUNDWORK_LOCAL_E2E only for the local fixture backend; these tests start research and inject sample mail.',
);

test('a project goes from description to a living plan, with persistent authentication', async ({
  page,
  context,
}) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Big ideas. Clear next steps.' })).toBeVisible();
  await expect(page.getByText('PICK UP WHERE YOU LEFT OFF')).toHaveCount(0);
  await page.getByRole('button', { name: 'The sources', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'The authority. The page. The passage.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'What changed', exact: true }).click();
  await expect(page.locator('.example-mail-change')).toContainText('The preparation tasks');
  await page.getByRole('button', { name: 'A clear plan', exact: true }).click();
  await page.getByRole('button', { name: 'Open a café', exact: true }).click();
  await expect(page.getByLabel('What are you planning?')).toHaveValue(
    'I’m opening a small café in ',
  );
  await page.screenshot({ path: '.local/screenshots/home-desktop.png', fullPage: true });
  const homeAccessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(
    homeAccessibility.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await page
    .getByLabel('What are you planning?')
    .fill('I am opening a small café in Dublin, Ireland, with food prepared on-site.');
  await page.getByRole('button', { name: 'Find my next steps' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const username = `test_${randomUUID().slice(0, 8)}`;
  // Disposable credentials remain inside this local test; no traces or storage state are exported.
  const password = randomUUID() + 'Aa!';
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create your account', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).toHaveURL(/\/workspace\/new$/);
  await expect(page.getByLabel('What are you planning?')).toHaveValue(
    'I am opening a small café in Dublin, Ireland, with food prepared on-site.',
  );
  await expect(page.locator('.hero')).toHaveCount(0);
  await page.screenshot({ path: '.local/screenshots/new-project-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Find my next steps' }).click();
  await expect(page).toHaveURL(/\/project\//);
  await expect(page.getByText('Local development', { exact: true })).toBeVisible();
  await expect(page.locator('.requirement-row')).toHaveCount(4);
  await expect(page.locator('.question-card')).toBeVisible();
  await page.screenshot({ path: '.local/screenshots/plan-question-desktop.png', fullPage: true });
  await page
    .locator('.question-card')
    .getByRole('button', { name: 'No, everything is indoors', exact: true })
    .click();
  await expect(page.locator('.questions-section')).toHaveCount(0);
  await expect(page.locator('.research-status')).toHaveCount(0);
  await expect(page.locator('.not-applicable')).toBeVisible();
  await page.locator('.requirement-row').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.source-evidence blockquote').first()).toBeVisible();
  await page.getByLabel('Your progress').selectOption('in_progress');
  await page.getByRole('button', { name: /Close/ }).click();
  await expect(page.locator('.requirement-row').first()).toContainText('In progress');
  const projectUrl = page.url();
  await page.getByRole('link', { name: 'All projects', exact: true }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByText('PICK UP WHERE YOU LEFT OFF')).toBeVisible();
  await expect(page.locator('.hero')).toHaveCount(0);
  await page.screenshot({ path: '.local/screenshots/workspace-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.local/screenshots/workspace-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.workspace-project-row').first().click();
  await page.reload();
  await expect(page.locator('.requirement-row').first()).toContainText('In progress');
  const livePage = await context.newPage();
  await livePage.goto(projectUrl);
  await expect(livePage.locator('.requirement-row').first()).toContainText('In progress');
  await page.getByRole('button', { name: 'Inbox', exact: true }).click();
  await page.getByRole('button', { name: 'Add sample notice' }).click();
  await expect(page.locator('.message')).toHaveCount(1);
  await expect(page.locator('.message')).toContainText('Plan updated');
  await page.locator('.message-heading').click();
  await expect(page.locator('.mail-change')).toContainText('September 22');
  await page.screenshot({ path: '.local/screenshots/inbox-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Add sample notice' }).click();
  await expect(page.locator('.message')).toHaveCount(1);
  await expect(livePage.locator('.requirement-row').filter({ hasText: 'Scheduled' })).toHaveCount(
    1,
  );
  await livePage.close();
  await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  await expect(page.locator('.timeline-view')).toContainText('September 22');
  await page.locator('.event-card').click();
  await expect(page.locator('.correspondence-tasks')).toContainText('Prepare Form B');
  await expect(page.locator('.correspondence-tasks')).toContainText('September 22');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.screenshot({ path: '.local/screenshots/timeline-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Your plan', exact: true }).click();
  await page.screenshot({ path: '.local/screenshots/plan-desktop.png', fullPage: true });
  const planAccessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(
    planAccessibility.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  // An edited answer gets another bounded pass and preserves recorded progress.
  await page.locator('.answered-questions > summary').click();
  await page
    .locator('.question-edit')
    .getByRole('button', { name: 'Not sure yet', exact: true })
    .click();
  await expect(page.locator('.not-applicable')).toHaveCount(0);
  await expect(
    page.locator('.requirement-row').filter({ hasText: 'Check outdoor permission' }),
  ).toContainText('Needs checking');
  await expect(page.locator('.requirement-row').first()).toContainText('In progress');
  await page
    .locator('.question-edit')
    .getByRole('button', { name: 'No, everything is indoors', exact: true })
    .click();
  await expect(page.locator('.not-applicable')).toBeVisible();
  await page.locator('.answered-questions > summary').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.local/screenshots/plan-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: /Sign out/ }).click();
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
  await page.locator('.brand').click();
  await expect(page.getByRole('heading', { name: 'Big ideas. Clear next steps.' })).toBeVisible();
  await page.screenshot({ path: '.local/screenshots/home-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill('incorrect-test-password');
  await page.getByRole('dialog').getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('dialog').getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).toHaveURL(/\/workspace$/);
  await page.goto('/');
  await expect(page).toHaveURL(/\/workspace$/);
  await page.goto(projectUrl);
  await expect(page.locator('.requirement-row').first()).toContainText('In progress');
  expect(failures).toEqual([]);
});

test('a general signup opens an empty workspace and private routes preserve their destination', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get started', exact: true }).click();
  const username = `test_${randomUUID().slice(0, 8)}`;
  const password = randomUUID() + 'Aa!';
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create your account', exact: true }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(
    page.getByRole('heading', { name: 'Every plan starts with an idea.' }),
  ).toBeVisible();
  await expect(page.locator('.hero')).toHaveCount(0);
  await page.screenshot({ path: '.local/screenshots/workspace-empty.png', fullPage: true });
  await page.getByRole('link', { name: 'Create your first project' }).click();
  await expect(page).toHaveURL(/\/workspace\/new$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.local/screenshots/new-project-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/workspace/new');
  await expect(page.getByRole('heading', { name: 'Your next chapter awaits.' })).toBeVisible();
  await page.getByRole('button', { name: 'Log in to continue' }).click();
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('dialog').getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).toHaveURL(/\/workspace\/new$/);
  await expect(page.getByLabel('What are you planning?')).toBeVisible();
});
