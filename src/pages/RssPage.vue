<template>
  <section class="workspace-page reader-page">
    <PageHeading title="Feed 浏览" subtitle="发现新内容，留住值得关注的每一条。" eyebrow="你的阅读空间">
      <q-btn outline color="primary" icon="refresh" :round="$q.screen.lt.sm"
             :label="$q.screen.lt.sm ? undefined : filters.feedId === 0 ? '刷新列表' : '更新订阅'"
             :aria-label="filters.feedId === 0 ? '刷新列表' : '更新订阅'" :loading="refreshing" :disable="loading"
             @click="refresh"/>
      <q-btn flat round icon="more_horiz" aria-label="阅读操作">
        <q-menu anchor="bottom right" self="top right">
          <q-list>
            <q-item v-close-popup clickable :disable="markingAll || loading || !records.length" @click="markAllRead">
              <q-item-section avatar>
                <q-icon name="done_all"/>
              </q-item-section>
              <q-item-section>全部标记已读</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </PageHeading>
    <div class="reader-layout">
      <aside class="workspace-panel reader-sources" aria-label="订阅来源">
        <div class="panel-heading"><h2>订阅来源 <span class="count-tag">{{ feeds.length }}</span></h2>
          <q-icon name="rss_feed" color="grey-5" size="20px"/>
        </div>
        <div v-if="sourcesLoading" class="q-pa-md" role="status" aria-label="正在加载订阅">
          <q-skeleton v-for="i in 3" :key="i" height="46px" class="q-mb-sm"/>
        </div>
        <EmptyState v-else-if="sourcesError" error title="来源加载失败" description="请重试加载订阅列表。">
          <q-btn flat color="primary" label="重试" @click="loadSources"/>
        </EmptyState>
        <q-list v-else class="source-list">
          <q-item v-for="source in feedOptions" :key="String(source.value)" v-ripple clickable
                  :active="String(filters.feedId) === String(source.value)" active-class="source-active"
                  @click="selectSource(source.value)">
            <q-item-section avatar>
              <q-icon :name="source.value === 0 ? 'inbox' : 'rss_feed'" size="20px"/>
            </q-item-section>
            <q-item-section class="ellipsis">{{ source.label }}</q-item-section>
            <q-item-section v-if="source.unread > 0" side><span
                class="source-count">{{ source.unread > 999 ? '999+' : source.unread }}</span></q-item-section>
          </q-item>
        </q-list>
        <q-btn flat color="primary" icon="add" label="管理订阅" to="/feeds" class="source-manage"/>
      </aside>

      <main class="reader-main">
        <section class="workspace-panel reader-toolbar" :class="{ 'reader-toolbar--hidden': !toolbarVisible }">
          <div class="reader-mobile-source">
            <q-select :model-value="filters.feedId" outlined dense emit-value map-options :options="feedOptions"
                      label="订阅来源" :loading="sourcesLoading" @update:model-value="selectSource">
              <template #selected-item="scope">
                <span>{{ scope.opt.label }}</span>
                <span v-if="scope.opt.unread > 0" class="source-count">{{
                    scope.opt.unread > 999 ? '999+' : scope.opt.unread
                  }}</span>
              </template>
              <template #option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>{{ scope.opt.label }}</q-item-section>
                  <q-item-section v-if="scope.opt.unread > 0" side>
                    <span class="source-count">{{ scope.opt.unread > 999 ? '999+' : scope.opt.unread }}</span>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>
          <div v-if="sourcesError" class="inline-failure reader-source-error">订阅来源加载失败
            <q-btn flat color="primary" label="重试" @click="loadSources"/>
          </div>
          <q-form class="reader-search" @submit="search">
            <q-input v-model="searchText" outlined dense clearable placeholder="搜索订阅内容" aria-label="搜索订阅内容"
                     @clear="search">
              <template #prepend>
                <q-icon name="search" size="20px"/>
              </template>
            </q-input>
            <q-btn type="submit" unelevated color="primary" label="搜索" :loading="loading"/>
            <q-btn outline color="grey-7" icon="tune" :label="$q.screen.lt.sm ? undefined : '筛选'"
                   :round="$q.screen.lt.sm" aria-label="筛选内容" @click="openFilters"/>
          </q-form>
          <div class="reader-view-tools">
            <div class="reader-view-buttons" role="group" aria-label="阅读状态筛选">
              <q-btn flat label="全部" :class="{ 'view-active': !filters.unread && !filters.fav }"
                     :aria-pressed="!filters.unread && !filters.fav" @click="setView('all')"/>
              <q-btn flat icon="circle" label="未读" :class="{ 'view-active': filters.unread }"
                     :aria-pressed="filters.unread" @click="setView('unread')"/>
              <q-btn flat icon="star_border" label="星标" :class="{ 'view-active': filters.fav }"
                     :aria-pressed="filters.fav" @click="setView('fav')"/>
            </div>
            <span class="reader-date">{{ dateRangeLabel }}</span>
          </div>
        </section>

        <section class="workspace-panel reader-content" :aria-busy="loading">
          <div class="panel-heading reader-list-heading">
            <div><h2>{{ selectedFeedName }}</h2>
              <p v-if="selectedFeed?.feedLastUpdate">更新于 {{ selectedFeed.feedLastUpdate }}</p>
              <p v-else>按当前条件浏览订阅内容</p></div>
            <span class="count-tag">{{ total }} 条内容</span></div>
          <div v-if="loading" class="q-pa-lg" role="status" aria-label="正在加载内容">
            <q-skeleton v-for="i in 4" :key="i" height="100px" class="q-mb-md"/>
          </div>
          <EmptyState v-else-if="loadError" error title="内容加载失败" description="筛选条件已保留，请检查连接后重试。">
            <q-btn outline color="primary" label="重新加载" @click="reload"/>
          </EmptyState>
          <EmptyState v-else-if="!records.length" :icon="feeds.length ? 'manage_search' : 'rss_feed'"
                      :title="feeds.length ? '这里暂时没有内容' : '从一份订阅开始'"
                      :description="feeds.length ? '试着调整日期、关键词或阅读状态。' : '添加 RSS 订阅，把关注的内容带到这里。'">
            <q-btn v-if="feeds.length" flat color="primary" label="调整筛选" @click="openFilters"/>
            <q-btn v-else unelevated color="primary" icon="add" label="添加订阅" to="/feeds"/>
          </EmptyState>
          <q-infinite-scroll v-else :offset="320" :disable="page >= maxPage || moreError"
                             @load="loadMore">
            <article v-for="record in records" :key="String(record.recordId)" class="reader-record"
                     :class="{ 'reader-record--unread': record.recordReadate == null }">
              <button type="button" class="record-open" :aria-label="'阅读：' + record.recordTitle"
                      @click="openRecord(record)">
                <span class="record-meta"><span v-if="record.recordReadate == null" class="unread-dot"
                                                aria-label="未读"/><span>{{
                    record.feedName || selectedFeedName
                  }}</span><span>{{ record.recordPubdate || '发布时间未知' }}</span></span>
                <span class="record-title">{{ record.recordTitle }}</span>
                <span v-if="record.recordDescription" class="record-excerpt">{{
                    excerpt(record.recordDescription)
                  }}</span>
              </button>
              <div class="record-bottom">
                <span v-if="record.recordIsdl > 0" class="record-status"><q-icon name="check_circle"
                                                                                     size="14px"/> 已下载</span>
                <div class="record-actions">
                  <q-btn flat round :color="record.recordFav > 0 ? 'warning' : 'grey-6'"
                         :icon="record.recordFav > 0 ? 'star' : 'star_border'"
                         :aria-label="record.recordFav > 0 ? '取消星标' : '添加星标'"
                         :aria-pressed="record.recordFav > 0" :loading="favoriteBusy.has(String(record.recordId))"
                         @click="toggleFavorite(record)"/>
                  <q-btn v-if="record.recordDlurl" flat round color="grey-6" icon="download" aria-label="下载此内容"
                         @click="openDownload(record)"/>
                  <q-btn v-if="validExternal(record.recordUrl)" flat round color="grey-6" icon="open_in_new"
                         aria-label="打开原文" @click="openExternal(record.recordUrl)"/>
                </div>
              </div>
            </article>
            <template #loading>
              <div v-if="loadingMore" class="reader-more-loading" role="status">正在加载下一页…</div>
            </template>
          </q-infinite-scroll>
          <footer v-if="records.length" class="reader-more">
            <span>{{ records.length }} / {{ total }} 条内容</span>
            <span v-if="moreError">下一页加载失败，请点击顶部刷新重试</span>
            <span v-else-if="page >= maxPage">已显示全部结果</span>
            <span v-else>继续滚动加载更多</span>
          </footer>
        </section>
      </main>
    </div>

    <q-btn v-if="showScrollTop" class="reader-scroll-top" round unelevated color="primary"
           icon="keyboard_arrow_up" aria-label="回到顶部" @click="scrollToTop"/>
    <q-btn v-if="!toolbarVisible" class="reader-toolbar-reveal" flat round icon="search"
           aria-label="显示搜索栏" @click="showToolbar"/>

    <q-dialog v-model="filtersOpen" :position="$q.screen.lt.md ? 'bottom' : 'standard'">
      <q-card class="workspace-dialog reader-filter-dialog">
        <header class="dialog-heading"><h2>筛选内容</h2>
          <q-btn v-close-popup flat round icon="close" aria-label="关闭筛选"/>
        </header>
        <q-form @submit="applyFilters">
          <div class="dialog-body filter-fields">
            <q-select v-model="filterDraft.feedId" outlined emit-value map-options :options="feedOptions"
                      label="订阅来源"/>
            <q-input v-model="filterDraft.keywords" outlined clearable label="内容关键词"/>
            <div class="form-grid">
              <q-input v-model="filterDraft.startDate" outlined type="date" stack-label label="开始日期"/>
              <q-input v-model="filterDraft.endDate" outlined type="date" stack-label label="结束日期"/>
            </div>
            <div v-if="dateError" class="text-negative text-caption" role="alert">{{ dateError }}</div>
            <div class="filter-presets">
              <q-btn v-for="days in [7, 30, 90]" :key="days" outline color="primary" :label="'近 ' + days + ' 天'"
                     @click="setDatePreset(days)"/>
            </div>
            <div class="filter-checkboxes">
              <q-checkbox v-model="filterDraft.unread" label="只看未读"/>
              <q-checkbox v-model="filterDraft.fav" label="只看星标"/>
            </div>
          </div>
          <footer class="dialog-actions">
            <q-btn flat label="重置条件" color="grey-7" @click="resetFilterDraft"/>
            <q-btn type="submit" unelevated color="primary" label="应用筛选"/>
          </footer>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="detailOpen" :maximized="$q.screen.lt.md">
      <q-card class="workspace-dialog reader-detail">
        <header class="dialog-heading"><h2>阅读内容</h2>
          <q-btn v-close-popup flat round icon="close" aria-label="关闭阅读内容"/>
        </header>
        <div class="dialog-body reader-article">
          <div class="article-meta">{{ activeRecord?.feedName || selectedFeedName }} ·
            {{ activeRecord?.recordPubdate || '发布时间未知' }}
          </div>
          <h1>{{ activeRecord?.recordTitle }}</h1>
          <div v-if="safeDescription" class="rss-content" v-html="safeDescription"/>
          <EmptyState v-else icon="article" title="这条内容没有摘要" description="可以打开原文，查看完整内容。"/>
        </div>
        <footer class="dialog-actions">
          <q-btn v-if="activeRecord" flat :color="activeRecord.recordFav > 0 ? 'warning' : 'grey-7'"
                 :icon="activeRecord.recordFav > 0 ? 'star' : 'star_border'"
                 :label="activeRecord.recordFav > 0 ? '取消星标' : '添加星标'"
                 :loading="favoriteBusy.has(String(activeRecord.recordId))" @click="toggleFavorite(activeRecord)"/>
          <q-btn v-if="validExternal(activeRecord?.recordUrl)" outline color="primary" icon="open_in_new"
                 label="打开原文" @click="openExternal(activeRecord?.recordUrl)"/>
          <q-btn v-if="activeRecord?.recordDlurl" unelevated color="primary" icon="download" label="下载"
                 @click="openDownload(activeRecord)"/>
        </footer>
      </q-card>
    </q-dialog>

    <q-dialog v-model="downloadOpen" :maximized="$q.screen.lt.md" :persistent="downloading">
      <q-card class="workspace-dialog">
        <header class="dialog-heading"><h2>创建下载任务</h2>
          <q-btn v-close-popup flat round icon="close" aria-label="关闭下载配置" :disable="downloading"/>
        </header>
        <q-form greedy @submit="downloadRecord">
          <div class="dialog-body download-fields">
            <div class="download-record-title">{{ activeRecord?.recordTitle }}</div>
            <div v-if="toolsError" class="inline-failure">下载工具加载失败
              <q-btn flat color="primary" label="重试" @click="loadTools"/>
            </div>
            <div v-else-if="!toolsLoading && !downloaderOptions.length" class="field-note">
              <q-icon name="info_outline" size="18px"/>
              暂无已启用的下载工具，请先在下载工具页面添加并启用。
            </div>
            <q-input v-model="downloadForm.downUrl" readonly outlined label="下载地址" input-class="download-url-input"
                     hide-bottom-space/>
            <q-select v-model="downloadForm.dlId" outlined emit-value map-options :options="downloaderOptions"
                      label="下载工具 *" :loading="toolsLoading" :disable="downloading || toolsLoading"
                      :rules="[value => value != null || '请选择下载工具']" lazy-rules hide-bottom-space/>
            <q-input v-model="downloadForm.ruleSavePath" outlined label="保存路径"
                     placeholder="留空使用下载工具的默认路径" :disable="downloading"/>
            <q-select v-model="downloadForm.ruleSaveParam" outlined emit-value map-options :options="saveParamOptions"
                      label="目录方式" :disable="downloading"/>
          </div>
          <footer class="dialog-actions">
            <q-btn v-close-popup flat label="取消" :disable="downloading"/>
            <q-btn type="submit" unelevated color="primary" icon="download" label="提交下载" :loading="downloading"
                   :disable="toolsLoading || toolsError || !downloaderOptions.length"/>
          </footer>
        </q-form>
      </q-card>
    </q-dialog>
  </section>
