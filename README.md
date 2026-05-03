# 🏸 PIBA — Shuttle Club Manager

A modern badminton club management app built with React + Vite + Supabase.

Manage events, members, expenses, and finances for your badminton club — with an AI-powered chat assistant.

## Features

- **Events** — Create, edit, and track badminton sessions with costs and pricing
- **Members** — Manage club membership list with fee tracking
- **Expenses** — Track one-off costs (shuttlecocks, equipment) split among members
- **Attendees** — Record who played at each event with payment tracking
- **AI Chat** — Natural language assistant for managing events, members, and expenses
- **Financial Summary** — Per-event income/cost breakdown by payment method

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/nischay-dhiman/piba.git
cd piba
npm install
```

### 2. Environment Variables

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

Required variables:
- `VITE_SUPABASE_URL` — Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Your Supabase anon/public key
- `VITE_OPENROUTER_API_KEY` — Your OpenRouter API key (for the AI chat)

### 3. Database Setup

Run these SQL files in your Supabase SQL Editor (Dashboard → SQL Editor → New Query):

1. `supabase-schema.sql` — Core tables (members, events, attendees)
2. `supabase-expenses.sql` — Expenses extension (expenses, expense_splits)

### 4. Run Locally

```bash
npm run dev
```

## Tech Stack

- **Frontend**: React 19, React Router, Lucide Icons
- **Styling**: Custom CSS design system (dark glassmorphism theme)
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **AI**: OpenRouter (Vercel AI SDK) with tool-calling agents
- **Build**: Vite 8

## Deployment

This app is configured for static hosting. Build with:

```bash
npm run build
```

The output in `dist/` can be deployed to DigitalOcean App Platform, Vercel, Netlify, or any static host.

> **Note:** Set environment variables in your hosting platform's settings — never commit `.env` files.
