import type { VisionOccluder } from '../../../../shared/types/table-experience'

export type VisionPoint = { x: number; y: number }

type Segment = { x1: number; y1: number; x2: number; y2: number }

const ANGLE_EPSILON = 0.00001
const DISTANCE_EPSILON = 0.0001
const RANGE_RAY_COUNT = 96

export function calculateVisibilityPolygon(input: {
  origin: VisionPoint
  range: number
  mapWidth: number
  mapHeight: number
  occluders: VisionOccluder[]
  blocking?: 'sight' | 'light'
}): VisionPoint[] {
  const { origin, range, mapWidth, mapHeight } = input
  const segments: Segment[] = [
    { x1: 0, y1: 0, x2: mapWidth, y2: 0 },
    { x1: mapWidth, y1: 0, x2: mapWidth, y2: mapHeight },
    { x1: mapWidth, y1: mapHeight, x2: 0, y2: mapHeight },
    { x1: 0, y1: mapHeight, x2: 0, y2: 0 },
    ...input.occluders
      .filter((occluder) =>
        !occluder.open &&
        (input.blocking === 'light'
          ? occluder.blocksLight
          : occluder.blocksSight),
      )
      .map(({ x1, y1, x2, y2 }) => ({ x1, y1, x2, y2 })),
  ]
  const targets = segments.flatMap((segment) => [
    { x: segment.x1, y: segment.y1 },
    { x: segment.x2, y: segment.y2 },
  ])
  const targetAngles = targets.flatMap((target) => {
    const angle = Math.atan2(target.y - origin.y, target.x - origin.x)
    return [angle - ANGLE_EPSILON, angle, angle + ANGLE_EPSILON]
  })
  const rangeAngles = Array.from(
    { length: RANGE_RAY_COUNT },
    (_, index) => -Math.PI + (index / RANGE_RAY_COUNT) * Math.PI * 2,
  )
  const angles = [...rangeAngles, ...targetAngles]

  return angles
    .map((angle) => ({ angle, point: castRay(origin, angle, range, segments) }))
    .sort((left, right) => left.angle - right.angle)
    .map(({ point }) => point)
    .filter((point, index, points) => {
      const previous = points[(index + points.length - 1) % points.length]
      return Math.hypot(point.x - previous.x, point.y - previous.y) > DISTANCE_EPSILON
    })
}

function castRay(
  origin: VisionPoint,
  angle: number,
  range: number,
  segments: Segment[],
): VisionPoint {
  const direction = { x: Math.cos(angle), y: Math.sin(angle) }
  let nearestDistance = range

  for (const segment of segments) {
    const distance = raySegmentDistance(origin, direction, segment)
    if (distance !== null && distance < nearestDistance) {
      nearestDistance = distance
    }
  }

  return {
    x: origin.x + direction.x * nearestDistance,
    y: origin.y + direction.y * nearestDistance,
  }
}

function raySegmentDistance(
  origin: VisionPoint,
  direction: VisionPoint,
  segment: Segment,
): number | null {
  const segmentDirection = {
    x: segment.x2 - segment.x1,
    y: segment.y2 - segment.y1,
  }
  const denominator = cross(direction, segmentDirection)

  if (Math.abs(denominator) < Number.EPSILON) return null

  const offset = { x: segment.x1 - origin.x, y: segment.y1 - origin.y }
  const rayDistance = cross(offset, segmentDirection) / denominator
  const segmentRatio = cross(offset, direction) / denominator

  if (
    rayDistance < DISTANCE_EPSILON ||
    segmentRatio < 0 ||
    segmentRatio > 1
  ) {
    return null
  }

  return rayDistance
}

function cross(left: VisionPoint, right: VisionPoint) {
  return left.x * right.y - left.y * right.x
}