</template>

<script setup lang="ts">
import DOMPurify from 'dompurify'
import {computed, onBeforeUnmount, onMounted, reactive, ref} from 'vue'
import {onBeforeRouteLeave} from 'vue-router'
import {useQuasar} from 'quasar'
import api from '@/services/api'
import type {Downloader, Feed, RssRecord} from '@/models/domain'
import PageHeading from '@/components/PageHeading.vue'
import EmptyState from '@/components/EmptyState.vue'
import {confirmAction, httpUrl, localDate, notify, openExternal} from '@/utils/ui'

const $q = useQuasar()
const defaultFilters = () => ({
  feedId: 0 as number | string,
  keywords: '' as string | null,
  unread: false,
  fav: false,
  startDate: localDate(90),
  endDate: localDate()
})
const filters = reactive(defaultFilters()), filterDraft = reactive(defaultFilters())
const searchText = ref<string | null>('')
const records = ref<RssRecord[]>([]), feeds = ref<Feed[]>([]), downloaders = ref<Downloader[]>([])
const loading = ref(true), loadingMore = ref(false), loadError = ref(false), moreError = ref(false)
const refreshing = ref(false), markingAll = ref(false), sourcesLoading = ref(false), sourcesError = ref(false),
    toolsLoading = ref(false), toolsError = ref(false)
