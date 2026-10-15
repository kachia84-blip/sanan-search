/* 무사고 현장 — 산안법 검색기 '공부' 탭의 게임.
   앱에서 '🎮 게임' 칸을 처음 열 때 이 파일을 불러온다 (검색·읽기 속도에는 영향 없음).
   법령 숫자는 「산업안전보건기준에 관한 규칙」 원문(제13·24·32·42·43·44·56·57·60·67·68조 등)에서 옮겼다. */
(function () {
"use strict";
if (window.SAPGAME) return;

const KEY = "sap_game_v1";
const DAY = 86400000;
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
const NS = "http://www.w3.org/2000/svg";

/* =============== 저장 =============== */
function loadS() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!s || typeof s !== "object") s = {};
  s.stars = s.stars || {}; s.facts = s.facts || {}; s.dex = s.dex || {};
  s.xp = s.xp || 0; s.cur = s.cur || 0; s.best = s.best || 0; s.insp = s.insp || 0; s.snd = !!s.snd;
  return s;
}
let S = loadS();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

/* =============== 법령 지식 카드 (한 장 = 외워야 할 숫자·말 하나) =============== */
// [id, 조, 항·호, 질문, 정답, 단위, 방향, 요지]   방향: min 이상 · max 이하 · gt 초과 · eq 딱 그 값
const NF = [
  ["rail_top", "제13조", "제2호", "안전난간의 상부 난간대는 바닥면에서 몇 cm 이상 지점에 설치할까요?", 90, "cm", "min", "상부 난간대는 바닥면에서 90cm 이상"],
  ["rail_hi", "제13조", "제2호", "상부 난간대를 몇 cm 이하에 설치하면 중간 난간대를 중간 지점에 1단만 둬도 될까요?", 120, "cm", "max", "상부 난간대 120cm 이하 → 중간 난간대는 상부 난간대와 바닥의 중간에"],
  ["rail_mid", "제13조", "제2호", "상부 난간대를 120cm 이상에 설치하면 중간 난간대는 몇 단 이상 균등하게 둘까요?", 2, "단", "min", "120cm 이상 → 중간 난간대 2단 이상 균등 설치"],
  ["rail_gap", "제13조", "제2호", "상부 난간대가 120cm 이상일 때 난간의 상하 간격은 몇 cm 이하일까요?", 60, "cm", "max", "난간의 상하 간격은 60cm 이하"],
  ["rail_toe", "제13조", "제3호", "발끝막이판은 바닥면에서 몇 cm 이상 높이를 유지할까요?", 10, "cm", "min", "발끝막이판은 바닥면에서 10cm 이상"],
  ["rail_load", "제13조", "제7호", "안전난간은 가장 약한 지점에서 몇 kg 이상의 하중에 견뎌야 할까요?", 100, "kg", "min", "100kg 이상의 하중에 견디는 튼튼한 구조"],
  ["rail_pipe", "제13조", "제6호", "난간대는 지름 몇 cm 이상의 금속제 파이프(또는 그 이상 강도)여야 할까요?", 2.7, "cm", "min", "난간대는 지름 2.7cm 이상 금속제 파이프"],
  ["rail_post", "제13조", "제2호 단서", "난간기둥 간의 간격이 몇 cm 이하이면 중간 난간대를 생략할 수 있을까요?", 25, "cm", "max", "난간기둥 간격 25cm 이하면 중간 난간대 생략 가능"],
  ["net_dist", "제42조", "제2항 제1호", "추락방호망은 작업면에서 망 설치지점까지 수직거리가 몇 m를 넘지 않게 설치할까요?", 10, "m", "max", "작업면~망 수직거리 10m 이하"],
  ["net_sag", "제42조", "제2항 제2호", "추락방호망의 처짐은 짧은 변 길이의 몇 % 이상이 되게 할까요?", 12, "%", "min", "망의 처짐은 짧은 변 길이의 12% 이상"],
  ["net_over", "제42조", "제2항 제3호", "건축물 바깥쪽에 설치하는 추락방호망의 내민 길이는 벽면에서 몇 m 이상일까요?", 3, "m", "min", "내민 길이는 벽면으로부터 3m 이상"],
  ["net_mesh", "제42조", "제2항 제3호 단서", "그물코가 몇 mm 이하인 추락방호망은 낙하물 방지망을 설치한 것으로 볼까요?", 20, "mm", "max", "그물코 20mm 이하 추락방호망 = 낙하물 방지망 설치로 봄"],
  ["belt_h", "제32조", "제1항 제2호", "높이 몇 m 이상의 추락 위험 장소에서 작업할 때 안전대를 착용할까요?", 2, "m", "min", "높이·깊이 2m 이상 추락 위험 장소 작업 → 안전대"],
  ["lad_max", "제42조", "제4항 제4호", "이동식 사다리 작업은 설치한 바닥에서 높이 몇 m 이하 장소에서만 할 수 있을까요?", 3.5, "m", "max", "이동식 사다리는 높이 3.5m 이하 장소에서만 작업"],
  ["lad_ppe", "제42조", "제4항 제6호", "이동식 사다리 작업 높이가 몇 m 이상이면 안전모와 안전대를 함께 착용할까요?", 2, "m", "min", "작업 높이 2m 이상 → 안전모 + 안전대 함께"],
  ["lad_1m", "제42조", "제4항 제5호", "이동식 사다리 최상부 발판에 올라서서 작업하면 안 됩니다. 높이 몇 m 이하 사다리는 제외일까요?", 1, "m", "max", "높이 1m 이하 사다리는 최상부 발판 작업 금지에서 제외"],
  ["lad_tilt", "제24조", "제1항 제9호", "사다리식 통로(이동식)의 기울기는 몇 도 이하로 할까요?", 75, "°", "max", "사다리식 통로 기울기 75도 이하 (고정식은 90도 이하)"],
  ["lad_over", "제24조", "제1항 제7호", "사다리 상단은 걸쳐놓은 지점에서 몇 cm 이상 올라가도록 할까요?", 60, "cm", "min", "사다리 상단은 걸쳐놓은 지점에서 60cm 이상 올라가게"],
  ["lad_w", "제24조", "제1항 제5호", "사다리식 통로의 폭은 몇 cm 이상으로 할까요?", 30, "cm", "min", "사다리식 통로의 폭은 30cm 이상"],
  ["lad_wall", "제24조", "제1항 제4호", "사다리 발판과 벽 사이는 몇 cm 이상 간격을 유지할까요?", 15, "cm", "min", "발판과 벽 사이 15cm 이상"],
  ["lad_land", "제24조", "제1항 제8호", "사다리식 통로 길이가 10m 이상이면 몇 m 이내마다 계단참을 둘까요?", 5, "m", "max", "길이 10m 이상 → 5m 이내마다 계단참"],
  ["lad_back", "제24조", "제1항 제9호 가목", "높이 7m 이상 고정식 사다리는 바닥에서 몇 m 지점부터 등받이울을 설치할까요?", 2.5, "m", "eq", "높이 7m 이상 → 바닥에서 2.5m 지점부터 등받이울"],
  ["plat_w", "제56조", "제2호", "비계 작업발판의 폭은 몇 cm 이상으로 할까요?", 40, "cm", "min", "작업발판의 폭은 40cm 이상"],
  ["plat_gap", "제56조", "제2호", "작업발판 발판재료 사이의 틈은 몇 cm 이하로 할까요?", 3, "cm", "max", "발판재료 간 틈은 3cm 이하"],
  ["plat_h", "제56조", "본문", "비계 높이가 몇 m 이상인 작업장소에 작업발판을 설치할까요?", 2, "m", "min", "비계 높이 2m 이상 작업장소에는 작업발판"],
  ["col_b", "제60조", "제1호", "강관비계 비계기둥 간격은 띠장 방향으로 몇 m 이하일까요?", 1.85, "m", "max", "비계기둥 간격: 띠장 방향 1.85m 이하"],
  ["col_j", "제60조", "제1호", "강관비계 비계기둥 간격은 장선 방향으로 몇 m 이하일까요?", 1.5, "m", "max", "비계기둥 간격: 장선 방향 1.5m 이하"],
  ["bt_gap", "제60조", "제2호", "강관비계 띠장 간격은 몇 m 이하로 할까요?", 2, "m", "max", "띠장 간격은 2.0m 이하"],
  ["col_load", "제60조", "제4호", "강관비계 비계기둥 간의 적재하중은 몇 kg을 초과하지 않게 할까요?", 400, "kg", "max", "비계기둥 간 적재하중 400kg 초과 금지"],
  ["scaf_5m", "제57조", "제1항", "높이 몇 m 이상의 비계를 조립·해체할 때 관리감독자의 지휘에 따라 작업할까요?", 5, "m", "min", "달비계 또는 높이 5m 이상 비계 조립·해체 → 관리감독자 지휘"],
  ["scaf_ledge", "제57조", "제1항 제5호", "비계재료를 연결·해체할 때는 폭 몇 cm 이상의 발판을 설치하고 안전대를 쓰게 할까요?", 20, "cm", "min", "비계재료 연결·해체 시 폭 20cm 이상 발판 + 안전대"],
  ["horse_ang", "제67조", "제2호", "말비계 지주부재와 수평면의 기울기는 몇 도 이하일까요?", 75, "°", "max", "말비계 지주부재 기울기 75도 이하"],
  ["horse_h", "제67조", "제3호", "말비계 높이가 몇 m를 초과하면 작업발판 폭을 40cm 이상으로 할까요?", 2, "m", "gt", "말비계 높이 2m 초과 → 작업발판 폭 40cm 이상"],
  ["mob_load", "제68조", "제5호", "이동식비계 작업발판의 최대적재하중은 몇 kg을 초과하지 않게 할까요?", 250, "kg", "max", "이동식비계 작업발판 최대적재하중 250kg 초과 금지"],
  ["drop_h", "제14조", "제3항 제1호", "낙하물 방지망·방호선반은 높이 몇 m 이내마다 설치할까요?", 10, "m", "max", "낙하물 방지망은 높이 10m 이내마다"],
  ["drop_out", "제14조", "제3항 제1호", "낙하물 방지망의 내민 길이는 벽면에서 몇 m 이상일까요?", 2, "m", "min", "낙하물 방지망 내민 길이 벽면에서 2m 이상"],
  ["drop_ang", "제14조", "제3항 제2호", "낙하물 방지망은 수평면과 20도 이상, 몇 도 이하를 유지할까요?", 30, "°", "max", "낙하물 방지망 각도는 수평면과 20~30도"],
  ["walk_slope", "제23조", "제2호", "가설통로의 경사는 몇 도 이하로 할까요?", 30, "°", "max", "가설통로 경사 30도 이하 (계단·높이 2m 미만+손잡이는 예외)"],
  ["walk_slip", "제23조", "제3호", "가설통로 경사가 몇 도를 초과하면 미끄러지지 않는 구조로 할까요?", 15, "°", "gt", "경사 15도 초과 → 미끄러지지 않는 구조"],
];
// 글로 답하는 카드: [id, 조, 항·호, 질문, 인정 낱말들, 대표 정답, 요지]
const TF = [
  ["t_belt", "제32조", "제1항 제2호", "높이 2m 이상 추락 위험 장소 작업 시 근로자에게 착용시켜야 하는 보호구는? (안전모 말고 하나 더)", ["안전대", "안전벨트", "추락방지대", "하네스"], "안전대", "2m 이상 추락 위험 작업 → 안전대"],
  ["t_double", "제57조", "제2항", "강관비계는 원칙적으로 외줄·쌍줄 중 어떻게 조립할까요?", ["쌍줄"], "쌍줄", "강관비계·통나무비계는 쌍줄로 (발판 설치 시설이 있으면 외줄 가능)"],
  ["t_toe", "제13조", "제1호", "안전난간에서 물건이 아래로 굴러 떨어지는 것을 막으려고 바닥에 대는 부재의 이름은?", ["발끝막이판", "발끝막이", "토보드"], "발끝막이판", "안전난간 = 상부 난간대 · 중간 난간대 · 발끝막이판 · 난간기둥"],
  ["t_ks", "제42조", "제3항", "추락방호망은 어떤 기준의 성능에 적합한 것을 사용해야 할까요?", ["한국산업표준", "KS", "ks"], "한국산업표준(KS)", "추락방호망은 한국산업표준에서 정하는 성능기준에 적합한 것"],
  ["t_out", "제42조", "제4항 제2호", "이동식 사다리가 넘어지지 않게 설치하는 전도방지용 지지대를 뭐라고 할까요?", ["아웃트리거", "아웃리거"], "아웃트리거", "넘어짐 방지: 시설물에 고정 · 아웃트리거 · 다른 근로자가 지지"],
  ["open_cover", "제43조", "제1항", "개구부 덮개는 뒤집히거나 떨어지지 않게 하는 것 외에, 어두운 곳에서도 알아보도록 무엇을 해야 할까요?", ["표시", "표지", "경고"], "개구부임을 표시", "덮개는 뒤집히거나 떨어지지 않게 + 개구부임을 표시"],
  ["open_temp", "제43조", "제2항", "난간 등을 작업 때문에 임시로 해체해야 할 때 설치해야 하는 것은? (곤란하면 안전대 착용)", ["추락방호망", "방호망", "방망", "그물"], "추락방호망", "임시 해체 시 추락방호망 설치 (곤란하면 안전대 등 조치)"],
];
const F = {};
NF.forEach(r => { F[r[0]] = {id: r[0], t: "n", art: r[1], cl: r[2], q: r[3], a: r[4], u: r[5], dir: r[6], sum: r[7]}; });
TF.forEach(r => { F[r[0]] = {id: r[0], t: "x", art: r[1], cl: r[2], q: r[3], ok: r[4], ans: r[5], sum: r[6]}; });
const DIRT = {min: "이상", max: "이하", gt: "초과", eq: ""};
const need = f => f.t === "n" ? fmt(f.a) + f.u + (DIRT[f.dir] ? " " + DIRT[f.dir] : "") : f.ans;
const fmt = n => String(Math.round(n * 1000) / 1000);

