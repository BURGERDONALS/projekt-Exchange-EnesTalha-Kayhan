// Service Worker for Currency Exchange App - Render Optimized
const CACHE_NAME = 'currency-app-v1.0.0';
const API_CACHE_NAME = 'currency-api-cache-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    'https://api.frankfurter.app/latest?from=EUR'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Fetch event - network first strategy for API, cache first for assets
self.addEventListener('fetch', (event) => {
    const request = event.request;
    
    // API requests - Network First strategy
    if (request.url.includes('frankfurter.app')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache the API response
                    const responseClone = response.clone();
                    caches.open(API_CACHE_NAME)
                        .then((cache) => {
                            cache.put(request, responseClone);
                        });
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if network fails
                    return caches.match(request);
                })
        );
        return;
    }
    
    // Static assets - Cache First strategy
    event.respondWith(
        caches.match(request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(request);
            })
    );
});