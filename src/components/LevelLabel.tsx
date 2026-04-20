export type LevelStatus = 'normal' | 'th-max' | 'full-max';

export function getLevelStatus(
  lvl: number,
  gatedMax: number,
  absoluteMax: number,
): LevelStatus {
  if (absoluteMax > 0 && lvl >= absoluteMax) return 'full-max';
  if (gatedMax > 0 && lvl >= gatedMax) return 'th-max';
  return 'normal';
}

export function getAbsoluteMax(upgrade: { level: number }[]): number {
  return upgrade.length > 0 ? Math.max(...upgrade.map((u) => u.level)) : 0;
}

const STATUS_CLASS: Record<LevelStatus, string> = {
  normal: '',
  'th-max': 'bld-row__lvl--th-max',
  'full-max': 'bld-row__lvl--full-max',
};

interface Props {
  lvl: number;
  gatedMax: number;
  absoluteMax: number;
}

export function LevelLabel({ lvl, gatedMax, absoluteMax }: Props) {
  const status = getLevelStatus(lvl, gatedMax, absoluteMax);
  const cls = STATUS_CLASS[status];
  return <span className={`bld-row__lvl${cls ? ` ${cls}` : ''}`}>Lv.{lvl}</span>;
}
