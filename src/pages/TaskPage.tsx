import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase, errorMessage } from '../lib/supabase'
import { availableTransitions, STATUS_LABELS } from '../lib/transitions'
import type { CrmObject, Task, TaskHistory, TaskStatus } from '../lib/types'
import StatusBadge from '../components/StatusBadge'
import TaskForm from '../components/TaskForm'
import { ConfirmDialog } from '../components/Modal'
import { useToast } from '../components/Toast'
import { Breadcrumbs, Loading, PageHeader } from '../components/ui'

const fmt = (iso: string) => new Date(iso).toLocaleString('ru-RU')

const STEPS: TaskStatus[] = ['new', 'in_progress', 'in_review', 'done']

function hint(task: Task, isManager: boolean, isAssignee: boolean, canAct: boolean): string {
  if (task.status === 'done') return 'Задача принята, действий не требуется.'
  if (isManager) {
    if (task.status === 'in_review') return 'Ваша очередь: примите задачу или верните на доработку с комментарием.'
    if (task.status === 'new') return 'Ждёт, пока исполнитель возьмёт задачу в работу.'
    if (task.status === 'in_progress') return 'Исполнитель работает над задачей.'
    return 'Ждёт доработки исполнителем.'
  }
  if (!isAssignee) return 'Задача назначена другому исполнителю.'
  if (task.status === 'new') return 'Ваша очередь: возьмите в работу.'
  if (task.status === 'in_progress') return 'Когда закончите, отправьте задачу на проверку.'
  if (task.status === 'rework') return 'Постановщик вернул задачу: исправьте замечания и верните в работу.'
  return canAct ? '' : 'Ждёт проверки постановщика.'
}

