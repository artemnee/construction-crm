import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase, errorMessage } from '../lib/supabase'
import type { CrmObject, Task } from '../lib/types'
import ObjectForm from '../components/ObjectForm'
import TaskForm from '../components/TaskForm'
import TaskList from '../components/TaskList'
import { ConfirmDialog } from '../components/Modal'
import { useToast } from '../components/Toast'
import { Breadcrumbs, Loading, PageHeader } from '../components/ui'

export default function ObjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuth()
  const isManager = profile?.role === 'manager'
  const [object, setObject] = useState<CrmObject | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const [o, t] = await Promise.all([
      supabase.from('objects').select('id, name, address').eq('id', id!).maybeSingle(),
      supabase
        .from('tasks')
        .select('*')
        .eq('object_id', id!)
        .order('created_at', { ascending: false }),
    ])
    const err = o.error ?? t.error
    if (err) setError(errorMessage(err))
    else {
      setError('')
      setObject(o.data as CrmObject | null)
      setTasks(t.data as Task[])
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const remove = async () => {
    if (!object) return
    const { error: err } = await supabase.from('objects').delete().eq('id', object.id)
    if (err) return errorMessage(err)
    toast('Объект удалён')
    navigate('/')
  }

  if (loading) return <Loading />
  if (!object)
    return (
      <>
        <Breadcrumbs items={[{ label: 'Объекты', to: '/' }, { label: 'Не найден' }]} />
        <p className="error" role="alert">{error || 'Объект не найден'}</p>
      </>
    )

  return (
    <>
      <Breadcrumbs items={[{ label: 'Объекты', to: '/' }, { label: object.name }]} />
      <PageHeader
        title={object.name}
        description={object.address}
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

      <div className="section-head">
        <h2>Задачи</h2>
        {isManager && (
          <button className="btn btn-primary" onClick={() => setAddingTask(true)}>
            Добавить задачу
          </button>
        )}
      </div>
      <TaskList tasks={tasks} />

      {editing && (
        <ObjectForm
          object={object}
          onCancel={() => setEditing(false)}
          onDone={() => {
            setEditing(false)
            load()
          }}
        />
      )}
      {addingTask && (
        <TaskForm
          objectId={object.id}
          objects={[object]}
          onCancel={() => setAddingTask(false)}
          onDone={() => {
            setAddingTask(false)
            load()
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Удалить объект?"
          confirmLabel="Удалить"
          onConfirm={remove}
          onCancel={() => setDeleting(false)}
        >
          <p>
            Объект «{object.name}» будет удалён без возможности восстановления. Если в объекте есть задачи, система
            откажет в удалении — сначала удалите задачи.
          </p>
        </ConfirmDialog>
      )}
    </>
  )
}
