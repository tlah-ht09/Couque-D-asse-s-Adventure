'use strict';
// =====================================================================
//  맵 단위 렌더링
//  월드를 맵(구역)별 그룹으로 나눠서, 플레이어가 있는 맵만 그려요.
//  숨긴 맵은 그리기·그림자·행렬 갱신을 모두 건너뛰어요.
// =====================================================================
const MAP_IDS = ['main', 'sky', 'tower', 'daily', 'hatch', 'hunt', 'castle'];
const MAP_NAMES = { main: '허브 · 1~4구역', sky: '별빛 섬', tower: '끝없는 하늘 탑', daily: '오늘의 도전', hatch: '펫 부화장', hunt: '사냥터 · 레이드', castle: '쿠키성 월드' };
const mapGroups = {};
for (const id of MAP_IDS) {
  const g = new THREE.Group();
  g.name = 'map:' + id;
  scene.add(g);
  mapGroups[id] = g;
}
let curMap = '';
let mapVisKey = '';

// 좌표가 어느 맵에 속하는지 (섬들이 서로 멀리 떨어져 있어서 위치로 갈라져요)
function mapAt(x, y, z) {
  if (y > 55 && x > 40 && x < 150 && z < -40 && z > -350) return 'sky';
  if (y < 55 && x > 80 && z < -80) return 'castle';
  if (Math.abs(x - TOWER_C.x) < 50 && Math.abs(z - TOWER_C.z) < 50) return 'tower';
  if (Math.abs(x - DAILY_C.x) < 50 && Math.abs(z - DAILY_C.z) < 50) return 'daily';
  if (Math.hypot(x - HATCH_C.x, z - HATCH_C.z) < 30) return 'hatch';
  if (x < -70 && z > 75) return 'hunt';
  return 'main';
}

const _mapBox = new THREE.Box3(), _mapC = new THREE.Vector3();
function objMapId(o) {
  _mapBox.setFromObject(o);
  if (_mapBox.isEmpty()) _mapC.copy(o.position);
  else _mapBox.getCenter(_mapC);
  return mapAt(_mapC.x, _mapC.y, _mapC.z);
}

// 부팅 때 만든 월드 오브젝트를 맵 그룹으로 옮겨요.
// 구름·바다·몬스터처럼 맵을 가리지 않거나 따로 관리되는 건 그대로 둬요.
function adoptMapObjects(from) {
  // 부팅 전에 만든 허브 전용 오브젝트(채굴 크리스탈, 드로퍼 큐브)도 허브 맵에 넣어요.
  // (조명은 개수가 바뀌면 셰이더를 다시 만들어서 멈칫하니까 그룹에 넣지 않고 밝기만 꺼요)
  mapGroups.main.add(crystal, cubeMesh);
  const keep = new Set(clouds);
  for (const m of monsters) keep.add(m.model.g), keep.add(m.bar.bg), keep.add(m.bar.fg);
  const list = scene.children.slice(from);
  const count = {};
  for (const o of list) {
    if (keep.has(o) || o.userData.global || !o.frustumCulled) continue;
    if (MAP_IDS.some((id) => mapGroups[id] === o)) continue;
    const id = objMapId(o);
    mapGroups[id].add(o);
    count[id] = (count[id] || 0) + 1;
  }
  return count;
}
// 끝없는 탑 / 오늘의 도전처럼 나중에 만들어지는 층도 해당 맵으로
function adoptBuild(b, id) {
  const g = mapGroups[id] || mapGroups.main;
  for (const o of b.objs) g.add(o);
  return b;
}

function playerMap() {
  const m = mapAt(P.x, P.y, P.z);
  // 탑·도전 트랙은 층이 섬 밖으로 길게 뻗어서, 트랙 위에 있으면 그 맵으로 쳐요
  if (m === 'main' && (P.trackOn === 'tower' || P.trackOn === 'daily')) return P.trackOn;
  return m;
}
function updateMapVisibility() {
  const cur = playerMap();
  // 발사대로 하늘섬에 날아가는 동안엔 출발지와 도착지를 같이 보여요
  const key = P.launch ? cur + '+main+sky' : cur;
  curMap = cur;
  if (key === mapVisKey) return;
  mapVisKey = key;
  for (const id of MAP_IDS) {
    const on = id === cur || (!!P.launch && (id === 'main' || id === 'sky'));
    const g = mapGroups[id];
    g.visible = on;
    g.matrixWorldAutoUpdate = on;
  }
}
