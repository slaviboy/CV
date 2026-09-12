<script setup lang="ts">
import { ref } from 'vue'
import { Check, CircleAlert, CircleCheck, Copy, LoaderCircle, Send } from '@lucide/vue'

import BrandIcon from '@/components/icons/BrandIcon.vue'
import SectionHeading from '@/components/SectionHeading.vue'
import { useContactForm } from '@/composables/useContactForm'
import { portfolio } from '@/data/portfolio'
import { vReveal } from '@/directives/reveal'
import { CONTACT_LIMITS } from '../../server/src/validation'
import type { SocialLink } from '@/types/portfolio'

const { profile, socials } = portfolio

const channels: SocialLink[] = [
  { platform: 'email', label: 'Email', url: `mailto:${profile.email}`, handle: profile.email },
  ...socials.filter((social) => social.platform !== 'google-play'),
]

const { form, honeypot, errors, touched, status, statusMessage, touch, onInput, submit } =
  useContactForm({ fallbackEmail: profile.email })

async function onSubmit() {
  const invalidFields = await submit()
  const first = invalidFields[0]
  if (first) document.getElementById(`contact-${first}`)?.focus()
}

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copyEmail() {
  try {
    await navigator.clipboard.writeText(profile.email)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied.value = false), 2000)
  } catch {
    window.location.href = `mailto:${profile.email}`
  }
}

const showError = (field: 'name' | 'email' | 'message') => Boolean(touched[field] && errors[field])
</script>

