# IELTS Prep Hub

A full-featured IELTS preparation app built with Next.js 14 + Tailwind CSS. Mobile-first, optimized for iPhone 15.

## Features

- **Dashboard** — Stats overview, today's schedule, recent test scores
- **Calendar** — Apple-style monthly calendar with study session planner & time tracker
- **Materials** — Add your own practice test content (passages, questions, answer keys)
- **Test Center** — Timed tests for Reading, Listening, and Writing (like the real IELTS)
- **Review** — Detailed answer review with band score feedback

## Setup

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel (easiest)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Click Deploy — done! Zero config needed.

## Deploy to other platforms

```bash
npm run build
npm start
```

## How to Add Practice Materials

1. Go to **Materials** tab
2. Tap **Add**
3. **Step 1**: Enter title, choose type (Reading/Listening/Writing), paste the passage/transcript
4. **Step 2**: Paste questions (blank line between each). For MCQ, add options on new lines starting with A) B) C) D). Example:

```
1. What is the main topic of the passage?
A) Climate change
B) Marine biology
C) Ocean currents
D) Weather patterns

2. According to paragraph 2, the temperature has...
```

5. Paste answer key (one answer per line):
```
1. B
2. increased significantly
```

6. Preview and save — then start the test from Test Center!

## Question Types Supported

- **MCQ** — Multiple choice (auto-detected if options A) B) C) D) present)
- **Short answer** — Free text input
- **True/False/Not Given** — Three-option buttons
- **Essay** — Long-form writing with word count

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (with localStorage persistence)
- date-fns
- lucide-react
