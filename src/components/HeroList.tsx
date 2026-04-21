import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Building } from '../types/village';
import type { HeroDataFile, HeroUpgradeEntry, ResourceType } from '../types/buildingData';
import { useItemData } from '../hooks/useItemData';
import { VILLAGE_HERO_IDS } from '../data/gameData';
import { LevelLabel, getAbsoluteMax, getLevelStatus } from './LevelLabel';
import { ProgressMeter } from './ProgressMeter';

interface Props {
  heroBuildings: Building[];
  heroHallLevel: number;
  goldPassMultiplier?: number;
}

const HERO_DISPLAY_ORDER = [28000000, 28000001, 28000006, 28000002, 28000004, 28000007];

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

function getMaxLevelForHH(upgrade: HeroUpgradeEntry[], heroHallLevel: number): number {
  const achievable = upgrade.filter((u) => u.hero_hall === null || u.hero_hall <= heroHallLevel);
  return achievable.length === 0 ? 0 : Math.max(...achievable.map((u) => u.level));
}

function getRemainingUpgrades(upgrade: HeroUpgradeEntry[], currentLevel: number, heroHallLevel: number): HeroUpgradeEntry[] {
  return upgrade.filter((u) => u.level > currentLevel && (u.hero_hall === null || u.hero_hall <= heroHallLevel));
}

interface SumEntry { resourceType: ResourceType; cost: number; time: number; }

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

function NextUpgradeBlock({ entry, multiplier = 1 }: { entry: HeroUpgradeEntry; multiplier?: number }) {
  if (entry.cost === null && entry.time === null) return null;
  return (
    <div className="cost-time-block">
      {entry.resource_type.map((rt) => (
        <div key={rt} className="cost-time-block__row">
          {entry.cost !== null && <CostDisplay cost={Math.round(entry.cost * multiplier)} resourceType={rt} />}
          {entry.time !== null && entry.time > 0 && (
            <span className="cost-time-block__time">{formatTime(Math.round(entry.time * multiplier))}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ToMaxBlock({ upgrades, multiplier = 1 }: { upgrades: HeroUpgradeEntry[]; multiplier?: number }) {
  const totals = new Map<ResourceType, { cost: number; time: number }>();
  for (const u of upgrades) {
    if (u.cost === null) continue;
    for (const rt of u.resource_type) {
      const p = totals.get(rt) ?? { cost: 0, time: 0 };
      totals.set(rt, { cost: p.cost + u.cost, time: p.time + (u.time ?? 0) });
    }
  }
  if (totals.size === 0) return null;
  return (
    <div className="cost-time-block">
      {[...totals.entries()].map(([rt, { cost, time }]) => (
        <div key={rt} className="cost-time-block__row">
          <CostDisplay cost={Math.round(cost * multiplier)} resourceType={rt} />
          {time > 0 && <span className="cost-time-block__time">{formatTime(Math.round(time * multiplier))}</span>}
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

function HeroRow({
  id, lvl, data, heroHallLevel, goldPassMultiplier = 1, onGroupTotal,
}: {
  id: number; lvl: number; data: HeroDataFile; heroHallLevel: number;
  goldPassMultiplier?: number; onGroupTotal?: (id: number, costs: SumEntry[]) => void;
}) {
  const { upgrade } = data;
  const maxLevel = getMaxLevelForHH(upgrade, heroHallLevel);
  const absoluteMax = getAbsoluteMax(upgrade);
  const remaining = getRemainingUpgrades(upgrade, lvl, heroHallLevel);
  const nextUpgrade = remaining[0] ?? null;
  const status = getLevelStatus(lvl, maxLevel, absoluteMax);

  const toMax: SumEntry[] = [];
  {
    const totals = new Map<ResourceType, { cost: number; time: number }>();
    for (const u of remaining) {
      if (u.cost === null) continue;
      for (const rt of u.resource_type) {
        const p = totals.get(rt) ?? { cost: 0, time: 0 };
        totals.set(rt, { cost: p.cost + u.cost, time: p.time + (u.time ?? 0) });
      }
    }
    for (const [resourceType, { cost, time }] of totals) {
      toMax.push({ resourceType, cost: Math.round(cost * goldPassMultiplier), time: Math.round(time * goldPassMultiplier) });
    }
  }

  const onGroupTotalRef = useRef(onGroupTotal);
  useEffect(() => { onGroupTotalRef.current = onGroupTotal; });
  const totalKey = toMax.map((c) => `${c.resourceType}:${c.cost}`).join(',');
  useEffect(() => {
    onGroupTotalRef.current?.(id, toMax);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, totalKey]);

  return (
    <div className="bld-group">
      <div className="bld-group__header">
        <span className="bld-group__name">{data.name} Lv.{Math.max(1, lvl)}</span>
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
            src={`${import.meta.env.BASE_URL}images/heroes/${id}.png`}
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
              {nextUpgrade
                ? <NextUpgradeBlock entry={nextUpgrade} multiplier={goldPassMultiplier} />
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

function HeroEntry({
  id, lvl, heroHallLevel, goldPassMultiplier, onGroupTotal,
}: {
  id: number; lvl: number; heroHallLevel: number; goldPassMultiplier?: number;
  onGroupTotal?: (id: number, costs: SumEntry[]) => void;
}) {
  const { data: heroData, loading } = useItemData<HeroDataFile>('heroes', id);
  if (loading) return null;
  if (!heroData) return null;
  if (heroData.hero_hall !== null && heroHallLevel < heroData.hero_hall) return null;
  return <HeroRow id={id} lvl={lvl} data={heroData} heroHallLevel={heroHallLevel} goldPassMultiplier={goldPassMultiplier} onGroupTotal={onGroupTotal} />;
}

export function HeroList({ heroBuildings, heroHallLevel, goldPassMultiplier }: Props) {
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
  for (const b of heroBuildings) {
    if (VILLAGE_HERO_IDS.has(b.data)) levelMap.set(b.data, b.lvl);
  }

  if (levelMap.size === 0) return <div className="bld-empty">영웅 데이터가 없습니다.</div>;

  return (
    <div className="bld-list">
      <ListSummaryBar totals={listTotal} />
      {HERO_DISPLAY_ORDER
        .filter((id) => levelMap.has(id))
        .map((id) => (
          <HeroEntry key={id} id={id} lvl={levelMap.get(id)!} heroHallLevel={heroHallLevel} goldPassMultiplier={goldPassMultiplier} onGroupTotal={reportGroupTotal} />
        ))}
    </div>
  );
}
