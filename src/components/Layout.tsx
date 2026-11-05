import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Layout() {
  const { profile, signOut } = useAuth()
  const { pathname } = useLocation()
  const isManager = profile?.role === 'manager'
  const onTask = pathname.startsWith('/tasks')
  const objectsActive = pathname === '/' || pathname.startsWith('/objects') || (onTask && isManager)
  const myActive = pathname.startsWith('/my-tasks') || (onTask && !isManager)
  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand">
            Мини-CRM
          </Link>
          <nav className="nav" aria-label="Основное меню">
            <Link to="/" className={`nav-link${objectsActive ? ' active' : ''}`} aria-current={objectsActive ? 'page' : undefined}>
              Объекты
            </Link>
            {profile?.role === 'executor' && (
              <Link to="/my-tasks" className={`nav-link${myActive ? ' active' : ''}`} aria-current={myActive ? 'page' : undefined}>
                Мои задачи
              </Link>
            )}
          </nav>
          <div className="user">
            <span className="user-name">{profile?.full_name}</span>
            <span className={`role-badge ${isManager ? 'role-manager' : 'role-executor'}`}>
              {isManager ? 'Постановщик' : 'Исполнитель'}
            </span>
            <button className="btn btn-ghost" onClick={signOut}>
              Выйти
            </button>
          </div>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </>
  )
}
