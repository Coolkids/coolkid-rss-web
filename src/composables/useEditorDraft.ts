import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { confirmAction } from '@/utils/ui'

// Feed and downloader forms contain scalar fields; fresh objects clear optional fields.
export function useEditorDraft<T extends object>(empty: () => T, busy: Ref<boolean>, extraDirty?: Ref<boolean>) {
  const form = ref(empty()) as Ref<T>
  const saved = ref(empty()) as Ref<T>
  const dirty = computed(() => JSON.stringify(form.value) !== JSON.stringify(saved.value))
  function reset(value: T = empty()) {
    form.value = { ...empty(), ...value }
    saved.value = { ...form.value }
  }
  async function canDiscard() {
    return !(dirty.value || extraDirty?.value) || await confirmAction('放弃未保存的更改？', '当前配置或排序尚未保存，离开后更改将丢失。', '放弃更改', true)
  }
  function beforeUnload(event: BeforeUnloadEvent) {
    if (dirty.value || extraDirty?.value || busy.value) { event.preventDefault(); event.returnValue = '' }
  }
  onBeforeRouteLeave(async () => !busy.value && await canDiscard())
  onMounted(() => window.addEventListener('beforeunload', beforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
  return { form, saved, dirty, reset, canDiscard }
}
