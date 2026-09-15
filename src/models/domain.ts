export interface ApiResponse<T> {
  data: T
  message?: string
  code?: number | string
}

export interface Feed {
  feedId?: number | string
  feedName: string
  feedUrl: string
  feedLastUpdate?: string
  feedNextUpdate?: string
  feedCrontab: number
  status: number
  sortOn?: number
  unRead?: number
}

export interface FeedSortItem {
  feedId: number | string
  sortOn: number
}

export interface RssRecord {
  recordId: number | string
  feedId?: number | string
  recordTitle: string
  recordDescription?: string
  recordPubdate?: string
  recordRxdate?: string
  recordUrl?: string
  recordDlurl?: string | null
  recordReadate?: string | null
  recordFav: number
  recordIsdl: number
  feedName?: string
}

export interface Downloader {
  dlId?: number | string
  dlName: string
  dlUrl: string
  dlType: number | string
  dlUser: string
  dlPasswd: string
  status: number
}

export interface Rule {
  ruleId?: number | string
  ruleTitle: string
  ruleParam: string
  ruleType: number | string
  ruleSavePath: string
  ruleSaveParam: number | string
  dlId?: number | string
  feedIds?: Array<number | string>
  status: number
}

export interface DownloadLog {
  recordId: number | string
  recordTitle: string
  feedName: string
  ruleInfo?: string
  dlInfo?: string
  dlDate?: string
}

export interface PageResult<T> {
  records: T[]
  total: number
  pages?: number
  current?: number
}
