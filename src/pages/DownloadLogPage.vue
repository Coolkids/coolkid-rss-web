<template>
  <section class="workspace-page log-page">
    <PageHeading title="下载日志" subtitle="每一次下载，都有迹可循。" eyebrow="下载记录">
      <q-btn outline color="primary" icon="refresh" label="刷新记录" :loading="loading" @click="load"/>
    </PageHeading>
    <section class="workspace-panel log-filters" aria-label="日志筛选">
      <div class="panel-heading">
        <div><h2>查找下载记录</h2>
          <p>{{ applied.startDate || '不限开始日期' }} — {{ applied.endDate || '不限结束日期' }}</p></div>
        <q-btn flat icon="tune" :label="filtersExpanded ? '收起筛选' : '展开筛选'" class="lt-md"
               :aria-expanded="filtersExpanded" @click="filtersExpanded = !filtersExpanded"/>
      </div>
      <q-form v-show="!$q.screen.lt.md || filtersExpanded" class="log-filter-form" @submit="search">
        <div class="form-grid">
          <q-input v-model="draft.keywords" outlined dense clearable label="标题关键词" placeholder="搜索下载内容"
                   hide-bottom-space>
            <template #prepend>
              <q-icon name="search" size="20px"/>
            </template>
          </q-input>
          <q-select v-model="draft.feedId" outlined dense emit-value map-options :options="feedOptions" label="订阅来源"
                    hide-bottom-space/>
        </div>
        <div class="log-date-fields">
          <q-input v-model="draft.startDate" outlined dense type="date" label="开始日期" stack-label hide-bottom-space/>
          <q-input v-model="draft.endDate" outlined dense type="date" label="结束日期" stack-label hide-bottom-space/>
        </div>
        <div v-if="dateError" class="text-negative text-caption" role="alert">{{ dateError }}</div>
        <div v-if="feedsError" class="inline-failure">订阅选项加载失败
          <q-btn flat color="primary" label="重试" @click="loadFeeds"/>
        </div>
        <div class="log-filter-actions">
          <div class="date-presets"><span>快捷范围</span>
            <q-btn v-for="days in [7, 30, 90]" :key="days" flat color="primary" :label="'近 ' + days + ' 天'"
                   @click="setPreset(days)"/>
          </div>
          <div class="filter-buttons">
            <q-btn flat color="grey-7" label="重置" :disable="loading" @click="resetFilters"/>
            <q-btn type="submit" unelevated color="primary" icon="search" label="查询记录" :loading="loading"/>
          </div>
        </div>
      </q-form>
    </section>

    <section class="workspace-panel log-results" aria-label="下载记录" :aria-busy="loading">
      <div class="panel-heading"><h2>查询结果 <span class="count-tag">{{ total }} 条</span></h2><span
          class="results-scope">{{ appliedFeedName }}<template v-if="applied.keywords"> · {{
          applied.keywords
        }}</template></span></div>
      <div v-if="loading" class="q-pa-md" role="status" aria-label="正在查询下载记录">
        <q-skeleton v-for="i in 4" :key="i" height="72px" class="q-mb-sm"/>
      </div>
      <EmptyState v-else-if="loadError" error title="记录加载失败" description="查询条件已保留，请重试。">
        <q-btn outline color="primary" label="重试查询" @click="load"/>
      </EmptyState>
      <EmptyState v-else-if="!rows.length" icon="manage_search" title="没有找到下载记录"
                  description="试着扩大日期范围，或调整关键词和订阅来源。">
        <q-btn flat color="primary" label="调整筛选" @click="filtersExpanded = true"/>
      </EmptyState>
      <q-table v-else flat class="log-table" :rows="rows" :columns="columns" row-key="recordId" :grid="$q.screen.lt.md"
               :pagination="{ rowsPerPage: 0 }" :rows-per-page-options="[0]" hide-bottom wrap-cells>
        <template #body-cell-recordTitle="props">
          <q-td :props="props"><span class="log-record-title">{{ props.row.recordTitle }}</span></q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat color="primary" label="查看详情" icon-right="chevron_right" @click="showDetail(props.row)"/>
          </q-td>
        </template>
        <template #item="props">
          <article class="log-record-card">
            <div class="log-card-meta"><span><q-icon name="rss_feed" size="14px"/> {{
                props.row.feedName || '未知订阅'
              }}</span><span>{{ props.row.dlDate || '时间未知' }}</span></div>
            <h3>{{ props.row.recordTitle }}</h3>
            <div class="log-card-bottom"><span><q-icon name="cloud_download" size="16px"/> 下载记录</span>
              <q-btn flat color="primary" label="查看详情" icon-right="chevron_right" @click="showDetail(props.row)"/>
            </div>
          </article>
        </template>
      </q-table>
      <footer v-if="!loadError" class="log-pagination">
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
      <q-card class="workspace-dialog log-detail">
        <header class="dialog-heading"><h2>下载详情</h2>
          <q-btn v-close-popup flat round icon="close" aria-label="关闭下载详情"/>
        </header>
        <div class="dialog-body">
          <div class="log-detail-icon">
            <q-icon name="cloud_download" size="28px"/>
          </div>
          <h3 class="log-detail-title">{{ detail?.recordTitle }}</h3>
          <dl class="meta-grid">
            <div>
              <dt>订阅来源</dt>
              <dd>{{ detail?.feedName || '未知订阅' }}</dd>
            </div>
            <div>
              <dt>下载时间</dt>
              <dd>{{ detail?.dlDate || '暂无时间信息' }}</dd>
            </div>
            <div class="detail-wide">
              <dt>匹配规则</dt>
              <dd>{{ detail?.ruleInfo || '未记录规则信息' }}</dd>
            </div>
            <div class="detail-wide">
              <dt>下载工具</dt>
              <dd>{{ detail?.dlInfo || '未记录工具信息' }}</dd>
            </div>
          </dl>
        </div>
        <footer class="dialog-actions">
          <q-btn v-close-popup unelevated color="primary" label="完成"/>
        </footer>
      </q-card>
    </q-dialog>
  </section>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, reactive, ref} from 'vue'