/* =============== 사고 도감 =============== */
const ACC = {
  a_rail_low: {n: "난간 넘어짐 추락", ic: "🤸", art: "제13조", tip: "상부 난간대가 90cm보다 낮으면 허리 아래라 몸이 넘어갑니다."},
  a_rail_gap: {n: "난간 틈새 추락", ic: "🕳️", art: "제13조", tip: "중간 난간대가 없거나 간격이 넓으면 몸이 그 사이로 빠집니다. 120cm 이하는 중간 1단, 이상은 2단 이상·상하 간격 60cm 이하."},
  a_rail_toe: {n: "공구 낙하 사고", ic: "🪣", art: "제13조", tip: "발끝막이판(10cm 이상)이 없으면 발에 걸린 공구가 가장자리 밖으로 굴러 아래 사람을 칩니다."},
  a_open_fall: {n: "개구부 추락", ic: "🕳️", art: "제43조", tip: "경고 테이프·라바콘은 방호 조치가 아닙니다. 난간·울타리·수직형 추락방망·덮개 중 튼튼한 것으로."},
  a_open_flip: {n: "덮개 뒤집힘 추락", ic: "🟫", art: "제43조", tip: "덮개는 뒤집히거나 떨어지지 않게 고정해야 합니다."},
  a_open_lost: {n: "표시 없는 덮개 사고", ic: "👷", art: "제43조", tip: "덮개에 개구부 표시가 없으면 다른 사람이 합판인 줄 알고 치웁니다. 어두운 곳에서도 알아보게 표시."},
  a_open_temp: {n: "난간 임시 해체 중 추락", ic: "🔧", art: "제43조", tip: "난간을 잠깐 떼어낼 때는 추락방호망을 치고, 곤란하면 안전대를 착용합니다."},
  a_net_far: {n: "방호망 너무 멀어 바닥 충돌", ic: "📉", art: "제42조", tip: "망은 작업면에서 수직거리 10m 이하. 멀수록 낙하 속도가 커져 망이 못 버팁니다."},
  a_net_taut: {n: "팽팽한 방호망 반동 부상", ic: "🪀", art: "제42조", tip: "처짐이 짧은 변의 12% 이상이어야 충격을 흡수합니다. 팽팽하면 튕겨 벽에 부딪혀요."},
  a_net_short: {n: "방호망 내민 길이 부족", ic: "📏", art: "제42조", tip: "건축물 바깥쪽 추락방호망은 벽면에서 3m 이상 내밀어야 떨어지는 사람을 받습니다."},
  a_lad_back: {n: "사다리 뒤로 넘어짐", ic: "🪜", art: "제24조", tip: "사다리 기울기는 75도 이하. 너무 세우면 오르다 뒤로 넘어갑니다."},
  a_lad_short: {n: "사다리 상단 미끄러짐", ic: "🧗", art: "제24조", tip: "걸친 지점에서 60cm 이상 올라오게 해야 갈아탈 때 붙잡고 몸을 지탱합니다."},
  a_lad_narrow: {n: "좁은 사다리 발 헛디딤", ic: "👢", art: "제24조", tip: "사다리 폭은 30cm 이상이어야 발이 안정적입니다."},
  a_plat_narrow: {n: "좁은 작업발판 추락", ic: "📐", art: "제56조", tip: "작업발판 폭은 40cm 이상."},
  a_plat_gap: {n: "발판 틈 공구 낙하", ic: "🔨", art: "제56조", tip: "발판재료 간 틈은 3cm 이하. 넓으면 공구나 자재가 틈으로 떨어집니다."},
  a_scaf_span: {n: "비계 붕괴 (기둥 간격)", ic: "🏗️", art: "제60조", tip: "기둥 간격은 띠장 방향 1.85m, 장선 방향 1.5m 이하."},
  a_scaf_bt: {n: "비계 좌굴 (띠장 간격)", ic: "📎", art: "제60조", tip: "띠장 간격은 2.0m 이하."},
};
const ACC_N = Object.keys(ACC).length;

/* =============== 유틸 =============== */
function theme() {
  const g = root; if (!g) return;
  const m = (getComputedStyle(document.body).backgroundColor.match(/\d+/g) || [255, 255, 255]).map(Number);
  g.setAttribute("data-gm", (m[0] * .299 + m[1] * .587 + m[2] * .114) < 110 ? "dark" : "light");
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const L = (a, b, t) => a + (b - a) * t;
const ease = {io: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, in: t => t * t, out: t => 1 - (1 - t) * (1 - t), lin: t => t};
const REDUCE = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
let root = null, host = null, alive = false, skip = false, busy = false, svgEl = null, sayEl = null;
const $ = s => root.querySelector(s);
const wait = ms => new Promise(r => setTimeout(r, skip ? 0 : ms));
function tw(ms, fn, e) {
  e = e || ease.io;
  return new Promise(res => {
    if (!alive) return res();
    if (REDUCE || skip) { fn(1); return res(); }
    const t0 = performance.now();
    (function step(now) {
      if (!alive) return res();
      if (skip) { fn(1); return res(); }
      const p = Math.min(1, (now - t0) / ms);
      fn(e(p));
      p < 1 ? requestAnimationFrame(step) : res();
    })(t0);
  });
}
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const num = s => { const n = parseFloat(String(s).replace(/,/g, ".").replace(/[^0-9.\-]/g, "")); return Number.isFinite(n) ? n : NaN; };

/* 소리 (기본 꺼짐, 켜면 짧은 효과음 + 진동) */
let AC = null;
function beep(f, d, type, vol, delay) {
  if (!S.snd) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + (delay || 0);
    o.type = type || "sine"; o.frequency.value = f; o.connect(g); g.connect(AC.destination);
    g.gain.setValueAtTime(vol || .05, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.start(t); o.stop(t + d + .02);
  } catch (e) {}
}
const buzz = ms => { if (S.snd) try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
const sfx = {
  ok() { beep(660, .12); beep(880, .18, "sine", .05, .1); },
  bad() { beep(170, .3, "sawtooth", .05); buzz(80); },
  thud() { beep(80, .35, "square", .07); buzz(120); },
  star() { beep(784, .1); beep(988, .1, "sine", .05, .09); beep(1318, .2, "sine", .05, .18); },
};

/* =============== 스타일 =============== */
const CSS = `
.gm{--gm-sky:#d7ecfb;--gm-in:#e9edf3;--gm-grnd:#a5b894;--gm-conc:#c4cad3;--gm-conc2:#a7afbb;--gm-wall:#eadfc9;--gm-steel:#7b8696;--gm-glass:#bcd9ee;--gm-rail:#ff9f1a;--gm-rail2:#ffc15e;--gm-net:#27a36a;--gm-dark:#2a3140;--gm-void:#bfc7d3;
  --gm-good:#12a37f;--gm-bad:#e5484d;--gm-gold:#f5b50a;font-size:16px;line-height:1.5;color:var(--ink);padding:10px 0 24px;-webkit-user-select:none;user-select:none}
.gm input,.gm textarea{-webkit-user-select:text;user-select:text}
[data-gm="dark"] .gm{--gm-sky:#182638;--gm-in:#232a36;--gm-grnd:#34402d;--gm-conc:#4b5363;--gm-conc2:#394050;--gm-wall:#3d3a33;--gm-steel:#8d98ab;--gm-glass:#27425a;--gm-void:#262d3a}
.gm button{font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.gm-top{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.gm-mode{display:flex;background:var(--fill,#eef0f3);border-radius:12px;padding:3px;flex:1;max-width:260px}
.gm-mode button{flex:1;border:0;background:none;color:var(--sub);padding:7px 10px;border-radius:9px;font-weight:700;font-size:.92em}
.gm-mode button.on{background:var(--panel);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.15)}
.gm-ib{border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:10px;width:38px;height:38px;font-size:1.05em;flex:none;margin-left:auto}
.gm-ib+.gm-ib{margin-left:0}
.gm-hero{background:linear-gradient(135deg,#1c3b73,#2b6cb0 55%,#2a9d8f);color:#fff;border-radius:20px;padding:18px 18px 16px;position:relative;overflow:hidden}
.gm-hero:after{content:"⛑️";position:absolute;right:-6px;top:-10px;font-size:92px;opacity:.16;transform:rotate(-14deg)}
.gm-hero h2{margin:0;font-size:1.45em;letter-spacing:-.03em;color:#fff;border:0;padding:0}
.gm-hero p{margin:2px 0 12px;opacity:.85;font-size:.9em}
.gm-lv{display:flex;align-items:center;gap:10px;font-weight:800}
.gm-lv b{background:#fff;color:#1c3b73;border-radius:8px;padding:1px 8px;font-size:.85em}
.gm-xp{height:8px;background:rgba(255,255,255,.25);border-radius:99px;overflow:hidden;margin:8px 0 10px}
.gm-xp i{display:block;height:100%;background:#ffd24a;border-radius:99px;transition:width .6s}
.gm-stats{display:flex;gap:8px;flex-wrap:wrap;font-size:.84em}
.gm-stats span{background:rgba(255,255,255,.16);border-radius:99px;padding:3px 11px;white-space:nowrap}
.gm-alert{width:100%;margin-top:12px;border:0;border-radius:16px;padding:13px 16px;background:#fff3cf;color:#5b3d00;text-align:left;font-weight:700;box-shadow:0 2px 0 #f0cf74;display:flex;gap:10px;align-items:center}
.gm-alert small{display:block;font-weight:500;opacity:.85}
.gm-alert .sir{animation:gmsir 1s infinite}
@keyframes gmsir{50%{transform:scale(1.25) rotate(-8deg)}}
.gm-guide{margin-top:12px;background:var(--panel);border-radius:16px;padding:12px 14px;font-size:.9em;line-height:1.6;box-shadow:var(--shadow,none)}
.gm-guide b:first-child{display:block;margin-bottom:2px}
.gm-guide div b{color:var(--accent)}
.gm-sec{margin:20px 2px 8px;font-size:.84em;color:var(--sub);font-weight:700;letter-spacing:.02em}
.gm-mc{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:0;background:var(--panel);color:var(--ink);border-radius:16px;padding:13px 14px;margin-bottom:8px;box-shadow:var(--shadow,0 1px 2px rgba(0,0,0,.05));transition:transform .15s}
.gm-mc:active{transform:scale(.98)}
.gm-mn{flex:none;width:42px;height:42px;border-radius:13px;display:grid;place-items:center;font-size:1.35em;background:var(--accent-soft,#e8f3ff)}
.gm-mt{flex:1;min-width:0}
.gm-mt b{display:block;letter-spacing:-.02em}
.gm-mt small{color:var(--sub);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gm-ms{flex:none;color:var(--gm-gold);letter-spacing:1px;font-size:1.05em}
.gm-ms.z{color:var(--line)}
.gm-mc.boss{background:linear-gradient(135deg,#3a1d4a,#7a2e5a);color:#fff}
.gm-mc.boss .gm-mn{background:rgba(255,255,255,.18)}.gm-mc.boss small{color:rgba(255,255,255,.75)}
.gm-mc[disabled]{opacity:.5}
.gm-bar{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.gm-bar h3{margin:0;font-size:1.05em;letter-spacing:-.03em;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gm-back{border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:10px;padding:6px 12px;flex:none}
.gm-brief{background:var(--panel);border-radius:16px;padding:12px 14px;margin-bottom:10px;font-size:.95em;box-shadow:var(--shadow,none)}
.gm-brief b{color:var(--accent)}
.gm-stage{position:relative;border-radius:18px;overflow:hidden;margin-bottom:6px;background:var(--gm-sky)}
.gm-scene{display:block;width:100%;height:auto;max-height:62vh}
.gm-scene text{font-family:inherit}
.g-sky{fill:var(--gm-sky)}.g-in{fill:var(--gm-in)}.g-grnd{fill:var(--gm-grnd)}.g-conc{fill:var(--gm-conc)}.g-conc2{fill:var(--gm-conc2)}.g-wall{fill:var(--gm-wall)}.g-steel{fill:var(--gm-steel)}.g-glass{fill:var(--gm-glass)}
.g-rail{fill:var(--gm-rail)}.g-rail2{fill:var(--gm-rail2)}.g-toe{fill:#e98a0c}.g-void{fill:var(--gm-void)}
.g-tag{font-size:9.5px;font-weight:800;fill:var(--ink);paint-order:stroke;stroke:var(--gm-sky);stroke-width:3px;stroke-linejoin:round}
.g-cap{font-size:9px;fill:var(--sub);font-weight:700}
.g-pop{font-size:17px;font-weight:900;paint-order:stroke;stroke:#fff;stroke-width:3.5px;stroke-linejoin:round}
.gm-say{min-height:2.7em;font-weight:700;text-align:center;font-size:.95em;padding:6px 6px;color:var(--ink);letter-spacing:-.02em}
.gm-skip{position:absolute;right:8px;bottom:8px;border:0;background:rgba(0,0,0,.55);color:#fff;border-radius:99px;padding:4px 12px;font-size:.8em}
.gm-shake{animation:gmshake .45s}
@keyframes gmshake{20%{transform:translate(-5px,3px)}40%{transform:translate(5px,-3px)}60%{transform:translate(-4px,-2px)}80%{transform:translate(3px,2px)}}
.gm-flash:after{content:"";position:absolute;inset:0;background:#e5484d;opacity:0;animation:gmfl .6s;pointer-events:none}
@keyframes gmfl{20%{opacity:.35}100%{opacity:0}}
.gm-form{background:var(--panel);border-radius:18px;padding:6px 14px 12px;box-shadow:var(--shadow,none)}
.gm-f{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)}
.gm-f:last-of-type{border-bottom:0}
.gm-fl{font-weight:700;letter-spacing:-.02em}
.gm-fi{grid-column:1;display:flex;align-items:center;gap:6px}
.gm-fi input{flex:1;min-width:0;width:100%;font:inherit;font-size:1.15em;font-weight:800;padding:9px 12px;border-radius:12px;border:2px solid var(--line);background:var(--fill,#f2f4f6);color:var(--ink);font-variant-numeric:tabular-nums}
.gm-fi input:focus{outline:0;border-color:var(--accent);background:var(--panel)}
.gm-fi i{font-style:normal;color:var(--sub);font-weight:700;min-width:2.2em}
.gm-fi textarea{flex:1;min-width:0;font:inherit;padding:9px 12px;border-radius:12px;border:2px solid var(--line);background:var(--fill,#f2f4f6);color:var(--ink);resize:none;height:4.6em}
.gm-fi textarea:focus{outline:0;border-color:var(--accent);background:var(--panel)}
.gm-hint{grid-row:1;grid-column:2;border:0;background:var(--fill,#f2f4f6);border-radius:10px;width:36px;height:36px;font-size:1.05em}
.gm-hn{grid-column:1/-1;font-size:.84em;color:var(--sub)}
.gm-hn div{background:var(--accent-soft,#e8f3ff);color:var(--ink);border-radius:8px;padding:3px 9px;margin-top:3px}
.gm-chips{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:7px}
.gm-chip{border:2px solid var(--line);background:var(--fill,#f2f4f6);color:var(--ink);border-radius:13px;padding:8px 12px;font-weight:700;font-size:.92em}
.gm-chip.on{border-color:var(--accent);background:var(--accent-soft,#e8f3ff);color:var(--accent)}
.gm-slots{grid-column:1/-1;display:flex;gap:6px;font-size:.8em;color:var(--sub);font-weight:700}
.gm-slots span{border:1.5px dashed var(--line);border-radius:8px;padding:1px 9px}
.gm-shk{animation:gmshake .4s}
.gm-go{width:100%;margin-top:10px;border:0;border-radius:16px;padding:15px;font-size:1.1em;font-weight:900;background:var(--accent);color:var(--accent-ink,#fff);letter-spacing:-.02em;box-shadow:0 3px 0 var(--accent-dk,#1b64da);transition:transform .1s}
.gm-go:active{transform:translateY(2px);box-shadow:0 1px 0 var(--accent-dk,#1b64da)}
.gm-go[disabled]{opacity:.5}
.gm-res{margin-top:12px;background:var(--panel);border-radius:18px;padding:16px 16px 14px;box-shadow:var(--shadow,none);animation:gmup .35s}
@keyframes gmup{from{opacity:0;transform:translateY(14px)}}
.gm-stamp{display:inline-block;font-weight:900;font-size:1.35em;letter-spacing:-.03em;border:4px solid var(--gm-good);color:var(--gm-good);border-radius:12px;padding:2px 14px;transform:rotate(-5deg);animation:gmst .5s var(--spring,cubic-bezier(.34,1.56,.64,1))}
.gm-stamp.bad{border-color:var(--gm-bad);color:var(--gm-bad)}
@keyframes gmst{from{transform:scale(2.4) rotate(-14deg);opacity:0}}
.gm-stars{font-size:1.6em;color:var(--gm-gold);letter-spacing:2px;margin:4px 0}
.gm-stars .z{color:var(--line)}
.gm-ck{list-style:none;margin:8px 0;padding:0}
.gm-ck li{display:flex;gap:8px;padding:7px 0;border-top:1px dashed var(--line);font-size:.93em}
.gm-ck li:first-child{border-top:0}
.gm-ck b.o{color:var(--gm-good)}.gm-ck b.x{color:var(--gm-bad)}
.gm-ck small{display:block;color:var(--sub)}
.gm-less{background:var(--accent-soft,#e8f3ff);border-radius:12px;padding:10px 12px;font-size:.9em;margin:8px 0}
.gm-less div+div{margin-top:4px}
.gm-new{display:inline-block;background:#fff3cf;color:#5b3d00;border-radius:99px;padding:2px 10px;font-size:.82em;font-weight:800;margin:2px 4px 2px 0}
.gm-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.gm-btns button{flex:1;min-width:30%;border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:13px;padding:11px 8px;font-weight:700}
.gm-btns button.pri{background:var(--accent);border-color:var(--accent);color:var(--accent-ink,#fff)}
.gm-dex{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.gm-dc{background:var(--panel);border-radius:16px;padding:12px;font-size:.88em;box-shadow:var(--shadow,none)}
.gm-dc .ic{font-size:2em;line-height:1.1}
.gm-dc b{display:block;margin:2px 0;letter-spacing:-.02em}
.gm-dc.lock{opacity:.55;text-align:center}
.gm-dc button{margin-top:6px;border:0;background:var(--fill,#f2f4f6);color:var(--ink);border-radius:8px;padding:3px 9px;font-size:.9em}
.gm-iq{background:var(--panel);border-radius:20px;padding:16px;box-shadow:var(--shadow,none);margin-top:8px}
.gm-hud{display:flex;align-items:center;gap:10px;font-weight:800;font-size:.95em}
.gm-hud .sp{flex:1}
.gm-tmr{height:8px;border-radius:99px;background:var(--line);overflow:hidden;margin:8px 0 12px}
.gm-tmr i{display:block;height:100%;width:100%;background:var(--gm-good);transform-origin:left}
.gm-iqs{display:flex;gap:10px;align-items:flex-start}
.gm-iqs svg{flex:none;width:76px;height:auto}
.gm-bub{background:var(--fill,#f2f4f6);border-radius:4px 16px 16px 16px;padding:11px 13px;font-weight:700;letter-spacing:-.02em;flex:1}
.gm-bub small{display:block;color:var(--sub);font-weight:600;margin-bottom:2px}
.gm-fb{margin-top:12px;border-radius:14px;padding:11px 13px;font-size:.93em;animation:gmup .25s}
.gm-fb.o{background:#dff6ec;color:#0a5b44}.gm-fb.x{background:#fde7e8;color:#8b1d22}
[data-gm="dark"] .gm .gm-fb.o{background:#123a2d;color:#9ee7c9}[data-gm="dark"] .gm .gm-fb.x{background:#40191c;color:#ffb3b6}[data-gm="dark"] .gm .gm-alert{background:#4a3b12;color:#ffe9a8;box-shadow:0 2px 0 #6a5420}[data-gm="dark"] .gm .gm-new{background:#4a3b12;color:#ffe9a8}
.gm-note{font-size:.8em;color:var(--sub);margin:18px 4px 0;line-height:1.55}
@media (prefers-reduced-motion:reduce){.gm *{animation:none!important;transition:none!important}}
`;

/* =============== 그림 부품 =============== */
function wkr(name, x, y, h, o) {
  o = o || {};
  const vest = o.vest || "#ff8a1f", hat = o.hat || "#ffd21f", k = (h / 99).toFixed(4);
  return `<g data-wk="${name}" data-r="${name}" data-h="${h}" data-k="${k}" transform="translate(${x} ${y}) scale(${k})">` +
    `<rect x="-6.5" y="-46" width="5.8" height="43" rx="2.4" fill="#34425e"/><rect x="0.7" y="-46" width="5.8" height="43" rx="2.4" fill="#34425e"/>` +
    `<rect x="-8" y="-4" width="8" height="4" rx="1.5" fill="#1d2433"/><rect x="0" y="-4" width="8" height="4" rx="1.5" fill="#1d2433"/>` +
    `<path d="M-10 -73 L-17 -50" stroke="${vest}" stroke-width="6" stroke-linecap="round"/><path d="M10 -73 L17 -50" stroke="${vest}" stroke-width="6" stroke-linecap="round"/>` +
    `<circle cx="-17" cy="-48" r="3.2" fill="#f1c7a0"/><circle cx="17" cy="-48" r="3.2" fill="#f1c7a0"/>` +
    `<rect x="-10.5" y="-77" width="21" height="34" rx="5" fill="${vest}"/><rect x="-10.5" y="-62" width="21" height="3.2" fill="#fff" opacity=".9"/>` +
    (o.belt ? `<path d="M-10 -73 L10 -45" stroke="#222" stroke-width="2.4"/><path d="M10 -73 L-10 -45" stroke="#222" stroke-width="2.4"/>` : "") +
    `<rect x="-3" y="-81" width="6" height="5" fill="#f1c7a0"/><circle cx="0" cy="-87" r="8.6" fill="#f1c7a0"/>` +
    `<path d="M-10 -89 a10 10 0 0 1 20 0 z" fill="${hat}"/><rect x="-11.6" y="-90" width="23.2" height="3.2" rx="1.6" fill="${hat}"/>` +
    `<g class="wk-ok"><circle cx="-3.3" cy="-86.5" r="1.2" fill="#1d2433"/><circle cx="3.3" cy="-86.5" r="1.2" fill="#1d2433"/><path d="M-3 -82.5 q3 2.4 6 0" stroke="#1d2433" stroke-width="1" fill="none"/></g>` +
    `<g class="wk-x" style="display:none"><path d="M-5 -88.5 l3.4 3.4 m0 -3.4 l-3.4 3.4 M1.6 -88.5 l3.4 3.4 m0 -3.4 l-3.4 3.4" stroke="#1d2433" stroke-width="1.2"/><ellipse cx="0" cy="-82" rx="2.2" ry="1.6" fill="#1d2433"/></g></g>`;
}
function bind(svg) {
  svg.querySelectorAll("[data-wk]").forEach(el => { el.__h = +el.dataset.h; el.__k = +el.dataset.k; });
}
const R = (svg, n) => svg.querySelector(`[data-r="${n}"]`);
function setT(el, x, y, r, s) {
  const k = el.__k * (s || 1);
  el.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(r || 0).toFixed(1)} 0 ${(-el.__h * .5).toFixed(1)}) scale(${k.toFixed(4)})`);
}
function mv(el, x, y, r) { el.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(r || 0).toFixed(1)})`); }
function hurt(el) { const ok = el.querySelector(".wk-ok"), x = el.querySelector(".wk-x"); if (ok) ok.style.display = "none"; if (x) x.style.display = ""; }
function rotPt(x, y, cx, cy, deg) { const a = deg * Math.PI / 180, dx = x - cx, dy = y - cy; return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)]; }
async function walk(el, x0, x1, y, ms) {
  await tw(ms, t => { const ph = t * ms / 125; setT(el, L(x0, x1, t), y - Math.abs(Math.sin(ph)) * 1.6, Math.sin(ph) * 2.2); }, ease.lin);
  setT(el, x1, y, 0);
}
function pop(svg, x, y, txt, col) {
  const g = document.createElementNS(NS, "text");
  g.setAttribute("x", x); g.setAttribute("y", y); g.setAttribute("text-anchor", "middle"); g.setAttribute("class", "g-pop"); g.setAttribute("fill", col || "#e5484d");
  g.textContent = txt; svg.appendChild(g);
  tw(1100, t => { g.setAttribute("y", y - 22 * t); g.setAttribute("opacity", 1 - t * t); }, ease.out).then(() => g.remove());
}
function shake() { if (!svgEl || REDUCE) return; const st = svgEl.parentNode; st.classList.remove("gm-shake", "gm-flash"); void st.offsetWidth; st.classList.add("gm-shake", "gm-flash"); }
function say(t) { if (sayEl) sayEl.textContent = t; }
const rc = (cls, x, y, w, h, extra) => `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" ${extra || ""}/>`;

