import { splitWordListByLineAndComma } from './wordListSplit'
import { describe, expect, it } from 'vitest'

describe('splitWordListByLineAndComma', () => {
  it('keeps a single line without comma as one phrase', () => {
    expect(splitWordListByLineAndComma('take place')).toEqual(['take place'])
  })

  it('splits a line by commas', () => {
    expect(splitWordListByLineAndComma('abandon, abandon ship')).toEqual(['abandon', 'abandon ship'])
  })

  it('splits Chinese commas', () => {
    expect(splitWordListByLineAndComma('look after，take place')).toEqual(['look after', 'take place'])
  })

  it('splits multiple lines into separate entries', () => {
    expect(splitWordListByLineAndComma('take place\nlook after')).toEqual(['take place', 'look after'])
  })

  it('combines lines and comma splits', () => {
    expect(splitWordListByLineAndComma('a, b\nc d')).toEqual(['a', 'b', 'c d'])
  })

  it('skips empty lines and dedupes case-insensitively', () => {
    expect(splitWordListByLineAndComma('Foo\n\nfoo\nBar')).toEqual(['Foo', 'Bar'])
  })
})
