'use strict';
// =====================================================================
//  게임 데이터
// =====================================================================
const GENS = [
  { name: '브론즈 드로퍼', cost: 15, inc: 1, color: 0xd08a4a, css: '#d08a4a' },
  { name: '실버 드로퍼', cost: 200, inc: 5, color: 0xc9d3e6, css: '#c9d3e6' },
  { name: '골드 드로퍼', cost: 3000, inc: 28, color: 0xffcf3f, css: '#ffcf3f' },
  { name: '루비 제련기', cost: 50000, inc: 160, color: 0xff4d6d, css: '#ff4d6d' },
  { name: '사파이어 공장', cost: 9e5, inc: 900, color: 0x3d8bff, css: '#3d8bff' },
  { name: '에메랄드 반응로', cost: 1.8e7, inc: 5000, color: 0x2ee59d, css: '#2ee59d' },
  { name: '다이아 코어', cost: 4e8, inc: 28000, color: 0x9ff3ff, css: '#9ff3ff' },
  { name: '차원 포탈', cost: 1e10, inc: 160000, color: 0xc77dff, css: '#c77dff' },
];
const GEN_GROWTH = 1.15;
// 10, 25, 50, 75, 100 이후 50레벨마다 끝없이 2배
function milestoneCount(l) {
  let n = 0;
  for (const m of [10, 25, 50, 75, 100]) if (l >= m) n++;
  if (l >= 150) n += Math.floor((l - 100) / 50);
  return n;
}
function nextMilestoneOf(l) {
  for (const m of [10, 25, 50, 75, 100]) if (l < m) return m;
  return 100 + 50 * (Math.floor((l - 100) / 50) + 1);
}

const UPGS = [
  { key: 'click', name: '채굴 파워', desc: '클릭당 기본 채굴량 +1, 10레벨마다 2배', max: 500, cost: (l) => 25 * Math.pow(1.42, l), keep: false, css: '#5ab8ff', ico: '+1' },
  { key: 'auto', name: '자동 채굴기', desc: '1초에 0.5번씩 자동으로 채굴', max: 10, cost: (l) => 600 * Math.pow(3.4, l), keep: false, css: '#9ff3ff', ico: 'A' },
  { key: 'gold', name: '황금 손길', desc: '채굴 1번에 초당 수입의 2%를 더함', max: 10, cost: (l) => 12000 * Math.pow(4.5, l), keep: false, css: '#ffcf3f', ico: '%' },
  { key: 'speed', name: '신속의 신발', desc: '이동 속도 +7% (환생해도 유지)', max: 8, cost: (l) => 300 * Math.pow(3.5, l), keep: true, css: '#3ee6a5', ico: '»' },
  { key: 'jump', name: '용수철 다리', desc: '점프 높이 +5% (환생해도 유지)', max: 6, cost: (l) => 900 * Math.pow(3.8, l), keep: true, css: '#ff8fab', ico: '↑' },
  { key: 'dbl', name: '더블 점프', desc: '공중에서 한 번 더 점프 (환생해도 유지)', max: 1, cost: () => 15000, keep: true, css: '#c77dff', ico: '⇈' },
  { key: 'offline', name: '방치 효율', desc: '접속하지 않은 동안 수입 +10% (기본 30%)', max: 7, cost: (l) => 5000 * Math.pow(5.5, l), keep: true, css: '#ffa45c', ico: 'Z' },
];

