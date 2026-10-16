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
const DIRT = {min: "이상", max: "이하", gt: "초과", lt: "미만", eq: ""};
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
/* ---- 새 편(전기·밀폐공간·굴착·화재/기계)의 낱말 카드와 사고 ---- */
[
  // 전기
  ["elb_v", "제304조", "제1항 제1호", "대지전압이 몇 V를 초과하는 이동형·휴대형 전기기계·기구에 누전차단기를 설치할까요?", 150, "V", "gt", "대지전압 150V 초과 이동형·휴대형 전기기계·기구 → 누전차단기"],
  ["elb_ma", "제304조", "제5항 제1호", "누전차단기의 정격감도전류는 몇 mA 이하여야 할까요?", 30, "mA", "max", "정격감도전류 30mA 이하 (정격전부하전류 50A 이상은 200mA 이하 가능)"],
  ["elb_t", "제304조", "제5항 제1호", "누전차단기의 작동시간은 몇 초 이내여야 할까요?", 0.03, "초", "max", "작동시간 0.03초 이내 (50A 이상은 0.1초 이내 가능)"],
  ["elb_ma50", "제304조", "제5항 제1호 단서", "정격전부하전류 50A 이상 기계에 접속하는 누전차단기는 정격감도전류를 몇 mA 이하까지 할 수 있을까요?", 200, "mA", "max", "정격전부하전류 50A 이상 → 200mA 이하, 0.1초 이내 가능"],
  ["gnd_h", "제302조", "제1항 제2호 가목", "지면이나 접지된 금속체로부터 수직거리 몇 m 이내의 노출된 비충전 금속체는 접지할까요?", 2.4, "m", "max", "수직거리 2.4m, 수평거리 1.5m 이내의 비충전 금속체는 접지"],
  ["gnd_w", "제302조", "제1항 제2호 가목", "지면이나 접지된 금속체로부터 수평거리 몇 m 이내의 노출된 비충전 금속체는 접지할까요?", 1.5, "m", "max", "수직거리 2.4m, 수평거리 1.5m 이내의 비충전 금속체는 접지"],
  ["gnd_v", "제302조", "제1항 제2호 라목", "사용전압이 대지전압 몇 V를 넘으면 노출된 비충전 금속체를 접지할까요?", 150, "V", "gt", "대지전압 150V를 넘는 것은 접지"],
  ["work_sp", "제310조", "제1항", "전기기계·기구의 조작부분을 점검·보수할 때 확보할 작업공간의 폭은 몇 cm 이상일까요?", 70, "cm", "min", "조작부분 점검·보수 시 폭 70cm 이상 작업공간 확보"],
  ["ap_03", "제321조", "제1항 제8호", "충전전로 선간전압 0.3 초과 0.75kV 이하(예: 380V)의 접근 한계거리는 몇 cm일까요?", 30, "cm", "eq", "접근 한계거리: 0.3~0.75kV 30cm"],
  ["ap_2", "제321조", "제1항 제8호", "충전전로 선간전압 2 초과 15kV 이하(예: 6.6kV)의 접근 한계거리는 몇 cm일까요?", 60, "cm", "eq", "접근 한계거리: 2~15kV 60cm"],
  ["ap_15", "제321조", "제1항 제8호", "충전전로 선간전압 15 초과 37kV 이하(예: 22.9kV)의 접근 한계거리는 몇 cm일까요?", 90, "cm", "eq", "접근 한계거리: 15~37kV 90cm"],
  ["ap_unq", "제321조", "제1항 제7호", "유자격자가 아닌 근로자는 대지전압 50kV 이하 충전전로에 몇 cm 이내로 접근할 수 없을까요?", 300, "cm", "eq", "유자격자가 아닌 근로자는 대지전압 50kV 이하 충전전로에 300cm 이내 접근 금지"],
  ["veh_300", "제322조", "제1항", "충전전로 인근에서 차량·기계장치 작업 시 충전부로부터 몇 cm 이상 이격할까요?", 300, "cm", "min", "차량·기계장치는 충전부로부터 300cm 이상 이격 (높이를 낮춰 이동할 땐 120cm 이상)"],
  // 밀폐공간
  ["o2_lo", "제618조", "제3호", "적정공기: 산소농도는 몇 % 이상이어야 할까요? (이보다 낮으면 산소결핍)", 18, "%", "min", "적정공기: 산소 18% 이상 23.5% 미만"],
  ["o2_hi", "제618조", "제3호", "적정공기: 산소농도는 몇 % 미만이어야 할까요?", 23.5, "%", "lt", "적정공기: 산소 18% 이상 23.5% 미만"],
  ["co2_hi", "제618조", "제3호", "적정공기: 이산화탄소 농도는 몇 % 미만일까요?", 1.5, "%", "lt", "적정공기: 이산화탄소 1.5% 미만"],
  ["co_hi", "제618조", "제3호", "적정공기: 일산화탄소 농도는 몇 ppm 미만일까요?", 30, "ppm", "lt", "적정공기: 일산화탄소 30ppm 미만"],
  ["h2s_hi", "제618조", "제3호", "적정공기: 황화수소 농도는 몇 ppm 미만일까요?", 10, "ppm", "lt", "적정공기: 황화수소 10ppm 미만"],
  // 굴착
  ["sl_sand", "제339조", "별표 11", "굴착면 기울기(높이 1에 대한 수평거리): 모래는 1 : 얼마 이상일까요?", 1.8, "", "min", "굴착면 기울기: 모래 1:1.8 · 연암·풍화암 1:1.0 · 경암 1:0.5 · 그 밖의 흙 1:1.2"],
  ["sl_soft", "제339조", "별표 11", "굴착면 기울기(높이 1에 대한 수평거리): 연암 및 풍화암은 1 : 얼마 이상일까요?", 1, "", "min", "굴착면 기울기: 모래 1:1.8 · 연암·풍화암 1:1.0 · 경암 1:0.5 · 그 밖의 흙 1:1.2"],
  ["sl_hard", "제339조", "별표 11", "굴착면 기울기(높이 1에 대한 수평거리): 경암은 1 : 얼마 이상일까요?", 0.5, "", "min", "굴착면 기울기: 모래 1:1.8 · 연암·풍화암 1:1.0 · 경암 1:0.5 · 그 밖의 흙 1:1.2"],
  ["sl_soil", "제339조", "별표 11", "굴착면 기울기(높이 1에 대한 수평거리): 그 밖의 흙은 1 : 얼마 이상일까요?", 1.2, "", "min", "굴착면 기울기: 모래 1:1.8 · 연암·풍화암 1:1.0 · 경암 1:0.5 · 그 밖의 흙 1:1.2"],
  // 화재
  ["fire_r", "제241조의2", "제1항 제1호", "용접·용단 작업 시 작업반경 몇 m 이내에 가연성물질이 있으면 화재감시자를 배치할까요?", 11, "m", "max", "작업반경 11m 이내에 가연성물질이 있는 장소 → 화재감시자 배치"],
].forEach(r => { NF.push(r); F[r[0]] = {id: r[0], t: "n", art: r[1], cl: r[2], q: r[3], a: r[4], u: r[5], dir: r[6], sum: r[7]}; });
[
  ["t_lock", "제319조", "제2항 제3호", "정전 작업 시 차단장치나 단로기에 꼬리표와 함께 붙이는 것은? (다른 사람이 전원을 넣지 못하게)", ["잠금장치", "잠금", "자물쇠", "락"], "잠금장치", "차단장치에 잠금장치 및 꼬리표 부착 (그 잠금장치·꼬리표는 설치한 근로자가 직접 철거)"],
  ["t_detect", "제319조", "제2항 제5호", "전로를 차단한 뒤 작업 대상 기기가 충전되어 있는지 확인하는 기구는?", ["검전기", "검전"], "검전기", "검전기로 충전 여부 확인"],
  ["t_discharge", "제319조", "제2항 제4호", "정전한 기기에 남은 전기에너지(잔류전하)가 위험할 수 있어 접촉 전에 완전히 해야 하는 것은?", ["방전"], "방전", "잔류전하는 접촉 전에 완전히 방전"],
  ["t_obs", "제623조", "제1항", "밀폐공간 작업 중 작업 상황을 감시하려고 밀폐공간 외부에 배치하는 사람은?", ["감시인", "감시자"], "감시인", "밀폐공간 외부에 감시인 배치 + 항상 연락할 수 있는 설비"],
  ["t_scba", "제625조", "", "밀폐공간에서 비상시 근로자를 구출하려면 구조자는 사다리·섬유로프 외에 반드시 무엇을 착용할까요? (맨몸 진입 금지)", ["공기호흡기", "송기마스크", "호흡기", "호흡보호구"], "공기호흡기·송기마스크", "공기호흡기 또는 송기마스크, 사다리·섬유로프 등 구출 기구를 갖추어 둘 것"],
  ["t_119", "제623조", "제2항", "밀폐공간에서 근로자에게 이상이 생기면 감시인이 지체 없이 해야 할 일은?", ["119", "소방", "신고"], "소방관서(119)에 신고", "감시인은 지체 없이 관할 소방관서에 신고하고 조치 후 사업주·관리감독자에게 알림"],
  ["t_support", "제340조", "", "굴착 중 토사 붕괴·낙하 우려가 있을 때 미리 설치해야 하는 대표적인 구조물은?", ["흙막이", "지보공"], "흙막이 지보공", "토사 붕괴 우려 시 흙막이 지보공·방호망 설치, 근로자 출입금지"],
  ["t_guide", "제344조", "제1항", "굴착기계가 근로자의 작업장소로 후진해 접근할 우려가 있을 때 배치하는 사람은?", ["유도자"], "유도자", "굴착기계 후진 접근·굴러 떨어질 우려 → 유도자 배치"],
  ["t_watch", "제241조의2", "제1항", "가연성물질이 있는 장소에서 용접·용단 작업을 할 때 작업장소에 지정해 배치하는 사람은?", ["화재감시자", "감시자", "감시인"], "화재감시자", "가연물 있는 장소 용접·용단 → 화재감시자 지정·배치"],
  ["t_blanket", "제241조", "제2항 제4호", "화재위험작업 시 불꽃·불티 비산을 막으려고 설치하는 것은? (예: 용접불티 비산방지덮개)", ["방화포", "비산방지", "덮개", "불티"], "용접방화포·비산방지덮개", "용접불티 비산방지덮개·용접방화포 등으로 불꽃·불티 비산 방지"],
  ["t_ext", "제241조", "제2항 제3호", "화기작업 중 인근 가연성물질을 방호하고 현장에 갖춰 두어야 하는 기구는?", ["소화기", "소화"], "소화기구", "인근 가연성물질 방호조치 및 소화기구 비치"],
  ["t_o2", "제241조", "제1항", "통풍·환기가 충분하지 않은 장소에서 화재위험작업을 할 때, 환기용으로 사용해서는 안 되는 가스는?", ["산소"], "산소", "통풍·환기가 불충분한 장소에서 화재위험작업 시 환기에 산소 사용 금지"],
  ["t_mlock", "제92조", "제2항", "정비·청소 중 다른 사람이 기계를 켜지 못하도록 기동장치에 하는 조치는? (열쇠는 별도 관리)", ["잠금", "잠금장치", "자물쇠"], "잠금장치", "기동장치에 잠금장치를 하고 열쇠를 별도 관리하거나 표지판 설치"],
].forEach(r => { TF.push(r); F[r[0]] = {id: r[0], t: "x", art: r[1], cl: r[2], q: r[3], ok: r[4], ans: r[5], sum: r[6]}; });
Object.assign(ACC, {
  a_elb_none: {n: "누전차단기 없는 감전", ic: "⚡", art: "제304조", tip: "대지전압 150V 초과 이동형·휴대형 기계, 습윤·철판 위 작업 기계에는 누전차단기를 설치해야 합니다."},
  a_elb_slow: {n: "늦게 차단된 누전", ic: "⏱️", art: "제304조", tip: "누전차단기는 정격감도전류 30mA 이하, 작동시간 0.03초 이내여야 사람이 견딥니다."},
  a_loto_restart: {n: "정전 작업 중 재통전 감전", ic: "🔌", art: "제319조", tip: "차단 후 차단장치에 잠금장치와 꼬리표를 붙여야 다른 사람이 전원을 넣지 못합니다."},
  a_loto_residual: {n: "잔류전하·미확인 감전", ic: "🔋", art: "제319조", tip: "접촉 전 잔류전하를 방전하고 검전기로 충전 여부를 확인해야 합니다."},
  a_loto_unknown: {n: "다른 전원 간과 감전", ic: "📋", art: "제319조", tip: "먼저 도면·배선도로 공급 전원을 모두 확인한 뒤 차단 순서를 시작하세요."},
  a_arc_lv: {n: "저압선 접촉 감전", ic: "⚡", art: "제321조", tip: "0.3~0.75kV 충전전로 접근 한계거리는 30cm."},
  a_arc_hv: {n: "고압 아크 사고", ic: "🌩️", art: "제321조", tip: "2~15kV(6.6kV 등) 충전전로 접근 한계거리는 60cm."},
  a_arc_xhv: {n: "특고압 방전 사고", ic: "☄️", art: "제321조", tip: "15~37kV(22.9kV 등) 충전전로 접근 한계거리는 90cm."},
  a_gas_o2: {n: "산소결핍 질식", ic: "😵", art: "제618조", tip: "산소농도 18% 미만이면 산소결핍. 적정공기는 18% 이상 23.5% 미만."},
  a_gas_co2: {n: "이산화탄소 질식", ic: "☁️", art: "제618조", tip: "이산화탄소는 1.5% 미만이 적정공기."},
  a_gas_co: {n: "일산화탄소 중독", ic: "☠️", art: "제618조", tip: "일산화탄소는 30ppm 미만이 적정공기."},
  a_gas_h2s: {n: "황화수소 중독", ic: "🥚", art: "제618조", tip: "황화수소는 10ppm 미만이 적정공기. 냄새를 못 느끼는 순간 이미 위험합니다."},
  a_conf_nowatch: {n: "감시인 없는 질식", ic: "🙈", art: "제623조", tip: "밀폐공간 작업 중에는 외부에 감시인을 두고 항상 연락할 설비를 설치해야 합니다."},
  a_conf_mask: {n: "방진마스크 질식", ic: "😶", art: "제620조", tip: "방진마스크는 산소결핍을 막지 못합니다. 공기호흡기·송기마스크를 써야 합니다."},
  a_conf_fire: {n: "밀폐공간 화재·폭발", ic: "🔥", art: "제620조", tip: "밀폐공간에서 불꽃 확인 금지, 산소로 환기 금지. 환기로 적정공기를 유지하세요."},
  a_conf_rescue: {n: "2차 재해 (맨몸 구조)", ic: "🆘", art: "제625조", tip: "구조자도 공기호흡기·송기마스크 없이 들어가면 함께 쓰러집니다. 구출 기구를 갖춰 두세요."},
  a_conf_nocall: {n: "신고 지연 사고", ic: "📵", art: "제623조", tip: "이상이 생기면 감시인이 지체 없이 소방관서에 신고해야 합니다."},
  a_conf_nometer: {n: "측정 없이 진입한 질식", ic: "📟", art: "제619조", tip: "작업 전 산소·유해가스 농도를 측정하고 환기하세요."},
  a_exc_sand: {n: "모래 굴착면 붕괴", ic: "🏖️", art: "제339조", tip: "모래는 굴착면 기울기 1:1.8 이상으로 완만하게."},
  a_exc_rock: {n: "연암·풍화암 붕괴", ic: "🪨", art: "제339조", tip: "연암 및 풍화암은 1:1.0."},
  a_exc_hard: {n: "경암 낙석", ic: "⛰️", art: "제339조", tip: "경암은 1:0.5."},
  a_exc_soil: {n: "흙 굴착면 붕괴", ic: "🟤", art: "제339조", tip: "그 밖의 흙은 1:1.2."},
  a_exc_cave: {n: "흙막이 없는 토사 붕괴", ic: "🕳️", art: "제340조", tip: "토사 붕괴 우려 시 흙막이 지보공·방호망 설치, 근로자 출입금지."},
  a_exc_rain: {n: "비 온 뒤 사면 붕괴", ic: "☔", art: "제339조", tip: "빗물 침투를 막기 위해 측구를 설치하거나 굴착경사면에 비닐을 덮으세요."},
  a_exc_pipe: {n: "매설물 파손 가스 누출", ic: "🔧", art: "제341조", tip: "노출된 매설물은 방호하거나 이설하고, 관리감독자가 지휘합니다. 지하 공작물이 파손될 우려가 있으면 굴착을 중지."},
  a_exc_machine: {n: "굴착기 후진 협착", ic: "🚜", art: "제344조", tip: "굴착기계가 후진해 근로자에게 접근할 우려가 있으면 유도자를 배치합니다."},
  a_fire_spark: {n: "용접 불티 화재", ic: "🔥", art: "제241조", tip: "작업반경 11m 이내 가연물은 치우거나 용접방화포 등으로 방호하세요."},
  a_fire_nowatch: {n: "화재감시자 없는 재발화", ic: "👀", art: "제241조의2", tip: "가연물이 있는 곳의 용접·용단 작업엔 화재감시자를 배치합니다."},
  a_fire_nofx: {n: "소화기 없는 초기진화 실패", ic: "🧯", art: "제241조", tip: "화기작업 장소에는 소화기구를 비치합니다."},
  a_mach_restart: {n: "정비 중 재가동 끼임", ic: "⚙️", art: "제92조", tip: "정비 중에는 기동장치를 잠그고 열쇠를 별도 관리하거나 표지판을 설치하세요."},
  a_mach_nostop: {n: "가동 중 정비 말림", ic: "🌀", art: "제92조", tip: "동력 기계의 정비·청소·급유 작업은 운전을 정지하고 합니다."},
  a_mach_pressure: {n: "잔압 분출 사고", ic: "💨", art: "제92조", tip: "내부에 압축된 기체·액체가 있으면 정비 전에 미리 방출하세요."},
});

