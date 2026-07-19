export const EXPLICIT_SPACE = '␣'

export const CHAPTER_LENGTH = 20

export const DISMISS_START_CARD_DATE_KEY = 'dismissStartCardDate'

export const DISMISS_CHAPTER_ERROR_BOOK_GUIDE_KEY = 'dismissChapterErrorBookGuide'

export const DISMISS_CONTINUOUS_SHEET_GUIDE_KEY = 'dismissContinuousSheetGuide'

/** 更新公告版本号；发新公告时递增，已「不再提示」的用户会再次看到 */
export const UPDATE_ANNOUNCEMENT_ID = '2026-07-19'
export const DISMISS_UPDATE_ANNOUNCEMENT_KEY = `dismissUpdateAnnouncement_${UPDATE_ANNOUNCEMENT_ID}`

export const DONATE_DATE = 'donateDate'

export const CONFETTI_DEFAULTS = {
  colors: ['#5D8C7B', '#F2D091', '#F2A679', '#D9695F', '#8C4646'],
  shapes: ['square'],
  ticks: 500,
} as confetti.Options

export const defaultFontSizeConfig = {
  foreignFont: 48,
  translateFont: 18,
}
