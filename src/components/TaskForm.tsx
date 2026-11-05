import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { supabase, errorMessage } from '../lib/supabase'
import type { CrmObject, Task } from '../lib/types'
import Modal from './Modal'
import { useToast } from './Toast'

interface Props {
  task?: Task
  objectId?: string
  objects: CrmObject[]
  onDone: () => void
  onCancel: () => void
}

export default function TaskForm({ task, objectId, objects, onDone, onCancel }: Props) {
  const { profiles } = useAuth()
  const toast = useToast()
  const executors = Object.values(profiles).filter((p) => p.role === 'executor')
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [objId, setObjId] = useState(task?.object_id ?? objectId ?? objects[0]?.id ?? '')
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? executors[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    const values = { title: title.trim(), description, object_id: objId, assignee_id: assigneeId }
    const { error: err } = task
      ? await supabase.from('tasks').update(values).eq('id', task.id)
      : await supabase.from('tasks').insert(values)
    setSaving(false)
    if (err) setError(errorMessage(err))
    else {
      toast(task ? 'Задача сохранена' : 'Задача создана')
      onDone()
    }
  }

  return (
    <Modal title={task ? 'Редактирование задачи' : 'Новая задача'} onClose={onCancel}>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span className="label">
            Название <span className="req" aria-hidden="true">*</span>
          </span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="field">
          <span className="label">Описание</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </label>
        <div className="form-grid">
          <label className="field">
            <span className="label">
              Объект <span className="req" aria-hidden="true">*</span>
            </span>
            <select value={objId} onChange={(e) => setObjId(e.target.value)} required>
              {objects.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">
              Исполнитель <span className="req" aria-hidden="true">*</span>
            </span>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} required>
              {executors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Отмена
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || !objId || !assigneeId}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