// 환생 상점 (환생 포인트로 구매, 영구)
const RUPGS = [
  { key: 'mult', name: '천상의 축복', desc: '전체 수입 +25%', max: Infinity, cost: (l) => Math.ceil(2 * Math.pow(1.3, l)), css: '#ffcf3f', ico: 'x' },
  { key: 'click', name: '숙련된 손', desc: '채굴량 +100%', max: Infinity, cost: (l) => Math.ceil(2 * Math.pow(1.45, l)), css: '#5ab8ff', ico: '+' },
  { key: 'disc', name: '건축 할인', desc: '드로퍼 가격 -4%', max: 20, cost: (l) => Math.ceil(2 * Math.pow(1.5, l)), css: '#3ee6a5', ico: '-' },
  { key: 'start', name: '출발 자금', desc: '환생 직후 코인을 받고 시작', max: 10, cost: (l) => Math.ceil(Math.pow(2, l)), css: '#ffd166', ico: '$' },
  { key: 'keep', name: '기계의 기억', desc: '환생해도 자동 채굴기·황금 손길 유지', max: 1, cost: () => 15, css: '#9ff3ff', ico: 'M' },
  { key: 'luck', name: '행운의 별', desc: '황금 별똥별 출현 +15%, 효과 시간 +10%', max: 10, cost: (l) => Math.ceil(3 * Math.pow(1.7, l)), css: '#ffa800', ico: '★' },
  { key: 'rest', name: '긴 휴식', desc: '방치 보상 최대 시간 +2시간 (기본 8시간)', max: 8, cost: (l) => Math.ceil(2 * Math.pow(1.6, l)), css: '#ffa45c', ico: 'Z' },
  { key: 'gain', name: '윤회의 지혜', desc: '환생할 때 받는 레벨 +10%', max: Infinity, cost: (l) => Math.ceil(5 * Math.pow(1.45, l)), css: '#c77dff', ico: '∞' },
  { key: 'gem', name: '보석 감각', desc: '모든 보석 획득량 +10%', max: Infinity, cost: (l) => Math.ceil(4 * Math.pow(1.4, l)), css: '#7af0ff', ico: '◆' },
];

const ZONES = [
  { id: 1, name: '초원 섬', course: '초원 코스', dir: [0, -1], cost: 0, bonus: 0.2, reward: 200, css: '#7ccf6b', hex: 0x7ccf6b },
  { id: 2, name: '용암 섬', course: '용암 코스', dir: [1, 0], cost: 1500, bonus: 0.3, reward: 5000, css: '#ff6a3d', hex: 0xff6a3d },
  { id: 3, name: '얼음 섬', course: '얼음 코스', dir: [0, 1], cost: 1e6, bonus: 0.4, reward: 2e6, css: '#7fd4ff', hex: 0x7fd4ff },
  { id: 4, name: '구름 탑', course: '구름 탑 등반', dir: [-1, 0], cost: 1e9, bonus: 0.6, reward: 2e9, css: '#c3a6ff', hex: 0xc3a6ff },
  { id: 5, name: '별빛 섬', course: '별빛 코스', sky: true, cost: 1e12, bonus: 1.0, reward: 2e12, css: '#ffd166', hex: 0xffd166 },
];
const zoneById = (id) => ZONES[id - 1];

// 메달 기준 시간 (초) — 봇 주행 기록으로 맞춤
const MEDAL_NAMES = ['브론즈', '실버', '골드', '플래티넘'];
const MEDAL_CSS = ['#d08a4a', '#c9d3e6', '#ffcf3f', '#9ff3ff'];
const MEDAL_GEMS = [5, 10, 20, 40];
const MEDALS = { 1: [55, 38, 27, 22], 2: [90, 63, 45, 36], 3: [80, 55, 40, 32], 4: [95, 67, 48, 39], 5: [110, 78, 56, 45] };

// 꾸미기
const SHIRTS = [
  { id: 'blue', name: '하늘 파랑', c: 0x4f7cff, cost: 0 },
  { id: 'red', name: '불꽃 빨강', c: 0xff5a5f, cost: 15 },
  { id: 'mint', name: '민트', c: 0x2ee59d, cost: 15 },
  { id: 'pink', name: '벚꽃 분홍', c: 0xff8fab, cost: 15 },
  { id: 'purple', name: '보랏빛', c: 0x9b5de5, cost: 25 },
  { id: 'black', name: '밤하늘', c: 0x2b2d42, cost: 30 },
  { id: 'white', name: '구름 하양', c: 0xf1f5ff, cost: 30 },
  { id: 'gold', name: '황금 갑옷', c: 0xffcf3f, cost: 80 },
];
const HATS = [
  { id: 'cap', name: '빨간 모자', cost: 0 },
  { id: 'none', name: '맨머리', cost: 0 },
  { id: 'wizard', name: '마법사 모자', cost: 60 },
  { id: 'horn', name: '유니콘 뿔', cost: 90 },
  { id: 'crown', name: '왕관', cost: 140 },
  { id: 'halo', name: '천사 고리', cost: 200 },
];
const TRAILS = [
  { id: 'none', name: '없음', cost: 0, cols: null },
  { id: 'spark', name: '반짝이', cost: 40, cols: [0xffffff, 0x9ff3ff] },
  { id: 'fire', name: '불꽃', cost: 90, cols: [0xff5a1f, 0xffcf3f, 0xff8f3f] },
  { id: 'rainbow', name: '무지개', cost: 130, cols: [0xff5a5f, 0xffcf3f, 0x3ee6a5, 0x5ab8ff, 0xc77dff] },
  { id: 'star', name: '별가루', cost: 180, cols: [0xffd23f, 0xfff3b0] },
];