/* =============== 의뢰 1: 안전난간 (제13조) =============== */
const M1 = {
  y0: 120, gy: 262,
  draw(v) {
    const Y0 = this.y0, GY = this.gy, k = .5;
    let s = rc("g-sky", 0, 0, 360, 280) + rc("g-in", 0, 0, 360, Y0);
    s += rc("g-conc2", 14, Y0 - 100, 12, 100) + rc("g-conc2", 334, Y0 - 100, 12, 100);
    s += rc("g-conc2", 0, Y0 - 104, 360, 6);
    s += rc("g-conc", 0, Y0, 360, 20) + rc("g-wall", 0, Y0 + 20, 360, GY - Y0 - 20);
    [34, 146, 258].forEach(x => { s += rc("g-glass", x, Y0 + 40, 64, 44, 'rx="3"') + rc("g-conc", x - 3, Y0 + 84, 70, 4); });
    s += rc("g-grnd", 0, GY, 360, 18);
    s += `<g><rect class="g-steel" x="250" y="${Y0 - 6}" width="46" height="3.5" rx="1.7"/><rect class="g-steel" x="250" y="${Y0 - 2.5}" width="46" height="3.5" rx="1.7"/></g>`;
    s += `<text x="352" y="${Y0 + 124}" text-anchor="end" class="g-cap">추락 높이 약 5m ↕</text>`;
    s += wkr("w2", 214, 276, 44, {vest: "#3b82f6", hat: "#fff"});
    s += wkr("w1", 70, Y0 - 2, 85);
    const top = v.top, mids = Math.round(v.mids), toe = v.toe;
    const hasTop = Number.isFinite(top) && top > 0;
    if (hasTop) {
      const th = Math.min(top, 220) * k, ty = Y0 - th;
      s += `<g data-r="rail">`;
      [40, 170, 300].forEach(x => { s += rc("g-rail", x - 2, ty - 1, 4, th + 1); });
      s += rc("g-rail", 38, ty - 2, 266, 4, 'rx="2"');
      if (Number.isFinite(mids)) for (let i = 1; i <= Math.min(mids, 8); i++) s += rc("g-rail2", 38, Y0 - th * i / (mids + 1) - 1.5, 266, 3, 'rx="1.5"');
      s += `</g><text x="308" y="${ty + 4}" class="g-tag">상부 ${fmt(top)}cm</text>`;
      if (Number.isFinite(mids) && mids > 0) s += `<text x="308" y="${Y0 - th / 2 + 4}" class="g-tag">중간 ${mids}단</text>`;
    }
    if (Number.isFinite(toe) && toe > 0) {
      const tw_ = Math.min(toe, 40) * k;
      s += rc("g-toe", 38, Y0 - tw_, 266, tw_, 'data-r="toe"') + `<text x="308" y="${Y0 - 1}" class="g-tag">발끝 ${fmt(toe)}cm</text>`;
    }
    return s;
  },
  eval(v) {
    const c = [], top = v.top, mids = Math.round(v.mids), toe = v.toe;
    const okT = top >= 90;
    c.push({f: "rail_top", label: "상부 난간대 높이", ok: okT, dir: okT ? null : "up", val: fmt(top) + "cm", need: "90cm 이상", acc: "a_rail_low"});
    let okM, nd;
    if (top <= 120) { okM = mids >= 1; nd = "상부 120cm 이하 → 중간 난간대 1단 이상(중간 지점)"; }
    else { const gap = top / (mids + 1); okM = mids >= 2 && gap <= 60; nd = "상부 120cm 이상 → 2단 이상 균등, 상하 간격 60cm 이하" + (mids >= 2 ? ` (지금 간격 ${Math.round(gap)}cm)` : ""); }
    c.push({f: top <= 120 ? "rail_hi" : "rail_mid", f2: top > 120 ? "rail_gap" : null, label: "중간 난간대", ok: okM, dir: okM ? null : "up", dtxt: "▲ 단이 더 필요해요", val: mids + "단", need: nd, acc: "a_rail_gap"});
    const okE = toe >= 10;
    c.push({f: "rail_toe", label: "발끝막이판 높이", ok: okE, dir: okE ? null : "up", val: fmt(toe) + "cm", need: "10cm 이상", acc: "a_rail_toe"});
    return c;
  },
  async play(svg, v, res) {
    const Y0 = this.y0, GY = this.gy, w = R(svg, "w1"), w2 = R(svg, "w2");
    const bad = a => res.some(c => !c.ok && c.acc === a);
    say("작업자가 철근을 들고 슬래브 가장자리로 이동합니다…");
    await walk(w, 70, 205, Y0 - 2, 1500);
    if (bad("a_rail_low")) {
      say("난간이 허리보다 낮아요… 몸이 앞으로 쏠립니다!");
      await tw(420, t => setT(w, 205 + 6 * t, Y0 - 2, 24 * t));
      svg.appendChild(w); sfx.bad();
      await tw(1050, t => setT(w, 211 + 26 * t, (Y0 - 2) + (GY + 4 - (Y0 - 2)) * t * t, 24 + 170 * t), ease.lin);
      hurt(w); shake(); sfx.thud(); pop(svg, 237, GY - 14, "쿵!");
      say("💥 난간이 낮아 몸이 넘어가며 추락했습니다.");
    } else if (bad("a_rail_gap")) {
      say("중간 난간대가 부족해요… 발이 미끄러집니다!");
      await tw(380, t => setT(w, 205, Y0 - 2, -9 * t));
      await tw(520, t => setT(w, 205 + 4 * t, Y0 - 2 + 8 * t, -9 + 99 * t));
      svg.appendChild(w); sfx.bad();
      await tw(900, t => setT(w, 209 + 8 * t, Y0 + 6 + (GY + 8 - Y0 - 6) * t * t, 90 + 40 * t), ease.lin);
      hurt(w); shake(); sfx.thud(); pop(svg, 220, GY - 14, "쿵!");
      say("💥 난간 사이 빈 공간으로 몸이 빠져 추락했습니다.");
    } else if (bad("a_rail_toe")) {
      say("작업자가 가장자리에서 일하는 중, 발에 페인트 통이 걸립니다…");
      const can = document.createElementNS(NS, "g"); can.setAttribute("data-r", "can");
      can.innerHTML = `<rect x="-6" y="-12" width="12" height="12" rx="2" fill="#3b82f6"/><rect x="-6" y="-12" width="12" height="3" fill="#93c5fd"/>`;
      svg.insertBefore(can, R(svg, "rail")); mv(can, 222, Y0 - 3, 0);
      await tw(500, t => setT(w, 205 + 8 * t, Y0 - 2, 5 * t));
      await tw(750, t => mv(can, 222 + 12 * t, Y0 - 3, 40 * t));
      svg.appendChild(can); sfx.bad();
      say("통이 가장자리 밖으로 굴러 떨어집니다. 아래에는 다른 근로자가…");
      await tw(900, t => mv(can, 234 - 20 * t, Y0 - 3 + (232 - Y0) * t * t, 40 + 360 * t), ease.lin);
      hurt(w2); shake(); sfx.thud(); pop(svg, 214, 196, "퍽!");
      await tw(300, t => setT(w2, 214, 276, 20 * t));
      can.remove();
      say("💥 발끝막이판이 없어 공구가 떨어져 아래 근로자가 다쳤습니다.");
    } else {
      say("가장자리에 기대 작업을 이어갑니다…");
      await tw(500, t => setT(w, 205 + 6 * t, Y0 - 2, 9 * t));
      await wait(500);
      sfx.ok(); pop(svg, 250, Y0 - 120, "✔ 튼튼!", "#12a37f");
      say("🟢 난간이 몸을 받쳐 줍니다. 오늘도 무사고!");
    }
  },
};

