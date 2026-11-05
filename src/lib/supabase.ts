import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

export function errorMessage(e: { message?: string; code?: string } | null | undefined): string {
  if (!e) return ''
  if (e.code === '23503') return 'Нельзя удалить: есть связанные данные (например, у объекта есть задачи). Сначала удалите их.'
  if (e.code === '42501') return 'Недостаточно прав для этого действия.'
  if (e.code === 'P0002') return 'Задача не найдена или недоступна.'
  if (e.code === '23514') return `Действие отклонено правилами системы: ${e.message ?? ''}`
  return e.message ?? 'Неизвестная ошибка'
}
