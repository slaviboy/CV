import { describe, expect, it } from 'vitest'

import { portfolio } from '../data/portfolio'
import { sections } from '../data/sections'

const ISO_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

function allProjects() {
  return [...portfolio.projects, ...portfolio.aiDevelopment.projects]
}

function allUrls(): string[] {
  return [
    ...portfolio.socials.map((social) => social.url),
    ...allProjects().flatMap((project) => project.links.map((link) => link.url)),
    ...portfolio.openSource.flatMap((repo) => [repo.url, repo.homepage ?? repo.url]),
  ]
}

describe('portfolio data', () => {
  it('has the core profile information', () => {
    expect(portfolio.profile.name).toBe('Stanislav Georgiev')
    expect(portfolio.profile.title).toBe('Android Developer')
    expect(portfolio.profile.email).toBe('slavi94slavi94@gmail.com')
  })

  it('uses unique project ids', () => {
    const ids = allProjects().map((project) => project.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('only links to absolute https URLs', () => {
    for (const url of allUrls()) {
      expect(new URL(url).protocol).toBe('https:')
    }
  })

  it('gives every project screenshot descriptive alt text and dimensions', () => {
    for (const project of allProjects()) {
      if (!project.image) continue
      expect(project.image.alt.length).toBeGreaterThan(10)
      expect(project.image.width).toBeGreaterThan(0)
      expect(project.image.height).toBeGreaterThan(0)
    }
  })

  it('uses ISO year-month dates', () => {
    for (const item of portfolio.education) {
      expect(item.start).toMatch(ISO_MONTH)
      expect(item.end).toMatch(ISO_MONTH)
      expect(item.start < item.end).toBe(true)
    }
    for (const job of portfolio.experience) {
      expect(job.start).toMatch(ISO_MONTH)
      expect(job.end ?? job.start).toMatch(ISO_MONTH)
    }
  })

  it('only lists sections that have content', () => {
    const ids = sections.map((section) => section.id)
    expect(ids.includes('experience')).toBe(portfolio.experience.length > 0)
    expect(ids.includes('ai')).toBe(portfolio.aiDevelopment.projects.length > 0)
    expect(ids).toContain('projects')
    expect(ids).toContain('contact')
  })
})
