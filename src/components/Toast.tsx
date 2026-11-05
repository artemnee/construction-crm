import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

const ToastContext = createContext<(text: string) => void>(() => {})

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; text: string }[]>([])
  const counter = useRef(0)

  const push = useCallback((text: string) => {
    const id = ++counter.current
    setItems((list) => [...list, { id, text }])
    setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="toast">
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
