<template>
  <section class="workspace-page management-page" :class="{ 'management-page--detail': mobileDetail }">
    <PageHeading title="下载工具" subtitle="连接你的下载服务，让内容自动抵达。" eyebrow="下载服务">
      <q-btn unelevated color="primary" icon="add" label="添加工具" :disable="busy || loading" @click="addDownloader" />
    </PageHeading>
    <div class="management-layout">
      <aside class="workspace-panel management-library" aria-label="下载工具列表">
        <div class="panel-heading"><h2>已配置工具 <span class="count-tag">{{ items.length }}</span></h2><q-icon name="dns" color="grey-5" size="20px" /></div>
        <div class="library-search"><q-input v-model="keywords" outlined dense clearable placeholder="搜索工具名称" aria-label="搜索下载工具"><template #prepend><q-icon name="search" size="20px" /></template></q-input></div>
        <div v-if="dirty" class="draft-banner"><span>有未保存的配置</span><q-btn flat color="primary" label="继续编辑" @click="showEditor" /></div>
        <div v-if="loading" class="q-pa-md" role="status" aria-label="正在加载下载工具"><q-skeleton v-for="i in 3" :key="i" height="90px" class="q-mb-sm" /></div>
        <EmptyState v-else-if="loadError" error title="工具加载失败" description="请检查连接后重试。"><q-btn outline color="primary" label="重新加载" @click="load" /></EmptyState>
        <q-list v-else-if="visibleItems.length" class="management-list">
          <q-item v-for="item in visibleItems" :key="String(item.dlId)" v-ripple clickable :disable="busy" class="management-item" :active="String(form.dlId) === String(item.dlId)" active-class="management-item--active" @click="select(item)">
            <q-item-section><div class="item-topline"><span class="item-title ellipsis">{{ item.dlName || '未命名工具' }}</span><span class="state-label" :class="{ 'state-label--enabled': item.status === 1 }">{{ item.status === 1 ? '启用' : '停用' }}</span></div><div class="item-caption">{{ typeLabel(item.dlType) }}</div><div class="item-caption ellipsis">{{ endpointLabel(item.dlUrl) }}</div></q-item-section>
          </q-item>
        </q-list>
        <EmptyState v-else :icon="items.length ? 'search_off' : 'cloud_download'" :title="items.length ? '没有找到工具' : '连接第一个下载工具'" :description="items.length ? '试试其他名称，或清除搜索条件。' : '支持 qBittorrent 和 Transmission 下载服务。'">
          <q-btn v-if="items.length" flat color="primary" label="清除搜索" @click="keywords = ''" /><q-btn v-else outline color="primary" icon="add" label="添加工具" @click="addDownloader" />
        </EmptyState>
        <div class="tool-note"><q-icon name="info_outline" size="16px" /> 启用状态不代表服务连接状态</div>
      </aside>

      <main class="management-editor">
        <q-btn flat icon="arrow_back" label="返回工具列表" class="mobile-editor-back" @click="backToList" />
        <div v-if="loading" class="q-pa-lg"><q-skeleton height="60px" /><q-skeleton height="340px" class="q-mt-lg" /></div>
        <template v-else>
          <header class="editor-heading"><div><h2>{{ form.dlName || (form.dlId != null ? '未命名工具' : '添加下载工具') }}</h2><p>{{ dirty ? '有未保存的更改' : form.dlId != null ? '所有更改已保存' : '选择服务类型，并填写连接信息' }}</p></div><q-toggle v-model="enabled" color="positive" :disable="busy" :label="enabled ? '已启用' : '已停用'" /></header>
          <q-form ref="editorForm" greedy novalidate class="editor-form" @submit="save">
            <section class="form-block">
              <div class="form-block__heading"><q-icon name="dns" size="20px" /><div><h3>服务配置</h3><p>选择正在使用的下载服务。</p></div></div>
              <div class="service-types" role="group" aria-label="下载服务类型">
                <button v-for="type in typeOptions" :key="type.value" type="button" class="service-type" :class="{ 'service-type--active': Number(form.dlType) === type.value }" :aria-pressed="Number(form.dlType) === type.value" :disabled="busy" @click="form.dlType = type.value"><span class="service-symbol">{{ type.symbol }}</span><span>{{ type.label }}</span><q-icon :name="Number(form.dlType) === type.value ? 'radio_button_checked' : 'radio_button_unchecked'" size="18px" /></button>
              </div>
              <q-input v-model="form.dlName" outlined label="工具名称 *" placeholder="例如：家里的 NAS" :rules="[required]" lazy-rules hide-bottom-space :disable="busy" />
              <q-input v-model="form.dlUrl" outlined label="接口地址 *" placeholder="http://192.168.1.10:8080" inputmode="url" :rules="[required, httpUrl]" lazy-rules hide-bottom-space :disable="busy" />
              <div class="field-note"><q-icon name="link" size="17px" /> 填写 {{ typeLabel(form.dlType) }} 服务的接口地址，包含协议和端口。</div>
            </section>
            <section class="form-block">
              <div class="form-block__heading"><q-icon name="key" size="20px" /><div><h3>登录信息</h3><p>使用下载服务中配置的用户名和密码。</p></div></div>
              <q-input v-model="form.dlUser" outlined label="用户名" autocomplete="off" hide-bottom-space :disable="busy" />
              <q-input v-model="form.dlPasswd" outlined label="密码" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" hide-bottom-space :disable="busy"><template #append><q-btn flat round :icon="showPassword ? 'visibility_off' : 'visibility'" :aria-label="showPassword ? '隐藏密码' : '显示密码'" :aria-pressed="showPassword" :disable="busy" @click="showPassword = !showPassword" /></template></q-input>
            </section>
            <footer class="save-bar">
              <q-btn v-if="form.dlId != null" flat round color="negative" icon="delete_outline" aria-label="删除下载工具" :disable="busy" @click="remove" />
              <q-btn v-if="dirty" flat color="grey-7" label="撤销" :disable="busy" @click="undo" />
              <span class="save-bar__status">{{ dirty ? '更改尚未保存' : '配置就绪' }}</span>
              <q-btn type="submit" unelevated color="primary" icon="check" :label="form.dlId != null ? '保存更改' : '添加工具'" :loading="saving" :disable="deleting || (form.dlId != null && !dirty)" />
            </footer>
          </q-form>
        </template>
      </main>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { QForm, useQuasar } from 'quasar'