/* =============== 의뢰 2: 개구부 (제43조) =============== */
const PICKS = [
  {id: "rail", ic: "🚧", t: "안전난간"}, {id: "fence", ic: "🔲", t: "울타리"}, {id: "vnet", ic: "🕸️", t: "수직형 추락방망"},
  {id: "cover", ic: "🟫", t: "덮개"}, {id: "tape", ic: "⚠️", t: "경고 테이프"}, {id: "cone", ic: "🔺", t: "라바콘만"},
];
const hasKw = (txt, arr) => { const t = String(txt || "").replace(/\s+/g, ""); return arr.some(k => t.includes(k)); };
const KW_FIX = ["고정", "체결", "못", "볼트", "나사", "용접", "결박", "묶", "움직이지", "미끄러지지", "밀리지", "뒤집히지", "뒤집", "떨어지지", "탈락", "이탈", "눌러", "무거운", "피스", "클램프"];
const KW_MARK = ["표시", "표지", "표기", "경고", "적색", "빨간", "빨강", "야광", "반사", "도색", "페인트", "식별", "스티커", "알림", "안내"];
const KW_NET = ["방호망", "방망", "그물", "네트", "추락방호"];
const KW_BELT = ["안전대", "안전벨트", "벨트", "하네스", "생명줄", "안전고리"];
const M2 = {
  y: 110,
  draw(v, res) {
    const Y = this.y, pick = v.pick;
    let s = rc("g-sky", 0, 0, 360, 260) + rc("g-in", 0, 0, 360, Y);
    s += rc("g-conc", 0, Y, 126, 16) + rc("g-conc", 234, Y, 126, 16);
    s += rc("g-void", 126, Y, 108, 118);
    s += rc("g-conc", 0, 226, 360, 14) + rc("g-wall", 0, 240, 360, 20);
    s += rc("g-conc2", 120, Y + 16, 6, 110) + rc("g-conc2", 234, Y + 16, 6, 110);
    s += `<text x="180" y="190" text-anchor="middle" class="g-cap">개구부 (아래층까지 약 4m)</text>`;
    s += wkr("w2", 330, Y - 1, 70, {vest: "#3b82f6", hat: "#fff"});
    s += wkr("w1", 30, Y - 1, 70);
    if (pick === "rail") {
      s += `<g data-r="guard">` + [114, 246].map(x => rc("g-rail", x - 2, Y - 42, 4, 42)).join("") + rc("g-rail", 110, Y - 43, 140, 4, 'rx="2"') + rc("g-rail2", 110, Y - 22, 140, 3, 'rx="1.5"') + `</g>`;
    } else if (pick === "fence") {
      s += `<g data-r="guard">` + rc("g-steel", 108, Y - 44, 144, 44, 'opacity=".25"') + [108, 252].map(x => rc("g-steel", x - 2, Y - 44, 4, 44)).join("") +
        Array.from({length: 7}, (_, i) => `<line x1="${112 + i * 22}" y1="${Y - 44}" x2="${112 + i * 22}" y2="${Y}" stroke="var(--gm-steel)" stroke-width="2"/>`).join("") + rc("g-steel", 108, Y - 46, 144, 4) + `</g>`;
    } else if (pick === "vnet") {
      s += `<g data-r="guard">` + rc("g-net", 110, Y - 46, 140, 46, 'fill="#27a36a" opacity=".22"') + [110, 250].map(x => rc("g-rail", x - 2, Y - 48, 4, 48)).join("") +
        Array.from({length: 8}, (_, i) => `<line x1="${110 + i * 20}" y1="${Y - 46}" x2="${110 + i * 20}" y2="${Y}" stroke="#27a36a" stroke-width="1.4"/>`).join("") +
        Array.from({length: 4}, (_, i) => `<line x1="110" y1="${Y - 46 + i * 12}" x2="250" y2="${Y - 46 + i * 12}" stroke="#27a36a" stroke-width="1.4"/>`).join("") + `</g>`;
    } else if (pick === "cover") {
      const fixed = res ? res.fixed : false, mark = res ? res.mark : false;
      s += `<g data-r="cover">` + rc("", 122, Y - 5, 116, 7, 'fill="#c8975a" rx="1.5"') +
        (mark ? Array.from({length: 7}, (_, i) => `<path d="M${126 + i * 16} ${Y - 5} l8 0 l-6 7 l-8 0z" fill="#e5484d"/>`).join("") : "") +
        (fixed ? rc("", 128, Y - 8, 5, 4, 'fill="#555"') + rc("", 226, Y - 8, 5, 4, 'fill="#555"') : "") + `</g>`;
    } else if (pick === "tape") {
      s += `<g data-r="guard">` + [112, 248].map(x => rc("g-steel", x - 1.5, Y - 36, 3, 36)).join("") + `<path data-r="tape" d="M112 ${Y - 30} L248 ${Y - 30}" stroke="#f5b50a" stroke-width="4" stroke-dasharray="8 6"/></g>`;
    } else if (pick === "cone") {
      s += `<g data-r="guard">` + [118, 242].map(x => `<path d="M${x - 8} ${Y} L${x} ${Y - 26} L${x + 8} ${Y}z" fill="#ff6b2c"/><rect x="${x - 6}" y="${Y - 14}" width="12" height="4" fill="#fff"/>`).join("") + `</g>`;
    }
    return s;
  },
  fields(v) {
    const f = [{id: "pick", t: "pick", label: "개구부(바닥 구멍)를 어떻게 막을까요?", opts: PICKS, hints: ["근거: 제43조 제1항 (개구부 등의 방호 조치)", "'충분한 강도'로 '튼튼하게' 설치하는 것 4가지가 있어요 (난간·울타리·방망·덮개 중에서)"]}];
    if (v.pick === "cover") f.push({id: "txt", t: "kw", label: "덮개를 설치할 때 지켜야 할 것 두 가지를 쓰세요", slots: 2, ph: "예) …하게 하고, …한다", hints: ["근거: 제43조 제1항 후단", "하나는 '뒤집히거나 떨어지지 않게', 다른 하나는 '어두운 곳에서도 알아보도록'", "고정 / 표시 — 이 두 낱말이 핵심이에요"]});
    else if (v.pick && v.pick !== "tape" && v.pick !== "cone") f.push({id: "txt", t: "kw", label: "그런데 작업 때문에 난간 등을 잠깐 떼어내야 한다면, 어떤 조치를 할까요?", slots: 1, ph: "한 가지만 써도 돼요", hints: ["근거: 제43조 제2항", "그물 같은 것을 설치해요 (제42조 제2항 기준)", "추락방호망, 곤란하면 안전대 착용"]});
    return f;
  },
  eval(v) {
    const c = [], p = v.pick, good = ["rail", "fence", "vnet", "cover"].includes(p);
    c.push({f: "open_cover", label: "방호 조치", ok: good, dir: good ? null : "x", dtxt: "✘ 방호 조치로 인정되지 않아요", val: (PICKS.find(x => x.id === p) || {}).t, need: "난간 · 울타리 · 수직형 추락방망 · 덮개 중 튼튼하게", acc: "a_open_fall", noSrs: true});
    const txt = v.txt || "";
    if (good && p === "cover") {
      const fx = hasKw(txt, KW_FIX), mk = hasKw(txt, KW_MARK);
      c.push({f: "open_cover", label: "덮개 고정", ok: fx, dir: fx ? null : "x", val: fx ? "고정 ✔" : "빠짐", need: "뒤집히거나 떨어지지 않도록 설치", acc: "a_open_flip", noSrs: true});
      c.push({f: "open_cover", label: "개구부 표시", ok: mk, dir: mk ? null : "x", val: mk ? "표시 ✔" : "빠짐", need: "어두운 곳에서도 알아볼 수 있게 개구부임을 표시", acc: "a_open_lost"});
      c.fixed = fx; c.mark = mk;
    } else if (good) {
      const ok = hasKw(txt, KW_NET) || hasKw(txt, KW_BELT);
      c.push({f: "open_temp", label: "임시 해체 시 조치", ok, dir: ok ? null : "x", val: txt.trim().slice(0, 18) || "(빈칸)", need: "추락방호망 설치 (곤란하면 안전대 착용)", acc: "a_open_temp"});
    }
    return c;
  },
  async play(svg, v, res) {
    const Y = this.y, w = R(svg, "w1"), p = v.pick, bad = a => res.some(c => !c.ok && c.acc === a);
    say("작업자가 개구부 쪽으로 걸어갑니다…");
    if (!res[0].ok) {
      await walk(w, 30, 118, Y - 1, 1300);
      const tp = R(svg, "tape"); if (tp) tp.setAttribute("stroke-dasharray", "2 14");
      say("방호 조치가 없다시피 해서 그대로 들어섭니다…");
      await walk(w, 118, 150, Y - 1, 450);
      svg.appendChild(w); sfx.bad();
      await tw(800, t => setT(w, 150 + 14 * t, Y - 1 + 118 * t * t, 70 * t), ease.lin);
      hurt(w); shake(); sfx.thud(); pop(svg, 165, 214, "쿵!");
      say("💥 경고 테이프·라바콘은 방호 조치가 아니에요. 개구부로 추락했습니다.");
    } else if (p === "cover") {
      const cov = R(svg, "cover");
      await walk(w, 30, 135, Y - 1, 1300);
      if (bad("a_open_flip")) {
        say("덮개가 고정되어 있지 않아요… 밟는 순간!");
        await walk(w, 135, 165, Y - 1, 500);
        sfx.bad();
        await tw(260, t => cov.setAttribute("transform", `rotate(${-35 * t} 130 ${Y - 3})`));
        svg.appendChild(w);
        await tw(850, t => { setT(w, 165 + 8 * t, Y - 1 + 118 * t * t, 60 * t); cov.setAttribute("transform", `translate(${22 * t} ${120 * t * t}) rotate(${-35 - 60 * t} 130 ${Y - 3})`); }, ease.lin);
        hurt(w); shake(); sfx.thud(); pop(svg, 175, 214, "쿵!");
        say("💥 덮개가 뒤집히며 함께 추락했습니다. 덮개는 단단히 고정해야 해요.");
      } else if (bad("a_open_lost")) {
        await walk(w, 135, 230, Y - 1, 900);
        await walk(w, 230, 160, Y - 1, 700);
        say("다음 날 아침… 표시가 없는 덮개를 다른 업체가 합판인 줄 알고 치웁니다.");
        const w2 = R(svg, "w2");
        await walk(w2, 330, 262, Y - 1, 700);
        await tw(900, t => cov.setAttribute("transform", `translate(${130 * t} ${-4 * Math.sin(t * Math.PI)})`));
        say("그 사실을 모르는 작업자가 다시 이 길로 오는데…");
        await walk(w, 160, 165, Y - 1, 80);
        await walk(w, 165, 190, Y - 1, 450); sfx.bad();
        svg.appendChild(w);
        await tw(800, t => setT(w, 190 + 10 * t, Y - 1 + 118 * t * t, 70 * t), ease.lin);
        hurt(w); shake(); sfx.thud(); pop(svg, 200, 214, "쿵!");
        say("💥 개구부 표시가 없어 덮개가 치워진 줄 모르고 추락했습니다.");
      } else {
        await walk(w, 135, 215, Y - 1, 900);
        await walk(w, 215, 300, Y - 1, 900);
        sfx.ok(); pop(svg, 180, Y - 70, "✔ 튼튼!", "#12a37f");
        say("🟢 덮개가 단단히 고정되고 표시도 되어 있어 안전하게 건넜습니다.");
      }
    } else {
      await walk(w, 30, 96, Y - 1, 1100);
      if (bad("a_open_temp")) {
        say("그런데 자재를 옮기려고 난간을 잠깐 떼어냅니다. 아무 조치 없이…");
        const g = R(svg, "guard");
        await tw(500, t => { g.setAttribute("opacity", 1 - t); });
        await walk(w, 96, 150, Y - 1, 650);
        sfx.bad(); svg.appendChild(w);
        await tw(820, t => setT(w, 150 + 12 * t, Y - 1 + 118 * t * t, 70 * t), ease.lin);
        hurt(w); shake(); sfx.thud(); pop(svg, 165, 214, "쿵!");
        say("💥 난간을 임시로 떼어낼 땐 추락방호망(곤란하면 안전대)이 꼭 필요해요.");
      } else {
        say("작업자는 방호 설비 앞에서 멈춰 안전하게 돌아갑니다. 난간을 잠깐 떼어낼 때도 방호망·안전대가 준비돼 있어요.");
        await wait(500);
        await walk(w, 96, 60, Y - 1, 700);
        sfx.ok(); pop(svg, 120, Y - 70, "✔ 안전!", "#12a37f");
      }
    }
  },
};

