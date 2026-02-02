# The Book Fair — Personas & Feature Prioritization

## Date: 2026-02-02

## Overview

10 user personas representing the range of visitors to The Book Fair, plus a WSJF-scored backlog of 42 features across infrastructure, new toys, and polish.

---

## Personas

### 1. Maya, 34 — "The Nostalgic Millennial"
Marketing manager. Grew up with AIM away messages and Scholastic Book Fairs. Finds the link on Twitter/X, immediately recognizes every toy. Spends 20 minutes feeding the Tamagotchi. Texts the link to her group chat. Wants to feel seen.

### 2. Jaden, 19 — "The Retro-Curious Gen Z"
College sophomore. Knows 90s culture through TikTok trends and Y2K fashion. Doesn't have firsthand memories but finds the aesthetic genuinely cool. Drawn to BadOS and PokeDOOM because they feel like discovering hidden internet lore. Shares screenshots on Discord.

### 3. Marcus, 38 — "The Tech Lead Hiring Manager"
Senior engineer at a mid-size startup. Reviewing the portfolio after seeing a GitHub profile. Clicks through 2-3 toys, inspects the source code. Cares about code quality, creativity, and follow-through. Spends maybe 5 minutes max.

### 4. Rachel, 29 — "The Design Twitter Person"
UX designer who curates a feed of interesting web experiences. Always looking for sites to feature in her "cool links" newsletter. Judges on visual polish, interaction quality, and whether it feels like a complete vision. Will either share it to 12k followers or close the tab in 30 seconds.

### 5. Carlos, 41 — "The Dad Showing His Kid"
Software engineer, sitting with his 8-year-old on the couch. Wants to show what games looked like when he was a kid. The kid needs things to be immediately tactile and obvious. Carlos wants shared moments. They'll try KidPix and Snake together.

### 6. Priya, 26 — "The Indie Web Enthusiast"
Front-end developer who follows the "small web" / craft web movement. Loves sites that reject corporate minimalism in favor of personality. Found The Book Fair through Hacker News or lobste.rs. Will dig into every corner, find the beanies, and write a blog post about it.

### 7. Tom, 52 — "The Conference Organizer"
Runs a regional tech meetup or conference. Looking for speakers who do interesting creative work. Stumbles onto the site and thinks "this person would give a great talk." Needs to quickly understand the scope and ambition. Skims more than plays.

### 8. Lena, 22 — "The Completionist"
College student who treats every interactive site like a game to 100%. Will methodically open every toy, find every beanie. Gets frustrated if she thinks she's missing something with no way to track progress. Wants a collection screen, hints, and a sense of completion. Will come back across multiple sessions.

### 9. Derek, 31 — "The 30-Second Bouncer"
Clicked a link on Slack during a work break. Zero patience. If the site doesn't immediately communicate what it is and give him something fun to click within seconds, he's gone. Represents the majority of traffic.

### 10. Sofia, 27 — "The Creative Director"
Works at an agency. Evaluating the work for a potential role. Less interested in code, more interested in taste, craft, and whether the project shows an ability to ship a cohesive vision. Notices details: consistent sound design, thoughtful animations, whether the whole thing feels intentional.

---

## WSJF Scoring Key

- **BV (Business Value):** Impact on the portfolio/showcase goal (1-10)
- **TC (Time Criticality):** Urgency; does delay reduce impact? (1-10)
- **RR (Risk Reduction):** Reduces uncertainty or prevents problems (1-10)
- **JS (Job Size):** Effort to implement, inverted (10 = trivial, 1 = massive)
- **WSJF = (BV + TC + RR) / JS** — higher = do first

---

## Feature Backlog — Infrastructure & Core

