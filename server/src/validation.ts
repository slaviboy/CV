/**
 * Contact form validation — the single source of truth for both sides.
 *
 * The API uses it to validate every request (authoritative), and the Vue frontend imports the
 * same module to give instant feedback. It is dependency-free so it runs anywhere.
 */

export interface ContactFormData {
  name: string
  email: string
  message: string
}

export type ContactField = keyof ContactFormData

export type ContactFormErrors = Partial<Record<ContactField, string>>

export const CONTACT_LIMITS = {
  name: 100,
  email: 254,
  message: 5000,
} as const satisfies Record<ContactField, number>

// Deliberately pragmatic: one "@", no whitespace, and a dot in the domain part.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Control characters (except tab/newline in the message) are never legitimate here and
// would allow header-style injection into the notification email subject.
function hasControlCharacters(value: string, allowLineBreaks: boolean): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0)
    if (code >= 32 && code !== 127) continue
    if (allowLineBreaks && (char === '\n' || char === '\r' || char === '\t')) continue
    return true
  }
  return false
}

export function isValidEmail(value: string): boolean {
  return value.length <= CONTACT_LIMITS.email && EMAIL_PATTERN.test(value)
}

/** Coerce unknown input (e.g. a parsed JSON body) into trimmed strings. */
export function normalizeContactForm(input: unknown): ContactFormData {
  const source =
    typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
  const read = (key: ContactField) => (typeof source[key] === 'string' ? source[key].trim() : '')

  return {
    name: read('name'),
    email: read('email'),
    message: read('message'),
  }
}

export function validateContactField(field: ContactField, value: string): string | undefined {
  const trimmed = value.trim()

  switch (field) {
    case 'name':
      if (!trimmed) return 'Please enter your name.'
      if (trimmed.length > CONTACT_LIMITS.name)
        return `Name must be at most ${CONTACT_LIMITS.name} characters.`
      if (hasControlCharacters(trimmed, false)) return 'Name contains invalid characters.'
      return undefined

    case 'email':
      if (!trimmed) return 'Please enter your email address.'
      if (!isValidEmail(trimmed)) return 'Please enter a valid email address.'
      return undefined

    case 'message':
      if (!trimmed) return 'Please enter a message.'
      if (trimmed.length > CONTACT_LIMITS.message)
        return `Message must be at most ${CONTACT_LIMITS.message} characters.`
      if (hasControlCharacters(trimmed, true)) return 'Message contains invalid characters.'
      return undefined
  }
}

export function validateContactForm(data: ContactFormData): ContactFormErrors {
  const errors: ContactFormErrors = {}
  for (const field of ['name', 'email', 'message'] as const) {
    const error = validateContactField(field, data[field])
    if (error) errors[field] = error
  }
  return errors
}

export function hasErrors(errors: ContactFormErrors): boolean {
  return Object.keys(errors).length > 0
}
