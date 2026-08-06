<div align="center">

# JadeAI-Plus

**AI-Powered Smart Resume Builder — Enhanced with CLI Lifecycle & Root/Derivative Branching**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://www.typescriptlang.org/)

[中文文档](./README.zh-CN.md)

</div>

---

> **JadeAI-Plus** is an enhanced fork of [LingyiChen-AI/JadeAI](https://github.com/LingyiChen-AI/JadeAI). It inherits all original features (50 templates, AI optimization, mock interviews, multi-format export) and adds a **full CLI lifecycle**, **root/derivative resume branching**, and **AI privacy hardening**.

## What's New in JadeAI-Plus

### CLI Lifecycle — Programmatic Resume Management

A complete CLI (`jadeai`) for AI agents and power users. Install globally and manage resumes without opening a browser:

```bash
git clone https://github.com/SG-Amadeus/JadeAI-Plus.git
cd JadeAI-Plus
pnpm install && pnpm setup && pnpm link --global

jadeai start &                                          # Launch server
jadeai resume create --title "My Resume" --template modern  # Create root
jadeai pull my-resume --out ./data/                     # Export to local JSON
jadeai push my-resume --from ./data/                    # Sync edits back
jadeai resume export my-resume --format pdf --out cv.pdf   # Export PDF
```

**20 CLI commands** covering the full resume lifecycle: template browsing, CRUD, section/item management, profile management, import/export, and server management.

### Root/Derivative Branching — One Profile, Many JDs

Root resume stores personal info (PII) once. Derivatives branch off for specific job descriptions, inheriting PII automatically:

```
Root (personal_info + detailed experiences)
 ├── Derivative: JD - ByteDance Backend
 ├── Derivative: JD - Tencent Frontend
 └── Derivative: JD - Alibaba Full Stack
```

- **PII is NEVER visible to AI** — inherited personal_info is filtered from all 9 AI endpoints
- **Edit once, sync everywhere** — update root PII, all derivatives reflect instantly
- **Profile management** — reusable personal info with AI security boundary
- **Pull/Push workflow** — export sections as editable JSON files, edit locally, sync back

### AI Privacy Hardening

All AI endpoints filter inherited sections before passing data to AI models. Personal info (name, email, phone) stored on root resumes is never exposed to AI — regardless of whether called via CLI or Web UI.

### Global CLI with Zero Config

```bash
jadeai ping   # No fingerprint needed — defaults to demo user
jadeai start  # No fingerprint needed — just launches server
```

Auth defaults to the seeded demo user. Override via `--fingerprint` only when using a different identity.

---

## Original Features (from JadeAI)

### Resume Editing

- **Drag & Drop Editor** — Visually arrange and reorder resume sections and items
- **Inline Editing** — Click any field to edit directly on the canvas
- **50 Professional Templates** — Classic, Modern, Minimal, Creative, ATS-Friendly, Timeline, Nordic, Swiss, and more
- **Theme Customization** — Colors, fonts, spacing, and margins with live preview
- **Undo / Redo** — Full edit history (up to 50 steps)
- **Auto Save** — Configurable interval (0.3s–5s), with manual save option
- **Markdown Support** — Use Markdown syntax in text fields to format content

### AI Capabilities

- **AI Chat Assistant** — Conversational AI integrated in the editor, with multi-session support and persistent history
- **AI Resume Generation** — Generate a complete resume from job title, experience, and skills
- **Resume Parsing** — Upload an existing PDF or image, AI extracts all content automatically
- **JD Match Analysis** — Compare resume against a job description: keyword matching, ATS score, and improvement suggestions
- **Cover Letter Generation** — AI-tailored cover letter based on resume and JD
- **Grammar & Writing Check** — Detect weak verbs, vague descriptions, and grammar issues
- **Translation** — Translate resume content across 10 languages
- **Flexible AI Provider** — Supports OpenAI, Anthropic, and custom API endpoints; each user configures their own key in-app

### Mock Interview

- **JD-Based Interview Simulation** — AI plays different interviewer roles (HR, Technical, Behavioral, etc.)
- **Smart Follow-ups** — AI adapts questions based on answer quality
- **Detailed Report** — Per-question scoring, competency radar chart, improvement plan
- **PDF & Markdown Export** — Export interview reports for offline review

### Export & Sharing

- **Multi-Format Export** — PDF (Puppeteer + Chromium), Smart One-Page PDF, DOCX, HTML, TXT, JSON
- **Link Sharing** — Token-based shareable links with optional password protection
- **JSON Import** — Import previously exported JSON files

### Other

- **Bilingual UI** — Full Chinese (zh) and English (en) interface
- **Dark Mode** — Light, dark, and system theme support
- **Flexible Auth** — Google OAuth or browser fingerprint (zero-config)
- **Dual Database** — SQLite (default, zero-config) or PostgreSQL

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Radix UI |
| Drag & Drop | @dnd-kit |
| State | Zustand |
| Database | Drizzle ORM (SQLite / PostgreSQL) |
| Auth | NextAuth.js v5 + FingerprintJS |
| AI | Vercel AI SDK v6 + OpenAI / Anthropic |
| PDF | Puppeteer Core + @sparticuz/chromium |
| i18n | next-intl |
| CLI | tsx + TypeScript (zero external dependencies) |

## Getting Started

### Docker (Recommended)

```bash
openssl rand -base64 32

docker run -d -p 3000:3000 \
  -e AUTH_SECRET=<your-generated-secret> \
  -v jadeai-data:/app/data \
  twwch/jadeai:latest
```

Open [http://localhost:3000](http://localhost:3000). Database auto-migrates and seeds on first start.

### Local Development

```bash
git clone https://github.com/SG-Amadeus/JadeAI-Plus.git
cd JadeAI-Plus

pnpm install
cp .env.example .env.local

pnpm db:generate
pnpm db:migrate
pnpm db:seed      # optional — creates demo user
pnpm dev          # → http://localhost:3000
```

### CLI Global Install

```bash
pnpm setup
pnpm link --global

jadeai --help      # verify installation
jadeai start &     # start server
jadeai ping        # test connectivity
```

## CLI Command Reference

| Command | Description |
|---------|-------------|
| `jadeai start` | Start dev server |
| `jadeai ping` | Test connectivity |
| `jadeai template list` | Browse 50 templates |
| `jadeai resume create` | Create root resume |
| `jadeai resume derive` | Branch derivative for a JD |
| `jadeai resume detach` | Promote derivative to standalone |
| `jadeai resume list/show/export/update/duplicate/delete/parse` | Full CRUD |
| `jadeai section list/add/update/delete/reorder` | Section management |
| `jadeai item add/update/delete/reorder` | Item management |
| `jadeai profile list` | List profile codenames |
| `jadeai pull <resume-id> --out <dir>` | Export sections as local JSON |
| `jadeai push <resume-id> --from <dir>` | Sync local JSON back to server |

See `.claude/skills/jadeai/SKILL.md` for the full agent workflow reference.

## API Reference

<details>
<summary>View all API endpoints (28 endpoints)</summary>

### Resume

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/resume` | List all resumes for current user |
| `POST` | `/api/resume` | Create a new resume |
| `GET` | `/api/resume/[id]` | Get resume detail with all sections (merged view) |
| `PUT` | `/api/resume/[id]` | Update resume metadata or sections |
| `DELETE` | `/api/resume/[id]` | Delete a resume (`?force=true` to cascade) |
| `POST` | `/api/resume/[id]/duplicate` | Duplicate a resume |
| `POST` | `/api/resume/[id]/derive` | Create derivative from root |
| `POST` | `/api/resume/[id]/detach` | Detach derivative to standalone |
| `GET` | `/api/resume/[id]/export` | Export resume (pdf, docx, html, txt, json) |
| `POST` | `/api/resume/parse` | Parse resume from PDF or image upload |

### Sections & Items

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/resume/[id]/sections` | List sections |
| `POST` | `/api/resume/[id]/sections` | Add section |
| `PUT` | `/api/resume/[id]/sections/[sid]` | Update section |
| `DELETE` | `/api/resume/[id]/sections/[sid]` | Delete section |
| `PUT` | `/api/resume/[id]/sections/reorder` | Reorder sections |
| `POST` | `/api/resume/[id]/sections/[sid]/items` | Add item |
| `PUT` | `/api/resume/[id]/sections/[sid]/items/[iid]` | Update item |
| `DELETE` | `/api/resume/[id]/sections/[sid]/items/[iid]` | Delete item |
| `PUT` | `/api/resume/[id]/sections/[sid]/items/reorder` | Reorder items |

### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/chat` | Stream chat with resume context |
| `POST` | `/api/ai/generate-resume` | Generate resume from prompts |
| `POST` | `/api/ai/jd-analysis` | JD match analysis |
| `POST` | `/api/ai/grammar-check` | Grammar & writing check |
| `POST` | `/api/ai/cover-letter` | Generate cover letter |
| `POST` | `/api/ai/translate` | Translate resume content |
| `POST` | `/api/ai/fill` | AI fill sections from data/JD |
| `POST` | `/api/ai/optimize` | AI optimize for JD |
| `POST` | `/api/ai/rewrite-section` | AI rewrite single section |

</details>

## Project Structure

```
src/
├── app/
│   ├── [locale]/               # i18n routes
│   └── api/                    # 28 API endpoints
├── components/
│   ├── editor/                 # Drag & drop editor
│   ├── preview/templates/      # 50 resume templates
│   └── ai/                     # AI chat panel
├── lib/
│   ├── db/                     # Drizzle ORM schema & repositories
│   ├── auth/                   # Auth configuration
│   └── ai/                     # AI prompts & tools
├── hooks/                      # Custom React hooks
└── stores/                     # Zustand stores
cli/
├── commands/                   # 23 CLI command handlers
├── index.ts                    # CLI entry + arg parser
├── client.ts                   # HTTP client (zero deps)
└── config.ts                   # Configuration helpers
```

## Contributing

1. Fork [LingyiChen-AI/JadeAI](https://github.com/LingyiChen-AI/JadeAI) or [SG-Amadeus/JadeAI-Plus](https://github.com/SG-Amadeus/JadeAI-Plus)
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push and open a Pull Request

## License

[Apache License 2.0](LICENSE) — same as the original JadeAI project.

---

<div align="center">

**Original Project:** [LingyiChen-AI/JadeAI](https://github.com/LingyiChen-AI/JadeAI) | **Enhanced Fork:** [SG-Amadeus/JadeAI-Plus](https://github.com/SG-Amadeus/JadeAI-Plus)

</div>
