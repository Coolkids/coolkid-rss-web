import { describe, expect, it } from 'vitest'
import router from './index'

describe('application routes', () => {
  it('exposes the five primary RSS management pages', () => {
    const names = router.getRoutes().map((route) => route.name).filter(Boolean)
    expect(names).toEqual(expect.arrayContaining(['rss', 'download-logs', 'feeds', 'rules', 'downloaders']))
  })
})
