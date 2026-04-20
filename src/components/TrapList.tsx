import type { Trap } from '../types/village';
import type { BuildingDataFile, UpgradeEntry, ResourceType } from '../types/buildingData';
import { useItemData } from '../hooks/useItemData';
import { VILLAGE_TRAP_IDS, TRAP_NAMES } from '../data/gameData';
import { LevelLabel, getAbsoluteMax, getLevelStatus } from './LevelLabel';
import { LevelFallbackImg } from './LevelFallbackImg';
import { ProgressMeter } from './ProgressMeter';

interface Props {
  traps: Trap[];
  thLevel: number;
  goldPassMultiplier?: number;
}

// ============================
// 자원 색상 / 아이콘 (BuildingList와 동일 palette)
// ============================
const RESOURCE_COLOR: Record<ResourceType, string> = {
  elixir: '#d97bef',
  gold: '#f4c832',
  dark_elixir: '#a37bd4',
  gem: '#4ecb80',
};

// ============================
// 유틸
// ============================
function formatCost(n: number): string { return n.toLocaleString('en-US'); }

function formatTime(s: number): string {
  if (s < 60) return `${s}초`;
  if (s < 3600) return `${Math.floor(s / 60)}분`;
  if (s < 86400) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  }
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  return h > 0 ? `${d}일 ${h}시간` : `${d}일`;
}

function getMaxLevelForTH(upgrade: UpgradeEntry[], thLevel: number): number {
  const achievable = upgrade.filter((u) => u.town_hall === null || u.town_hall <= thLevel);
  return achievable.length === 0 ? 0 : Math.max(...achievable.map((u) => u.level));
}

function getRemainingUpgrades(upgrade: UpgradeEntry[], currentLevel: number, thLevel: number): UpgradeEntry[] {
  return upgrade.filter((u) => u.level > currentLevel && (u.town_hall === null || u.town_hall <= thLevel));
}

interface CostTime { resourceType: ResourceType; cost: number; time: number; }

function sumUpgrades(upgrades: UpgradeEntry[]): CostTime[] {
  const byType = new Map<ResourceType, { cost: number; time: number }>();
  for (const u of upgrades) {
    const rt = u.resource_type[0];
    if (!rt) continue;
    const p = byType.get(rt) ?? { cost: 0, time: 0 };
    byType.set(rt, { cost: p.cost + (u.cost ?? 0), time: p.time + (u.time ?? 0) });
  }
  return [...byType.entries()].map(([resourceType, { cost, time }]) => ({ resourceType, cost, time }));
}

// ============================
// 표시 컴포넌트
// ============================
function CostDisplay({ cost, resourceType }: { cost: number; resourceType: ResourceType }) {
  const color = RESOURCE_COLOR[resourceType];
  return (
    <span className="cost-display">
      <span className="cost-display__num" style={{ color }}>{formatCost(cost)}</span>
      <img className="cost-icon" src={`${import.meta.env.BASE_URL}images/common/${resourceType}.png`} alt={resourceType} />
    </span>
  );
}

