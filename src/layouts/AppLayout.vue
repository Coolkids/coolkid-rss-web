<template>
  <q-layout view="hHh LpR fFf" class="app-layout">
    <q-header bordered class="bg-white text-grey-9">
      <q-toolbar>
        <q-btn
          v-if="$q.screen.gt.sm"
          flat
          round
          dense
          :icon="drawerOpen ? 'menu_open' : 'menu'"
          :aria-label="drawerOpen ? '隐藏侧边菜单' : '显示侧边菜单'"
          :aria-expanded="drawerOpen"
          @click="drawerOpen = !drawerOpen"
        />
        <q-toolbar-title class="text-weight-bold">
          <q-avatar size="32px" color="primary" text-color="white" icon="rss_feed" class="q-mr-sm" />
          <span class="app-brand">Coolkid RSS</span>
        </q-toolbar-title>
        <div class="text-caption text-grey-6 gt-sm">RSS 阅读与自动下载管理</div>
        <q-btn
          flat
          round
          dense
          :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
          :aria-label="$q.dark.isActive ? '切换到浅色模式' : '切换到暗色模式'"
          @click="toggleTheme"
        >
          <q-tooltip>{{ $q.dark.isActive ? '浅色模式' : '暗色模式' }}</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawerOpen" bordered :width="180">
      <q-list padding class="desktop-navigation">
        <q-item-label header>工作台</q-item-label>
        <q-item v-for="item in navigation" :key="item.to" v-ripple clickable :to="item.to" active-class="nav-active">
          <q-item-section avatar><q-icon :name="item.icon" /></q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <q-page class="app-page q-pa-sm q-pa-md">
        <div class="page-container"><router-view /></div>
      </q-page>
    </q-page-container>

    <q-footer v-if="$q.screen.lt.md" bordered class="bg-white text-grey-8">
      <q-tabs class="mobile-bottom-nav" no-caps dense active-color="primary" indicator-color="transparent" :model-value="String(route.name)" @update:model-value="navigate">
        <q-tab v-for="item in navigation" :key="item.to" :name="item.name" :icon="item.icon" :label="item.shortLabel" />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const desktopMenuHidden = ref(false)
const drawerOpen = computed({
  get: () => $q.screen.gt.sm && !desktopMenuHidden.value,
  set: (value: boolean) => {
    desktopMenuHidden.value = !value
  }
})
const navigation = [
  { name: 'rss', to: '/rss', label: 'Feed 浏览', shortLabel: '浏览', icon: 'rss_feed' },
  { name: 'download-logs', to: '/download-logs', label: '下载日志', shortLabel: '日志', icon: 'cloud_download' },
  { name: 'tmdb-misses', to: '/tmdb-misses', label: 'TMDB 未匹配', shortLabel: '未匹配', icon: 'find_in_page' },
  { name: 'feeds', to: '/feeds', label: '订阅管理', shortLabel: '订阅', icon: 'subscriptions' },
  { name: 'rules', to: '/rules', label: '规则管理', shortLabel: '规则', icon: 'rule' },
  { name: 'downloaders', to: '/downloaders', label: '下载工具', shortLabel: '工具', icon: 'settings' }
]

function navigate (name: string) {
  const target = navigation.find((item) => item.name === name)
  if (target) router.push(target.to)
}

function applyThemeColor () {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', $q.dark.isActive ? '#0f172a' : '#2563eb')
}

function toggleTheme () {
  $q.dark.toggle()
  localStorage.setItem('coolkid-rss-theme', $q.dark.isActive ? 'dark' : 'light')
  applyThemeColor()
}

if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('coolkid-rss-theme')
  if (savedTheme === 'dark' || savedTheme === 'light') {
    $q.dark.set(savedTheme === 'dark')
  }
  applyThemeColor()
}
</script>

<style scoped>
.app-layout { background: var(--app-page); color: var(--app-ink); }
.app-layout :deep(.q-header), .app-layout :deep(.q-footer), .app-layout :deep(.q-drawer) { background: var(--app-panel) !important; color: var(--app-ink) !important; }
.app-layout :deep(.q-header), .app-layout :deep(.q-footer), .app-layout :deep(.q-drawer) { border-color: var(--app-border) !important; }
.app-layout :deep(.q-toolbar), .app-layout :deep(.q-item-label) { color: var(--app-ink); }
.app-brand { font-size: 17px; letter-spacing: -.3px; }
.desktop-navigation { padding: 16px 10px; }
.desktop-navigation .q-item { border-radius: 10px; margin-bottom: 6px; min-height: 48px; padding: 12px; font-size: 13px; }
.desktop-navigation :deep(.q-item__section--avatar) { min-width: 34px; }
.nav-active { color: var(--q-primary); background: var(--app-surface-active); font-weight: 600; }
.app-layout :deep(.text-grey-9) { color: var(--app-ink) !important; }
.app-layout :deep(.text-grey-8), .app-layout :deep(.text-grey-7), .app-layout :deep(.text-grey-6) { color: var(--app-muted) !important; }

@media (max-width: 1023px) {
  .mobile-bottom-nav {
    padding-bottom: env(safe-area-inset-bottom);
  }

  .mobile-bottom-nav :deep(.q-tab) {
    min-width: 0;
    flex: 1 1 0;
    padding: 0 4px;
  }

  .mobile-bottom-nav :deep(.q-tab__label) {
    font-size: 11px;
  }
  .mobile-bottom-nav :deep(.q-tab--active .q-tab__icon) { background: var(--app-surface-active); border-radius: 8px; width: 44px; }
}
</style>