import {useQuasar, type QTableColumn} from 'quasar'
import api from '@/services/api'
import type {DownloadLog, Feed} from '@/models/domain'
import PageHeading from '@/components/PageHeading.vue'
import EmptyState from '@/components/EmptyState.vue'
import {localDate} from '@/utils/ui'

const $q = useQuasar()
const defaultFilters = () => ({
  feedId: 0 as number | string,
  keywords: '' as string | null,
  startDate: localDate(90),
  endDate: localDate()
})
const draft = reactive(defaultFilters())
const applied = ref(defaultFilters())
const filtersExpanded = ref(false), loading = ref(false), loadError = ref(false), feedsError = ref(false)
const rows = ref<DownloadLog[]>([]), feeds = ref<Feed[]>([])
const page = ref(1), pageSize = ref(20), total = ref(0)
const detailOpen = ref(false), detail = ref<DownloadLog | null>(null), dateError = ref('')
const pageSizes = [10, 20, 50, 100].map(value => ({label: value + ' 条 / 页', value}))
const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const feedOptions = computed(() => [
    ...feeds.value.map(feed => ({label: feed.feedName, value: feed.feedId}))
])
const appliedFeedName = computed(() => feeds.value.find(feed => String(feed.feedId) === String(applied.value.feedId))?.feedName || '全部订阅')
const columns: QTableColumn<DownloadLog>[] = [
  {name: 'recordTitle', label: '下载内容', field: 'recordTitle', align: 'left', style: 'width: 46%'},
  {name: 'feedName', label: '订阅来源', field: 'feedName', align: 'left'},
  {name: 'dlDate', label: '下载时间', field: 'dlDate', align: 'left'},
  {name: 'actions', label: '操作', field: () => '', align: 'right'}
]
let requestId = 0

function showDetail(row: DownloadLog) {
  detail.value = row;
  detailOpen.value = true
}

function setPreset(days: number) {
  draft.startDate = localDate(days);
  draft.endDate = localDate();
  dateError.value = ''
}

async function load() {
  const request = ++requestId
  loading.value = true;
  loadError.value = false
  try {
    const response = await api.getDownLog({
      ...applied.value,
      keywords: applied.value.keywords || '',
      page: page.value,
      pageSize: pageSize.value
    })
    if (request !== requestId) return
    rows.value = response.data.records || [];
    total.value = Number(response.data.total || 0)
    if (page.value > maxPage.value) {
      page.value = maxPage.value;
      await load()
    }
  } catch {
    if (request === requestId) loadError.value = true
  } finally {
    if (request === requestId) loading.value = false
  }
}

async function search() {
  if (draft.startDate && draft.endDate && draft.startDate > draft.endDate) {
    dateError.value = '结束日期不能早于开始日期';
    return
  }
  dateError.value = '';
  applied.value = {...draft, keywords: (draft.keywords || '').trim()};
  page.value = 1
  filtersExpanded.value = false
  await load()
}

