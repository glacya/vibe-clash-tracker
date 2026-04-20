export interface Building {
  data: number;
  lvl: number;
  cnt?: number;
  timer?: number;
  gear_up?: number;
  weapon?: number;
  helper_recurrent?: boolean;
}

export interface Trap {
  data: number;
  lvl: number;
  cnt?: number;
}

export interface Deco {
  data: number;
  cnt?: number;
}

export interface Obstacle {
  data: number;
  cnt?: number;
}

export interface Unit {
  data: number;
  lvl: number;
  timer?: number;
}

export interface Hero {
  data: number;
  lvl: number;
}

export interface Spell {
  data: number;
  lvl: number;
}

export interface Pet {
  data: number;
  lvl: number;
}

export interface Equipment {
  data: number;
  lvl: number;
}

export interface Helper {
  data: number;
  lvl: number;
  helper_cooldown?: number;
}

export interface VillageSnapshot {
  tag: string;
  timestamp: number;
  buildings: Building[];
  traps: Trap[];
  decos: Deco[];
  obstacles: Obstacle[];
  units: Unit[];
  siege_machines: Unit[];
  heroes: Hero[];
  spells: Spell[];
  pets: Pet[];
  equipment: Equipment[];
  helpers?: Helper[];
}

/** tag 하나에 대응하는 마을 데이터 */
export interface VillageEntry {
  tag: string;
  nickname: string;
  /** 최신순 정렬 */
  snapshots: VillageSnapshot[];
}

/** localStorage에 저장되는 전체 데이터 */
export type VillageMap = Record<string, VillageEntry>;
