
# Deployment Guide: 0relai Architect

0relai is a high-performance Progressive Web App (PWA) that utilizes advanced browser capabilities.

## 🚨 Critical Vercel Configuration

For the app to function correctly, you **must** configure the following in the Vercel Dashboard under **Settings > Environment Variables**:

### 1. API Key (Required)
*   **Key:** `API_KEY`
*   **Value:** `AIzaSy...` (Your actual Google Gemini API Key)
*   **Environments:** Check Production, Preview, and Development.

> **Note:** Do NOT prefix it with `VITE_` or `NEXT_PUBLIC_`. The application is configured to read `API_KEY` directly during the build process.

### 2. Security Headers (Automated)
The included `vercel.json` automatically configures the **Cross-Origin Isolation** headers required for the WebContainer runtime.
*   Header: `Cross-Origin-Embedder-Policy: credentialless`
*   Header: `Cross-Origin-Opener-Policy: same-origin`

If you see errors about "SharedArrayBuffer" or "Tailwind is not defined", ensure these headers are being served correctly by checking the Network tab in DevTools.

---

## 🚀 Deployment Steps

1.  **Push to GitHub:** Commit your code and push to a repository.
2.  **Import in Vercel:** Create a new project from your Git repository.
3.  **Add Environment Variable:**
    *   Name: `API_KEY`
    *   Value: *[Paste your key here]*
4.  **Deploy:** Click "Deploy".

## ⚠️ Troubleshooting

### "ServiceWorker script has an unsupported MIME type"
This means the service worker file was not found.
*   Ensure `sw.js` is located in the `public/` folder of your project structure.
*   Vite will copy it to the root of the `dist/` folder during build.

### "Blocked by Response" (CDN Issues)
If external scripts like Tailwind CSS fail to load:
*   Ensure `vercel.json` is present in the root directory.
*   Verify the header is set to `credentialless` (not `require-corp`).