/* =============== 의뢰 3: 추락방호망 (제42조 제2항) =============== */
const M3 = {
  py: 30, gy: 252, wx: 64,
  netY(v) { const d = Number.isFinite(v.dist) ? Math.max(0, Math.min(v.dist, 11.1)) : 5; return this.py + d * 20; },
  netD(x1, y, ctrl) { return `M${this.wx} ${y} Q${(this.wx + x1) / 2} ${ctrl} ${x1} ${y}`; },
  draw(v) {
    const PY = this.py, GY = this.gy, WX = this.wx;
    let s = rc("g-sky", 0, 0, 360, 270) + rc("g-conc", 0, 0, WX, GY) + rc("g-grnd", 0, GY, 360, 18);
    for (let i = 0; i < 4; i++) s += rc("g-glass", 14, 18 + i * 60 + 20, 34, 22, 'rx="2"') + rc("g-conc2", 0, 60 + i * 60, WX, 3);
    s += rc("g-steel", WX, PY, 48, 4, 'rx="1"') + rc("g-steel", WX + 44, PY, 3, 14) + rc("g-steel", WX + 10, PY, 3, 14);
    s += `<text x="${WX + 62}" y="${PY - 6}" class="g-cap">작업면</text>`;
    s += wkr("w2", 300, GY + 10, 28, {vest: "#3b82f6", hat: "#fff"});
    s += wkr("w1", WX + 36, PY, 34);
    const has = Number.isFinite(v.dist) && Number.isFinite(v.sag) && Number.isFinite(v.over);
    if (Number.isFinite(v.dist)) {
      const ny = this.netY(v), oh = Number.isFinite(v.over) ? Math.max(0, Math.min(v.over, 6)) : 2, x1 = WX + oh * 20;
      const sg = Number.isFinite(v.sag) ? Math.max(0, Math.min(v.sag, 40)) : 8;
      s += `<path data-r="net" d="${this.netD(x1, ny, ny + 2 * sg)}" fill="none" stroke="var(--gm-net)" stroke-width="3.4" stroke-dasharray="4 2.2" stroke-linecap="round"/>`;
      s += rc("g-steel", x1 - 1.5, ny - 10, 3, 14, 'data-r="post"') + rc("g-steel", WX - 3, ny - 2, 6, 5);
      s += `<line x1="${WX + 80}" y1="${PY + 2}" x2="${WX + 80}" y2="${ny}" stroke="var(--ink)" stroke-width="1" stroke-dasharray="3 3" opacity=".55"/>`;
      s += `<text x="${WX + 86}" y="${(PY + ny) / 2 + 3}" class="g-tag">수직거리 ${fmt(v.dist)}m</text>`;
      if (Number.isFinite(v.over)) s += `<text x="${(WX + x1) / 2}" y="${ny + 2 * sg / 2 + 22}" text-anchor="middle" class="g-tag">내민 ${fmt(v.over)}m</text>`;
      if (Number.isFinite(v.sag)) s += `<text x="${x1 + 8}" y="${ny + 6}" class="g-tag">처짐 ${fmt(v.sag)}%</text>`;
    }
    s += `<text x="352" y="14" text-anchor="end" class="g-cap">짧은 변 5m 망 기준</text>`;
    return s;
  },
  eval(v) {
    const c = [];
    const o1 = v.dist <= 10, o2 = v.sag >= 12, o3 = v.over >= 3;
    c.push({f: "net_dist", label: "작업면~망 수직거리", ok: o1, dir: o1 ? null : "down", val: fmt(v.dist) + "m", need: "10m 이하", acc: "a_net_far"});
    c.push({f: "net_sag", label: "망의 처짐", ok: o2, dir: o2 ? null : "up", val: fmt(v.sag) + "%", need: "짧은 변의 12% 이상", acc: "a_net_taut"});
    c.push({f: "net_over", label: "벽면에서 내민 길이", ok: o3, dir: o3 ? null : "up", val: fmt(v.over) + "m", need: "3m 이상", acc: "a_net_short"});
    return c;
  },
  async play(svg, v, res) {
    const PY = this.py, GY = this.gy, WX = this.wx, w = R(svg, "w1"), net = R(svg, "net"), post = R(svg, "post");
    const ny = this.netY(v), oh = Math.max(0, Math.min(v.over, 6)), x1 = WX + oh * 20, sg = Math.max(0, Math.min(v.sag, 40));
    const bad = a => res.some(c => !c.ok && c.acc === a);
    const nd = (c, e) => net.setAttribute("d", this.netD(x1, ny, c));
    const midY = c => (ny + c) / 2;
    say("외벽 작업 중 작업자가 발판 끝에서 균형을 잃습니다!");
    await walk(w, WX + 36, WX + 46, PY, 500);
    await tw(420, t => setT(w, WX + 46 + 4 * t, PY, 28 * t));
    svg.appendChild(w); sfx.bad();
    if (bad("a_net_far")) {
      const lx = WX + 56;
      say("망이 너무 아래에 있어요. 떨어지는 속도가 붙는데…");
      await tw(950, t => setT(w, WX + 50 + (lx - WX - 50) * t, PY + (ny - 6 - PY) * t * t, 28 + 120 * t), ease.in);
      await tw(700, t => { const c = L(ny + 2 * sg, GY + 50, t); nd(c); setT(w, lx, Math.min(midY(c) - 2 + 0, GY - 2) + 0, 148 + 40 * t); post.setAttribute("y", ny - 10 + 4 * t); }, ease.in);
      hurt(w); shake(); sfx.thud(); pop(svg, lx, GY - 22, "쿵!");
      say("💥 수직거리가 10m를 넘어 망이 충격을 못 견디고 바닥에 부딪혔습니다.");
    } else if (bad("a_net_short")) {
      const lx = x1 + 12;
      say("망이 벽에서 충분히 나와 있지 않아요. 몸이 망 바깥으로…");
      await tw(1000, t => setT(w, WX + 50 + (lx - WX - 50) * t, PY + (ny - PY) * Math.min(1, t * 1.05) * t + (GY - 2 - ny) * Math.max(0, t - .55) * 2.2 * t, 28 + 200 * t), ease.in);
      setT(w, lx, GY - 2, 226); hurt(w); shake(); sfx.thud(); pop(svg, lx, GY - 22, "쿵!");
      say("💥 내민 길이가 3m 미만이라 떨어지는 몸이 망을 비껴가 바닥에 추락했습니다.");
    } else {
      const lx = (WX + x1) / 2;
      await tw(900, t => setT(w, WX + 50 + (lx - WX - 50) * t, PY + (ny + sg - 4 - PY) * t * t, 28 + 50 * t), ease.in);
      if (bad("a_net_taut")) {
        say("망이 팽팽해서 충격을 흡수하지 못하고 튕겨 올라갑니다!");
        sfx.bad();
        await tw(720, t => { setT(w, L(lx, WX + 14, t), midY(ny + 2 * sg) - 4 - 80 * Math.sin(t * Math.PI), 78 + 220 * t); nd(ny + 2 * sg + 6 * Math.sin(t * Math.PI)); }, ease.lin);
        hurt(w); shake(); sfx.thud(); pop(svg, WX + 20, ny - 70, "쿵!");
        await tw(500, t => setT(w, L(WX + 14, lx, t), midY(ny + 2 * sg) - 3, 298));
        say("💥 처짐이 12% 미만이면 반동이 커서 다치거나 벽에 부딪힙니다.");
      } else {
        sfx.ok();
        await tw(1150, t => { const c = ny + 2 * (sg + 8 * Math.exp(-3.2 * t) * Math.cos(t * 5 * Math.PI)); nd(c); setT(w, lx, midY(c) - 3, 78 + 12 * t); }, ease.lin);
        say("🟢 망이 충격을 부드럽게 받아냈습니다. 작업자는 다치지 않았어요!");
        pop(svg, lx, ny - 20, "✔ 안전!", "#12a37f");
      }
    }
  },
};

/* =============== 의뢰 4: 사다리식 통로 (제24조) =============== */
const M4 = {
  gy: 226, wx: 250, ry: 70,
  geo(v) {
    const th = Math.max(40, Math.min(Number.isFinite(v.tilt) ? v.tilt : 70, 89)), a = th * Math.PI / 180, H = this.gy - this.ry;
    const xf = this.wx - H / Math.tan(a), o = Number.isFinite(v.over) ? Math.max(0, Math.min(v.over, 120)) * .4 : 20;
    const top = [this.wx + Math.cos(a) * o, this.ry - Math.sin(a) * o];
    return {th, a, xf, top};
  },
  ladder(g, ww) {
    const [tx, ty] = [g.top[0], g.top[1]], fx = g.xf, fy = this.gy, nx = Math.sin(g.a) * 4, ny = Math.cos(g.a) * 4;
    let s = `<path d="M${fx - nx} ${fy - ny} L${tx - nx} ${ty - ny} M${fx + nx} ${fy + ny} L${tx + nx} ${ty + ny}" stroke="#d99a2b" stroke-width="3.2" stroke-linecap="round"/>`;
    const len = Math.hypot(tx - fx, ty - fy), n = Math.floor(len / 13);
    for (let i = 1; i < n; i++) { const t = i / n, x = fx + (tx - fx) * t, y = fy + (ty - fy) * t; s += `<line x1="${x - nx}" y1="${y - ny}" x2="${x + nx}" y2="${y + ny}" stroke="#a8721a" stroke-width="2"/>`; }
    return s;
  },
  draw(v) {
    const GY = this.gy, WX = this.wx, RY = this.ry, g = this.geo(v);
    let s = rc("g-sky", 0, 0, 360, 250) + rc("g-grnd", 0, GY, 360, 24);
    s += rc("g-wall", WX, RY, 110, GY - RY) + rc("g-conc", WX - 4, RY - 6, 114, 8) + rc("g-conc2", WX + 8, RY - 22, 100, 16);
    for (let i = 0; i < 2; i++) s += rc("g-glass", WX + 22 + i * 44, 110 + 0, 30, 26, 'rx="2"') + rc("g-glass", WX + 22 + i * 44, 160, 30, 26, 'rx="2"');
    s += `<g data-r="lad">` + this.ladder(g) + `</g>`;
    if (Number.isFinite(v.tilt)) s += `<path d="M${g.xf + 26} ${GY} A26 26 0 0 0 ${g.xf + 26 * Math.cos(g.a)} ${GY - 26 * Math.sin(g.a)}" fill="none" stroke="var(--ink)" stroke-width="1" opacity=".6"/><text x="${g.xf + 32}" y="${GY - 6}" class="g-tag">${fmt(v.tilt)}°</text>`;
    if (Number.isFinite(v.over)) s += `<text x="${this.wx + 4}" y="${RY - 28}" class="g-tag">위로 ${fmt(v.over)}cm</text>`;
    s += `<g><rect x="8" y="8" width="104" height="82" rx="10" fill="var(--panel)" opacity=".92"/><text x="16" y="23" class="g-cap">사다리 앞모습</text>`;
    const wcm = Number.isFinite(v.width) ? Math.max(10, Math.min(v.width, 60)) : 30, pw = wcm * 1.35, cx = 60;
    s += `<rect x="${cx - pw / 2}" y="30" width="3.5" height="54" fill="#d99a2b"/><rect x="${cx + pw / 2 - 3.5}" y="30" width="3.5" height="54" fill="#d99a2b"/>`;
    for (let i = 0; i < 5; i++) s += `<rect x="${cx - pw / 2}" y="${36 + i * 11}" width="${pw}" height="2.4" fill="#a8721a"/>`;
    s += `<rect x="${cx - 14}" y="76" width="28" height="6" rx="2" fill="#1d2433" opacity=".35"/>`;
    s += `<text x="${cx}" y="98" text-anchor="middle" class="g-tag" style="stroke:none">${Number.isFinite(v.width) ? "폭 " + fmt(v.width) + "cm" : "폭 ?"}</text></g>`;
    s += wkr("w1", g.xf - 40, GY, 68);
    return s;
  },
  eval(v) {
    const c = [], o1 = v.tilt <= 75, o2 = v.over >= 60, o3 = v.width >= 30;
    c.push({f: "lad_tilt", label: "사다리 기울기", ok: o1, dir: o1 ? null : "down", val: fmt(v.tilt) + "°", need: "75도 이하", acc: "a_lad_back"});
    c.push({f: "lad_over", label: "걸친 지점 위로 올라온 길이", ok: o2, dir: o2 ? null : "up", val: fmt(v.over) + "cm", need: "60cm 이상", acc: "a_lad_short"});
    c.push({f: "lad_w", label: "사다리 폭", ok: o3, dir: o3 ? null : "up", val: fmt(v.width) + "cm", need: "30cm 이상", acc: "a_lad_narrow"});
    return c;
  },
  async play(svg, v, res) {
    const GY = this.gy, g = this.geo(v), lad = R(svg, "lad"), w = R(svg, "w1"), bad = a => res.some(c => !c.ok && c.acc === a);
    const P = s => [L(g.xf, g.top[0], s), L(GY, g.top[1], s)];
    const lean = 90 - g.th;
    say("지붕층 점검을 위해 작업자가 사다리를 오릅니다…");
    await walk(w, g.xf - 40, g.xf - 10, GY, 600);
    const climb = async (s0, s1, ms) => tw(ms, t => { const [x, y] = P(L(s0, s1, t)); setT(w, x - 4, y + 2 - Math.abs(Math.sin(t * ms / 150)) * 1.2, lean); }, ease.lin);
    if (bad("a_lad_back")) {
      await climb(0, .55, 1200);
      say("너무 세운 사다리가 흔들리며 뒤로 기웁니다…");
      sfx.bad();
      const [px, py] = P(.55);
      await tw(1000, t => {
        const a = -(lean + 80) * t * t;
        lad.setAttribute("transform", `rotate(${a} ${g.xf} ${GY})`);
        const [x, y] = rotPt(px - 4, py + 2, g.xf, GY, a); setT(w, x, y, lean + a);
      }, ease.in);
      hurt(w); shake(); sfx.thud(); pop(svg, g.xf - 30, GY - 30, "쿵!");
      say("💥 기울기가 75도를 넘어 사다리가 뒤로 넘어졌습니다.");
    } else if (bad("a_lad_narrow")) {
      await climb(0, .5, 1000);
      say("사다리 폭이 좁아 발이 발판 끝에 걸쳐 있어요… 미끄러집니다!");
      const [px, py] = P(.5);
      sfx.bad(); svg.appendChild(w);
      await tw(300, t => setT(w, px - 4, py + 2, lean - 18 * t));
      await tw(800, t => setT(w, px - 4 - 24 * t, py + 2 + (GY - py - 2) * t * t, lean - 18 - 80 * t), ease.lin);
      hurt(w); shake(); sfx.thud(); pop(svg, g.xf - 30, GY - 30, "쿵!");
      say("💥 폭 30cm 미만의 좁은 사다리에서 발을 헛디뎌 추락했습니다.");
    } else if (bad("a_lad_short")) {
      await climb(0, .93, 1500);
      say("지붕으로 건너가려는데 사다리가 지붕선 위로 거의 안 올라와 붙잡을 곳이 없어요!");
      await tw(450, t => { const [x, y] = P(.93); setT(w, x - 4 + 10 * t, y + 2 - 4 * t, lean + 10 * t); });
      sfx.bad(); svg.appendChild(w);
      await tw(400, t => { lad.setAttribute("transform", `translate(${-10 * t} ${12 * t})`); });
      await tw(800, t => { const [x, y] = P(.93); setT(w, x + 6 - 30 * t, y - 2 + (GY - y + 2) * t * t, lean + 10 + 80 * t); }, ease.lin);
      hurt(w); shake(); sfx.thud(); pop(svg, g.xf - 20, GY - 30, "쿵!");
      say("💥 걸친 지점에서 60cm 이상 올라오지 않아 갈아타다가 추락했습니다.");
    } else {
      await climb(0, .95, 1700);
      say("사다리 끝이 지붕선 위로 충분히 올라와 있어 손으로 잡고 안전하게 건너갑니다.");
      await tw(800, t => { const [x, y] = P(.95); setT(w, L(x - 4, 292, t), L(y + 2, this.ry, t) - 10 * Math.sin(t * Math.PI), L(lean, 0, t)); });
      sfx.ok(); pop(svg, 292, this.ry - 90, "✔ 안전!", "#12a37f");
      say("🟢 기울기 · 상단 돌출 · 폭이 모두 기준에 맞아 무사히 올라갔습니다.");
    }
  },
};

