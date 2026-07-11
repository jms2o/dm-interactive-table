import { expect, test } from '@playwright/test'

test('DM runs a session from lobby and a player reconnects to the same scene', async ({
  browser,
  page,
}, testInfo) => {
  await page.goto('/dm')
  await expect(page.getByRole('heading', { name: 'Crear cuenta del DM' })).toBeVisible()

  await page.getByLabel('Nombre').fill('E2E Dungeon Master')
  await page.getByLabel('Correo').fill('e2e@example.test')
  await page.getByLabel('Contraseña').fill('playwright-password-123')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Lobby de campañas' })).toBeVisible()
  await expect(page.getByTestId('session-list')).toContainText('Sesion Demo')
  await page.getByRole('button', { name: 'Preparar' }).click()

  await expect(page.getByRole('heading', { name: 'Panel del DM' })).toBeVisible()
  await expect(page.getByText('Conectado', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Mesa' }).click()
  await page.getByRole('button', { name: 'Generar código' }).click()

  const code = await page.locator('.table-code').innerText()
  expect(code).toMatch(/^[A-Z0-9]{6}$/)
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()

  const displayContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  })
  await displayContext.addInitScript(() => {
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: async () => ({
          released: false,
          release: async function () {
            this.released = true
          },
          addEventListener: () => undefined,
        }),
      },
    })
  })
  const display = await displayContext.newPage()
  await display.goto(`/display?code=${code}`)
  await display.getByRole('button', { name: 'Unirse' }).click()
  await expect(
    display.getByRole('heading', { name: 'El DM está preparando la partida' }),
  ).toBeVisible()

  const playerContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  const player = await playerContext.newPage()
  await player.goto(`/player?code=${code}`)
  await player.getByLabel('Nombre').fill('E2E Player')
  await player.getByRole('button', { name: 'Unirse' }).click()

  await expect(
    player.getByRole('heading', { name: 'El DM está preparando la partida' }),
  ).toBeVisible()
  await expect(player.getByLabel('Nombre del personaje')).toHaveValue('E2E Player')

  await page.getByTestId('start-session').click()
  await expect(
    player.getByRole('heading', { name: 'Cliente de jugador' }),
  ).toBeVisible({ timeout: 10_000 })
  await expect(player.getByText('Conectado', { exact: true })).toBeVisible()
  await expect(player.locator('canvas').first()).toBeVisible()
  await expect(
    display.getByRole('heading', { name: 'Pantalla pública' }),
  ).toBeVisible()
  await display.getByRole('button', { name: 'Dispositivo' }).click()
  await expect(display.getByRole('button', { name: 'TV' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(display.getByLabel('Calibracion fisica')).toBeChecked()
  await expect(display.locator('.board-shell')).toHaveAttribute(
    'data-calibrated',
    'true',
  )
  await expect
    .poll(() =>
      display.locator('.board-shell').evaluate((element) =>
        getComputedStyle(element)
          .getPropertyValue('--board-canvas-width')
          .trim(),
      ),
    )
    .toBe('1920px')
  await expect(display.locator('.diagnostic-grid')).toContainText(/\d+ ms/)
  await testInfo.attach('display-tv-diagnostics', {
    body: await display.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })
  await display.getByRole('button', { name: 'Cerrar', exact: true }).click()

  await playerContext.setOffline(true)
  await expect(player.getByTestId('connection-status')).toContainText(
    'Reconectando',
  )
  await playerContext.setOffline(false)
  await expect(player.getByTestId('connection-status')).toHaveText('Conectado')

  await player.reload()
  await expect(
    player.getByRole('heading', { name: 'Cliente de jugador' }),
  ).toBeVisible()
  await expect(player.getByTestId('scene-name')).toHaveText(
    'Campamento en ruinas',
  )
  await testInfo.attach('player-phone-reconnected', {
    body: await player.screenshot({ fullPage: true }),
    contentType: 'image/png',
  })

  await page.getByLabel('Nombre del snapshot').fill('Antes del portal')
  await page.getByRole('button', { name: 'Crear snapshot' }).click()
  await expect(page.getByText('Antes del portal', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Respaldos' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/backup-v1\.json$/)
  const backupPath = await download.path()
  expect(backupPath).toBeTruthy()
  await page
    .locator('.backup-modal input[type="file"]')
    .setInputFiles(backupPath!)
  await expect(page.getByText('Copia restaurada', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()

  await page.getByRole('button', { name: 'Finalizar' }).click()
  await expect(
    player.getByRole('heading', { name: 'La mesa quedó cerrada' }),
  ).toBeVisible({ timeout: 10_000 })

  await displayContext.close()
  await playerContext.close()
})
