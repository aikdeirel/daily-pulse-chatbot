<div align="center">
  <img alt="Daily Pulse AI Chatbot" src="app/(chat)/opengraph-image.png" width="100%">
  <h1>✨ Daily Pulse</h1>
  <p><em>Your personal AI assistant for daily tasks, music, and creative work</em></p>
  
  [![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
  [![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
  [![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)
</div>

---

## 🌟 Features

### 🤖 AI-Powered Chat
- **Vercel AI SDK Framework** – Built on Vercel AI SDK with OpenRouter provider for multi-model access
- **Multiple LLM Models** – Claude (Opus, Sonnet, Haiku), GPT-5, Mistral, Gemma via [OpenRouter](https://openrouter.ai/)
- **Smart Tools** – Weather forecasts, web search, and intelligent suggestions
- **Skills System** – Specialized capabilities for context handovers and music discovery

### 🎵 Spotify Integration
- **Now Playing** – Real-time header indicator with playback controls
- **Music Management** – Search tracks, manage playlists, view listening history
- **Smart Recommendations** – Personalized suggestions based on your taste
- [📖 Full Spotify Documentation](docs/SPOTIFY_INTEGRATION.md)

### 📅 Google Integration
- **Calendar Management** – View, create, update, and delete events
- **Gmail** – Read and manage messages and labels
- **Google Tasks** – Manage task lists, tasks, and subtasks
- [📖 Full Google Documentation](docs/GOOGLE_INTEGRATION.md)

### 📝 Artifacts
Create and edit interactive content directly in chat:
- **Text Documents** – Rich markdown editing with live preview
- **Code Snippets** – Syntax-highlighted code with multiple language support
- **Spreadsheets** – Interactive data grids for analysis

### 🔐 Authentication & Storage
- **Secure Auth** – Email/password authentication via Auth.js
- **Persistent Storage** – PostgreSQL for chat history, Redis for caching
- **File Uploads** – Vercel Blob integration for attachments

### 📱 Modern Experience
- **Progressive Web App** – Install as a native app on any device
- **Responsive Design** – Beautiful UI built with Tailwind CSS and shadcn/ui
- **Dark Mode** – System-aware theming for comfortable viewing

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- PostgreSQL database (recommended: [Vercel Postgres](https://vercel.com/storage/postgres))
- Redis instance (recommended: [Vercel KV](https://vercel.com/storage/kv))

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/aikdeirel/vercel-nextjs-ai-chatbot.git
   cd vercel-nextjs-ai-chatbot
   pnpm install
   ```

2. **Configure environment variables**
   
   Copy `.env.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```
   
   Required variables:
   - `AUTH_SECRET` – Authentication secret (generate with `openssl rand -base64 32`)
   - `POSTGRES_URL` – PostgreSQL connection string
   - `REDIS_URL` – Redis connection string
   - `OPENROUTER_API_KEY` – OpenRouter API key for LLM access ([get yours here](https://openrouter.ai/keys))
   - `BLOB_READ_WRITE_TOKEN` – Vercel Blob storage token ([setup guide](docs/BLOB_STORAGE_SETUP.md))
   
   Optional (for Spotify features):
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_REDIRECT_URI`
   
   Optional (for Google features):
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`

3. **Set up the database**
   ```bash
   pnpm db:migrate
   ```

4. **Start the development server**
   ```bash
   pnpm dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to start chatting! 🎉

---

## 🛠️ Tech Stack

<table>
  <tr>
    <td><strong>Framework</strong></td>
    <td>Next.js 16 (App Router, React 19, Server Components)</td>
  </tr>
  <tr>
    <td><strong>AI</strong></td>
    <td>Vercel AI SDK (framework) + OpenRouter (provider)</td>
  </tr>
  <tr>
    <td><strong>Database</strong></td>
    <td>PostgreSQL with Drizzle ORM</td>
  </tr>
  <tr>
    <td><strong>Styling</strong></td>
    <td>Tailwind CSS + shadcn/ui components</td>
  </tr>
  <tr>
    <td><strong>Auth</strong></td>
    <td>Auth.js (NextAuth v5)</td>
  </tr>
  <tr>
    <td><strong>Deployment</strong></td>
    <td>Optimized for Vercel with edge functions</td>
  </tr>
</table>

---

## 📦 Available Scripts

```bash
pnpm dev          # Start development server with Turbopack
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run Biome linter
pnpm format       # Format code with Biome
pnpm test         # Run Playwright E2E tests
pnpm db:migrate   # Apply database migrations
pnpm db:studio    # Open Drizzle Studio
```

---

## 🚢 Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aikdeirel/vercel-nextjs-ai-chatbot)

1. Click the button above or push to your GitHub repository
2. Connect to Vercel and import your project
3. Add environment variables in Vercel dashboard
4. Deploy! Vercel handles database setup and OIDC auth automatically

### Self-Hosting

For non-Vercel deployments:
- Set `OPENROUTER_API_KEY` for LLM access ([get yours here](https://openrouter.ai/keys))
- Configure your own PostgreSQL and Redis instances
- Update `SPOTIFY_REDIRECT_URI` to your production domain (if using Spotify)
- Update `GOOGLE_REDIRECT_URI` to your production domain (if using Google)

---

## 📄 License

Licensed under the [Apache License 2.0](LICENSE).

Originally forked from [Vercel's AI Chatbot template](https://github.com/vercel/ai-chatbot) and customized with additional features.

---

<div align="center">
  <sub>Built with ❤️ using Next.js, Vercel AI SDK, and OpenRouter</sub>
</div>