/* ---- 보건 편: 낱말 카드와 사고 ---- */
[
  ["noise_85", "제512조", "제1호", "'소음작업'은 1일 8시간 기준으로 몇 dB 이상의 소음이 발생하는 작업일까요?", 85, "dB", "min", "소음작업: 1일 8시간 기준 85dB 이상 (청력보호구 지급·착용, 청력보존 프로그램 대상)"],
  ["noise_90", "제512조", "제2호 가목", "'강렬한 소음작업': 90dB 이상 소음이 1일 몇 시간 이상 발생하는 작업일까요?", 8, "시간", "min", "강렬한 소음작업: 90dB 8시간 · 95dB 4시간 · 100dB 2시간 · 105dB 1시간 · 110dB 30분 · 115dB 15분 (이상)"],
  ["noise_95", "제512조", "제2호 나목", "'강렬한 소음작업': 95dB 이상 소음이 1일 몇 시간 이상 발생하는 작업일까요?", 4, "시간", "min", "강렬한 소음작업: 90dB 8시간 · 95dB 4시간 · 100dB 2시간 · 105dB 1시간 · 110dB 30분 · 115dB 15분 (이상)"],
  ["noise_100", "제512조", "제2호 다목", "'강렬한 소음작업': 100dB 이상 소음이 1일 몇 시간 이상 발생하는 작업일까요?", 2, "시간", "min", "강렬한 소음작업: 90dB 8시간 · 95dB 4시간 · 100dB 2시간 · 105dB 1시간 · 110dB 30분 · 115dB 15분 (이상)"],
  ["noise_105", "제512조", "제2호 라목", "'강렬한 소음작업': 105dB 이상 소음이 1일 몇 시간 이상 발생하는 작업일까요?", 1, "시간", "min", "강렬한 소음작업: 90dB 8시간 · 95dB 4시간 · 100dB 2시간 · 105dB 1시간 · 110dB 30분 · 115dB 15분 (이상)"],
  ["noise_110", "제512조", "제2호 마목", "'강렬한 소음작업': 110dB 이상 소음이 1일 몇 분 이상 발생하는 작업일까요?", 30, "분", "min", "강렬한 소음작업: 90dB 8시간 · 95dB 4시간 · 100dB 2시간 · 105dB 1시간 · 110dB 30분 · 115dB 15분 (이상)"],
  ["noise_115", "제512조", "제2호 바목", "'강렬한 소음작업': 115dB 이상 소음이 1일 몇 분 이상 발생하는 작업일까요?", 15, "분", "min", "강렬한 소음작업: 90dB 8시간 · 95dB 4시간 · 100dB 2시간 · 105dB 1시간 · 110dB 30분 · 115dB 15분 (이상)"],
  ["imp_120", "제512조", "제3호 가목", "'충격소음작업': 120dB을 초과하는 소음이 1일 몇 회 이상 발생하는 작업일까요?", 10000, "회", "min", "충격소음작업: 120dB 초과 1만회 · 130dB 초과 1천회 · 140dB 초과 1백회 이상 (1초 이상 간격)"],
  ["imp_130", "제512조", "제3호 나목", "'충격소음작업': 130dB을 초과하는 소음이 1일 몇 회 이상 발생하는 작업일까요?", 1000, "회", "min", "충격소음작업: 120dB 초과 1만회 · 130dB 초과 1천회 · 140dB 초과 1백회 이상 (1초 이상 간격)"],
  ["imp_140", "제512조", "제3호 다목", "'충격소음작업': 140dB을 초과하는 소음이 1일 몇 회 이상 발생하는 작업일까요?", 100, "회", "min", "충격소음작업: 120dB 초과 1만회 · 130dB 초과 1천회 · 140dB 초과 1백회 이상 (1초 이상 간격)"],
  ["hood_gas_enc", "제429조", "별표 13", "관리대상 유해물질 후드 제어풍속: 가스 상태, 포위식 포위형은 몇 m/sec 이상일까요?", 0.4, "m/s", "min", "후드 제어풍속(별표 13): 가스 포위식 0.4 · 외부식 측방·하방 0.5 · 상방 1.0 / 입자 포위식 0.7 · 측방·하방 1.0 · 상방 1.2"],
  ["hood_gas_side", "제429조", "별표 13", "관리대상 유해물질 후드 제어풍속: 가스 상태, 외부식 측방흡인형은 몇 m/sec 이상일까요?", 0.5, "m/s", "min", "후드 제어풍속(별표 13): 가스 포위식 0.4 · 외부식 측방·하방 0.5 · 상방 1.0 / 입자 포위식 0.7 · 측방·하방 1.0 · 상방 1.2"],
  ["hood_gas_up", "제429조", "별표 13", "관리대상 유해물질 후드 제어풍속: 가스 상태, 외부식 상방흡인형은 몇 m/sec 이상일까요?", 1, "m/s", "min", "후드 제어풍속(별표 13): 가스 포위식 0.4 · 외부식 측방·하방 0.5 · 상방 1.0 / 입자 포위식 0.7 · 측방·하방 1.0 · 상방 1.2"],
  ["hood_dust_enc", "제429조", "별표 13", "관리대상 유해물질 후드 제어풍속: 입자 상태(흄·분진·미스트), 포위식 포위형은 몇 m/sec 이상일까요?", 0.7, "m/s", "min", "후드 제어풍속(별표 13): 가스 포위식 0.4 · 외부식 측방·하방 0.5 · 상방 1.0 / 입자 포위식 0.7 · 측방·하방 1.0 · 상방 1.2"],
  ["hood_dust_side", "제429조", "별표 13", "관리대상 유해물질 후드 제어풍속: 입자 상태, 외부식 측방흡인형은 몇 m/sec 이상일까요?", 1, "m/s", "min", "후드 제어풍속(별표 13): 가스 포위식 0.4 · 외부식 측방·하방 0.5 · 상방 1.0 / 입자 포위식 0.7 · 측방·하방 1.0 · 상방 1.2"],
  ["hood_dust_up", "제429조", "별표 13", "관리대상 유해물질 후드 제어풍속: 입자 상태, 외부식 상방흡인형은 몇 m/sec 이상일까요?", 1.2, "m/s", "min", "후드 제어풍속(별표 13): 가스 포위식 0.4 · 외부식 측방·하방 0.5 · 상방 1.0 / 입자 포위식 0.7 · 측방·하방 1.0 · 상방 1.2"],
  ["env_first", "시행규칙 제190조", "제1항", "작업환경측정 대상 작업장이 된 날부터 며칠 이내에 첫 작업환경측정을 할까요?", 30, "일", "max", "신규 가동·변경 후 30일 이내 첫 측정, 이후 반기(6개월)에 1회 이상"],
  ["env_half", "시행규칙 제190조", "제1항", "첫 측정 후 작업환경측정은 정기적으로 몇 개월에 1회 이상 할까요? (반기)", 6, "개월", "max", "신규 가동·변경 후 30일 이내 첫 측정, 이후 반기(6개월)에 1회 이상"],
  ["env_exceed", "시행규칙 제190조", "제1항 각 호", "측정치가 노출기준을 초과한 유해인자는 측정일부터 몇 개월에 1회 이상 다시 측정할까요?", 3, "개월", "max", "노출기준 초과(일부 물질은 2배 이상 초과) 시 3개월에 1회 이상 측정"],
  ["env_report", "시행규칙 제188조", "제1항", "작업환경측정 결과는 시료채취를 마친 날부터 며칠 이내에 지방고용노동관서에 보고할까요?", 30, "일", "max", "측정 결과보고서는 시료채취를 마친 날부터 30일 이내 제출"],
  ["env_improve", "시행규칙 제188조", "제3항", "노출기준을 초과한 작업공정의 개선 증명서류·개선 계획은 시료채취를 마친 날부터 며칠 이내에 제출할까요?", 60, "일", "max", "노출기준 초과 공정은 시료채취일부터 60일 이내 개선 증명서류·계획 제출"],
  ["gen_exam", "시행규칙 제197조", "제1항", "일반건강진단은 사무직이 아닌 근로자에게 몇 년에 1회 이상 실시할까요?", 1, "년", "max", "일반건강진단: 사무직 2년에 1회 이상, 그 밖의 근로자 1년에 1회 이상"],
  ["gen_office", "시행규칙 제197조", "제1항", "일반건강진단은 사무직 근로자에게 몇 년에 1회 이상 실시할까요?", 2, "년", "max", "일반건강진단: 사무직 2년에 1회 이상, 그 밖의 근로자 1년에 1회 이상"],
].forEach(r => { NF.push(r); F[r[0]] = {id: r[0], t: "n", art: r[1], cl: r[2], q: r[3], a: r[4], u: r[5], dir: r[6], sum: r[7]}; });
[
  ["t_msds", "법 제114조", "제1항", "화학물질의 유해성과 취급 주의사항을 적어, 취급 작업장 안에 근로자가 쉽게 볼 수 있게 게시·비치해야 하는 자료의 이름은? (약칭 MSDS)", ["물질안전보건자료", "msds", "MSDS", "엠에스디에스"], "물질안전보건자료(MSDS)", "MSDS는 취급 작업장 안에 근로자가 쉽게 볼 수 있는 장소에 게시하거나 갖추어 둔다"],
  ["t_label", "법 제115조", "제2항", "사업장에서 쓰는 물질안전보건자료대상물질을 담은 용기에는 무엇을 해야 할까요?", ["경고표시", "경고 표시", "라벨", "경고표지"], "경고표시", "사업장에서 사용하는 대상물질 용기에도 경고표시를 한다"],
  ["t_hear", "제516조", "제2항", "소음작업 근로자에게 지급하는 청력보호구는 누구 전용으로 지급해야 할까요?", ["개인", "개인전용", "근로자 개인", "각자"], "근로자 개인 전용", "청력보호구는 근로자 개인 전용으로 지급"],
  ["t_hcp", "제517조", "", "소음작업 사업장에서 소음노출 평가·청력보호구·교육·청력검사 등을 담아 수립·시행하는 계획의 이름은?", ["청력보존 프로그램", "청력보존프로그램", "청력보존"], "청력보존 프로그램", "소음작업·강렬한 소음작업·충격소음작업 사업장은 청력보존 프로그램 수립·시행"],
  ["t_tankmask", "제450조", "제1항", "유기화합물을 넣었던 탱크 내부의 세척·페인트칠 업무에는 어떤 마스크를 지급해 착용시킬까요?", ["송기마스크"], "송기마스크", "유기화합물 탱크 내부 세척·페인트칠, 유기화합물 취급 특별장소 업무 → 송기마스크"],
].forEach(r => { TF.push(r); F[r[0]] = {id: r[0], t: "x", art: r[1], cl: r[2], q: r[3], ok: r[4], ans: r[5], sum: r[6]}; });
Object.assign(ACC, {
  a_noise_85: {n: "소음작업 방치 난청", ic: "🔉", art: "제512조", tip: "1일 8시간 기준 85dB 이상이면 소음작업입니다. 청력보호구 지급·청력보존 프로그램 대상이에요."},
  a_noise_95: {n: "95dB 장시간 노출 난청", ic: "🔊", art: "제512조", tip: "95dB 이상이 1일 4시간 이상이면 강렬한 소음작업."},
  a_noise_100: {n: "100dB 노출 난청", ic: "📢", art: "제512조", tip: "100dB 이상이 1일 2시간 이상이면 강렬한 소음작업."},
  a_noise_110: {n: "110dB 노출 청력 손상", ic: "🚨", art: "제512조", tip: "110dB 이상이 1일 30분 이상이면 강렬한 소음작업."},
  a_noise_115: {n: "115dB 노출 청력 손상", ic: "💥", art: "제512조", tip: "115dB 이상이 1일 15분 이상이면 강렬한 소음작업."},
  a_hood_gas: {n: "유기용제 증기 흡입 중독", ic: "🧪", art: "제429조", tip: "가스 상태 물질의 후드 제어풍속: 포위식 0.4 · 측방·하방 0.5 · 상방 1.0 m/s 이상."},
  a_hood_dust: {n: "분진·흄 흡입 호흡기 손상", ic: "🌫️", art: "제429조", tip: "입자 상태 물질의 후드 제어풍속: 포위식 0.7 · 측방·하방 1.0 · 상방 1.2 m/s 이상."},
  a_env_late: {n: "측정 지연으로 늦게 발견된 유해환경", ic: "📅", art: "시행규칙 제190조", tip: "작업환경측정 대상이 되면 30일 이내 첫 측정, 이후 반기에 1회 이상."},
  a_env_exceed: {n: "초과 작업장 재측정 지연", ic: "📈", art: "시행규칙 제190조", tip: "노출기준을 초과한 유해인자는 3개월에 1회 이상 다시 측정."},
  a_env_report: {n: "측정 결과 보고 지연", ic: "📝", art: "시행규칙 제188조", tip: "시료채취를 마친 날부터 30일 이내에 결과를 보고합니다."},
  a_env_improve: {n: "개선 지연", ic: "🔧", art: "시행규칙 제188조", tip: "노출기준 초과 공정은 60일 이내 개선 증명서류·계획을 제출합니다."},
  a_msds_hidden: {n: "금고 속 MSDS", ic: "📁", art: "법 제114조", tip: "MSDS는 취급 근로자가 쉽게 볼 수 있는 곳에 게시하거나 갖추어 둡니다."},
  a_msds_label: {n: "표시 없는 용기 오사용", ic: "🏷️", art: "법 제115조", tip: "옮겨 담은 용기에도 경고표시를 합니다."},
  a_msds_edu: {n: "교육 없이 취급해 일어난 혼합 사고", ic: "🎓", art: "법 제114조", tip: "대상물질을 취급하는 근로자 모두를 교육합니다."},
  a_msds_mix: {n: "눈대중 혼합 유독가스", ic: "⚗️", art: "법 제114조", tip: "성질을 모르는 약품을 섞으면 유독가스가 생길 수 있어요. MSDS로 확인하세요."},
  a_msds_proc: {n: "관리요령 없는 공정 오조작", ic: "📋", art: "법 제114조", tip: "작업공정별로 물질의 관리 요령을 게시합니다."},
  a_msds_ppe: {n: "보호구·응급조치를 몰라 피해 확대", ic: "🧤", art: "제442조", tip: "관리대상 유해물질 작업장에는 명칭·영향·주의사항·보호구·응급조치를 게시합니다."},
  a_ppe_tank: {n: "탱크 내부 유기용제 중독", ic: "🛢️", art: "제450조", tip: "유기화합물을 넣었던 탱크 내부 작업에는 송기마스크를 착용합니다."},
  a_ppe_solvent: {n: "용제 증기 흡입", ic: "😷", art: "제450조", tip: "밀폐설비·국소배기장치가 없는 곳의 유기화합물 취급에는 송기마스크나 방독마스크."},
  a_ppe_dust: {n: "분진 흡입 진폐", ic: "🌫️", art: "제617조", tip: "분진작업 근로자에게 호흡용 보호구를 지급해 착용시킵니다(설비 조치 시 예외)."},
  a_ppe_noise: {n: "보호구 없이 소음 노출", ic: "🎧", art: "제516조", tip: "소음작업 근로자에게 개인 전용 청력보호구를 지급·착용시킵니다."},
  a_ppe_skin: {n: "부식성 물질 피부 손상", ic: "🧴", art: "제451조", tip: "피부 자극성·부식성 물질에는 불침투성 보호복·장갑·장화를 갖춰 두고 사용하게 합니다."},
});

