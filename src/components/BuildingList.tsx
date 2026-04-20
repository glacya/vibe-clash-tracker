import type { Building } from '../types/village';
import type { UpgradeEntry, ResourceType, WeaponDataEntry } from '../types/buildingData';
import { useBuildingData } from '../hooks/useBuildingData';
import { useItemData } from '../hooks/useItemData';
import {
  VILLAGE_BUILDING_IDS,
  BUILDING_NAMES,
  WALL_ID,
  BUILDER_HUT_DEFENSE_MIN_TH,
} from '../data/gameData';
import { LevelLabel, getAbsoluteMax, getLevelStatus } from './LevelLabel';
import { ProgressMeter } from './ProgressMeter';
import { LevelFallbackImg } from './LevelFallbackImg';

interface Props {
  buildings: Building[];
  thLevel: number;
  /** 지정 시 해당 ID 집합에 속하는 건물만 표시 */
  allowedIds?: Set<number>;
  /** 지정 시 해당 순서대로 그룹을 표시 */
  orderIds?: number[];
  /** true이면 인스턴스가 1개일 때 "× 1" 숨김 */
  hideCountOne?: boolean;
  /** 마을 회관 무기 레벨 (있을 때만 방어 탭 최상단에 표시) */
  weaponLevel?: number;
  goldPassMultiplier?: number;
}

// ============================
// 자원 색상 / 아이콘 (placeholder)
// ============================
const RESOURCE_COLOR: Record<ResourceType, string> = {
  elixir: '#d97bef',
  gold: '#f4c832',
  dark_elixir: '#a37bd4',
  gem: '#4ecb80',
};

// ============================
// 유틸 함수
// ============================
function formatCost(n: number): string {
  if (isNaN(n) || n == undefined) {
    return "없음";
  }

  return n.toLocaleString('en-US');
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return h > 0 ? `${d}일 ${h}시간` : `${d}일`;
}

function getMaxLevelForTH(upgrade: UpgradeEntry[], thLevel: number): number {
  const achievable = upgrade.filter((u) => u.town_hall === null || u.town_hall <= thLevel);
  if (achievable.length === 0) return 0;
  return Math.max(...achievable.map((u) => u.level));
}

function getRemainingUpgrades(
  upgrade: UpgradeEntry[],
  currentLevel: number,
  thLevel: number,
): UpgradeEntry[] {
  return upgrade.filter((u) => u.level > currentLevel && (u.town_hall === null || u.town_hall <= thLevel));
}

interface CostTime {
  resourceType: ResourceType;
  cost: number;
  time: number;
}

function sumUpgrades(upgrades: UpgradeEntry[], multiplier = 1): CostTime[] {
  const byType = new Map<ResourceType, { cost: number; time: number }>();
  for (const u of upgrades) {
    const rt = u.resource_type[0];
    if (!rt) continue;
    const prev = byType.get(rt) ?? { cost: 0, time: 0 };
    byType.set(rt, {
      cost: prev.cost + (u.cost ?? 0) * multiplier,
      time: prev.time + (u.time ?? 0) * multiplier,
    });
  }
  return [...byType.entries()].map(([resourceType, { cost, time }]) => ({
    resourceType,
    cost,
    time,
  }));
}

// ============================
// 공통 표시 컴포넌트
// ============================
function CostDisplay({ cost, resourceType }: { cost: number; resourceType: ResourceType }) {
  const color = RESOURCE_COLOR[resourceType];
  return (
    <span className="cost-display">
      <span className="cost-display__num" style={{ color }}>{formatCost(cost)}</span>
      <img className="cost-icon" src={`/images/common/${resourceType}.png`} alt={resourceType} />
    </span>
  );
}