// =====================================================================
//  펫 · 알 · 도감 (과자 브레인랏 펫, 데이터)
// =====================================================================
const RAR = [
  { name: '노말', css: '#c4ccdf', hex: 0xc4ccdf },
  { name: '희귀', css: '#5ee08a', hex: 0x5ee08a },
  { name: '레어', css: '#5ab8ff', hex: 0x5ab8ff },
  { name: '유니크', css: '#c77dff', hex: 0xc77dff },
  { name: '신화', css: '#ff5d8f', hex: 0xff5d8f },
  { name: '전설', css: '#ffcf3f', hex: 0xffcf3f },
  { name: '아우라', css: '#7af0ff', hex: 0x7af0ff },
];
// 등급별 효과 크기 (노말 → 아우라). 펫의 st 가중치를 곱해요. 점프·속도는 장착한 펫 합계에 상한이 있어요
const PSTAT = {
  coin: { name: '코인', vals: [0.15, 0.3, 0.6, 1.2, 2.5, 5, 12] },
  gem: { name: '보석', vals: [0.03, 0.06, 0.1, 0.16, 0.25, 0.4, 0.7] },
  dmg: { name: '무기 피해', vals: [0.1, 0.2, 0.35, 0.6, 1, 1.6, 3] },
  hp: { name: '체력', vals: [0.15, 0.3, 0.5, 0.9, 1.5, 2.5, 5] },
  jump: { name: '점프력', vals: [0.01, 0.015, 0.02, 0.03, 0.04, 0.05, 0.06], move: true, cap: 0.12 },
  speed: { name: '이동 속도', vals: [0.02, 0.03, 0.05, 0.07, 0.09, 0.12, 0.15], move: true, cap: 0.3 },
};
// 같은 펫 5마리 → 황금 1마리, 황금 5마리 → 무지개 1마리
const PVAR = [
  { name: '', mult: 1, mmult: 1 },
  { name: '황금', mult: 2, mmult: 1.25, css: '#ffcf3f' },
  { name: '무지개', mult: 4, mmult: 1.5, css: '#ff9be0' },
];
const FUSE_N = 5;
// 알: 비쌀수록 높은 등급이 잘 나와요. 아우라는 오로라 알(합계 0.1%)과 아우라 알(각 3%)에서
// mix 알은 펫을 따로 갖지 않고 모든 펫에서 뽑아요 (eggPets 참고)
const EGGS = [
  { id: 'cookie', name: '쿠키 알', cost: 1e8, c1: '#ffe7c2', c2: '#d9a066', hex: 0xf0c890, spot: 0x6b4029 },
  { id: 'macaron', name: '마카롱 알', cost: 1e10, c1: '#ffd6ea', c2: '#ff8fbf', hex: 0xffb3d6, spot: 0xffffff },
  { id: 'cake', name: '케이크 알', cost: 1e12, c1: '#fff8ef', c2: '#ffb0c4', hex: 0xfff1e6, spot: 0xff3b4f },
  { id: 'star', name: '별사탕 알', cost: 1e13, c1: '#e9e0ff', c2: '#9b8cff', hex: 0xc8bcff, spot: 0xffe066 },
  { id: 'aurora', name: '오로라 알', cost: 1e14, c1: '#9ff3ff', c2: '#ff9be0', hex: 0xd8f6ff, spot: 0xffffff, aura: true },
  { id: 'aura', name: '아우라 알', cost: 1e16, c1: '#fff3b0', c2: '#7af0ff', hex: 0xfff1c4, spot: 0xffd166, aura: true, mix: { auraPct: 3 } },
];
// rar: RAR 번호, egg: EGGS 번호, pct: 그 알에서 나올 확률(%), st: 효과 가중치
const PETS = [
  { id: 'biscat', name: '비스코티노 가티노', what: '초코칩 쿠키 고양이', rar: 0, egg: 0, pct: 26, st: { coin: 1 } },
  { id: 'pulcino', name: '풀치노 파니노', what: '빵 속에 숨은 병아리', rar: 0, egg: 0, pct: 22, st: { speed: 1 } },
  { id: 'criceto', name: '크리체티노 도라야키노', what: '도라야키 햄스터', rar: 0, egg: 0, pct: 15, st: { gem: 1 } },
  { id: 'topino', name: '토피노 크래커리노', what: '크래커 생쥐', rar: 0, egg: 0, pct: 12, st: { dmg: 1 } },
  { id: 'riccio', name: '리체토 프레첼리노', what: '프레첼 고슴도치', rar: 1, egg: 0, pct: 12, st: { coin: 1 } },
  { id: 'lumaca', name: '루마키노 마카롱치노', what: '마카롱 껍데기 달팽이', rar: 1, egg: 0, pct: 10, st: { hp: 1 } },
  { id: 'porcino', name: '포르첼리노 부디노', what: '캐러멜 푸딩 돼지', rar: 2, egg: 0, pct: 3, st: { gem: 1 } },

  { id: 'coniglio', name: '코닐리노 참벨리노', what: '도넛 튜브를 낀 토끼', rar: 0, egg: 1, pct: 22, st: { jump: 1 } },
  { id: 'pecora', name: '페코렐라 마시멜리나', what: '마시멜로 양', rar: 0, egg: 1, pct: 20, st: { hp: 1 } },
  { id: 'anatra', name: '아나트리노 코르네티노', what: '크루아상 오리', rar: 1, egg: 1, pct: 20, st: { dmg: 1 } },
  { id: 'cagnolino', name: '카뇰리노 추리노', what: '추로스 닥스훈트', rar: 1, egg: 1, pct: 16, st: { speed: 1 } },
  { id: 'pinguino', name: '핑귀노 젤라티노', what: '아이스크림콘 펭귄', rar: 2, egg: 1, pct: 10, st: { coin: 1, speed: 0.5 } },
  { id: 'panda', name: '판디노 모치노', what: '찹쌀떡 판다', rar: 2, egg: 1, pct: 8, st: { hp: 1, coin: 0.5 } },
  { id: 'orsetto', name: '오르세토 와플레토', what: '와플 곰', rar: 3, egg: 1, pct: 4, st: { coin: 1, hp: 0.6 } },

  { id: 'polpo', name: '폴피노 레칼리노', what: '막대사탕 문어', rar: 1, egg: 2, pct: 26, st: { gem: 1 } },
  { id: 'scoiattolo', name: '스코이아톨리노 마로니노', what: '밤 다람쥐', rar: 1, egg: 2, pct: 22, st: { jump: 1, gem: 0.5 } },
  { id: 'granchio', name: '그란키에토 크로스타티노', what: '과일 타르트 게', rar: 2, egg: 2, pct: 20, st: { dmg: 1 } },
  { id: 'pesce', name: '페시올리노 붕어빠니노', what: '붕어빵 물고기', rar: 2, egg: 2, pct: 15, st: { coin: 1 }, fly: true },
  { id: 'tartaruga', name: '타르타루기노 토르티노', what: '딸기 케이크 거북', rar: 3, egg: 2, pct: 8, st: { hp: 1, coin: 0.6 } },
  { id: 'fenicottero', name: '페니코테로 프라골리노', what: '딸기 홍학', rar: 3, egg: 2, pct: 6, st: { gem: 1, speed: 0.6 } },
  { id: 'gufo', name: '구페토 칸놀레토', what: '칸놀리 부엉이', rar: 4, egg: 2, pct: 3, st: { dmg: 1, jump: 0.6 }, fly: true, size: 1.1 },

  { id: 'ape', name: '아페타 티라미세타', what: '티라미수 꿀벌', rar: 2, egg: 3, pct: 28, st: { coin: 1, gem: 0.5 }, fly: true },
  { id: 'lontra', name: '론트리나 비스코티나', what: '쿠키 든 수달', rar: 2, egg: 3, pct: 22, st: { gem: 1, hp: 0.5 } },
  { id: 'volpe', name: '볼피노 스폴리아티노', what: '조개 파이 꼬리 여우', rar: 3, egg: 3, pct: 20, st: { speed: 1, dmg: 0.7 } },
  { id: 'cervo', name: '체르비노 코네티노', what: '아이스크림 뿔 사슴', rar: 3, egg: 3, pct: 16, st: { jump: 1, coin: 0.6 } },
  { id: 'pavone', name: '파본치노 메린기노', what: '머랭 꼬리 공작', rar: 4, egg: 3, pct: 12, st: { gem: 1, coin: 0.6 }, size: 1.1 },
  { id: 'unicorno', name: '유니코르니노 찰디노', what: '웨이퍼 유니콘', rar: 5, egg: 3, pct: 1.2, st: { coin: 1, dmg: 0.6, jump: 0.6 }, size: 1.25 },
  { id: 'drago', name: '드라게토 단고니노', what: '경단 꼬치 용', rar: 5, egg: 3, pct: 0.8, st: { dmg: 1, coin: 0.6, hp: 0.6 }, fly: true, size: 1.25 },

  { id: 'delfino', name: '델피네토 파네토니노', what: '파네토네 돌고래', rar: 3, egg: 4, pct: 30, st: { hp: 1, gem: 0.6 }, fly: true },
  { id: 'axolotl', name: '아솔로티노 주케리노', what: '솜사탕 우파루파', rar: 3, egg: 4, pct: 28, st: { coin: 1, gem: 0.6 } },
  { id: 'koala', name: '코알리노 초콜라티노', what: '초콜릿 코알라', rar: 4, egg: 4, pct: 18, st: { dmg: 1, hp: 0.6 }, size: 1.1 },
  { id: 'bradipo', name: '브라디피노 바움쿠케노', what: '바움쿠헨 나무늘보', rar: 4, egg: 4, pct: 15.4, st: { hp: 1, coin: 0.6 }, size: 1.1 },
  { id: 'leone', name: '레온치노 비녜토', what: '슈크림 갈기 사자', rar: 5, egg: 4, pct: 5, st: { coin: 1, dmg: 0.8, hp: 0.6 }, size: 1.25 },
  { id: 'lupo', name: '루피노 루나케이코', what: '월병 늑대', rar: 5, egg: 4, pct: 3.5, st: { dmg: 1, speed: 0.7, gem: 0.5 }, size: 1.25 },
  { id: 'king', name: '레 찰도네', what: '웨이퍼 대왕', rar: 6, egg: 4, pct: 0.05, st: { coin: 1, gem: 1, jump: 1 }, size: 1.45, aura: 'king',
    special: '잭팟: 직접 채굴할 때 2% 확률로 초당 수입 30초치를 더 받아요 · 황금 별똥별이 2배 자주 떨어져요' },
  { id: 'phoenix', name: '페니치노 카라멜리노', what: '캐러멜 불사조', rar: 6, egg: 4, pct: 0.03, st: { dmg: 1, hp: 1, speed: 1 }, fly: true, size: 1.4, aura: 'phoenix',
    special: '불사조의 가호: 쓰러지면 체력을 모두 채우고 다시 일어나요 (90초마다) · 공격할 때 35% 확률로 주변에 화염 폭발' },
  { id: 'whale', name: '발레노네 스텔로네', what: '별사탕 고래', rar: 6, egg: 4, pct: 0.02, st: { coin: 0.8, gem: 1, speed: 1 }, fly: true, size: 1.5, aura: 'whale',
    special: '별빛 유영: 공중 점프 +1 · 방치 보상 최대 시간 2배' },
];
// 도감 보상 (등록한 종 수 기준). 종마다 영구 수입 +3%, 황금 +2%, 무지개 +3%
const DEX_MS = [
  { n: 3, gems: 15, txt: '보석 15' },
  { n: 6, slot: 1, txt: '펫 칸 +1' },
  { n: 10, gems: 40, x10: true, txt: '10·50개 뽑기 · 보석 40' },
  { n: 14, slot: 1, txt: '펫 칸 +1' },
  { n: 22, slot: 1, gems: 150, txt: '펫 칸 +1 · 보석 150' },
  { n: 30, slot: 1, gems: 300, txt: '펫 칸 +1 · 보석 300' },
  { n: 37, gems: 1000, txt: '보석 1000 · 모든 펫 수집' },
];
// 예전 도감 보상 목록 (저장된 ms 번호를 받은 종 수로 바꿀 때만 씀)
const DEX_MS_V1 = [3, 6, 10, 14, 19, 22];

