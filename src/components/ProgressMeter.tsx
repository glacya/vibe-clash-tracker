import { getLevelStatus, type LevelStatus } from './LevelLabel';

const FILLED_CLASS: Record<LevelStatus, string> = {
  normal:     'progress-meter__block--filled',
  'th-max':   'progress-meter__block--max',
  'full-max': 'progress-meter__block--full-max',
};

interface Props {
  current: number;
  max: number;
  absoluteMax?: number;
}

export function ProgressMeter({ current, max, absoluteMax = 0 }: Props) {
  const status = getLevelStatus(current, max, absoluteMax);
  const filledClass = FILLED_CLASS[status];

  return (
    <div className="progress-meter">
      <div className="progress-meter__blocks">
        {Array.from({ length: max }, (_, i) => (
          <div
            key={i}
            className={`progress-meter__block${
              i < current ? ` ${filledClass}` : ' progress-meter__block--empty'
            }`}
          />
        ))}
      </div>
      <span className="progress-meter__label">Lv.{current} / Lv.{max}</span>
    </div>
  );
}
