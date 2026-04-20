import type { Equipment } from '../types/village';
import type { EquipmentCostEntry, EquipmentCostFile, OreType } from '../types/buildingData';
import { useItemData } from '../hooks/useItemData';
import { EQUIPMENT_HERO_ORDER, EQUIPMENT_NAMES, NORMAL_EQUIPMENT_IDS } from '../data/gameData';
import { LevelLabel, getAbsoluteMax, getLevelStatus } from './LevelLabel';
import { ProgressMeter } from './ProgressMeter';

const ORE_COLOR: Record<string, string> = {
  shiny: '#7eb8f7',
  glowy: '#c97de8',
  starry: '#c8a84b',
};

const ORE_KEYS = ['shiny', 'glowy', 'starry'] as const;

function formatCost(n: number): string {
  return n.toLocaleString('en-US');
}

function getMaxLevel(upgrade: EquipmentCostEntry[], smithLevel: number): number {
  const achievable = upgrade.filter((e) => e.blacksmith <= smithLevel);
  return achievable.length === 0 ? 0 : Math.max(...achievable.map((e) => e.level));
}

function getRemainingUpgrades(
  upgrade: EquipmentCostEntry[],
  currentLevel: number,
  smithLevel: number,
): EquipmentCostEntry[] {
  return upgrade.filter((e) => e.level > currentLevel && e.blacksmith <= smithLevel);
}

function hasAnyCost(e: EquipmentCostEntry): boolean {
  return e.cost.shiny > 0 || e.cost.glowy > 0 || e.cost.starry > 0;
}

function sumOre(entries: EquipmentCostEntry[]): Record<string, number> {
  return entries.reduce(
    (acc, e) => ({
      shiny: acc.shiny + e.cost.shiny,
      glowy: acc.glowy + e.cost.glowy,
      starry: acc.starry + e.cost.starry,
    }),
    { shiny: 0, glowy: 0, starry: 0 },
  );
}

function OreDisplay({ cost, oreType }: { cost: number, oreType: OreType}) {
  const color = ORE_COLOR[oreType];
  return (
    <span className="cost-display">
      <span className="cost-display__num" style={{ color }}>{formatCost(cost)}</span>
      <img className="cost-icon" src={`/images/common/${oreType}_ore.png`} alt={oreType}/>
    </span>
  )
}

function OreCostBlock({ entry }: { entry: EquipmentCostEntry }) {
  const types = ORE_KEYS.filter((t) => entry.cost[t] > 0);
  if (types.length === 0) return null;
  return (
    <div className="cost-time-block">
      {types.map((t) => (
        <div key={t} className="cost-time-block__row">
          <OreDisplay cost={entry.cost[t]} oreType={t}/>
        </div>
      ))}
    </div>
  );
}

function OreSumBlock({ entries }: { entries: EquipmentCostEntry[] }) {
  const sum = sumOre(entries);
  const types = ORE_KEYS.filter((t) => sum[t] > 0);
  if (types.length === 0) return null;
  return (
    <div className="cost-time-block">
      {types.map((t) => (
        <div key={t} className="cost-time-block__row">
          <OreDisplay cost={sum[t]} oreType={t}/>
        </div>
      ))}
    </div>
  );
}

const RARITY_LABEL: Record<'normal' | 'epic', string> = {
  normal: '일반',
  epic: '초희귀',
};
const RARITY_COLOR: Record<'normal' | 'epic', string> = {
  normal: '#7eb8f7',
  epic: '#e83a5e',
};

function EquipmentRow({
  id,
  lvl,
  smithLevel,
  costTable,
  rarity,
}: {
  id: number;
  lvl: number;
  smithLevel: number;
  costTable: EquipmentCostEntry[];
  rarity: 'normal' | 'epic';
}) {
  const name = EQUIPMENT_NAMES[id] ?? `ID ${id}`;
  const maxLevel = getMaxLevel(costTable, smithLevel);
  const absoluteMax = getAbsoluteMax(costTable);
  const remaining = getRemainingUpgrades(costTable, lvl, smithLevel);
  const remainingWithCost = remaining.filter(hasAnyCost);
  const next = remaining[0] ?? null;
  const status = getLevelStatus(lvl, maxLevel, absoluteMax);

  return (
    <div className="bld-group">
      <div className="bld-group__header">
        <span className="bld-group__name">
          {name}{' '}Lv.{Math.max(1, lvl)}{' '}
          <span style={{ color: RARITY_COLOR[rarity], fontSize: '0.8em', fontWeight: 600 }}>
            {RARITY_LABEL[rarity]}
          </span>
        </span>
        {/* <div className="bld-group__total">
          {remainingWithCost.length > 0 ? <OreSumBlock entries={remainingWithCost} /> : null}
        </div> */}
      </div>
      <div className="bld-row bld-row--header">
        <div className="bld-row__img-col" />
        <div className="bld-row__meter-col bld-row__col-label">진행도</div>
        <div className="bld-row__next-col bld-row__col-label">다음 업그레이드 시</div>
        <div className="bld-row__total-col bld-row__col-label">최대 업그레이드 시</div>
      </div>
      <div className="bld-row">
        <div className="bld-row__img-col">
          <img
            className="bld-row__img"
            src={`/images/equipment/${id}.png`}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
          />
          <LevelLabel lvl={lvl} gatedMax={maxLevel} absoluteMax={absoluteMax} />
        </div>
        <div className="bld-row__meter-col">
          {maxLevel > 0 ? (
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
              {next && hasAnyCost(next)
                ? <OreCostBlock entry={next} />
                : <span className="bld-row__at-max">—</span>}
            </div>
            <div className="bld-row__total-col">
              {remainingWithCost.length > 0 && <OreSumBlock entries={remainingWithCost} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface Props {
  equipment: Equipment[];
  smithLevel: number;
  heroId: number;
}

export function EquipmentList({ equipment, smithLevel, heroId }: Props) {
  const { data: commonCosts, loading: loadingCommon } = useItemData<EquipmentCostFile>(
    'equipment',
    'common',
  );
  const { data: epicCosts, loading: loadingEpic } = useItemData<EquipmentCostFile>(
    'equipment',
    'epic',
  );

  if (loadingCommon || loadingEpic) {
    return <div className="bld-empty">데이터 로딩 중...</div>;
  }
  if (!commonCosts || !epicCosts) {
    return <div className="bld-empty">데이터를 불러올 수 없습니다.</div>;
  }

  const levelMap = new Map<number, number>(equipment.map((e) => [e.data, e.lvl]));

  const section = EQUIPMENT_HERO_ORDER.find((s) => s.heroId === heroId);
  if (!section) return <div className="bld-empty">데이터가 없습니다.</div>;

  const visible = section.equipIds.filter((id) => levelMap.has(id));
  if (visible.length === 0) {
    return <div className="bld-empty">데이터가 없습니다.</div>;
  }

  return (
    <div className="bld-list">
      {visible.map((id) => {
        const costTable = NORMAL_EQUIPMENT_IDS.has(id)
          ? commonCosts.upgrade
          : epicCosts.upgrade;
        return (
          <EquipmentRow
            key={id}
            id={id}
            lvl={levelMap.get(id)!}
            smithLevel={smithLevel}
            costTable={costTable}
            rarity={NORMAL_EQUIPMENT_IDS.has(id) ? 'normal' : 'epic'}
          />
        );
      })}
    </div>
  );
}
