import { STATUS_LABELS } from '../lib/transitions'
import type { TaskStatus } from '../lib/types'

export default function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>
}
