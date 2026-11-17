import { describe, expect, it } from 'vitest'
import { bulkLabelChanges, commonLabels, undoLabelChanges } from '../src/lib/bulkLabels'

const notes = () => [
  { id: 'a', labels: ['x', 'y'] },
  { id: 'b', labels: ['y'] },
  { id: 'c', labels: ['y', 'z'] },
]

describe('commonLabels', () => {
  it('is empty for no notes', () => {
    expect(commonLabels([])).toEqual([])
  })
  it('keeps only labels on every note', () => {
    expect(commonLabels(notes())).toEqual(['y'])
    expect(commonLabels([{ id: 'a', labels: ['x'] }, { id: 'b', labels: [] }])).toEqual([])
  })
})

describe('bulkLabelChanges', () => {
  it('adds to notes that lack the label, keeping the old labels as previous', () => {
    expect(bulkLabelChanges(notes(), 'x', true)).toEqual([
      { id: 'b', labels: ['y', 'x'], previous: ['y'] },
      { id: 'c', labels: ['y', 'z', 'x'], previous: ['y', 'z'] },
    ])
  })
  it('removes only from notes that have it', () => {
    expect(bulkLabelChanges(notes(), 'z', false)).toEqual([{ id: 'c', labels: ['y'], previous: ['y', 'z'] }])
    expect(bulkLabelChanges(notes(), 'none', false)).toEqual([])
  })
  it('does not mutate the input, and previous restores the originals', () => {
    const input = notes()
    const changes = bulkLabelChanges(input, 'x', true)
    expect(input).toEqual(notes())
    const restored = input.map((n) => ({ ...n, labels: changes.find((c) => c.id === n.id)?.previous ?? n.labels }))
    expect(restored).toEqual(notes())
  })
})

describe('undoLabelChanges', () => {
  const byId = (list: { id: string; labels: string[] }[]) => (id: string) => list.find((n) => n.id === id)
  const apply = (list: { id: string; labels: string[] }[], changes: { id: string; labels: string[] }[]) =>
    list.map((n) => ({ ...n, labels: changes.find((c) => c.id === n.id)?.labels ?? n.labels }))

  it('restores the exact previous labels of untouched notes, for add and remove', () => {
    for (const [label, add] of [['x', true], ['y', false]] as const) {
      const changes = bulkLabelChanges(notes(), label, add)
      const after = apply(notes(), changes)
      expect(apply(after, undoLabelChanges(changes, byId(after), label, add))).toEqual(notes())
    }
  })
  it('keeps labels changed after the batch and skips notes that are gone', () => {
    const first = bulkLabelChanges(notes(), 'x', true)
    const mid = apply(notes(), first)
    const later = apply(mid, bulkLabelChanges(mid, 'w', true)).filter((n) => n.id !== 'c')
    const undone = apply(later, undoLabelChanges(first, byId(later), 'x', true))
    expect(undone).toEqual([
      { id: 'a', labels: ['x', 'y', 'w'] },
      { id: 'b', labels: ['y', 'w'] },
    ])
  })
})
