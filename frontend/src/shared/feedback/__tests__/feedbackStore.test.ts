import {afterEach, describe, expect, it} from 'vitest'
import {clearToasts, feedbackState, pushToast, removeToast} from '../feedbackStore'

describe('feedbackStore', () => {
  afterEach(() => clearToasts())

  it('pushes and removes toast messages', () => {
    const toastId = pushToast({level: 'error', title: 'Failed', detail: 'Connection lost'})

    expect(feedbackState.toasts).toHaveLength(1)
    expect(feedbackState.toasts[0]).toMatchObject({id: toastId, level: 'error', title: 'Failed', detail: 'Connection lost'})

    removeToast(toastId)

    expect(feedbackState.toasts).toHaveLength(0)
  })

  it('deduplicates toast messages by key during the cooldown window', () => {
    const firstToastId = pushToast({level: 'error', title: 'Failed', dedupeKey: 'same-error', cooldownMs: 5000})
    const secondToastId = pushToast({level: 'error', title: 'Failed again', dedupeKey: 'same-error', cooldownMs: 5000})

    expect(secondToastId).toBe(firstToastId)
    expect(feedbackState.toasts).toHaveLength(1)
    expect(feedbackState.toasts[0].title).toBe('Failed')
  })
})
