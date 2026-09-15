<template>
  <section class="workspace-page management-page" :class="{ 'management-page--detail': mobileDetail }">
    <PageHeading title="订阅管理" subtitle="把感兴趣的内容，汇集到同一个地方。" eyebrow="内容来源">
      <q-btn unelevated color="primary" icon="add" label="添加订阅" :disable="busy || loading || sorting"
             @click="addFeed"/>
    </PageHeading>
    <div class="management-layout">
      <aside class="workspace-panel management-library" aria-label="订阅列表">
        <div class="panel-heading">
          <h2>我的订阅 <span class="count-tag">{{ feeds.length }}</span></h2>
          <q-btn flat round :icon="sorting ? 'close' : 'sort'" :aria-label="sorting ? '取消排序' : '调整订阅顺序'"
                 :disable="busy || loading || feeds.length < 2" @click="sorting ? cancelSorting() : startSorting()"/>
        </div>
        <div v-if="!sorting" class="library-search">
          <q-input v-model="keywords" outlined dense clearable placeholder="搜索名称或订阅地址" aria-label="搜索订阅">
            <template #prepend>
              <q-icon name="search" size="20px"/>
            </template>
          </q-input>
        </div>
        <div v-if="dirty && !sorting" class="draft-banner"><span>有未保存的订阅</span>
          <q-btn flat color="primary" label="继续编辑" @click="showEditor"/>
        </div>
        <div v-if="sorting" class="sort-help">拖动手柄，或使用上下按钮调整顺序。</div>
        <div v-if="loading" class="q-pa-md" role="status" aria-label="正在加载订阅">
          <q-skeleton v-for="i in 3" :key="i" height="90px" class="q-mb-sm"/>
        </div>
        <EmptyState v-else-if="loadError" error title="订阅加载失败" description="请检查连接后重试。">
          <q-btn outline color="primary" label="重新加载" @click="load"/>
        </EmptyState>
        <q-list v-else-if="visibleFeeds.length" class="management-list" :class="{ 'sorting-list': sorting }">
          <q-item v-for="(feed, index) in visibleFeeds" :key="String(feed.feedId)" v-ripple :clickable="!sorting"
                  :disable="busy" :data-feed-sort-id="String(feed.feedId)" class="management-item"
                  :class="{ 'feed-dragging': String(draggingFeedId) === String(feed.feedId) }"
                  :active="!sorting && String(form.feedId) === String(feed.feedId)"
                  active-class="management-item--active" @click="selectFeed(feed)">
            <q-item-section v-if="sorting" side class="sort-handle-section">
              <button type="button" class="sort-handle" :disabled="busy" :aria-label="'拖动排序：' + feed.feedName"
                      @pointerdown.stop="startFeedDrag($event, feed)" @pointermove.stop="moveFeedDrag"
                      @pointerup.stop="finishFeedDrag" @pointercancel.stop="finishFeedDrag"
                      @keydown.up.prevent="moveBy(index, -1)" @keydown.down.prevent="moveBy(index, 1)" @click.stop>
                <q-icon name="drag_indicator" size="22px"/>
              </button>
            </q-item-section>
            <q-item-section>
              <div class="item-topline"><span class="item-title ellipsis">{{
                  feed.feedName || '未命名订阅'
                }}</span><span v-if="!sorting" class="state-label"
                               :class="{ 'state-label--enabled': feed.status === 1 }">{{
                  feed.status === 1 ? '启用' : '停用'
                }}</span></div>
              <div class="item-caption ellipsis">{{ feed.feedUrl }}</div>
              <div v-if="!sorting" class="item-caption feed-meta">
                <q-icon name="schedule" size="13px"/>
                <span>每 {{ feed.feedCrontab }} 分钟更新</span>
                <span class="feed-type-label">{{ feedTypeLabel(feed.feedType) }}</span>
              </div>
            </q-item-section>
            <q-item-section v-if="sorting" side>
              <div class="sort-buttons">
                <q-btn flat round icon="arrow_upward" :aria-label="'上移：' + feed.feedName"
                       :disable="busy || index === 0" @click.stop="moveBy(index, -1)"/>
                <q-btn flat round icon="arrow_downward" :aria-label="'下移：' + feed.feedName"
                       :disable="busy || index === feeds.length - 1" @click.stop="moveBy(index, 1)"/>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
        <EmptyState v-else :icon="feeds.length ? 'search_off' : 'rss_feed'"
                    :title="feeds.length ? '没有找到订阅' : '添加第一个内容来源'"
                    :description="feeds.length ? '试试其他名称，或清除搜索条件。' : '粘贴 RSS 地址，开始接收你关注的内容。'">
          <q-btn v-if="feeds.length" flat color="primary" label="清除搜索" @click="keywords = ''"/>
          <q-btn v-else outline color="primary" icon="add" label="添加订阅" @click="addFeed"/>
        </EmptyState>
        <div v-if="sorting" class="sort-actions">
          <q-btn flat label="取消" :disable="busy" @click="cancelSorting"/>
          <q-btn unelevated color="primary" label="保存排序" :loading="sortSaving" :disable="!sortDirty"
                 @click="saveFeedOrder"/>
        </div>
        <div v-else class="library-note">
          <q-icon name="rss_feed" size="16px"/>
          {{ enabledCount }} 个订阅已启用
        </div>
      </aside>

      <main class="management-editor">
        <q-btn flat icon="arrow_back" label="返回订阅列表" class="mobile-editor-back" @click="backToList"/>
        <div v-if="loading" class="q-pa-lg">
          <q-skeleton height="60px"/>
          <q-skeleton height="340px" class="q-mt-lg"/>
        </div>
        <template v-else>
          <header class="editor-heading">
            <div><h2>{{ form.feedName || (form.feedId != null ? '未命名订阅' : '添加订阅') }}</h2>
              <p>{{
                  dirty ? '有未保存的更改' : form.feedId != null ? '所有更改已保存' : '添加来源，并设置适合的更新频率'
                }}</p></div>
            <q-toggle v-model="enabled" color="positive" :disable="busy || sorting"
                      :label="enabled ? '已启用' : '已停用'"/>
          </header>
          <q-form ref="editorForm" greedy novalidate class="editor-form" @submit="saveFeed">
            <section class="form-block">
              <div class="form-block__heading">
                <q-icon name="rss_feed" size="20px"/>
                <div><h3>订阅来源</h3>
                  <p>为内容来源命名，填写完整的 RSS 地址。</p></div>
              </div>
              <q-input v-model="form.feedName" outlined label="订阅名称" placeholder="例如：科技与设计"
                       :disable="busy || sorting" hide-bottom-space/>
              <q-input v-model="form.feedUrl" outlined label="RSS 地址 *" placeholder="https://example.com/feed.xml"
                       :rules="[required, httpUrl]" lazy-rules hide-bottom-space :disable="busy || sorting"
                       inputmode="url"/>
              <div class="field-note">
                <q-icon name="link" size="17px"/>
                使用订阅源的 RSS / Atom 地址。
              </div>
            </section>
            <section class="form-block">
              <div class="form-block__heading">
                <q-icon name="category" size="20px"/>
                <div><h3>内容类型</h3>
                  <p>选择类型后，更新订阅时会执行对应的内容增强处理。</p></div>
              </div>
              <q-select v-model="form.feedType" outlined emit-value map-options label="订阅类型"
                        :options="feedTypeOptions" :disable="busy || sorting" hide-bottom-space/>
              <div class="field-note">
                <q-icon name="info_outline" size="17px"/>
                影视会提取媒体元数据，代码订阅会抓取 GitHub 提交 patch 并按需预览。
              </div>
            </section>
            <section class="form-block">
              <div class="form-block__heading">
                <q-icon name="schedule" size="20px"/>
                <div><h3>更新计划</h3>
                  <p>按设定的周期获取新内容。</p></div>
              </div>
              <q-input v-model.number="form.feedCrontab" outlined type="number" min="1" step="1" label="更新周期 *"
                       suffix="分钟" :rules="[validInterval]" lazy-rules hide-bottom-space :disable="busy || sorting"/>
              <div class="interval-presets"><span>常用周期</span>
                <q-btn v-for="minutes in [15, 30, 60, 180]" :key="minutes" flat
                       :color="form.feedCrontab === minutes ? 'primary' : 'grey-7'"
                       :class="{ 'preset-active': form.feedCrontab === minutes }"
                       :label="minutes < 60 ? minutes + ' 分钟' : minutes / 60 + ' 小时'" :disable="busy || sorting"
                       @click="form.feedCrontab = minutes"/>
              </div>
              <dl v-if="form.feedId != null" class="meta-grid feed-timing">
                <div>
                  <dt>上次更新</dt>
                  <dd>{{ form.feedLastUpdate || '尚未更新' }}</dd>
                </div>
                <div>
                  <dt>下次更新</dt>
                  <dd>{{ enabled ? form.feedNextUpdate || '等待调度' : '订阅已停用' }}</dd>
                </div>
              </dl>
            </section>
            <footer class="save-bar">
              <q-btn v-if="form.feedId != null" flat round color="negative" icon="delete_outline" aria-label="删除订阅"
                     :disable="busy || sorting" @click="deleteFeed"/>
              <q-btn v-if="dirty" flat color="grey-7" label="撤销" :disable="busy || sorting" @click="undo"/>
              <span class="save-bar__status">{{ dirty ? '更改尚未保存' : '配置就绪' }}</span>
              <q-btn type="submit" unelevated color="primary" icon="check"
                     :label="form.feedId != null ? '保存更改' : '添加订阅'" :loading="saving"
                     :disable="deleting || sorting || (form.feedId != null && !dirty)"/>
            </footer>
          </q-form>
        </template>
      </main>
    </div>
  </section>
