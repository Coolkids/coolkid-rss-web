<template>
  <section class="workspace-page miss-page">
    <PageHeading title="TMDB 未匹配" subtitle="收集解析后未找到 TMDB 条目的标题，帮助改进 anitopy-ml。" eyebrow="模型反馈">
      <q-btn outline color="primary" icon="refresh" label="刷新记录" :loading="loading" @click="load"/>
    </PageHeading>

    <section class="workspace-panel miss-filters" aria-label="未匹配标题筛选">
      <div class="panel-heading">
        <div>
          <h2>查找未匹配标题</h2>
          <p>按原始标题搜索，或选择一个订阅来源查看解析问题。</p>
        </div>
        <q-btn flat icon="tune" :label="filtersExpanded ? '收起筛选' : '展开筛选'" class="lt-md"
               :aria-expanded="filtersExpanded" @click="filtersExpanded = !filtersExpanded"/>
      </div>
      <q-form v-show="!$q.screen.lt.md || filtersExpanded" class="miss-filter-form" @submit="search">
        <q-input v-model="draft.title" outlined dense clearable label="标题关键词" placeholder="搜索原始标题"
                 hide-bottom-space>
          <template #prepend><q-icon name="search" size="20px"/></template>
        </q-input>
        <q-select v-model="draft.feedId" outlined dense emit-value map-options :options="feedOptions"
                  label="订阅来源" hide-bottom-space/>
        <div v-if="feedsError" class="inline-failure">订阅选项加载失败
          <q-btn flat color="primary" label="重试" @click="loadFeeds"/>
        </div>
        <div class="miss-filter-actions">
          <q-btn flat color="grey-7" label="重置" :disable="loading" @click="resetFilters"/>
          <q-btn type="submit" unelevated color="primary" icon="search" label="查询标题" :loading="loading"/>
        </div>
      </q-form>
    </section>

    <section class="workspace-panel miss-results" aria-label="TMDB 未匹配标题" :aria-busy="loading">
      <div class="panel-heading">
        <h2>查询结果 <span class="count-tag">{{ total }} 条</span></h2>
        <span class="results-scope">{{ appliedFeedName }}<template v-if="applied.title"> · {{ applied.title }}</template></span>
      </div>
      <div v-if="loading" class="q-pa-md" role="status" aria-label="正在查询未匹配标题">
        <q-skeleton v-for="i in 5" :key="i" height="64px" class="q-mb-sm"/>
      </div>
      <EmptyState v-else-if="loadError" error title="记录加载失败" description="查询条件已保留，请重试。">
        <q-btn outline color="primary" label="重试查询" @click="load"/>
      </EmptyState>
      <EmptyState v-else-if="!rows.length" icon="task_alt" title="没有未匹配标题"
                  description="当前筛选范围内没有需要反馈给模型的记录。">
        <q-btn flat color="primary" label="调整筛选" @click="filtersExpanded = true"/>
      </EmptyState>
      <q-table v-else flat class="miss-table" :rows="rows" :columns="columns" row-key="missId"
               :grid="$q.screen.lt.md" :pagination="{ rowsPerPage: 0 }" :rows-per-page-options="[0]"
               hide-bottom wrap-cells>
        <template #body-cell-recordTitle="props">
          <q-td :props="props"><span class="miss-record-title">{{ props.row.recordTitle }}</span></q-td>
        </template>
        <template #body-cell-feedName="props">
          <q-td :props="props">{{ feedNameFor(props.row.feedId) }}</q-td>
        </template>
        <template #body-cell-anitopyResult="props">
          <q-td :props="props"><span class="result-summary">{{ resultSummary(props.row) }}</span></q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat color="primary" label="查看解析" icon-right="chevron_right" @click="showDetail(props.row)"/>
          </q-td>
        </template>
        <template #item="props">
          <article class="miss-record-card">
            <div class="miss-card-meta"><span><q-icon name="rss_feed" size="14px"/> {{ feedNameFor(props.row.feedId) }}</span>
              <span>出现 {{ props.row.seenCount || 1 }} 次</span></div>
            <h3>{{ props.row.recordTitle }}</h3>
            <div class="miss-card-bottom"><span>{{ props.row.lastSeenAt || '时间未知' }}</span>
              <q-btn flat color="primary" label="查看解析" icon-right="chevron_right" @click="showDetail(props.row)"/>
            </div>
          </article>
        </template>
      </q-table>
      <footer v-if="!loadError" class="miss-pagination">
        <q-select v-model="pageSize" dense outlined emit-value map-options :options="pageSizes" aria-label="每页记录数"
                  :disable="loading" @update:model-value="changePageSize"/>
        <div class="pagination-buttons">
          <q-btn flat round icon="chevron_left" aria-label="上一页" :disable="loading || page <= 1"
                 @click="changePage(page - 1)"/>
          <span aria-live="polite">{{ page }} / {{ maxPage }}</span>
          <q-btn flat round icon="chevron_right" aria-label="下一页" :disable="loading || page >= maxPage"
                 @click="changePage(page + 1)"/>
        </div>
      </footer>
    </section>

    <q-dialog v-model="detailOpen" :maximized="$q.screen.lt.md">
      <q-card class="workspace-dialog miss-detail">
        <header class="dialog-heading">
          <h2>解析结果</h2>
          <q-btn v-close-popup flat round icon="close" aria-label="关闭解析详情"/>
        </header>
        <div class="dialog-body">
          <div class="miss-detail-icon"><q-icon name="find_in_page" size="28px"/></div>
          <h3 class="miss-detail-title">{{ detail?.recordTitle }}</h3>
          <dl class="meta-grid">
            <div><dt>订阅来源</dt><dd>{{ feedNameFor(detail?.feedId) }}</dd></div>
            <div><dt>出现次数</dt><dd>{{ detail?.seenCount || 1 }}</dd></div>
            <div><dt>最近发现</dt><dd>{{ detail?.lastSeenAt || '暂无时间信息' }}</dd></div>
            <div><dt>记录 ID</dt><dd>{{ detail?.recordId || '暂无' }}</dd></div>
          </dl>
          <h4 class="result-heading">anitopy-ml 返回值</h4>
          <pre class="result-json">{{ formatResult(detail?.anitopyResult) }}</pre>
        </div>
        <footer class="dialog-actions"><q-btn v-close-popup unelevated color="primary" label="完成"/></footer>
      </q-card>
    </q-dialog>
  </section>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, reactive, ref} from 'vue'
