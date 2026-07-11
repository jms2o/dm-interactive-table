import type {
  PhysicalUnit,
  TableDevicePreferences,
  TableDeviceProfile,
} from '../../../../shared/types/device-experience'
import type { ClientRole } from '../../../../shared/types/realtime'

const PROFILE_DEFAULTS: Record<
  TableDeviceProfile,
  Omit<TableDevicePreferences, 'pixelsPerInch' | 'physicalUnit' | 'cellSize'>
> = {
  tv: {
    version: 1,
    profile: 'tv',
    calibrationEnabled: true,
    safeAreaPx: 32,
    wakeLockEnabled: true,
    kioskEnabled: true,
    hideCursor: true,
  },
  tablet: {
    version: 1,
    profile: 'tablet',
    calibrationEnabled: false,
    safeAreaPx: 16,
    wakeLockEnabled: true,
    kioskEnabled: false,
    hideCursor: false,
  },
  phone: {
    version: 1,
    profile: 'phone',
    calibrationEnabled: false,
    safeAreaPx: 12,
    wakeLockEnabled: false,
    kioskEnabled: false,
    hideCursor: false,
  },
}

export function defaultTableDevicePreferences(
  role: ClientRole,
): TableDevicePreferences {
  const profile: TableDeviceProfile =
    role === 'display' ? 'tv' : role === 'player' ? 'phone' : 'tablet'

  return {
    ...PROFILE_DEFAULTS[profile],
    physicalUnit: 'in',
    cellSize: 1,
    pixelsPerInch: 96,
  }
}

export function applyDeviceProfile(
  current: TableDevicePreferences,
  profile: TableDeviceProfile,
): TableDevicePreferences {
  return {
    ...PROFILE_DEFAULTS[profile],
    physicalUnit: current.physicalUnit,
    cellSize: current.cellSize,
    pixelsPerInch: current.pixelsPerInch,
  }
}

export function loadTableDevicePreferences(role: ClientRole) {
  const fallback = defaultTableDevicePreferences(role)

  try {
    const raw = localStorage.getItem(storageKey(role))
    if (!raw) return fallback
    return normalizePreferences(JSON.parse(raw), fallback)
  } catch {
    return fallback
  }
}

export function saveTableDevicePreferences(
  role: ClientRole,
  preferences: TableDevicePreferences,
) {
  try {
    localStorage.setItem(storageKey(role), JSON.stringify(preferences))
  } catch {
    // Physical preferences are optional when browser storage is unavailable.
  }
}

export function physicalCellInches(preferences: TableDevicePreferences) {
  return preferences.physicalUnit === 'in'
    ? preferences.cellSize
    : preferences.cellSize / 2.54
}

export function calibratedBoardWidth(input: {
  boardWidth: number
  mapGridSize: number
  mapScale: number
  preferences: TableDevicePreferences
}) {
  const canonicalGridPixels = input.mapGridSize * input.mapScale
  if (!input.preferences.calibrationEnabled || canonicalGridPixels <= 0) {
    return input.boardWidth
  }

  const targetGridPixels =
    physicalCellInches(input.preferences) * input.preferences.pixelsPerInch

  return clamp(
    (input.boardWidth * targetGridPixels) / canonicalGridPixels,
    320,
    8192,
  )
}

export function convertCellUnit(
  value: number,
  from: PhysicalUnit,
  to: PhysicalUnit,
) {
  if (from === to) return value
  return from === 'in' ? value * 2.54 : value / 2.54
}

function normalizePreferences(
  value: unknown,
  fallback: TableDevicePreferences,
): TableDevicePreferences {
  if (!value || typeof value !== 'object') return fallback
  const candidate = value as Partial<TableDevicePreferences>
  const profile =
    candidate.profile === 'tv' ||
    candidate.profile === 'tablet' ||
    candidate.profile === 'phone'
      ? candidate.profile
      : fallback.profile

  return {
    ...applyDeviceProfile(fallback, profile),
    physicalUnit: candidate.physicalUnit === 'cm' ? 'cm' : 'in',
    cellSize: clampNumber(candidate.cellSize, 0.25, 10, fallback.cellSize),
    pixelsPerInch: clampNumber(
      candidate.pixelsPerInch,
      48,
      240,
      fallback.pixelsPerInch,
    ),
    calibrationEnabled:
      typeof candidate.calibrationEnabled === 'boolean'
        ? candidate.calibrationEnabled
        : fallback.calibrationEnabled,
    safeAreaPx: clampNumber(candidate.safeAreaPx, 0, 120, fallback.safeAreaPx),
    wakeLockEnabled:
      typeof candidate.wakeLockEnabled === 'boolean'
        ? candidate.wakeLockEnabled
        : fallback.wakeLockEnabled,
    kioskEnabled:
      typeof candidate.kioskEnabled === 'boolean'
        ? candidate.kioskEnabled
        : fallback.kioskEnabled,
    hideCursor:
      typeof candidate.hideCursor === 'boolean'
        ? candidate.hideCursor
        : fallback.hideCursor,
  }
}

function storageKey(role: ClientRole) {
  return `dit:device:${role}:v1`
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(value, min, max)
    : fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
