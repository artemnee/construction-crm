import type { Profile, Role, Task, TaskStatus } from './types'

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  in_review: 'На проверке',
  done: 'Принята',
  rework: 'На доработке',
}

export interface Transition {
  from: TaskStatus
  to: TaskStatus
  role: Role
  label: string
  commentRequired: boolean
}

export const TRANSITIONS: Transition[] = [
  { from: 'new', to: 'in_progress', role: 'executor', label: 'Взять в работу', commentRequired: false },
  { from: 'in_progress', to: 'in_review', role: 'executor', label: 'Отправить на проверку', commentRequired: false },
  { from: 'rework', to: 'in_progress', role: 'executor', label: 'Вернуть в работу', commentRequired: false },
  { from: 'in_review', to: 'done', role: 'manager', label: 'Принять', commentRequired: false },
  { from: 'in_review', to: 'rework', role: 'manager', label: 'Вернуть на доработку', commentRequired: true },
]

export function availableTransitions(task: Task, profile: Profile): Transition[] {
  return TRANSITIONS.filter(
    (t) =>
      t.from === task.status &&
      t.role === profile.role &&
      (t.role === 'manager' || task.assignee_id === profile.id),
  )
}
