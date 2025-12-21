
# Deployment Guide: 0relai Architect

0relai is a high-performance Progressive Web App (PWA) that utilizes advanced browser capabilities like **WebContainers** (Node.js in the browser) and **WebGPU** (Local LLM). 

**CRITICAL REQUIREMENT:** The application MUST be served with **Cross-Origin Isolation** headers (`COOP` and `COEP`). Without these, the Edge Runtime feature will fail to boot.

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
    *   `Cross-Origin-Embedder-Policy: require-corp`
    *   `Cross-Origin-Opener-Policy: same-origin`

---

## ⚡ Option 2: Netlify

Netlify is fully supported using the included `netlify.toml`.

1.  **Push to GitHub.**
2.  **New Site from Git:** In Netlify, choose your repo.
3.  **Build Settings:**
    *   **Build command:** `npm run build`
    *   **Publish directory:** `dist`
4.  **Environment Variables:** Add `API_KEY` in "Site settings" > "Build & deploy" > "Environment".
5.  **Deploy:** The `netlify.toml` file will handle the redirects and security headers automatically.

---

## 🐳 Option 3: Docker / Self-Hosted

For enterprise or offline-first deployments, you can run 0relai in a container.

1.  **Build the Image:**
    ```bash
    docker build -t 0relai-app .
    ```
    *Note: If you want to bake the API key into the image (not recommended for public registries), use `--build-arg API_KEY=your_key`.*

2.  **Run the Container:**
    ```bash
    docker run -p 8080:80 -e API_KEY=your_gemini_key 0relai-app
    ```

3.  **Access:** Open `http://localhost:8080`. The included `nginx.conf` ensures the correct headers are served.

---

## ⚠️ Troubleshooting

### "WebContainer failed to boot" / "Headers Missing"
If you see the error regarding missing headers in the Dev Console:
1.  Open your browser's DevTools -> Network Tab.
2.  Refresh the page and click the first request (`/`).
3.  Check "Response Headers". You **MUST** see:
    *   `Cross-Origin-Embedder-Policy: require-corp`
    *   `Cross-Origin-Opener-Policy: same-origin`
4.  If deploying on a custom server (Apache/Caddy), you must add these headers manually.

### "Gemini API Error"
1.  Check that the `API_KEY` environment variable is set correctly in your deployment dashboard.
2.  Ensure you are using a paid tier or have quota available on Google AI Studio.

### Local Development
To run locally with headers enabled:
```bash
npm run dev
```
The `vite.config.ts` is pre-configured to serve these headers on localhost.