/* =============== 의뢰 5: 강관비계 (제56·60조) =============== */
const M5 = {
  gy: 244, py: 84,
  scaf(v, sag, bend) {
    const GY = this.gy, PY = this.py, sp = Number.isFinite(v.col) ? Math.max(.6, Math.min(v.col, 2.8)) : 1.5, W = sp * 40, x0 = 180 - W;
    const xs = [x0, x0 + W, x0 + 2 * W], bt = Number.isFinite(v.bt) ? Math.max(.5, v.bt) : 1.5;
    let s = "";
    for (let j = 1; j * bt * 40 < GY - PY - 4; j++) s += `<line x1="${x0 - 4}" y1="${GY - j * bt * 40}" x2="${x0 + 2 * W + 4}" y2="${GY - j * bt * 40}" stroke="var(--gm-steel)" stroke-width="3"/>`;
    xs.forEach((x, i) => { const b = bend * (i === 1 ? 1 : .5) * (i === 0 ? -1 : 1); s += `<path d="M${x} ${GY} Q${x + b} ${(GY + PY) / 2} ${x + b * .3} ${PY + sag * (i === 1 ? 1 : .35)}" fill="none" stroke="var(--gm-steel)" stroke-width="4.4" stroke-linecap="round"/>`; });
    s += `<line x1="${xs[0]}" y1="${GY}" x2="${xs[1]}" y2="${GY - Math.min(bt * 40, GY - PY)}" stroke="var(--gm-steel)" stroke-width="2" opacity=".7"/>`;
    s += `<path d="M${x0 - 14} ${PY} Q${180} ${PY + sag * 2} ${x0 + 2 * W + 14} ${PY}" fill="none" stroke="#c8975a" stroke-width="5" stroke-linecap="round"/>`;
    s += `<text x="${(xs[0] + xs[1]) / 2}" y="${GY + 14}" text-anchor="middle" class="g-tag" style="stroke:none">${Number.isFinite(v.col) ? "기둥 간격 " + fmt(v.col) + "m" : ""}</text>`;
    if (Number.isFinite(v.bt)) s += `<text x="${xs[2] + 8}" y="${GY - bt * 40 + 3}" class="g-tag">띠장 ${fmt(v.bt)}m</text>`;
    return s;
  },
  draw(v) {
    const GY = this.gy, PY = this.py;
    let s = rc("g-sky", 0, 0, 360, 260) + rc("g-grnd", 0, GY, 360, 16);
    s += `<g data-r="scaf">` + this.scaf(v, 0, 0) + `</g>`;
    const pw = Number.isFinite(v.width) ? Math.max(10, Math.min(v.width, 80)) : 40, gp = Number.isFinite(v.gap) ? Math.max(0, Math.min(v.gap, 12)) : 3;
    s += `<g><rect x="8" y="8" width="112" height="64" rx="10" fill="var(--panel)" opacity=".92"/><text x="16" y="22" class="g-cap">발판 위에서 본 모습</text>`;
    const sc = .95, tw_ = pw * sc, pl = (tw_ - gp * sc) / 2;
    s += `<rect x="16" y="30" width="${pl}" height="28" fill="#c8975a"/><rect x="${16 + pl + gp * sc}" y="30" width="${pl}" height="28" fill="#c8975a"/>`;
    s += `<text x="16" y="68" class="g-tag" style="stroke:none">${Number.isFinite(v.width) ? "폭 " + fmt(v.width) + "cm" : "폭 ?"}  ${Number.isFinite(v.gap) ? "틈 " + fmt(v.gap) + "cm" : "틈 ?"}</text></g>`;
    s += wkr("w2", 330, GY + 6, 36, {vest: "#3b82f6", hat: "#fff"});
    s += wkr("w1", 150, PY - 1, 68);
    return s;
  },
  eval(v) {
    const c = [], o1 = v.col <= 1.85, o2 = v.bt <= 2, o3 = v.width >= 40, o4 = v.gap <= 3;
    c.push({f: "col_b", label: "비계기둥 간격 (띠장 방향)", ok: o1, dir: o1 ? null : "down", val: fmt(v.col) + "m", need: "1.85m 이하", acc: "a_scaf_span"});
    c.push({f: "bt_gap", label: "띠장 간격", ok: o2, dir: o2 ? null : "down", val: fmt(v.bt) + "m", need: "2.0m 이하", acc: "a_scaf_bt"});
    c.push({f: "plat_w", label: "작업발판 폭", ok: o3, dir: o3 ? null : "up", val: fmt(v.width) + "cm", need: "40cm 이상", acc: "a_plat_narrow"});
    c.push({f: "plat_gap", label: "발판재료 사이 틈", ok: o4, dir: o4 ? null : "down", val: fmt(v.gap) + "cm", need: "3cm 이하", acc: "a_plat_gap"});
    return c;
  },
  async play(svg, v, res) {
    const GY = this.gy, PY = this.py, w = R(svg, "w1"), g = R(svg, "scaf"), w2 = R(svg, "w2"), bad = a => res.some(c => !c.ok && c.acc === a);
    say("공사 자재를 올리고 외벽 작업을 시작합니다…");
    await walk(w, 150, 210, PY - 1, 1000);
    if (bad("a_scaf_span") || bad("a_scaf_bt")) {
      const why = bad("a_scaf_span") ? "기둥 간격이 넓어 중간 기둥이 하중을 못 버팁니다…" : "띠장 간격이 넓어 기둥이 옆으로 휩니다(좌굴)…";
      say("자재를 한가득 쌓자 " + why);
      sfx.bad();
      await tw(900, t => { g.innerHTML = this.scaf(v, 6 * t, 4 * t); setT(w, 210, PY - 1 + 6 * t, 0); }, ease.lin);
      svg.appendChild(w);
      await tw(1000, t => { g.innerHTML = this.scaf(v, 6 + 30 * t, 4 + 26 * t); setT(w, 210 + 10 * t, PY + 5 + (GY - PY - 7) * t * t, 90 * t); }, ease.in);
      hurt(w); shake(); sfx.thud(); pop(svg, 220, GY - 24, "와르르!");
      say("💥 비계가 무너졌습니다. 기둥 간격은 띠장 방향 1.85m·장선 방향 1.5m, 띠장 간격은 2.0m 이하.");
    } else if (bad("a_plat_narrow")) {
      say("발판이 좁아 발을 딛기가 불안합니다…");
      await walk(w, 210, 262, PY - 1, 700);
      sfx.bad(); svg.appendChild(w);
      await tw(280, t => setT(w, 262 + 6 * t, PY - 1, 14 * t));
      await tw(900, t => setT(w, 268 + 22 * t, PY - 1 + (GY - PY) * t * t, 14 + 100 * t), ease.lin);
      hurt(w); shake(); sfx.thud(); pop(svg, 290, GY - 24, "쿵!");
      say("💥 작업발판 폭이 40cm 미만이라 발을 헛디뎌 추락했습니다.");
    } else if (bad("a_plat_gap")) {
      say("작업 중 망치가 발판 틈새에 닿습니다…");
      const h = document.createElementNS(NS, "g"); h.setAttribute("data-r", "ham");
      h.innerHTML = `<rect x="-1.5" y="-12" width="3" height="12" fill="#8a5a2b"/><rect x="-6" y="-16" width="12" height="6" rx="1" fill="#6b7684"/>`;
      svg.appendChild(h); mv(h, 215, PY - 4, 0);
      await tw(500, t => mv(h, 215, PY - 4 + 4 * t, 20 * t));
      sfx.bad();
      await tw(900, t => mv(h, 215, PY + (GY - PY - 16) * t * t, 20 + 520 * t), ease.lin);
      hurt(w2); shake(); sfx.thud(); pop(svg, 250, GY - 24, "퍽!");
      h.remove();
      say("💥 발판 틈이 3cm를 넘어 망치가 떨어져 아래 근로자가 다쳤습니다.");
    } else {
      say("발판이 넉넉하고 틈도 좁아 안정적입니다…");
      await walk(w, 210, 150, PY - 1, 900);
      sfx.ok(); pop(svg, 180, PY - 76, "✔ 튼튼!", "#12a37f");
      say("🟢 비계 구조가 기준에 맞아 오늘도 무사고!");
    }
  },
};

/* =============== 의뢰 목록 =============== */
const MS = [
  {
    id: "m1", ic: "🧱", title: "2층 슬래브 가장자리", sub: "안전난간 · 제13조", vb: "0 0 360 280", mod: M1, arts: ["제13조"],
    brief: "신축 건물 <b>2층 슬래브 가장자리</b>에서 철근 작업이 시작됩니다. 아래층엔 다른 근로자가 있어요. <b>안전난간</b>을 직접 설계하세요. 값을 입력하면 난간이 바로 세워집니다.",
    fields: [
      {id: "top", t: "num", label: "상부 난간대 높이 (바닥에서)", unit: "cm", ph: "몇 cm?", fact: "rail_top"},
      {id: "mids", t: "num", label: "중간 난간대 (몇 단)", unit: "단", ph: "몇 단?", int: true, hints: ["근거: 제13조 제2호 (중간 난간대)", "상부 난간대 높이에 따라 달라져요. 기준선은 120cm", "120cm 이하: 중간 지점에 1단 / 120cm 이상: 2단 이상 균등하게, 난간 상하 간격 60cm 이하"]},
      {id: "toe", t: "num", label: "발끝막이판 높이", unit: "cm", ph: "몇 cm?", fact: "rail_toe"},
    ],
    lessons: ["상부 난간대는 바닥에서 90cm 이상. 120cm 이하면 중간 난간대 1단(중간 지점), 120cm 이상이면 2단 이상 균등하게 두고 상하 간격 60cm 이하.", "발끝막이판은 10cm 이상. 난간대는 지름 2.7cm 이상 금속제 파이프, 100kg 이상 하중에 견딜 것."],
  },
  {
    id: "m2", ic: "🕳️", title: "엘리베이터 개구부", sub: "개구부 방호 · 제43조", vb: "0 0 360 260", mod: M2, arts: ["제43조"],
    brief: "바닥에 <b>개구부(구멍)</b>가 뚫려 있습니다. 작업자들은 이 길로 자재를 나릅니다. 어떻게 막을지 고르고, 필요한 조건을 직접 써 보세요.",
    lessons: ["개구부에는 안전난간 · 울타리 · 수직형 추락방망 · 덮개 중 하나를 충분한 강도로 튼튼하게 설치해야 합니다.", "덮개는 뒤집히거나 떨어지지 않게 고정하고, 어두운 곳에서도 알아볼 수 있게 개구부임을 표시합니다.", "난간 등을 작업 때문에 임시로 떼어낼 땐 추락방호망(제42조 제2항 기준)을 설치하고, 곤란하면 안전대 착용 등 추락 방지 조치를 합니다."],
  },
  {
    id: "m3", ic: "🕸️", title: "외벽 작업면 추락방호망", sub: "추락방호망 · 제42조", vb: "0 0 360 270", mod: M3, arts: ["제42조"],
    brief: "<b>외벽 도장 작업</b> 중 사람이 떨어질 수 있어요. 건물 바깥쪽에 <b>추락방호망</b>을 칩니다. 짧은 변 5m 크기의 망입니다. 거리 · 처짐 · 내민 길이를 정하세요.",
    fields: [
      {id: "dist", t: "num", label: "작업면에서 망까지 수직거리", unit: "m", ph: "몇 m?", fact: "net_dist"},
      {id: "sag", t: "num", label: "망의 처짐 (짧은 변 길이 기준)", unit: "%", ph: "몇 %?", fact: "net_sag"},
      {id: "over", t: "num", label: "벽면에서 내민 길이", unit: "m", ph: "몇 m?", fact: "net_over"},
    ],
    lessons: ["추락방호망은 작업면에서 수직거리 10m 이하, 가능하면 작업면과 가까이.", "수평으로 설치하고 처짐은 짧은 변 길이의 12% 이상. 건축물 바깥쪽이면 벽면에서 3m 이상 내밀 것.", "그물코 20mm 이하인 망은 낙하물 방지망으로도 봅니다. 한국산업표준(KS) 성능기준에 맞는 망을 쓰세요."],
  },
  {
    id: "m4", ic: "🪜", title: "지붕층 점검 사다리", sub: "사다리식 통로 · 제24조", vb: "0 0 360 250", mod: M4, arts: ["제24조", "제42조"],
    brief: "지붕층 점검을 위해 <b>사다리</b>를 걸쳐야 합니다. 벽에 걸친 지점은 지붕선(오른쪽 위)입니다. 사다리의 기울기 · 상단 돌출 · 폭을 정하세요.",
    fields: [
      {id: "tilt", t: "num", label: "사다리 기울기 (땅과 이루는 각)", unit: "도", ph: "몇 도?", fact: "lad_tilt"},
      {id: "over", t: "num", label: "걸친 지점 위로 올라오는 길이", unit: "cm", ph: "몇 cm?", fact: "lad_over"},
      {id: "width", t: "num", label: "사다리 폭", unit: "cm", ph: "몇 cm?", fact: "lad_w"},
    ],
    lessons: ["사다리식 통로: 폭 30cm 이상, 기울기 75도 이하 (고정식은 90도 이하, 7m 이상이면 2.5m 지점부터 등받이울).", "상단은 걸쳐놓은 지점에서 60cm 이상 올라가게. 발판과 벽 사이는 15cm 이상. 길이 10m 이상이면 5m 이내마다 계단참.", "이동식 사다리 작업은 높이 3.5m 이하에서만, 2m 이상이면 안전모+안전대 함께 (제42조 제4항)."],
  },
  {
    id: "m5", ic: "🏗️", title: "외벽 도장 비계", sub: "강관비계 · 제56·60조", vb: "0 0 360 260", mod: M5, arts: ["제60조", "제56조"],
    brief: "높이 4m 짜리 <b>강관비계</b>를 조립합니다. 자재를 가득 올릴 예정이에요. 기둥 · 띠장 · 작업발판을 어떻게 구성할지 정하세요.",
    fields: [
      {id: "col", t: "num", label: "비계기둥 간격 (띠장 방향)", unit: "m", ph: "몇 m?", fact: "col_b"},
      {id: "bt", t: "num", label: "띠장 간격", unit: "m", ph: "몇 m?", fact: "bt_gap"},
      {id: "width", t: "num", label: "작업발판 폭", unit: "cm", ph: "몇 cm?", fact: "plat_w"},
      {id: "gap", t: "num", label: "발판재료 사이 틈", unit: "cm", ph: "몇 cm?", fact: "plat_gap"},
    ],
    lessons: ["강관비계: 비계기둥 간격 띠장 방향 1.85m 이하 · 장선 방향 1.5m 이하, 띠장 간격 2.0m 이하, 기둥 간 적재하중 400kg 이하.", "작업발판은 폭 40cm 이상, 발판재료 틈 3cm 이하 (비계 높이 2m 이상 작업장소).", "높이 5m 이상 비계 조립·해체는 관리감독자 지휘로, 강관비계는 쌍줄로 조립합니다."],
  },
];
const MSBY = {}; MS.forEach(m => { MSBY[m.id] = m; });
const fieldsOf = (m, v) => m.mod.fields ? m.mod.fields(v) : m.fields;

