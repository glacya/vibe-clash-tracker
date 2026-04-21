import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Unit, Spell } from '../types/village';
import type { ArmyUpgradeEntry, ResourceType } from '../types/buildingData';
import { useItemData } from '../hooks/useItemData';
import { LevelLabel, getAbsoluteMax, getLevelStatus } from './LevelLabel';
import { ProgressMeter } from './ProgressMeter';

interface ArmyItemData {
  id: number;
  name?: string;
  upgrade: ArmyUpgradeEntry[];
}

type ArmySnapshot = Unit | Spell;

interface Props {
  items: ArmySnapshot[];
  labLevel: number;
  displayOrder: number[];
  category: 'units' | 'spells' | 'siege_machines';
  goldPassMultiplier?: number;
}

const RESOURCE_COLOR: Record<ResourceType, string> = {
  elixir: '#d97bef',
  gold: '#f4c832',
  dark_elixir: '#a37bd4',
  gem: '#4ecb80',
};

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

function getMaxLevel(upgrade: ArmyUpgradeEntry[], labLevel: number): number {
  const achievable = upgrade.filter((u) => u.laboratory === null || u.laboratory <= labLevel);
  return achievable.length === 0 ? 0 : Math.max(...achievable.map((u) => u.level));
}

function getRemainingUpgrades(upgrade: ArmyUpgradeEntry[], currentLevel: number, labLevel: number): ArmyUpgradeEntry[] {
  return upgrade.filter((u) => u.level > currentLevel && (u.laboratory === null || u.laboratory <= labLevel));
}

interface SumEntry { resourceType: ResourceType; cost: number; time: number; }

function sumRemaining(upgrades: ArmyUpgradeEntry[], multiplier = 1): SumEntry[] {
  const m = new Map<ResourceType, { cost: number; time: number }>();
  for (const u of upgrades) {
    if (u.cost === null) continue;
    for (const rt of u.resource_type) {
      const p = m.get(rt) ?? { cost: 0, time: 0 };
      m.set(rt, { cost: p.cost + u.cost, time: p.time + (u.time ?? 0) });
    }
  }
  return [...m.entries()].map(([resourceType, { cost, time }]) => ({ resourceType, cost: Math.round(cost * multiplier), time: Math.round(time * multiplier) }));
}

function aggregateCosts(all: SumEntry[][]): SumEntry[] {
  const byType = new Map<ResourceType, { cost: number; time: number }>();
  for (const group of all) {
    for (const { resourceType, cost, time } of group) {
      const prev = byType.get(resourceType) ?? { cost: 0, time: 0 };
      byType.set(resourceType, { cost: prev.cost + cost, time: prev.time + time });
    }
  }
  return [...byType.entries()].map(([resourceType, { cost, time }]) => ({ resourceType, cost, time }));
}

function CostDisplay({ cost, resourceType }: { cost: number; resourceType: ResourceType }) {
  const color = RESOURCE_COLOR[resourceType];
  return (
    <span className="cost-display">
      <span className="cost-display__num" style={{ color }}>{formatCost(cost)}</span>
      <img className="cost-icon" src={`${import.meta.env.BASE_URL}images/common/${resourceType}.png`} alt={resourceType} />
    </span>
  );
}

