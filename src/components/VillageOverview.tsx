import { useState } from 'react';
import type { VillageSnapshot } from '../types/village';
import {
  BUILDER_HUT_IDS,
  TOWN_HALL_ID,
  DEFENSE_BUILDING_IDS,
  ARMY_BUILDING_IDS,
  ARMY_BUILDING_ORDER,
  RESOURCE_BUILDING_IDS,
  RESOURCE_BUILDING_ORDER,
  ELIXIR_UNIT_ORDER,
  DARK_UNIT_ORDER,
  ELIXIR_SPELL_ORDER,
  DARK_SPELL_ORDER,
  SIEGE_ORDER,
  HERO_NAMES,
} from '../data/gameData';
import { BuildingList } from './BuildingList';
import { TrapList } from './TrapList';
import { HeroList } from './HeroList';
import { PetList } from './PetList';
import { ArmyList } from './ArmyList';
import { EquipmentList } from './EquipmentList';

interface Props {
  snapshot: VillageSnapshot;
  nickname: string;
}

type BaseTab = 'village' | 'builder';
type VillageTab = 'buildings' | 'army' | 'heroes' | 'equipment' | 'pets';
type BuildingTab = 'defense' | 'army-bldg' | 'resources' | 'traps';
type ArmyTab = 'elixir-units' | 'elixir-spells' | 'dark-units' | 'dark-spells' | 'siege';
type EquipHeroTab = '28000000' | '28000001' | '28000002' | '28000004' | '28000006' | '28000007';

const VILLAGE_TAB_LABELS: Record<VillageTab, string> = {
  buildings: '건물',
  army: '군대',
  heroes: '영웅',
  equipment: '장비',
  pets: '펫',
};

const BUILDING_TAB_LABELS: Record<BuildingTab, string> = {
  defense: '방어',
  'army-bldg': '군대',
  resources: '자원',
  traps: '함정',
};

const ARMY_TAB_LABELS: Record<ArmyTab, string> = {
  'elixir-units': '엘릭서 유닛',
  'elixir-spells': '엘릭서 마법',
  'dark-units': '다크 엘릭서 유닛',
  'dark-spells': '다크 엘릭서 마법',
  siege: '시즈 머신',
};

const EQUIP_HERO_TABS: EquipHeroTab[] = [
  '28000000', '28000001', '28000002', '28000004', '28000006', '28000007',
];

const EQUIP_HERO_TAB_LABELS: Record<EquipHeroTab, string> = {
  '28000000': HERO_NAMES[28000000],
  '28000001': HERO_NAMES[28000001],
  '28000002': HERO_NAMES[28000002],
  '28000004': HERO_NAMES[28000004],
  '28000006': HERO_NAMES[28000006],
  '28000007': HERO_NAMES[28000007],
};

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString('ko-KR');
}

function TabBar<T extends string>({
  tabs,
  active,
  labels,
  onSelect,
  sub,
}: {
  tabs: T[];
  active: T;
  labels: Record<T, string>;
  onSelect: (t: T) => void;
  sub?: boolean;
}) {
  return (
    <div className={`content-tabs${sub ? ' content-tabs--sub' : ''}`}>
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`content-tab${sub ? ' content-tab--sub' : ''}${active === tab ? ' content-tab--active' : ''}`}
          onClick={() => onSelect(tab)}
        >
          {labels[tab]}
        </button>
      ))}
    </div>
  );
}