// =====================================================================
//  상태
// =====================================================================
const SAVE_KEY = 'skyIslandJumpTycoon_v1';
function defaultState() {
  return {
    v: 2, coins: 0, runEarned: 0, lifeEarned: 0,
    gens: GENS.map(() => 0), awk: GENS.map(() => 0),
    up: { click: 0, auto: 0, gold: 0, speed: 0, jump: 0, dbl: 0, offline: 0 },
    rup: Object.fromEntries(RUPGS.map((u) => [u.key, 0])),
    rlv: 0, rp: 0, rebirths: 0, bestRun: 0,
    gems: 0, gemsTotal: 0, boostEnd: 0,
    zones: { 1: true }, launch: false,
    courses: {}, medals: {},
    tower: { best: 0 },
    daily: { key: '', best: 0, streak: 0, lastKey: '', bestStreak: 0, clears: 0 },
    ach: {}, goldCaught: 0,
    combat: { owned: ['stick'], equip: 'stick', mastery: 0, vital: 0, kills: 0, bossKills: 0 }, raid: {},
    skin: { shirt: 'blue', hat: 'cap', trail: 'none', owned: ['blue', 'cap', 'none'] },
    pets: { inv: {}, eq: [], dex: {}, hatched: 0, msN: 0 },
    stars: [], quest: 0, clicks: 0, deaths: 0, play: 0,
    t: Date.now(), created: Date.now(), welcomed: false, seenV2: true, seenV3: true, seenV4: true,
    mute: false, sens: 1, gfx: 0, gfxLv: 0,
  };
}
let S = defaultState();

