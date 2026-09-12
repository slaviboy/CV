// The contact form shape and validation rules are shared with the API so they can never drift.
export type { ContactField, ContactFormData, ContactFormErrors } from '../../server/src/validation'

export type ContactStatus = 'idle' | 'sending' | 'success' | 'error'

/** JSON body returned by the contact API. */
export interface ContactApiResponse {
  ok: boolean
  error?: {
    code: 'validation' | 'rate_limited' | 'forbidden' | 'bad_request' | 'server_error'
    message: string
  }
  fields?: Partial<Record<'name' | 'email' | 'message', string>>
}
