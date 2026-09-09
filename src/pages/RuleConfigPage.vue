<template>
  <section class="rule-page" :class="{ 'rule-page--detail': mobileDetail }">
    <header class="page-heading">
      <div>
        <div class="page-eyebrow"><span /> 自动下载工作台</div>
        <h1>规则管理</h1>
        <p>让订阅内容，按你的规则自动归档。</p>
      </div>
      <div class="heading-actions">
        <q-btn unelevated color="primary" icon="add" label="新建规则" :disable="busy || loadingRules" @click="addRule" />
        <q-btn flat round icon="more_horiz" aria-label="更多规则操作" :disable="busy">
          <q-menu anchor="bottom right" self="top right">
            <q-list style="min-width: 220px">
              <q-item v-close-popup clickable :disable="downloading" @click="downloadOld">
                <q-item-section avatar><q-icon name="history" /></q-item-section>
                <q-item-section>重新下载历史内容</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </header>
    <div v-if="downloading" class="operation-notice" role="status"><q-spinner size="18px" /> 正在提交历史内容下载任务…</div>

    <div class="rule-workspace" :class="{ 'rule-workspace--detail': mobileDetail }">
      <aside class="rule-library" aria-label="规则列表">
        <div class="library-heading">
          <h2>我的规则 <span class="count-pill">{{ rules.length }}</span></h2>
          <span class="library-status"><i /> {{ enabledRuleCount }} 条启用</span>
        </div>
        <div class="library-tools">
          <q-input v-model="keywords" outlined dense clearable placeholder="搜索名称或匹配内容" aria-label="搜索规则" hide-bottom-space>
            <template #prepend><q-icon name="search" size="20px" /></template>
          </q-input>
          <q-tabs v-model="statusFilter" dense no-caps align="justify" active-color="primary" indicator-color="transparent" class="filter-tabs" aria-label="按规则状态筛选">
            <q-tab name="all" label="全部" />
            <q-tab name="enabled" label="已启用" />
            <q-tab name="disabled" label="已停用" />
          </q-tabs>
        </div>
        <div v-if="isDirty" class="draft-reminder">
          <div><q-icon name="edit_note" size="20px" /><span>有一条未保存的规则</span></div>
          <q-btn flat dense color="primary" label="继续编辑" :disable="busy" @click="focusEditor" />
        </div>
        <div v-if="loadingRules" class="list-skeleton" role="status" aria-label="正在加载规则">
          <q-skeleton v-for="index in 4" :key="index" height="94px" class="q-mb-sm" />
        </div>
        <div v-else-if="rulesError" class="empty-state">
          <q-icon name="cloud_off" size="32px" /><h3>规则加载失败</h3><p>请检查连接后重试。</p>
          <q-btn outline color="primary" label="重新加载" @click="initializeRules" />
        </div>
        <q-list v-else-if="filteredRules.length" class="rule-list" aria-label="可选规则">
          <q-item v-for="item in filteredRules" :key="String(item.ruleId)" v-ripple clickable :disable="busy" :active="isSelected(item)" :aria-current="isSelected(item) ? 'true' : undefined" active-class="rule-item--selected" class="rule-item" @click="selectRule(item)">
            <q-item-section>
              <div class="rule-item__top">
                <span class="rule-item__title ellipsis">{{ item.ruleTitle || '未命名规则' }}</span>
                <span class="status-dot" :class="{ 'status-dot--enabled': item.status === 1 }" :aria-label="item.status === 1 ? '已启用' : '已停用'" />
              </div>
              <div class="rule-item__param ellipsis">{{ item.ruleParam || '尚未配置匹配内容' }}</div>
              <div class="rule-item__meta">
                <span>{{ Number(item.ruleType) === 1 ? '正则表达式' : '关键词' }}</span>
                <span>{{ item.feedIds?.length || 0 }} 个订阅</span>
                <q-icon v-if="isSelected(item)" name="arrow_forward" size="16px" class="q-ml-auto" />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
        <div v-else class="empty-state">
          <div class="empty-state__icon"><q-icon :name="rules.length ? 'search_off' : 'playlist_add'" size="30px" /></div>
          <h3>{{ rules.length ? '没有找到规则' : '从第一条规则开始' }}</h3>
          <p>{{ rules.length ? '试试其他关键词，或清除筛选条件。' : '设置匹配条件，让下载自动进行。' }}</p>
          <q-btn v-if="rules.length" flat color="primary" label="清除筛选" @click="clearFilters" />
          <q-btn v-else outline color="primary" icon="add" label="创建规则" @click="addRule" />
        </div>
        <div class="library-footer"><q-icon name="info_outline" size="16px" /> 仅已启用的规则会参与自动下载</div>
      </aside>

      <main class="rule-detail" :aria-busy="busy">
        <q-btn flat dense icon="arrow_back" label="返回规则列表" class="mobile-back" @click="backToList" />
        <div v-if="loadingRules" class="editor-loading" role="status" aria-label="正在加载配置">
          <q-skeleton width="45%" height="28px" />
          <q-skeleton v-for="index in 3" :key="index" height="160px" class="q-mt-lg" />
        </div>
        <template v-else>
          <header class="detail-heading">
            <div class="detail-heading__text">
              <div class="detail-eyebrow">{{ isExisting ? '规则配置' : '创建自动下载规则' }}</div>
              <h2>{{ form.ruleTitle || (isExisting ? '未命名规则' : '新建规则') }}</h2>
              <div class="draft-status" aria-live="polite"><span :class="{ 'draft-status__dot': isDirty }" />{{ isDirty ? '有未保存的更改' : isExisting ? '所有更改已保存' : '填写下方内容，创建你的下载规则' }}</div>
            </div>
            <q-toggle v-model="enabled" :disable="busy" color="positive" :label="enabled ? '已启用' : '已停用'" class="enable-toggle" />
          </header>
          <q-tabs v-model="detailTab" no-caps inline-label align="left" active-color="primary" indicator-color="primary" class="detail-tabs">
            <q-tab name="config" icon="tune" label="规则配置" />
            <q-tab name="preview" icon="fact_check" :label="previewState === 'success' ? '匹配预览 · ' + preview.length : '匹配预览'" />
          </q-tabs>

          <q-form ref="ruleForm" greedy class="rule-form" @submit="saveRule">
            <fieldset v-show="detailTab === 'config'" class="config-fields" :disabled="busy">
              <section class="form-section" aria-labelledby="match-heading">
                <div class="section-heading">
                  <span class="section-number">01</span>
                  <div><h3 id="match-heading">匹配什么内容</h3><p>为规则命名，并设置内容筛选条件。</p></div>
                </div>
                <q-input v-model="form.ruleTitle" outlined label="规则名称 *" placeholder="例如：每周纪录片" :rules="[required]" lazy-rules hide-bottom-space :disable="busy" />
                <div id="match-type-label" class="field-label">匹配方式</div>
                <div class="match-types" role="group" aria-labelledby="match-type-label">
                  <button v-for="type in ruleTypes" :key="type.value" type="button" class="match-type" :class="{ 'match-type--active': Number(form.ruleType) === type.value }" :aria-pressed="Number(form.ruleType) === type.value" :disabled="busy" @click="form.ruleType = type.value">
                    <q-icon :name="type.icon" size="22px" />
                    <span><strong>{{ type.label }}</strong><small>{{ type.description }}</small></span>
                    <q-icon :name="Number(form.ruleType) === type.value ? 'radio_button_checked' : 'radio_button_unchecked'" size="18px" class="match-type__check" />
                  </button>
                </div>
                <q-input ref="paramInput" v-model="form.ruleParam" outlined type="textarea" autogrow :input-style="{ minHeight: '76px' }" :input-class="Number(form.ruleType) === 1 ? 'expression-input' : ''" :label="Number(form.ruleType) === 1 ? '正则表达式 *' : '匹配关键词 *'" :placeholder="Number(form.ruleType) === 1 ? '例如：纪录片.*1080[pP]' : '例如：纪录片'" :rules="[required]" lazy-rules hide-bottom-space :disable="busy" />
                <div class="field-help"><q-icon name="lightbulb_outline" size="17px" /><span>{{ Number(form.ruleType) === 1 ? '适合复杂匹配条件。保存前可先预览，确认表达式的实际匹配结果。' : '输入需要匹配的内容，通过「匹配预览」检查筛选结果。' }}</span></div>
              </section>

              <section class="form-section" aria-labelledby="feed-heading">
                <div class="section-heading">
                  <span class="section-number">02</span>
                  <div><h3 id="feed-heading">应用到哪些订阅</h3><p>选择参与匹配的 Feed，限定规则的作用范围。</p></div>
                  <span class="section-count">已选 {{ form.feedIds?.length || 0 }}</span>
                </div>
                <q-select v-model="form.feedIds" outlined emit-value map-options multiple use-chips use-input input-debounce="0" :options="filteredFeedOptions" :loading="loadingOptions" :disable="busy || loadingOptions || optionsError" label="关联 Feed" hide-bottom-space @filter="filterFeeds">
                  <template #prepend><q-icon name="rss_feed" size="21px" /></template>
                  <template #no-option><q-item><q-item-section class="text-grey-7">{{ feeds.length ? '没有找到匹配的订阅' : '暂无可用订阅，请先在订阅管理中添加' }}</q-item-section></q-item></template>
                </q-select>
                <div v-if="!form.feedIds?.length" class="field-help"><q-icon name="info_outline" size="17px" /><span>尚未关联订阅，请确认规则需要应用的 Feed。</span></div>
                <div v-if="optionsError" class="inline-error" role="alert">订阅和下载工具加载失败。<q-btn flat dense color="primary" label="重试" @click="loadOptions" /></div>
              </section>

              <section class="form-section" aria-labelledby="download-heading">
                <div class="section-heading">
                  <span class="section-number">03</span>
                  <div><h3 id="download-heading">下载到哪里</h3><p>指定下载工具、保存位置和目录方式。</p></div>
                </div>
                <q-select v-model="form.dlId" outlined emit-value map-options clearable :options="downloaderOptions" :loading="loadingOptions" :disable="busy || loadingOptions || optionsError" label="下载工具" hide-bottom-space>
                  <template #prepend><q-icon name="cloud_download" size="21px" /></template>
                  <template #no-option><q-item><q-item-section class="text-grey-7">暂无下载工具，请先在下载工具页面添加</q-item-section></q-item></template>
                </q-select>
                <div class="download-fields">
                  <q-input v-model="form.ruleSavePath" outlined label="保存路径" placeholder="输入下载工具使用的目录" hide-bottom-space :disable="busy"><template #prepend><q-icon name="folder_open" size="21px" /></template></q-input>
                  <q-select v-model="form.ruleSaveParam" outlined emit-value map-options :options="saveParams" label="目录方式" hide-bottom-space :disable="busy" />
                </div>
              </section>
            </fieldset>

            <section v-show="detailTab === 'preview'" class="preview-panel" aria-label="匹配预览" :aria-busy="loadingPreview">
              <div class="preview-heading">
                <div><h3>先确认结果，再交给自动下载</h3><p>使用当前配置预览，无需先保存规则。</p></div>
                <q-btn outline color="primary" icon="play_arrow" :label="previewState === 'idle' ? '运行预览' : '重新预览'" :loading="loadingPreview" :disable="busy" @click="testRule" />
              </div>
              <div class="preview-scope"><span>{{ Number(form.ruleType) === 1 ? '正则表达式' : '关键词' }}</span><code>{{ form.ruleParam || '尚未填写匹配内容' }}</code><span>{{ form.feedIds?.length || 0 }} 个关联订阅</span></div>
              <div v-if="previewIsStale" class="stale-notice" role="status"><q-icon name="update" size="20px" /> 匹配条件已更改，请重新预览以更新结果。</div>
              <div v-if="loadingPreview" class="empty-state preview-empty" role="status"><q-spinner-dots color="primary" size="40px" /><h3>正在匹配订阅内容</h3><p>稍等片刻，结果马上呈现。</p></div>
              <div v-else-if="previewState === 'error'" class="empty-state preview-empty" role="alert"><div class="empty-state__icon"><q-icon name="cloud_off" size="30px" /></div><h3>预览暂时不可用</h3><p>请检查匹配内容或网络连接，然后重试。</p><q-btn outline color="primary" label="重试预览" @click="testRule" /></div>
              <template v-else-if="previewState === 'success' && preview.length">
                <div class="preview-summary" aria-live="polite"><strong>{{ preview.length }} 条匹配内容</strong><span>{{ pendingDownloadCount }} 条未下载</span></div>
                <q-list separator class="preview-list" :class="{ 'preview-list--stale': previewIsStale }">
                  <q-item v-for="item in preview" :key="String(item.recordId)" class="preview-item">
                    <q-item-section avatar><div class="record-icon"><q-icon name="article" size="22px" /></div></q-item-section>
                    <q-item-section><q-item-label class="preview-title">{{ item.recordTitle }}</q-item-label><q-item-label caption>{{ item.feedName || '未知 Feed' }}</q-item-label></q-item-section>
                    <q-item-section side><span class="download-state" :class="{ 'download-state--done': item.recordIsdl !== 0 }"><q-icon :name="item.recordIsdl === 0 ? 'schedule' : 'check_circle'" size="15px" />{{ item.recordIsdl === 0 ? '未下载' : '已下载' }}</span></q-item-section>
                  </q-item>
                </q-list>
              </template>
              <div v-else class="empty-state preview-empty">
                <div class="preview-illustration"><q-icon name="manage_search" size="44px" /><span class="preview-illustration__spark"><q-icon name="auto_awesome" size="16px" /></span></div>
                <h3>{{ previewState === 'success' ? '暂时没有匹配内容' : '看看这条规则会找到什么' }}</h3>
                <p>{{ previewState === 'success' ? '试着调整匹配内容或关联订阅，再运行一次预览。' : '填写匹配条件后运行预览，确认筛选结果是否符合预期。' }}</p>
                <q-btn flat color="primary" icon="tune" label="调整匹配条件" @click="detailTab = 'config'" />
              </div>
              <div class="preview-footnote"><q-icon name="info_outline" size="16px" /> 预览仅用于检查匹配结果，不会触发下载。</div>
            </section>

            <footer class="editor-actions">
              <q-btn v-if="isExisting" flat round color="grey-7" icon="more_horiz" aria-label="当前规则操作" :disable="busy">
                <q-menu anchor="top left" self="bottom left">
                  <q-list style="min-width: 160px">
                    <q-item v-close-popup clickable :disable="!isDirty" @click="resetChanges"><q-item-section avatar><q-icon name="undo" /></q-item-section><q-item-section>撤销更改</q-item-section></q-item>
                    <q-item v-close-popup clickable class="text-negative" @click="removeRule"><q-item-section avatar><q-icon name="delete_outline" /></q-item-section><q-item-section>删除规则</q-item-section></q-item>
                  </q-list>
                </q-menu>
              </q-btn>
              <span class="action-status">{{ isDirty ? '更改尚未保存' : isExisting ? '已保存' : '新规则' }}</span>
              <div class="action-buttons">
                <q-btn outline color="primary" icon="visibility" label="预览匹配" :loading="loadingPreview" :disable="busy" @click="testRule" />
                <q-btn unelevated color="primary" icon="check" :label="isExisting ? '保存更改' : '创建规则'" :loading="saving" :disable="deleting || loadingRules || (isExisting && !isDirty)" @click="submitRule" />
              </div>
            </footer>
          </q-form>
        </template>
      </main>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { isAxiosError } from 'axios'
