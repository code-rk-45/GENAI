# AI-Summarizer

AI-powered Google Drive document summarization app built with:

- React + Vite (Frontend)
- Express (Backend)
- Google Drive API (OAuth + File Access)
- Gemini API (Document Summarization)
- pdf-parse & mammoth (Text Extraction)

---

## 🚀 Features

- Google Drive OAuth authentication
- Process entire Drive folders
- Extract text from:
  - PDF
  - DOCX
  - TXT
  - Google Docs
- AI-powered structured summarization (Gemini)
- CSV export of summaries
- Clean Tailwind-based UI

---

## 📦 Prerequisites

- Node.js v18+ (recommended v20)
- npm or yarn
- Google Cloud Project
- Gemini API Key

---

## 🔐 Required API Setup

### 1️⃣ Google OAuth Credentials

1. Go to Google Cloud Console
2. Create a project
3. Enable:
   - Google Drive API
4. Create OAuth 2.0 Credentials
5. Add redirect URL:
http://localhost:3000/auth/callback


Copy:
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET

---

### 2️⃣ Gemini API Key

1. Go to: https://ai.google.dev
2. Create API Key
3. Copy key

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GEMINI_API_KEY=your_gemini_api_key

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
