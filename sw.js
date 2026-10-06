// 산안법 검색기: 한 번 연 뒤에는 인터넷이 없어도 열리게 (앱 파일 하나 + 아이콘만 저장)
// 인터넷이 되면 늘 새 판을 받고(법령 갱신 반영), 안 되거나 5초 안에 응답이 없으면 저장해 둔 판을 연다.
const C = "sanan-v1", PAGE = "./";
self.addEventListener("install", e => {
  e.waitUntil(caches.open(C).then(c => c.addAll([PAGE, "manifest.json", "icon-192.png", "icon-512.png"])).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;   // 판례·KOSHA·만화 그림 등 바깥 자료는 손대지 않음
  const nav = r.mode === "navigate" || /\/(index\.html)?$/.test(u.pathname);
  const key = nav ? PAGE : r;
  const net = fetch(r).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(key, cp)); }
    return res;
  });
  const saved = caches.match(key);
  e.respondWith(new Promise(done => {
    let over = false;
    const fallback = () => saved.then(m => { if (!over && m) { over = true; done(m); } });
    const t = setTimeout(fallback, 5000);
    net.then(res => { clearTimeout(t); if (!over) { over = true; done(res); } })
       .catch(() => { clearTimeout(t); saved.then(m => { if (!over) { over = true; done(m || Response.error()); } }); });
  }));
});
