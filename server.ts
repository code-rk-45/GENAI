import express from 'express';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import { GoogleGenAI } from '@google/genai';
// import * as pdfParseModule from 'pdf-parse';
// const pdfParse = (pdfParseModule as any).default || pdfParseModule;
// import { createRequire } from 'module';
// const require = createRequire(import.meta.url);
// const pdfParse = require('pdf-parse');
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

import mammoth from 'mammoth';
import { stringify } from 'csv-stringify/sync';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.set('trust proxy', 1); // trust first proxy

app.use(express.json());

// Google OAuth setup
const getOauth2Client = (req: express.Request) => {
  const redirectUri = `${process.env.APP_URL}/auth/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

// --- API Routes ---

// 1. Get OAuth URL
app.get('/api/auth/url', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google OAuth credentials not configured' });
  }

  const oauth2Client = getOauth2Client(req);
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.readonly'],
    prompt: 'consent',
  });

  res.json({ url });
});

// 2. OAuth Callback
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const oauth2Client = getOauth2Client(req);
    const { tokens } = await oauth2Client.getToken(code);

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).send('Authentication failed');
  }
});

// 3. Check Auth Status
app.get('/api/auth/status', (req, res) => {
  // We no longer use server-side sessions, so we just return true if the client asks.
  // The client will check its own localStorage.
  res.json({ isAuthenticated: true });
});

// 4. Logout
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

// Helper to extract text from buffer based on mimeType
async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    if (mimeType === 'application/pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (mimeType === 'text/plain') {
      return buffer.toString('utf-8');
    } else {
      return '';
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    return '';
  }
}

// 5. Process Folder
app.post('/api/process-folder', async (req, res) => {
  const { folderId, tokens } = req.body;
  if (!tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!folderId) {
    return res.status(400).json({ error: 'Folder ID is required' });
  }

  try {
    const oauth2Client = getOauth2Client(req);
    oauth2Client.setCredentials(tokens);

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // List files in the folder
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webViewLink)',
    });

    const files = response.data.files || [];
    const supportedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.google-apps.document' // Add Google Docs support
    ];

    const supportedFiles = files.filter((f) => supportedMimeTypes.includes(f.mimeType || ''));

    if (supportedFiles.length === 0) {
      return res.json({ summaries: [] });
    }

    console.log("GEMINI_API_KEY is:", process.env.GEMINI_API_KEY ? (process.env.GEMINI_API_KEY.length > 10 ? "SET_AND_LONG" : "SET_BUT_SHORT") : "NOT_SET");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const summaries = [];

    for (const file of supportedFiles) {
      try {
        let text = '';
        
        // Handle Google Docs differently (they need to be exported, not downloaded directly)
        if (file.mimeType === 'application/vnd.google-apps.document') {
          const fileRes = await drive.files.export(
            { fileId: file.id!, mimeType: 'text/plain' },
            { responseType: 'arraybuffer' }
          );
          const buffer = Buffer.from(fileRes.data as ArrayBuffer);
          text = buffer.toString('utf-8');
        } else {
          // Download standard file
          const fileRes = await drive.files.get(
            { fileId: file.id!, alt: 'media' },
            { responseType: 'arraybuffer' }
          );
          const buffer = Buffer.from(fileRes.data as ArrayBuffer);
          text = await extractText(buffer, file.mimeType!);
        }

        if (!text.trim()) {
          summaries.push({
            id: file.id,
            fileName: file.name,
            link: file.webViewLink,
            summary: 'Could not extract text from this document.',
          });
          continue;
        }

        
        const prompt = `
        You are a professional document summarization system.

        Provide a structured analytical summary using EXACTLY this format:

        A. Overview:
        - 2-3 concise bullet points summarizing the overall document.

        B. Insights:
        - 2-3 key insights in bullet form.

        C. Conclusion:
        - 1-2 bullet points summarizing the final takeaway.

        Keep total length under 250 words.
        Use professional, analytical tone.
        Do NOT add any extra sections.

        Document:
        ${text.substring(0, 10000)}
        `;

        const aiResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });

        summaries.push({
          id: file.id,
          fileName: file.name,
          link: file.webViewLink,
          summary: aiResponse.text || 'No summary generated.',
        });
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        summaries.push({
          id: file.id,
          fileName: file.name,
          link: file.webViewLink,
          summary: 'Error processing this document.',
        });
      }
    }

    res.json({ summaries });
  } catch (error: any) {
    console.error('Error processing folder:', error);
    res.status(500).json({ error: error.message || 'Failed to process folder' });
  }
});

// 6. Download CSV
app.post('/api/download-csv', (req, res) => {
  const { summaries } = req.body;
  if (!summaries || !Array.isArray(summaries)) {
    return res.status(400).json({ error: 'Invalid summaries data' });
  }

  const csvData = stringify(
    summaries.map((s) => ({
      'File Name': s.fileName,
      'Link': s.link,
      'Summary': s.summary,
    })),
    { header: true }
  );

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="summaries.csv"');
  res.send(csvData);
});

// --- Vite Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