function resetFilters() {
  Object.assign(draft, defaultFilters());
  void search()
}

function changePage(next: number) {
  page.value = next;
  void load()
}

function changePageSize() {
  page.value = 1;
  void load()
}

async function loadFeeds() {
  feedsError.value = false
  try {
    feeds.value = (await api.getFeedList({full: true})).data || []
    if(feeds.value.length > 0){
      draft.feedId = feeds.value[0].feedId ?? 0
      applied.value.feedId = draft.feedId
    }
  } catch {
    feedsError.value = true
  }
}

onMounted(() => {
  loadFeeds().then(() => load());
})
onBeforeUnmount(() => {
  requestId++
})
</script>

<style scoped>
.log-filters {
  margin-bottom: 24px;
}

.log-filter-form {
  padding: 0 20px 16px;
  display: grid;
  gap: 12px;
}

.log-date-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.log-filter-actions, .filter-buttons, .date-presets {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-filters .q-field--dense .q-field__control,
.log-filters .q-field--dense .q-field__marginal {
  min-height: 38px;
  height: 38px;
}

.log-filters .q-btn {
  min-height: 36px;
}

.log-filter-actions {
  justify-content: space-between;
  flex-wrap: wrap;
}

.date-presets {
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--muted);
}

.date-presets .q-btn {
  font-size: 12px;
}

.log-results {
  overflow: hidden;
}

.results-scope {
  color: var(--muted);
  font-size: 12px;
  overflow-wrap: anywhere;
  text-align: right;
}

.log-table :deep(th) {
  color: var(--muted);
  background: var(--app-surface-hover);
  font-size: 11px;
  height: 44px;
}

.log-table :deep(td) {
  padding: 18px 16px;
  color: var(--app-muted);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.log-record-title {
  color: var(--app-ink);
  font-weight: 550;
  font-size: 13px;
  line-height: 1.8;
}

.log-record-card {
  width: 100%;
  padding: 18px 20px 10px;
  border-top: 1px solid var(--border);
}

.log-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: space-between;
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 12px;
}

.log-record-card h3 {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.8;
  overflow-wrap: anywhere;
}

.log-card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.log-card-bottom > span {
  color: var(--muted);
  font-size: 11px;
}

.log-pagination {
  border-top: 1px solid var(--border);
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.log-pagination .q-select {
  min-width: 115px;
  font-size: 12px;
}

.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 12px;
}

.log-detail-icon {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  background: var(--app-surface-active);
  color: var(--app-icon);
  border-radius: 16px;
  margin-bottom: 18px;
}

.log-detail-title {
  font-size: 20px;
  line-height: 1.6;
  margin: 0 0 28px;
}

.detail-wide {
  grid-column: 1 / -1;
}

@media (min-width: 1024px) {
  .log-filter-form {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    align-items: center;
  }

  .form-grid, .log-date-fields {
    display: contents;
  }

  .form-grid > :first-child {
    grid-column: span 2;
  }

  .form-grid > :nth-child(2) {
    grid-column: span 2;
  }

  .log-filter-actions {
    grid-column: 1 / -1;
    justify-content: space-between;
  }
}

@media (min-width: 1280px) {
  .log-filter-form {
    grid-template-columns: minmax(190px, 1.45fr) minmax(150px, 1fr) repeat(2, minmax(135px, .85fr)) minmax(170px, 1.2fr) auto;
  }

  .form-grid > :first-child {
    grid-column: auto;
  }

  .form-grid > :nth-child(2) {
    grid-column: auto;
  }

  .log-filter-actions {
    display: contents;
  }

  .date-presets {
    grid-column: 5;
    flex-wrap: nowrap;
    white-space: nowrap;
  }

  .filter-buttons {
    grid-column: 6;
    justify-content: flex-end;
    white-space: nowrap;
  }
}

@media (max-width: 599px) {
  .log-filter-form {
    padding: 0 16px 14px;
    gap: 10px;
  }

  .log-date-fields {
    grid-template-columns: minmax(0, 1fr);
  }

  .filter-buttons {
    width: 100%;
    justify-content: flex-end;
  }

  .log-pagination {
    padding: 12px;
    gap: 4px;
  }

  .pagination-buttons {
    gap: 2px;
  }

  .log-results .panel-heading {
    align-items: flex-start;
  }
}
</style>