const filtersOpen = ref(false), detailOpen = ref(false), downloadOpen = ref(false), downloading = ref(false)
const activeRecord = ref<RssRecord | null>(null), dateError = ref('')
const page = ref(1), maxPage = ref(1), total = ref(0)
const showScrollTop = ref(false)
const toolbarVisible = ref(true)
const favoriteBusy = ref(new Set<string>()), readBusy = new Set<string>()
let recordsRequest = 0
let lastScrollTop = 0
const feedOptions = computed(() => [
  ...feeds.value.filter((feed): feed is Feed & {
    feedId: string | number
  } => feed.feedId != null).map(feed => ({
    label: feed.feedName || '未命名订阅',
    value: feed.feedId,
    unread: Number(feed.unRead || 0)
  }))
])
const selectedFeed = computed(() => feeds.value.find(feed => String(feed.feedId) === String(filters.feedId)))
const selectedFeedName = computed(() => selectedFeed.value?.feedName || '全部订阅')
const dateRangeLabel = computed(() => (filters.startDate || '不限') + ' — ' + (filters.endDate || '不限'))
const safeDescription = computed(() => DOMPurify.sanitize(activeRecord.value?.recordDescription || ''))
const downloaderOptions = computed(() => downloaders.value.filter(item => item.status === 1).map(item => ({
  label: item.dlName,
  value: item.dlId
})))
const saveParamOptions = [{label: '默认', value: 0}, {label: '不新建子文件夹', value: 1}]
const downloadForm = reactive({
  downUrl: '',
  dlId: undefined as number | string | undefined,
  ruleSavePath: '',
  ruleSaveParam: 0,
  recordId: undefined as number | string | undefined
})

