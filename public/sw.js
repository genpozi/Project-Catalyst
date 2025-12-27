
// Safe No-Op Service Worker
// This replaces any previous aggressive caching strategies to ensure stability.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients immediately to ensure control, but do not delete caches aggressively
  // here to avoid race conditions with active fetches.
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests to network
  return; 
});
