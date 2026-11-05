import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { supabase, errorMessage } from '../lib/supabase'
import type { Task } from '../lib/types'
import TaskList from '../components/TaskList'
import { Loading, PageHeader } from '../components/ui'

export default function MyTasksPage() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [objectNames, setObjectNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('tasks').select('*').eq('assignee_id', profile!.id).order('created_at', { ascending: false }),
      supabase.from('objects').select('id, name'),
    ]).then(([t, o]) => {
      const err = t.error ?? o.error
      if (err) setError(errorMessage(err))
      else {
        setTasks(t.data as Task[])
        setObjectNames(Object.fromEntries((o.data as { id: string; name: string }[]).map((x) => [x.id, x.name])))
      }
      setLoading(false)
    })
  }, [profile])

  return (
    <>
      <PageHeader title="Мои задачи" description="Задачи, назначенные на вас" />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading ? <Loading /> : <TaskList tasks={tasks} objectNames={objectNames} focusActive />}
    </>
  )
}