function validExternal(url?: string) {
  return !!url && httpUrl(url) === true
}

function updateScrollTopVisibility() {
  showScrollTop.value = window.scrollY > 480
}

function updateToolbarVisibility() {
  const currentScrollTop = Math.max(window.scrollY, 0)
  const scrollDelta = currentScrollTop - lastScrollTop

  if (currentScrollTop < 80 || scrollDelta < -4) toolbarVisible.value = true
  else if (scrollDelta > 4) toolbarVisible.value = false

  lastScrollTop = currentScrollTop
  updateScrollTopVisibility()
}

function showToolbar() {
  toolbarVisible.value = true
}

function resetReaderScroll() {
  lastScrollTop = 0
  toolbarVisible.value = true
  showScrollTop.value = false
  window.scrollTo({top: 0, behavior: 'auto'})
}

function scrollToTop() {
  window.scrollTo({top: 0, behavior: 'smooth'})
}

function excerpt(description: string) {
  return (DOMPurify.sanitize(description, {RETURN_DOM_FRAGMENT: true}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180)
}

async function loadSources() {
  sourcesLoading.value = true;
  sourcesError.value = false
  try {
    feeds.value = (await api.getFeedList({full: false})).data || []
    if(filters.feedId == 0){
      filters.feedId = feeds.value[0].feedId ?? "123123"
    }
  } catch {
    sourcesError.value = true
  } finally {
    sourcesLoading.value = false
  }
}

async function loadTools() {
  toolsLoading.value = true;
  toolsError.value = false
  try {
    downloaders.value = (await api.dllist()).data || []
  } catch {
    toolsError.value = true
  } finally {
    toolsLoading.value = false
  }
}

async function loadRecords(nextPage = 1) {
  const request = ++recordsRequest
  const append = nextPage > 1
  if (append) {
    loadingMore.value = true;
    moreError.value = false
  } else {
    loading.value = true;
    loadingMore.value = false;
    loadError.value = false;
    moreError.value = false;
    records.value = [];
    total.value = 0
  }
  const payload = {...filters, keywords: filters.keywords || '', page: nextPage, pageSize: 20}
  try {
    const response = await api.getFeedRecord(payload)
    if (request !== recordsRequest) return
    const result = response.data
    const incoming = result.records || []
    records.value = append ? [...records.value, ...incoming.filter(record => !records.value.some(existing => String(existing.recordId) === String(record.recordId)))] : incoming
    page.value = nextPage;
    total.value = Number(result.total || 0);
    maxPage.value = Number(result.pages || Math.ceil(total.value / 20) || 1)
  } catch {
    if (request !== recordsRequest) return
    if (append) {
      moreError.value = true;
      notify('加载失败，可以重试下一页', 'negative')
    } else loadError.value = true
  } finally {
    if (request === recordsRequest) {
      loading.value = false;
      loadingMore.value = false
    }
  }
}

function reload() {
  return loadRecords(1)
}

function loadMore(_index: number, done: (stop?: boolean) => void) {
  if (loading.value || loadingMore.value || page.value >= maxPage.value) {
    done(true)
    return
  }
  void loadRecords(page.value + 1).then(() => done(page.value >= maxPage.value || moreError.value))
}

function selectSource(feedId: number | string) {
  filters.feedId = feedId;
  resetReaderScroll()
  void reload()
}

function search() {
  filters.keywords = (searchText.value || '').trim();
  void reload()
}

function setView(view: 'all' | 'unread' | 'fav') {
  if (view === 'all') {
    filters.unread = false;
    filters.fav = false
  } else filters[view] = !filters[view]
  void reload()
}

function openFilters() {
  Object.assign(filterDraft, filters);
  dateError.value = '';
  filtersOpen.value = true
}

function resetFilterDraft() {
  Object.assign(filterDraft, defaultFilters());
  dateError.value = ''
}

function setDatePreset(days: number) {
  filterDraft.startDate = localDate(days);
  filterDraft.endDate = localDate();
  dateError.value = ''
}

function applyFilters() {
  if (filterDraft.startDate && filterDraft.endDate && filterDraft.startDate > filterDraft.endDate) {
    dateError.value = '结束日期不能早于开始日期';
    return
  }
  Object.assign(filters, filterDraft, {keywords: (filterDraft.keywords || '').trim()});
  searchText.value = filters.keywords;
  filtersOpen.value = false;
  void reload()
}

function removeVisible(record: RssRecord) {
  if (!records.value.some(item => String(item.recordId) === String(record.recordId))) return
  records.value = records.value.filter(item => String(item.recordId) !== String(record.recordId));
  total.value = Math.max(0, total.value - 1)
  // Removing a filtered record shifts server page offsets; reload to avoid skipping the next item.
  if (page.value < maxPage.value) void reload()
}

async function openRecord(record: RssRecord) {
  activeRecord.value = record;
  detailOpen.value = true
  const id = String(record.recordId)
  if (record.recordReadate != null || readBusy.has(id)) return
  readBusy.add(id)
  try {
    await api.readRecord({recordId: record.recordId});
    record.recordReadate = new Date().toISOString()
    if (filters.unread) removeVisible(record)
    void loadSources()
  } catch {
    notify('已读状态更新失败，关闭后可重新打开重试', 'negative')
  } finally {
    readBusy.delete(id)
  }
}

async function toggleFavorite(record: RssRecord) {
  const id = String(record.recordId)
  if (favoriteBusy.value.has(id)) return
  favoriteBusy.value.add(id)
  const next = record.recordFav > 0 ? 0 : 1
  try {
    await api.favRecord({recordId: record.recordId, fav: next});
    record.recordFav = next;
    if (!next && filters.fav) removeVisible(record)
  } catch {
    notify('星标更新失败，请重试', 'negative')
  } finally {
    favoriteBusy.value.delete(id)
  }
}

async function markAllRead() {
  if (markingAll.value || !(await confirmAction('全部标记为已读？', '将「' + selectedFeedName.value + '」中的内容标记为已读，不限于当前日期和关键词筛选结果。', '全部标记已读'))) return
  markingAll.value = true
  try {
    await api.allRead({feedId: filters.feedId});
    await Promise.all([reload(), loadSources()]);
    notify('已全部标记为已读')
  } catch {
    notify('标记失败，请重试', 'negative')
  } finally {
    markingAll.value = false
  }
}

async function refresh() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    const feed = selectedFeed.value
    if (feed) await api.feedFlush({feedId: feed.feedId, feedUrl: feed.feedUrl})
    await Promise.all([loadSources(), reload()])
  } catch {
    notify('订阅更新失败，请稍后重试', 'negative')
  } finally {
    refreshing.value = false
  }
}