// 일시 버프 (저장하지 않음)
const buffs = []; // { kind, mult, end, label }
function buffMult(kind) { let m = 1; const now = performance.now(); for (const b of buffs) if (b.kind === kind && b.end > now) m *= b.mult; return m; }

// =====================================================================
//  경제 계산
// =====================================================================
function genMult(i) { return Math.pow(2, milestoneCount(S.gens[i])) * Math.pow(3, S.awk[i] || 0); }
function nextMilestone(i) { return nextMilestoneOf(S.gens[i]); }
function courseBonus() { let b = 0; for (const z of ZONES) if (S.courses[z.id] && S.courses[z.id].clears > 0) b += z.bonus; return b; }
function starCount() { return S.stars.length; }
function medalCount() { let n = 0; for (const k in S.medals) n += S.medals[k] || 0; return n; }
function achTiers() { let n = 0; for (const k in S.ach) n += S.ach[k] || 0; return n; }
function boostActive() { return Date.now() < (S.boostEnd || 0); }
// 영구 배율 (버프 제외)
function permMult() {
  return (1 + courseBonus()) * (1 + 0.04 * starCount()) * (1 + 0.05 * S.rlv) * (1 + 0.25 * (S.rup.mult || 0)) *
    (1 + 0.02 * achTiers()) * (1 + 0.03 * medalCount()) * (1 + 0.01 * Math.min(S.tower.best, 500)) *
    (1 + PS.coin) * dexMult();
}
function globalMult() { return permMult() * (boostActive() ? 2 : 1) * buffMult('income'); }
function genIncome(i) { return GENS[i].inc * S.gens[i] * genMult(i); }
function rawGenCps() { let s = 0; for (let i = 0; i < GENS.length; i++) s += genIncome(i); return s; }
function baseCps() { return rawGenCps() * globalMult(); }
function clickValueWith(m) {
  const base = (1 + S.up.click) * Math.pow(2, Math.floor(S.up.click / 10)) * (1 + (S.rup.click || 0));
  return base * m + rawGenCps() * m * 0.02 * S.up.gold;
}
function clickValue() { return clickValueWith(globalMult()) * buffMult('click'); }
function autoRate() { return S.up.auto * 0.5; }
function totalCps() { return baseCps() + autoRate() * clickValue(); }
function offlineCps() { const m = permMult(); return rawGenCps() * m + autoRate() * clickValueWith(m); }

