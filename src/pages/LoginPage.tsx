import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message === 'Invalid login credentials' ? 'Неверный email или пароль' : err.message)
      setBusy(false)
    }
  }

  return (
    <form className="card form login" onSubmit={submit}>
      <div className="brand">Мини-CRM</div>
      <h1>Вход</h1>
      <p className="muted">Объекты и задачи строительной компании</p>
      <label className="field">
        <span className="label">Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="username" />
      </label>
      <label className="field">
        <span className="label">Пароль</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? 'Вход…' : 'Войти'}
      </button>
    </form>
  )
}
