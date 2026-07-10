import type { WordWithIndex } from '@/typings'
import { atom } from 'jotai'

/** 从训练页进入错题本时保存，用于返回后恢复章节练习进度 */
export type TypingResumeSnapshot = {
  chapter: number
  dictId: string
  index: number
  words: WordWithIndex[]
  isTyping: boolean
  isTransVisible: boolean
}

export type ErrorBookFilter = {
  dictId: string
  chapter: number
  resume: TypingResumeSnapshot
}

export const errorBookFilterAtom = atom<ErrorBookFilter | null>(null)

export const typingResumeAtom = atom<TypingResumeSnapshot | null>(null)