function discount() { return Math.pow(0.96, S.rup.disc || 0); }
function genCost(i, n = 1) {
  const b = GENS[i].cost * Math.pow(GEN_GROWTH, S.gens[i]) * discount();
  return b * (Math.pow(GEN_GROWTH, n) - 1) / (GEN_GROWTH - 1);
}
function genMaxAfford(i) {
  const b = GENS[i].cost * Math.pow(GEN_GROWTH, S.gens[i]) * discount();
  return Math.max(0, Math.floor(Math.log(S.coins * (GEN_GROWTH - 1) / b + 1) / Math.log(GEN_GROWTH)));
}
function genUnlocked(i) { return i === 0 || S.gens[i - 1] > 0 || S.gens[i] > 0; }
function upgCost(u) { return u.cost(S.up[u.key]); }
function zoneCost(z) { return z.cost; }
function awkCost(i) { const a = S.awk[i] || 0; return Math.ceil(12 * Math.pow(2.1, a) * (1 + 0.3 * i)); }
function awkReq(i) { return 25 * ((S.awk[i] || 0) + 1); }

function earn(a) {
  if (!(a > 0)) return;
  S.coins += a; S.runEarned += a; S.lifeEarned += a;
}
function spend(a) {
  if (S.coins + 1e-9 < a) return false;
  S.coins = Math.max(0, S.coins - a);
  return true;
}
function gemMult() { return (1 + 0.1 * (S.rup.gem || 0)) * (1 + PS.gem); }
function earnGems(n) {
  const g = Math.max(1, Math.round(n * gemMult()));
  S.gems += g; S.gemsTotal += g;
  return g;
}
function spendGems(n) { if (S.gems < n) return false; S.gems -= n; return true; }
function rebirthGain() {
  if (S.runEarned < 1e7) return 0;
  return Math.floor(Math.cbrt(S.runEarned / 1e6) * (1 + 0.1 * (S.rup.gain || 0)));
}
function offlineEff() { return 0.3 + 0.1 * S.up.offline; }
function offlineCap() { return (8 + 2 * (S.rup.rest || 0)) * 3600 * (PS.aura.whale ? 2 : 1); }

