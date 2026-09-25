export interface ApiResponse<T> {
  data: T
  message?: string
  code?: number | string
}

export type FeedType = 'MOVIE' | 'NEWS' | 'CODE' | 'MUSIC' | 'OTHER'

export const FEED_TYPE_OPTIONS: Array<{ label: string; value: FeedType }> = [
  {label: '影视', value: 'MOVIE'},
  {label: '新闻', value: 'NEWS'},
  {label: '代码', value: 'CODE'},
  {label: '音乐', value: 'MUSIC'},
  {label: '其他', value: 'OTHER'}
]

export function feedTypeLabel(type?: FeedType | string) {
  return FEED_TYPE_OPTIONS.find(option => option.value === type)?.label || '其他'
}

export interface Feed {
  feedId?: number | string
  feedName: string
  feedUrl: string
  feedType?: FeedType
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
  recordMediaInfo?: Record<string, unknown>
  recordPatch?: string
  recordPatchUrl?: string
  recordPatchSize?: number
  recordPatchTruncated?: boolean
}

export interface TmdbMediaInfo {
  id?: number | string
  mediaType?: 'movie' | 'tv' | string
  tmdbUrl?: string
  name?: string
  originalName?: string
  releaseYear?: number | string
  posterUrl?: string
  backdropUrl?: string
  backdropUrls?: string[]
  photos?: string[]
  episodePhotos?: string[]
  images?: string[] | {
    posters?: string[]
    backdrops?: string[]
    stills?: string[]
  }
  overview?: string
  originalLanguage?: string
  voteAverage?: number
  voteCount?: number
  genres?: string[]
  runtimeMinutes?: number
  status?: string
}

export interface RssPatch {
  patch?: string
  patchUrl?: string
  size?: number
  truncated?: boolean
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

export interface AnitopyTmdbMiss {
  missId: number | string
  recordId?: number | string
  feedId?: number | string
  recordTitle: string
  anitopyResult?: Record<string, unknown>
  firstSeenAt?: string
  lastSeenAt?: string
  seenCount?: number
}

export interface PageResult<T> {
  records: T[]
  total: number
  pages?: number
  current?: number
}
