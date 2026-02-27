import React, { useState, useEffect } from 'react';
import { Folder, FileText, Download, LogOut, Loader2 } from 'lucide-react';

interface Summary {
  id: string;
  fileName: string;
  link: string;
  summary: string;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [folderId, setFolderId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.tokens) {
        localStorage.setItem('google_tokens', JSON.stringify(event.data.tokens));
        checkAuthStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const tokens = localStorage.getItem('google_tokens');
      setIsAuthenticated(!!tokens);
    } catch (err) {
      console.error('Failed to check auth status', err);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await fetch('/api/auth/url');
      const data = await res.json();
      if (data.url) {
        window.open(data.url, 'oauth_popup', 'width=600,height=700');
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to get authentication URL.');
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('google_tokens');
      setIsAuthenticated(false);
      setSummaries([]);
      setFolderId('');
    } catch (err) {
      console.error('Failed to logout', err);
    }
  };

  const handleProcessFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderId.trim()) return;

    setIsProcessing(true);
    setError(null);
    setSummaries([]);

    try {
      const tokens = JSON.parse(localStorage.getItem('google_tokens') || 'null');
      const res = await fetch('/api/process-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: folderId.trim(), tokens }),
      });

      const data = await res.json();
      if (res.ok) {
        setSummaries(data.summaries);
        if (data.summaries.length === 0) {
          setError('No supported documents (PDF, DOCX, TXT, Google Docs) found in this folder.');
        }
      } else {
        setError(data.error || 'Failed to process folder.');
      }
    } catch (err) {
      setError('An error occurred while processing the folder.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      const res = await fetch('/api/download-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaries }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'document_summaries.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Failed to download CSV.');
      }
    } catch (err) {
      setError('An error occurred while downloading CSV.');
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold tracking-tight">DocuSum AI</h1>
          </div>
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Folder className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Connect Google Drive</h2>
            <p className="text-gray-500 mb-8">
              Authenticate to access your folders and summarize documents using AI.
            </p>
            <button
              onClick={handleConnect}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              Connect with Google
            </button>
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Folder className="w-5 h-5 text-blue-600" />
                Process Drive Folder
              </h2>
              <form onSubmit={handleProcessFolder} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="folderId" className="sr-only">
                    Google Drive Folder ID
                  </label>
                  <input
                    id="folderId"
                    type="text"
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    placeholder="Enter Google Drive Folder ID..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    required
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    The folder ID is the string of characters at the end of your Google Drive folder URL.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isProcessing || !folderId.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap h-[50px]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Summarize Documents'
                  )}
                </button>
              </form>
              {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
                  {error}
                </div>
              )}
            </div>

            {summaries.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold">Document Summaries</h3>
                  <button
                    onClick={handleDownloadCsv}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="px-6 py-4 font-medium">File Name</th>
                        <th className="px-6 py-4 font-medium">Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {summaries.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 align-top w-1/4">
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-medium flex items-start gap-2"
                            >
                              <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                              <span className="break-all">{item.fileName}</span>
                            </a>
                          </td>
                          <td className="px-6 py-4 align-top text-gray-600 text-sm leading-relaxed">
                            {item.summary}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