import {useQuasar, type QTableColumn} from 'quasar'
import api from '@/services/api'
import type {AnitopyTmdbMiss, Feed} from '@/models/domain'
import PageHeading from '@/components/PageHeading.vue'
import EmptyState from '@/components/EmptyState.vue'

const $q = useQuasar()
const defaultFilters = () => ({title: '', feedId: '' as number | string})
const draft = reactive(defaultFilters())
const applied = ref(defaultFilters())
const filtersExpanded = ref(false)
const loading = ref(false), loadError = ref(false), feedsError = ref(false)
const rows = ref<AnitopyTmdbMiss[]>([]), feeds = ref<Feed[]>([])
const page = ref(1), pageSize = ref(20), total = ref(0)
const detailOpen = ref(false), detail = ref<AnitopyTmdbMiss | null>(null)
const pageSizes = [10, 20, 50, 100].map(value => ({label: value + ' 条 / 页', value}))
const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const feedOptions = computed(() => [
  {label: '全部订阅', value: ''},
  ...feeds.value.map(feed => ({label: feed.feedName, value: feed.feedId}))
])
const appliedFeedName = computed(() => feedNameFor(applied.value.feedId))
const columns: QTableColumn<AnitopyTmdbMiss>[] = [
  {name: 'recordTitle', label: '原始标题', field: 'recordTitle', align: 'left', style: 'width: 40%'},
  {name: 'feedName', label: '订阅来源', field: row => feedNameFor(row.feedId), align: 'left'},
  {name: 'anitopyResult', label: '解析摘要', field: row => resultSummary(row), align: 'left'},
  {name: 'lastSeenAt', label: '最近发现', field: 'lastSeenAt', align: 'left'},
  {name: 'actions', label: '操作', field: () => '', align: 'right'}
]
let requestId = 0

function feedNameFor(feedId?: number | string) {
  return feeds.value.find(feed => String(feed.feedId) === String(feedId))?.feedName || '未知订阅'
}

