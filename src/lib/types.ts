export type Role = 'manager' | 'executor'
export type TaskStatus = 'new' | 'in_progress' | 'in_review' | 'done' | 'rework'

export interface Profile {
  id: string
  full_name: string
  role: Role
}

export interface CrmObject {
  id: string
  name: string
  address: string
}

export interface Task {
  id: string
  title: string
  description: string
  object_id: string
  assignee_id: string
  status: TaskStatus
  author_id: string
  created_at: string
}

export interface TaskHistory {
  id: string
  task_id: string
  from_status: TaskStatus | null
  to_status: TaskStatus
  changed_by: string
  comment: string | null
  created_at: string
}
