/**
 * Portfolio content — the only file you need to edit to update the site.
 *
 * Sources (kept faithful to the original CV — nothing here is invented):
 *   [site]   https://slaviboy.github.io/CV/ (HTML + assets/json/en.json)
 *   [pdf]    https://slaviboy.github.io/CV/assets/pdf/CV_EN.pdf
 *   [github] https://github.com/slaviboy (public repositories / READMEs linked from the CV)
 *   [play]   Google Play listings linked from the CV
 *
 * Several apps linked from the original CV are no longer available on Google Play (their store
 * pages return 404), so no store link is shown for them.
 */
import type { Portfolio } from '@/types/portfolio'

import lowPolyArtDark from '@/assets/images/projects/low-poly-art-dark.webp'
import lowPolyArtLight from '@/assets/images/projects/low-poly-art-light.webp'
import weatherDark from '@/assets/images/projects/weather-dark.webp'
import weatherLight from '@/assets/images/projects/weather-light.webp'
import dictionaryDark from '@/assets/images/projects/universal-dictionary-dark.webp'
import dictionaryLight from '@/assets/images/projects/universal-dictionary-light.webp'
import chromataDark from '@/assets/images/projects/chromata-dark.webp'
import chromataLight from '@/assets/images/projects/chromata-light.webp'
import musicVisualizerDark from '@/assets/images/projects/music-visualizer-dark.webp'
import musicVisualizerLight from '@/assets/images/projects/music-visualizer-light.webp'
import galaxyDark from '@/assets/images/projects/galaxy-simulator-dark.webp'
import galaxyLight from '@/assets/images/projects/galaxy-simulator-light.webp'
import pianoDark from '@/assets/images/projects/virtual-piano-dark.webp'
import pianoLight from '@/assets/images/projects/virtual-piano-light.webp'
import xDesignImage from '@/assets/images/ai/xdesign.webp'
import galaxyCollisionImage from '@/assets/images/ai/galaxy-collision.webp'
import fluidSimulationImage from '@/assets/images/ai/fluid-simulation.webp'
import drumPadMachineImage from '@/assets/images/ai/drum-pad-machine.webp'

const SCREENSHOT = { width: 640, height: 420 } as const
const AI_SCREENSHOT = { width: 1120, height: 735 } as const

export const SITE_URL = 'https://slaviboy.github.io/CV/'

