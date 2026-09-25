import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router'

const history = typeof window === 'undefined'
  ? createMemoryHistory()
  : createWebHistory(import.meta.env.BASE_URL)

const router = createRouter({
  history,
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      redirect: '/rss',
      children: [
        { path: 'rss', name: 'rss', component: () => import('@/pages/RssPage.vue') },
        { path: 'download-logs', name: 'download-logs', component: () => import('@/pages/DownloadLogPage.vue') },
        { path: 'tmdb-misses', name: 'tmdb-misses', component: () => import('@/pages/AnitopyTmdbMissPage.vue') },
        { path: 'feeds', name: 'feeds', component: () => import('@/pages/FeedConfigPage.vue') },
        { path: 'rules', name: 'rules', component: () => import('@/pages/RuleConfigPage.vue') },
        { path: 'downloaders', name: 'downloaders', component: () => import('@/pages/DownloadConfigPage.vue') }
      ]
    },
    // Keep the previous URLs working for existing bookmarks and deployments.
    { path: '/RssPage', redirect: '/rss' },
    { path: '/DownLogPage', redirect: '/download-logs' },
    { path: '/AnitopyTmdbMiss', redirect: '/tmdb-misses' },
    { path: '/FeedConfig', redirect: '/feeds' },
    { path: '/RuleConfig', redirect: '/rules' },
    { path: '/DownloadConfig', redirect: '/downloaders' },
    { path: '/:pathMatch(.*)*', redirect: '/rss' }
  ],
  scrollBehavior: () => ({ top: 0 })
})

export default router
