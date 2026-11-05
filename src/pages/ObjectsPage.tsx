import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase, errorMessage } from '../lib/supabase'
import type { CrmObject } from '../lib/types'
import ObjectForm from '../components/ObjectForm'
import { EmptyState, Loading, PageHeader } from '../components/ui'

export default function ObjectsPage() {
  const { profile } = useAuth()
  const isManager = profile?.role === 'manager'
  const [objects, setObjects] = useState<CrmObject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('objects').select('id, name, address').order('name')
    if (err) setError(errorMessage(err))
    else setObjects(data as CrmObject[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addButton = isManager ? (
    <button className="btn btn-primary" onClick={() => setCreating(true)}>
      Добавить объект
    </button>
  ) : undefined

  return (
    <>
      <PageHeader
        title="Объекты"
        description={isManager ? 'Все строительные объекты' : 'Объекты, в которых у вас есть задачи'}
        actions={addButton}
      />
      {creating && (
        <ObjectForm
          onCancel={() => setCreating(false)}
          onDone={() => {
            setCreating(false)
            load()
          }}
        />
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <Loading />
      ) : objects.length === 0 ? (
        <EmptyState title="Объектов пока нет" hint={isManager ? 'Создайте первый объект.' : undefined} action={addButton} />
      ) : (
        <ul className="list grid">
          {objects.map((o) => (
            <li key={o.id}>
              <Link to={`/objects/${o.id}`} className="card card-link">
                <span className="card-title">{o.name}</span>
                <span className="muted">{o.address}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
