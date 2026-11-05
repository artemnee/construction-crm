import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div className="page-head-text">
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </div>
  )
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="crumbs" aria-label="Навигация">
      <ol>
        {items.map((it, i) => (
          <li key={i}>
            {it.to ? (
              <Link to={it.to}>{it.label}</Link>
            ) : (
              <span aria-current="page">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {hint && <p className="muted">{hint}</p>}
      {action}
    </div>
  )
}

export function Loading() {
  return (
    <div className="loading" role="status" aria-busy="true">
      <span className="sr-only">Загрузка…</span>
      <div className="skeleton skeleton-title" />
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton skeleton-short" />
    </div>
  )
}