function NextUpgradeBlock({ entry, multiplier = 1 }: { entry: ArmyUpgradeEntry; multiplier?: number }) {
  if (entry.cost === null) return null;
  return (
    <div className="cost-time-block">
      {entry.resource_type.map((rt) => (
        <div key={rt} className="cost-time-block__row">
          <CostDisplay cost={Math.round(entry.cost! * multiplier)} resourceType={rt} />
          {entry.time !== null && entry.time > 0 && (
            <span className="cost-time-block__time">{formatTime(Math.round(entry.time * multiplier))}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ToMaxBlock({ upgrades, multiplier = 1 }: { upgrades: ArmyUpgradeEntry[]; multiplier?: number }) {
  const entries = sumRemaining(upgrades, multiplier);
  if (entries.length === 0) return null;
  return (
    <div className="cost-time-block">
      {entries.map(({ resourceType, cost, time }) => (
        <div key={resourceType} className="cost-time-block__row">
          <CostDisplay cost={cost} resourceType={resourceType} />
          {time > 0 && <span className="cost-time-block__time">{formatTime(time)}</span>}
        </div>
      ))}
    </div>
  );
}

function ListSummaryBar({ totals }: { totals: SumEntry[] }) {
  if (totals.length === 0) return null;
  return (
    <div className="list-summary">
      <span className="list-summary__label">전체 합산</span>
      <div className="list-summary__costs">
        {totals.map((ct) => (
          <div key={ct.resourceType} className="list-summary__item">
            <CostDisplay cost={ct.cost} resourceType={ct.resourceType} />
            {ct.time > 0 && <span className="list-summary__time">{formatTime(ct.time)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ArmyRow({
  lvl, data, labLevel, category, goldPassMultiplier = 1, onGroupTotal,
}: {
  lvl: number; data: ArmyItemData; labLevel: number; category: string;
  goldPassMultiplier?: number; onGroupTotal?: (id: number, costs: SumEntry[]) => void;
}) {
  const { upgrade } = data;
  const maxLevel = getMaxLevel(upgrade, labLevel);
  const absoluteMax = getAbsoluteMax(upgrade);
  const remaining = getRemainingUpgrades(upgrade, lvl, labLevel);
  const next = remaining[0] ?? null;
  const status = getLevelStatus(lvl, maxLevel, absoluteMax);
  const toMax = sumRemaining(remaining, goldPassMultiplier);

  const onGroupTotalRef = useRef(onGroupTotal);
  useEffect(() => { onGroupTotalRef.current = onGroupTotal; });
  const totalKey = toMax.map((c) => `${c.resourceType}:${c.cost}`).join(',');
  useEffect(() => {
    onGroupTotalRef.current?.(data.id, toMax);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id, totalKey]);

  return (
    <div className="bld-group">
      <div className="bld-group__header">
        <span className="bld-group__name">{data.name ?? `ID ${data.id}`} Lv.{Math.max(1, lvl)}</span>
        {/* 절대로 여기에 component 추가 금지.*/}
      </div>
      {status === 'normal' && (
        <div className="bld-row bld-row--header">
          <div className="bld-row__img-col" />
          <div className="bld-row__meter-col bld-row__col-label">진행도</div>
          <div className="bld-row__next-col bld-row__col-label">다음 업그레이드 시</div>
          <div className="bld-row__total-col bld-row__col-label">최대 업그레이드 시</div>
        </div>
      )}
      <div className="bld-row">
        <div className="bld-row__img-col">
          <img
            className="bld-row__img"
            src={`${import.meta.env.BASE_URL}images/${category}/${data.id}.png`}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
          />
          <LevelLabel lvl={lvl} gatedMax={maxLevel} absoluteMax={absoluteMax} />
        </div>
        <div className="bld-row__meter-col">
          {maxLevel > 0
            ? <ProgressMeter current={lvl} max={maxLevel} absoluteMax={absoluteMax} />
            : <span className="bld-row__no-data">데이터 없음</span>}
        </div>
        {status !== 'normal' ? (
          <div className={`bld-row__max-col bld-row__max-col--${status}`}>
            {status === 'th-max' ? '현재 홀의 최대 레벨' : '최대 레벨!'}
          </div>
        ) : (
          <>
            <div className="bld-row__next-col">
              {next
                ? <NextUpgradeBlock entry={next} multiplier={goldPassMultiplier} />
                : <span className="bld-row__at-max">—</span>}
            </div>
            <div className="bld-row__total-col">
              {remaining.length > 0 && <ToMaxBlock upgrades={remaining} multiplier={goldPassMultiplier} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ArmyEntry({
  id, lvl, labLevel, category, goldPassMultiplier, onGroupTotal,
}: {
  id: number; lvl: number; labLevel: number; category: string; goldPassMultiplier?: number;
  onGroupTotal?: (id: number, costs: SumEntry[]) => void;
}) {
  const { data, loading } = useItemData<ArmyItemData>(category, id);
  if (loading || !data || data.upgrade.length === 0) return null;
  return <ArmyRow lvl={lvl} data={data} labLevel={labLevel} category={category} goldPassMultiplier={goldPassMultiplier} onGroupTotal={onGroupTotal} />;
}

export function ArmyList({ items, labLevel, displayOrder, category, goldPassMultiplier }: Props) {
  const [groupTotals, setGroupTotals] = useState<Map<number, SumEntry[]>>(new Map());

  const reportGroupTotal = useCallback((id: number, costs: SumEntry[]) => {
    setGroupTotals((prev) => {
      const next = new Map(prev);
      next.set(id, costs);
      return next;
    });
  }, []);

  const listTotal = useMemo(() => aggregateCosts([...groupTotals.values()]), [groupTotals]);

  const levelMap = new Map<number, number>();
  for (const item of items) levelMap.set(item.data, item.lvl);

  const visible = displayOrder.filter((id) => levelMap.has(id));
  if (visible.length === 0) return <div className="bld-empty">데이터가 없습니다.</div>;

  return (
    <div className="bld-list">
      <ListSummaryBar totals={listTotal} />
      {visible.map((id) => (
        <ArmyEntry key={id} id={id} lvl={levelMap.get(id)!} labLevel={labLevel} category={category} goldPassMultiplier={goldPassMultiplier} onGroupTotal={reportGroupTotal} />
      ))}
    </div>
  );
}
