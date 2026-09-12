import { describe, expect, it } from 'vitest'

import {
  CONTACT_LIMITS,
  isValidEmail,
  normalizeContactForm,
  validateContactField,
  validateContactForm,
} from './validation.js'

describe('normalizeContactForm', () => {
  it('trims strings and ignores unknown or non-string values', () => {
    expect(
      normalizeContactForm({ name: '  Ada ', email: 42, message: ' Hi \n', extra: 'x' }),
    ).toEqual({ name: 'Ada', email: '', message: 'Hi' })
  })

  it('handles non-object input', () => {
    expect(normalizeContactForm(null)).toEqual({ name: '', email: '', message: '' })
    expect(normalizeContactForm('text')).toEqual({ name: '', email: '', message: '' })
  })
})

describe('isValidEmail', () => {
  it.each(['ada@example.com', 'first.last+tag@sub.example.co.uk'])('accepts %s', (email) => {
    expect(isValidEmail(email)).toBe(true)
  })

  it.each(['', 'ada', 'ada@', '@example.com', 'ada@example', 'ada @example.com', 'a@b.c'])(
    'rejects %s',
    (email) => {
      expect(isValidEmail(email)).toBe(false)
    },
  )
})

describe('validateContactForm', () => {
  it('passes a valid form', () => {
    expect(
      validateContactForm({ name: 'Ada', email: 'ada@example.com', message: 'Hello!' }),
    ).toEqual({})
  })

  it('requires every field', () => {
    const errors = validateContactForm({ name: ' ', email: '', message: '' })
    expect(errors).toEqual({
      name: 'Please enter your name.',
      email: 'Please enter your email address.',
      message: 'Please enter a message.',
    })
  })

  it('enforces length limits', () => {
    expect(validateContactField('name', 'x'.repeat(CONTACT_LIMITS.name + 1))).toMatch(/at most/)
    expect(validateContactField('message', 'x'.repeat(CONTACT_LIMITS.message + 1))).toMatch(
      /at most/,
    )
  })

  it('rejects control characters but allows line breaks in the message', () => {
    expect(validateContactField('name', 'Ada\r\nBcc: x@y.z')).toMatch(/invalid characters/)
    expect(validateContactField('message', 'Line one\nLine two\r\n\tIndented')).toBeUndefined()
    expect(validateContactField('message', `Bell ${String.fromCharCode(7)}`)).toMatch(
      /invalid characters/,
    )
  })
})