function openDownload(record: RssRecord | null) {
  if (!record?.recordDlurl) return
  activeRecord.value = record
  Object.assign(downloadForm, {
    downUrl: record.recordDlurl,
    recordId: record.recordId,
    dlId: downloaderOptions.value[0]?.value,
    ruleSavePath: '',
    ruleSaveParam: 0
  })
  downloadOpen.value = true
}

async function downloadRecord() {
  if (downloading.value || downloadForm.dlId == null) return
  downloading.value = true
  const record = activeRecord.value
  try {
    await api.dlrecord({...downloadForm});
    if (record) record.recordIsdl = 1;
    downloadOpen.value = false;
    notify('下载任务已提交')
  } catch {
    notify('提交失败，下载配置已保留，请重试', 'negative')
  } finally {
    downloading.value = false
  }
}

onBeforeRouteLeave(() => !downloading.value)
onMounted(() => {
  lastScrollTop = window.scrollY
  window.addEventListener('scroll', updateToolbarVisibility, {passive: true})
  window.addEventListener('resize', updateScrollTopVisibility)
  updateToolbarVisibility()
  loadSources().then(() => reload());
  void loadTools();
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateToolbarVisibility)
  window.removeEventListener('resize', updateScrollTopVisibility)
  recordsRequest++
})
</script>

