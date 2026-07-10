import { TypingContext } from '@/pages/Typing/store'
import { currentChapterAtom, currentDictIdAtom, errorBookFilterAtom } from '@/store'
import type { TypingResumeSnapshot } from '@/store/errorBookFilterAtom'
import { recordErrorBookAction } from '@/utils'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import IconBook from '~icons/bxs/book'

const ErrorBookButton = () => {
  const navigate = useNavigate()
  const { state } = useContext(TypingContext) ?? {}
  const currentDictId = useAtomValue(currentDictIdAtom)
  const currentChapter = useAtomValue(currentChapterAtom)
  const setErrorBookFilter = useSetAtom(errorBookFilterAtom)

  const toErrorBook = useCallback(() => {
    if (state && currentChapter >= 0) {
      const resume: TypingResumeSnapshot = {
        chapter: currentChapter,
        dictId: currentDictId,
        index: state.chapterData.index,
        words: state.chapterData.words,
        isTyping: state.isTyping,
        isTransVisible: state.isTransVisible,
      }
      setErrorBookFilter({ dictId: currentDictId, chapter: currentChapter, resume })
    } else {
      setErrorBookFilter(null)
    }

    navigate('/error-book')
    recordErrorBookAction('open')
  }, [currentChapter, currentDictId, navigate, setErrorBookFilter, state])

  return (
    <button
      type="button"
      onClick={toErrorBook}
      className={`flex items-center justify-center rounded p-[2px] text-lg text-indigo-500 outline-none transition-colors duration-300 ease-in-out hover:bg-indigo-400 hover:text-white`}
      title="查看错题本"
    >
      <IconBook className="icon" />
    </button>
  )
}

export default ErrorBookButton
