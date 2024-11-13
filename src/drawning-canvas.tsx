import { getStroke } from 'perfect-freehand';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

import { DrawingElement, DrawingOptions, Point } from './types';

const DrawingCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [points, setPoints] = useState<Point[]>([])
  const [elements, setElements] = useState<DrawingElement[]>([])
  const [options, setOptions] = useState<DrawingOptions>({
    strokeWidth: 3,
    strokeColor: '#000000',
    mode: 'draw',
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getCoordinates = useCallback(
    (e: React.MouseEvent | React.TouchEvent): Point => {
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
    },
    []
  )

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      setIsDrawing(true)
      const point = getCoordinates(e)
      setPoints([point])
    },
    [getCoordinates]
  )

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return

      const point = getCoordinates(e)
      setPoints((prevPoints) => [...prevPoints, point])
    },
    [isDrawing, getCoordinates]
  )

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return

    setIsDrawing(false)
    const newElement: DrawingElement = {
      id: Date.now().toString(),
      type: 'stroke',
      points: [...points],
      options: { ...options },
    }

    setElements((prevElements) => [...prevElements, newElement])
    setPoints([])
  }, [isDrawing, points, options])

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Render all completed elements
    elements.forEach((element) => {
      if (element.type === 'stroke') {
        const stroke = getStroke(
          element.points.map((p) => [p.x, p.y, p.pressure || 0.5]),
          {
            size: element.options.strokeWidth,
            thinning: 0.5,
            smoothing: 0.5,
            streamline: 0.5,
          }
        )

        ctx.fillStyle = element.options.strokeColor
        ctx.beginPath()
        if (stroke.length > 0) {
          ctx.moveTo(stroke[0][0], stroke[0][1])
          stroke.forEach(([x, y]) => {
            ctx.lineTo(x, y)
          })
        }
        ctx.fill()
      }
    })

    // Render current stroke
    if (points.length > 0) {
      const stroke = getStroke(
        points.map((p) => [p.x, p.y, p.pressure || 0.5]),
        {
          size: options.strokeWidth,
          thinning: 0.5,
          smoothing: 0.5,
          streamline: 0.5,
        }
      )

      ctx.fillStyle = options.strokeColor
      ctx.beginPath()
      if (stroke.length > 0) {
        ctx.moveTo(stroke[0][0], stroke[0][1])
        stroke.forEach(([x, y]) => {
          ctx.lineTo(x, y)
        })
      }
      ctx.fill()
    }
  }, [elements, points, options])

  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  const clearCanvas = useCallback(() => {
    setElements([])
    setPoints([])
  }, [])

  const undoLastElement = useCallback(() => {
    setElements((prevElements) => prevElements.slice(0, -1))
  }, [])

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex gap-4 mb-4">
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
        />

        <Button onClick={clearCanvas}>Clear Canvas</Button>

        <Button onClick={undoLastElement}>Undo</Button>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border border-gray-300 rounded-lg shadow-lg"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </div>
  )
}

export default DrawingCanvas