function CostTimeBlock({ summaries }: { summaries: CostTime[] }) {
  if (summaries.length === 0) return null;
  return (
    <div className="cost-time-block">
      {summaries.map((s) => (
        <div key={s.resourceType} className="cost-time-block__row">
          <CostDisplay cost={s.cost} resourceType={s.resourceType} />
          {s.time > 0 && (
            <span className="cost-time-block__time">{formatTime(s.time)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================
// 함정 행
// ============================
function TrapRow({ id, lvl, upgrade, thLevel, goldPassMultiplier = 1 }: { id: number; lvl: number; upgrade?: UpgradeEntry[]; thLevel: number; goldPassMultiplier?: number }) {
  const maxLevel = upgrade ? getMaxLevelForTH(upgrade, thLevel) : null;
  const absoluteMax = upgrade ? getAbsoluteMax(upgrade) : 0;
  const remaining = upgrade ? getRemainingUpgrades(upgrade, lvl, thLevel) : [];
  const nextUpgrade = remaining[0] ?? null;
  const toMaxSummary = sumUpgrades(remaining).map((s) => ({ ...s, cost: Math.round(s.cost * goldPassMultiplier), time: Math.round(s.time * goldPassMultiplier) }));
  const status = getLevelStatus(lvl, maxLevel ?? 0, absoluteMax);

  return (
    <div className="bld-row">
      <div className="bld-row__img-col">
        <LevelFallbackImg category="traps" id={id} lvl={lvl} className="bld-row__img" />
        <LevelLabel lvl={lvl} gatedMax={maxLevel ?? 0} absoluteMax={absoluteMax} />
      </div>
      <div className="bld-row__meter-col">
        {maxLevel !== null
          ? <ProgressMeter current={lvl} max={maxLevel} absoluteMax={absoluteMax} />
          : <span className="bld-row__no-data">데이터 없음</span>}
      </div>
      {status !== 'normal' ? (
        <div className={`bld-row__max-col bld-row__max-col--${status}`}>
          {status === 'th-max' ? '현재 최대' : '최대'}
        </div>
      ) : (
        <>
          <div className="bld-row__next-col">
            {nextUpgrade
              ? <CostTimeBlock summaries={[{ resourceType: nextUpgrade.resource_type[0], cost: Math.round((nextUpgrade.cost ?? 0) * goldPassMultiplier), time: Math.round((nextUpgrade.time ?? 0) * goldPassMultiplier) }]} />
              : <span className="bld-row__at-max">—</span>}
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
// 함정 그룹
// ============================
function TrapGroup({ id, instances, thLevel, goldPassMultiplier = 1 }: { id: number; instances: number[]; thLevel: number; goldPassMultiplier?: number }) {
  const { data } = useItemData<BuildingDataFile>('traps', id);
  const name = data?.name ?? TRAP_NAMES[id] ?? `ID ${id}`;
  const upgrade = data?.upgrade;

  const allRemaining: UpgradeEntry[] = [];
  if (upgrade) {
    for (const lvl of instances) {
      allRemaining.push(...getRemainingUpgrades(upgrade, lvl, thLevel));
    }
  }
  const groupTotal = sumUpgrades(allRemaining).map((s) => ({ ...s, cost: Math.round(s.cost * goldPassMultiplier), time: Math.round(s.time * goldPassMultiplier) }));

  return (
    <div className="bld-group">
      <div className="bld-group__header">
        <span className="bld-group__name">{name} × {instances.length}</span>
        <div className="bld-group__total">
          {groupTotal.length > 0
            ? <CostTimeBlock summaries={groupTotal} />
            : null }
        </div>
      </div>
      <div className="bld-row bld-row--header">
        <div className="bld-row__img-col" />
        <div className="bld-row__meter-col bld-row__col-label">진행도</div>
        <div className="bld-row__next-col bld-row__col-label">다음 업그레이드</div>
        <div className="bld-row__total-col bld-row__col-label">최대까지 합산</div>
      </div>
      {instances.map((lvl, i) => (
        <TrapRow key={i} id={id} lvl={lvl} upgrade={upgrade} thLevel={thLevel} goldPassMultiplier={goldPassMultiplier} />
      ))}
    </div>
  );
}

// ============================
// 메인
// ============================
export function TrapList({ traps, thLevel, goldPassMultiplier = 1 }: Props) {
  const grouped = new Map<number, number[]>();

  for (const t of traps) {
    if (!VILLAGE_TRAP_IDS.has(t.data)) continue;
    if (!grouped.has(t.data)) grouped.set(t.data, []);
    const cnt = t.cnt ?? 1;
    for (let i = 0; i < cnt; i++) grouped.get(t.data)!.push(t.lvl);
  }

  if (grouped.size === 0) return <div className="bld-empty">함정 데이터가 없습니다.</div>;

  return (
    <div className="bld-list">
      {[...grouped.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([id, instances]) => (
          <TrapGroup key={id} id={id} instances={instances} thLevel={thLevel} goldPassMultiplier={goldPassMultiplier} />
        ))}
    </div>
  );
}