/* =============== 학습 기록 (잊을 때쯤 다시: 간격 반복) =============== */
function factDue(id) { const r = S.facts[id]; return !!r && r.due <= Date.now(); }
function dueList() { return Object.keys(S.facts).filter(id => F[id] && factDue(id)); }
function rec(id, good, hinted) {
  if (!F[id]) return;
  const r = S.facts[id] || {b: 0, due: 0};
  if (good && !hinted) { r.b = Math.min(BOX_DAYS.length - 1, r.b + 1); r.due = Date.now() + BOX_DAYS[r.b] * DAY; }
  else { r.b = 0; r.due = Date.now() + 10 * 60000; }
  S.facts[id] = r;
}
const LV = [0, 60, 160, 300, 500, 800, 1200], TITLE = ["견습 안전요원", "안전요원", "안전관리자", "안전팀장", "안전소장", "안전왕", "전설의 안전왕"];
function lvInfo(xp) { let i = 0; while (i < LV.length - 1 && xp >= LV[i + 1]) i++; const nx = LV[i + 1]; return {i, title: TITLE[i], cur: xp - LV[i], need: nx ? nx - LV[i] : 0, max: !nx}; }
function addXP(n) { const a = lvInfo(S.xp).i; S.xp += n; const b = lvInfo(S.xp).i; save(); if (b > a) setTimeout(() => host && host.toast("🎉 레벨 업! " + TITLE[b]), 600); }

/* =============== 화면 =============== */
let scr = "home", cm = null; // 현재 화면, 현재 의뢰 상태
const starStr = n => `<span class="gm-ms${n ? "" : " z"}">${"★".repeat(n)}${"☆".repeat(3 - n)}</span>`;
function topBar() {
  return `<div class="gm-top"><div class="gm-mode"><button type="button" data-a="toread">📖 읽기</button><button type="button" class="on">🎮 게임</button></div>` +
    `<button type="button" class="gm-ib" data-a="snd" aria-label="효과음" title="효과음">${S.snd ? "🔊" : "🔇"}</button><button type="button" class="gm-ib" data-a="close" aria-label="공부 닫기">✕</button></div>`;
}
function renderHome() {
  scr = "home"; cm = null; stopQ();
  const lv = lvInfo(S.xp), due = dueList(), dexN = Object.keys(S.dex).length;
  const cleared = MS.filter(m => S.stars[m.id]).length;
  let h = topBar();
  h += `<div class="gm-hero"><h2>무사고 현장</h2><p>숫자를 직접 떠올려 현장을 지키는 안전 게임</p>` +
    `<div class="gm-lv"><b>LV.${lv.i + 1}</b>${lv.title}</div><div class="gm-xp"><i style="width:${lv.max ? 100 : Math.round(lv.cur / lv.need * 100)}%"></i></div>` +
    `<div class="gm-stats"><span>🛡️ 무사고 ${S.cur}연속 (최고 ${S.best})</span><span>📕 사고도감 ${dexN}/${ACC_N}</span><span>✅ 의뢰 ${cleared}/${MS.length}</span></div></div>`;
  if (due.length) h += `<button type="button" class="gm-alert" data-a="redo"><span class="sir">🚨</span><span>속보: 재발 사고 ${due.length}건!<small>잊어버릴 때쯤 같은 사고가 또 터졌어요. 지금 출동</small></span></button>`;
  if (!cleared) h += `<div class="gm-guide"><b>이렇게 해요</b><div>① 의뢰를 고르면 현장 그림이 나와요</div><div>② <b>기준 숫자를 보기 없이 직접 입력</b>하면 그림이 바로 바뀌어요</div><div>③ <b>착공!</b>을 누르면 결과가 눈앞에서 벌어져요. 틀리면 사고가 나고, 사고는 <b>도감</b>에 모여요</div><div>④ 틀린 숫자는 며칠 뒤 <b>재발 사고</b>로 다시 터져요. 그때 또 맞히면 완전히 내 것!</div></div>`;
  h += `<div class="gm-sec">의뢰 · 추락 편</div>`;
  MS.forEach((m, i) => { h += `<button type="button" class="gm-mc" data-a="mis" data-id="${m.id}"><span class="gm-mn">${m.ic}</span><span class="gm-mt"><b>${i + 1}. ${m.title}</b><small>${m.sub}</small></span>${starStr(S.stars[m.id] || 0)}</button>`; });
  const bossOK = cleared >= 3;
  h += `<div class="gm-sec">보스</div><button type="button" class="gm-mc boss" data-a="boss" ${bossOK ? "" : "disabled"}><span class="gm-mn">🧑‍✈️</span><span class="gm-mt"><b>감독관 불시점검</b><small>${bossOK ? "시간 안에 직접 답을 떠올려 쓰세요 · 목숨 3개" + (S.insp ? " · 통과 " + S.insp + "회" : "") : "의뢰 3개 이상 클리어하면 열려요"}</small></span><span class="gm-ms" style="color:#fff">${bossOK ? "▶" : "🔒"}</span></button>`;
  h += `<div class="gm-sec">기록</div><button type="button" class="gm-mc" data-a="dex"><span class="gm-mn">📕</span><span class="gm-mt"><b>사고 도감</b><small>일부러(?) 사고를 내서 모아 보세요 · ${dexN}/${ACC_N}</small></span></button>`;
  h += `<div class="gm-note">참고용 학습 게임이에요. 숫자는 「산업안전보건기준에 관한 규칙」 조문에서 옮겼고, 실제 현장 적용 전에는 조문 원문과 고용노동부 고시를 꼭 확인하세요. 장면의 크기·동작은 이해를 돕는 그림입니다.</div>`;
  root.innerHTML = `<div class="gm">${h}</div>`;
  window.scrollTo(0, 0);
}

/* ---------- 의뢰 화면 ---------- */
function fieldHTML(f, v, hn) {
  const hh = (hn[f.id] || []).map(t => `<div>💡 ${esc(t)}</div>`).join("");
  if (f.t === "num") return `<div class="gm-f" data-f="${f.id}"><span class="gm-fl">${esc(f.label)}</span><span class="gm-fi"><input data-in="${f.id}" inputmode="decimal" autocomplete="off" placeholder="${esc(f.ph || "")}" value="${Number.isFinite(v[f.id]) ? v[f.id] : ""}"><i>${f.unit}</i></span><button type="button" class="gm-hint" data-a="hint" data-f="${f.id}" aria-label="힌트">💡</button><span class="gm-hn" data-hn="${f.id}">${hh}</span></div>`;
  if (f.t === "pick") return `<div class="gm-f" data-f="${f.id}"><span class="gm-fl">${esc(f.label)}</span><button type="button" class="gm-hint" data-a="hint" data-f="${f.id}" aria-label="힌트">💡</button><div class="gm-chips">${f.opts.map(o => `<button type="button" class="gm-chip${v[f.id] === o.id ? " on" : ""}" data-a="pick" data-f="${f.id}" data-v="${o.id}">${o.ic} ${o.t}</button>`).join("")}</div><span class="gm-hn" data-hn="${f.id}">${hh}</span></div>`;
  return `<div class="gm-f" data-f="${f.id}"><span class="gm-fl">${esc(f.label)}</span><button type="button" class="gm-hint" data-a="hint" data-f="${f.id}" aria-label="힌트">💡</button><span class="gm-fi" style="grid-column:1/-1"><textarea data-in="${f.id}" placeholder="${esc(f.ph || "")}">${esc(v[f.id] || "")}</textarea></span><span class="gm-slots">${"<span>?</span>".repeat(f.slots)}</span><span class="gm-hn" data-hn="${f.id}">${hh}</span></div>`;
}
function hintText(m, f, lv) {
  if (f.hints) return f.hints[lv - 1];
  const fc = F[f.fact]; if (!fc) return "";
  if (lv === 1) return `근거: ${fc.art} ${fc.cl}`;
  if (lv === 2) return `기준 방향: "${DIRT[fc.dir] || "딱 맞는 값"}" · 단위 ${fc.u}`;
  const a = fc.a, b = a >= 100 ? 50 : a >= 20 ? 10 : a >= 5 ? 5 : 1, lo = Math.floor(a / b) * b;
  return `정답은 ${fmt(lo)} ~ ${fmt(lo + b)} 사이`;
}
function renderMission(id) {
  const m = MSBY[id]; scr = "mis"; stopQ();
  cm = {m, v: {}, att: 0, hints: 0, hintLv: {}, hn: {}, wrongF: {}, hinted: {}, over: false};
  root.innerHTML = `<div class="gm">${topBar()}<div class="gm-bar"><button type="button" class="gm-back" data-a="home">← 현장 사무소</button><h3>${m.ic} ${m.title}</h3></div>` +
    `<div class="gm-brief">${m.brief}</div><div class="gm-stage"><svg class="gm-scene" id="gmSvg" viewBox="${m.vb}" role="img" aria-label="${esc(m.title)} 현장 그림"></svg><button type="button" class="gm-skip" id="gmSkip" data-a="skip" hidden>⏩ 건너뛰기</button></div>` +
    `<div class="gm-say" id="gmSay"></div><div class="gm-form" id="gmForm"></div><button type="button" class="gm-go" id="gmGo" data-a="go">🏗️ 착공!</button><div id="gmRes"></div></div>`;
  svgEl = $("#gmSvg"); sayEl = $("#gmSay");
  drawScene(); renderForm(); say("값을 입력하면 현장이 바로 바뀌어요.");
  window.scrollTo(0, 0);
}
function drawScene(res) { if (!cm) return; svgEl.innerHTML = cm.m.mod.draw(cm.v, res); bind(svgEl); }
function renderForm() {
  if (!cm) return;
  $("#gmForm").innerHTML = fieldsOf(cm.m, cm.v).map(f => fieldHTML(f, cm.v, cm.hn)).join("");
}
function readVals() {
  root.querySelectorAll("[data-in]").forEach(el => {
    const id = el.dataset.in, f = fieldsOf(cm.m, cm.v).find(x => x.id === id); if (!f) return;
    if (f.t === "num") { let n = num(el.value); if (f.int && Number.isFinite(n)) n = Math.round(n); cm.v[id] = n; } else cm.v[id] = el.value;
  });
}
async function launch() {
  if (busy || !cm) return;
  readVals();
  const m = cm.m, fs = fieldsOf(m, cm.v);
  const miss = fs.filter(f => f.t === "num" ? !Number.isFinite(cm.v[f.id]) : f.t === "pick" ? !cm.v[f.id] : !String(cm.v[f.id] || "").trim());
  if (miss.length) {
    miss.forEach(f => { const e = root.querySelector(`[data-f="${f.id}"]`); if (e) { e.classList.remove("gm-shk"); void e.offsetWidth; e.classList.add("gm-shk"); } });
    host && host.toast("빈칸이 있어요. 직접 떠올려 채워 주세요"); return;
  }
  cm.att++;
  const res = m.mod.eval(cm.v);
  res.forEach(c => { if (!c.ok) cm.wrongF[c.f] = true; });
  busy = true; skip = false;
  $("#gmGo").disabled = true; $("#gmRes").innerHTML = ""; root.querySelectorAll("input,textarea,.gm-chip,.gm-hint").forEach(e => e.disabled = true);
  drawScene(res); $("#gmSkip").hidden = false;
  window.scrollTo({top: Math.max(0, svgEl.getBoundingClientRect().top + window.scrollY - 70), behavior: REDUCE ? "auto" : "smooth"});
  try { await m.mod.play(svgEl, cm.v, res, say); } catch (e) { console.error(e); }
  if (!alive || scr !== "mis" || !cm) { busy = false; return; }
  busy = false; skip = false; $("#gmSkip").hidden = true;
  showResult(res);
}
function showResult(res) {
  const m = cm.m, pass = res.every(c => c.ok), first = cm.att === 1;
  const newAcc = [];
  res.forEach(c => { if (!c.ok && ACC[c.acc] && !S.dex[c.acc]) { S.dex[c.acc] = Date.now(); newAcc.push(c.acc); } });
  // 간격 반복 기록 (낱말 카드별)
  const seenF = {};
  res.forEach(c => {
    if (c.noSrs) return;
    const ids = [c.f, c.f2].filter(Boolean);
    ids.forEach(id => { if (seenF[id] === undefined) seenF[id] = true; if (!c.ok) seenF[id] = false; });
  });
  Object.keys(seenF).forEach(id => rec(id, seenF[id] && !cm.wrongF[id], !!cm.hinted[id]));
  let stars = 0, h = "";
  if (pass) {
    stars = cm.att === 1 && cm.hints === 0 ? 3 : cm.att <= 2 && cm.hints <= 2 ? 2 : 1;
    const had = S.stars[m.id] || 0;
    if (stars > had) S.stars[m.id] = stars;
    S.cur = cm.att === 1 ? S.cur + 1 : 0; S.best = Math.max(S.best, S.cur);
    addXP(had ? 5 : 20 + stars * 10);
    sfx.star();
  } else { S.cur = 0; sfx.bad(); }
  save();
  const full = !pass && cm.att >= 2;
  h += `<div class="gm-res"><div class="gm-stamp${pass ? "" : " bad"}">${pass ? "무사고!" : "사고 발생"}</div>`;
  if (pass) h += `<div class="gm-stars">${"★".repeat(stars)}<span class="z">${"★".repeat(3 - stars)}</span></div><div style="font-size:.85em;color:var(--sub)">${cm.att === 1 ? "한 번에 성공" + (cm.hints ? " · 힌트 " + cm.hints + "회" : "") : cm.att + "번째 시도" + (cm.hints ? " · 힌트 " + cm.hints + "회" : "")}${S.cur > 1 ? " · 🛡️ 무사고 " + S.cur + "연속" : ""}</div>`;
  newAcc.forEach(a => { h += `<span class="gm-new">📕 도감 등록! ${ACC[a].ic} ${esc(ACC[a].n)}</span>`; });
  h += `<ul class="gm-ck">`;
  res.forEach(c => {
    const f = F[c.f];
    const dirTxt = c.dtxt || (c.dir === "up" ? "▲ 더 높여야 해요" : c.dir === "down" ? "▼ 더 줄여야 해요" : "✘ 조건이 빠졌어요");
    if (c.ok) h += `<li><b class="o">✔</b><span>${esc(c.label)}: ${esc(c.val || "")}${pass || full ? `<small>기준 ${esc(c.need)}${f ? " · " + f.art + " " + f.cl : ""}</small>` : ""}</span></li>`;
    else h += `<li><b class="x">✘</b><span>${esc(c.label)}: ${esc(c.val || "")} <b style="color:var(--gm-bad)">${dirTxt}</b>${full ? `<small>기준 ${esc(c.need)}${f ? " · " + f.art + " " + f.cl : ""}</small>` : ""}${!full && ACC[c.acc] ? `<small>→ ${ACC[c.acc].ic} ${esc(ACC[c.acc].n)}</small>` : ""}</span></li>`;
  });
  h += `</ul>`;
  if (!pass && !full) h += `<div class="gm-less">한 번 더 도전해 보세요. 방향 힌트만 보여 줬어요. (두 번째 실패부터 정답 기준을 공개합니다)</div>`;
  if (pass || full) h += `<div class="gm-less">${m.lessons.map(t => `<div>📌 ${esc(t)}</div>`).join("")}${res.filter(c => !c.ok && ACC[c.acc]).map(c => `<div>⚠️ ${esc(ACC[c.acc].tip)}</div>`).join("")}</div>`;
  const idx = MS.findIndex(x => x.id === m.id), nx = MS[idx + 1];
  h += `<div class="gm-btns">`;
  h += pass ? (nx ? `<button type="button" class="pri" data-a="mis" data-id="${nx.id}">다음 의뢰 ▶</button>` : `<button type="button" class="pri" data-a="home">현장 사무소로</button>`) : `<button type="button" class="pri" data-a="retry">🔁 다시 짓기</button>`;
  h += `<button type="button" data-a="read" data-art="${m.arts[0]}">📖 ${m.arts[0]} 보기</button>`;
  h += pass ? (nx ? `<button type="button" data-a="retry">다시 해보기</button>` : "") : `<button type="button" data-a="home">나가기</button>`;
  h += `</div></div>`;
  $("#gmRes").innerHTML = h;
  $("#gmGo").hidden = true;
  setTimeout(() => { const e = $("#gmRes"); if (e && alive) window.scrollTo({top: e.getBoundingClientRect().top + window.scrollY - 60, behavior: REDUCE ? "auto" : "smooth"}); }, 120);
}
function retry() {
  if (!cm || busy) return;
  $("#gmRes").innerHTML = ""; $("#gmGo").hidden = false; $("#gmGo").disabled = false;
  drawScene(); renderForm(); say("값을 고쳐 다시 지어 보세요.");
  window.scrollTo({top: Math.max(0, svgEl.getBoundingClientRect().top + window.scrollY - 70), behavior: "auto"});
}

