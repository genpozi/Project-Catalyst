
# Deployment Guide: 0relai Architect

0relai is a high-performance Progressive Web App (PWA) that utilizes advanced browser capabilities like **WebContainers** (Node.js in the browser) and **WebGPU** (Local LLM). 

**CRITICAL REQUIREMENT:** The application MUST be served with **Cross-Origin Isolation** headers. Specifically, we use `credentialless` to allow loading external CDNs (Tailwind, etc.) while maintaining the isolation required for `SharedArrayBuffer`.

## 🔑 Environment Variables

The application requires the following environment variables to be set in your deployment provider.

| Variable | Description | Required |
| :--- | :--- | :--- |
| `API_KEY` | Your Google Gemini API Key. | **Yes** |
| `VITE_SUPABASE_URL` | (Optional) For Cloud Sync. | No |
| `VITE_SUPABASE_ANON_KEY` | (Optional) For Cloud Sync. | No |

---

## 🚀 Option 1: Vercel (Recommended)

Vercel is the recommended provider due to its native support for headers configuration via `vercel.json`.

1.  **Push to GitHub:** Ensure your project is pushed to a GitHub repository.
2.  **Import Project:** Go to the Vercel Dashboard and "Add New Project". Select your repo.
3.  **Configure Environment:**
    *   Add `API_KEY` with your Gemini key.
4.  **Deploy:** Click Deploy.
5.  **Verify:** The `vercel.json` included in this project automatically configures the headers:
    *   `Cross-Origin-Embedder-Policy: credentialless`
    *   `Cross-Origin-Opener-Policy: same-origin`

---

## ⚡ Option 2: Netlify

Netlify is fully supported. Ensure your `netlify.toml` (if present) includes the headers.

Headers needed in `netlify.toml`:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Embedder-Policy = "credentialless"
    Cross-Origin-Opener-Policy = "same-origin"
```

---

## ⚠️ Troubleshooting

### "WebContainer failed to boot"
If you see the error regarding missing headers in the Dev Console:
1.  Open your browser's DevTools -> Network Tab.
2.  Refresh the page and click the first request (`/`).
3.  Check "Response Headers". You **MUST** see `Cross-Origin-Embedder-Policy: credentialless` (or `require-corp` if all assets are local).

### "Blocked by Response / NotSameOrigin"
If images or scripts (like Tailwind) fail to load:
*   Ensure the header is set to `credentialless`, not `require-corp`. `require-corp` is too strict for most public CDNs.

### "MIME type text/html" for Service Worker
*   This usually means the file is not found (404) and the server returned the `index.html` fallback. 
*   Ensure `sw.js` exists in the `public/` directory or the build output root.
