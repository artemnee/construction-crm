import { useState, type FormEvent } from 'react'
import { supabase, errorMessage } from '../lib/supabase'
import type { CrmObject } from '../lib/types'
import Modal from './Modal'
import { useToast } from './Toast'

interface Props {
  object?: CrmObject
  onDone: () => void
  onCancel: () => void
}

export default function ObjectForm({ object, onDone, onCancel }: Props) {
  const toast = useToast()
  const [name, setName] = useState(object?.name ?? '')
  const [address, setAddress] = useState(object?.address ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    const values = { name: name.trim(), address: address.trim() }
    const { error: err } = object
      ? await supabase.from('objects').update(values).eq('id', object.id)
      : await supabase.from('objects').insert(values)
    setSaving(false)
    if (err) setError(errorMessage(err))
    else {
      toast(object ? 'Объект сохранён' : 'Объект создан')
      onDone()
    }
  }

  return (
    <Modal title={object ? 'Редактирование объекта' : 'Новый объект'} onClose={onCancel}>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span className="label">
            Название <span className="req" aria-hidden="true">*</span>
          </span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span className="label">
            Адрес <span className="req" aria-hidden="true">*</span>
          </span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} required />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Отмена
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
