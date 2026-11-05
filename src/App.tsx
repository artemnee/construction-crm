import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import ObjectsPage from './pages/ObjectsPage'
import ObjectPage from './pages/ObjectPage'
import TaskPage from './pages/TaskPage'
import MyTasksPage from './pages/MyTasksPage'
import { Loading } from './components/ui'

export default function App() {
  const { signedIn, profile, loading, error, signOut } = useAuth()

  if (loading) return <Loading />
  if (!signedIn) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }
  if (!profile) {
    return (
      <div className="center">
        <p className="error">{error || 'Профиль не загружен'}</p>
        <button className="btn btn-secondary" onClick={signOut}>Выйти</button>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ObjectsPage />} />
        <Route path="/objects/:id" element={<ObjectPage />} />
        <Route path="/tasks/:id" element={<TaskPage />} />
        <Route
          path="/my-tasks"
          element={profile.role === 'executor' ? <MyTasksPage /> : <Navigate to="/" replace />}
        />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