import { QForm, QInput, useQuasar } from 'quasar'
import api from '@/services/api'
import type { Downloader, Feed, RssRecord, Rule } from '@/models/domain'

const $q = useQuasar()
const rules = ref<Rule[]>([])
const feeds = ref<Feed[]>([])
const downloaders = ref<Downloader[]>([])
const keywords = ref<string | null>('')
const statusFilter = ref('all')
const mobileDetail = ref(false)
const detailTab = ref('config')
const loadingRules = ref(true)
const rulesError = ref(false)
const loadingOptions = ref(false)
const optionsError = ref(false)
const saving = ref(false)
const deleting = ref(false)
const downloading = ref(false)
const busy = computed(() => saving.value || deleting.value)
const ruleForm = ref<QForm>()
const paramInput = ref<QInput>()

const emptyRule = (): Rule => ({
  ruleTitle: '', ruleParam: '', ruleType: 0, ruleSavePath: '/home/bt/nas1',
  ruleSaveParam: 0, dlId: undefined, feedIds: [], status: 1
})
const form = reactive<Rule>(emptyRule())
const savedForm = ref<Rule>(emptyRule())
const copyRule = (rule: Rule): Rule => ({ ...rule, feedIds: [...(rule.feedIds || [])] })
const fingerprint = (rule: Rule) => JSON.stringify({
  ruleId: rule.ruleId == null ? null : String(rule.ruleId),
  ruleTitle: rule.ruleTitle, ruleParam: rule.ruleParam, ruleType: Number(rule.ruleType),
  ruleSavePath: rule.ruleSavePath, ruleSaveParam: Number(rule.ruleSaveParam),
  dlId: rule.dlId == null ? null : String(rule.dlId),
  feedIds: (rule.feedIds || []).map(String).sort(), status: rule.status
})
const isDirty = computed(() => fingerprint(form) !== fingerprint(savedForm.value))
const isExisting = computed(() => form.ruleId != null)
const enabled = computed({ get: () => form.status === 1, set: (value) => { form.status = value ? 1 : 0 } })
const enabledRuleCount = computed(() => rules.value.filter((rule) => rule.status === 1).length)
const filteredRules = computed(() => {
  const query = (keywords.value || '').trim().toLocaleLowerCase()
  return rules.value.filter((rule) => {
    const matchesStatus = statusFilter.value === 'all' || (statusFilter.value === 'enabled' ? rule.status === 1 : rule.status !== 1)
    return matchesStatus && (rule.ruleTitle + '\n' + rule.ruleParam).toLocaleLowerCase().includes(query)
  })
})
const required = (value: unknown) => (typeof value === 'string' && !!value.trim()) || '请填写此项内容'
const ruleTypes = [
  { label: '普通关键词', value: 0, icon: 'text_fields', description: '按内容关键词筛选' },
  { label: '正则表达式', value: 1, icon: 'data_object', description: '灵活定义匹配模式' }
]
const saveParams = [{ label: '默认', value: 0 }, { label: '不新建子文件夹', value: 1 }]
const feedQuery = ref('')
const filteredFeedOptions = computed(() => feeds.value.filter((feed) => feed.feedName.toLocaleLowerCase().includes(feedQuery.value)).map((feed) => ({ label: feed.feedName, value: feed.feedId })))
const downloaderOptions = computed(() => downloaders.value.map((item) => ({ label: item.dlName, value: item.dlId })))
function filterFeeds(value: string, update: (callback: () => void) => void) {
  update(() => { feedQuery.value = value.trim().toLocaleLowerCase() })
}
function isSelected(rule: Rule) { return isExisting.value && String(form.ruleId) === String(rule.ruleId) }
function clearFilters() { keywords.value = ''; statusFilter.value = 'all' }
function showError(error: unknown) {
  $q.notify({ type: 'negative', position: 'top', message: error instanceof Error && !isAxiosError(error) ? error.message : '操作失败，当前修改已保留，请稍后重试' })
}

