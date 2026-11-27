// 산안법 검색기: 한 번 연 뒤에는 인터넷이 없어도 열리게 (앱 파일 하나 + 아이콘만 저장)
// 2026-11-27: 저장본이 있으면 그것부터 바로 연다. 새 판은 뒤에서 받아 두고, 바뀌었으면 화면에 알린다(다음에 열 때 반영).
// 예전에는 늘 서버에서 새 판(3MB)부터 받느라, 하루 두 번 갱신될 때마다 첫 화면이 최대 8초 늦었다.
const C = "sanan-v5", PAGE = "./";   // 이름을 바꾸면 저장본이 지워져 모두 처음부터 다시 받는다
self.addEventListener("install", e => {
  e.waitUntil(caches.open(C).then(c => c.addAll([PAGE, "manifest.json", "icon-192.png", "icon-512.png"])).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const tag = res => res && (res.headers.get("etag") || res.headers.get("last-modified")) || "";
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;   // 판례·KOSHA·만화 그림 등 바깥 자료는 손대지 않음
  const nav = r.mode === "navigate" || /\/(index\.html)?$/.test(u.pathname);
  const key = nav ? PAGE : r;
  e.respondWith(caches.open(C).then(async c => {
    const saved = await c.match(key);
    // 서버 확인 (브라우저 저장본은 건너뜀). 바뀐 게 없으면 서버가 짧게 '그대로'라고만 답한다
    const net = fetch(nav ? u.origin + u.pathname + u.search : r, nav ? {cache: "no-cache", credentials: "same-origin"} : undefined).then(async res => {
      if (res.ok) {
        const changed = saved && tag(saved) !== tag(res);
        await c.put(key, res.clone());
        if (nav && changed) (await self.clients.matchAll({type: "window"})).forEach(w => w.postMessage("sap-updated"));
      }
      return res;
    });
    if (saved) { e.waitUntil(net.catch(() => {})); return saved; }   // 저장본이 있으면 바로 연다
    return net.catch(() => Response.error());
  }));
});
