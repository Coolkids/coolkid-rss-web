import { Dialog, Notify } from 'quasar'

export function notify(message: string, type: 'positive' | 'negative' | 'warning' = 'positive') {
  Notify.create({ message, type, position: 'top', timeout: 2500 })
}

export function confirmAction(title: string, message: string, label = '确认', destructive = false): Promise<boolean> {
  return new Promise((resolve) => {
    Dialog.create({ title, message, persistent: true,
      cancel: { label: '取消', flat: true, color: 'grey-7' },
      ok: { label, color: destructive ? 'negative' : 'primary', unelevated: true }
    }).onOk(() => resolve(true)).onCancel(() => resolve(false))
  })
}

export const required = (value: unknown) => (typeof value === 'string' && !!value.trim()) || '请填写此项内容'
export function httpUrl(value: string) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol) || '请输入 http:// 或 https:// 开头的地址' }
  catch { return '请输入完整的有效地址' }
}

export function localDate(daysAgo = 0) {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

export function openExternal(url?: string) {
  if (url && httpUrl(url) === true) window.open(url, '_blank', 'noopener,noreferrer')
}