function confirmAction(title: string, message: string, label: string, destructive = false): Promise<boolean> {
  return new Promise((resolve) => {
    $q.dialog({ title, message, persistent: true, cancel: { label: '取消', flat: true, color: 'grey-7' }, ok: { label, color: destructive ? 'negative' : 'primary', unelevated: true } })
      .onOk(() => resolve(true)).onCancel(() => resolve(false))
  })
}
async function canDiscard() {
  return !isDirty.value || await confirmAction('放弃未保存的更改？', '当前规则的更改尚未保存，离开后这些更改将丢失。', '放弃更改', true)
}

const preview = ref<RssRecord[]>([])
const loadingPreview = ref(false)
const previewState = ref<'idle' | 'success' | 'error'>('idle')
const previewSnapshot = ref('')
let previewRequest = 0
const matchFingerprint = computed(() => JSON.stringify({ ruleParam: form.ruleParam, ruleType: Number(form.ruleType), feedIds: (form.feedIds || []).map(String).sort() }))
const previewIsStale = computed(() => previewState.value !== 'idle' && previewSnapshot.value !== matchFingerprint.value)
const pendingDownloadCount = computed(() => preview.value.filter((record) => record.recordIsdl === 0).length)

function setForm(rule: Rule) {
  // Clear optional fields too, so a new rule cannot inherit the previous downloader.
  delete form.ruleId
  Object.assign(form, emptyRule(), copyRule(rule), { ruleType: Number(rule.ruleType), ruleSaveParam: Number(rule.ruleSaveParam) })
  savedForm.value = copyRule(form)
  previewRequest++
  loadingPreview.value = false
  preview.value = []
  previewState.value = 'idle'
  previewSnapshot.value = ''
  feedQuery.value = ''
  detailTab.value = 'config'
  nextTick(() => ruleForm.value?.resetValidation())
}
async function focusEditor() {
  mobileDetail.value = true
  await nextTick()
  if ($q.screen.lt.md) window.scrollTo({ top: 0, behavior: 'auto' })
}
async function backToList() {
  mobileDetail.value = false
  await nextTick()
  if ($q.screen.lt.md) window.scrollTo({ top: 0, behavior: 'auto' })
}
async function addRule() {
  if (busy.value || !(await canDiscard())) return
  setForm(emptyRule())
  await focusEditor()
}
async function selectRule(rule: Rule) {
  if (busy.value) return
  if (!isSelected(rule)) {
    if (!(await canDiscard())) return
    setForm(rule)
  }
  await focusEditor()
}
async function resetChanges() {
  if (busy.value || !(await canDiscard())) return
  setForm(savedForm.value)
}
async function fetchRules() {
  const response = await api.rulelist({ keywords: '' })
  rules.value = response.data || []
  rulesError.value = false
}
async function initializeRules() {
  loadingRules.value = true
  rulesError.value = false
  try {
    await fetchRules()
    if (!isDirty.value && !isExisting.value) setForm(rules.value[0] || emptyRule())
  } catch {
    rulesError.value = true
  } finally {
    loadingRules.value = false
  }
}
async function loadOptions() {
  loadingOptions.value = true
  optionsError.value = false
  try {
    const [feedResponse, downloaderResponse] = await Promise.all([api.getFeedList(), api.dllist()])
    feeds.value = feedResponse.data || []
    downloaders.value = downloaderResponse.data || []
  } catch {
    optionsError.value = true
  } finally {
    loadingOptions.value = false
  }
}
async function testRule() {
  if (busy.value || loadingPreview.value) return
  if (!form.ruleParam.trim()) {
    detailTab.value = 'config'
    await nextTick()
    paramInput.value?.validate()
    paramInput.value?.focus()
    $q.notify({ type: 'warning', position: 'top', message: '请先填写匹配内容' })
    return
  }
  detailTab.value = 'preview'
  loadingPreview.value = true
  const requestId = ++previewRequest
  const snapshot = matchFingerprint.value
  const payload = { ruleParam: form.ruleParam, ruleType: Number(form.ruleType), feedIds: [...(form.feedIds || [])] }
  await focusEditor()
  try {
    const response = await api.ruletest(payload)
    if (requestId !== previewRequest) return
    preview.value = response.data || []
    previewSnapshot.value = snapshot
    previewState.value = 'success'
  } catch {
    if (requestId !== previewRequest) return
    preview.value = []
    previewSnapshot.value = snapshot
    previewState.value = 'error'
  } finally {
    if (requestId === previewRequest) loadingPreview.value = false
  }
}
async function submitRule() {
  if (busy.value) return
  // Reveal validation errors even when saving from the preview tab.
  detailTab.value = 'config'
  await nextTick()
  ruleForm.value?.submit()
}
async function saveRule() {
  if (busy.value || (isExisting.value && !isDirty.value)) return
  saving.value = true
  const payload = copyRule(form)
  payload.ruleTitle = payload.ruleTitle.trim()
  const previousIds = new Set(rules.value.map((rule) => String(rule.ruleId)))
  try {
    await api.rulesave(payload)
  } catch (error) {
    showError(error)
    saving.value = false
    return
  }
  // Saving and refreshing are separate: a failed refresh must not invite a duplicate save.
  setForm(payload.ruleId != null ? payload : emptyRule())
  $q.notify({ type: 'positive', position: 'top', message: '规则已保存' })
  try {
    await fetchRules()
    const savedRule = payload.ruleId != null
      ? rules.value.find((rule) => String(rule.ruleId) === String(payload.ruleId))
      : rules.value.find((rule) => !previousIds.has(String(rule.ruleId)) && rule.ruleTitle === payload.ruleTitle && rule.ruleParam === payload.ruleParam)
    if (savedRule) setForm(savedRule)
    clearFilters()
  } catch {
    rulesError.value = true
    $q.notify({ type: 'warning', position: 'top', message: '规则已保存，但列表刷新失败，请重新加载列表' })
  } finally {
    saving.value = false
  }
}
async function removeRule() {
  if (busy.value || !isExisting.value) return
  const ruleId = form.ruleId
  if (!(await confirmAction('删除这条规则？', '「' + (savedForm.value.ruleTitle || '未命名规则') + '」删除后无法恢复。已下载的内容不会被删除。', '删除规则', true))) return
  deleting.value = true
  try {
    await api.ruledelete({ ruleId })
    rules.value = rules.value.filter((rule) => String(rule.ruleId) !== String(ruleId))
    setForm(filteredRules.value[0] || emptyRule())
    await backToList()
    $q.notify({ type: 'positive', position: 'top', message: '规则已删除' })
  } catch (error) {
    showError(error)
  } finally {
    deleting.value = false
  }
}
async function downloadOld() {
  if (downloading.value || busy.value) return
  if (!(await confirmAction('重新下载历史内容？', '这是全局操作，会提交历史内容重新下载任务，并非仅针对当前规则。请确认后继续。', '提交任务'))) return
  downloading.value = true
  try {
    await api.downloadOld()
    $q.notify({ type: 'positive', position: 'top', message: '已提交历史内容下载任务' })
  } catch (error) {
    showError(error)
  } finally {
    downloading.value = false
  }
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (isDirty.value || busy.value) { event.preventDefault(); event.returnValue = '' }
}
onBeforeRouteLeave(async () => !busy.value && await canDiscard())
onMounted(() => {
  window.addEventListener('beforeunload', beforeUnload)
  void initializeRules()
  void loadOptions()
})
onBeforeUnmount(() => {
  previewRequest++
  window.removeEventListener('beforeunload', beforeUnload)
})
</script>

