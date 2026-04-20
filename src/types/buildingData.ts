export type ResourceType = 'elixir' | 'gold' | 'dark_elixir' | 'gem';
export type OreType = 'shiny' | 'glowy' | 'starry';

export interface UpgradeEntry {
  level: number;
  resource_type: ResourceType[];
  cost: number | null;
  time: number | null;
  town_hall: number | null;
}

export interface WeaponUpgradeEntry {
  level: number;
  resource_type: ResourceType[];
  cost: number | null;
  time: number | null;
}

export interface WeaponDataEntry {
  town_hall: number;
  name: string;
  upgrade: WeaponUpgradeEntry[];
}

export interface BuildingDataFile {
  id: number;
  name: string;
  available?: number[];
  gear_up?: true;
  upgrade: UpgradeEntry[];
}

export interface HeroUpgradeEntry {
  level: number;
  resource_type: ResourceType[];
  cost: number | null;
  time: number | null;
  hero_hall: number | null;
}

export interface HeroDataFile {
  id: number;
  name: string;
  hero_hall: number | null;
  upgrade: HeroUpgradeEntry[];
}

export interface ArmyUpgradeEntry {
  level: number;
  resource_type: ResourceType[];
  cost: number | null;
  time: number | null;
  laboratory: number | null;
}

export interface UnitDataFile {
  id: number;
  name?: string;
  barracks?: number;
  dark_barracks?: number;
  upgrade: ArmyUpgradeEntry[];
}

export interface SpellDataFile {
  id: number;
  name?: string;
  spell_factory?: number;
  dark_spell_factory?: number;
  upgrade: ArmyUpgradeEntry[];
}

export interface SiegeDataFile {
  id: number;
  name?: string;
  workshop?: number;
  upgrade: ArmyUpgradeEntry[];
}

export interface PetUpgradeEntry {
  level: number;
  resource_type: ResourceType[];
  cost: number | null;
  time: number | null;
  pet_house: number;
}

export interface PetDataFile {
  id: number;
  name: string;
  pet_house: number;
  upgrade: PetUpgradeEntry[];
}

export interface EquipmentCost {
  shiny: number;
  glowy: number;
  starry: number;
}

export interface EquipmentCostEntry {
  level: number;
  cost: EquipmentCost;
  blacksmith: number;
}

export interface EquipmentCostFile {
  rarity: string;
  upgrade: EquipmentCostEntry[];
}