export function VillageOverview({ snapshot, nickname }: Props) {
  const [baseTab, setBaseTab] = useState<BaseTab>('village');
  const [villageTab, setVillageTab] = useState<VillageTab>('buildings');
  const [buildingTab, setBuildingTab] = useState<BuildingTab>('defense');
  const [armyTab, setArmyTab] = useState<ArmyTab>('elixir-units');
  const [equipHeroTab, setEquipHeroTab] = useState<EquipHeroTab>('28000000');
  const [goldPass, setGoldPass] = useState(false);
  const goldPassMultiplier = goldPass ? 0.8 : 1;

  const thBuilding = snapshot.buildings.find((b) => b.data === TOWN_HALL_ID);
  const thLevel = thBuilding?.lvl ?? 1;
  const weaponLevel = thBuilding?.weapon;
  const heroHallLevel = snapshot.buildings.find((b) => b.data === 1000071)?.lvl ?? 0;
  const petHouseLevel = snapshot.buildings.find((b) => b.data === 1000068)?.lvl ?? 0;
  const labLevel = snapshot.buildings.find((b) => b.data === 1000007)?.lvl ?? 0;
  const smithLevel = snapshot.buildings.find((b) => b.data === 1000070)?.lvl ?? 0;
  const workshopLevel = snapshot.buildings.find((b) => b.data === 1000059)?.lvl ?? 0;
  const darkBarracksLevel = snapshot.buildings.find((b) => b.data === 1000026)?.lvl ?? 0;
  const spellFactoryLevel = snapshot.buildings.find((b) => b.data === 1000020)?.lvl ?? 0;
  const darkSpellFactoryLevel = snapshot.buildings.find((b) => b.data === 1000029)?.lvl ?? 0;
  const builderCount = snapshot.buildings
    .filter((b) => BUILDER_HUT_IDS.has(b.data))
    .reduce((sum, b) => sum + (b.cnt ?? 1), 0);

  function getBuildingInfo(): string {
    const base = `${thLevel}홀`;
    if (villageTab === 'army') {
      return armyTab === 'siege'
        ? `${base}, 작업장 ${workshopLevel}레벨`
        : `${base}, 연구소 ${labLevel}레벨`;
    }
    if (villageTab === 'heroes') return `${base}, 영웅 회관 ${heroHallLevel}레벨`;
    if (villageTab === 'equipment') return `${base}, 대장간 ${smithLevel}레벨`;
    if (villageTab === 'pets') return `${base}, 펫 하우스 ${petHouseLevel}레벨`;
    return base;
  }

  return (
    <div className="overview">
      {/* 헤더 */}
      <div className="overview__header">
        <div className="overview__title-group">
          <div className="overview__title-row">
            <h2 className="overview__nickname">{nickname}</h2>
            <span className="overview__time">{formatTimestamp(snapshot.timestamp)}</span>
          </div>
          <div className="overview__badges">
            <div className="overview__badge overview__badge--th">
              <img
                className="overview__badge-img overview__badge-img--th"
                src={`${import.meta.env.BASE_URL}images/buildings/${TOWN_HALL_ID}/${thLevel}.png`}
                alt=""
              />
              <span className="overview__badge-label--th">{thLevel}홀</span>
            </div>
            <div className="overview__badge">
              <img
                className="overview__badge-img"
                src={`${import.meta.env.BASE_URL}images/buildings/1000015/1.png`}
                alt=""
              />
              <span className="overview__badge-label">× {builderCount}</span>
            </div>
          </div>
        </div>
        <div className="overview__base-toggle">
          <button
            className={`toggle-btn${baseTab === 'village' ? ' toggle-btn--active' : ''}`}
            onClick={() => setBaseTab('village')}
          >
            마을
          </button>
          <button
            className={`toggle-btn${baseTab === 'builder' ? ' toggle-btn--active' : ''}`}
            onClick={() => setBaseTab('builder')}
          >
            장인 기지
          </button>
        </div>
      </div>

      {/* 마을 */}
      {baseTab === 'village' && (
        <div className="overview__content">
          <div className="overview__tabs-sticky">
            <div className="overview__builders">
              {/* 장인 {builderCount}명 */}
              <span className="overview__bldg-info">{getBuildingInfo()}</span>
              <label className="gold-pass-label">
                <input
                  type="checkbox"
                  checked={goldPass}
                  onChange={(e) => setGoldPass(e.target.checked)}
                />
                골드 패스 적용
              </label>
            </div>

            {/* 1단계: 건물 / 군대 / 영웅 / 장비 / 펫 */}
            <TabBar
              tabs={['buildings', 'army', 'heroes', 'equipment', 'pets'] as VillageTab[]}
              active={villageTab}
              labels={VILLAGE_TAB_LABELS}
              onSelect={setVillageTab}
            />

            {/* 2단계 건물 */}
            {villageTab === 'buildings' && (
              <TabBar
                tabs={['defense', 'army-bldg', 'resources', 'traps'] as BuildingTab[]}
                active={buildingTab}
                labels={BUILDING_TAB_LABELS}
                onSelect={setBuildingTab}
                sub
              />
            )}

            {/* 2단계 군대 */}
            {villageTab === 'army' && (
              <TabBar
                tabs={['elixir-units', 'elixir-spells', 'dark-units', 'dark-spells', 'siege'] as ArmyTab[]}
                active={armyTab}
                labels={ARMY_TAB_LABELS}
                onSelect={setArmyTab}
                sub
              />
            )}

            {/* 2단계 장비: 영웅별 */}
            {villageTab === 'equipment' && (
              <TabBar
                tabs={EQUIP_HERO_TABS}
                active={equipHeroTab}
                labels={EQUIP_HERO_TAB_LABELS}
                onSelect={setEquipHeroTab}
                sub
              />
            )}
          </div>

          <div className="overview__panel">
            {villageTab === 'buildings' && buildingTab === 'defense' && (
              <BuildingList buildings={snapshot.buildings} thLevel={thLevel} allowedIds={DEFENSE_BUILDING_IDS} weaponLevel={weaponLevel} goldPassMultiplier={goldPassMultiplier} excludeWallFromSummary />
            )}
            {villageTab === 'buildings' && buildingTab === 'army-bldg' && (
              <BuildingList
                buildings={snapshot.buildings}
                thLevel={thLevel}
                allowedIds={ARMY_BUILDING_IDS}
                orderIds={ARMY_BUILDING_ORDER}
                hideCountOne
                goldPassMultiplier={goldPassMultiplier}
              />
            )}
            {villageTab === 'buildings' && buildingTab === 'resources' && (
              <BuildingList
                buildings={snapshot.buildings}
                thLevel={thLevel}
                allowedIds={RESOURCE_BUILDING_IDS}
                orderIds={RESOURCE_BUILDING_ORDER}
                goldPassMultiplier={goldPassMultiplier}
              />
            )}
            {villageTab === 'buildings' && buildingTab === 'traps' && (
              <TrapList traps={snapshot.traps ?? []} thLevel={thLevel} goldPassMultiplier={goldPassMultiplier} />
            )}
            {villageTab === 'army' && armyTab === 'elixir-units' && (
              <ArmyList items={snapshot.units} labLevel={labLevel} displayOrder={ELIXIR_UNIT_ORDER} category="units" goldPassMultiplier={goldPassMultiplier} />
            )}
            {villageTab === 'army' && armyTab === 'elixir-spells' && (
              spellFactoryLevel === 0
                ? <div className="overview__unlock-msg">마법 제작소 필요 (5홀에서 해금)</div>
                : <ArmyList items={snapshot.spells} labLevel={labLevel} displayOrder={ELIXIR_SPELL_ORDER} category="spells" goldPassMultiplier={goldPassMultiplier} />
            )}
            {villageTab === 'army' && armyTab === 'dark-units' && (
              darkBarracksLevel === 0
                ? <div className="overview__unlock-msg">암흑 병사 훈련소 필요 (7홀에서 해금)</div>
                : <ArmyList items={snapshot.units} labLevel={labLevel} displayOrder={DARK_UNIT_ORDER} category="units" goldPassMultiplier={goldPassMultiplier} />
            )}
            {villageTab === 'army' && armyTab === 'dark-spells' && (
              darkSpellFactoryLevel === 0
                ? <div className="overview__unlock-msg">암흑 마법 제작소 필요 (8홀에서 해금)</div>
                : <ArmyList items={snapshot.spells} labLevel={labLevel} displayOrder={DARK_SPELL_ORDER} category="spells" goldPassMultiplier={goldPassMultiplier} />
            )}
            {villageTab === 'army' && armyTab === 'siege' && (
              workshopLevel === 0
                ? <div className="overview__unlock-msg">작업장 필요 (12홀에서 해금)</div>
                : <ArmyList items={snapshot.siege_machines} labLevel={labLevel} displayOrder={SIEGE_ORDER} category="siege_machines" goldPassMultiplier={goldPassMultiplier} />
            )}
            {villageTab === 'heroes' && (
              heroHallLevel === 0
                ? <div className="overview__unlock-msg">영웅 회관 필요 (7홀에서 해금)</div>
                : <HeroList heroBuildings={snapshot.heroes} heroHallLevel={heroHallLevel} goldPassMultiplier={goldPassMultiplier} />
            )}
            {villageTab === 'equipment' && (
              smithLevel === 0
                ? <div className="overview__unlock-msg">대장간 필요 (8홀에서 해금)</div>
                : <EquipmentList
                    equipment={snapshot.equipment}
                    smithLevel={smithLevel}
                    heroId={parseInt(equipHeroTab)}
                    snapshotId={snapshot.timestamp}
                  />
            )}
            {villageTab === 'pets' && (
              petHouseLevel === 0
                ? <div className="overview__unlock-msg">펫 하우스 필요 (14홀에서 해금)</div>
                : <PetList pets={snapshot.pets} petHouseLevel={petHouseLevel} goldPassMultiplier={goldPassMultiplier} />
            )}
          </div>
        </div>
      )}

      {/* 장인 기지 — 추후 구현 */}
      {baseTab === 'builder' && (
        <div className="overview__content">
          <div className="overview__panel overview__panel--empty">
            장인 기지 콘텐츠 준비 중
          </div>
        </div>
      )}
    </div>
  );
}
