import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { STATUS_LABELS } from '../lib/transitions'
import type { Task, TaskStatus } from '../lib/types'
import StatusBadge from './StatusBadge'
import { EmptyState } from './ui'

type Filter = 'all' | 'action' | TaskStatus

const STATUSES: TaskStatus[] = ['new', 'in_progress', 'in_review', 'rework', 'done']
const ACTIVE: TaskStatus[] = ['new', 'in_progress', 'rework']

interface Props {
  tasks: Task[]
  objectNames?: Record<string, string>
  focusActive?: boolean
}

export default function TaskList({ tasks, objectNames, focusActive }: Props) {
  const { profiles } = useAuth()
  const [filter, setFilter] = useState<Filter>(focusActive ? 'action' : 'all')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tasks.length, action: 0 }
    for (const s of STATUSES) c[s] = 0
    for (const t of tasks) {
      c[t.status]++
      if (ACTIVE.includes(t.status)) c.action++
    }
    return c
  }, [tasks])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = tasks.filter((t) => {
      if (filter === 'action' && !ACTIVE.includes(t.status)) return false
      if (filter !== 'all' && filter !== 'action' && t.status !== filter) return false
      return !q || t.title.toLowerCase().includes(q)
    })
    const byDate = (a: Task, b: Task) => b.created_at.localeCompare(a.created_at)
    const rank = (t: Task) => (focusActive && ACTIVE.includes(t.status) ? 0 : 1)
    return list.sort((a, b) => rank(a) - rank(b) || byDate(a, b))
  }, [tasks, filter, query, focusActive])

  if (tasks.length === 0) return <EmptyState title="Задач пока нет" hint="Когда появятся задачи, они будут показаны здесь." />

  const chips: { key: Filter; label: string }[] = [
    ...(focusActive ? [{ key: 'action' as Filter, label: 'Требуют действия' }] : []),
    { key: 'all', label: 'Все' },
    ...STATUSES.map((s) => ({ key: s as Filter, label: STATUS_LABELS[s] })),
  ]

  return (
    <div>
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Фильтр по статусу">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              className="chip"
              aria-pressed={filter === c.key}
              onClick={() => setFilter(c.key)}
            >
              {c.label} <span className="chip-count">{counts[c.key]}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          className="search"
          placeholder="Поиск по названию"
          aria-label="Поиск по названию"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {shown.length === 0 ? (
        <EmptyState
          title={filter === 'action' && !query ? 'Нет задач, требующих действия' : 'Ничего не найдено'}
          hint="Измените фильтр или поисковый запрос."
          action={
            <button
              className="btn btn-secondary"
              onClick={() => {
                setFilter('all')
                setQuery('')
              }}
            >
              Сбросить фильтры
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="tasks">
            <thead>
              <tr>
                <th>Задача</th>
                {objectNames && <th>Объект</th>}
                <th>Исполнитель</th>
                <th>Статус</th>
                <th>Создана</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((t) => (
                <tr key={t.id}>
                  <td className="title-cell">
                    <Link to={`/tasks/${t.id}`}>{t.title}</Link>
                  </td>
                  {objectNames && <td data-label="Объект">{objectNames[t.object_id] ?? '—'}</td>}
                  <td data-label="Исполнитель">{profiles[t.assignee_id]?.full_name ?? '—'}</td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td data-label="Создана" className="nowrap">
                    {new Date(t.created_at).toLocaleDateString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
