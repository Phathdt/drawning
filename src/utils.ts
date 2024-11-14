import getStroke from 'perfect-freehand'

import { Point } from './types'

export const getSvgPathFromStroke = (points: Point[]): string => {
  const stroke = getStroke(points.map((p) => [p.x, p.y, p.pressure || 0.5]))
  if (!stroke.length) return ''

  return stroke.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
}

export const MAX_HISTORY_LENGTH = 50