<style scoped>
.reader-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.reader-sources {
  position: sticky;
  top: 74px;
  overflow: hidden;
}

.source-list {
  padding: 0 10px 10px;
  max-height: calc(100dvh - 340px);
  overflow-y: auto;
}

.source-list .q-item {
  border-radius: 9px;
  min-height: 48px;
  padding: 10px;
  font-size: 12px;
  margin-bottom: 4px;
}

.source-list :deep(.q-item__section--avatar) {
  min-width: 32px;
}

.source-active {
  background: var(--app-surface-active);
  color: var(--q-primary);
  font-weight: 600;
}

.source-count {
  color: var(--app-muted);
  background: var(--app-surface);
  border-radius: 5px;
  padding: 2px 6px;
  font-size: 10px;
}

.reader-mobile-source .source-count {
  margin-left: 6px;
}

.source-manage {
  width: calc(100% - 24px);
  margin: 4px 12px 12px;
}

.reader-main {
  min-width: 0;
}

.reader-scroll-top {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1000;
  box-shadow: 0 4px 14px rgb(15 23 42 / 18%);
}

.reader-toolbar-reveal {
  position: fixed;
  top: 72px;
  right: 24px;
  z-index: 11;
  background: var(--app-panel);
  border: 1px solid var(--app-border);
  box-shadow: 0 4px 14px rgb(15 23 42 / 12%);
}

