/* eslint-disable react-hooks/exhaustive-deps */
import {
    ArrowUpRight, Circle, Eraser, MousePointer, Pen, Redo2, Square, Type, Undo2
} from 'lucide-react';
import { getStroke } from 'perfect-freehand';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

import {
    DrawingElement, DrawingOptions, getElementTypeFromTool, HistoryState, Point, ToolOption
} from './types';
import { MAX_HISTORY_LENGTH } from './utils';

const TOOLS: ToolOption[] = [
  { id: 'pen', icon: <Pen size={20} />, name: 'Pen' },
  { id: 'rectangle', icon: <Square size={20} />, name: 'Rectangle' },
  { id: 'ellipse', icon: <Circle size={20} />, name: 'Ellipse' },
  { id: 'arrow', icon: <ArrowUpRight size={20} />, name: 'Arrow' },
  { id: 'text', icon: <Type size={20} />, name: 'Text' },
  { id: 'eraser', icon: <Eraser size={20} />, name: 'Eraser' },
  { id: 'select', icon: <MousePointer size={20} />, name: 'Select' },
]

const DrawingCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(
    null
  )

  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: [],
    future: [],
  })
  const [elements, setElements] = useState<DrawingElement[]>([])
  const [selectedElement, setSelectedElement] = useState<DrawingElement | null>(
    null
  )
  const [inputText, setInputText] = useState<string>('')
  const [textPosition, setTextPosition] = useState<{
    x: number
    y: number
  } | null>(null)

  const [options, setOptions] = useState<DrawingOptions>({
    strokeWidth: 3,
    strokeColor: '#000000',
    fillColor: '#ffffff',
    tool: 'pen',
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const updateHistory = useCallback((newElements: DrawingElement[]) => {
    setHistory((prev) => ({
      past: [...prev.past, prev.present].slice(-MAX_HISTORY_LENGTH),
      present: newElements,
      future: [],
    }))
  }, [])

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev

      const newPast = prev.past.slice(0, -1)
      const newPresent = prev.past[prev.past.length - 1]

      return {
        past: newPast,
        present: newPresent,
        future: [prev.present, ...prev.future],
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev

      const newFuture = prev.future.slice(1)
      const newPresent = prev.future[0]

      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: newFuture,
      }
    })
  }, [])

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current
    if (!canvas) throw new Error('Canvas not found')

    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const pressure = 'pressure' in e ? (e.pressure as number) : 0.5

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      pressure,
      timestamp: Date.now(),
    }
  }

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const point = getCoordinates(e)

      if (options.tool === 'text') {
        setTextPosition(point)
        return
      }

      if (options.tool === 'eraser') {
        handleEraser(point)
        return
      }

      if (options.tool === 'select') {
        handleSelection(point)
        return
      }

      const elementType = getElementTypeFromTool(options.tool)
      if (!elementType) return

      setIsDrawing(true)
      const newElement: DrawingElement = {
        id: Date.now().toString(),
        type: elementType,
        x1: point.x,
        y1: point.y,
        x2: point.x,
        y2: point.y,
        points: elementType === 'stroke' ? [point] : undefined,
        options: { ...options },
      }
      setCurrentElement(newElement)
    },
    [options]
  )

  const handleEraser = useCallback(
    (point: Point) => {
      const eraserRadius = options.strokeWidth * 5
      const newElements = history.present.map((element) => {
        if (isPointNearElement(point, element, eraserRadius)) {
          return { ...element, isDeleted: true }
        }
        return element
      })
      updateHistory(newElements)
    },
    [options.strokeWidth, history.present, updateHistory]
  )

  const handleSelection = useCallback(
    (point: Point) => {
      const selectedEl = elements.find((element) =>
        isPointNearElement(point, element, 5)
      )
      setSelectedElement(selectedEl || null)
    },
    [elements]
  )

  const isPointNearElement = (
    point: Point,
    element: DrawingElement,
    threshold: number
  ): boolean => {
    if (element.isDeleted) return false

    switch (element.type) {
      case 'stroke':
        return (
          element.points?.some(
            (p) => Math.hypot(p.x - point.x, p.y - point.y) <= threshold
          ) || false
        )

      case 'rectangle':
        return (
          point.x >= Math.min(element.x1, element.x2) - threshold &&
          point.x <= Math.max(element.x1, element.x2) + threshold &&
          point.y >= Math.min(element.y1, element.y2) - threshold &&
          point.y <= Math.max(element.y1, element.y2) + threshold
        )

      case 'ellipse': {
        const centerX = (element.x1 + element.x2) / 2
        const centerY = (element.y1 + element.y2) / 2
        return Math.hypot(centerX - point.x, centerY - point.y) <= threshold
      }

      case 'arrow':
      case 'text':
        return (
          Math.hypot(element.x1 - point.x, element.y1 - point.y) <= threshold
        )

      default:
        return false
    }
  }

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !currentElement) return

      const point = getCoordinates(e)

      if (options.tool === 'pen') {
        setCurrentElement((prev) => {
          if (!prev) return null
          return {
            ...prev,
            points: [...(prev.points || []), point],
          }
        })
      } else {
        setCurrentElement((prev) => {
          if (!prev) return null
          return {
            ...prev,
            x2: point.x,
            y2: point.y,
          }
        })
      }
    },
    [isDrawing, currentElement, options.tool]
  )

  const stopDrawing = useCallback(() => {
    if (!isDrawing || !currentElement) return

    setIsDrawing(false)
    const newElements = [...history.present, currentElement]
    updateHistory(newElements)
    setCurrentElement(null)
  }, [isDrawing, currentElement, history.present, updateHistory])

  const drawShape = useCallback(
    (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
      const { x1, y1, x2, y2, type, options: elementOptions } = element

      ctx.strokeStyle = elementOptions.strokeColor
      ctx.lineWidth = elementOptions.strokeWidth
      ctx.fillStyle = elementOptions.fillColor

      switch (type) {
        case 'rectangle':
          ctx.beginPath()
          ctx.rect(x1, y1, x2 - x1, y2 - y1)
          ctx.stroke()
          break

        case 'ellipse': {
          ctx.beginPath()
          const centerX = (x1 + x2) / 2
          const centerY = (y1 + y2) / 2
          const radiusX = Math.abs(x2 - x1) / 2
          const radiusY = Math.abs(y2 - y1) / 2
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
          ctx.stroke()
          break
        }

        case 'arrow': {
          const angle = Math.atan2(y2 - y1, x2 - x1)
          const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
          const headLength = Math.min(20, length / 3)

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)

          ctx.lineTo(
            x2 - headLength * Math.cos(angle - Math.PI / 6),
            y2 - headLength * Math.sin(angle - Math.PI / 6)
          )
          ctx.moveTo(x2, y2)
          ctx.lineTo(
            x2 - headLength * Math.cos(angle + Math.PI / 6),
            y2 - headLength * Math.sin(angle + Math.PI / 6)
          )
          ctx.stroke()
          break
        }

        case 'text':
          if (element.text) {
            ctx.font = `${elementOptions.strokeWidth * 5}px Arial`
            ctx.fillStyle = elementOptions.strokeColor
            ctx.fillText(element.text, x1, y1)
          }
          break

        case 'stroke':
          if (element.points) {
            const stroke = getStroke(
              element.points.map((p) => [p.x, p.y, p.pressure || 0.5]),
              {
                size: elementOptions.strokeWidth,
                thinning: 0.5,
                smoothing: 0.5,
                streamline: 0.5,
              }
            )

            ctx.fillStyle = elementOptions.strokeColor
            ctx.beginPath()
            if (stroke.length > 0) {
              ctx.moveTo(stroke[0][0], stroke[0][1])
              stroke.forEach(([x, y]) => {
                ctx.lineTo(x, y)
              })
            }
            ctx.fill()
          }
          break
      }
    },
    []
  )

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw completed elements
    history.present
      .filter((element) => !element.isDeleted)
      .forEach((element) => {
        drawShape(ctx, element)
        if (selectedElement?.id === element.id) {
          drawSelectionBox(ctx, element)
        }
      })

    // Draw current element
    if (currentElement) {
      drawShape(ctx, currentElement)
    }
  }, [history.present, currentElement, selectedElement, drawShape])

  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [undo, redo])

  const handleTextSubmit = useCallback(
    (text: string) => {
      if (textPosition && text) {
        const textElement: DrawingElement = {
          id: Date.now().toString(),
          type: 'text',
          x1: textPosition.x,
          y1: textPosition.y,
          x2: textPosition.x,
          y2: textPosition.y,
          text,
          options: { ...options },
        }
        const newElements = [...history.present, textElement]
        updateHistory(newElements)
        setTextPosition(null)
        setInputText('')
      }
    },
    [textPosition, options, history.present, updateHistory]
  )

  const drawSelectionBox = (
    ctx: CanvasRenderingContext2D,
    element: DrawingElement
  ) => {
    ctx.save()
    ctx.strokeStyle = '#0099ff'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])

    const padding = 5
    let box = {
      x: Math.min(element.x1, element.x2) - padding,
      y: Math.min(element.y1, element.y2) - padding,
      width: Math.abs(element.x2 - element.x1) + padding * 2,
      height: Math.abs(element.y2 - element.y1) + padding * 2,
    }

    if (element.type === 'stroke' && element.points) {
      const xs = element.points.map((p) => p.x)
      const ys = element.points.map((p) => p.y)
      box = {
        x: Math.min(...xs) - padding,
        y: Math.min(...ys) - padding,
        width: Math.max(...xs) - Math.min(...xs) + padding * 2,
        height: Math.max(...ys) - Math.min(...ys) + padding * 2,
      }
    }

    ctx.strokeRect(box.x, box.y, box.width, box.height)
    ctx.restore()
  }

  const clearCanvas = useCallback(() => {
    updateHistory([])
    setCurrentElement(null)
    setSelectedElement(null)
    setTextPosition(null)
    setInputText('')
  }, [updateHistory])

  const undoLastElement = useCallback(() => {
    setElements((prev) => prev.slice(0, -1))
  }, [])

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex gap-4 mb-4">
        <div className="flex gap-2">
          {TOOLS.map((tool) => (
            <Button
              key={tool.id}
              variant={options.tool === tool.id ? 'default' : 'outline'}
              size="icon"
              onClick={() => setOptions((prev) => ({ ...prev, tool: tool.id }))}
              title={tool.name}
            >
              {tool.icon}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={undo}
            disabled={history.past.length === 0}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={20} />
          </Button>

          <Button
            onClick={redo}
            disabled={history.future.length === 0}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={20} />
          </Button>
        </div>

        <Select
          value={options.strokeWidth.toString()}
          onValueChange={(value) =>
            setOptions((prev) => ({
              ...prev,
              strokeWidth: Number(value),
            }))
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Stroke Width" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Thin</SelectItem>
            <SelectItem value="3">Medium</SelectItem>
            <SelectItem value="5">Thick</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={options.strokeColor}
            onChange={(e) =>
              setOptions((prev) => ({
                ...prev,
                strokeColor: e.target.value,
              }))
            }
            className="w-12 h-10 border rounded"
            title="Stroke Color"
          />

          <input
            type="color"
            value={options.fillColor}
            onChange={(e) =>
              setOptions((prev) => ({
                ...prev,
                fillColor: e.target.value,
              }))
            }
            className="w-12 h-10 border rounded"
            title="Fill Color"
          />
        </div>

        <Button onClick={undoLastElement}>Undo</Button>

        <Button onClick={clearCanvas} variant="destructive">
          Clear
        </Button>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          className="border border-gray-300 rounded-lg shadow-lg"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {textPosition && (
          <div
            className="absolute"
            style={{
              left: textPosition.x,
              top: textPosition.y,
            }}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTextSubmit(inputText)
                }
              }}
              onBlur={() => handleTextSubmit(inputText)}
              autoFocus
              className="border border-gray-300 rounded px-2 py-1"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default DrawingCanvas