const accN = () => Object.keys(ACC).length;

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
const frame = cb => { let d = false; const f = () => { if (d) return; d = true; cb(performance.now()); }; requestAnimationFrame(f); setTimeout(f, 40); };   // 화면이 가려져 rAF 가 멈춰도 진행되게
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
      p < 1 ? frame(step) : res();
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
.gm{word-break:keep-all;overflow-wrap:break-word}
.gm-brief,.gm-say,.gm-less,.gm-bub,.gm-fb,.gm-ck span,.gm-guide{text-wrap:pretty}
.gm-fl,.gm-mt b,.gm-sec{text-wrap:balance}
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
.gm-guide>b:first-child{display:block;margin-bottom:2px}
.gm-guide div b{color:var(--accent)}
.gm-rnd{background:linear-gradient(135deg,#1c3b73,#2a9d8f);color:#fff}.gm-rnd .gm-mn{background:rgba(255,255,255,.2)}.gm-rnd small{color:rgba(255,255,255,.8)}
.gm-rnd2 .gm-mn{background:#fff3cf}
.gm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.gm-tile{position:relative}
.gm-tb{width:100%;text-align:left;border:0;background:var(--panel);color:var(--ink);border-radius:16px;padding:11px 12px;display:flex;flex-direction:column;gap:1px;min-height:74px;box-shadow:var(--shadow,0 1px 2px rgba(0,0,0,.05));transition:transform .15s}
.gm-tb:active{transform:scale(.97)}
.gm-tb .ic{font-size:1.4em;line-height:1.2}.gm-tb b{letter-spacing:-.03em;font-size:.95em}.gm-tb small{color:var(--sub);font-size:.78em}
.gm-tile.open .gm-tb{outline:2px solid var(--accent)}
.gm-tl{position:absolute;top:7px;right:7px;border:0;background:var(--fill,#f2f4f6);color:var(--sub);border-radius:9px;width:30px;height:30px;font-weight:800}
.gm-fold{display:block;width:100%;border:0;background:none;color:var(--sub);font-weight:700;padding:2px 6px 8px;text-align:left;font-size:.86em}
.gm-rtag{display:inline-block;background:#fff3cf;color:#5b3d00;border-radius:99px;padding:1px 10px;font-size:.82em;font-weight:800;margin-right:6px}
.gm-modal{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}
.gm-sheet{background:var(--panel);color:var(--ink);width:100%;max-width:720px;max-height:84vh;display:flex;flex-direction:column;border-radius:20px 20px 0 0;padding:14px 18px calc(16px + env(safe-area-inset-bottom,0px));animation:gmup .25s;font-size:15px;line-height:1.65;word-break:keep-all;overflow-wrap:break-word}
.gm-shh{display:flex;align-items:center;gap:10px;margin-bottom:6px}.gm-shh b{flex:1;letter-spacing:-.02em}
.gm-shb{overflow:auto;flex:1;min-height:0;border-top:1px solid var(--line);padding-top:6px}
.gm-sheet .gm-btns button{border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:13px;padding:11px 8px;font-weight:700;font:inherit}
.gm-sheet .gm-ib{border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:10px;width:36px;height:36px}
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
.gm-seq{grid-column:1/-1;margin:2px 0 4px;padding:0 0 0 1.4em;font-size:.92em}
.gm-seq li{padding:2px 0}.gm-seq .gm-ph{list-style:none;margin-left:-1.4em;color:var(--sub)}
.gm-col .gm-chip{width:100%;text-align:left;font-weight:600}
.gm-clr{grid-column:1/-1;justify-self:start;border:0;background:none;color:var(--accent);font-weight:700;padding:4px 0}
.gm-sub{grid-column:1/-1;font-size:.8em;color:var(--sub)}
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

/* =============== 새 편의 그림 부품 =============== */
const ck = (f, label, ok, o) => Object.assign({f, label, ok}, o || {});
async function zap(svg, x1, y1, x2, y2, ms) {
  const p = document.createElementNS(NS, "polyline");
  p.setAttribute("fill", "none"); p.setAttribute("stroke", "#ffd84a"); p.setAttribute("stroke-width", "2.6"); p.setAttribute("stroke-linejoin", "round");
  p.setAttribute("style", "filter:drop-shadow(0 0 3px #fff)"); svg.appendChild(p);
  await tw(ms || 500, () => {
    const pts = [];
    for (let i = 0; i <= 7; i++) { const t = i / 7, j = i && i < 7 ? 1 : 0; pts.push(`${(L(x1, x2, t) + j * (Math.random() - .5) * 14).toFixed(1)},${(L(y1, y2, t) + j * (Math.random() - .5) * 14).toFixed(1)}`); }
    p.setAttribute("points", pts.join(" ")); p.setAttribute("opacity", Math.random() > .25 ? 1 : .35);
  }, ease.lin);
  p.remove();
}
const bubble = (svg, x, y, s, col) => pop(svg, x, y, s, col);
function generic(svg, res, x, y) { say("⚠️ 기준과 다른 값이 있어요. 정확한 기준을 맞춰야 안전합니다."); pop(svg, x || 180, y || 100, "✘ 기준 불일치", "#e5484d"); sfx.bad(); }
const failAcc = (res, a) => res.some(c => !c.ok && c.acc === a);
const allOk = res => res.every(c => c.ok);
const ownEl = (svg, html, name) => { const g = document.createElementNS(NS, "g"); g.setAttribute("data-r", name); g.innerHTML = html; svg.appendChild(g); return g; };

/* ---------- 의뢰 6: 누전차단기 (제304조) ---------- */
const M6 = {
  draw(v) {
    const ma = Number.isFinite(v.ma) ? fmt(v.ma) + "mA" : "?", t = Number.isFinite(v.t) ? fmt(v.t) + "초" : "?";
    let s = rc("g-in", 0, 0, 360, 240) + rc("g-conc", 0, 192, 360, 48);
    s += rc("g-steel", 18, 184, 232, 9, 'rx="2"') + `<ellipse cx="150" cy="192" rx="62" ry="5" fill="#5b8fd9" opacity=".55"/>`;
    s += `<text x="16" y="24" class="g-tag">220V 전동드릴 · 젖은 철판 위</text>`;
    s += `<g data-r="box">` + rc("g-conc2", 262, 92, 88, 100, 'rx="6"') + rc("", 270, 100, 72, 56, 'rx="3" fill="#1d2433"');
    s += `<text x="306" y="116" text-anchor="middle" font-size="8.5" font-weight="800" fill="#cde4ff">누전차단기</text><text x="306" y="133" text-anchor="middle" font-size="11" font-weight="900" fill="#ffd84a">${ma}</text><text x="306" y="148" text-anchor="middle" font-size="11" font-weight="900" fill="#ffd84a">${t}</text>`;
    s += `<circle data-r="lamp" cx="306" cy="172" r="7" fill="#3aa56d"/><text x="306" y="188" text-anchor="middle" font-size="7.5" fill="var(--sub)">전원</text></g>`;
    s += `<path d="M262 150 C228 196 196 174 164 140" stroke="#222" fill="none" stroke-width="2.6"/>`;
    s += `<g data-r="drill"><rect x="150" y="130" width="22" height="12" rx="2" fill="#e5a100"/><rect x="142" y="134" width="9" height="4" fill="#888"/></g>`;
    s += wkr("w1", 110, 190, 72);
    if (Number.isFinite(v.v)) s += `<text x="262" y="82" class="g-tag">${fmt(v.v)}V 초과에 설치</text>`;
    return s;
  },
  eval(v) {
    const c = [];
    const o1 = v.v === 150;
    c.push(ck("elb_v", "누전차단기 설치 대상 대지전압", o1, {dir: o1 ? null : v.v > 150 ? "down" : "up", val: fmt(v.v) + "V 초과", need: "150V 초과", acc: v.v > 150 ? "a_elb_none" : null}));
    const o2 = v.ma <= 30 && v.ma > 0;
    c.push(ck("elb_ma", "정격감도전류", o2, {dir: o2 ? null : "down", val: fmt(v.ma) + "mA", need: "30mA 이하", acc: "a_elb_slow"}));
    const o3 = v.t <= 0.03 && v.t > 0;
    c.push(ck("elb_t", "작동시간", o3, {dir: o3 ? null : "down", val: fmt(v.t) + "초", need: "0.03초 이내", acc: "a_elb_slow"}));
    return c;
  },
  async play(svg, v, res) {
    const w = R(svg, "w1"), lamp = R(svg, "lamp");
    say("젖은 철판 위에서 전동드릴로 작업합니다…");
    await walk(w, 60, 112, 190, 800);
    say("드릴 내부에서 누전이 발생합니다!");
    if (failAcc(res, "a_elb_none")) {
      say("누전차단기가 없어요. 전류가 몸으로 흐릅니다!");
      await zap(svg, 160, 136, 118, 160, 700);
      hurt(w); shake(); sfx.thud(); await tw(500, t => setT(w, 112, 190, 80 * t));
      say("💥 누전차단기가 없어 감전됐습니다.");
    } else if (failAcc(res, "a_elb_slow")) {
      say("차단기가 있지만 반응이 느려요…");
      await zap(svg, 160, 136, 118, 160, 1100);
      lamp && lamp.setAttribute("fill", "#e5484d");
      hurt(w); shake(); sfx.thud(); await tw(500, t => setT(w, 112, 190, 80 * t));
      say("💥 감도·작동시간 기준을 못 맞춰 차단 전에 감전됐습니다.");
    } else if (!allOk(res)) generic(svg, res, 150, 110);
    else {
      zap(svg, 160, 136, 150, 176, 160);
      await wait(260);
      lamp && lamp.setAttribute("fill", "#e5484d"); sfx.ok();
      pop(svg, 306, 78, "딸깍! 차단", "#12a37f");
      say("🟢 누전차단기가 즉시 전원을 끊어 작업자는 무사합니다.");
    }
  },
};

/* ---------- 의뢰 7: 정전 작업 순서 (제319조) ---------- */
const LOTO = [
  {id: "s1", t: "관련 도면·배선도로 공급 전원을 모두 확인"},
  {id: "s2", t: "전원 차단 → 단로기 개방 후 확인"},
  {id: "s3", t: "차단장치에 잠금장치·꼬리표 부착"},
  {id: "s4", t: "잔류전하 방전"},
  {id: "s5", t: "검전기로 충전 여부 확인"},
  {id: "s6", t: "필요하면 단락 접지기구로 접지"},
];
const M7 = {
  draw(v) {
    let s = rc("g-in", 0, 0, 360, 240) + rc("g-conc", 0, 200, 360, 40);
    s += `<g data-r="panel">` + rc("g-conc2", 120, 40, 120, 150, 'rx="6"') + rc("", 130, 50, 100, 120, 'rx="3" fill="#1d2433"');
    s += `<text x="180" y="66" text-anchor="middle" font-size="9" font-weight="800" fill="#cde4ff">분전반</text>`;
    s += `<rect data-r="handle" x="172" y="84" width="16" height="42" rx="3" fill="#e5484d"/><text data-r="onoff" x="180" y="150" text-anchor="middle" font-size="10" font-weight="900" fill="#ffd84a">ON</text></g>`;
    s += `<g data-r="lockicon" opacity="0"><rect x="190" y="104" width="22" height="18" rx="3" fill="#ffd21f"/><path d="M195 104 v-6 a6 6 0 0 1 12 0 v6" stroke="#ffd21f" stroke-width="3" fill="none"/><rect x="194" y="126" width="16" height="10" fill="#fff" stroke="#e5484d"/></g>`;
    s += rc("g-steel", 280, 150, 60, 50, 'rx="6"') + `<text x="310" y="180" text-anchor="middle" font-size="9" font-weight="800" fill="#fff">전동기</text>`;
    s += wkr("w2", 70, 200, 70, {vest: "#3b82f6", hat: "#fff"});
    s += wkr("w1", 262, 200, 70);
    return s;
  },
  fields(v) {
    return [{id: "seq", t: "seq", label: "정전 전로 작업 순서를 맞게 이어 보세요", items: LOTO, hints: ["근거: 제319조 제2항 (전로 차단 절차) — 1호부터 6호까지 순서대로", "첫 번째는 '도면 확인', 마지막은 '단락 접지'예요", "잠금장치·꼬리표는 차단 직후(3번째), 그 다음 방전 → 검전기"]}];
  },
  eval(v) {
    const seq = v.seq || [], c = [], pos = id => seq.indexOf(id);
    let main = null;
    seq.forEach((id, i) => { const it = LOTO.find(x => x.id === id); c.push(ck(null, `${i + 1}번째: ${it.t}`, LOTO[i].id === id, {noSrs: true, dtxt: "✘ 이 자리가 아니에요", val: "", need: LOTO[i].t})); });
    const ok = seq.every((id, i) => LOTO[i].id === id);
    if (!ok) {
      if (!(pos("s3") < pos("s4") && pos("s3") < pos("s5") && pos("s3") < pos("s6"))) main = "a_loto_restart";
      else if (!(pos("s4") < pos("s5"))) main = "a_loto_residual";
      else main = "a_loto_unknown";
    }
    c.push(ck("t_lock", "작업 순서", ok, {noSrs: true, acc: main, dtxt: "✘ 순서가 달라요", val: ok ? "맞아요" : "달라요", need: "도면확인→차단·개방→잠금·꼬리표→방전→검전→접지"}));
    c.main = main;
    return c;
  },
  async play(svg, v, res) {
    const w = R(svg, "w1"), w2 = R(svg, "w2"), seq = v.seq || [];
    say("정전 작업을 시작합니다. 선택한 순서대로 진행해요…");
    for (let i = 0; i < seq.length; i++) {
      const it = LOTO.find(x => x.id === seq[i]); say(`${i + 1}. ${it.t}`);
      if (it.id === "s2") { R(svg, "handle").setAttribute("y", "112"); R(svg, "onoff").textContent = "OFF"; }
      if (it.id === "s3") R(svg, "lockicon").setAttribute("opacity", "1");
      pop(svg, 180, 30, `${i + 1}`, "#2b6cb0"); await wait(700);
    }
    await walk(w, 262, 250, 200, 400);
    const m = res.main || res[res.length - 1].acc;
    if (!allOk(res)) {
      if (m === "a_loto_restart") {
        say("작업 중, 지나가던 동료가 꺼진 줄 알고 스위치를 올립니다!");
        await walk(w2, 70, 150, 200, 900);
        R(svg, "handle").setAttribute("y", "84"); R(svg, "onoff").textContent = "ON"; sfx.bad();
        await zap(svg, 240, 120, 284, 170, 800);
        hurt(w); shake(); sfx.thud(); await tw(500, t => setT(w, 250, 200, 80 * t));
        say("💥 잠금장치·꼬리표가 없어 재통전되어 감전됐습니다.");
      } else if (m === "a_loto_residual") {
        say("전원은 껐지만 기기에 전기가 남아 있었어요…");
        await zap(svg, 290, 150, 258, 150, 800);
        hurt(w); shake(); sfx.thud(); await tw(500, t => setT(w, 250, 200, 80 * t));
        say("💥 방전·검전 확인 전에 만져 잔류전하에 감전됐습니다.");
      } else {
        say("도면에 없던 다른 전원이 이 기기에 들어와 있었어요…");
        await zap(svg, 340, 140, 288, 150, 800);
        hurt(w); shake(); sfx.thud(); await tw(500, t => setT(w, 250, 200, 80 * t));
        say("💥 공급 전원을 모두 확인하는 절차가 흐트러져 감전됐습니다.");
      }
    } else {
      say("동료가 스위치 앞에 오지만 잠금장치가 있어 올릴 수 없어요.");
      await walk(w2, 70, 120, 200, 700); await wait(300);
      sfx.ok(); pop(svg, 180, 24, "✔ 안전!", "#12a37f");
      say("🟢 절차를 순서대로 지켜 안전하게 작업을 마쳤습니다.");
    }
  },
};

/* ---------- 의뢰 8: 충전전로 접근 한계거리 (제321조) ---------- */
const M8 = {
  K: 0.9, wy: 66, gy: 226,
  px: [66, 180, 294],
  draw(v) {
    const GY = this.gy, WY = this.wy, K = this.K, ids = ["d1", "d2", "d3"], volts = ["380V", "6.6kV", "22.9kV"];
    let s = rc("g-sky", 0, 0, 360, 250) + rc("g-grnd", 0, GY, 360, 24);
    this.px.forEach((x, i) => {
      s += rc("g-conc2", x - 3, WY, 6, GY - WY) + rc("g-steel", x - 40, WY - 4, 80, 4, 'rx="2"');
      s += `<line x1="${x - 52}" y1="${WY - 6}" x2="${x + 52}" y2="${WY - 6}" stroke="#e5484d" stroke-width="2.6"/>`;
      s += `<text x="${x}" y="${WY - 16}" text-anchor="middle" class="g-tag">${volts[i]}</text>`;
      const d = v[ids[i]];
      if (Number.isFinite(d)) { const y = WY - 6 + d * K; s += `<line x1="${x - 36}" y1="${y}" x2="${x + 36}" y2="${y}" stroke="var(--ink)" stroke-dasharray="4 3" stroke-width="1.2"/><text x="${x}" y="${y + 11}" text-anchor="middle" class="g-tag">${fmt(d)}cm</text>`; }
    });
    s += wkr("w1", 36, GY, 44);
    return s;
  },
  eval(v) {
    const law = [30, 60, 90], ids = ["d1", "d2", "d3"], fs = ["ap_03", "ap_2", "ap_15"], accs = ["a_arc_lv", "a_arc_hv", "a_arc_xhv"], lab = ["380V 저압선", "6.6kV 고압선", "22.9kV 특고압선"];
    return ids.map((id, i) => { const ok = v[id] >= law[i]; return ck(fs[i], lab[i] + " 접근 한계거리", ok, {dir: ok ? null : "up", val: fmt(v[id]) + "cm", need: law[i] + "cm", acc: accs[i]}); });
  },
  async play(svg, v, res) {
    const w = R(svg, "w1"), K = this.K, WY = this.wy, GY = this.gy, ids = ["d1", "d2", "d3"], law = [30, 60, 90];
    let hit = false;
    say("고소작업대를 타고 전선 바로 옆에서 작업합니다. 정한 한계선까지만 접근해요.");
    for (let i = 0; i < 3 && !hit; i++) {
      const x = this.px[i] + 22, lim = v[ids[i]];
      const yHand = WY - 6 + lim * K, yFeet = yHand + 44;
      await walk(w, i ? this.px[i - 1] + 22 : 36, x, GY, 700);
      say(["380V 저압선", "6.6kV 고압선", "22.9kV 특고압선"][i] + " 작업 중…");
      const lift = ownEl(svg, `<rect x="-14" y="0" width="28" height="4" class="g-steel"/><line x1="0" y1="4" x2="0" y2="${GY}" stroke="var(--gm-steel)" stroke-width="3"/>`, "lift" + i);
      svg.appendChild(w);
      await tw(900, t => { const y = L(GY, yFeet, t); mv(lift, x, y + 4, 0); lift.firstChild.setAttribute("transform", ""); lift.lastChild.setAttribute("y2", GY - y); setT(w, x, y, 0); });
      if (lim < law[i]) {
        hit = true; sfx.bad();
        await zap(svg, this.px[i], WY - 6, x, yHand, 800);
        hurt(w); shake(); sfx.thud();
        await tw(600, t => setT(w, x, yFeet + (GY - yFeet) * t * t, 40 * t));
        pop(svg, x, yFeet - 60, "방전!");
        say("💥 한계거리가 기준(" + law[i] + "cm)보다 가까워 전류가 사람 쪽으로 튀었습니다.");
      } else {
        await wait(500);
        await tw(600, t => { const y = L(yFeet, GY, t); mv(lift, x, y + 4, 0); lift.lastChild.setAttribute("y2", GY - y); setT(w, x, y, 0); });
        lift.remove();
      }
    }
    if (!hit) { if (!allOk(res)) generic(svg, res); else { sfx.ok(); pop(svg, 180, 40, "✔ 안전!", "#12a37f"); say("🟢 세 전압 모두 접근 한계거리를 지켜 안전하게 작업했습니다."); } }
  },
};

/* ---------- 의뢰 9: 적정공기 측정 (제618조) ---------- */
const GAS = [
  {id: "o2lo", n: "산소 하한", fact: "o2_lo", law: 18, u: "%", read: "17.9%", acc: "a_gas_o2", lamp: 0},
  {id: "o2hi", n: "산소 상한", fact: "o2_hi", law: 23.5, u: "%", read: "", acc: null, lamp: 0},
  {id: "co2", n: "이산화탄소", fact: "co2_hi", law: 1.5, u: "%", read: "1.6%", acc: "a_gas_co2", lamp: 1},
  {id: "co", n: "일산화탄소", fact: "co_hi", law: 30, u: "ppm", read: "31ppm", acc: "a_gas_co", lamp: 2},
  {id: "h2s", n: "황화수소", fact: "h2s_hi", law: 10, u: "ppm", read: "10ppm", acc: "a_gas_h2s", lamp: 3},
];
const M9 = {
  draw(v) {
    let s = rc("g-sky", 0, 0, 360, 250) + rc("g-grnd", 0, 62, 360, 188) + rc("g-void", 28, 62, 92, 170) + rc("g-conc2", 20, 56, 108, 8, 'rx="2"');
    s += `<text x="74" y="246" text-anchor="middle" class="g-cap">맨홀 (깊이 약 3m)</text>`;
    s += `<g data-r="meter">` + rc("g-conc2", 150, 70, 196, 170, 'rx="10"') + rc("", 158, 78, 180, 154, 'rx="6" fill="#1d2433"');
    s += `<text x="248" y="94" text-anchor="middle" font-size="9" font-weight="800" fill="#cde4ff">가스 측정기 경보 설정</text>`;
    const rows = [["산소", v.o2lo, v.o2hi, "%", "17.9%"], ["CO₂", v.co2, null, "%", "1.6%"], ["CO", v.co, null, "ppm", "31ppm"], ["H₂S", v.h2s, null, "ppm", "10ppm"]];
    rows.forEach((r, i) => {
      const y = 114 + i * 28, set = r[2] != null ? `${Number.isFinite(r[1]) ? fmt(r[1]) : "?"}~${Number.isFinite(r[2]) ? fmt(r[2]) : "?"}` : (Number.isFinite(r[1]) ? "< " + fmt(r[1]) : "?");
      s += `<text x="168" y="${y}" font-size="9.5" font-weight="800" fill="#fff">${r[0]}</text><text x="214" y="${y}" font-size="9" fill="#9fc2ff">기준 ${set}${r[3]}</text>`;
      s += `<text data-r="rd${i}" x="296" y="${y}" font-size="10" font-weight="900" fill="#ffd84a" opacity="0">${r[4]}</text><circle data-r="lp${i}" cx="326" cy="${y - 4}" r="6.5" fill="#444"/>`;
    });
    s += `</g>`;
    s += wkr("w1", 150, 62, 56);
    s += `<g data-r="probe"><line x1="100" y1="58" x2="100" y2="80" stroke="#222" stroke-width="2"/><rect x="94" y="80" width="12" height="16" rx="2" fill="#3b82f6"/></g>`;
    return s;
  },
  eval(v) {
    return GAS.map(g => {
      const x = v[g.id], ok = x === g.law, lax = x > g.law || (g.id === "o2lo" && x < g.law);
      return ck(g.fact, g.n + " 기준", ok, {dir: ok ? null : x > g.law ? "down" : "up", val: fmt(x) + g.u, need: fmt(g.law) + g.u + (g.id === "o2lo" ? " 이상" : g.id === "o2hi" ? " 미만" : " 미만"), acc: !ok && lax ? g.acc : null, dtxt: "✘ 기준값과 달라요 (정확히!)"});
    });
  },
  fields() {
    return [
      {id: "o2lo", t: "num", label: "산소농도 하한 (적정공기)", unit: "%", ph: "몇 % 이상?", fact: "o2_lo"},
      {id: "o2hi", t: "num", label: "산소농도 상한 (적정공기)", unit: "%", ph: "몇 % 미만?", fact: "o2_hi"},
      {id: "co2", t: "num", label: "이산화탄소 (적정공기)", unit: "%", ph: "몇 % 미만?", fact: "co2_hi"},
      {id: "co", t: "num", label: "일산화탄소 (적정공기)", unit: "ppm", ph: "몇 ppm 미만?", fact: "co_hi"},
      {id: "h2s", t: "num", label: "황화수소 (적정공기)", unit: "ppm", ph: "몇 ppm 미만?", fact: "h2s_hi"},
    ];
  },
  async play(svg, v, res) {
    const w = R(svg, "w1"), probe = R(svg, "probe");
    say("맨홀에 들어가기 전, 측정기를 밧줄에 매달아 내려 공기를 측정합니다…");
    await tw(900, t => mv(probe, 0, 60 * t, 0));
    say("측정값이 올라옵니다. 설정한 기준으로 경보가 울리는지 봐요.");
    const lamps = [0, 1, 2, 3].map(i => R(svg, "lp" + i));
    const sil = [failAcc(res, "a_gas_o2"), failAcc(res, "a_gas_co2"), failAcc(res, "a_gas_co"), failAcc(res, "a_gas_h2s")];
    for (let i = 0; i < 4; i++) { R(svg, "rd" + i).setAttribute("opacity", "1"); lamps[i].setAttribute("fill", sil[i] ? "#3aa56d" : "#e5484d"); await wait(450); }
    const bad = sil.findIndex(x => x);
    if (bad >= 0) {
      say("어떤 가스는 경보가 안 울려요. 작업자는 '이상 없음'으로 알고 맨홀로 내려갑니다…");
      await walk(w, 150, 100, 62, 600); svg.appendChild(w);
      await tw(1100, t => setT(w, 74, 62 + 100 * t, 0, 1 - t * .06), ease.io);
      hurt(w); sfx.bad(); shake(); await tw(500, t => setT(w, 74, 162, 80 * t));
      const acc = [GAS[0].acc, GAS[2].acc, GAS[3].acc, GAS[4].acc][bad];
      pop(svg, 74, 140, "...");
      say("💥 " + ACC[acc].n + ": 기준을 느슨하게 알고 있으면 경보 없이 위험 공기를 마십니다.");
    } else if (!allOk(res)) generic(svg, res, 250, 60);
    else {
      sfx.ok(); pop(svg, 248, 62, "경보! 환기 후 재측정", "#e5484d");
      await wait(600); sfx.ok(); pop(svg, 74, 56, "✔ 안전 확인", "#12a37f");
      say("🟢 위험 공기를 정확히 걸러 내고, 환기한 뒤에 들어가기로 합니다.");
    }
  },
};

/* ---------- 의뢰 10: 밀폐공간 작업 준비 (제619~625조) ---------- */
const CONF_OPTS = [
  {id: "vent", ic: "🌀", t: "송풍기로 환기 (작업 전·중)", ok: true, acc: "a_gas_o2", art: "제620조"},
  {id: "meter", ic: "📟", t: "산소·유해가스 농도 측정기", ok: true, acc: "a_conf_nometer", art: "제619조"},
  {id: "scba", ic: "😷", t: "공기호흡기·송기마스크", ok: true, acc: "a_conf_rescue", art: "제625조"},
  {id: "belt", ic: "🪢", t: "안전대·구명밧줄", ok: true, acc: "a_conf_rescue", art: "제624조"},
  {id: "watch", ic: "🧑‍🔧", t: "외부 감시인 + 연락 설비", ok: true, acc: "a_conf_nowatch", art: "제623조"},
  {id: "ladder", ic: "🪜", t: "사다리·섬유로프 등 구출 기구", ok: true, acc: "a_conf_rescue", art: "제625조"},
  {id: "sign", ic: "🚫", t: "출입금지 표지", ok: true, acc: "a_conf_nowatch", art: "제622조"},
  {id: "o2tank", ic: "🧪", t: "순수 산소로 환기", ok: false, acc: "a_conf_fire", art: "제620조"},
  {id: "dust", ic: "😶", t: "방진마스크 하나만 착용", ok: false, acc: "a_conf_mask", art: "제620조"},
  {id: "solo", ic: "🙋", t: "혼자 빨리 들어갔다 나오기", ok: false, acc: "a_conf_nowatch", art: "제623조"},
  {id: "lighter", ic: "🔥", t: "라이터 불로 가스 확인", ok: false, acc: "a_conf_fire", art: "제620조"},
];
function manholeScene(extra) {
  let s = rc("g-sky", 0, 0, 360, 250) + rc("g-grnd", 0, 70, 360, 180) + rc("g-void", 110, 70, 140, 170) + rc("g-conc2", 100, 64, 160, 8, 'rx="2"');
  s += `<text x="180" y="236" text-anchor="middle" class="g-cap">맨홀 (깊이 약 3m)</text>`;
  return s + (extra || "");
}
const M10 = {
  fields() { return [{id: "sel", t: "multi", label: "밀폐공간(맨홀)에 들어가기 전, 꼭 갖출 것을 모두 고르세요", opts: CONF_OPTS, need: 7, hints: ["근거: 제619조~제625조 (밀폐공간 작업)", "필요한 건 모두 7가지예요. 틀린 보기도 섞여 있어요", "환기 · 측정 · 호흡보호 · 안전대 · 감시인 · 구출기구 · 출입금지 표지"]}]; },
  draw(v) {
    let s = manholeScene();
    const sel = v.sel || [];
    sel.forEach((id, i) => { const o = CONF_OPTS.find(x => x.id === id); s += `<text x="${16 + (i % 6) * 54}" y="${26 + Math.floor(i / 6) * 24}" font-size="20">${o.ic}</text>`; });
    s += wkr("w1", 70, 70, 60);
    return s;
  },
  eval(v) {
    const sel = v.sel || [], c = [];
    CONF_OPTS.filter(o => o.ok).forEach(o => { const has = sel.includes(o.id); c.push(ck(null, o.t, has, {noSrs: true, dtxt: "✘ 빠졌어요", val: has ? "준비함" : "빠짐", need: "필요 (" + o.art + ")", acc: has ? null : o.acc})); });
    CONF_OPTS.filter(o => !o.ok).forEach(o => { if (sel.includes(o.id)) c.push(ck(null, o.t, false, {noSrs: true, dtxt: "✘ 위험한 선택이에요", val: "선택함", need: "하면 안 돼요 (" + o.art + ")", acc: o.acc})); });
    return c;
  },
  async play(svg, v, res) {
    const w = R(svg, "w1"), sel = v.sel || [];
    say("준비물을 확인하고 맨홀에 들어갑니다…");
    await wait(700);
    await walk(w, 70, 180, 70, 900);
    const pri = ["a_conf_fire", "a_conf_mask", "a_gas_o2", "a_conf_nometer", "a_conf_nowatch", "a_conf_rescue"], hit = pri.find(a => failAcc(res, a));
    svg.appendChild(w);
    if (hit) {
      await tw(1100, t => setT(w, 180, 70 + 100 * t, 0));
      hurt(w); sfx.bad(); shake(); await tw(450, t => setT(w, 180, 170, 80 * t));
      pop(svg, 180, 130, "…");
      const m = {a_conf_fire: "라이터 불·순수 산소는 폭발·화재 위험이 커요", a_conf_mask: "방진마스크는 산소결핍을 막지 못해요", a_gas_o2: "환기를 안 해 산소가 부족했어요", a_conf_nometer: "농도를 측정하지 않고 들어갔어요", a_conf_nowatch: "감시인·표지가 없어 아무도 못 봤어요", a_conf_rescue: "구출·호흡 장비가 없어 위급할 때 대응이 불가능해요"}[hit];
      say("💥 " + ACC[hit].n + " — " + m + ".");
    } else {
      await tw(900, t => setT(w, 180, 70 + 90 * t, 0)); await wait(500); await tw(900, t => setT(w, 180, 160 - 90 * t, 0));
      sfx.ok(); pop(svg, 180, 54, "✔ 안전!", "#12a37f");
      say("🟢 환기·측정·호흡보호·감시·구출 준비까지 갖춰 안전하게 작업을 마쳤습니다.");
    }
  },
};

/* ---------- 의뢰 11: 쓰러진 작업자 구조 (제623·625조) ---------- */
const M11 = {
  fields() { return [{id: "txt", t: "kw", label: "맨홀 안 동료가 쓰러졌습니다. 감시인인 당신이 해야 할 일 두 가지를 쓰세요", slots: 2, ph: "예) …에 신고하고, …를 쓰고 구조한다", hints: ["근거: 제623조 제2항, 제625조", "하나는 '어디에 알린다', 다른 하나는 '구조자의 호흡 보호'", "119(소방)에 신고 + 공기호흡기·송기마스크 착용 (맨몸 진입 금지)"]}]; },
  draw(v) {
    let s = manholeScene();
    s += `<g data-r="victim">${wkr("w2", 180, 224, 56, {vest: "#3b82f6", hat: "#fff"})}</g>`;
    s += wkr("w1", 70, 70, 60, {vest: "#12a37f"});
    s += `<text x="16" y="24" class="g-tag">🆘 맨홀 안 작업자가 쓰러져 있어요</text>`;
    return s;
  },
  eval(v) {
    const t = v.txt || "", a = hasKw(t, ["119", "소방", "신고", "구조요청", "응급"]), b = hasKw(t, ["공기호흡기", "송기마스크", "호흡기", "호흡보호", "호흡"]);
    return [
      ck("t_119", "소방관서 신고", a, {dir: a ? null : "x", dtxt: "✘ 빠졌어요", val: a ? "신고 ✔" : "빠짐", need: "지체 없이 소방관서(119)에 신고", acc: "a_conf_nocall"}),
      ck("t_scba", "구조자의 호흡 보호", b, {dir: b ? null : "x", dtxt: "✘ 빠졌어요", val: b ? "호흡보호구 ✔" : "빠짐", need: "공기호흡기·송기마스크 착용 후 구조 (맨몸 진입 금지)", acc: "a_conf_rescue"}),
    ];
  },
  async play(svg, v, res) {
    const w = R(svg, "w1"), vic = R(svg, "w2");
    hurt(vic);
    say("감시인은 무엇부터 할까요…");
    await wait(600);
    if (failAcc(res, "a_conf_rescue")) {
      say("마음이 급해 장비 없이 그대로 뛰어듭니다!");
      await walk(w, 70, 180, 70, 700); svg.appendChild(w);
      await tw(900, t => setT(w, 180, 70 + 100 * t, 0), ease.in);
      hurt(w); sfx.bad(); shake(); await tw(400, t => setT(w, 150, 170, 80 * t));
      say("💥 2차 재해! 구조자도 같은 공기에 쓰러졌습니다.");
    } else if (failAcc(res, "a_conf_nocall")) {
      say("호흡 장비를 갖춰 구조하지만 신고를 하지 않았어요…");
      await wait(900); pop(svg, 100, 44, "⏳ 지체…", "#e5484d");
      await wait(700); sfx.bad();
      say("💥 구조대 도착이 늦어져 응급처치가 지연됐습니다. 이상이 있으면 지체 없이 신고!");
    } else if (!allOk(res)) generic(svg, res);
    else {
      pop(svg, 100, 44, "📞 119!", "#2b6cb0"); sfx.ok(); await wait(800);
      say("공기호흡기를 쓰고 줄을 묶어 내려갑니다…");
      await walk(w, 70, 180, 70, 700); svg.appendChild(w);
      await tw(800, t => setT(w, 180, 70 + 90 * t, 0));
      await tw(1000, t => { setT(w, 180 - 20 * t, 160 - 90 * t, 0); setT(vic, 180 + 10 * t - 8, 224 - 150 * t, 80 * (1 - t)); });
      sfx.star(); pop(svg, 160, 54, "✔ 구조 성공!", "#12a37f");
      say("🟢 신고와 호흡보호가 모두 이뤄져 2차 재해 없이 구조했습니다.");
    }
  },
};

/* ---------- 의뢰 12: 굴착면 기울기 (제339조, 별표 11) ---------- */
const SOILS = [
  {id: "sand", n: "모래", fact: "sl_sand", law: 1.8, acc: "a_exc_sand", col: "#e6c66e"},
  {id: "soft", n: "연암·풍화암", fact: "sl_soft", law: 1.0, acc: "a_exc_rock", col: "#a9a08f"},
  {id: "hard", n: "경암", fact: "sl_hard", law: 0.5, acc: "a_exc_hard", col: "#6a6f78"},
  {id: "soil", n: "그 밖의 흙", fact: "sl_soil", law: 1.2, acc: "a_exc_soil", col: "#9a6b43"},
];
const M12 = {
  H: 52, x0: [8, 98, 188, 278], top: 100,
  draw(v) {
    const H = this.H, T = this.top;
    let s = rc("g-sky", 0, 0, 360, 250) + rc("g-grnd", 0, T, 360, 150);
    SOILS.forEach((so, i) => {
      const x0 = this.x0[i], r = Number.isFinite(v[so.id]) ? Math.max(0, Math.min(v[so.id], 2.4)) : 0.6, run = r * H;
      s += `<g data-r="p${i}"><polygon points="${x0},${T} ${x0 + 80},${T} ${x0 + 80},${T + H} ${x0 + 14 + run},${T + H} ${x0 + 14},${T}" fill="${so.col}" opacity="0"/>`;
      s += `<polygon points="${x0 + 12 + run},${T + H} ${x0 + 80},${T + H} ${x0 + 80},${T + H + 40} ${x0},${T + H + 40} ${x0},${T}" fill="none"/></g>`;
      // 굴착면 (트렌치 단면): 땅속 그림 + 비어 있는 구멍
      s += `<polygon points="${x0},${T} ${x0 + 80},${T} ${x0 + 80},${T + H + 14} ${x0},${T + H + 14}" fill="${so.col}"/>`;
      s += `<polygon data-r="hole${i}" points="${x0 + 80},${T} ${x0 + 80 - 4 - run * 0},${T} ${x0 + 14},${T} ${x0 + 14 + run},${T + H} ${x0 + 80},${T + H}" fill="var(--gm-void)" opacity="0"/>`;
      s += `<polygon points="${x0 + 14},${T} ${x0 + 14 + run},${T + H} ${x0 + 80},${T + H} ${x0 + 80},${T}" fill="var(--gm-void)"/>`;
      s += `<line x1="${x0 + 14}" y1="${T}" x2="${x0 + 14 + run}" y2="${T + H}" stroke="#000" stroke-opacity=".35" stroke-width="1.5"/>`;
      s += `<text x="${x0 + 40}" y="${T + H + 30}" text-anchor="middle" class="g-tag">${so.n}</text>`;
      s += `<text x="${x0 + 40}" y="${T + H + 43}" text-anchor="middle" class="g-tag">${Number.isFinite(v[so.id]) ? "1 : " + fmt(v[so.id]) : "1 : ?"}</text>`;
      s += wkr("w" + i, x0 + 62, T + H, 30);
    });
    s += `<text x="12" y="22" class="g-tag">높이 1에 대한 수평거리 (기울기 = 높이 : 수평거리)</text>`;
    return s;
  },
  fields() { return SOILS.map(so => ({id: so.id, t: "num", label: so.n + " — 굴착면 기울기 (높이 1 : 수평거리 ?)", unit: "", ph: "1 : 몇?", fact: so.fact, dec: true})); },
  eval(v) { return SOILS.map(so => { const ok = v[so.id] >= so.law; return ck(so.fact, so.n + " 굴착면 기울기", ok, {dir: ok ? null : "up", val: "1 : " + fmt(v[so.id]), need: "1 : " + fmt(so.law) + " 이상 (더 완만)", acc: so.acc}); }); },
  async play(svg, v, res) {
    const H = this.H, T = this.top;
    say("네 종류의 지반을 굴착하고 근로자가 바닥에서 작업합니다…");
    await wait(900);
    let any = false;
    for (let i = 0; i < 4; i++) {
      const so = SOILS[i], w = R(svg, "w" + i), x0 = this.x0[i];
      if (v[so.id] < so.law) {
        any = true; sfx.bad(); say(so.n + " 굴착면이 너무 가파라요… 흙이 무너집니다!");
        const r = Math.max(0, v[so.id]) * H;
        const slide = ownEl(svg, `<polygon points="${x0 + 14},${T} ${x0 + 14 + (so.law * H)},${T + H} ${x0 + 14 + r},${T + H}" fill="${so.col}"/>`, "slide" + i);
        await tw(900, t => { mv(slide, 0, 0, 0); slide.firstChild.setAttribute("points", `${x0 + 14},${T} ${L(x0 + 14 + r, x0 + 70, t)},${T + H} ${x0 + 14 + (so.law * H) * (1 - t) + 0},${T + H}`); });
        hurt(w); shake(); sfx.thud(); await tw(300, t => setT(w, x0 + 62, T + H, 85 * t));
        pop(svg, x0 + 40, T - 8, "와르르!");
      } else { await wait(300); pop(svg, x0 + 40, T - 8, "✔", "#12a37f"); }
    }
    await wait(300);
    if (!any) { if (!allOk(res)) generic(svg, res); else { sfx.ok(); say("🟢 지반마다 알맞은 기울기로 파서 굴착면이 안전합니다."); } }
    else say("💥 굴착면 기울기를 기준보다 가파르게 하면 무너집니다. 모래 1:1.8 · 연암/풍화암 1:1.0 · 경암 1:0.5 · 그 밖의 흙 1:1.2");
  },
};

/* ---------- 의뢰 13: 굴착 현장 안전조치 (제339~347조) ---------- */
const EXC_OPTS = [
  {id: "shore", ic: "🪵", t: "흙막이 지보공 설치 (조립도 작성)", ok: true, acc: "a_exc_cave", art: "제340조·제346조"},
  {id: "net", ic: "🕸️", t: "방호망 설치·근로자 출입금지 구역", ok: true, acc: "a_exc_cave", art: "제340조"},
  {id: "drain", ic: "☔", t: "측구 설치·경사면 비닐 덮기 (빗물 침투 방지)", ok: true, acc: "a_exc_rain", art: "제339조"},
  {id: "guide", ic: "🚦", t: "굴착기계 유도자 배치", ok: true, acc: "a_exc_machine", art: "제344조"},
  {id: "utility", ic: "🔌", t: "노출된 매설물 방호·이설 (관리감독자 지휘)", ok: true, acc: "a_exc_pipe", art: "제341조"},
  {id: "inspect", ic: "🔍", t: "흙막이 지보공 정기 점검·계측", ok: true, acc: "a_exc_cave", art: "제347조"},
  {id: "pile", ic: "⛰️", t: "굴착 가장자리에 흙을 쌓아 두기", ok: false, acc: "a_exc_cave", art: "제340조"},
  {id: "rain", ic: "🌧️", t: "비 온 뒤 그대로 작업 계속", ok: false, acc: "a_exc_rain", art: "제339조"},
  {id: "dig", ic: "⛏️", t: "지하 가스관이 걸려도 계속 굴착", ok: false, acc: "a_exc_pipe", art: "제342조"},
];
const M13 = {
  fields() { return [{id: "sel", t: "multi", label: "깊게 파는 굴착 현장입니다. 필요한 안전조치를 모두 고르세요", opts: EXC_OPTS, need: 6, hints: ["근거: 제339조~제347조 (굴착 작업)", "필요한 건 6가지, 틀린 보기 3가지가 섞여 있어요", "흙막이 · 방호망/출입금지 · 빗물 · 유도자 · 매설물 · 정기점검"]}]; },
  draw(v) {
    const sel = v.sel || [], has = id => sel.includes(id);
    let s = rc("g-sky", 0, 0, 360, 250) + rc("g-grnd", 0, 92, 360, 158) + rc("g-void", 120, 92, 120, 120);
    s += rc("", 120, 212, 120, 8, 'fill="var(--gm-conc2)"');
    if (has("shore")) s += rc("", 114, 92, 8, 128, 'fill="#c8975a"') + rc("", 238, 92, 8, 128, 'fill="#c8975a"') + rc("", 120, 130, 120, 5, 'fill="#c8975a"');
    if (has("net")) s += rc("", 100, 70, 4, 22, 'fill="var(--gm-rail)"') + rc("", 256, 70, 4, 22, 'fill="var(--gm-rail)"') + `<path d="M100 74 L260 74 M100 84 L260 84" stroke="var(--gm-rail)" stroke-width="2.5"/>`;
    if (has("drain")) s += `<path d="M20 100 L60 100 L100 92" stroke="#2b6cb0" stroke-width="5" fill="none"/><rect x="264" y="88" width="50" height="5" fill="#2b6cb0" opacity=".6"/>`;
    if (has("pile")) s += `<polygon points="248,92 276,66 304,92" fill="#9a6b43"/>`;
    if (has("rain")) s += `<text x="270" y="30" font-size="26">🌧️</text>`;
    if (has("dig")) s += `<text x="136" y="82" font-size="18">⛏️</text>`;
    s += `<circle cx="120" cy="170" r="9" fill="#f5b50a" stroke="#c98d00" stroke-width="2"/><text x="136" y="186" class="g-cap">가스관</text>`;
    if (has("utility")) s += `<circle cx="120" cy="170" r="14" fill="none" stroke="#12a37f" stroke-width="3" stroke-dasharray="4 3"/>`;
    s += `<g data-r="exc"><rect x="10" y="64" width="64" height="26" rx="4" fill="#f2a900"/><rect x="42" y="52" width="26" height="14" rx="3" fill="#f2a900"/><path d="M70 70 L96 60 L92 80" stroke="#c98d00" stroke-width="5" fill="none"/><rect x="6" y="88" width="72" height="8" rx="3" fill="#333"/></g>`;
    if (has("guide")) s += wkr("w3", 100, 92, 42, {vest: "#12a37f", hat: "#fff"});
    s += wkr("w2", 40, 92, 42, {vest: "#3b82f6", hat: "#fff"});
    s += wkr("w1", 180, 212, 52);
    sel.forEach((id, i) => { const o = EXC_OPTS.find(x => x.id === id); s += `<text x="${10 + i * 28}" y="238" font-size="15">${o.ic}</text>`; });
    return s;
  },
  eval(v) {
    const sel = v.sel || [], c = [];
    EXC_OPTS.filter(o => o.ok).forEach(o => { const has = sel.includes(o.id); c.push(ck(null, o.t, has, {noSrs: true, dtxt: "✘ 빠졌어요", val: has ? "함" : "빠짐", need: "필요 (" + o.art + ")", acc: has ? null : o.acc})); });
    EXC_OPTS.filter(o => !o.ok).forEach(o => { if (sel.includes(o.id)) c.push(ck(null, o.t, false, {noSrs: true, dtxt: "✘ 위험한 선택이에요", val: "선택함", need: "하면 안 돼요 (" + o.art + ")", acc: o.acc})); });
    return c;
  },
  async play(svg, v, res) {
    const w = R(svg, "w1"), exc = R(svg, "exc"), w2 = R(svg, "w2");
    say("굴착이 진행되고 근로자가 바닥에서 배관 주변을 정리합니다…");
    await wait(900);
    if (failAcc(res, "a_exc_cave")) {
      say("흙벽이 하중을 못 버텨요… 토사가 쏟아집니다!");
      sfx.bad();
      const m = ownEl(svg, `<polygon points="120,92 150,92 120,150" fill="#9a6b43"/><polygon points="240,92 210,92 240,150" fill="#9a6b43"/>`, "cave");
      await tw(900, t => { m.innerHTML = `<polygon points="120,92 ${150 + 30 * t},${92 + 120 * t} 120,${150 + 62 * t}" fill="#9a6b43"/><polygon points="240,92 ${210 - 30 * t},${92 + 120 * t} 240,${150 + 62 * t}" fill="#9a6b43"/>`; });
      hurt(w); shake(); sfx.thud(); await tw(300, t => setT(w, 180, 212, 85 * t));
      pop(svg, 180, 140, "와르르!"); say("💥 흙막이 지보공·방호망·출입금지가 없어 토사가 무너졌습니다.");
    } else if (failAcc(res, "a_exc_pipe")) {
      say("굴착 중 노출된 가스관을 건드립니다!");
      sfx.bad(); await tw(700, t => {}); const g = ownEl(svg, `<circle cx="120" cy="170" r="10" fill="#cfe9a8" opacity=".6"/>`, "gas");
      await tw(900, t => { g.firstChild.setAttribute("r", 10 + 60 * t); g.firstChild.setAttribute("opacity", .6 * (1 - t * .4)); });
      hurt(w); shake(); sfx.thud(); pop(svg, 150, 130, "가스 누출!"); say("💥 매설물을 방호·이설하지 않고 굴착해 가스관이 파손됐습니다.");
    } else if (failAcc(res, "a_exc_machine")) {
      say("굴착기가 후진합니다. 유도해 주는 사람이 없어요…");
      await tw(1300, t => mv(exc, 80 * t, 0, 0), ease.io);
      hurt(w2); shake(); sfx.thud(); await tw(300, t => setT(w2, 40 + 60, 92, 85 * t));
      pop(svg, 110, 60, "쾅!"); say("💥 유도자 없이 후진한 굴착기에 근로자가 협착됐습니다.");
    } else if (failAcc(res, "a_exc_rain")) {
      say("큰 비가 내려 빗물이 사면으로 스며듭니다…");
      sfx.bad(); const slope = ownEl(svg, `<polygon points="240,92 262,92 240,150" fill="#9a6b43"/>`, "ls");
      await tw(1000, t => { slope.firstChild.setAttribute("points", `240,92 ${262 + 8 * t},${92 + 118 * t} 240,${150 + 62 * t}`); });
      hurt(w); shake(); sfx.thud(); pop(svg, 220, 130, "와르르!"); say("💥 빗물 침투를 막지 않아 굴착면이 무너졌습니다.");
    } else if (!allOk(res)) generic(svg, res);
    else { sfx.ok(); pop(svg, 180, 150, "✔ 안전!", "#12a37f"); say("🟢 흙막이·방호·배수·유도·매설물 방호·점검이 갖춰진 안전한 굴착 현장입니다."); }
  },
};

/* ---------- 의뢰 14: 용접 화재 예방 (제241조·제241조의2) ---------- */
const M14 = {
  S: 6.4,
  draw(v) {
    const GY = 200, r = Number.isFinite(v.r) ? Math.max(0, Math.min(v.r, 20)) : 0, S = this.S, cx = 120;
    let s = rc("g-in", 0, 0, 360, 240) + rc("g-conc", 0, GY, 360, 40);
    s += `<circle cx="${cx}" cy="${GY - 24}" r="${r * S}" fill="#2b6cb0" opacity=".12" stroke="#2b6cb0" stroke-dasharray="5 4" stroke-width="1.6"/>`;
    s += `<text x="${cx}" y="${GY - 24 - r * S - 4}" text-anchor="middle" class="g-tag">${Number.isFinite(v.r) ? "점검 반경 " + fmt(v.r) + "m" : "점검 반경 ?"}</text>`;
    s += `<g data-r="paper"><rect x="${cx + 8 * S}" y="${GY - 26}" width="26" height="26" fill="#c8975a"/><rect x="${cx + 8 * S + 3}" y="${GY - 34}" width="20" height="8" fill="#dcb98a"/><text x="${cx + 8 * S + 13}" y="${GY - 8}" text-anchor="middle" font-size="9" font-weight="800" fill="#5a3b12">종이</text></g>`;
    s += `<g><rect x="${cx + 15 * S}" y="${GY - 30}" width="16" height="30" rx="3" fill="#c0392b"/><text x="${cx + 15 * S + 8}" y="${GY - 12}" text-anchor="middle" font-size="7" font-weight="800" fill="#fff">인화</text></g>`;
    s += `<g data-r="torch"><rect x="${cx + 12}" y="${GY - 38}" width="20" height="5" rx="2" fill="#555"/></g>`;
    s += wkr("w1", cx, GY, 60);
    return s;
  },
  fields() {
    return [
      {id: "r", t: "num", label: "가연성물질이 있는지 확인할 작업반경", unit: "m", ph: "몇 m?", fact: "fire_r"},
      {id: "txt", t: "kw", label: "그리고 화재를 막기 위해 갖출 것 세 가지를 쓰세요", slots: 3, ph: "예) … 하고, … 비치하고, … 배치", hints: ["근거: 제241조 제2항, 제241조의2 제1항", "불티 막는 것 · 불을 끄는 것 · 지켜보는 사람", "방화포(비산방지덮개) · 소화기 · 화재감시자"]},
    ];
  },
  eval(v) {
    const t = v.txt || "", a = hasKw(t, ["방화포", "비산방지", "덮개", "불티", "차단막", "방호"]), b = hasKw(t, ["소화기", "소화"]), c = hasKw(t, ["화재감시자", "감시자", "감시인", "감시"]);
    const okr = v.r >= 11;
    return [
      ck("fire_r", "가연물 확인 반경", okr, {dir: okr ? null : "up", val: fmt(v.r) + "m", need: "11m (작업반경)", acc: "a_fire_spark"}),
      ck("t_blanket", "불티 비산 방지(방화포·덮개)", a, {dtxt: "✘ 빠졌어요", val: a ? "있음" : "빠짐", need: "용접방화포·비산방지덮개", acc: "a_fire_spark"}),
      ck("t_ext", "소화기구 비치", b, {dtxt: "✘ 빠졌어요", val: b ? "있음" : "빠짐", need: "소화기구 비치", acc: "a_fire_nofx"}),
      ck("t_watch", "화재감시자 배치", c, {dtxt: "✘ 빠졌어요", val: c ? "있음" : "빠짐", need: "화재감시자 지정·배치", acc: "a_fire_nowatch"}),
    ];
  },
  async play(svg, v, res) {
    const w = R(svg, "w1"), GY = 200, cx = 120;
    say("작업자가 철골을 용접합니다. 불티가 사방으로 튑니다…");
    for (let i = 0; i < 6; i++) { zap(svg, cx + 28, GY - 36, cx + 28 + 40 + i * 12, GY - 6 + (i % 3) * 4, 260); await wait(160); }
    if (failAcc(res, "a_fire_spark")) {
      say("점검 범위 밖 종이 상자까지 불티가 닿았어요…");
      const f = ownEl(svg, `<text x="${cx + 8 * this.S + 3}" y="${GY - 28}" font-size="30">🔥</text>`, "flame");
      await tw(900, t => { f.firstChild.setAttribute("font-size", 18 + 26 * t); f.firstChild.setAttribute("y", GY - 20 - 14 * t); });
      sfx.bad(); shake(); pop(svg, cx + 70, 80, "불이야!");
      say("💥 반경 11m 안 가연물을 확인·방호하지 않아 불티가 옮겨붙었습니다.");
    } else if (failAcc(res, "a_fire_nofx")) {
      say("작은 불씨가 번졌는데 소화기가 없어요…");
      const f = ownEl(svg, `<text x="${cx + 8 * this.S + 3}" y="${GY - 28}" font-size="22">🔥</text>`, "flame");
      await tw(1000, t => { f.firstChild.setAttribute("font-size", 20 + 24 * t); }); sfx.bad(); shake();
      say("💥 소화기가 없어 초기 진화에 실패했습니다.");
    } else if (failAcc(res, "a_fire_nowatch")) {
      say("용접을 마치고 모두 떠난 뒤, 숨은 불씨가 다시 살아납니다…");
      await walk(w, cx, cx - 60, GY, 500); await wait(600);
      const f = ownEl(svg, `<text x="${cx + 8 * this.S + 3}" y="${GY - 28}" font-size="16">🔥</text>`, "flame");
      await tw(1200, t => { f.firstChild.setAttribute("font-size", 14 + 30 * t); }); sfx.bad(); shake();
      say("💥 화재감시자가 없어 재발화를 아무도 보지 못했습니다.");
    } else if (!allOk(res)) generic(svg, res);
    else { await wait(500); sfx.ok(); pop(svg, cx, 60, "✔ 안전!", "#12a37f"); say("🟢 11m 이내 가연물을 점검·방호하고 소화기·화재감시자까지 갖췄습니다."); }
  },
};

/* ---------- 의뢰 15: 기계 정비 (제92조) ---------- */
const MACH = [
  {id: "k1", t: "기계 운전을 정지한다"},
  {id: "k2", t: "기동장치에 잠금장치를 하고 열쇠는 별도 관리한다"},
  {id: "k3", t: "'정비 중' 표지판을 건다"},
  {id: "k4", t: "내부에 압축된 기체·액체를 미리 방출한다"},
  {id: "k5", t: "정비·청소 작업을 한다"},
];
const M15 = {
  draw(v) {
    let s = rc("g-in", 0, 0, 360, 240) + rc("g-conc", 0, 200, 360, 40);
    s += `<g data-r="mach">` + rc("g-steel", 150, 100, 130, 100, 'rx="6"') + `<g data-r="gear"><circle cx="215" cy="150" r="30" fill="#c9ced6" stroke="#6b7684" stroke-width="3"/><path d="M215 120 v60 M185 150 h60 M194 129 l42 42 M236 129 l-42 42" stroke="#6b7684" stroke-width="4"/></g></g>`;
    s += rc("g-conc2", 40, 120, 40, 64, 'rx="4"') + `<circle data-r="sw" cx="60" cy="140" r="9" fill="#12a37f"/><text x="60" y="166" text-anchor="middle" font-size="8" font-weight="800" fill="#fff">기동</text>`;
    s += `<g data-r="lockg" opacity="0"><rect x="66" y="128" width="16" height="13" rx="2" fill="#ffd21f"/></g><g data-r="tagg" opacity="0"><rect x="32" y="104" width="46" height="14" rx="2" fill="#fff" stroke="#e5484d"/><text x="55" y="114" text-anchor="middle" font-size="7.5" font-weight="900" fill="#e5484d">정비 중</text></g>`;
    s += wkr("w2", 100, 200, 66, {vest: "#3b82f6", hat: "#fff"});
    s += wkr("w1", 140, 200, 70);
    return s;
  },
  fields() { return [{id: "seq", t: "seq", label: "컨베이어 기계를 정비·청소하기 전, 해야 할 순서를 맞게 이어 보세요", items: MACH, hints: ["근거: 제92조 (정비 등의 작업 시 운전정지)", "'정비 작업'은 맨 마지막이에요. 운전정지가 맨 처음", "정지 → 잠금(열쇠 별도 관리) → 표지판 → 압축된 것 방출 → 정비 (표지판과 방출은 순서를 바꿔도 돼요)"]}]; },
  eval(v) {
    const seq = v.seq || [], c = [], p = id => seq.indexOf(id);
    const ord = ["k1", "k2"].every((id, i) => seq[i] === id) && seq[4] === "k5" && ((seq[2] === "k3" && seq[3] === "k4") || (seq[2] === "k4" && seq[3] === "k3"));
    seq.forEach((id, i) => { const it = MACH.find(x => x.id === id); const okp = i < 2 ? id === MACH[i].id : i === 4 ? id === "k5" : (id === "k3" || id === "k4"); c.push(ck(null, `${i + 1}번째: ${it.t}`, okp, {noSrs: true, dtxt: "✘ 이 자리가 아니에요", val: "", need: ""})); });
    let main = null;
    if (!ord) { if (p("k5") < p("k2") || p("k5") < p("k3")) main = "a_mach_restart"; else if (p("k1") > p("k5")) main = "a_mach_nostop"; else if (p("k4") > p("k5")) main = "a_mach_pressure"; else main = "a_mach_restart"; if (p("k1") !== 0 && p("k1") > p("k2")) main = "a_mach_nostop"; }
    c.push(ck("t_mlock", "정비 전 순서", ord, {noSrs: true, acc: main, dtxt: "✘ 순서가 달라요", val: ord ? "맞아요" : "달라요", need: "정지 → 잠금 → 표지판/압력 방출 → 정비"}));
    c.main = main;
    return c;
  },
  async play(svg, v, res) {
    const w = R(svg, "w1"), w2 = R(svg, "w2"), gear = R(svg, "gear"), seq = v.seq || [];
    say("기계를 청소하러 갑니다. 선택한 순서대로 진행해요…");
    let spin = true, ang = 0; const spinner = (async () => { while (spin && alive) { ang += 14; gear.setAttribute("transform", `rotate(${ang} 215 150)`); await new Promise(r => frame(r)); if (skip) break; } })();
    for (let i = 0; i < seq.length; i++) {
      const it = MACH.find(x => x.id === seq[i]); say(`${i + 1}. ${it.t}`);
      if (it.id === "k1") { spin = false; R(svg, "sw").setAttribute("fill", "#e5484d"); }
      if (it.id === "k2") R(svg, "lockg").setAttribute("opacity", "1");
      if (it.id === "k3") R(svg, "tagg").setAttribute("opacity", "1");
      pop(svg, 120, 40, `${i + 1}`, "#2b6cb0"); await wait(700);
    }
    spin = false;
    const m = res.main || (res[res.length - 1] && res[res.length - 1].acc);
    if (!allOk(res)) {
      if (m === "a_mach_nostop") {
        say("기계가 돌아가는 채로 청소를 시작합니다!");
        spin = true; ang = 0; const sp2 = (async () => { while (alive && ang < 700 && !skip) { ang += 16; gear.setAttribute("transform", `rotate(${ang} 215 150)`); await new Promise(r => frame(r)); } })();
        await walk(w, 140, 150, 200, 500); await tw(600, t => setT(w, 150 + 20 * t, 200, 12 * t));
        hurt(w); shake(); sfx.thud(); pop(svg, 170, 110, "윽!"); await sp2;
        say("💥 운전을 정지하지 않고 정비해 장갑이 말려 들어갔습니다.");
      } else if (m === "a_mach_pressure") {
        say("정비 도중 내부에 남아 있던 압력이 터져 나옵니다!");
        await walk(w, 140, 160, 200, 500); sfx.bad();
        const puff = ownEl(svg, `<circle cx="190" cy="120" r="6" fill="#dfe6ee" opacity=".9"/>`, "puff");
        await tw(700, t => { puff.firstChild.setAttribute("r", 6 + 40 * t); puff.firstChild.setAttribute("opacity", .9 * (1 - t)); });
        hurt(w); shake(); sfx.thud(); say("💥 잔압을 미리 방출하지 않아 압축된 기체가 분출했습니다.");
      } else {
        say("정비 중 다른 사람이 기동 스위치를 누릅니다!");
        await walk(w, 140, 168, 200, 500); await walk(w2, 100, 70, 200, 500);
        R(svg, "sw").setAttribute("fill", "#12a37f"); sfx.bad();
        spin = true; ang = 0; const sp3 = (async () => { while (alive && ang < 700 && !skip) { ang += 18; gear.setAttribute("transform", `rotate(${ang} 215 150)`); await new Promise(r => frame(r)); } })();
        await tw(500, t => setT(w, 168 + 12 * t, 200, 14 * t));
        hurt(w); shake(); sfx.thud(); pop(svg, 190, 110, "끼임!"); await sp3;
        say("💥 잠금장치·표지판 없이 정비하다 재가동되어 끼였습니다.");
      }
    } else {
      await walk(w, 140, 168, 200, 500);
      say("동료가 스위치에 손을 대지만 잠금장치와 표지판이 막아 줍니다.");
      await walk(w2, 100, 76, 200, 500); await wait(500);
      sfx.ok(); pop(svg, 150, 56, "✔ 안전!", "#12a37f"); say("🟢 정지→잠금→표지판→압력 방출 후에 정비해 안전하게 마쳤습니다.");
    }
    await spinner;
  },
};

/* =============== 보건 편 장면 =============== */
const panelBox = (x, w, y0, h) => `<rect x="${x}" y="${y0}" width="${w}" height="${h}" rx="9" fill="var(--panel)" opacity=".92"/>`;
const eqCk = (f, label, x, law, u, accLax, o) => {
  const ok = x === law, lax = x > law;
  return ck(f, label, ok, Object.assign({dir: ok ? null : lax ? "down" : "up", val: fmt(x) + u, need: fmt(law) + u + " 이상", acc: !ok && lax ? accLax : null, dtxt: "✘ 기준값과 달라요 (정확히!)"}, o || {}));
};

/* ---------- 의뢰 16: 소음 (제512조) ---------- */
const NOISE = [
  {id: "n85", fact: "noise_85", law: 85, u: "dB", lab: "소음작업", db: 85, exp: "8시간", acc: "a_noise_85"},
  {id: "n95", fact: "noise_95", law: 4, u: "시간", lab: "95dB", db: 95, exp: "4시간", acc: "a_noise_95"},
  {id: "n100", fact: "noise_100", law: 2, u: "시간", lab: "100dB", db: 100, exp: "2시간", acc: "a_noise_100"},
  {id: "n110", fact: "noise_110", law: 30, u: "분", lab: "110dB", db: 110, exp: "30분", acc: "a_noise_110"},
  {id: "n115", fact: "noise_115", law: 15, u: "분", lab: "115dB", db: 115, exp: "15분", acc: "a_noise_115"},
];
const M16 = {
  w: 68, x0: [6, 76, 146, 216, 286],
  draw(v) {
    let s = rc("g-in", 0, 0, 360, 240);
    NOISE.forEach((n, i) => {
      const x = this.x0[i], cx = x + 33, val = v[n.id];
      s += panelBox(x, 68, 10, 220);
      s += `<text x="${cx}" y="36" text-anchor="middle" font-size="15" font-weight="900" fill="var(--ink)">${n.db}dB</text>`;
      s += `<text x="${cx}" y="52" text-anchor="middle" class="g-cap">하루 ${n.exp}</text><text x="${cx}" y="63" text-anchor="middle" class="g-cap">일하면…</text>`;
      for (let k = 0; k < 3; k++) s += `<path d="M${cx - 12 - k * 6} ${96 - k * 5} q${12 + k * 6} ${-16 - k * 6} ${24 + k * 12} 0" fill="none" stroke="#e5484d" stroke-width="2" opacity="${.9 - k * .25}"/>`;
      s += `<text x="${cx}" y="116" text-anchor="middle" font-size="20">🔊</text>`;
      s += wkr("w" + i, cx, 192, 62);
      s += `<text data-r="ear${i}" x="${cx}" y="150" text-anchor="middle" font-size="20" opacity="0">🎧</text>`;
      s += `<text x="${cx}" y="212" text-anchor="middle" class="g-tag" style="stroke:none">${Number.isFinite(val) ? "기준 " + fmt(val) + n.u : "기준 ?"}</text>`;
    });
    return s;
  },
  fields() { return [
    {id: "n85", t: "num", label: "소음작업 — 1일 8시간 기준 몇 dB 이상?", unit: "dB", ph: "몇 dB?", fact: "noise_85"},
    {id: "n95", t: "num", label: "강렬한 소음작업 — 95dB 이상이 1일 몇 시간 이상?", unit: "시간", ph: "몇 시간?", fact: "noise_95"},
    {id: "n100", t: "num", label: "강렬한 소음작업 — 100dB 이상이 1일 몇 시간 이상?", unit: "시간", ph: "몇 시간?", fact: "noise_100"},
    {id: "n110", t: "num", label: "강렬한 소음작업 — 110dB 이상이 1일 몇 분 이상?", unit: "분", ph: "몇 분?", fact: "noise_110"},
    {id: "n115", t: "num", label: "강렬한 소음작업 — 115dB 이상이 1일 몇 분 이상?", unit: "분", ph: "몇 분?", fact: "noise_115"},
  ]; },
  eval(v) { return NOISE.map(n => { const x = v[n.id], ok = x === n.law, lax = x > n.law; return ck(n.fact, n.lab + " 기준", ok, {dir: ok ? null : lax ? "down" : "up", val: fmt(x) + n.u, need: fmt(n.law) + n.u + " 이상", acc: !ok && lax ? n.acc : null, dtxt: "✘ 기준값과 달라요 (정확히!)"}); }); },
  async play(svg, v, res) {
    say("다섯 작업자가 각자 하루 동안 큰 소음 속에서 일합니다. 정한 기준에서 청력보호가 시작돼요…");
    await wait(800);
    let hit = 0;
    for (let i = 0; i < 5; i++) {
      const n = NOISE[i], w = R(svg, "w" + i), ear = R(svg, "ear" + i), x = this.x0[i] + 33;
      const bad = failAcc(res, n.acc);
      if (bad) {
        hit++; sfx.bad(); hurt(w); pop(svg, x, 140, "삐—"); await tw(350, t => setT(w, x, 192, 14 * Math.sin(t * Math.PI * 6)));
        setT(w, x, 192, 0);
      } else { ear.setAttribute("opacity", "1"); pop(svg, x, 140, "✔", "#12a37f"); sfx.ok(); }
      await wait(380);
    }
    if (hit) { shake(); say("💥 기준을 느슨하게 알면 그 구간의 작업자는 보호구 없이 소음에 노출되어 난청이 생깁니다."); }
    else if (!allOk(res)) generic(svg, res);
    else say("🟢 소음작업과 강렬한 소음작업 기준을 정확히 알아 모두 청력을 보호했습니다.");
  },
};

/* ---------- 의뢰 17: 후드 제어풍속 (제429조 별표 13) ---------- */
const HOODS = [
  {id: "g1", fact: "hood_gas_enc", law: 0.4, lab: "가스 · 포위식", kind: "enc", gas: true, acc: "a_hood_gas"},
  {id: "g2", fact: "hood_gas_side", law: 0.5, lab: "가스 · 측방흡인", kind: "side", gas: true, acc: "a_hood_gas"},
  {id: "d1", fact: "hood_dust_enc", law: 0.7, lab: "입자 · 포위식", kind: "enc", gas: false, acc: "a_hood_dust"},
  {id: "d2", fact: "hood_dust_up", law: 1.2, lab: "입자 · 상방흡인", kind: "up", gas: false, acc: "a_hood_dust"},
];
const M17 = {
  x0: [6, 94, 182, 270], gy: 196,
  draw(v) {
    const GY = this.gy;
    let s = rc("g-in", 0, 0, 360, 240) + rc("g-conc", 0, GY, 360, 44);
    HOODS.forEach((h, i) => {
      const x = this.x0[i], cx = x + 36, val = Number.isFinite(v[h.id]) ? Math.min(v[h.id], 3) : 0, len = val * 26;
      s += panelBox(x, 84, 8, 224);
      s += `<text x="${cx}" y="24" text-anchor="middle" class="g-tag" style="stroke:none">${h.lab}</text>`;
      // 발생원
      s += h.gas ? `<path d="M${cx - 22} ${GY - 22} h14 l-2 22 h-10z" fill="#9fd0ee" stroke="#4a8db8"/>` : `<polygon points="${cx - 26},${GY} ${cx - 15},${GY - 16} ${cx - 4},${GY}" fill="#b89b6b"/>`;
      // 후드
      if (h.kind === "enc") s += `<path d="M${cx - 32} ${GY} v-52 h38 v6" fill="none" stroke="var(--gm-steel)" stroke-width="4"/>`;
      if (h.kind === "side") s += `<polygon points="${cx - 42},${GY - 46} ${cx - 34},${GY - 40} ${cx - 34},${GY - 8} ${cx - 42},${GY - 2}" fill="var(--gm-steel)"/>`;
      if (h.kind === "up") s += `<polygon points="${cx - 34},${GY - 78} ${cx + 4},${GY - 78} ${cx - 8},${GY - 96} ${cx - 22},${GY - 96}" fill="var(--gm-steel)"/><rect x="${cx - 17}" y="${GY - 120}" width="6" height="24" fill="var(--gm-steel)"/>`;
      // 흡인 화살표
      const ax = h.kind === "side" ? [cx - 18, GY - 24, cx - 18 - len, GY - 24] : h.kind === "up" ? [cx - 15, GY - 30, cx - 15, GY - 30 - len] : [cx - 6, GY - 26, cx - 6 - len * .6, GY - 26 - len * .6];
      if (val > 0) s += `<line x1="${ax[0]}" y1="${ax[1]}" x2="${ax[2]}" y2="${ax[3]}" stroke="#2b6cb0" stroke-width="2.4" stroke-dasharray="4 2"/>`;
      s += `<text x="${cx}" y="${GY + 14}" text-anchor="middle" class="g-tag">${Number.isFinite(v[h.id]) ? fmt(v[h.id]) + " m/s" : "? m/s"}</text>`;
      s += wkr("w" + i, cx + 24, GY, 46);
    });
    return s;
  },
  fields() { return [
    {id: "g1", t: "num", label: "가스 상태 · 포위식 후드 제어풍속", unit: "m/s", ph: "몇 m/s 이상?", fact: "hood_gas_enc"},
    {id: "g2", t: "num", label: "가스 상태 · 외부식 측방흡인형", unit: "m/s", ph: "몇 m/s 이상?", fact: "hood_gas_side"},
    {id: "d1", t: "num", label: "입자 상태(흄·분진·미스트) · 포위식", unit: "m/s", ph: "몇 m/s 이상?", fact: "hood_dust_enc"},
    {id: "d2", t: "num", label: "입자 상태 · 외부식 상방흡인형", unit: "m/s", ph: "몇 m/s 이상?", fact: "hood_dust_up"},
  ]; },
  eval(v) { return HOODS.map(h => { const ok = v[h.id] >= h.law; return ck(h.fact, h.lab + " 제어풍속", ok, {dir: ok ? null : "up", val: fmt(v[h.id]) + "m/s", need: fmt(h.law) + "m/s 이상", acc: h.acc}); }); },
  async play(svg, v, res) {
    const GY = this.gy;
    say("네 작업장에서 유해물질이 발생합니다. 후드가 얼마나 잘 빨아들이는지 봐요…");
    const dots = [];
    HOODS.forEach((h, i) => { const cx = this.x0[i] + 36; for (let k = 0; k < 6; k++) dots.push({h, i, k, el: ownEl(svg, `<circle r="2.6" fill="${h.gas ? "#8bbf5a" : "#9a8f7a"}" opacity=".85"/>`, "dot" + i + "_" + k)}); });
    await tw(2200, t => {
      dots.forEach(d => {
        const cx = this.x0[d.i] + 36, ok = d.h.law <= (v[d.h.id] || 0), ph = (t * 1.6 + d.k / 6) % 1;
        const sx = cx - 15, sy = GY - 22;
        let x, y;
        if (ok) { const tx = d.h.kind === "side" ? cx - 40 : d.h.kind === "up" ? cx - 15 : cx - 6, ty = d.h.kind === "up" ? GY - 100 : GY - 40; x = L(sx, tx, ph) + Math.sin(ph * 9 + d.k) * 3; y = L(sy, ty, ph); }
        else { x = L(sx, cx + 22, ph) + Math.sin(ph * 7 + d.k) * 3; y = L(sy, GY - 54 - d.k * 2, ph); }
        d.el.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`); d.el.firstChild.setAttribute("opacity", ok && ph > .85 ? .2 : .85);
      });
    }, ease.lin);
    let hit = 0;
    HOODS.forEach((h, i) => { const w = R(svg, "w" + i); if (failAcc(res, h.acc) && !(v[h.id] >= h.law)) { hit++; hurt(w); pop(svg, this.x0[i] + 60, GY - 56, "콜록!"); } else pop(svg, this.x0[i] + 60, GY - 56, "✔", "#12a37f"); });
    dots.forEach(d => d.el.remove());
    if (hit) { sfx.bad(); shake(); say("💥 제어풍속이 기준보다 약하면 증기·분진이 새어 나와 작업자가 흡입합니다."); }
    else if (!allOk(res)) generic(svg, res);
    else { sfx.ok(); say("🟢 모든 후드가 기준 이상으로 빨아들여 유해물질이 작업자에게 오지 않았습니다."); }
  },
};

/* ---------- 의뢰 18: 작업환경측정 일정 (시행규칙 제188·190조) ---------- */
const M18 = {
  X0: 22, MX: 25,
  draw(v) {
    const X0 = this.X0, MX = this.MX, mark = d => X0 + d / 30 * MX, T = (x, y, t, an) => `<text x="${x}" y="${y}" ${an ? `text-anchor="${an}"` : ""} class="g-tag">${t}</text>`;
    let s = rc("g-in", 0, 0, 360, 250);
    s += `<text x="12" y="18" class="g-cap">작업환경측정 일정 (가로축 = 달력, 1칸 = 1개월)</text>`;
    for (let m = 0; m <= 12; m++) s += `<line x1="${X0 + m * MX}" y1="${m % 6 === 0 ? 26 : 30}" x2="${X0 + m * MX}" y2="34" stroke="var(--sub)" stroke-width="${m % 6 === 0 ? 1.6 : 1}"/><text x="${X0 + m * MX}" y="46" text-anchor="middle" class="g-cap">${m}</text>`;
    s += `<line x1="${X0}" y1="34" x2="${X0 + 12 * MX}" y2="34" stroke="var(--sub)"/>`;
    s += `<text x="12" y="66" class="g-cap">① 가동 → 첫 측정 → 정기 측정</text><circle cx="${X0}" cy="82" r="5" fill="var(--ink)"/>`;
    if (Number.isFinite(v.d1)) { const x = mark(v.d1); s += `<path d="M${x} 72 v20" stroke="#2b6cb0" stroke-width="3"/>` + T(Math.min(x + 4, 250), 104, "첫 측정 " + fmt(v.d1) + "일"); }
    if (Number.isFinite(v.m1) && v.m1 > 0) for (let k = 1; k * v.m1 <= 12; k++) s += `<path d="M${X0 + k * v.m1 * MX} 74 v16" stroke="#12a37f" stroke-width="3"/>`;
    if (Number.isFinite(v.m1)) s += T(X0 + 12 * MX, 104, "정기: " + fmt(v.m1) + "개월마다", "end");
    s += `<text x="12" y="128" class="g-cap">② 노출기준을 넘은 인자 — 측정일부터 다시</text><circle cx="${X0}" cy="144" r="5" fill="#e5484d"/>`;
    if (Number.isFinite(v.m2) && v.m2 > 0) for (let k = 1; k * v.m2 <= 12; k++) s += `<path d="M${X0 + k * v.m2 * MX} 136 v16" stroke="#e5a100" stroke-width="3"/>`;
    if (Number.isFinite(v.m2)) s += T(X0 + 12 * MX, 166, "재측정: " + fmt(v.m2) + "개월마다", "end");
    s += `<text x="12" y="188" class="g-cap">③ 시료채취를 마친 날부터 (일)</text><circle cx="${X0}" cy="204" r="5" fill="var(--ink)"/>`;
    if (Number.isFinite(v.d3)) { const x = mark(v.d3); s += `<rect x="${X0}" y="199" width="${Math.max(0, x - X0)}" height="5" fill="#2b6cb0" opacity=".55"/><path d="M${x} 194 v14" stroke="#2b6cb0" stroke-width="3"/>` + T(Math.min(x + 4, 230), 226, "보고 " + fmt(v.d3) + "일"); }
    if (Number.isFinite(v.d4)) { const x = mark(v.d4); s += `<rect x="${X0}" y="206" width="${Math.max(0, x - X0)}" height="5" fill="#e5a100" opacity=".55"/><path d="M${x} 200 v16" stroke="#e5a100" stroke-width="3"/>` + T(Math.min(x + 4, 220), 242, "개선 서류 " + fmt(v.d4) + "일"); }
    s += wkr("w1", 328, 244, 40);
    s += `<line data-r="cur" x1="${X0}" y1="50" x2="${X0}" y2="214" stroke="#e5484d" stroke-width="2" opacity="0"/>`;
    return s;
  },
  fields() { return [
    {id: "d1", t: "num", label: "측정 대상이 된 날부터 몇 일 이내에 첫 측정?", unit: "일", ph: "몇 일?", fact: "env_first"},
    {id: "m1", t: "num", label: "그 뒤 정기 측정 — 몇 개월에 1회 이상? (반기)", unit: "개월", ph: "몇 개월?", fact: "env_half"},
    {id: "m2", t: "num", label: "노출기준 초과 인자 — 몇 개월에 1회 이상 재측정?", unit: "개월", ph: "몇 개월?", fact: "env_exceed"},
    {id: "d3", t: "num", label: "측정 결과 보고 — 시료채취 후 몇 일 이내?", unit: "일", ph: "몇 일?", fact: "env_report"},
    {id: "d4", t: "num", label: "초과 공정 개선 서류·계획 — 시료채취 후 몇 일 이내?", unit: "일", ph: "몇 일?", fact: "env_improve"},
  ]; },
  eval(v) {
    const sp = [["d1", "env_first", 30, "일", "a_env_late", "첫 측정 기한"], ["m1", "env_half", 6, "개월", "a_env_late", "정기 측정 주기"], ["m2", "env_exceed", 3, "개월", "a_env_exceed", "초과 인자 재측정 주기"], ["d3", "env_report", 30, "일", "a_env_report", "결과 보고 기한"], ["d4", "env_improve", 60, "일", "a_env_improve", "개선 서류 제출 기한"]];
    return sp.map(r => { const x = v[r[0]], ok = x === r[2], lax = x > r[2]; return ck(r[1], r[5], ok, {dir: ok ? null : lax ? "down" : "up", val: fmt(x) + r[3], need: fmt(r[2]) + r[3] + " 이내", acc: !ok && lax ? r[4] : null, dtxt: "✘ 기준과 달라요 (정확히!)"}); });
  },
  async play(svg, v, res) {
    const cur = R(svg, "cur"), X0 = this.X0, MX = this.MX, w = R(svg, "w1");
    say("달력이 넘어갑니다. 법정 기한마다 일정이 지켜지는지 확인해요…");
    cur.setAttribute("opacity", "1");
    const stops = [[1, "첫 측정 30일", 30 / 30, "a_env_late", "d1", 30], [6, "정기 측정 6개월", 6, "a_env_late", "m1", 6], [3, "초과 재측정 3개월", 3, "a_env_exceed", "m2", 3], [1, "보고 30일", 1, "a_env_report", "d3", 30], [2, "개선 60일", 2, "a_env_improve", "d4", 60]];
    let hit = false;
    let xnow = X0;
    for (let si = 0; si < stops.length; si++) {
      const st = stops[si], xt = X0 + st[2] * MX;
      if (si === 2 || si === 3) { xnow = X0; cur.setAttribute("x1", X0); cur.setAttribute("x2", X0); }
      await tw(Math.max(400, Math.abs(xt - xnow) * 8), t => cur.setAttribute("x1", L(xnow, xt, t)) || cur.setAttribute("x2", L(xnow, xt, t)), ease.io);
      xnow = xt;
      const late = failAcc(res, st[3]) && v[st[4]] > st[5];
      if (late) { hit = true; sfx.bad(); pop(svg, xt, 62, "⏰ 기한 지남!"); hurt(w); } else { pop(svg, xt, 62, "✔", "#12a37f"); }
      await wait(250);
    }
    if (hit) { shake(); say("💥 법정 기한을 넘기면 유해환경이 늦게 발견되고 근로자 건강장해·과태료로 이어집니다."); }
    else if (!allOk(res)) generic(svg, res);
    else { sfx.ok(); say("🟢 모든 측정·보고·개선 기한을 지켜 근로자 건강을 지켰습니다."); }
  },
};

/* ---------- 의뢰 19: 화학물질 취급 (MSDS · 법 제114·115조) ---------- */
const MSDS_OPTS = [
  {id: "board", ic: "📋", t: "MSDS를 작업장 안, 근로자가 쉽게 볼 곳에 게시·비치", ok: true, acc: "a_msds_hidden", art: "법 제114조 ①"},
  {id: "proc", ic: "🪧", t: "작업공정별 물질 관리요령 게시", ok: true, acc: "a_msds_proc", art: "법 제114조 ②"},
  {id: "edu", ic: "🎓", t: "취급 근로자 모두에게 교육", ok: true, acc: "a_msds_edu", art: "법 제114조 ③"},
  {id: "label", ic: "🏷️", t: "옮겨 담은 용기에도 경고표시", ok: true, acc: "a_msds_label", art: "법 제115조 ②"},
  {id: "ppe", ic: "🥽", t: "명칭·영향·주의사항·보호구·응급조치 게시", ok: true, acc: "a_msds_ppe", art: "제442조"},
  {id: "safe", ic: "🗄️", t: "MSDS는 사무실 금고에 잘 보관", ok: false, acc: "a_msds_hidden", art: "법 제114조 ①"},
  {id: "one", ic: "🙋", t: "교육은 대표 한 사람에게만", ok: false, acc: "a_msds_edu", art: "법 제114조 ③"},
  {id: "mix", ic: "⚗️", t: "처음 보는 약품이라 눈대중으로 섞어 보기", ok: false, acc: "a_msds_mix", art: "법 제114조"},
];
const M19 = {
  fields() { return [{id: "sel", t: "multi", label: "새 화학물질(MSDS 대상)을 쓰기 시작합니다. 사업주가 해야 할 일을 모두 고르세요", opts: MSDS_OPTS, need: 5, hints: ["근거: 법 제114조·제115조, 안전보건규칙 제442조", "해야 할 일은 5가지, 하면 안 되는 보기 3개가 섞여 있어요", "게시·비치 · 공정별 관리요령 · 교육 · 경고표시 · 보호구·응급조치 게시"]}]; },
  draw(v) {
    const sel = v.sel || [], has = id => sel.includes(id);
    let s = rc("g-in", 0, 0, 360, 240) + rc("g-conc", 0, 192, 360, 48);
    s += rc("g-conc2", 24, 70, 200, 8, 'rx="2"') + rc("g-conc2", 24, 124, 200, 8, 'rx="2"');
    const cols = ["#3b82f6", "#e5484d", "#f5b50a", "#12a37f", "#a855f7", "#e5484d"];
    [0, 1, 2, 3, 4, 5].forEach(i => { const y = i < 3 ? 70 : 124, x = 36 + (i % 3) * 60; s += `<rect x="${x}" y="${y - 38}" width="26" height="38" rx="5" fill="${cols[i]}"/><rect x="${x + 8}" y="${y - 46}" width="10" height="9" fill="#555"/>` + (has("label") ? `<rect x="${x + 3}" y="${y - 28}" width="20" height="14" fill="#fff"/><path d="M${x + 13} ${y - 26} l-5 9 h10z" fill="#e5484d"/>` : `<text x="${x + 13}" y="${y - 14}" text-anchor="middle" font-size="12" font-weight="900" fill="#fff">?</text>`); });
    if (has("board")) s += rc("", 240, 56, 56, 74, 'rx="4" fill="#fff" stroke="#6b7684"') + `<text x="268" y="78" text-anchor="middle" font-size="9" font-weight="900" fill="#1d2433">MSDS</text><path d="M248 88 h40 M248 98 h40 M248 108 h30" stroke="#9aa3b5" stroke-width="2"/>`;
    if (has("proc")) s += rc("", 304, 56, 46, 40, 'rx="3" fill="#ffe9a8" stroke="#c98d00"') + `<text x="327" y="80" text-anchor="middle" font-size="8" font-weight="900" fill="#5b3d00">관리요령</text>`;
    if (has("ppe")) s += rc("", 304, 102, 46, 30, 'rx="3" fill="#dff6ec" stroke="#12a37f"') + `<text x="327" y="121" text-anchor="middle" font-size="8" font-weight="900" fill="#0a5b44">보호구·응급</text>`;
    s += wkr("w1", 270, 192, 70);
    sel.forEach((id, i) => { const o = MSDS_OPTS.find(x => x.id === id); s += `<text x="${12 + i * 26}" y="22" font-size="16">${o.ic}</text>`; });
    return s;
  },
  eval(v) {
    const sel = v.sel || [], c = [];
    MSDS_OPTS.filter(o => o.ok).forEach(o => { const has = sel.includes(o.id); c.push(ck(null, o.t, has, {noSrs: true, dtxt: "✘ 빠졌어요", val: has ? "함" : "빠짐", need: "해야 해요 (" + o.art + ")", acc: has ? null : o.acc})); });
    MSDS_OPTS.filter(o => !o.ok).forEach(o => { if (sel.includes(o.id)) c.push(ck(null, o.t, false, {noSrs: true, dtxt: "✘ 위험한 선택이에요", val: "선택함", need: "하면 안 돼요 (" + o.art + ")", acc: o.acc})); });
    return c;
  },
  async play(svg, v, res) {
    const w = R(svg, "w1");
    say("새 약품을 쓰는 첫날, 작업자가 약품장 앞으로 갑니다…");
    await walk(w, 270, 160, 192, 900);
    const pri = ["a_msds_mix", "a_msds_label", "a_msds_edu", "a_msds_hidden", "a_msds_proc", "a_msds_ppe"], hit = pri.find(a => failAcc(res, a));
    if (hit) {
      sfx.bad();
      const gas = ownEl(svg, `<circle cx="120" cy="120" r="8" fill="#9bd05a" opacity=".7"/>`, "gas");
      const msg = {a_msds_mix: "성질을 모르는 약품을 섞자 유독가스가 피어오릅니다!", a_msds_label: "표시 없는 병이 뭔지 몰라 잘못 집어 듭니다!", a_msds_edu: "교육받지 못해 위험한 두 약품을 함께 쓰다 가스가 생깁니다!", a_msds_hidden: "사고가 났는데 MSDS가 금고 속에 있어 확인할 수 없어요!", a_msds_proc: "공정별 관리요령이 없어 약품을 잘못 다룹니다!", a_msds_ppe: "보호구·응급조치를 몰라 피해가 커집니다!"}[hit];
      say(msg);
      await tw(1000, t => { gas.firstChild.setAttribute("r", 8 + 56 * t); gas.firstChild.setAttribute("opacity", .7 * (1 - t * .3)); });
      hurt(w); shake(); pop(svg, 150, 120, "콜록!");
      say("💥 " + ACC[hit].n + " — " + ACC[hit].tip);
    } else if (!allOk(res)) generic(svg, res);
    else { await wait(500); sfx.ok(); pop(svg, 150, 90, "✔ 확인!", "#12a37f"); pop(svg, 268, 52, "MSDS 확인", "#2b6cb0"); say("🟢 게시된 MSDS·관리요령으로 확인하고, 용기 표시를 보고 교육받은 대로 안전하게 다룹니다."); }
  },
};

/* ---------- 의뢰 20: 상황별 보호구 (제450·451·516·617조) ---------- */
const PPE_OPTS = [
  {id: "air", ic: "🫁", t: "송기마스크", s: "송기마스크"}, {id: "gas", ic: "😷", t: "방독마스크", s: "방독마스크"}, {id: "dust", ic: "🌫️", t: "방진마스크", s: "방진마스크"},
  {id: "ear", ic: "🎧", t: "청력보호구", s: "청력보호구"}, {id: "skin", ic: "🧤", t: "불침투성 보호복·장갑·장화", s: "보호복·장갑"}, {id: "belt", ic: "🪢", t: "안전대", s: "안전대"},
];
const PPE_CASES = [
  {id: "p1", ic: "🛢️", q: "유기화합물을 넣었던 탱크 내부 세척·페인트칠", ok: ["air"], acc: "a_ppe_tank", art: "제450조 제1항", fact: "t_tankmask", hints: ["근거: 제450조 제1항", "신선한 공기를 공급받는 마스크예요"]},
  {id: "p2", ic: "🧪", q: "밀폐설비·국소배기장치가 없는 곳에서 유기화합물 취급", ok: ["air", "gas"], acc: "a_ppe_solvent", art: "제450조 제2항", hints: ["근거: 제450조 제2항", "송기마스크 '나' 방독마스크 중 하나"]},
  {id: "p3", ic: "🌫️", q: "분진작업 (밀폐·국소배기 설비 없음)", ok: ["dust"], acc: "a_ppe_dust", art: "제617조 제1항", hints: ["근거: 제617조 제1항", "분진을 걸러 주는 호흡용 보호구"]},
  {id: "p4", ic: "🔊", q: "1일 8시간 기준 85dB 이상의 소음작업", ok: ["ear"], acc: "a_ppe_noise", art: "제516조", fact: "t_hear", hints: ["근거: 제516조 제1·2항", "개인 전용으로 지급해요"]},
  {id: "p5", ic: "⚗️", q: "피부 자극성·부식성 관리대상 유해물질 취급", ok: ["skin"], acc: "a_ppe_skin", art: "제451조 제1항", hints: ["근거: 제451조 제1항", "물이 스며들지 않는 보호복·장갑·장화"]},
];
const M20 = {
  draw(v) {
    let s = rc("g-in", 0, 0, 360, 240);
    PPE_CASES.forEach((c, i) => {
      const x = 6 + i * 70, cx = x + 33, p = v[c.id], o = PPE_OPTS.find(z => z.id === p);
      s += panelBox(x, 68, 10, 220);
      s += `<text x="${cx}" y="44" text-anchor="middle" font-size="26">${c.ic}</text>`;
      s += `<text x="${cx}" y="62" text-anchor="middle" class="g-cap">${["탱크 내부", "유기용제", "분진", "소음", "부식성"][i]}</text>`;
      s += wkr("w" + i, cx, 190, 70);
      s += `<text data-r="ic${i}" x="${cx}" y="${190 - 74}" text-anchor="middle" font-size="22">${o ? o.ic : ""}</text>`;
      s += `<text x="${cx}" y="212" text-anchor="middle" class="g-tag" style="stroke:none">${o ? o.s : "?"}</text>`;
    });
    return s;
  },
  fields() { return PPE_CASES.map(c => ({id: c.id, t: "pick", label: c.ic + " " + c.q, opts: PPE_OPTS, hints: c.hints})); },
  eval(v) { return PPE_CASES.map(c => { const ok = c.ok.includes(v[c.id]); return ck(c.fact || null, c.q.slice(0, 18) + "…", ok, {noSrs: !c.fact, dtxt: "✘ 맞는 보호구가 아니에요", val: (PPE_OPTS.find(z => z.id === v[c.id]) || {}).t, need: c.ok.map(i => PPE_OPTS.find(z => z.id === i).t).join(" 또는 ") + " (" + c.art + ")", acc: ok ? null : c.acc}); }); },
  async play(svg, v, res) {
    say("다섯 작업자가 선택한 보호구를 쓰고 일을 시작합니다…");
    await wait(700);
    let hit = 0;
    for (let i = 0; i < 5; i++) {
      const c = PPE_CASES[i], w = R(svg, "w" + i), x = 6 + i * 70 + 33;
      if (!c.ok.includes(v[c.id])) { hit++; sfx.bad(); hurt(w); pop(svg, x, 100, "윽!"); await tw(320, t => setT(w, x, 190, 12 * Math.sin(t * Math.PI * 6))); setT(w, x, 190, 0); }
      else { sfx.ok(); pop(svg, x, 100, "✔", "#12a37f"); }
      await wait(320);
    }
    if (hit) { shake(); say("💥 상황에 맞지 않는 보호구는 유해인자를 막지 못합니다."); }
    else say("🟢 다섯 작업 모두 알맞은 보호구로 건강을 지켰습니다.");
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
/* ---- 새 의뢰 등록 ---- */
MS.forEach(m => { m.pack = "fall"; });
MS.push(
  {
    id: "m6", pack: "elec", ic: "⚡", title: "젖은 철판 위 전동드릴", sub: "누전차단기 · 제304조", vb: "0 0 360 240", mod: M6, arts: ["제304조"],
    brief: "비 온 뒤 <b>젖은 철판 위</b>에서 220V 전동드릴을 씁니다. 누전이 생기면 사람이 위험해요. <b>누전차단기</b>의 설치 기준과 성능을 직접 정하세요.",
    fields: [
      {id: "v", t: "num", label: "대지전압이 몇 V를 넘는 이동형·휴대형 기계에 누전차단기를 설치하나요?", unit: "V", ph: "몇 V?", fact: "elb_v"},
      {id: "ma", t: "num", label: "누전차단기 정격감도전류 (몇 mA 이하)", unit: "mA", ph: "몇 mA?", fact: "elb_ma"},
      {id: "t", t: "num", label: "누전차단기 작동시간 (몇 초 이내)", unit: "초", ph: "몇 초?", fact: "elb_t", dec: true},
    ],
    lessons: ["대지전압 150V 초과 이동형·휴대형 기계, 물기 있는 습윤장소·철판 위 같은 도전성 높은 장소의 이동형·휴대형 기계, 임시배선 장소의 기계에는 감전방지용 누전차단기를 설치합니다.", "정격감도전류 30mA 이하, 작동시간 0.03초 이내 (정격전부하전류 50A 이상은 200mA 이하·0.1초 이내 가능).", "사용 전에 누전차단기 작동상태를 점검하고, 이상이 있으면 즉시 보수·교환합니다."],
  },
  {
    id: "m7", pack: "elec", ic: "🔌", title: "정전 전로 작업 순서", sub: "정전전로 · 제319조", vb: "0 0 360 240", mod: M7, arts: ["제319조"],
    brief: "전동기 점검을 위해 <b>분전반 전원을 끄고</b> 작업합니다. 다른 사람이 스위치를 올리지 못하게 <b>정전 절차의 순서</b>를 올바르게 이어 보세요.",
    lessons: ["정전 절차(제319조 제2항): ① 도면·배선도로 모든 전원 확인 → ② 전원 차단 후 단로기 개방·확인 → ③ 잠금장치·꼬리표 부착 → ④ 잔류전하 방전 → ⑤ 검전기로 충전 여부 확인 → ⑥ 필요하면 단락 접지.", "작업 후 전원을 넣을 땐 작업기구·접지기구를 치우고 모두 떨어져 있는지 확인, 잠금장치·꼬리표는 설치한 사람이 직접 철거합니다."],
  },
  {
    id: "m8", pack: "elec", ic: "🌩️", title: "고압선 옆 작업", sub: "접근 한계거리 · 제321조", vb: "0 0 360 250", mod: M8, arts: ["제321조"],
    brief: "전주 위 <b>세 가지 전압의 선</b> 옆에서 고소작업대로 작업합니다. 유자격자가 충전전로에 접근할 수 있는 <b>한계거리(cm)</b>를 전압별로 정하세요.",
    fields: [
      {id: "d1", t: "num", label: "380V 저압선 (0.3 초과 0.75kV 이하)", unit: "cm", ph: "몇 cm?", fact: "ap_03"},
      {id: "d2", t: "num", label: "6.6kV 고압선 (2 초과 15kV 이하)", unit: "cm", ph: "몇 cm?", fact: "ap_2"},
      {id: "d3", t: "num", label: "22.9kV 특고압선 (15 초과 37kV 이하)", unit: "cm", ph: "몇 cm?", fact: "ap_15"},
    ],
    lessons: ["충전전로 접근 한계거리(선간전압): 0.3kV 이하 접촉금지 / 0.3~0.75kV 30cm / 0.75~2kV 45cm / 2~15kV 60cm / 15~37kV 90cm / 37~88kV 110cm …", "유자격자가 아닌 근로자는 대지전압 50kV 이하 충전전로에 300cm 이내로 접근할 수 없습니다.", "충전전로 인근에서 차량·기계장치 작업은 충전부로부터 300cm 이상 이격 (높이를 낮춰 이동할 땐 120cm 이상)."],
  },
  {
    id: "m9", pack: "conf", ic: "📟", title: "맨홀 진입 전 공기 측정", sub: "적정공기 · 제618조", vb: "0 0 360 250", mod: M9, arts: ["제618조"],
    brief: "하수 맨홀에 들어가기 전, <b>가스 측정기의 경보 기준</b>을 설정합니다. 지금 맨홀 안 공기는 산소 17.9%, 이산화탄소 1.6%, 일산화탄소 31ppm, 황화수소 10ppm이에요. <b>적정공기 기준</b>을 정확히 입력하세요.",
    lessons: ["적정공기: 산소 18% 이상 23.5% 미만, 이산화탄소 1.5% 미만, 일산화탄소 30ppm 미만, 황화수소 10ppm 미만.", "산소농도가 18% 미만이면 '산소결핍'. 작업 시작 전과 작업 중에 적정공기가 유지되도록 환기합니다 (제620조).", "환기가 곤란하면 공기호흡기 또는 송기마스크를 착용합니다."],
  },
  {
    id: "m10", pack: "conf", ic: "🕳️", title: "맨홀 작업 준비물", sub: "밀폐공간 작업 · 제619~625조", vb: "0 0 360 250", mod: M10, arts: ["제619조", "제623조"],
    brief: "정화조 <b>맨홀 안 청소</b> 작업이 잡혔어요. 들어가기 전에 갖춰야 할 것을 <b>모두</b> 고르세요. 위험한 보기도 섞여 있어요.",
    lessons: ["밀폐공간 작업: 작업 프로그램 수립(제619조), 작업 전·중 환기(제620조), 입·퇴장 인원 점검(제621조), 출입금지 표지(제622조), 외부 감시인과 연락 설비(제623조).", "추락 우려 시 안전대·구명밧줄·공기호흡기 또는 송기마스크 착용(제624조), 공기호흡기·사다리·섬유로프 등 구출 기구 비치(제625조).", "순수 산소로 환기하거나 불꽃으로 가스를 확인하는 건 화재·폭발 위험이 큽니다."],
  },
  {
    id: "m11", pack: "conf", ic: "🆘", title: "쓰러진 동료 구조", sub: "감시인 · 제623·625조", vb: "0 0 360 250", mod: M11, arts: ["제623조", "제625조"],
    brief: "맨홀 안에서 작업하던 동료가 갑자기 <b>쓰러졌습니다</b>. 밖에서 지켜보던 감시인인 당신은 무엇을 해야 할까요? 정답은 <b>두 가지</b>입니다.",
    lessons: ["감시인은 근로자에게 이상이 생기면 지체 없이 관할 소방관서에 신고하고, 소방관서장의 협조를 받아 적절한 조치를 한 뒤 사업주·관리감독자에게 알립니다 (제623조 제2항).", "구조자도 공기호흡기 또는 송기마스크 등 구출 기구를 갖추고 들어가야 2차 재해를 막을 수 있습니다 (제625조)."],
  },
  {
    id: "m12", pack: "exc", ic: "⛏️", title: "굴착면 기울기", sub: "별표 11 · 제339조", vb: "0 0 360 250", mod: M12, arts: ["제339조"],
    brief: "네 종류의 지반을 굴착합니다. 높이 1에 대한 수평거리 <b>(1 : ?)</b>인 굴착면 기울기를 지반별로 정하세요. 수가 클수록 완만해요.",
    lessons: ["굴착면 기울기(별표 11): 모래 1:1.8 · 연암 및 풍화암 1:1.0 · 경암 1:0.5 · 그 밖의 흙 1:1.2.", "기울기는 높이에 대한 수평거리의 비율입니다. 설계도서상의 기울기를 따르거나 흙막이 등으로 붕괴를 막은 경우는 예외입니다.", "비가 올 때를 대비해 측구를 설치하거나 경사면에 비닐을 덮습니다 (제339조 제2항)."],
  },
  {
    id: "m13", pack: "exc", ic: "🚜", title: "깊은 굴착 현장", sub: "굴착 안전조치 · 제340~347조", vb: "0 0 360 250", mod: M13, arts: ["제340조", "제341조"],
    brief: "도심에서 <b>깊게 파는 굴착 현장</b>입니다. 지하에는 가스관이 지나가고, 비 소식도 있고, 굴착기가 오갑니다. 필요한 안전조치를 <b>모두</b> 고르세요.",
    lessons: ["토사 붕괴 우려 시 흙막이 지보공·방호망 설치, 근로자 출입금지 (제340조). 흙막이 지보공은 조립도를 작성해 조립하고(제346조) 정기 점검·계측합니다(제347조).", "노출된 매설물은 방호하거나 이설하고 관리감독자가 지휘 (제341조). 가스도관 등이 파손될 우려가 있으면 굴착을 중지 (제342조).", "굴착기계가 후진해 접근할 우려가 있으면 유도자를 배치 (제344조)."],
  },
  {
    id: "m14", pack: "fire", ic: "🔥", title: "철골 용접 작업", sub: "화재위험작업 · 제241조", vb: "0 0 360 240", mod: M14, arts: ["제241조", "제241조의2"],
    brief: "공장 안에서 <b>철골 용접</b>을 합니다. 근처에 종이 상자와 인화성 물질이 있어요. 가연물을 확인할 <b>작업반경</b>과, 화재를 막기 위해 <b>갖출 것 세 가지</b>를 정하세요.",
    lessons: ["작업반경 11m 이내에 가연성물질이 있는 장소에서 용접·용단 작업을 하면 화재감시자를 지정·배치합니다 (제241조의2).", "화재위험작업 시 인근 가연물 방호, 소화기구 비치, 용접불티 비산방지덮개·용접방화포 설치 (제241조 제2항).", "통풍이 불충분한 장소에서는 환기용으로 산소를 사용해서는 안 됩니다 (제241조 제1항)."],
  },
  {
    id: "m15", pack: "fire", ic: "⚙️", title: "컨베이어 정비·청소", sub: "운전정지 · 제92조", vb: "0 0 360 240", mod: M15, arts: ["제92조"],
    brief: "컨베이어 기계를 <b>청소·정비</b>하려 합니다. 다른 사람이 실수로 기동하면 끼일 수 있어요. 정비 전에 해야 할 일을 <b>올바른 순서</b>로 이어 보세요.",
    lessons: ["동력 기계의 정비·청소·급유·검사·수리·교체·조정 작업을 할 때는 운전을 정지합니다 (제92조 제1항).", "다른 사람이 기계를 운전하지 못하게 기동장치에 잠금장치를 하고 열쇠를 별도 관리하거나 표지판을 설치합니다 (제2항).", "내부에 압축된 기체·액체가 방출될 우려가 있으면 미리 방출합니다 (제4항)."],
  },
);
const PACKS = [
  {id: "fall", n: "추락 편", ic: "🧗"}, {id: "elec", n: "전기 편", ic: "⚡"}, {id: "conf", n: "밀폐공간 편", ic: "🕳️"},
  {id: "exc", n: "굴착 편", ic: "⛏️"}, {id: "fire", n: "화재·기계 편", ic: "🔥"},
];

/* ---- 보건 편 의뢰 등록 ---- */
MS.push(
  {
    id: "m16", pack: "health", ic: "🔊", title: "시끄러운 공장", sub: "소음작업 · 제512조", vb: "0 0 360 240", mod: M16, arts: ["제512조", "제516조"],
    brief: "다섯 작업자가 <b>소음이 큰 곳</b>에서 하루 일합니다. 어느 소음에서부터 <b>소음작업·강렬한 소음작업</b>으로 보고 보호하는지, 기준을 정확히 입력하세요. 기준을 느슨하게 알면 그 구간 작업자는 무방비예요.",
    lessons: ["소음작업: 1일 8시간 기준 85dB 이상. 강렬한 소음작업: 90dB 8시간 · 95dB 4시간 · 100dB 2시간 · 105dB 1시간 · 110dB 30분 · 115dB 15분 이상 (5dB 오를 때마다 시간이 절반).", "충격소음작업(1초 이상 간격): 120dB 초과 1만회 · 130dB 초과 1천회 · 140dB 초과 1백회 이상.", "소음작업 근로자에게는 개인 전용 청력보호구를 지급·착용시키고(제516조), 청력보존 프로그램을 수립·시행합니다(제517조)."],
  },
  {
    id: "m17", pack: "health", ic: "🌀", title: "유해물질 국소배기 후드", sub: "후드 제어풍속 · 제429조·별표 13", vb: "0 0 360 240", mod: M17, arts: ["제429조"],
    brief: "관리대상 유해물질을 다루는 네 작업장에 <b>국소배기 후드</b>를 답니다. 후드 형식과 물질 상태(가스·입자)별로 필요한 <b>최소 제어풍속(m/s)</b>을 정하세요. 약하면 유해물질이 새어 나와요.",
    lessons: ["관리대상 유해물질 후드 제어풍속(별표 13): 가스 상태 — 포위식 0.4 · 외부식 측방·하방 0.5 · 상방 1.0 m/s 이상.", "입자 상태(흄·분진·미스트) — 포위식 0.7 · 외부식 측방·하방 1.0 · 상방 1.2 m/s 이상.", "분진작업장소 국소배기장치도 별표 17의 제어풍속 이상의 성능을 갖춰야 합니다 (제609조)."],
  },
  {
    id: "m18", pack: "health", ic: "📅", title: "작업환경측정 일정", sub: "측정 주기·보고 · 시행규칙 제188·190조", vb: "0 0 360 250", mod: M18, arts: ["법 제125조", "시행규칙 제190조"],
    brief: "소음·유기용제가 있는 공장이 <b>작업환경측정 대상</b>이 되었어요. 첫 측정, 정기 측정, 노출기준 초과 시 재측정, 결과 보고·개선 서류 <b>기한</b>을 정확히 정하세요. 달력이 넘어가며 기한을 확인합니다.",
    lessons: ["대상 작업장이 된 날부터 30일 이내에 첫 측정, 그 후 반기(6개월)에 1회 이상 (시행규칙 제190조).", "노출기준을 초과한 인자는 측정일부터 3개월에 1회 이상. 최근 1년 변화가 없고 소음이 최근 2회 연속 85dB 미만이면 연 1회도 가능.", "결과는 시료채취를 마친 날부터 30일 이내 보고, 초과 공정은 60일 이내 개선 증명서류·계획 제출 (시행규칙 제188조).", "일반건강진단은 사무직 2년에 1회, 그 밖의 근로자 1년에 1회 이상 (시행규칙 제197조)."],
  },
  {
    id: "m19", pack: "health", ic: "🧴", title: "새 화학물질 도입", sub: "MSDS · 법 제114·115조", vb: "0 0 360 240", mod: M19, arts: ["제442조"],
    brief: "공장에 <b>새 화학물질</b>이 들어왔습니다. 물질안전보건자료(MSDS) 대상이에요. 사업주가 해야 할 일을 <b>모두</b> 고르세요. 하면 안 되는 보기도 섞여 있어요.",
    lessons: ["MSDS 대상물질을 취급하는 사업주는 MSDS를 작업장 안, 근로자가 쉽게 볼 수 있는 장소에 게시하거나 갖추어 둡니다 (법 제114조 제1항).", "작업공정별 관리 요령을 게시하고(제2항), 취급 근로자를 교육합니다(제3항).", "사업장에서 쓰는 대상물질 용기에는 경고표시를 합니다 (법 제115조 제2항).", "관리대상 유해물질 작업장에는 명칭·인체 영향·취급 주의사항·보호구·응급조치를 게시합니다 (안전보건규칙 제442조)."],
  },
  {
    id: "m20", pack: "health", ic: "😷", title: "상황별 보호구", sub: "호흡용·청력·보호복 · 제450·451·516·617조", vb: "0 0 360 240", mod: M20, arts: ["제450조", "제617조"],
    brief: "다섯 가지 작업이 시작됩니다. 작업마다 <b>알맞은 보호구</b>를 고르세요. 안 맞는 보호구는 유해인자를 못 막아요.",
    lessons: ["유기화합물 넣었던 탱크 내부 세척·페인트칠, 유기화합물 취급 특별장소 업무 → 송기마스크 (제450조 제1항).", "밀폐설비·국소배기장치가 없는 곳의 유기화합물 취급 등 → 송기마스크나 방독마스크 (제450조 제2항).", "분진작업 → 적절한 호흡용 보호구 (설비 조치를 한 경우는 예외, 제617조). 소음작업 → 개인 전용 청력보호구 (제516조).", "피부 자극성·부식성 관리대상 유해물질 → 불침투성 보호복·장갑·장화와 피부보호용 바르는 약품 (제451조)."],
  },
);
PACKS.push({id: "health", n: "보건 편", ic: "🩺"});

const MSBY = {}; MS.forEach(m => { MSBY[m.id] = m; });
// 랜덤 상황: 제목·조문 없이 상황만 보여 주고, 필요한 안전조치를 먼저 떠올려 쓰게 한다 (kw: 인정하는 낱말, name: 정답 공개용)
const RAND_INFO = {
  m1: {sit: "신축 건물 2층 슬래브 가장자리에서 철근 작업이 시작됩니다. 아래층에는 다른 근로자가 있어요.", name: "안전난간", kw: ["난간", "발끝막이"]},
  m2: {sit: "바닥에 구멍이 뚫려 있고, 작업자들이 이 길로 자재를 나릅니다.", name: "개구부 방호 (난간·울타리·방망·덮개)", kw: ["개구부", "덮개", "울타리", "방망", "난간"]},
  m3: {sit: "높은 곳에서 외벽 작업을 합니다. 작업 중 사람이 떨어질 수 있어요.", name: "추락방호망", kw: ["방호망", "그물", "방망", "네트"]},
  m4: {sit: "지붕층을 점검해야 합니다. 벽 위 지붕선까지 올라가야 해요.", name: "사다리 설치 기준", kw: ["사다리"]},
  m5: {sit: "높이 4m 정도의 구조물을 세워 외벽 작업을 하려 합니다. 자재를 가득 올릴 예정이에요.", name: "강관비계", kw: ["비계", "발판", "띠장"]},
  m6: {sit: "비 온 뒤 젖은 철판 위에서 220V 전동드릴을 씁니다.", name: "누전차단기", kw: ["누전", "차단기", "접지"]},
  m7: {sit: "전동기를 점검하려는데 분전반 전원이 켜져 있어요. 다른 사람이 곁을 지나다닙니다.", name: "정전 작업 절차 (잠금·꼬리표)", kw: ["정전", "잠금", "꼬리표", "검전", "차단", "로토", "loto"]},
  m8: {sit: "전주 위, 세 가지 전압의 선 옆에서 고소작업대로 작업해야 합니다.", name: "충전전로 접근 한계거리", kw: ["접근", "한계", "이격", "절연", "충전"]},
  m9: {sit: "하수 맨홀에 들어가야 합니다. 안쪽 공기가 어떤지 모릅니다.", name: "적정공기 측정", kw: ["측정", "가스", "산소", "적정공기", "농도"]},
  m10: {sit: "정화조 맨홀 안 청소 작업이 잡혔어요.", name: "밀폐공간 작업 준비 (환기·측정·감시인…)", kw: ["밀폐", "환기", "감시인", "송풍", "공기호흡기", "측정"]},
  m11: {sit: "맨홀 안에서 작업하던 동료가 갑자기 쓰러졌습니다. 밖에서 지켜보던 사람은 당신입니다.", name: "신고 + 호흡보호구 착용 구조", kw: ["119", "신고", "구조", "호흡기", "송기"]},
  m12: {sit: "네 종류의 지반을 파 내려갑니다. 근로자가 바닥에서 작업해요.", name: "굴착면 기울기", kw: ["기울기", "경사", "비탈", "구배", "사면"]},
  m13: {sit: "도심에서 깊게 파는 굴착 현장입니다. 지하에는 가스관이 지나가고 비 소식도 있고 굴착기가 오갑니다.", name: "굴착 현장 안전조치 (흙막이·유도자·매설물…)", kw: ["흙막이", "지보공", "굴착", "유도자", "매설물", "배수"]},
  m14: {sit: "공장 안에서 철골 용접을 합니다. 근처에 종이 상자와 인화성 물질이 있어요.", name: "화재 예방 (방화포·소화기·화재감시자)", kw: ["화재", "방화포", "소화기", "불티", "감시자"]},
  m15: {sit: "돌아가는 컨베이어 기계를 청소·정비하려 합니다. 근처에 다른 작업자도 있어요.", name: "운전정지·잠금·표지판", kw: ["정지", "잠금", "표지판", "꼬리표", "락"]},
  m16: {sit: "소음이 큰 공장에서 다섯 작업자가 하루 일합니다.", name: "청력보호 (소음작업 기준)", kw: ["청력", "귀마개", "귀덮개", "소음", "보호구"]},
  m17: {sit: "유해한 가스와 분진이 나는 네 작업장입니다. 설비로 빨아들이려 해요.", name: "국소배기 후드 (제어풍속)", kw: ["후드", "국소배기", "배기", "환기", "제어풍속"]},
  m18: {sit: "소음·유기용제가 있는 공장이 막 가동을 시작했어요. 근로자 건강이 걱정됩니다.", name: "작업환경측정 일정", kw: ["측정", "작업환경", "주기", "보고"]},
  m19: {sit: "공장에 새 화학물질이 들어왔습니다. 근로자들은 처음 보는 약품이에요.", name: "MSDS (게시·교육·경고표시)", kw: ["msds", "물질안전", "경고표시", "라벨", "교육", "게시"]},
  m20: {sit: "다섯 가지 위험한 작업이 동시에 시작됩니다. 작업자들이 무엇을 쓰고 일해야 할까요?", name: "상황별 보호구", kw: ["보호구", "마스크", "보호복", "귀마개", "호흡"]},
};
MS.forEach(m => Object.assign(m, RAND_INFO[m.id] || {}));
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
const openPacks = {};   // 홈에서 펼친 편
function missionFacts(m) { try { return fieldsOf(m, {}).map(f => f.fact).filter(Boolean); } catch (e) { return []; } }
function pickRandom(pack) {   // 아직 못 깬 의뢰·약한 낱말이 걸린 의뢰가 더 자주 나온다 (방금 한 것은 제외)
  const list = MS.filter(m => pack === "all" || m.pack === pack);
  const w = list.map(m => 1 + (S.stars[m.id] ? 3 - S.stars[m.id] : 3) + missionFacts(m).filter(id => factDue(id)).length * 2 - (m.id === S.lastRand ? 99 : 0));
  const sum = w.reduce((a, b) => a + Math.max(.05, b), 0); let r = Math.random() * sum;
  for (let i = 0; i < list.length; i++) { r -= Math.max(.05, w[i]); if (r <= 0) return list[i]; }
  return list[0];
}
const starStr = n => `<span class="gm-ms${n ? "" : " z"}">${"★".repeat(n)}${"☆".repeat(3 - n)}</span>`;
function topBar() {
  return `<div class="gm-top"><div class="gm-mode"><button type="button" data-a="toread">📖 공부</button><button type="button" class="on">🎮 게임</button></div>` +
    `<button type="button" class="gm-ib" data-a="snd" aria-label="효과음" title="효과음">${S.snd ? "🔊" : "🔇"}</button><button type="button" class="gm-ib" data-a="close" aria-label="공부 닫기">✕</button></div>`;
}
function renderHome() {
  scr = "home"; cm = null; stopQ();
  const lv = lvInfo(S.xp), due = dueList(), dexN = Object.keys(S.dex).length;
  const cleared = MS.filter(m => S.stars[m.id]).length;
  let h = topBar();
  h += `<div class="gm-hero"><h2>무사고 현장</h2><p>숫자를 직접 떠올려 현장을 지키는 안전 게임</p>` +
    `<div class="gm-lv"><b>LV.${lv.i + 1}</b>${lv.title}</div><div class="gm-xp"><i style="width:${lv.max ? 100 : Math.round(lv.cur / lv.need * 100)}%"></i></div>` +
    `<div class="gm-stats"><span>🛡️ 무사고 ${S.cur}연속 (최고 ${S.best})</span><span>📕 사고도감 ${dexN}/${accN()}</span><span>✅ 의뢰 ${cleared}/${MS.length}</span></div></div>`;
  if (due.length) h += `<button type="button" class="gm-alert" data-a="redo"><span class="sir">🚨</span><span>속보: 재발 사고 ${due.length}건!<small>잊어버릴 때쯤 같은 사고가 또 터졌어요. 지금 출동</small></span></button>`;
  if (!cleared) h += `<div class="gm-guide"><b>이렇게 해요</b><div>① 의뢰를 고르면 현장 그림이 나와요</div><div>② <b>기준 숫자를 보기 없이 직접 입력</b>하면 그림이 바로 바뀌어요</div><div>③ <b>착공!</b>을 누르면 결과가 눈앞에서 벌어져요. 틀리면 사고가 나고, 사고는 <b>도감</b>에 모여요</div><div>④ 틀린 숫자는 며칠 뒤 <b>재발 사고</b>로 다시 터져요. 그때 또 맞히면 완전히 내 것!</div></div>`;
  h += `<div class="gm-sec">🎲 랜덤 현장</div><button type="button" class="gm-mc gm-rnd" data-a="rand" data-pack="all"><span class="gm-mn">🎲</span><span class="gm-mt"><b>아무 현장이나 순찰</b><small>모든 편에서 랜덤으로 상황이 터져요 · 약한 곳이 더 자주 나와요</small></span><span class="gm-ms" style="color:#fff">▶</span></button>`;
  // 편은 2열 타일로 촘촘하게: 타일을 누르면 그 편의 랜덤 상황, ≡ 를 누르면 의뢰 목록(한 번에 한 편만 펼침)
  h += `<div class="gm-sec">편 선택 · 누르면 랜덤 상황이 터져요</div><div class="gm-grid">`;
  PACKS.forEach(pk => {
    const list = MS.filter(m => m.pack === pk.id), n = list.filter(m => S.stars[m.id]).length;
    h += `<div class="gm-tile${openPacks[pk.id] ? " open" : ""}"><button type="button" class="gm-tb" data-a="rand" data-pack="${pk.id}"><span class="ic">${pk.ic}</span><b>${pk.n}</b><small>🎲 · ★ ${n}/${list.length}</small></button><button type="button" class="gm-tl" data-a="fold" data-pack="${pk.id}" aria-label="${pk.n} 의뢰 목록">${openPacks[pk.id] ? "▴" : "≡"}</button></div>`;
  });
  h += `</div>`;
  const op = PACKS.find(p => openPacks[p.id]);
  if (op) {
    h += `<div class="gm-sec">${op.ic} ${op.n} 의뢰 목록</div>`;
    MS.map((m, i) => [m, i]).filter(x => x[0].pack === op.id).forEach(([m, i]) => { h += `<button type="button" class="gm-mc" data-a="mis" data-id="${m.id}"><span class="gm-mn">${m.ic}</span><span class="gm-mt"><b>${i + 1}. ${m.title}</b><small>${m.sub}</small></span>${starStr(S.stars[m.id] || 0)}</button>`; });
  }
  const bossOK = cleared >= 3;
  h += `<div class="gm-sec">보스</div><button type="button" class="gm-mc boss" data-a="boss" ${bossOK ? "" : "disabled"}><span class="gm-mn">🧑‍✈️</span><span class="gm-mt"><b>감독관 불시점검</b><small>${bossOK ? "시간 안에 직접 답을 떠올려 쓰세요 · 목숨 3개" + (S.insp ? " · 통과 " + S.insp + "회" : "") : "의뢰 3개 이상 클리어하면 열려요"}</small></span><span class="gm-ms" style="color:#fff">${bossOK ? "▶" : "🔒"}</span></button>`;
  h += `<div class="gm-sec">기록</div><button type="button" class="gm-mc" data-a="dex"><span class="gm-mn">📕</span><span class="gm-mt"><b>사고 도감</b><small>일부러(?) 사고를 내서 모아 보세요 · ${dexN}/${accN()}</small></span></button>`;
  h += `<div class="gm-note">참고용 학습 게임이에요. 숫자는 「산업안전보건기준에 관한 규칙」 조문에서 옮겼고, 실제 현장 적용 전에는 조문 원문과 고용노동부 고시를 꼭 확인하세요. 장면의 크기·동작은 이해를 돕는 그림입니다.</div>`;
  root.innerHTML = `<div class="gm">${h}</div>`;
  window.scrollTo(0, 0);
}

/* ---------- 의뢰 화면 ---------- */
function fieldHTML(f, v, hn) {
  const hh = (hn[f.id] || []).map(t => `<div>💡 ${esc(t)}</div>`).join("");
  if (f.t === "num") return `<div class="gm-f" data-f="${f.id}"><span class="gm-fl">${esc(f.label)}</span><span class="gm-fi"><input data-in="${f.id}" inputmode="decimal" autocomplete="off" placeholder="${esc(f.ph || "")}" value="${Number.isFinite(v[f.id]) ? v[f.id] : ""}"><i>${f.unit}</i></span><button type="button" class="gm-hint" data-a="hint" data-f="${f.id}" aria-label="힌트">💡</button><span class="gm-hn" data-hn="${f.id}">${hh}</span></div>`;
  if (f.t === "pick") return `<div class="gm-f" data-f="${f.id}"><span class="gm-fl">${esc(f.label)}</span><button type="button" class="gm-hint" data-a="hint" data-f="${f.id}" aria-label="힌트">💡</button><div class="gm-chips">${f.opts.map(o => `<button type="button" class="gm-chip${v[f.id] === o.id ? " on" : ""}" data-a="pick" data-f="${f.id}" data-v="${o.id}">${o.ic} ${o.t}</button>`).join("")}</div><span class="gm-hn" data-hn="${f.id}">${hh}</span></div>`;
  if (f.t === "seq") {
    const chosen = v[f.id] || [];
    cm.shuf = cm.shuf || {}; if (!cm.shuf[f.id]) cm.shuf[f.id] = shuffle(f.items.map(x => x.id));
    const rest = cm.shuf[f.id].filter(id => !chosen.includes(id)), tx = id => esc(f.items.find(x => x.id === id).t);
    return `<div class="gm-f" data-f="${f.id}"><span class="gm-fl">${esc(f.label)}</span><button type="button" class="gm-hint" data-a="hint" data-f="${f.id}" aria-label="힌트">💡</button>` +
      `<ol class="gm-seq">${chosen.map(id => `<li>${tx(id)}</li>`).join("") || '<li class="gm-ph">아래에서 순서대로 눌러 담아요</li>'}</ol>` +
      `<div class="gm-chips gm-col">${rest.map(id => `<button type="button" class="gm-chip" data-a="seqadd" data-f="${f.id}" data-v="${id}">${tx(id)}</button>`).join("")}</div>` +
      (chosen.length ? `<button type="button" class="gm-clr" data-a="seqclr" data-f="${f.id}">↺ 다시 고르기</button>` : "") + `<span class="gm-hn" data-hn="${f.id}">${hh}</span></div>`;
  }
  if (f.t === "multi") {
    const sel = v[f.id] || [];
    return `<div class="gm-f" data-f="${f.id}"><span class="gm-fl">${esc(f.label)}</span><button type="button" class="gm-hint" data-a="hint" data-f="${f.id}" aria-label="힌트">💡</button>` +
      `<div class="gm-chips gm-col">${f.opts.map(o => `<button type="button" class="gm-chip${sel.includes(o.id) ? " on" : ""}" data-a="multi" data-f="${f.id}" data-v="${o.id}">${o.ic} ${esc(o.t)}</button>`).join("")}</div>` +
      `<span class="gm-sub">${sel.length}개 선택</span><span class="gm-hn" data-hn="${f.id}">${hh}</span></div>`;
  }
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
function renderMission(id, rand) {
  const m = MSBY[id]; scr = "mis"; stopQ();
  cm = {m, v: {}, att: 0, hints: 0, hintLv: {}, hn: {}, wrongF: {}, hinted: {}, over: false, rand: rand || null, stage: rand ? "id" : "fill", idWrong: 0};
  if (rand) { S.lastRand = id; save(); }
  root.innerHTML = `<div class="gm">${topBar()}<div class="gm-bar"><button type="button" class="gm-back" data-a="home">← 현장 사무소</button><h3 id="gmTitle">${rand ? "🎲 갑자기 상황 발생!" : m.ic + " " + m.title}</h3></div>` +
    `<div class="gm-brief">${rand ? `<span class="gm-rtag">🎲 랜덤 상황</span>${m.sit || ""}` : m.brief}</div><div class="gm-stage"><svg class="gm-scene" id="gmSvg" viewBox="${m.vb}" role="img" aria-label="${rand ? "현장 그림" : esc(m.title) + " 현장 그림"}"></svg><button type="button" class="gm-skip" id="gmSkip" data-a="skip" hidden>⏩ 건너뛰기</button></div>` +
    `<div class="gm-say" id="gmSay"></div><div class="gm-form" id="gmForm"></div><button type="button" class="gm-go" id="gmGo" data-a="go">🏗️ 착공!</button><div id="gmRes"></div></div>`;
  svgEl = $("#gmSvg"); sayEl = $("#gmSay");
  drawScene(); renderForm(); say(rand ? "그림을 보고, 어떤 안전조치가 필요한 상황인지 먼저 떠올려 보세요." : "값을 입력하면 현장이 바로 바뀌어요.");
  window.scrollTo(0, 0);
}
/* 조문 보기: 공부 탭의 읽던 자리를 건드리지 않고, 게임 위에 창으로 띄운다 */
let artEl = null;
function closeArt() { if (artEl) { artEl.remove(); artEl = null; } }
function showArt(art) {
  const D = window.LAWDATA; if (!D) return;
  const m = /^(법|시행규칙|시행령) (제\d+조(?:의\d+)?)/.exec(art || ""), lid = m ? {"법": "law", "시행규칙": "rule", "시행령": "decree"}[m[1]] : "safety", no = m ? m[2] : String(art).replace(/ .*$/, "");
  const law = D.laws[lid], a = law && law.articles.find(x => x.no === no);
  if (!a) { host && host.toast("조문을 찾지 못했어요"); return; }
  closeArt();
  const body = a.lines.map(l => `<p style="margin:.35em 0;padding-left:${Math.min(3, +l[0] || 0) * 12}px">${esc(l[1])}</p>`).join("");
  artEl = document.createElement("div");
  artEl.className = "gm-modal";
  artEl.innerHTML = `<div class="gm-sheet" role="dialog" aria-label="조문"><div class="gm-shh"><b>${esc(law.short || law.name)} ${esc(a.no)}${a.title ? " · " + esc(a.title) : ""}</b><button type="button" class="gm-ib" data-a="artx" aria-label="닫기">✕</button></div>` +
    `<div class="gm-shb">${body}</div><div class="gm-btns"><button type="button" data-a="artx">닫고 계속하기</button><button type="button" data-a="readgo" data-art="${esc(art)}">공부 탭에서 열기 <small style="color:var(--sub)">(읽던 자리가 바뀌어요)</small></button></div></div>`;
  artEl.addEventListener("click", e => { if (e.target === artEl) closeArt(); else { const b = e.target.closest("[data-a]"); if (b) onClick({target: b}); } });
  document.body.appendChild(artEl);
}
function topicCheck(reveal) {
  if (!cm || cm.stage !== "id") return;
  const m = cm.m, inp = $("#gmTopic"), txt = reveal ? "" : (inp ? inp.value : "");
  const ok = reveal || hasKw(txt.toLowerCase(), (m.kw || []).map(k => k.toLowerCase()));
  if (!ok) {
    if (!String(txt).trim()) { host && host.toast("떠오르는 안전조치를 써 보세요"); return; }
    cm.idWrong++;
    const hn = $("#gmTopicHn"); if (hn) hn.innerHTML = `<div>🤔 아쉬워요. 그림과 상황을 다시 보세요.${cm.idWrong >= 2 ? " (한 번 더 틀리면 정답이 공개돼요)" : ""}</div>`;
    sfx.bad();
    if (cm.idWrong >= 3) topicCheck(true);
    return;
  }
  if (reveal) cm.hints++;
  cm.stage = "fill";
  const t = $("#gmTitle"); if (t) t.textContent = "🎲 " + m.ic + " " + m.name;
  sfx.ok(); say((reveal ? "정답: " : "✔ 맞아요! ") + m.name + " — 이제 기준을 직접 입력해 현장을 지키세요.");
  renderForm(); drawScene();
}
function drawScene(res) { if (!cm) return; svgEl.innerHTML = cm.m.mod.draw(cm.v, res); bind(svgEl); }
function renderForm() {
  if (!cm) return;
  const go = $("#gmGo");
  if (cm.stage === "id") {
    if (go) go.hidden = true;
    $("#gmForm").innerHTML = `<div class="gm-f gm-idc"><span class="gm-fl">🧠 이 상황에서 가장 필요한 안전조치는 무엇일까요?</span><span class="gm-fi" style="grid-column:1/-1"><input id="gmTopic" data-in="topic" autocomplete="off" placeholder="직접 떠올려 한두 낱말로 써 보세요"></span><div class="gm-btns" style="grid-column:1/-1"><button type="button" class="pri" data-a="topicgo">확인</button><button type="button" data-a="topicshow">모르겠어요 (정답 공개 −힌트)</button></div><span class="gm-hn" id="gmTopicHn"></span></div>`;
    return;
  }
  if (go) go.hidden = false;
  $("#gmForm").innerHTML = fieldsOf(cm.m, cm.v).map(f => fieldHTML(f, cm.v, cm.hn)).join("");
}
function readVals() {
  root.querySelectorAll("[data-in]").forEach(el => {
    const id = el.dataset.in, f = fieldsOf(cm.m, cm.v).find(x => x.id === id); if (!f) return;
    if (f.t === "num") { let n = num(el.value); if (f.int && Number.isFinite(n)) n = Math.round(n); cm.v[id] = n; } else cm.v[id] = el.value;
  });
}
async function launch() {
  if (busy || !cm || cm.stage === "id") return;
  readVals();
  const m = cm.m, fs = fieldsOf(m, cm.v);
  const miss = fs.filter(f => f.t === "num" ? !Number.isFinite(cm.v[f.id]) : f.t === "pick" ? !cm.v[f.id] : f.t === "seq" ? (cm.v[f.id] || []).length < f.items.length : f.t === "multi" ? !(cm.v[f.id] || []).length : !String(cm.v[f.id] || "").trim());
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
  h += pass ? (cm.rand ? `<button type="button" class="pri" data-a="rand" data-pack="${cm.rand}">🎲 다음 상황 ▶</button>` : nx ? `<button type="button" class="pri" data-a="mis" data-id="${nx.id}">다음 의뢰 ▶</button>` : `<button type="button" class="pri" data-a="home">현장 사무소로</button>`) : `<button type="button" class="pri" data-a="retry">🔁 다시 짓기</button>`;
  h += `<button type="button" data-a="read" data-art="${m.arts[0]}">📖 ${m.arts[0]} 보기</button>`;
  h += pass ? `<button type="button" data-a="retry">다시 해보기</button>` : `<button type="button" data-a="home">나가기</button>`;
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
  let h = topBar() + `<div class="gm-bar"><button type="button" class="gm-back" data-a="home">← 현장 사무소</button><h3>📕 사고 도감 ${Object.keys(S.dex).length}/${accN()}</h3></div><div class="gm-dex">`;
  Object.keys(ACC).forEach(id => {
    const a = ACC[id];
    h += S.dex[id] ? `<div class="gm-dc"><div class="ic">${a.ic}</div><b>${esc(a.n)}</b><div>${esc(a.tip)}</div><button type="button" data-a="read" data-art="${a.art}">📖 ${a.art}</button></div>` : `<div class="gm-dc lock"><div class="ic">❓</div><b>???</b><div>${a.art} 관련 사고</div></div>`;
  });
  root.innerHTML = `<div class="gm">${h}</div></div>`; window.scrollTo(0, 0);
}

/* ---------- 감독관 불시점검 / 재발 사고 ---------- */
let Q = null;
function stopQ() { if (Q && Q.tm) clearTimeout(Q.tm); Q = null; }
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
    frame(tick);
  };
  frame(tick);
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
  const q = Q; Q.done = true;
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
    case "rand": renderMission(pickRandom(t.dataset.pack).id, t.dataset.pack); break;
    case "topicgo": topicCheck(false); break;
    case "topicshow": topicCheck(true); break;
    case "fold": { const on = !openPacks[t.dataset.pack]; Object.keys(openPacks).forEach(k => { openPacks[k] = false; }); openPacks[t.dataset.pack] = on; renderHome(); break; }
    case "go": launch(); break;
    case "retry": retry(); break;
    case "skip": skip = true; break;
    case "dex": renderDex(); break;
    case "boss": startQ("boss"); break;
    case "redo": startQ("redo"); break;
    case "qok": { const i = $("#qIn"); answerQ(i ? i.value : ""); } break;
    case "qskip": answerQ(null, false); break;
    case "qnext": nextQ(); break;
    case "read": showArt(t.dataset.art); break;
    case "readgo": { const art = t.dataset.art; closeArt(); const m = /^(법|시행규칙|시행령) (제\d+조(?:의\d+)?)/.exec(art || ""); host && (m ? host.read(m[2], {"법": "law", "시행규칙": "rule", "시행령": "decree"}[m[1]]) : host.read(String(art).replace(/ .*$/, ""))); break; }
    case "artx": closeArt(); break;
    case "pick": {
      readVals(); cm.v[t.dataset.f] = t.dataset.v;
      renderForm(); drawScene(); break;
    }
    case "seqadd": { cm.v[t.dataset.f] = (cm.v[t.dataset.f] || []).concat(t.dataset.v); renderForm(); drawScene(); break; }
    case "seqclr": { cm.v[t.dataset.f] = []; renderForm(); drawScene(); break; }
    case "multi": { const a = (cm.v[t.dataset.f] || []).slice(), i = a.indexOf(t.dataset.v); if (i >= 0) a.splice(i, 1); else a.push(t.dataset.v); cm.v[t.dataset.f] = a; renderForm(); drawScene(); break; }
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
  else if (scr === "mis" && e.target.id === "gmTopic") { e.preventDefault(); topicCheck(false); }
  else if (scr === "mis" && e.target.matches("input[data-in]") && !busy) {
    e.preventDefault();
    const ins = [...root.querySelectorAll("input[data-in]")], i = ins.indexOf(e.target);
    if (i >= 0 && i < ins.length - 1) ins[i + 1].focus(); else { e.target.blur(); launch(); }
  }
}

/* =============== 자동 의뢰: 데이터(game_auto.js)만으로 만드는 의뢰 ===============
   window.SAPGAME_AUTO = [ 의뢰 정의, … ], window.SAPGAME_PACKS = [{id, n, ic}, …]
   의뢰 정의: {id, pack, ic, title, sub, sit, name, kw[], arts[], scene:{bg, props[], hazard}, lessons[], acc:{사고id:{n,ic,art,tip}},
     fields:[ {t:"num", label, unit, a, dir, acc, art, cl, law, q}
            | {t:"pick", label, opts:[{id,ic,t}], ok:[id…], acc, hints}
            | {t:"multi", label, opts:[{id,ic,t,ok,acc,art}], hints}
            | {t:"seq", label, items:[{id,t}], swap:[i,j]?, acc, hints}
            | {t:"kw", label, slots:[{lab, kw:[…], acc}], hints} ] }  */
const cmpN = (x, a, d) => d === "min" ? x >= a : d === "max" ? x <= a : d === "gt" ? x > a : d === "lt" ? x < a : x === a;
function autoMod(def) {
  const fid = i => "x_" + def.id + "_" + i;
  def.fields.forEach((f, i) => {
    if (f.t === "num") F[fid(i)] = {id: fid(i), t: "n", art: f.art || (def.arts || [""])[0], cl: f.cl || "", q: f.q || f.label, a: f.a, u: f.unit || "", dir: f.dir || "eq", sum: f.law || def.name};
  });
  const SC = def.scene || {};
  return {
    fields() {
      return def.fields.map((f, i) => {
        const id = "f" + i;
        if (f.t === "num") return {id, t: "num", label: f.label, unit: f.unit || "", ph: f.ph || "몇?", fact: fid(i)};
        if (f.t === "pick") return {id, t: "pick", label: f.label, opts: f.opts, hints: f.hints};
        if (f.t === "multi") return {id, t: "multi", label: f.label, opts: f.opts, need: f.opts.filter(o => o.ok).length, hints: f.hints};
        if (f.t === "seq") return {id, t: "seq", label: f.label, items: f.items, hints: f.hints};
        return {id, t: "kw", label: f.label, slots: f.slots.length, ph: f.ph || "직접 써 보세요", hints: f.hints};
      });
    },
    draw(v) {
      let s = (SC.bg === "indoor" || SC.bg === "factory") ? rc("g-in", 0, 0, 360, 240) + rc("g-conc", 0, 196, 360, 44) : rc("g-sky", 0, 0, 360, 240) + rc("g-grnd", 0, 196, 360, 44);
      const props = SC.props || [];
      props.slice(0, 4).forEach((p, i) => { s += `<text x="${168 + i * 46}" y="104" font-size="30" text-anchor="middle" opacity=".92">${p}</text>`; });   // 위쪽 줄에 두어 작업자·위험물과 겹치지 않게
      s += `<ellipse cx="290" cy="196" rx="34" ry="6" fill="#000" opacity=".12"/><text data-r="hz" x="290" y="192" text-anchor="middle" font-size="60">${SC.hazard || "⚠️"}</text>`;
      s += wkr("w1", 70, 196, 78);
      let y = 20;
      def.fields.forEach((f, i) => {
        const x = v["f" + i]; let txt = "";
        if (f.t === "num") txt = Number.isFinite(x) ? `${f.label.slice(0, 16)}: ${fmt(x)}${f.unit || ""}` : "";
        else if (f.t === "multi") txt = (x || []).length ? `고른 것 ${(x || []).length}개` : "";
        else if (f.t === "seq") txt = (x || []).length ? `순서 ${(x || []).length}/${f.items.length}` : "";
        else if (f.t === "pick") { const o = f.opts.find(z => z.id === x); txt = o ? `${o.ic || ""} ${o.t}`.slice(0, 22) : ""; }
        else txt = String(x || "").trim() ? "답 입력함" : "";
        if (txt) { s += `<text x="12" y="${y}" class="g-tag">${esc(txt)}</text>`; y += 14; }
      });
      return s;
    },
    eval(v) {
      const c = [];
      def.fields.forEach((f, i) => {
        const id = "f" + i, x = v[id];
        if (f.t === "num") {
          const ok = cmpN(x, f.a, f.dir || "eq"), up = (f.dir === "min" || f.dir === "gt") || (f.dir === "eq" && x < f.a);
          c.push(ck(fid(i), f.label, ok, {dir: ok ? null : up ? "up" : "down", val: fmt(x) + (f.unit || ""), need: fmt(f.a) + (f.unit || "") + (DIRT[f.dir] ? " " + DIRT[f.dir] : ""), acc: ok ? null : f.acc}));
        } else if (f.t === "pick") {
          const ok = f.ok.includes(x);
          c.push(ck(null, f.label.slice(0, 22) + "…", ok, {noSrs: true, dtxt: "✘ 맞는 선택이 아니에요", val: (f.opts.find(o => o.id === x) || {}).t, need: f.ok.map(k => (f.opts.find(o => o.id === k) || {}).t).join(" 또는 "), acc: ok ? null : f.acc}));
        } else if (f.t === "multi") {
          const sel = x || [];
          f.opts.filter(o => o.ok).forEach(o => { const has = sel.includes(o.id); c.push(ck(null, o.t, has, {noSrs: true, dtxt: "✘ 빠졌어요", val: has ? "함" : "빠짐", need: "해야 해요" + (o.art ? " (" + o.art + ")" : ""), acc: has ? null : o.acc || f.acc})); });
          f.opts.filter(o => !o.ok).forEach(o => { if (sel.includes(o.id)) c.push(ck(null, o.t, false, {noSrs: true, dtxt: "✘ 위험한 선택이에요", val: "선택함", need: "하면 안 돼요" + (o.art ? " (" + o.art + ")" : ""), acc: o.acc || f.acc})); });
        } else if (f.t === "seq") {
          const seq = x || [], sw = f.swap || [];
          const okAt = (k, idc) => idc === f.items[k].id || (sw.length === 2 && sw.includes(k) && idc === f.items[sw[0] === k ? sw[1] : sw[0]].id);
          seq.forEach((idc, k) => { const it = f.items.find(z => z.id === idc); c.push(ck(null, `${k + 1}번째: ${it.t}`, okAt(k, idc), {noSrs: true, dtxt: "✘ 이 자리가 아니에요", val: "", need: ""})); });
          const ok = seq.every((idc, k) => okAt(k, idc));
          c.push(ck(null, "순서", ok, {noSrs: true, acc: ok ? null : f.acc, dtxt: "✘ 순서가 달라요", val: ok ? "맞아요" : "달라요", need: f.items.map(z => z.t).join(" → ")}));
        } else {
          const t = x || "";
          f.slots.forEach(sl => { const ok = hasKw(t, sl.kw); c.push(ck(null, sl.lab, ok, {noSrs: true, dtxt: "✘ 빠졌어요", val: ok ? "있음" : "빠짐", need: sl.need || sl.lab, acc: ok ? null : sl.acc || f.acc})); });
        }
      });
      return c;
    },
    async play(svg, v, res) {
      const w = R(svg, "w1"), hz = R(svg, "hz");
      say("상황이 시작됩니다…");
      await walk(w, 70, 190, 196, 900);
      const bad = res.find(c => !c.ok && c.acc && ACC[c.acc]);
      if (bad) {
        sfx.bad();
        await tw(500, t => hz.setAttribute("font-size", 60 + 36 * Math.sin(t * Math.PI)));
        hurt(w); shake(); sfx.thud(); pop(svg, 200, 120, "쿵!");
        await tw(450, t => setT(w, 190, 196, 80 * t));
        say("💥 " + ACC[bad.acc].n + " — " + ACC[bad.acc].tip);
      } else if (!allOk(res)) generic(svg, res);
      else { sfx.ok(); pop(svg, 200, 120, "✔ 안전!", "#12a37f"); say("🟢 " + (def.okMsg || "기준을 정확히 지켜 안전하게 마쳤습니다.")); }
    },
  };
}
const AUTO_ST = {loaded: false, cb: []};
function integrateAuto() {
  if (AUTO_ST.done) return; AUTO_ST.done = true;
  (window.SAPGAME_PACKS || []).forEach(p => { if (!PACKS.some(x => x.id === p.id)) PACKS.push(p); });
  (window.SAPGAME_AUTO || []).forEach(def => {
    if (MSBY[def.id]) return;
    try {
      Object.assign(ACC, def.acc || {});
      const m = {id: def.id, pack: def.pack, ic: def.ic || "📌", title: def.title, sub: def.sub || "", vb: "0 0 360 240", mod: autoMod(def), arts: def.arts || [], brief: def.brief || def.sit,
        sit: def.sit, name: def.name, kw: def.kw || [], lessons: def.lessons || []};
      MS.push(m); MSBY[m.id] = m;
    } catch (e) { console.error("auto mission", def && def.id, e); }
  });
}
function loadAuto(cb) {
  if (window.SAPGAME_AUTO !== undefined || AUTO_ST.tried) { integrateAuto(); cb(); return; }
  AUTO_ST.tried = true;
  const sc = document.createElement("script");
  sc.src = (window.SAPGAME_AUTO_SRC || "game_auto.js") + "?v=" + (window.SAPGAME_VER || "1");
  sc.onload = () => { integrateAuto(); cb(); };
  sc.onerror = () => { cb(); };   // 없으면 기본 의뢰만
  document.head.appendChild(sc);
}

/* =============== 붙이기 · 떼기 =============== */
window.SAPGAME = {
  mount(el, h) {
    root = el; host = h; alive = true; busy = false; skip = false;
    if (!document.getElementById("gmCss")) { const st = document.createElement("style"); st.id = "gmCss"; st.textContent = CSS; document.head.appendChild(st); }
    root.addEventListener("click", onClick); root.addEventListener("input", onInput); root.addEventListener("keydown", onKey);
    S = loadS(); theme();
    root.innerHTML = '<div class="gm"><div class="gm-note">불러오는 중…</div></div>';
    loadAuto(() => { if (alive && root) renderHome(); });
  },
  unmount() {
    alive = false; stopQ(); closeArt();
    if (root) { root.removeEventListener("click", onClick); root.removeEventListener("input", onInput); root.removeEventListener("keydown", onKey); root.innerHTML = ""; }
    root = null; cm = null; svgEl = null; sayEl = null;
  },
  _t: {F, MS, ACC, NF, TF, M1, M2, M3, M4, M5, get S() { return S; }},
};
})();