| Rank | Feature | Description | Personas | BV | TC | RR | JS | WSJF |
|------|---------|-------------|----------|----|----|----|----|------|
| 1 | OG Meta Tags & Social Preview | Open Graph/Twitter Card meta tags with preview image | 1,2,4,9 | 9 | 9 | 6 | 9 | 2.67 |
| 2 | Error Boundary | +error.svelte and per-toy try/catch wrappers | 3,6,7,10 | 6 | 7 | 10 | 9 | 2.56 |
| 3 | KidPix Screenshot/GIF Export | Save drawings as PNG or record a short GIF | 1,4,2 | 7 | 2 | 1 | 4 | 2.50 |
| 4 | Landing Hero Copy | Evocative 1-2 sentence description of what this is | 3,7,9,10 | 9 | 8 | 4 | 9 | 2.33 |
| 5 | GoatCounter Analytics | Privacy-friendly analytics for toy opens, bounce rate | 3,7 | 5 | 7 | 8 | 9 | 2.22 |
| 6 | Complete Beanie Integration | Add hiding spots to 8 remaining toys | 6,8 | 7 | 5 | 4 | 8 | 2.00 |
| 7 | PWA Manifest & Offline | Web app manifest + service worker | 5,6,8 | 3 | 1 | 2 | 3 | 2.00 |
| 8 | Shelf Entrance Animation | Staggered entrance on shelf items at first load | 9,1,2 | 7 | 6 | 2 | 8 | 1.88 |
| 9 | Share Button (Copy Link) | Per-toy share button copying deep link to clipboard | 1,2,4 | 8 | 5 | 2 | 8 | 1.88 |
| 10 | Beanie Collection Gallery | All 39 beanies: found vs silhouetted, counts, rarity | 6,8 | 8 | 4 | 3 | 8 | 1.88 |
| 11 | Mobile Responsiveness Audit | Test all 18 toys at 375px/768px, fix issues | 1,2,5,9 | 8 | 6 | 7 | 7 | 1.86 |
| 12 | Prefers-Reduced-Motion | Respect reduced-motion media query | 3,7,10 | 4 | 3 | 7 | 8 | 1.75 |
| 13 | Keyboard Accessibility Pass | Full keyboard nav, focus rings, ARIA labels | 3,7,10 | 6 | 4 | 8 | 7 | 1.71 |
| 14 | Lazy-Load Heavy Libraries | Code-split Three.js, p5, Butterchurn | 9,2,3 | 6 | 5 | 7 | 7 | 1.71 |
| 15 | Sound Design Polish Pass | Audit for missing feedback, ambient loops, normalize | 1,5,6,10 | 6 | 2 | 3 | 7 | 1.57 |
| 16 | "About / Built With" Footer | Tech stack, name, GitHub link | 3,7,10 | 8 | 4 | 2 | 9 | 1.56 |
| 17 | Sentry Error Tracking | Capture JS exceptions in production | 3,7 | 4 | 5 | 9 | 6 | 1.50 |
| 18 | Toy-Specific Loading Skeletons | Themed loading animations per toy | 9,1,10 | 5 | 3 | 4 | 8 | 1.50 |
| 19 | Touch Gesture Hints | Animated mobile gesture hints, dismissable | 1,2,5 | 4 | 3 | 5 | 8 | 1.50 |
| 20 | Retro Hit Counter | "You are visitor #12,847" backed by GoatCounter | 1,6,4 | 5 | 2 | 1 | 7 | 1.14 |
| 21 | "I'm Feeling Lucky" Randomizer | Button to open a random toy | 2,5,9 | 5 | 2 | 1 | 9 | 0.89 |

---

## Feature Backlog — New Toys

