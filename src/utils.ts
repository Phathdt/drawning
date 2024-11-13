import getStroke from 'perfect-freehand';

import { Point } from './types';

export const getSvgPathFromStroke = (points: Point[]): string => {
  const stroke = getStroke(points.map((p) => [p.x, p.y, p.pressure || 0.5]))
  if (!stroke.length) return ''

  const d = stroke.reduce((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length]
    acc.push(i === 0 ? `M ${x0} ${y0}` : `L ${x0} ${y0}`)
    return acc
  }, [] as string[])

  return d.join(' ')
}

export const MAX_HISTORY_LENGTH = 50
