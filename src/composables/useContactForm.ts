import { reactive, ref } from 'vue'

import { hasErrors, validateContactField, validateContactForm } from '../../server/src/validation'
import type {
  ContactApiResponse,
  ContactField,
  ContactFormData,
  ContactFormErrors,
  ContactStatus,
} from '@/types/contact'

export const CONTACT_SUCCESS_MESSAGE =
  'Thanks for reaching out! Your message has been sent successfully.'

const FIELDS: ContactField[] = ['name', 'email', 'message']

interface UseContactFormOptions {
  /** Public API URL. Defaults to `VITE_CONTACT_API_URL`. */
  endpoint?: string
  /** Fallback address shown when the API is unavailable. */
  fallbackEmail: string
  timeoutMs?: number
}

export function useContactForm(options: UseContactFormOptions) {
  const endpoint = options.endpoint ?? import.meta.env.VITE_CONTACT_API_URL
  const timeoutMs = options.timeoutMs ?? 15_000

  const form = reactive<ContactFormData>({ name: '', email: '', message: '' })
  /** Honeypot — invisible to people, often auto-filled by bots. */
  const honeypot = ref('')
  const errors = reactive<ContactFormErrors>({})
  const touched = reactive<Partial<Record<ContactField, boolean>>>({})
  const status = ref<ContactStatus>('idle')
  const statusMessage = ref('')

  function validateField(field: ContactField) {
    const error = validateContactField(field, form[field])
    if (error) errors[field] = error
    else delete errors[field]
  }

  /** Called on blur: from now on the field shows live feedback. */
  function touch(field: ContactField) {
    touched[field] = true
    validateField(field)
  }

  /** Called on input: only re-validate fields the visitor has already interacted with. */
  function onInput(field: ContactField) {
    if (touched[field]) validateField(field)
    if (status.value === 'error' || status.value === 'success') {
      status.value = 'idle'
      statusMessage.value = ''
    }
  }

  function reset() {
    form.name = ''
    form.email = ''
    form.message = ''
    honeypot.value = ''
    for (const field of FIELDS) {
      delete errors[field]
      delete touched[field]
    }
  }

  function fail(message: string) {
    status.value = 'error'
    statusMessage.value = message
  }

  /**
   * Validates and sends the form. Returns the invalid fields (in form order) so the
   * component can move focus to the first one.
   */
  async function submit(): Promise<ContactField[]> {
    if (status.value === 'sending') return []

    const clientErrors = validateContactForm(form)
    for (const field of FIELDS) {
      touched[field] = true
      if (clientErrors[field]) errors[field] = clientErrors[field]
      else delete errors[field]
    }
    if (hasErrors(clientErrors)) {
      status.value = 'idle'
      statusMessage.value = ''
      return FIELDS.filter((field) => clientErrors[field])
    }

    if (!endpoint) {
      fail(
        `The contact form isn't available right now. Please email me directly at ${options.fallbackEmail}.`,
      )
      return []
    }

    status.value = 'sending'
    statusMessage.value = ''

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...form, website: honeypot.value }),
        signal: controller.signal,
      })
      const body = (await response.json().catch(() => null)) as ContactApiResponse | null

      if (response.ok && body?.ok) {
        reset()
        status.value = 'success'
        statusMessage.value = CONTACT_SUCCESS_MESSAGE
        return []
      }

      if (body?.fields && hasErrors(body.fields)) {
        Object.assign(errors, body.fields)
        status.value = 'idle'
        return FIELDS.filter((field) => body.fields?.[field])
      }

      if (response.status === 429) {
        fail(
          body?.error?.message ??
            "You've sent several messages in a short time. Please try again a bit later.",
        )
        return []
      }

      fail(
        `Sorry, your message couldn't be sent. Please try again, or email me directly at ${options.fallbackEmail}.`,
      )
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === 'AbortError'
      fail(
        timedOut
          ? `The request timed out. Please try again, or email me directly at ${options.fallbackEmail}.`
          : `Couldn't reach the server. Check your connection and try again, or email me directly at ${options.fallbackEmail}.`,
      )
    } finally {
      clearTimeout(timer)
    }

    return []
  }

  return { form, honeypot, errors, touched, status, statusMessage, touch, onInput, submit }
}
