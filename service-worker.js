// service-worker.js

// ⭐️ 【修改】快取版本號改為 v2，這會觸發所有使用者的 PWA 更新
const CACHE_NAME = 'homework-tracker-cache-v2';
// 需要快取的 App Shell 資源 (核心HTML + 主要的CDN函式庫)
const urlsToCache = [
  './', // 代表 index.html 或您主要的 HTML 檔案
  'icon-192.png',
  'icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore-compat.js'
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
      })
  );
});

// ⭐️ 【修改】攔截網路請求
self.addEventListener('fetch', event => {

  // 策略一：針對 HTML 頁面 (導航請求) 採用 "Network First" (網路優先)
  // 這確保使用者總是能拿到最新的 index.html (包含最新的 React 程式碼與樣式)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // 網路正常，直接回傳網路上的版本
          return networkResponse;
        })
        .catch(error => {
          // 網路失敗 (離線)，從快取中找出 index.html 來當作備援
          console.log('Network fetch failed, falling back to cache for navigate request.');
          return caches.match('./'); // 從快取回傳 './' (index.html)
        })
    );
    return; // 結束執行
  }

  // 策略二：針對其他所有資源 (JS, Firebase SDK, 圖片等) 採用 "Cache First" (快取優先)
  // 這些資源不常變動，快取優先可以大幅提升載入速度
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
            if(!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
                return networkResponse;
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
          // (可選) 在這裡可以回傳一個預設的離線圖片或提示
        });
      })
  );
});

// 清理舊快取的邏輯 (會刪除 'v1' 的快取)
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME]; // 只保留 'v2'
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName); // 刪除舊快取 (v1)
          }
        })
      );
    })
  );
});
