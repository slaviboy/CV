import { portfolio } from './portfolio'

export interface SectionLink {
  id: string
  label: string
}

/**
 * Page sections in display order. Sections without content (e.g. no experience entries yet)
 * are left out, so the navigation never links to an empty section.
 */
export const sections: SectionLink[] = [
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  ...(portfolio.experience.length > 0 ? [{ id: 'experience', label: 'Experience' }] : []),
  { id: 'projects', label: 'Projects' },
  ...(portfolio.aiDevelopment.projects.length > 0 ? [{ id: 'ai', label: 'AI' }] : []),
  ...(portfolio.education.length > 0 || portfolio.certifications.length > 0
    ? [{ id: 'education', label: 'Education' }]
    : []),
  { id: 'contact', label: 'Contact' },
]