<template>
  <section id="contact" class="section" aria-labelledby="contact-title">
    <div class="container-page">
      <SectionHeading
        id="contact-title"
        eyebrow="Contact"
        title="Let's talk"
        description="Have a question, an opportunity or a project in mind? Send me a message and I'll get back to you."
      />

      <div class="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div v-reveal class="space-y-3">
          <h3 class="sr-only">Direct channels</h3>
          <ul class="space-y-3">
            <li v-for="channel in channels" :key="channel.platform">
              <div
                class="card flex items-center gap-4 p-4 transition-colors hover:border-accent-line"
              >
                <!-- The icon is dropped on very narrow screens so the full email address fits. -->
                <span
                  class="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent min-[360px]:flex"
                  aria-hidden="true"
                >
                  <BrandIcon :platform="channel.platform" />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-muted">{{ channel.label }}</p>
                  <a
                    :href="channel.url"
                    :target="channel.platform === 'email' ? undefined : '_blank'"
                    :rel="channel.platform === 'email' ? undefined : 'noopener noreferrer'"
                    class="block truncate text-sm font-medium text-fg transition-colors hover:text-accent min-[400px]:text-base"
                  >
                    {{ channel.handle }}
                    <span v-if="channel.platform !== 'email'" class="sr-only">
                      on {{ channel.label }} (opens in a new tab)</span
                    >
                  </a>
                </div>
                <button
                  v-if="channel.platform === 'email'"
                  type="button"
                  class="icon-btn shrink-0"
                  :aria-label="copied ? 'Email address copied' : 'Copy email address'"
                  :title="copied ? 'Copied!' : 'Copy email address'"
                  @click="copyEmail"
                >
                  <Check v-if="copied" :size="18" class="text-accent" aria-hidden="true" />
                  <Copy v-else :size="18" aria-hidden="true" />
                </button>
              </div>
            </li>
          </ul>
          <p class="sr-only" aria-live="polite">
            {{ copied ? 'Email address copied to clipboard' : '' }}
          </p>
        </div>

        <div v-reveal="100" class="card p-6 sm:p-8">
          <h3 class="text-lg font-semibold text-fg">Send a message</h3>
          <p id="contact-form-hint" class="mt-1 text-sm text-muted">All fields are required.</p>

          <form
            class="mt-6 space-y-5"
            novalidate
            aria-describedby="contact-form-hint"
            @submit.prevent="onSubmit"
          >
            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <label for="contact-name" class="field-label">Name</label>
                <input
                  id="contact-name"
                  v-model="form.name"
                  type="text"
                  name="name"
                  autocomplete="name"
                  required
                  :maxlength="CONTACT_LIMITS.name"
                  class="field-input"
                  placeholder="Your name"
                  :aria-invalid="showError('name') || undefined"
                  :aria-describedby="showError('name') ? 'contact-name-error' : undefined"
                  @blur="touch('name')"
                  @input="onInput('name')"
                />
                <p v-if="showError('name')" id="contact-name-error" class="field-error">
                  <CircleAlert :size="14" aria-hidden="true" />{{ errors.name }}
                </p>
              </div>

              <div>
                <label for="contact-email" class="field-label">Email</label>
                <input
                  id="contact-email"
                  v-model="form.email"
                  type="email"
                  name="email"
                  autocomplete="email"
                  inputmode="email"
                  required
                  :maxlength="CONTACT_LIMITS.email"
                  class="field-input"
                  placeholder="you@example.com"
                  :aria-invalid="showError('email') || undefined"
                  :aria-describedby="showError('email') ? 'contact-email-error' : undefined"
                  @blur="touch('email')"
                  @input="onInput('email')"
                />
                <p v-if="showError('email')" id="contact-email-error" class="field-error">
                  <CircleAlert :size="14" aria-hidden="true" />{{ errors.email }}
                </p>
              </div>
            </div>

            <div>
              <div class="flex items-baseline justify-between">
                <label for="contact-message" class="field-label">Message</label>
                <span class="font-mono text-xs text-subtle" aria-hidden="true">
                  {{ form.message.length }}/{{ CONTACT_LIMITS.message }}
                </span>
              </div>
              <textarea
                id="contact-message"
                v-model="form.message"
                name="message"
                rows="6"
                required
                :maxlength="CONTACT_LIMITS.message"
                class="field-input min-h-36 resize-y"
                placeholder="How can I help?"
                :aria-invalid="showError('message') || undefined"
                :aria-describedby="showError('message') ? 'contact-message-error' : undefined"
                @blur="touch('message')"
                @input="onInput('message')"
              />
              <p v-if="showError('message')" id="contact-message-error" class="field-error">
                <CircleAlert :size="14" aria-hidden="true" />{{ errors.message }}
              </p>
            </div>

            <!-- Honeypot: hidden from people and assistive tech; bots tend to fill it in. -->
            <div class="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
              <label for="contact-website">Website</label>
              <input
                id="contact-website"
                v-model="honeypot"
                type="text"
                name="website"
                tabindex="-1"
                autocomplete="off"
              />
            </div>

            <div
              class="flex flex-col-reverse gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between"
            >
              <p class="text-xs text-subtle">
                Your details are only used to reply to your message.
              </p>
              <button
                type="submit"
                class="btn btn-primary w-full px-6 sm:w-auto"
                :disabled="status === 'sending'"
                :aria-busy="status === 'sending'"
              >
                <LoaderCircle
                  v-if="status === 'sending'"
                  :size="16"
                  class="animate-spin"
                  aria-hidden="true"
                />
                <Send v-else :size="16" aria-hidden="true" />
                {{ status === 'sending' ? 'Sending…' : 'Send message' }}
              </button>
            </div>

            <!-- Live regions: success is announced politely, failures assertively. -->
            <div role="status" aria-live="polite">
              <p
                v-if="status === 'success'"
                class="flex items-start gap-3 rounded-xl border border-accent-line bg-accent-soft px-4 py-3 text-sm text-fg"
              >
                <CircleCheck :size="18" class="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                {{ statusMessage }}
              </p>
            </div>
            <div role="alert">
              <p
                v-if="status === 'error'"
                class="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-fg"
              >
                <CircleAlert :size="18" class="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
                {{ statusMessage }}
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>
