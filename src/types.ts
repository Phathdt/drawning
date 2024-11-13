export type Tool =
  | 'pen'
  | 'rectangle'
  | 'ellipse'
  | 'arrow'
  | 'text'
  | 'eraser'
  | 'select'

// Separate ElementType from Tool because not all tools create elements
export type ElementType = 'stroke' | 'rectangle' | 'ellipse' | 'arrow' | 'text'

export interface ToolOption {
  id: Tool
  icon: React.ReactNode
  name: string
}

export interface Point {
  x: number
  y: number
  pressure?: number
  timestamp: number
}

export interface DrawingOptions {
  strokeWidth: number
  strokeColor: string
  fillColor: string
  tool: Tool
}

export interface DrawingElement {
  id: string
  type: ElementType
  x1: number
  y1: number
  x2: number
  y2: number
  points?: Point[]
  text?: string
  options: DrawingOptions
  isDeleted?: boolean // Add this for soft delete with eraser
}

// Drawing element specific types
export interface RectElement extends DrawingElement {
  type: 'rectangle'
}

export interface EllipseElement extends DrawingElement {
  type: 'ellipse'
}

export interface ArrowElement extends DrawingElement {
  type: 'arrow'
}

export interface TextElement extends DrawingElement {
  type: 'text'
  text: string
}

export const getElementTypeFromTool = (tool: Tool): ElementType | null => {
  switch (tool) {
    case 'pen':
      return 'stroke'
    case 'rectangle':
      return 'rectangle'
    case 'ellipse':
      return 'ellipse'
    case 'arrow':
      return 'arrow'
    case 'text':
      return 'text'
    // eraser and select don't create elements
    case 'eraser':
    case 'select':
      return null
    default:
      return 'stroke'
  }
}