/* ---------- 사고 도감 ---------- */
function renderDex() {
  scr = "dex"; stopQ();
  let h = topBar() + `<div class="gm-bar"><button type="button" class="gm-back" data-a="home">← 현장 사무소</button><h3>📕 사고 도감 ${Object.keys(S.dex).length}/${ACC_N}</h3></div><div class="gm-dex">`;
  Object.keys(ACC).forEach(id => {
    const a = ACC[id];
    h += S.dex[id] ? `<div class="gm-dc"><div class="ic">${a.ic}</div><b>${esc(a.n)}</b><div>${esc(a.tip)}</div><button type="button" data-a="read" data-art="${a.art}">📖 ${a.art}</button></div>` : `<div class="gm-dc lock"><div class="ic">❓</div><b>???</b><div>${a.art} 관련 사고</div></div>`;
  });
  root.innerHTML = `<div class="gm">${h}</div></div>`; window.scrollTo(0, 0);
}

/* ---------- 감독관 불시점검 / 재발 사고 ---------- */
let Q = null;
function stopQ() { if (Q && Q.raf) cancelAnimationFrame(Q.raf); if (Q && Q.tm) clearTimeout(Q.tm); Q = null; }
function pickQuestions(kind) {
  let ids;
  if (kind === "redo") ids = shuffle(dueList()).slice(0, 8);
  else {
    const seen = Object.keys(S.facts).filter(id => F[id]);
    ids = shuffle(seen).sort((a, b) => (S.facts[a].b - S.facts[b].b)).slice(0, 5);
    const rest = shuffle(Object.keys(F).filter(id => !ids.includes(id)));
    ids = shuffle(ids.concat(rest.slice(0, 8 - ids.length)));
  }
  return ids.slice(0, 8);
}
function startQ(kind) {
  stopQ();
  const ids = pickQuestions(kind);
  if (!ids.length) { host && host.toast("지금은 재발 사고가 없어요"); return; }
  Q = {kind, ids, i: 0, lives: 3, combo: 0, score: 0, right: 0, wrong: [], t0: 0, dur: 0, done: false, mark: null};
  scr = "q"; renderQ();
}
const inspSvg = `<svg viewBox="-24 -108 48 112" aria-hidden="true">${wkr("insp", 0, 0, 99, {vest: "#2563eb", hat: "#fff"})}<rect x="14" y="-66" width="16" height="22" rx="2" fill="#fff" stroke="#9aa3b5"/><path d="M17 -60h10M17 -55h10M17 -50h7" stroke="#9aa3b5" stroke-width="1.4"/></svg>`;
function renderQ() {
  if (!Q) return;
  const id = Q.ids[Q.i], f = F[id], redo = Q.kind === "redo";
  Q.dur = f.t === "n" ? 15000 : 28000; Q.t0 = performance.now(); Q.mark = null; Q.asked = true;
  root.innerHTML = `<div class="gm">${topBar()}<div class="gm-bar"><button type="button" class="gm-back" data-a="home">← 그만</button><h3>${redo ? "🚨 속보: 재발 사고" : "🧑‍✈️ 감독관 불시점검"}</h3></div>` +
    `<div class="gm-iq"><div class="gm-hud"><span>${"❤️".repeat(Q.lives)}${"🖤".repeat(3 - Q.lives)}</span><span class="sp"></span><span>🔥 콤보 ${Q.combo}</span><span>${Q.i + 1} / ${Q.ids.length}</span></div>` +
    `<div class="gm-tmr"><i id="qTm"></i></div><div class="gm-iqs">${inspSvg}<div class="gm-bub"><small>${f.art} ${f.cl}</small>${esc(f.q)}</div></div>` +
    `<div class="gm-fi" style="margin-top:12px">${f.t === "n" ? `<input id="qIn" inputmode="decimal" autocomplete="off" placeholder="숫자만 입력"><i>${f.u}</i>` : `<input id="qIn" autocomplete="off" placeholder="한 낱말로" style="flex:1;min-width:0;font:inherit;font-size:1.1em;font-weight:800;padding:9px 12px;border-radius:12px;border:2px solid var(--line);background:var(--fill,#f2f4f6);color:var(--ink)">`}</div>` +
    `<div class="gm-btns"><button type="button" class="pri" data-a="qok">확인</button><button type="button" data-a="qskip">모르겠어요</button></div><div id="qFb"></div></div></div>`;
  scr = "q"; window.scrollTo(0, 0);
  const inp = $("#qIn"); if (inp) setTimeout(() => { try { inp.focus({preventScroll: true}); } catch (e) {} }, 60);
  const tick = now => {
    if (!Q || Q.done || Q.mark) return;
    const p = Math.max(0, 1 - (now - Q.t0) / Q.dur), bar = $("#qTm");
    if (bar) { bar.style.transform = `scaleX(${p})`; bar.style.background = p > .5 ? "var(--gm-good)" : p > .22 ? "var(--gm-gold)" : "var(--gm-bad)"; }
    if (p <= 0) { answerQ(null, true); return; }
    Q.raf = requestAnimationFrame(tick);
  };
  Q.raf = requestAnimationFrame(tick);
}
function answerQ(raw, timeout) {
  if (!Q || Q.mark) return;
  const id = Q.ids[Q.i], f = F[id];
  let good = false;
  if (raw !== null) {
    if (f.t === "n") { const n = num(raw); good = Number.isFinite(n) && Math.abs(n - f.a) < 1e-9; }
    else good = hasKw(raw, f.ok);
  }
  Q.mark = good ? "o" : "x";
  const left = Math.max(0, 1 - (performance.now() - Q.t0) / Q.dur);
  if (good) { Q.right++; Q.combo++; Q.score += 100 + Math.round(left * 60) + Q.combo * 15; sfx.ok(); }
  else { Q.lives--; Q.combo = 0; Q.wrong.push(id); sfx.bad(); }
  rec(id, good, false);
  save();
  const ans = f.t === "n" ? fmt(f.a) + f.u + (DIRT[f.dir] ? " " + DIRT[f.dir] : "") : f.ans;
  const fb = $("#qFb"), last = Q.i >= Q.ids.length - 1 || Q.lives <= 0;
  $("#qIn") && ($("#qIn").disabled = true);
  root.querySelectorAll(".gm-btns button").forEach(b => b.hidden = true);
  fb.innerHTML = `<div class="gm-fb ${good ? "o" : "x"}"><b>${good ? "✔ 정답!" + (Q.combo > 1 ? " 🔥 " + Q.combo + "콤보" : "") : (timeout ? "⏰ 시간 초과" : "✘ 아쉬워요") + " · 정답: " + esc(ans)}</b><div style="margin-top:3px">${esc(f.sum)} <span style="opacity:.75">(${f.art} ${f.cl})</span></div></div>` +
    `<div class="gm-btns"><button type="button" class="pri" data-a="qnext">${last ? "결과 보기" : "다음 문제 ▶"}</button><button type="button" data-a="read" data-art="${f.art}">📖 ${f.art}</button></div>`;
  if (good && !last) Q.tm = setTimeout(() => { if (Q && Q.mark === "o") nextQ(); }, 1400);
}
function nextQ() {
  if (!Q) return;
  if (Q.tm) clearTimeout(Q.tm);
  if (Q.i >= Q.ids.length - 1 || Q.lives <= 0) return endQ();
  Q.i++; renderQ();
}
function endQ() {
  const q = Q; Q.done = true; if (q.raf) cancelAnimationFrame(q.raf);
  const total = q.ids.length, answered = q.i + 1, pass = q.lives > 0 && q.right >= Math.ceil(total * .75);
  const xp = q.right * 5 + (pass ? 20 : 0);
  addXP(xp);
  if (pass && q.kind === "boss") { S.insp++; save(); }
  scr = "qend";
  root.innerHTML = `<div class="gm">${topBar()}<div class="gm-res"><div class="gm-stamp${pass ? "" : " bad"}">${q.kind === "redo" ? (pass ? "사고 수습 완료" : "아직 불안해요") : (pass ? "점검 합격" : q.lives <= 0 ? "작업중지 명령" : "재점검 필요")}</div>` +
    `<div class="gm-stars" style="font-size:1.2em;color:var(--ink)">${q.right} / ${total} 정답 · ${q.score}점</div><div style="color:var(--sub);font-size:.88em">경험치 +${xp} · ${q.lives > 0 ? "목숨 " + q.lives + "개 남음" : "목숨을 모두 잃었어요"}</div>` +
    (q.wrong.length ? `<div class="gm-less"><b>틀린 것 — 곧 '재발 사고'로 다시 나와요</b>${q.wrong.map(id => `<div>✘ ${esc(F[id].sum)} <small>(${F[id].art} ${F[id].cl})</small></div>`).join("")}</div>` : `<div class="gm-less">😎 전부 맞혔어요!</div>`) +
    `<div class="gm-btns"><button type="button" class="pri" data-a="${q.kind === "redo" ? "redo" : "boss"}">${q.kind === "redo" ? "또 출동" : "다시 점검받기"}</button><button type="button" data-a="home">현장 사무소로</button></div></div></div>`;
  stopQ(); scr = "qend"; window.scrollTo(0, 0);
  if (pass) sfx.star();
}

/* =============== 입력 처리 =============== */
function onClick(e) {
  const t = e.target.closest("[data-a]"); if (!t) return;
  const a = t.dataset.a;
  if (busy && !["skip", "snd", "close", "toread"].includes(a)) return;
  switch (a) {
    case "toread": stopQ(); host && host.toRead(); break;
    case "close": stopQ(); host && host.close(); break;
    case "snd": S.snd = !S.snd; save(); t.textContent = S.snd ? "🔊" : "🔇"; if (S.snd) sfx.ok(); break;
    case "home": stopQ(); renderHome(); break;
    case "mis": renderMission(t.dataset.id); break;
    case "go": launch(); break;
    case "retry": retry(); break;
    case "skip": skip = true; break;
    case "dex": renderDex(); break;
    case "boss": startQ("boss"); break;
    case "redo": startQ("redo"); break;
    case "qok": { const i = $("#qIn"); answerQ(i ? i.value : ""); } break;
    case "qskip": answerQ(null, false); break;
    case "qnext": nextQ(); break;
    case "read": host && host.read(t.dataset.art); break;
    case "pick": {
      readVals(); cm.v[t.dataset.f] = t.dataset.v;
      renderForm(); drawScene(); break;
    }
    case "hint": {
      const fid = t.dataset.f, f = fieldsOf(cm.m, cm.v).find(x => x.id === fid);
      const lv = (cm.hintLv[fid] || 0) + 1, txt = f && hintText(cm.m, f, lv);
      if (!txt) { host && host.toast("더 드릴 힌트가 없어요"); break; }
      cm.hintLv[fid] = lv; cm.hints++;
      (cm.hn[fid] = cm.hn[fid] || []).push(txt);
      if (f.fact) cm.hinted[f.fact] = true;
      if (f.t !== "num") { ["open_cover", "open_temp"].forEach(k => { cm.hinted[k] = true; }); }
      const box = root.querySelector(`[data-hn="${fid}"]`); if (box) box.innerHTML = cm.hn[fid].map(x => `<div>💡 ${esc(x)}</div>`).join("");
      break;
    }
  }
}
function onInput(e) {
  if (!cm || scr !== "mis" || busy) return;
  if (e.target.matches("[data-in]")) {
    const id = e.target.dataset.in, f = fieldsOf(cm.m, cm.v).find(x => x.id === id);
    if (!f) return;
    if (f.t === "num") { let n = num(e.target.value); cm.v[id] = n; drawScene(); } else cm.v[id] = e.target.value;
  }
}
function onKey(e) {
  if (e.key !== "Enter") return;
  if (scr === "q" && e.target.id === "qIn") { e.preventDefault(); answerQ(e.target.value); }
  else if (scr === "mis" && e.target.matches("input[data-in]") && !busy) {
    e.preventDefault();
    const ins = [...root.querySelectorAll("input[data-in]")], i = ins.indexOf(e.target);
    if (i >= 0 && i < ins.length - 1) ins[i + 1].focus(); else { e.target.blur(); launch(); }
  }
}

/* =============== 붙이기 · 떼기 =============== */
window.SAPGAME = {
  mount(el, h) {
    root = el; host = h; alive = true; busy = false; skip = false;
    if (!document.getElementById("gmCss")) { const st = document.createElement("style"); st.id = "gmCss"; st.textContent = CSS; document.head.appendChild(st); }
    root.addEventListener("click", onClick); root.addEventListener("input", onInput); root.addEventListener("keydown", onKey);
    S = loadS(); theme();
    renderHome();
  },
  unmount() {
    alive = false; stopQ();
    if (root) { root.removeEventListener("click", onClick); root.removeEventListener("input", onInput); root.removeEventListener("keydown", onKey); root.innerHTML = ""; }
    root = null; cm = null; svgEl = null; sayEl = null;
  },
  _t: {F, MS, ACC, NF, TF, M1, M2, M3, M4, M5, get S() { return S; }},
};
})();
