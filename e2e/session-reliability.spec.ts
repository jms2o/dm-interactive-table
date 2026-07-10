import { expect, test } from '@playwright/test'

test('DM creates a table code and a player reconnects to the same scene', async ({
  browser,
  page,
}) => {
  await page.goto('/dm')
  await expect(page.getByRole('heading', { name: 'Crear cuenta del DM' })).toBeVisible()

  await page.getByLabel('Nombre').fill('E2E Dungeon Master')
  await page.getByLabel('Correo').fill('e2e@example.test')
  await page.getByLabel('Contraseña').fill('playwright-password-123')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Panel del DM' })).toBeVisible()
  await expect(page.getByText('Conectado', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Mesa' }).click()
  await page.getByRole('button', { name: 'Generar código' }).click()

  const code = await page.locator('.table-code').innerText()
  expect(code).toMatch(/^[A-Z0-9]{6}$/)

  const playerContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  const player = await playerContext.newPage()
  await player.goto(`/player?code=${code}`)
  await player.getByLabel('Nombre').fill('E2E Player')
  await player.getByRole('button', { name: 'Unirse' }).click()

  await expect(
    player.getByRole('heading', { name: 'Cliente de jugador' }),
  ).toBeVisible()
  await expect(player.getByText('Conectado', { exact: true })).toBeVisible()
  await expect(player.locator('canvas').first()).toBeVisible()

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

  await playerContext.close()
})
