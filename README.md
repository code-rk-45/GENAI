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


## 📥 Installation

Install project dependencies:

```bash
npm install
````

If you encounter PDF parsing issues, install the stable version of `pdf-parse`:

```bash
npm install pdf-parse@1.1.1
```

---

## ▶️ Running the App (Development Mode)

Start the development server:

```bash
npm run dev
```

You should see:

```
Server running on http://localhost:3000
```

Open your browser and navigate to:

```
http://localhost:3000
```

---

## 🧠 How It Works

1. User connects Google Drive via OAuth.
2. User enters a Google Drive Folder ID.
3. Backend:

   * Lists files inside the folder.
   * Downloads supported files.
   * Extracts text from documents.
   * Sends extracted text to Gemini API.
4. Gemini generates structured summaries.
5. Summaries are displayed in the UI.
6. User can download summaries as CSV.

---
