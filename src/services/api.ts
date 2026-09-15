import http from './http'
import type { ApiResponse, DownloadLog, Downloader, Feed, FeedSortItem, PageResult, RssPatch, RssRecord, Rule, TmdbMediaInfo } from '@/models/domain'

const unwrap = <T>(request: Promise<{ data: T }>) => request.then((response) => response.data)

const api = {
  getFeedList: (params?: { full?: boolean }) => unwrap(http.get<ApiResponse<Feed[]>>('/feed/getFeedList', { params })),
  getFeedRecord: (data: Record<string, unknown>) => unwrap(http.post<ApiResponse<PageResult<RssRecord>>>('/feed/getFeedRecord', data)),
  getRecordPatch: (params: { recordId: number | string }) => unwrap(http.get<ApiResponse<RssPatch>>('/feed/recordPatch', { params })),
  refreshTmdb: (data: { recordId: number | string; name: string }) => unwrap(http.post<ApiResponse<TmdbMediaInfo>>('/feed/refreshTmdb', data)),
  readRecord: (params: { recordId: number | string }) => unwrap(http.get('/feed/readRecord', { params })),
  favRecord: (params: { recordId: number | string; fav: number }) => unwrap(http.get('/feed/favRecord', { params })),
  allRead: (params: { feedId?: number | string }) => unwrap(http.get('/feed/allRead', { params })),
  feedSave: (data: Partial<Feed>) => unwrap(http.post('/feed/save', data)),
  feedSort: (data: { data: FeedSortItem[] }) => unwrap(http.post('/feed/sorton', data)),
  feeddelete: (params: { feedId?: number | string }) => unwrap(http.get('/feed/delete', { params })),
  feedFlush: (data: Partial<Feed>) => unwrap(http.post('/feed/flush', data)),
  dllist: () => unwrap(http.get<ApiResponse<Downloader[]>>('/dl/list')),
  dlsave: (data: Partial<Downloader>) => unwrap(http.post('/dl/save', data)),
  dldelete: (params: { dlId?: number | string }) => unwrap(http.get('/dl/delete', { params })),
  dlrecord: (data: Record<string, unknown>) => unwrap(http.post('/dl/download', data)),
  getDownLog: (data: Record<string, unknown>) => unwrap(http.post<ApiResponse<PageResult<DownloadLog>>>('/dl/log', data)),
  rulelist: (data: Record<string, unknown>) => unwrap(http.post<ApiResponse<Rule[]>>('/rule/list', data)),
  ruleitem: (params: { ruleId?: number | string }) => unwrap(http.get<ApiResponse<Feed[]>>('/rule/item', { params })),
  ruletest: (data: Record<string, unknown>) => unwrap(http.post<ApiResponse<RssRecord[]>>('/rule/testRule', data)),
  rulesave: (data: Partial<Rule>) => unwrap(http.post('/rule/save', data)),
  ruledelete: (params: { ruleId?: number | string }) => unwrap(http.get('/rule/delete', { params })),
  downloadOld: () => unwrap(http.post('/rule/dlold', {}))
}

export default api