<style scoped>
.rule-page {
  --rule-border: #e2e8f0;
  --rule-muted: #64748b;
  --rule-ink: #18243b;
  --rule-soft: #f1f5f9;
  color: var(--rule-ink);
  padding: 16px 16px 20px;
}
.rule-page h1, .rule-page h2, .rule-page h3, .rule-page p { margin: 0; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 28px; }
.page-eyebrow { display: flex; align-items: center; gap: 8px; color: var(--rule-muted); font-size: 11px; font-weight: 600; letter-spacing: 2px; margin-bottom: 8px; }
.page-eyebrow > span { width: 6px; height: 6px; border-radius: 50%; background: var(--q-primary); }
.page-heading h1 { font-size: 28px; font-weight: 750; line-height: 1.4; letter-spacing: -.6px; }
.page-heading p { color: var(--rule-muted); font-size: 13px; margin-top: 6px; }
.heading-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.rule-page :deep(.q-btn) { border-radius: 10px; min-height: 44px; }
.rule-page :deep(.q-btn--round) { border-radius: 50%; min-width: 44px; }
.rule-page :deep(.q-field--outlined .q-field__control) { border-radius: 10px; background: white; }
.rule-page :deep(.q-field--outlined .q-field__control::before) { border-color: #dbe2eb; }
.rule-page :deep(.q-field__label) { color: var(--rule-muted); }
.rule-page :deep(.q-field__prepend) { color: #8492a6; }
.rule-page :deep(.q-field) { min-width: 0; scroll-margin-block: 80px 160px; }
.rule-page :deep(.q-field__native), .rule-page :deep(.q-chip__content) { min-width: 0; overflow-wrap: anywhere; }
.rule-page :deep(.q-chip) { max-width: 100%; }
.rule-page :deep(.q-chip__content) { white-space: normal; }
.rule-workspace { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 24px; align-items: start; }
.rule-library { position: sticky; top: 74px; border: 1px solid var(--rule-border); border-radius: 16px; background: white; overflow: hidden; }
.library-heading { display: flex; align-items: center; justify-content: space-between; padding: 22px 18px 18px; gap: 8px; }
.library-heading h2 { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; line-height: 1.5; }
.count-pill { border-radius: 6px; padding: 2px 7px; background: var(--rule-soft); color: var(--rule-muted); font-size: 11px; }
.library-status { font-size: 11px; color: var(--rule-muted); white-space: nowrap; }
.library-status i, .status-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; flex-shrink: 0; }
.library-status i { background: var(--q-positive); margin-right: 4px; }
.library-tools { padding: 0 14px 12px; border-bottom: 1px solid var(--rule-border); }
.library-tools :deep(input) { font-size: 12px; }
.draft-reminder { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px; padding: 6px 14px; background: #fffbeb; font-size: 11px; color: #956113; }
.draft-reminder > div { display: flex; align-items: center; gap: 6px; }
.draft-reminder .q-btn { font-size: 11px; }
.filter-tabs { margin-top: 12px; background: var(--rule-soft); border-radius: 8px; padding: 3px; }
.filter-tabs :deep(.q-tab) { min-height: 36px; border-radius: 6px; padding: 0 8px; }
.filter-tabs :deep(.q-tab__label) { font-size: 12px; }
.filter-tabs :deep(.q-tab--active) { background: white; box-shadow: 0 1px 4px #18243b0d; }
.rule-list { max-height: calc(100dvh - 360px); min-height: 240px; overflow-y: auto; overscroll-behavior: contain; padding: 8px; }
.rule-item { border: 1px solid transparent; border-radius: 10px; margin-bottom: 5px; min-height: 100px; padding: 14px 12px; transition: background .15s, border-color .15s; }
.rule-item:hover { background: #f8fafc; }
.rule-item--selected, .rule-item--selected:hover { background: #eff5ff; border-color: #d6e5ff; color: var(--q-primary); }
.rule-item__top { display: flex; align-items: center; gap: 12px; }
.rule-item__title { flex: 1; font-size: 14px; font-weight: 650; }
.status-dot--enabled { background: var(--q-positive); box-shadow: 0 0 0 3px #16a34a0c; }
.rule-item__param { color: var(--rule-muted); font-size: 12px; margin: 7px 0 10px; }
.rule-item__meta { display: flex; align-items: center; gap: 10px; color: var(--rule-muted); font-size: 10px; }
.rule-item__meta > span:first-child { background: #edf1f7; padding: 2px 6px; border-radius: 4px; }
.rule-item--selected .rule-item__meta > span:first-child { background: #dfeaff; color: #3462ac; }
.library-footer { display: flex; align-items: center; gap: 7px; padding: 15px 14px; border-top: 1px solid var(--rule-border); color: var(--rule-muted); font-size: 11px; background: #fcfdff; }
.list-skeleton { padding: 12px; }
.rule-detail { min-width: 0; }
.detail-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 4px 2px 22px; }
.detail-heading__text { min-width: 0; }
.detail-eyebrow { color: var(--rule-muted); font-size: 11px; margin-bottom: 7px; }
.detail-heading h2 { font-size: 23px; line-height: 1.45; font-weight: 700; overflow-wrap: anywhere; }
.draft-status { display: flex; align-items: center; gap: 6px; color: var(--rule-muted); font-size: 11px; margin-top: 8px; min-height: 17px; }
.draft-status__dot { width: 5px; height: 5px; border-radius: 50%; background: var(--q-warning); }
.enable-toggle { flex-shrink: 0; font-size: 12px; border: 1px solid var(--rule-border); border-radius: 24px; padding-right: 14px; background: white; }
.detail-tabs { border-bottom: 1px solid var(--rule-border); margin-bottom: 20px; }
.detail-tabs :deep(.q-tab) { padding: 0 20px; min-height: 48px; }
.detail-tabs :deep(.q-tab__label) { font-size: 13px; font-weight: 600; }
.detail-tabs :deep(.q-tab__icon) { font-size: 19px; margin-right: 8px; }
.detail-tabs :deep(.q-tab__indicator) { height: 3px; border-radius: 3px 3px 0 0; }
.config-fields { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; min-width: 0; margin: 0; padding: 0; border: 0; }
.form-section { display: flex; flex-direction: column; min-width: 0; gap: 16px; padding: 24px; border: 1px solid var(--rule-border); border-radius: 14px; background: white; }
.section-heading { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 4px; }
.section-number { display: grid; place-items: center; flex-shrink: 0; width: 32px; height: 32px; border-radius: 9px; background: #eff5ff; color: #4776c6; font-size: 11px; font-weight: 700; letter-spacing: .5px; }
.section-heading h3 { font-size: 15px; font-weight: 650; line-height: 1.5; }
.section-heading p { font-size: 12px; color: var(--rule-muted); margin-top: 4px; line-height: 1.6; }
.section-count { margin-left: auto; flex-shrink: 0; color: var(--rule-muted); font-size: 11px; padding-top: 4px; }
.field-label { font-size: 12px; font-weight: 600; margin-bottom: -8px; }
.match-types { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.match-type { display: flex; align-items: center; text-align: left; gap: 10px; min-width: 0; padding: 14px; border: 1px solid var(--rule-border); border-radius: 10px; background: white; color: var(--rule-muted); cursor: pointer; font: inherit; transition: border-color .15s, background .15s; }
.match-type:focus-visible { outline: 2px solid var(--q-primary); outline-offset: 3px; }
.match-type:disabled { opacity: .6; cursor: default; }
.match-type--active { background: #f5f8ff; border-color: #7da5f4; color: var(--q-primary); }
.match-type strong { display: block; font-size: 13px; font-weight: 600; }
.match-type small { display: block; font-size: 11px; color: var(--rule-muted); margin-top: 4px; }
.match-type__check { margin-left: auto; }
.rule-page :deep(.expression-input) { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
.field-help { display: flex; align-items: flex-start; gap: 7px; font-size: 12px; color: var(--rule-muted); line-height: 1.6; }
.field-help > .q-icon { margin-top: 1px; }
.download-fields { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 16px; }
.editor-actions { position: sticky; bottom: 12px; z-index: 5; display: flex; align-items: center; gap: 8px; margin-top: 20px; padding: 12px 16px; background: white; border: 1px solid var(--rule-border); border-radius: 12px; box-shadow: 0 4px 20px #18243b0a; }
.action-status { color: var(--rule-muted); font-size: 11px; }
.action-buttons { display: flex; gap: 10px; margin-left: auto; }
.action-buttons .q-btn { padding: 0 18px; }
.empty-state { display: flex; align-items: center; justify-content: center; flex-direction: column; min-height: 285px; padding: 32px 20px; text-align: center; color: var(--rule-muted); }
.empty-state__icon { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 20px; background: var(--rule-soft); }
.empty-state h3 { font-size: 15px; font-weight: 600; color: var(--rule-ink); margin-top: 18px; line-height: 1.5; }
.empty-state p { font-size: 12px; line-height: 1.8; margin: 8px 0 18px; max-width: 320px; }
.preview-panel { overflow: hidden; border: 1px solid var(--rule-border); border-radius: 14px; background: white; }
.preview-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 24px; }
.preview-heading h3 { font-size: 15px; font-weight: 650; line-height: 1.6; }
.preview-heading p { margin-top: 5px; font-size: 12px; color: var(--rule-muted); }
.preview-heading .q-btn { flex-shrink: 0; }
.preview-scope { display: flex; align-items: center; gap: 10px; background: #f8fafc; border-block: 1px solid var(--rule-border); padding: 12px 24px; color: var(--rule-muted); font-size: 11px; }
.preview-scope > span { flex-shrink: 0; }
.preview-scope code { min-width: 0; max-height: 100px; overflow: auto; overflow-wrap: anywhere; white-space: pre-wrap; flex: 1; color: #334155; font-size: 12px; }
.preview-summary { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 20px 24px 10px; font-size: 12px; }
.preview-summary > span { color: var(--rule-muted); }
.preview-list { padding: 0 8px 12px; }
.preview-list--stale { opacity: .65; }
.preview-item { min-height: 84px; padding: 16px; }
.preview-item :deep(.q-item__section--avatar) { min-width: 48px; }
.record-icon { display: grid; place-items: center; width: 34px; height: 40px; background: #eff5ff; color: #678dcc; border-radius: 8px; }
.preview-title { line-height: 1.65 !important; overflow-wrap: anywhere; font-size: 13px; font-weight: 500; }
.preview-item :deep(.q-item__label--caption) { margin-top: 7px; color: var(--rule-muted); font-size: 11px; }
.download-state { display: flex; align-items: center; gap: 4px; font-size: 10px; color: #66758c; background: var(--rule-soft); padding: 4px 7px; border-radius: 6px; white-space: nowrap; }
.download-state--done { color: #208349; background: #edf8f1; }
.preview-empty { min-height: 350px; }
.preview-illustration { position: relative; display: grid; place-items: center; width: 88px; height: 88px; border: 1px solid #dae6ff; border-radius: 28px; background: linear-gradient(145deg, #f6f9ff, #eaf1ff); color: #628ada; transform: rotate(-5deg); }
.preview-illustration__spark { position: absolute; top: -6px; right: -6px; display: grid; place-items: center; width: 28px; height: 28px; border: 3px solid white; border-radius: 50%; background: #dbe8ff; color: #3d70ce; }
.preview-footnote { display: flex; gap: 7px; align-items: center; font-size: 11px; line-height: 1.6; color: var(--rule-muted); padding: 16px 24px; border-top: 1px solid var(--rule-border); }
.stale-notice, .operation-notice { display: flex; align-items: center; gap: 8px; color: #956113; background: #fffbeb; font-size: 12px; line-height: 1.7; padding: 12px 20px; }
.operation-notice { border-radius: 10px; margin-bottom: 16px; }
.inline-error { display: flex; align-items: center; gap: 6px; color: var(--q-negative); font-size: 12px; }
.editor-loading { padding: 24px; }
.mobile-back { display: none; }

@media (min-width: 1440px) {
  .rule-workspace { grid-template-columns: 310px minmax(0, 1fr); gap: 32px; }
  .form-section { padding: 28px 32px; }
}
@media (max-width: 1199px) and (min-width: 1024px) {
  .rule-workspace { grid-template-columns: 246px minmax(0, 1fr); gap: 18px; }
  .form-section { padding: 20px; }
  .match-type { padding: 12px 10px; gap: 7px; }
  .match-type > .q-icon:first-child { display: none; }
  .action-status { display: none; }
}
@media (max-width: 1023px) {
  .rule-page { max-width: 760px; margin: 0 auto; padding-inline: 0; }
  .rule-page--detail .page-heading { display: none; }
  .rule-workspace { display: block; }
  .rule-library { position: static; }
  .rule-detail { display: none; }
  .rule-workspace--detail .rule-library { display: none; }
  .rule-workspace--detail .rule-detail { display: block; }
  .rule-list { max-height: none; min-height: 0; }
  .rule-item { min-height: 108px; }
  .rule-item__meta { font-size: 11px; }
  .library-tools :deep(input) { font-size: 14px; }
  .library-heading { padding: 22px 20px 18px; }
  .library-tools { padding-inline: 16px; }
  .filter-tabs :deep(.q-tab) { min-height: 40px; }
  .mobile-back { display: inline-flex; margin: -8px 0 12px -8px; color: var(--rule-muted); font-size: 12px; }
  .editor-actions { bottom: calc(64px + env(safe-area-inset-bottom, 0px)); }
}
@media (max-width: 599px) {
  .rule-page { padding-top: 14px; padding-bottom: 12px; }
  .page-heading { gap: 10px; margin-bottom: 24px; align-items: center; }
  .page-heading h1 { font-size: 25px; }
  .page-heading p { font-size: 11px; max-width: 180px; line-height: 1.7; }
  .page-eyebrow { font-size: 9px; letter-spacing: 1px; }
  .heading-actions { gap: 0; }
  .heading-actions > .q-btn:first-child { padding: 0 12px; font-size: 12px; }
  .heading-actions > .q-btn:first-child :deep(.q-icon) { margin-right: 3px; font-size: 19px; }
  .detail-heading { gap: 8px; padding-bottom: 18px; }
  .detail-heading h2 { font-size: 20px; }
  .enable-toggle { padding-right: 10px; font-size: 11px; }
  .detail-tabs { margin-bottom: 16px; }
  .detail-tabs :deep(.q-tab) { flex: 1; padding-inline: 10px; }
  .form-section { padding: 20px 16px; gap: 16px; }
  .section-heading { gap: 10px; }
  .section-heading h3 { font-size: 14px; }
  .section-heading p { font-size: 11px; }
  .section-count { font-size: 10px; }
  .match-types { gap: 8px; }
  .match-type { position: relative; flex-direction: column; align-items: flex-start; gap: 8px; padding: 12px; }
  .match-type__check { position: absolute; top: 13px; right: 10px; }
  .match-type strong { font-size: 12px; }
  .match-type small { font-size: 10px; }
  .download-fields { grid-template-columns: minmax(0, 1fr); }
  .editor-actions { padding: 10px; gap: 4px; margin-top: 16px; }
  .action-status { display: none; }
  .action-buttons { flex: 1; gap: 8px; }
  .action-buttons .q-btn { flex: 1; padding: 0 8px; font-size: 12px; }
  .action-buttons .q-btn :deep(.q-icon) { font-size: 18px; margin-right: 5px; }
  .preview-heading { padding: 20px 16px; flex-wrap: wrap; }
  .preview-heading h3 { font-size: 14px; }
  .preview-heading p { font-size: 11px; }
  .preview-heading .q-btn { width: 100%; }
  .preview-scope { padding: 12px 16px; flex-wrap: wrap; }
  .preview-scope code { flex-basis: calc(100% - 90px); }
  .preview-summary { padding: 18px 16px 8px; }
  .preview-item { padding: 14px 8px; }
  .preview-item :deep(.q-item__section--avatar) { display: none; }
  .preview-title { font-size: 12px; }
  .download-state { font-size: 10px; padding: 4px 5px; }
  .preview-footnote { padding: 14px 16px; align-items: flex-start; }
  .preview-footnote > .q-icon { margin-top: 1px; }
}
@media (prefers-reduced-motion: reduce) {
  .rule-item, .match-type { transition: none; }
}
</style>