.reader-toolbar {
  position: sticky;
  top: 64px;
  z-index: 10;
  padding: 18px 20px 10px;
  margin-bottom: 20px;
  transition: transform .2s ease, opacity .2s ease;
}

.reader-toolbar--hidden {
  transform: translateY(calc(-100% - 12px));
  opacity: 0;
  pointer-events: none;
}

.reader-search {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reader-search .q-input {
  flex: 1;
  min-width: 0;
}

.reader-view-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 12px;
}

.reader-view-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.reader-view-buttons .q-btn {
  min-height: 36px;
  font-size: 12px;
  padding: 0 12px;
  color: var(--muted);
}

.reader-view-buttons :deep(.q-icon) {
  font-size: 16px;
}

.reader-view-buttons .q-btn:nth-child(2) :deep(.q-icon) {
  font-size: 8px;
}

.reader-view-buttons .view-active {
  color: var(--q-primary);
  background: var(--app-surface-active);
}

.reader-date {
  color: var(--muted);
  font-size: 10px;
}

.reader-list-heading {
  border-bottom: 1px solid var(--border);
}

.reader-list-heading > div {
  min-width: 0;
  overflow-wrap: anywhere;
}

.reader-list-heading .count-tag {
  flex-shrink: 0;
}

.reader-content {
  overflow: hidden;
}

.reader-record {
  padding: 16px 24px 6px;
  border-bottom: 1px solid var(--border);
}

