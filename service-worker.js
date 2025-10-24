// service-worker.js

const CACHE_NAME = 'homework-tracker-cache-v1';
// 需要快取的 App Shell 資源 (核心HTML + 主要的CDN函式庫)
const urlsToCache = [
  './', // 代表 index.html 或您主要的 HTML 檔案
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore-compat.js'
  // 注意：如果您有使用圖示，也請將圖示檔案路徑加入這裡，例如：'icon-192.png', 'icon-512.png'
];

// 安裝 Service Worker 並快取 App Shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // 使用 addAll 快取所有必要資源
        // 注意：如果其中任何一個檔案快取失敗，整個 install 會失敗
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
          console.error('Failed to cache resources during install:', error);
          // 這裡可以加入更詳細的錯誤處理，例如重試或提示使用者
      })
  );
});

// 攔截網路請求，優先從快取提供資源 (Cache First Strategy)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果快取中有符合的回應，直接回傳快取
        if (response) {
          return response;
        }
        // 如果快取中沒有，則嘗試從網路取得
        return fetch(event.request).then(
          networkResponse => {
            // 檢查回應是否有效
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
               // 如果是 Firebase 或其他 CORS 請求失敗，直接回傳錯誤
               if (networkResponse && (networkResponse.type === 'opaque' || networkResponse.type === 'cors')) {
                  // 不快取 opaque 或 CORS 錯誤回應
                  return networkResponse;
               }
               // 對於其他無效的回應，拋出錯誤
               // throw new Error('Invalid network response'); // 或者返回一個預設的離線頁面
                return networkResponse; // 暫時先直接返回，避免嚴格模式下的小問題
            }

            // 對於有效的網路回應，將其複製一份存入快取供下次使用
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                // 只快取 GET 請求
                if(event.request.method === 'GET') {
                    cache.put(event.request, responseToCache);
                }
              });

            return networkResponse;
          }
        ).catch(error => {
          console.error('Fetching failed:', error);
          // 在這裡可以回傳一個預設的離線頁面或提示
          // 例如 return new Response("<h1>您目前離線</h1>", { headers: { 'Content-Type': 'text/html' } });
          // 但對於 App Shell，我們更希望 install 階段就成功快取
        });
      })
  );
});

// (可選) 清理舊快取的邏輯
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME]; // 只保留目前版本的快取
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName); // 刪除舊快取
          }
        })
      );
    })
  );
});