function Stepper({ status }: { status: TaskStatus }) {
  const rework = status === 'rework'
  const current = rework ? 1 : STEPS.indexOf(status)
  return (
    <ol className="stepper" aria-label="Ход выполнения">
      {STEPS.map((s, i) => {
        const state = i < current || status === 'done' ? 'done' : i === current ? 'current' : 'todo'
        const isRework = rework && i === 1
        return (
          <li
            key={s}
            className={`step step-${state}${isRework ? ' step-rework' : ''}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="step-dot" aria-hidden="true">
              {state === 'done' ? '✓' : isRework ? '↩' : i + 1}
            </span>
            <span className="step-label">{isRework ? 'На доработке' : STATUS_LABELS[s]}</span>
          </li>
        )
      })}
    </ol>
  )
}

export default function TaskPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { profile, profiles } = useAuth()
  const isManager = profile!.role === 'manager'
  const [task, setTask] = useState<Task | null>(null)
  const [object, setObject] = useState<CrmObject | null>(null)
  const [allObjects, setAllObjects] = useState<CrmObject[]>([])
  const [history, setHistory] = useState<TaskHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const t = await supabase.from('tasks').select('*').eq('id', id!).maybeSingle()
    if (t.error) {
      setError(errorMessage(t.error))
      setLoading(false)
      return
    }
    const tk = t.data as Task | null
    setTask(tk)
    if (tk) {
      const [o, h, all] = await Promise.all([
        supabase.from('objects').select('id, name, address').eq('id', tk.object_id).maybeSingle(),
        supabase.from('task_history').select('*').eq('task_id', tk.id).order('created_at'),
        isManager ? supabase.from('objects').select('id, name, address').order('name') : Promise.resolve(null),
      ])
      const err = o.error ?? h.error ?? all?.error
      if (err) setError(errorMessage(err))
      else {
        setError('')
        setObject(o.data as CrmObject | null)
        setHistory(h.data as TaskHistory[])
        if (all) setAllObjects(all.data as CrmObject[])
      }
    }
    setLoading(false)
  }, [id, isManager])

  useEffect(() => {
    load()
  }, [load])

  const change = async (to: Task['status']) => {
    if (busy) return
    setBusy(true)
    setError('')
    const { error: err } = await supabase.rpc('change_task_status', {
      p_task_id: task!.id,
      p_new_status: to,
      p_comment: comment.trim() || null,
    })
    setBusy(false)
    if (err) setError(errorMessage(err))
    else {
      setComment('')
      toast(`Статус изменён: ${STATUS_LABELS[to]}`)
      load()
    }
  }

  const remove = async () => {
    if (!task) return
    const { error: err } = await supabase.from('tasks').delete().eq('id', task.id)
    if (err) return errorMessage(err)
    toast('Задача удалена')
    navigate(`/objects/${task.object_id}`)
  }

  if (loading) return <Loading />
  if (!task)
    return (
      <>
        <Breadcrumbs items={[{ label: 'Объекты', to: '/' }, { label: 'Задача не найдена' }]} />
        <p className="error" role="alert">{error || 'Задача не найдена'}</p>
      </>
    )

  const actions = availableTransitions(task, profile!)
  const needsComment = actions.some((a) => a.commentRequired)
  const name = (uid: string) => profiles[uid]?.full_name ?? '—'
  const hintText = hint(task, isManager, task.assignee_id === profile!.id, actions.length > 0)
  const lastRework = task.status === 'rework' ? [...history].reverse().find((h) => h.to_status === 'rework') : undefined
  const reasonMissing = needsComment && !comment.trim()

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Объекты', to: '/' },
          ...(object ? [{ label: object.name, to: `/objects/${object.id}` }] : []),
          { label: task.title },
        ]}
      />
      <PageHeader
        title={task.title}
        actions={
          isManager && (
            <>
              <button className="btn btn-secondary" onClick={() => setEditing(true)}>
                Редактировать
              </button>
              <button className="btn btn-danger-outline" onClick={() => setDeleting(true)}>
                Удалить
              </button>
            </>
          )
        }
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <section className="card" aria-label="Статус">
        <div className="status-head">
          <span className="muted">Статус</span>
          <StatusBadge status={task.status} />
        </div>
        <Stepper status={task.status} />
        {lastRework && (
          <div className="callout callout-rework">
            <strong>Возвращена на доработку</strong>
            {lastRework.comment && <div className="pre">{lastRework.comment}</div>}
          </div>
        )}
      </section>

      <section className="card" aria-label="Действия">
        <h2>Что дальше</h2>
        {hintText && <p className="next-hint">{hintText}</p>}
        {actions.length > 0 && (
          <div className="form">
            <label className="field">
              <span className="label">
                Комментарий{' '}
                {needsComment ? (
                  <span className="req">обязателен для «Вернуть на доработку»</span>
                ) : (
                  <span className="muted">необязательно</span>
                )}
              </span>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
            </label>
            <div className="row">
              {actions.map((a) => (
                <button
                  key={a.to}
                  className={a.commentRequired ? 'btn btn-danger-outline' : 'btn btn-primary'}
                  disabled={busy || (a.commentRequired && reasonMissing)}
                  onClick={() => change(a.to)}
                >
                  {busy ? 'Сохранение…' : a.label}
                </button>
              ))}
            </div>
            {reasonMissing && <p className="muted">Чтобы вернуть на доработку, напишите комментарий.</p>}
          </div>
        )}
      </section>

      <section className="card" aria-label="Описание">
        <h2>Описание</h2>
        <p className="pre">{task.description || 'Без описания'}</p>
        <dl>
          <dt>Объект</dt>
          <dd>{object ? `${object.name}, ${object.address}` : '—'}</dd>
          <dt>Исполнитель</dt>
          <dd>{name(task.assignee_id)}</dd>
          <dt>Автор</dt>
          <dd>{name(task.author_id)}</dd>
          <dt>Создана</dt>
          <dd>{fmt(task.created_at)}</dd>
        </dl>
      </section>

      <section className="card" aria-label="История">
        <h2>История</h2>
        <ol className="timeline">
          {history.map((h) => (
            <li key={h.id}>
              <div className="tl-head">
                <strong>{name(h.changed_by)}</strong>
                <time className="muted" dateTime={h.created_at}>
                  {fmt(h.created_at)}
                </time>
              </div>
              <div>
                {h.from_status ? `${STATUS_LABELS[h.from_status]} → ` : 'Создана → '}
                {STATUS_LABELS[h.to_status]}
              </div>
              {h.comment && <div className="tl-comment pre">{h.comment}</div>}
            </li>
          ))}
        </ol>
      </section>

      {editing && (
        <TaskForm
          task={task}
          objects={allObjects}
          onCancel={() => setEditing(false)}
          onDone={() => {
            setEditing(false)
            load()
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog title="Удалить задачу?" confirmLabel="Удалить" onConfirm={remove} onCancel={() => setDeleting(false)}>
          <p>
            Задача «{task.title}» будет удалена безвозвратно, вместе с ней удалится вся история изменений статусов и
            комментарии.
          </p>
        </ConfirmDialog>
      )}
    </>
  )
}