.reader-record:hover {
  background: var(--app-panel-soft);
}

.record-open {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  text-align: left;
  background: transparent;
  font: inherit;
  cursor: pointer;
  color: inherit;
}

.record-open:focus-visible {
  outline: 2px solid var(--q-primary);
  border-radius: 4px;
}

.record-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.5;
  margin-bottom: 6px;
}

.unread-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--q-primary);
}

.record-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.55;
  overflow-wrap: anywhere;
  color: var(--app-text-secondary);
}

.reader-record--unread .record-title {
  font-weight: 650;
  color: var(--app-ink);
}

.record-excerpt {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
  margin-top: 4px;
  overflow-wrap: anywhere;
}

.record-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.record-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: var(--muted);
}

.record-status .q-icon {
  color: var(--app-success-text);
}

.record-actions {
  display: flex;
  gap: 2px;
  margin-left: auto;
}

.record-actions :deep(.q-btn) {
  min-width: 36px;
  min-height: 36px;
}

.record-actions :deep(.q-icon) {
  font-size: 18px;
}

.reader-more {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  color: var(--muted);
  font-size: 12px;
}

.reader-more-loading {
  padding: 12px 24px 16px;
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}

.reader-mobile-source, .reader-source-error {
  display: none;
}

.filter-fields, .download-fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
}

.filter-presets, .filter-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.reader-detail {
  width: 860px;
}

.reader-article {
  padding: 32px 40px;
}

.article-meta {
  font-size: 12px;
  color: var(--app-muted);
  line-height: 1.8;
}

.reader-article h1 {
  font-size: 25px;
  line-height: 1.6;
  margin: 16px 0 28px;
  font-weight: 650;
}

.rss-content {
  font-size: 15px;
  line-height: 1.9;
  overflow-wrap: anywhere;
}

.rss-content :deep(img), .rss-content :deep(video), .rss-content :deep(iframe) {
  max-width: 100%;
  height: auto;
}

.rss-content :deep(pre), .rss-content :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
}

.rss-content :deep(a) {
  color: var(--q-primary);
  overflow-wrap: anywhere;
}

.download-record-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.7;
}

.download-url-input {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1199px) and (min-width: 1024px) {
  .reader-layout {
    grid-template-columns: 210px minmax(0, 1fr);
    gap: 18px;
  }
}

@media (max-width: 1023px) {
  .download-fields {
    align-content: start;
  }

  .reader-scroll-top {
    right: 16px;
    bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  }

  .reader-toolbar-reveal {
    top: 58px;
    right: 16px;
  }

  .reader-layout {
    display: block;
  }

  .reader-sources {
    display: none;
  }

  .reader-mobile-source {
    display: block;
    margin-bottom: 12px;
  }

  .reader-source-error {
    display: flex;
    margin-bottom: 12px;
  }
}

@media (max-width: 599px) {
  .reader-page :deep(.workspace-heading) {
    flex-wrap: nowrap;
  }

  .reader-page :deep(.workspace-heading__text) {
    flex: 1;
  }

  .reader-toolbar {
    padding: 16px 12px 12px;
  }

  .reader-search {
    gap: 8px;
  }

  .reader-search .q-input {
    flex-basis: 0;
  }

  .reader-view-tools {
    margin-top: 8px;
  }

  .reader-view-buttons .q-btn {
    padding: 0 10px;
    min-height: 44px;
  }

  .reader-date {
    width: 100%;
    padding: 8px 4px 0;
  }

  .reader-list-heading {
    padding: 18px 16px;
  }

  .reader-record {
    padding: 16px 16px 6px;
  }

  .record-title {
    font-size: 15px;
  }

  .reader-more {
    padding: 16px;
    font-size: 11px;
  }

  .reader-more-loading {
    padding: 10px 16px 14px;
  }

  .reader-filter-dialog {
    border-radius: 16px 16px 0 0 !important;
    max-width: 100vw;
  }

  .reader-article {
    padding: 24px 20px;
  }

  .reader-article h1 {
    font-size: 21px;
  }

  .rss-content {
    font-size: 14px;
  }
}
</style>
