import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function Sheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fade-up_.2s_ease-out]" onClick={onClose} />
      <div className="relative w-full sm:max-w-md max-h-[88vh] overflow-y-auto no-scrollbar glass rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-card animate-sheet-up pb-safe">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-3 glass border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 grid place-items-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 active:scale-95 transition"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