function resultSummary(row: AnitopyTmdbMiss) {
  const result = row.anitopyResult || {}
  const title = typeof result.title === 'string' ? result.title : ''
  const year = result.year == null ? '' : String(result.year)
  const resolution = Array.isArray(result.resolution) ? result.resolution.join(', ') : ''
  return [title, year, resolution].filter(Boolean).join(' · ') || '未提取到结构化字段'
}

function formatResult(result?: Record<string, unknown>) {
  return result ? JSON.stringify(result, null, 2) : '暂无解析结果'
}

function showDetail(row: AnitopyTmdbMiss) {
  detail.value = row
  detailOpen.value = true
}

async function load() {
  const request = ++requestId
  loading.value = true
  loadError.value = false
  try {
    const response = await api.getAnitopyTmdbMissPage({
      title: applied.value.title,
      feedId: applied.value.feedId,
      page: page.value,
      pageSize: pageSize.value
    })
    if (request !== requestId) return
    rows.value = response.data.records || []
    total.value = Number(response.data.total || 0)
    if (page.value > maxPage.value) {
      page.value = maxPage.value
      await load()
    }
  } catch {
    if (request === requestId) loadError.value = true
  } finally {
    if (request === requestId) loading.value = false
  }
}

async function search() {
  applied.value = {title: draft.title.trim(), feedId: draft.feedId}
  page.value = 1
  filtersExpanded.value = false
  await load()
}

function resetFilters() {
  Object.assign(draft, defaultFilters())
  void search()
}

function changePage(next: number) {
  page.value = next
  void load()
}

function changePageSize() {
  page.value = 1
  void load()
}

async function loadFeeds() {
  feedsError.value = false
  try {
    feeds.value = (await api.getFeedList({full: true})).data || []
  } catch {
    feedsError.value = true
  }
}

onMounted(() => { loadFeeds().then(() => load()) })
onBeforeUnmount(() => { requestId++ })
</script>

<style scoped>
.miss-filters { margin-bottom: 24px; }
.miss-filter-form { padding: 0 20px 16px; display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(180px, 1fr) auto; align-items: center; gap: 12px; }
.miss-filter-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.miss-filter-form .q-field--dense .q-field__control, .miss-filter-form .q-field--dense .q-field__marginal { min-height: 38px; height: 38px; }
.miss-results { overflow: hidden; }
.results-scope { color: var(--muted); font-size: 12px; overflow-wrap: anywhere; text-align: right; }
.miss-table :deep(th) { color: var(--muted); background: var(--app-surface-hover); font-size: 11px; height: 44px; }
.miss-table :deep(td) { padding: 16px; color: var(--app-muted); font-size: 12px; overflow-wrap: anywhere; }
.miss-record-title { color: var(--app-ink); font-weight: 600; line-height: 1.7; }
.result-summary { color: var(--app-muted); line-height: 1.7; }
.miss-record-card { width: 100%; padding: 18px 20px 10px; border-top: 1px solid var(--border); }
.miss-card-meta, .miss-card-bottom { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; color: var(--muted); font-size: 11px; }
.miss-record-card h3 { margin: 12px 0 8px; color: var(--app-ink); font-size: 14px; line-height: 1.8; overflow-wrap: anywhere; }
.miss-pagination { border-top: 1px solid var(--border); padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.miss-pagination .q-select { min-width: 115px; font-size: 12px; }
.pagination-buttons { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 12px; }
.miss-detail-icon { width: 56px; height: 56px; display: grid; place-items: center; background: var(--app-surface-active); color: var(--app-icon); border-radius: 16px; margin-bottom: 18px; }
.miss-detail-title { font-size: 20px; line-height: 1.6; margin: 0 0 28px; overflow-wrap: anywhere; }
.result-heading { margin: 28px 0 10px; color: var(--app-ink); font-size: 14px; }
.result-json { margin: 0; padding: 16px; max-height: 420px; overflow: auto; border: 1px solid var(--app-border); border-radius: 10px; background: var(--app-code); color: var(--app-text); font: 12px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
@media (max-width: 767px) {
  .miss-filter-form { grid-template-columns: minmax(0, 1fr); padding: 0 16px 14px; }
  .miss-filter-actions { justify-content: flex-end; }
}
@media (max-width: 599px) {
  .miss-pagination { padding: 12px; gap: 4px; }
  .pagination-buttons { gap: 2px; }
}
</style>
