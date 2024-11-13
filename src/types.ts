export interface Point {
  x: number
  y: number
  pressure?: number
  timestamp: number
}

export interface DrawingOptions {
  strokeWidth: number
  strokeColor: string
  mode: DrawingMode
}

export type DrawingMode = 'draw' | 'erase' | 'select'

export interface DrawingElement {
  id: string
  type: 'stroke' | 'shape'
  points: Point[]
  options: DrawingOptions
}