</template>

<script setup lang="ts">
import {computed, nextTick, onMounted, ref} from 'vue'
import {QForm, useQuasar} from 'quasar'
import api from '@/services/api'
import {FEED_TYPE_OPTIONS, feedTypeLabel, type Feed, type FeedType} from '@/models/domain'
import PageHeading from '@/components/PageHeading.vue'
import EmptyState from '@/components/EmptyState.vue'
import {useEditorDraft} from '@/composables/useEditorDraft'
import {confirmAction, httpUrl, notify, required} from '@/utils/ui'

const $q = useQuasar()
const feeds = ref<Feed[]>([])
const keywords = ref<string | null>('')
const loading = ref(true), loadError = ref(false), saving = ref(false), deleting = ref(false)
const sorting = ref(false), sortSaving = ref(false), mobileDetail = ref(false)
const sortOriginal = ref<Feed[]>([])
const draggingFeedId = ref<number | string | null>(null)
const busy = computed(() => saving.value || deleting.value || sortSaving.value)
const sortDirty = computed(() => sorting.value && feeds.value.map(f => f.feedId).join(',') !== sortOriginal.value.map(f => f.feedId).join(','))
const feedTypeOptions = FEED_TYPE_OPTIONS
const empty = (): Feed => ({feedName: '', feedUrl: '', feedType: 'OTHER' as FeedType, feedCrontab: 30, status: 1})
const {form, saved, dirty, reset, canDiscard} = useEditorDraft(empty, busy, sortDirty)
const editorForm = ref<QForm>()
const enabled = computed({
  get: () => form.value.status === 1, set: value => {
    form.value.status = value ? 1 : 0
  }
})
const enabledCount = computed(() => feeds.value.filter(feed => feed.status === 1).length)
const visibleFeeds = computed(() => sorting.value ? feeds.value : feeds.value.filter(feed => (feed.feedName + '\n' + feed.feedUrl).toLowerCase().includes((keywords.value || '').trim().toLowerCase())))
const validInterval = (value: unknown) => (Number.isInteger(Number(value)) && Number(value) >= 1) || '请输入至少 1 分钟的整数'