function CostTimeBlock({ summaries, hideTime }: { summaries: CostTime[]; hideTime?: boolean }) {
  if (summaries.length === 0) return null;
  return (
    <div className="cost-time-block">
      {summaries.map((s) => (
        <div key={s.resourceType} className="cost-time-block__row">
          <CostDisplay cost={s.cost} resourceType={s.resourceType} />
          {!hideTime && s.time > 0 && (
            <span className="cost-time-block__time">{formatTime(s.time)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================
// 일반 건물 행
// ============================
function BuildingRow({
  id,
  lvl,
  upgrade,
  thLevel,
  gearUp,
  goldPassMultiplier = 1,
}: {
  id: number;
  lvl: number;
  upgrade?: UpgradeEntry[];
  thLevel: number;
  gearUp?: boolean;
  goldPassMultiplier?: number;
}) {
  const maxLevel = upgrade ? getMaxLevelForTH(upgrade, thLevel) : null;
  const absoluteMax = upgrade ? getAbsoluteMax(upgrade) : 0;
  const remaining = upgrade ? getRemainingUpgrades(upgrade, lvl, thLevel) : [];
  const nextUpgrade = remaining[0] ?? null;
  const toMaxSummary = sumUpgrades(remaining, goldPassMultiplier);
  const status = getLevelStatus(lvl, maxLevel ?? 0, absoluteMax);

  return (
    <div className="bld-row">
      <div className="bld-row__img-col">
        <div className="bld-row__img-wrapper">
          <LevelFallbackImg category="buildings" id={id} lvl={lvl} className="bld-row__img" />
          {gearUp && <img className="bld-row__gear-up-icon" src="/images/common/gear.svg" alt="개조됨" />}
        </div>
        <LevelLabel lvl={lvl} gatedMax={maxLevel ?? 0} absoluteMax={absoluteMax} />
      </div>
      <div className="bld-row__meter-col">
        {maxLevel !== null ? (
          <ProgressMeter current={lvl} max={maxLevel} absoluteMax={absoluteMax} />
        ) : (
          <span className="bld-row__no-data">데이터 없음</span>
        )}
      </div>
      {status !== 'normal' ? (
        <div className={`bld-row__max-col bld-row__max-col--${status}`}>
          {status === 'th-max' ? '현재 최대' : '최대'}
        </div>
      ) : (
        <>
          <div className="bld-row__next-col">
            {nextUpgrade && nextUpgrade.resource_type[0] ? (
              <CostTimeBlock
                summaries={[{
                  resourceType: nextUpgrade.resource_type[0],
                  cost: Math.round((nextUpgrade.cost ?? 0) * goldPassMultiplier),
                  time: Math.round((nextUpgrade.time ?? 0) * goldPassMultiplier),
                }]}
              />
            ) : (
              <span className="bld-row__at-max">—</span>
            )}
          </div>
          <div className="bld-row__total-col">
            {toMaxSummary.length > 0 && <CostTimeBlock summaries={toMaxSummary} />}
          </div>
        </>
      )}
    </div>
  );
}

// ============================
// 일반 건물 그룹
// ============================
interface Instance { lvl: number; gearUp: boolean; }

function BuildingGroup({
  id,
  entries,
  thLevel,
  hideCountOne,
  goldPassMultiplier = 1,
}: {
  id: number;
  entries: Building[];
  thLevel: number;
  hideCountOne?: boolean;
  goldPassMultiplier?: number;
}) {
  const { data } = useBuildingData(id);
  const name = data?.name ?? BUILDING_NAMES[id] ?? `ID ${id}`;
  const upgrade = data?.upgrade;
  const supportsGearUp = data?.gear_up === true;

  // 개별 인스턴스로 확장 (cnt 고려)
  const instances: Instance[] = [];
  for (const b of entries) {
    const cnt = b.cnt ?? 1;
    const gearUp = supportsGearUp && b.gear_up != null;
    instances.push({ lvl: b.lvl, gearUp });
    for (let i = 1; i < cnt; i++) instances.push({ lvl: b.lvl, gearUp: false });
  }
  // 개조된 건물 최상단, 그 후 레벨 오름차순
  instances.sort((a, b) => {
    if (a.gearUp !== b.gearUp) return a.gearUp ? -1 : 1;
    return a.lvl - b.lvl;
  });

  // 그룹 전체 합산 (개조 여부와 무관하게 레벨 기준)
  const allRemaining: UpgradeEntry[] = [];
  if (upgrade) {
    for (const inst of instances) {
      allRemaining.push(...getRemainingUpgrades(upgrade, inst.lvl, thLevel));
    }
  }
  const groupTotal = sumUpgrades(allRemaining, goldPassMultiplier);

  return (
    <div className="bld-group">
      <div className="bld-group__header">
        <span className="bld-group__name">{name}{(!hideCountOne || instances.length > 1) ? ` × ${instances.length}` : ''}</span>
        <div className="bld-group__total">
          {groupTotal.length > 0 ? (
            <CostTimeBlock summaries={groupTotal} />
          ) : null }
        </div>
      </div>
      <div className="bld-row bld-row--header">
        <div className="bld-row__img-col" />
        <div className="bld-row__meter-col bld-row__col-label">진행도</div>
        <div className="bld-row__next-col bld-row__col-label">다음 업그레이드 시</div>
        <div className="bld-row__total-col bld-row__col-label">최대 업그레이드 시</div>
      </div>
      {instances.map((inst, i) => (
        <BuildingRow key={i} id={id} lvl={inst.lvl} upgrade={upgrade} thLevel={thLevel} gearUp={inst.gearUp} goldPassMultiplier={goldPassMultiplier} />
      ))}
    </div>
  );
}

// ============================
// 장벽 전용 이중 비용 표시 (골드 / 엘릭서 병기)
// ============================
function WallDualCostDisplay({ cost }: { cost: number }) {
  if (cost === 0) return null;
  return (
    <div className="wall-dual-cost">
      <span className="cost-display">
        <span className="cost-display__num" style={{ color: RESOURCE_COLOR.gold }}>{formatCost(cost)}</span>
        <img className="cost-icon" src="/images/common/gold.png" alt="gold" />
      </span>
      <span className="wall-dual-cost__sep">/</span>
      <span className="cost-display">
        <span className="cost-display__num" style={{ color: RESOURCE_COLOR.elixir }}>{formatCost(cost)}</span>
        <img className="cost-icon" src="/images/common/elixir.png" alt="elixir" />
      </span>
    </div>
  );
}

// ============================
// 장벽 전용 행 (레벨별 묶음)
// ============================
function WallLevelRow({
  lvl,
  cnt,
  upgrade,
  thLevel,
  goldPassMultiplier = 1,
}: {
  lvl: number;
  cnt: number;
  upgrade?: UpgradeEntry[];
  thLevel: number;
  goldPassMultiplier?: number;
}) {
  const remaining = upgrade ? getRemainingUpgrades(upgrade, lvl, thLevel) : [];
  const nextUpgrade = remaining[0] ?? null;
  const nextCost = nextUpgrade
    ? Math.round((nextUpgrade.cost ?? 0) * cnt * goldPassMultiplier)
    : 0;
  const totalCost = Math.round(
    remaining.reduce((sum, u) => sum + (u.cost ?? 0), 0) * cnt * goldPassMultiplier,
  );

  const maxLevel = upgrade ? getMaxLevelForTH(upgrade, thLevel) : null;
  const absoluteMax = upgrade ? getAbsoluteMax(upgrade) : 0;
  const atMax = maxLevel !== null && lvl >= maxLevel;

  return (
    <div className="bld-row bld-row--wall">
      {/* Col 1: 레벨 × 개수 */}
      <div className="bld-row__wall-level-col">
        <LevelLabel lvl={lvl} gatedMax={maxLevel ?? 0} absoluteMax={absoluteMax} />
        <span className="bld-row__wall-cnt">× {cnt}</span>
      </div>
      {/* Col 2: 다음 업그레이드 비용 */}
      <div className="bld-row__next-col">
        {atMax ? (
          <span className="bld-row__at-max">최대</span>
        ) : nextCost > 0 ? (
          <WallDualCostDisplay cost={nextCost} />
        ) : (
          <span className="bld-row__no-data">—</span>
        )}
      </div>
      {/* Col 3: 최대까지 비용 합산 */}
      <div className="bld-row__total-col">
        <WallDualCostDisplay cost={totalCost} />
      </div>
    </div>
  );
}

// ============================
// 장벽 그룹
// ============================
function WallGroup({
  entries,
  thLevel,
  goldPassMultiplier = 1,
}: {
  entries: Building[];
  thLevel: number;
  goldPassMultiplier?: number;
}) {
  const { data } = useBuildingData(WALL_ID);
  const upgrade = data?.upgrade;

  // 레벨별 총 개수
  const byLevel = new Map<number, number>();
  let totalCount = 0;
  for (const b of entries) {
    const cnt = b.cnt ?? 1;
    byLevel.set(b.lvl, (byLevel.get(b.lvl) ?? 0) + cnt);
    totalCount += cnt;
  }

  // 그룹 전체 최대까지 비용 합산
  const allRemaining: UpgradeEntry[] = [];
  if (upgrade) {
    for (const [lvl, cnt] of byLevel) {
      const remaining = getRemainingUpgrades(upgrade, lvl, thLevel);
      for (let i = 0; i < cnt; i++) allRemaining.push(...remaining);
    }
  }
  const groupTotalCost = Math.round(
    allRemaining.reduce((sum, u) => sum + (u.cost ?? 0), 0) * goldPassMultiplier,
  );

  return (
    <div className="bld-group">
      <div className="bld-group__header">
        <div className="bld-group__wall-title">
          <span className="bld-group__name">장벽 × {totalCount}</span>
        </div>
        <div className="bld-group__total">
          <WallDualCostDisplay cost={groupTotalCost} />
        </div>
      </div>
      <div className="bld-row bld-row--header bld-row--wall">
        <div className="bld-row__wall-level-col bld-row__col-label">레벨</div>
        <div className="bld-row__next-col bld-row__col-label">다음 업그레이드 비용</div>
        <div className="bld-row__total-col bld-row__col-label">최대 업그레이드 비용</div>
      </div>
      {[...byLevel.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([lvl, cnt]) => (
          <WallLevelRow key={lvl} lvl={lvl} cnt={cnt} upgrade={upgrade} thLevel={thLevel} goldPassMultiplier={goldPassMultiplier} />
        ))}
    </div>
  );
}

// ============================
// 마을 회관 무기
// ============================
function WeaponGroup({ weaponLevel, thLevel, goldPassMultiplier = 1 }: { weaponLevel: number; thLevel: number; goldPassMultiplier?: number }) {
  const { data: weaponList } = useItemData<WeaponDataEntry[]>('buildings', 'weapon');

  const weaponData = weaponList?.find((w) => w.town_hall === thLevel) ?? null;
  if (!weaponData) return null;

  const { upgrade, name } = weaponData;
  const absoluteMax = upgrade.length === 0 ? 0 : Math.max(...upgrade.map((u) => u.level));
  const remaining = upgrade.filter((u) => u.level > weaponLevel);
  const nextUpgrade = remaining[0] ?? null;
  const status = getLevelStatus(weaponLevel, absoluteMax, absoluteMax);

  const byType = new Map<ResourceType, { cost: number; time: number }>();
  for (const u of remaining) {
    if (u.cost === null || !u.resource_type[0]) continue;
    const rt = u.resource_type[0];
    const p = byType.get(rt) ?? { cost: 0, time: 0 };
    byType.set(rt, { cost: p.cost + u.cost, time: p.time + (u.time ?? 0) });
  }
  const toMaxSummary: CostTime[] = [...byType.entries()].map(([resourceType, { cost, time }]) => ({
    resourceType,
    cost: Math.round(cost * goldPassMultiplier),
    time: Math.round(time * goldPassMultiplier),
  }));

  return (
    <div className="bld-group">
      <div className="bld-group__header">
        <span className="bld-group__name">{name}</span>
        <div className="bld-group__total">
          {toMaxSummary.length > 0
            ? <CostTimeBlock summaries={toMaxSummary} />
            : <span className="bld-group__all-max">최대 업그레이드</span>}
        </div>
      </div>
      <div className="bld-row bld-row--header">
        <div className="bld-row__img-col" />
        <div className="bld-row__meter-col bld-row__col-label">진행도</div>
        <div className="bld-row__next-col bld-row__col-label">다음 업그레이드 시</div>
        <div className="bld-row__total-col bld-row__col-label">최대 업그레이드 시</div>
      </div>
      <div className="bld-row">
        <div className="bld-row__img-col">
          <LevelFallbackImg
            category="buildings/weapon"
            id={thLevel}
            lvl={Math.max(1, weaponLevel)}
            className="bld-row__img"
          />
          <LevelLabel lvl={weaponLevel} gatedMax={absoluteMax} absoluteMax={absoluteMax} />
        </div>
        <div className="bld-row__meter-col">
          {absoluteMax > 0
            ? <ProgressMeter current={weaponLevel} max={absoluteMax} absoluteMax={absoluteMax} />
            : <span className="bld-row__no-data">데이터 없음</span>}
        </div>
        {status !== 'normal' ? (
          <div className={`bld-row__max-col bld-row__max-col--${status}`}>
            {status === 'th-max' ? '현재 최대' : '최대'}
          </div>
        ) : (
          <>
            <div className="bld-row__next-col">
              {nextUpgrade && nextUpgrade.cost !== null && nextUpgrade.resource_type[0] ? (
                <CostTimeBlock summaries={[{
                  resourceType: nextUpgrade.resource_type[0],
                  cost: Math.round(nextUpgrade.cost * goldPassMultiplier),
                  time: Math.round((nextUpgrade.time ?? 0) * goldPassMultiplier),
                }]} />
              ) : (
                <span className="bld-row__at-max">—</span>
              )}
            </div>
            <div className="bld-row__total-col">
              {toMaxSummary.length > 0 && <CostTimeBlock summaries={toMaxSummary} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================
// 메인 컴포넌트
// ============================
export function BuildingList({ buildings, thLevel, allowedIds, orderIds, hideCountOne, weaponLevel, goldPassMultiplier = 1 }: Props) {
  // ID별로 Building 엔트리를 묶음 (cnt 유지)
  const grouped = new Map<number, Building[]>();
  for (const b of buildings) {
    if (!VILLAGE_BUILDING_IDS.has(b.data)) continue;
    if (allowedIds && !allowedIds.has(b.data)) continue;
    // 장인의 집(1000015)은 TH14 미만이면 방어 탭에 표시하지 않음
    if (b.data === 1000015 && thLevel < BUILDER_HUT_DEFENSE_MIN_TH) continue;
    if (!grouped.has(b.data)) grouped.set(b.data, []);
    grouped.get(b.data)!.push(b);
  }

  if (grouped.size === 0 && weaponLevel == null) {
    return <div className="bld-empty">건물 데이터가 없습니다.</div>;
  }

  // orderIds가 있으면 해당 순서대로, 없으면 ID 오름차순 (장벽은 항상 마지막)
  const sortedIds = orderIds
    ? orderIds.filter((id) => grouped.has(id))
    : [...grouped.keys()].sort((a, b) => {
        if (a === WALL_ID) return 1;
        if (b === WALL_ID) return -1;
        return a - b;
      });

  return (
    <div className="bld-list">
      {weaponLevel != null && <WeaponGroup weaponLevel={weaponLevel} thLevel={thLevel} goldPassMultiplier={goldPassMultiplier} />}
      {sortedIds.map((id) => {
        const entries = grouped.get(id)!;
        return id === WALL_ID ? (
          <WallGroup key={id} entries={entries} thLevel={thLevel} goldPassMultiplier={goldPassMultiplier} />
        ) : (
          <BuildingGroup key={id} id={id} entries={entries} thLevel={thLevel} hideCountOne={hideCountOne} goldPassMultiplier={goldPassMultiplier} />
        );
      })}
    </div>
  );
}
