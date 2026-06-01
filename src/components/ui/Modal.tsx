'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ open, ...rest }: ModalProps) {
  if (!open) return null
  return (
    <ModalInner onClose={rest.onClose} title={rest.title}>
      {rest.children}
    </ModalInner>
  )
}

function ModalInner({ onClose, title, children }: Omit<ModalProps, 'open'>) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null
  )
  const dragRef = useRef<{
    startX: number
    startY: number
    origX: number
    origY: number
  } | null>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const modal = modalRef.current
    if (!modal) return
    const rect = modal.getBoundingClientRect()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
    }

    function handleMouseMove(e: MouseEvent) {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      setPosition({
        x: dragRef.current.origX + dx,
        y: dragRef.current.origY + dy,
      })
    }

    function handleMouseUp() {
      dragRef.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  const style: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'none',
      }
    : {}

  return (
    <div
      ref={modalRef}
      className={`fixed z-50 w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-0 shadow-xl ${
        !position ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' : ''
      }`}
      style={style}
    >
      <div
        className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
      >
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        <button
          onClick={onClose}
          onMouseDown={(e) => e.stopPropagation()}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
      <div
        className="p-5 overflow-y-auto"
        style={{ maxHeight: 'calc(80vh - 56px)' }}
      >
        {children}
      </div>
    </div>
  )
}
