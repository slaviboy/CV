/**
 * Content model for the portfolio. All content lives in `src/data/portfolio.ts`;
 * components only render what these types describe.
 */

export type SocialPlatform = 'github' | 'linkedin' | 'google-play' | 'email'

export interface SocialLink {
  platform: SocialPlatform
  label: string
  url: string
  /** Short handle or address shown next to the icon, e.g. "slaviboy". */
  handle: string
}

export interface Profile {
  name: string
  /** Handle used as the wordmark in the navigation. */
  nickname: string
  title: string
  greeting: string
  location: string
  email: string
  /** One or two sentences for the hero. */
  intro: string
  /** Paragraphs for the About section. */
  about: string[]
  /** A few core technologies highlighted in the hero. */
  focus: string[]
  spokenLanguages: string[]
  /** Path relative to Vite's `public/` directory. */
  cvPdfPath?: string
}

export interface Stat {
  value: string
  label: string
}

export type SkillCategoryIcon =
  | 'languages'
  | 'android'
  | 'architecture'
  | 'concurrency'
  | 'networking'
  | 'data'
  | 'testing'
  | 'tools'

export interface Skill {
  name: string
  /** Optional qualifier, e.g. "GLES 2.0 / 3.0". */
  detail?: string
}

export interface SkillGroup {
  title: string
  icon: SkillCategoryIcon
  skills: Skill[]
}

export interface Experience {
  role: string
  company: string
  companyUrl?: string
  location?: string
  /** ISO year-month, e.g. "2021-03". */
  start: string
  /** ISO year-month, or omit for a current position. */
  end?: string
  description: string
  highlights?: string[]
  technologies?: string[]
}

export type ProjectCategory = 'android' | 'web'

export type ProjectLinkKind = 'source' | 'demo' | 'store' | 'video'

export interface ProjectLink {
  kind: ProjectLinkKind
  label: string
  url: string
}

export interface ProjectImage {
  /** Default screenshot (used in the light theme, and in both themes if `darkSrc` is omitted). */
  src: string
  /** Optional variant shown in the dark theme. */
  darkSrc?: string
  alt: string
  width: number
  height: number
}

export interface Project {
  id: string
  name: string
  category: ProjectCategory
  description: string
  technologies: string[]
  links: ProjectLink[]
  image?: ProjectImage
}

export interface OpenSourceProject {
  name: string
  description: string
  language: string
  url: string
  homepage?: string
}

export interface Education {
  degree: string
  institution: string
  location: string
  /** ISO year-month. */
  start: string
  /** ISO year-month. */
  end: string
  kind: 'university' | 'school'
}

export interface Certification {
  name: string
  issuer: string
  /** ISO year-month. */
  date: string
  credentialUrl?: string
}

export interface AiDevelopment {
  /** Short introduction shown under the section heading. */
  intro: string
  projects: Project[]
}

export interface Portfolio {
  profile: Profile
  socials: SocialLink[]
  stats: Stat[]
  skillGroups: SkillGroup[]
  experience: Experience[]
  projects: Project[]
  aiDevelopment: AiDevelopment
  openSource: OpenSourceProject[]
  education: Education[]
  certifications: Certification[]
}