export const portfolio: Portfolio = {
  profile: {
    name: 'Stanislav Georgiev', // [site]
    nickname: 'slaviboy', // [site]
    title: 'Android Developer', // [site] [pdf]
    greeting: "Hello, I'm", // [site]
    location: 'Blagoevgrad, Bulgaria', // [pdf] [github]
    email: 'slavi94slavi94@gmail.com', // [site] [pdf]
    // [site] about_description, lightly edited for flow.
    intro:
      'Android developer working mainly with Kotlin. I love creating complex Android Views and Composables and combining them into fully functional apps.',
    about: [
      // [site] about_description
      "I'm a highly motivated Android developer working mainly with Kotlin. I love creating complex custom Android Views and Jetpack Compose composables — and combining them into fully functional apps.",
      // [pdf] Android related skills
      'I care about solid application architecture (MVVM, MVI, MVP, MVC), dependency injection with Hilt, and reactive state with Coroutines and Flow. I also share reusable Android libraries on GitHub and JitPack.',
    ],
    focus: ['Kotlin', 'Jetpack Compose', 'Coroutines', 'Hilt'], // [pdf] [site]
    spokenLanguages: ['Bulgarian', 'English'], // [pdf]
    cvPdfPath: 'cv/Stanislav-Georgiev-CV.pdf', // [site] "Download CV"
  },

  socials: [
    { platform: 'github', label: 'GitHub', url: 'https://github.com/slaviboy', handle: 'slaviboy' },
    {
      platform: 'linkedin',
      label: 'LinkedIn',
      url: 'https://www.linkedin.com/in/slaviboy/',
      handle: 'in/slaviboy',
    },
    {
      platform: 'google-play',
      label: 'Google Play',
      url: 'https://play.google.com/store/apps/dev?id=6258983568190164698',
      handle: 'Developer page',
    },
  ],

  // [site] About section
  stats: [
    { value: '7+', label: 'Years of experience' },
    { value: '20+', label: 'Completed projects' },
  ],

  // [site] Skills section + en.json, [pdf] Programming languages / Android related skills.
  // Self-rated scores (x/10) differ between the site and the PDF, so they are intentionally omitted.
  skillGroups: [
    {
      title: 'Languages',
      icon: 'languages',
      skills: [
        { name: 'Kotlin' },
        { name: 'Java' },
        { name: 'JavaScript' },
        { name: 'C#' },
        { name: 'C++' },
      ],
    },
    {
      title: 'Android & UI',
      icon: 'android',
      skills: [
        { name: 'Jetpack Compose' },
        { name: 'Custom Views & Composables' },
        { name: 'OpenGL ES', detail: 'GLES 2.0 / 3.0' },
        { name: 'Android Services' },
      ],
    },
    {
      title: 'Architecture & DI',
      icon: 'architecture',
      skills: [
        { name: 'MVVM' },
        { name: 'MVI' },
        { name: 'MVP' },
        { name: 'MVC' },
        { name: 'Dagger 2' },
        { name: 'Hilt' },
      ],
    },
    {
      title: 'Concurrency & State',
      icon: 'concurrency',
      skills: [
        { name: 'Coroutines' },
        { name: 'Threads' },
        { name: 'Flow', detail: 'StateFlow, SharedFlow' },
        { name: 'LiveData' },
        { name: 'Process death & memory leaks' },
      ],
    },
    {
      title: 'Networking',
      icon: 'networking',
      skills: [
        { name: 'Retrofit' },
        { name: 'OkHttp' },
        { name: 'Volley' },
        { name: 'Moshi' },
        { name: 'Gson' },
        { name: 'XmlSerializer' },
      ],
    },
    {
      title: 'Data & Storage',
      icon: 'data',
      skills: [{ name: 'Room' }, { name: 'Realm' }, { name: 'Firebase' }, { name: 'MySQL' }],
    },
    {
      title: 'Testing',
      icon: 'testing',
      skills: [{ name: 'Unit tests' }, { name: 'UI tests' }, { name: 'End-to-end tests' }],
    },
    {
      title: 'Tools & Publishing',
      icon: 'tools',
      skills: [{ name: 'Git' }, { name: 'GitHub' }, { name: 'GitLab' }, { name: 'JitPack' }],
    },
  ],

  // The original CV does not list employment history. Add positions here and the
  // Experience section and navigation entry will appear automatically.
  experience: [],

  // [site] "Recent Works" — same projects, order and screenshots as the original CV.
  projects: [
    {
      id: 'low-poly-art',
      name: 'Low Poly Art',
      category: 'android',
      description:
        'Android app for turning photos into low-poly artwork, with an on-canvas editor toolbar for refining the result.',
      technologies: ['Android'],
      links: [],
      image: {
        src: lowPolyArtLight,
        darkSrc: lowPolyArtDark,
        alt: 'Low Poly Art app on a phone, showing a low-poly portrait with editing tools',
        ...SCREENSHOT,
      },
    },
    {
      id: 'weather',
      name: 'Weather',
      category: 'android',
      // [github] slaviboy/WeatherApp README, [play] "Weather App (DEMO)" listing
      description:
        'Weather app written in Kotlin with Jetpack Compose. Fetches forecasts from the OpenWeather API, caches data with Room and searches cities from a bundled local database.',
      technologies: ['Kotlin', 'Jetpack Compose', 'MVVM', 'Hilt', 'Retrofit', 'Room'],
      links: [
        {
          kind: 'store',
          label: 'Google Play',
          url: 'https://play.google.com/store/apps/details?id=com.slaviboy.weather',
        },
        { kind: 'source', label: 'Source', url: 'https://github.com/slaviboy/WeatherApp' },
        { kind: 'video', label: 'Video demo', url: 'https://www.youtube.com/watch?v=O0efgKq0xOI' },
      ],
      image: {
        src: weatherLight,
        darkSrc: weatherDark,
        alt: 'Weather app on a phone, showing the current temperature on a circular dial',
        ...SCREENSHOT,
      },
    },
    {
      id: 'universal-dictionary',
      name: 'Universal Dictionary',
      category: 'android',
      // [play] Universal Dictionary BG listing
      description:
        'Universal Bulgarian dictionary for looking up the meaning of words in the Bulgarian language, including synonyms and common mistakes. Published on Google Play as a demo.',
      technologies: ['Android'],
      links: [
        {
          kind: 'store',
          label: 'Google Play',
          url: 'https://play.google.com/store/apps/details?id=com.slaviboy.universaldictionarybg',
        },
      ],
      image: {
        src: dictionaryLight,
        darkSrc: dictionaryDark,
        alt: 'Universal Dictionary app on a phone, showing Bulgarian word search results',
        ...SCREENSHOT,
      },
    },
    {
      id: 'chromata',
      name: 'Chromata',
      category: 'android',
      description: 'Color blindness test app for Android.',
      technologies: ['Android'],
      links: [],
      image: {
        src: chromataLight,
        darkSrc: chromataDark,
        alt: 'Chromata color blindness test app on a phone, showing a color wheel start screen',
        ...SCREENSHOT,
      },
    },
    {
      id: 'music-visualizer',
      name: 'Music Visualizer',
      category: 'android',
      description:
        'Android music visualizer that renders an animated, circular frequency spectrum around a central emblem.',
      technologies: ['Android'],
      links: [],
      image: {
        src: musicVisualizerLight,
        darkSrc: musicVisualizerDark,
        alt: 'Music Visualizer app on a phone, showing a circular audio spectrum',
        ...SCREENSHOT,
      },
    },
    {
      id: 'galaxy-simulator',
      name: 'Galaxy Simulator',
      category: 'android',
      // [github] slaviboy/Galaxy README — "Sample code from Galaxy app. Kotlin, OpenGL"
      description:
        'Interactive galaxy simulation for Android rendered with OpenGL. Sample code from the app is available on GitHub.',
      technologies: ['Kotlin', 'OpenGL'],
      links: [{ kind: 'source', label: 'Sample code', url: 'https://github.com/slaviboy/Galaxy' }],
      image: {
        src: galaxyLight,
        darkSrc: galaxyDark,
        alt: 'Galaxy Simulator app on a phone, showing a glowing spiral galaxy',
        ...SCREENSHOT,
      },
    },
    {
      id: 'virtual-piano',
      name: 'Virtual Piano',
      category: 'web',
      // [github] slaviboy/VirtualPiano README
      description:
        'Playable virtual grand piano in the browser, built with HTML5. Originally created in 2016.',
      technologies: ['HTML5', 'JavaScript'],
      links: [
        { kind: 'demo', label: 'Live demo', url: 'https://slaviboy.github.io/VirtualPiano/' },
        { kind: 'source', label: 'Source', url: 'https://github.com/slaviboy/VirtualPiano' },
      ],
      image: {
        src: pianoLight,
        darkSrc: pianoDark,
        alt: 'Virtual Piano web app showing a grand piano on a stage under a spotlight',
        ...SCREENSHOT,
      },
    },
  ],

  // Projects built with AI-assisted development using Claude (added at the owner's request).
  // Descriptions and technologies come from each repository's README.
  aiDevelopment: {
    intro:
      'Claude has become part of my development workflow. These recent projects were built with AI-assisted development using Claude — spanning native Android, GPU physics simulations and a full vector design editor for the web.',
    projects: [
      {
        id: 'xdesign',
        name: 'XDesign',
        category: 'web',
        description:
          "Offline-first vector design editor for the web, modelled on Adobe XD's Design workspace — shapes, a full pen tool with cubic Béziers, text, artboards and direct point editing. No account, server or telemetry.",
        technologies: ['TypeScript', 'SVG', 'Vector graphics'],
        links: [
          { kind: 'demo', label: 'Live demo', url: 'https://slaviboy.github.io/XDesign/' },
          { kind: 'source', label: 'Source', url: 'https://github.com/slaviboy/XDesign' },
        ],
        image: {
          src: xDesignImage,
          alt: 'XDesign editor with a rectangle, ellipse, triangle and pen path on an artboard, and the property inspector open',
          ...AI_SCREENSHOT,
        },
      },
      {
        id: 'galaxy-collision-web',
        name: 'Galaxy Collision',
        category: 'web',
        description:
          'Barnes-Hut n-body simulation of two colliding galaxies, ported from a C++ simulator to TypeScript and WebGL2, with live controls for star counts, black-hole masses and the Barnes-Hut θ.',
        technologies: ['TypeScript', 'WebGL2', 'N-body simulation'],
        links: [
          {
            kind: 'demo',
            label: 'Live demo',
            url: 'https://slaviboy.github.io/Galaxy-Collision-Web/',
          },
          {
            kind: 'source',
            label: 'Source',
            url: 'https://github.com/slaviboy/Galaxy-Collision-Web',
          },
        ],
        image: {
          src: galaxyCollisionImage,
          alt: 'Galaxy Collision simulation showing a glowing galaxy merger next to simulation and display controls',
          ...AI_SCREENSHOT,
        },
      },
      {
        id: 'fluid-simulation-android',
        name: 'Fluid Simulation',
        category: 'android',
        description:
          'Touch-driven fluid simulation that solves the incompressible Navier–Stokes equations on the GPU every frame in OpenGL ES 3.0 shaders — with bloom, sunrays and a live Jetpack Compose settings screen.',
        technologies: ['Kotlin', 'OpenGL ES 3.0', 'GLSL', 'Jetpack Compose'],
        links: [
          {
            kind: 'source',
            label: 'Source',
            url: 'https://github.com/slaviboy/FluidSimulation-Android',
          },
        ],
        image: {
          src: fluidSimulationImage,
          alt: 'Fluid Simulation on two phones: colourful swirling dye on one, the simulation settings screen on the other',
          ...AI_SCREENSHOT,
        },
      },
      {
        id: 'drum-pad-machine',
        name: 'DrumPadMachine',
        category: 'android',
        description:
          "Native Android drum pad and sampler with low-latency multi-touch pads powered by Google's Oboe C++ audio engine over JNI, sound-pack browsing, and tap-along lessons that score your timing.",
        technologies: ['Kotlin', 'Jetpack Compose', 'C++ / Oboe', 'Hilt', 'Room'],
        links: [
          { kind: 'source', label: 'Source', url: 'https://github.com/slaviboy/DrumPadMachine' },
        ],
        image: {
          src: drumPadMachineImage,
          alt: 'DrumPadMachine on two phones: the sound-pack home screen and a colourful drum pad grid',
          ...AI_SCREENSHOT,
        },
      },
    ],
  },

  // [github] A selection of public libraries from the GitHub profile linked in the CV,
  // supporting the CV skill "Support library features and concepts (GitHub & JitPack)".
  // Descriptions are taken from each repository.
  openSource: [
    {
      name: 'InfiniteGridView',
      description: 'Create an infinite grid in Android in the simplest way possible.',
      language: 'Kotlin',
      url: 'https://github.com/slaviboy/InfiniteGridView',
    },
    {
      name: 'OpenGL',
      description:
        'Create OpenGL shapes and apply OpenGL transformations using finger gestures with GLES 2.0.',
      language: 'Kotlin',
      url: 'https://github.com/slaviboy/OpenGL',
    },
    {
      name: 'IconsCompose',
      description: '5,540+ free icons for Jetpack Compose.',
      language: 'Kotlin',
      url: 'https://github.com/slaviboy/IconsCompose',
      homepage: 'https://slaviboy.github.io/Compose-Icons-Site/',
    },
    {
      name: 'ColorPickerCompose',
      description: 'Color pickers for Jetpack Compose.',
      language: 'Kotlin',
      url: 'https://github.com/slaviboy/ColorPickerCompose',
    },
    {
      name: 'DelaunatorKotlin',
      description: 'Generate Delaunay triangulation in the simplest way possible.',
      language: 'Kotlin',
      url: 'https://github.com/slaviboy/DelaunatorKotlin',
      homepage: 'https://slaviboy.github.io/DelaunatorKotlin/',
    },
    {
      name: 'ProgressBar',
      description: 'Simple library for creating striped progress bars, written in Kotlin.',
      language: 'Kotlin',
      url: 'https://github.com/slaviboy/ProgressBar',
    },
  ],

  // [pdf] Education
  education: [
    {
      degree: 'Computer Science',
      institution: 'South-West University "Neofit Rilski"',
      location: 'Blagoevgrad',
      start: '2013-08',
      end: '2017-09',
      kind: 'university',
    },
    {
      degree: 'Math and Science High School',
      institution: 'PMG "Akad. Sergei Pavlovich Korolev"',
      location: 'Blagoevgrad',
      start: '2008-09',
      end: '2013-05',
      kind: 'school',
    },
  ],

  // The original CV lists no certifications. Entries added here render under Education.
  certifications: [],
}