import api from '@/services/api'
import type { Downloader } from '@/models/domain'
import PageHeading from '@/components/PageHeading.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useEditorDraft } from '@/composables/useEditorDraft'
import { confirmAction, httpUrl, notify, required } from '@/utils/ui'

const $q = useQuasar()
const items = ref<Downloader[]>([])
const keywords = ref<string | null>('')
const loading = ref(true), loadError = ref(false), saving = ref(false), deleting = ref(false)
const mobileDetail = ref(false), showPassword = ref(false)
const busy = computed(() => saving.value || deleting.value)
const empty = (): Downloader => ({ dlName: '', dlUrl: '', dlType: 1, dlUser: '', dlPasswd: '', status: 1 })
const { form, saved, dirty, reset, canDiscard } = useEditorDraft(empty, busy)
const editorForm = ref<QForm>()
const typeOptions = [{ label: 'qBittorrent', value: 1, symbol: 'qb' }, { label: 'Transmission', value: 2, symbol: 'Tr' }]
const enabled = computed({ get: () => form.value.status === 1, set: value => { form.value.status = value ? 1 : 0 } })
const visibleItems = computed(() => items.value.filter(item => item.dlName.toLowerCase().includes((keywords.value || '').trim().toLowerCase())))
function typeLabel(type: number | string) { return typeOptions.find(option => option.value === Number(type))?.label || '未知类型' }
function endpointLabel(url: string) { try { const parsed = new URL(url); return parsed.host + parsed.pathname } catch { return '尚未配置地址' } }
async function showEditor() { mobileDetail.value = true; await nextTick(); if ($q.screen.lt.md) window.scrollTo(0, 0) }
async function backToList() { mobileDetail.value = false; await nextTick(); if ($q.screen.lt.md) window.scrollTo(0, 0) }
function setForm(item: Downloader = empty()) { reset({ ...item, dlType: Number(item.dlType) }); showPassword.value = false; nextTick(() => editorForm.value?.resetValidation()) }
async function select(item: Downloader) {
  if (busy.value) return
  if (String(form.value.dlId) !== String(item.dlId)) { if (!(await canDiscard())) return; setForm(item) }
  await showEditor()
}
async function addDownloader() { if (busy.value || !(await canDiscard())) return; setForm(); await showEditor() }
async function undo() { if (await canDiscard()) setForm(saved.value) }
async function fetchItems() { const response = await api.dllist(); items.value = response.data || []; loadError.value = false }
async function load() {
  loading.value = true; loadError.value = false
  try { await fetchItems(); if (!dirty.value && form.value.dlId == null) setForm(items.value[0]) }
  catch { loadError.value = true }
  finally { loading.value = false }
}
async function save() {
  if (busy.value) return
  saving.value = true
  const payload = { ...form.value, dlName: form.value.dlName.trim(), dlUrl: form.value.dlUrl.trim() }
  const previousIds = new Set(items.value.map(item => String(item.dlId)))
  try { await api.dlsave(payload) }
  catch { notify('保存失败，修改已保留，请重试', 'negative'); saving.value = false; return }
  setForm(payload.dlId != null ? payload : empty())
  notify('下载工具已保存')
  try {
    await fetchItems()
    const selected = payload.dlId != null ? items.value.find(item => String(item.dlId) === String(payload.dlId)) : items.value.find(item => !previousIds.has(String(item.dlId)) && item.dlName === payload.dlName && item.dlUrl === payload.dlUrl)
    if (selected) setForm(selected)
    keywords.value = ''
  } catch { loadError.value = true; notify('工具已保存，列表刷新失败，请重新加载', 'warning') }
  finally { saving.value = false }
}
async function remove() {
  if (busy.value || form.value.dlId == null) return
  const dlId = form.value.dlId
  if (!(await confirmAction('删除下载工具？', '将移除「' + (saved.value.dlName || '未命名工具') + '」。请确认关联规则是否仍需要此工具。', '删除工具', true))) return
  deleting.value = true
  try { await api.dldelete({ dlId }); items.value = items.value.filter(item => String(item.dlId) !== String(dlId)); setForm(visibleItems.value[0]); await backToList(); notify('下载工具已删除') }
  catch { notify('删除失败，请稍后重试', 'negative') }
  finally { deleting.value = false }
}
onMounted(load)
</script>

<style scoped>
.tool-note { display: flex; gap: 7px; align-items: center; border-top: 1px solid var(--border); color: var(--muted); padding: 16px; font-size: 11px; }
.service-types { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.service-type { display: flex; align-items: center; gap: 12px; text-align: left; min-width: 0; border: 1px solid var(--border); border-radius: 12px; background: white; padding: 16px; font: inherit; font-size: 13px; color: var(--muted); cursor: pointer; }
.service-type > .q-icon { margin-left: auto; }
.service-type--active { border-color: #7da5f4; background: #f5f8ff; color: var(--q-primary); }
.service-symbol { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; background: #eff5ff; color: #4776c6; font-size: 16px; font-weight: 600; flex-shrink: 0; }
.service-type:focus-visible { outline: 2px solid var(--q-primary); }
.service-type:disabled { opacity: .6; cursor: default; }
@media (max-width: 1199px) { .service-type { flex-wrap: wrap; gap: 8px; padding: 12px; } .service-type > span:nth-child(2) { order: 3; width: 100%; } }
</style>