async function showEditor() {
  mobileDetail.value = true;
  await nextTick();
  if ($q.screen.lt.md) window.scrollTo(0, 0)
}

async function backToList() {
  mobileDetail.value = false;
  await nextTick();
  if ($q.screen.lt.md) window.scrollTo(0, 0)
}

function setForm(feed: Feed = empty()) {
  reset({...feed, feedType: feed.feedType || 'OTHER'});
  nextTick(() => editorForm.value?.resetValidation())
}

async function selectFeed(feed: Feed) {
  if (sorting.value || busy.value) return
  if (String(form.value.feedId) !== String(feed.feedId)) {
    if (!(await canDiscard())) return;
    setForm(feed)
  }
  await showEditor()
}

async function addFeed() {
  if (busy.value || sorting.value || !(await canDiscard())) return;
  setForm();
  await showEditor()
}

async function undo() {
  if (await canDiscard()) setForm(saved.value)
}

async function fetchFeeds() {
  const response = await api.getFeedList({full: true});
  feeds.value = response.data || [];
  loadError.value = false
}

async function load() {
  loading.value = true;
  loadError.value = false
  try {
    await fetchFeeds();
    if (!dirty.value && form.value.feedId == null) setForm(feeds.value[0])
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function saveFeed() {
  if (busy.value || sorting.value) return
  saving.value = true
  const payload = {...form.value, feedName: form.value.feedName.trim(), feedUrl: form.value.feedUrl.trim()}
  const previousIds = new Set(feeds.value.map(feed => String(feed.feedId)))
  try {
    await api.feedSave(payload)
  } catch {
    notify('保存失败，修改已保留，请重试', 'negative');
    saving.value = false;
    return
  }
  setForm(payload.feedId != null ? payload : empty())
  notify('订阅已保存')
  try {
    await fetchFeeds()
    const selected = payload.feedId != null ? feeds.value.find(feed => String(feed.feedId) === String(payload.feedId)) : feeds.value.find(feed => !previousIds.has(String(feed.feedId)) && feed.feedUrl === payload.feedUrl)
    if (selected) setForm(selected)
    keywords.value = ''
  } catch {
    loadError.value = true;
    notify('订阅已保存，列表刷新失败，请重新加载', 'warning')
  } finally {
    saving.value = false
  }
}

async function deleteFeed() {
  if (busy.value || form.value.feedId == null) return
  const feedId = form.value.feedId
  if (!(await confirmAction('删除订阅？', '将移除「' + (saved.value.feedName || '未命名订阅') + '」，此操作无法撤销。', '删除订阅', true))) return
  deleting.value = true
  try {
    await api.feeddelete({feedId});
    feeds.value = feeds.value.filter(feed => String(feed.feedId) !== String(feedId));
    setForm(visibleFeeds.value[0]);
    await backToList();
    notify('订阅已删除')
  } catch {
    notify('删除失败，请稍后重试', 'negative')
  } finally {
    deleting.value = false
  }
}

async function startSorting() {
  if (busy.value || !(await canDiscard())) return
  setForm(saved.value);
  sortOriginal.value = feeds.value.slice();
  sorting.value = true;
  keywords.value = ''
}

function cancelSorting() {
  if (busy.value) return;
  feeds.value = sortOriginal.value.slice();
  sorting.value = false;
  finishFeedDrag()
}

function moveBy(index: number, direction: number) {
  if (busy.value || !sorting.value) return
  const target = index + direction
  if (target < 0 || target >= feeds.value.length) return
  const [feed] = feeds.value.splice(index, 1);
  feeds.value.splice(target, 0, feed)
}

function startFeedDrag(event: PointerEvent, feed: Feed) {
  if (busy.value || !sorting.value || feed.feedId == null || (event.pointerType === 'mouse' && event.button !== 0)) return
  event.preventDefault();
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  draggingFeedId.value = feed.feedId
}

function moveFeedDrag(event: PointerEvent) {
  if (busy.value || draggingFeedId.value == null) return
  event.preventDefault()
  if (event.clientY < 90) window.scrollBy(0, -12)
  if (event.clientY > window.innerHeight - 100) window.scrollBy(0, 12)
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-feed-sort-id]')
  const currentIndex = feeds.value.findIndex(feed => String(feed.feedId) === String(draggingFeedId.value))
  const targetIndex = feeds.value.findIndex(feed => String(feed.feedId) === target?.dataset.feedSortId)
  if (!target || currentIndex < 0 || targetIndex < 0 || currentIndex === targetIndex) return
  const rect = target.getBoundingClientRect()
  const insertIndex = targetIndex - (targetIndex > currentIndex ? 1 : 0) + (event.clientY >= rect.top + rect.height / 2 ? 1 : 0)
  const [feed] = feeds.value.splice(currentIndex, 1);
  feeds.value.splice(insertIndex, 0, feed)
}

function finishFeedDrag() {
  draggingFeedId.value = null
}

async function saveFeedOrder() {
  if (busy.value || !sortDirty.value) return
  sortSaving.value = true
  const data = feeds.value.filter((feed): feed is Feed & {
    feedId: number | string
  } => feed.feedId != null).map((feed, index) => ({feedId: feed.feedId, sortOn: index + 1}))
  try {
    await api.feedSort({data});
    sorting.value = false;
    sortOriginal.value = [];
    finishFeedDrag();
    notify('订阅顺序已保存')
  } catch {
    notify('排序保存失败，调整已保留，请重试', 'negative')
  } finally {
    sortSaving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.library-note {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 11px;
  border-top: 1px solid var(--border);
  padding: 16px;
}

.feed-type-label {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 5px;
  color: var(--q-primary);
  background: var(--app-surface-active);
  font-size: 10px;
}

.feed-meta {
  display: flex;
  align-items: center;
}

.feed-meta .feed-type-label {
  margin-left: auto;
}

.interval-presets {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  font-size: 12px;
  color: var(--muted);
}

.interval-presets .q-btn {
  font-size: 12px;
}

.preset-active {
  background: var(--app-surface-active);
}

.feed-timing {
  padding-top: 18px;
  border-top: 1px solid var(--border);
}

.sort-help {
  padding: 12px 16px;
  font-size: 12px;
  color: var(--muted);
  background: var(--app-surface-hover);
}

.sort-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--border);
}

.sorting-list {
  max-height: none;
}

.sort-handle-section {
  padding-right: 4px;
}

.sort-handle {
  display: grid;
  place-items: center;
  width: 36px;
  height: 44px;
  background: transparent;
  color: var(--app-muted);
  border: 0;
  border-radius: 8px;
  cursor: grab;
  touch-action: none;
}

.sort-handle:focus-visible {
  outline: 2px solid var(--q-primary);
}

.sort-buttons {
  display: flex;
  flex-direction: column;
}

.sort-buttons .q-btn {
  min-width: 36px;
}

.feed-dragging {
  opacity: .55;
  background: var(--app-surface-active);
}
</style>
