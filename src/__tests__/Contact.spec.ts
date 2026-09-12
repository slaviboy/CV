import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import Contact from '../components/Contact.vue'
import { CONTACT_SUCCESS_MESSAGE } from '../composables/useContactForm'

const API_URL = 'https://api.example.com/api/contact'

function mountContact() {
  return mount(Contact, { attachTo: document.body })
}

async function fillValidForm(wrapper: ReturnType<typeof mountContact>) {
  await wrapper.get('#contact-name').setValue('Ada Lovelace')
  await wrapper.get('#contact-email').setValue('ada@example.com')
  await wrapper.get('#contact-message').setValue('Hello, I would like to talk about a project.')
}

describe('Contact form', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_CONTACT_API_URL', API_URL)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('shows validation errors, marks fields invalid and focuses the first one', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mountContact()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Please enter your name.')
    expect(wrapper.text()).toContain('Please enter your email address.')
    expect(wrapper.text()).toContain('Please enter a message.')
    expect(wrapper.get('#contact-name').attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('#contact-name').attributes('aria-describedby')).toBe('contact-name-error')
    expect(document.activeElement?.id).toBe('contact-name')
    expect(fetchMock).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('validates the email format on blur', async () => {
    const wrapper = mountContact()

    const email = wrapper.get('#contact-email')
    await email.setValue('not-an-email')
    await email.trigger('blur')

    expect(wrapper.text()).toContain('Please enter a valid email address.')

    await email.setValue('ada@example.com')
    expect(wrapper.text()).not.toContain('Please enter a valid email address.')
    wrapper.unmount()
  })

  it('sends the message and shows the success confirmation', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mountContact()

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('button[type="submit"]').text()).toContain('Sending…')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(API_URL)
    expect(JSON.parse(String(init.body))).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello, I would like to talk about a project.',
      website: '',
    })
    expect(wrapper.get('[role="status"]').text()).toBe(CONTACT_SUCCESS_MESSAGE)
    expect((wrapper.get('#contact-name').element as HTMLInputElement).value).toBe('')
    wrapper.unmount()
  })

  it('shows field errors returned by the server', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: { code: 'validation', message: 'Invalid' },
            fields: { email: 'Please enter a valid email address.' },
          }),
          { status: 422 },
        ),
      ),
    )
    const wrapper = mountContact()

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('#contact-email-error').text()).toContain('valid email address')
    wrapper.unmount()
  })

  it('shows an error with a fallback when sending fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')),
    )
    const wrapper = mountContact()

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const alert = wrapper.get('[role="alert"]').text()
    expect(alert).toContain("Couldn't reach the server")
    expect(alert).toContain('slavi94slavi94@gmail.com')
    // The message is kept so the visitor doesn't lose it.
    expect((wrapper.get('#contact-message').element as HTMLTextAreaElement).value).not.toBe('')
    wrapper.unmount()
  })

  it('explains the rate limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ ok: false, error: { code: 'rate_limited', message: 'Slow down.' } }),
            { status: 429 },
          ),
        ),
    )
    const wrapper = mountContact()

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Slow down.')
    wrapper.unmount()
  })

  it('falls back to the email address when no API is configured', async () => {
    vi.stubEnv('VITE_CONTACT_API_URL', '')
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mountContact()

    await fillValidForm(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('email me directly')
    wrapper.unmount()
  })
})