| Rank | Feature | Description | Personas | BV | TC | RR | JS | WSJF |
|------|---------|-------------|----------|----|----|----|----|------|
| 1 | Carmen Sandiego | 3-clue detective game, witness interviews, world map, warrant system, ACME badge | 1,5,2,8,7 | 9 | 3 | 3 | 2 | 7.50 |
| 2 | GeoCities Page Builder | Drag-and-drop homepage, under-construction GIFs, marquee text, guestbook, dancing babies, "publish" animation | 1,6,10,4,2 | 9 | 7 | 5 | 4 | 5.25 |
| 3 | Encarta Encyclopedia | 90s-purple UI, spinning globe, keyword search, MindMaze trivia, MIDI music, pixel-art "video clips" | 1,5,7,6,2 | 8 | 3 | 3 | 3 | 4.67 |
| 4 | Scholastic Book Order Form | Tissue-thin newsprint catalog, Goosebumps/Animorphs, pencil cursor, circle items, brown box delivery reveal | 1,5,10,4,8 | 9 | 4 | 4 | 4 | 4.25 |
| 5 | Furby | Animated face reacting to mic/mouse/idle, Furbish speech, "learns" English over sessions, angry when flipped | 1,2,4,10,8 | 8 | 4 | 5 | 4 | 4.25 |
| 6 | Napster/LimeWire Simulator | File-sharing UI, absurd search results, stalling progress bars, virus warnings, 8-bit "downloads" | 1,5,2,9,8 | 8 | 6 | 6 | 5 | 4.00 |
| 7 | Marble Maze | Accelerometer/mouse-tilt physics labyrinth, translucent plastic housing, ball-clack sounds | 3,9,5,7 | 8 | 5 | 7 | 5 | 4.00 |
| 8 | Bop It | Click/twist/swipe reaction game, 3D CSS toy, increasing tempo, voice synthesis, pass-and-play | 9,5,2,8,3 | 7 | 3 | 4 | 5 | 2.80 |
| 9 | Ask Jeeves Parody | Animated butler, idle animations, period-appropriate absurd results, WebRings, popup easter eggs | 1,6,9,5,7 | 7 | 3 | 4 | 6 | 2.33 |
| 10 | Lite-Brite | Glowing pegboard with bloom, color palette tray, dot-guide templates, light toggle, image export | 10,4,1,6,8 | 7 | 3 | 3 | 6 | 2.17 |

---

## Feature Backlog — Polish & Wow Factor

| Rank | Feature | Description | Personas | BV | TC | RR | JS | WSJF |
|------|---------|-------------|----------|----|----|----|----|------|
| 1 | Per-Toy Open/Close Transitions | Bespoke transitions: Tamagotchi CRT power-on, fish tank fills, BadOS boot screen, Snake slithers in. 400-800ms with SFX | 10,4,3,9,7 | 10 | 7 | 5 | 3 | 7.33 |
| 2 | Performance Budgets & Code Splitting | Route-based lazy loading, Lighthouse CI budget (LCP < 2.5s), preload shelf, defer rest | 3,7,6 | 6 | 6 | 9 | 5 | 4.20 |
| 3 | Shelf Idle Micro-Animations | Every toy has subtle idle loop: Tamagotchi flickers, fish bubbles, Koosh jiggles, Winamp EQ bounces | 10,4,9,3,6 | 9 | 8 | 6 | 6 | 3.83 |
| 4 | Discovery Journal / Trapper Keeper | Collection screen: all 39 beanies as TY heart tags, found vs silhouette, stats, rarity breakdown | 8,1,6,2,5 | 8 | 5 | 6 | 5 | 3.80 |
| 5 | First-Visit Guided Onboarding | 3-step skippable overlay: welcome, "click a toy," "find beanies." localStorage flag, never repeats | 9,2,7,5,8 | 7 | 7 | 7 | 7 | 3.00 |
| 6 | Ambient Shelf Soundscape | Background audio: faint mall muzak, arcade hum, fluorescent lights, PA announcements. Ducks on toy open | 1,10,4,5,6 | 8 | 5 | 4 | 6 | 2.83 |
| 7 | Shelf Page-Turn Animation | Physical page-flip between shelf pages, paper texture, torn-paper tabs, flip sound | 4,10,1,9 | 7 | 4 | 3 | 6 | 2.33 |
| 8 | CRT "TV Turning On" Load Effect | White line expands vertically like CRT warming up, static burst, phosphor glow, shelf fades in. Under 1.5s | 4,10,9,1,7 | 8 | 6 | 3 | 8 | 2.13 |
| 9 | Haptic Feedback on Mobile | Vibration API for shelf select, beanie discovery, Snake death, game events. Feature-detected | 3,10,9,5,2 | 7 | 4 | 5 | 8 | 2.00 |
| 10 | Contextual Retro Cursors | Custom cursors: pointer hand, magnifying glass on Magic Eye, pencil on KidPix, hourglass on loading | 10,4,6,3 | 7 | 3 | 3 | 7 | 1.86 |

---

## Implementation Priority (Next Up)

1. **OG Meta Tags & Social Preview** (WSJF 2.67)
2. **Error Boundary** (WSJF 2.56)
3. **KidPix Screenshot/GIF Export** (WSJF 2.50)