function speedMult() { return 1 + 0.07 * S.up.speed + PS.speed; }
function jumpMult() { return 1 + 0.05 * S.up.jump + PS.jump; }

// ---------- 펫 효과 (장착한 펫 합계, refreshPets()로 다시 계산) ----------
let PS = { coin: 0, gem: 0, dmg: 0, hp: 0, jump: 0, speed: 0, aura: {} };
let DEX = { n: 0, g: 0, r: 0 };
const petById = (id) => PETS.find((p) => p.id === id);
function petStatVal(p, k, v) { const st = PSTAT[k]; return st.vals[p.rar] * p.st[k] * (st.move ? PVAR[v].mmult : PVAR[v].mult); }
function refreshPets() {
  const o = { coin: 0, gem: 0, dmg: 0, hp: 0, jump: 0, speed: 0, aura: {} };
  for (const [id, v] of S.pets.eq) {
    const p = petById(id);
    if (!p) continue;
    for (const k in p.st) o[k] += petStatVal(p, k, v);
    if (p.aura) o.aura[p.aura] = true;
  }
  for (const k in PSTAT) if (PSTAT[k].cap) o[k] = Math.min(o[k], PSTAT[k].cap);
  PS = o;
  let n = 0, g = 0, r = 0;
  for (const p of PETS) { const d = S.pets.dex[p.id] || 0; if (d & 1) n++; if (d & 2) g++; if (d & 4) r++; }
  DEX = { n, g, r };
}
function dexMult() { return 1 + 0.03 * DEX.n + 0.02 * DEX.g + 0.03 * DEX.r; }
function petSlots() { let s = 3; for (const m of DEX_MS) if (m.slot && DEX.n >= m.n) s += m.slot; return s; }
function petX10() { return DEX_MS.some((m) => m.x10 && DEX.n >= m.n); }
function petCount(id, v) { const a = S.pets.inv[id]; return a ? a[v] || 0 : 0; }
function petEquipped(id, v) { let n = 0; for (const e of S.pets.eq) if (e[0] === id && e[1] === v) n++; return n; }
