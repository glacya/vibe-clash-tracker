import type { VillageSnapshot } from '../types/village';
import { TOWN_HALL_ID, BUILDER_HALL_ID } from '../data/gameData';

interface Props {
  snapshots: VillageSnapshot[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
}

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString('ko-KR');
}

function getLevel(snapshot: VillageSnapshot, buildingId: number): number | null {
  const found = snapshot.buildings.find((b) => b.data === buildingId);
  return found?.lvl ?? null;
}

export function SnapshotList({ snapshots, selectedIndex, onSelect, onDelete }: Props) {
  if (snapshots.length === 0) return null;

  // 최신순 정렬 (이미 정렬된 상태이지만 보장)
  const sorted = [...snapshots]
    .map((s, originalIndex) => ({ s, originalIndex }))
    .sort((a, b) => b.s.timestamp - a.s.timestamp);

  return (
    <div className="snapshot-list">
      <h3 className="snapshot-list__title">저장된 마을 데이터</h3>
      <ul className="snapshot-list__items">
        {sorted.map(({ s, originalIndex }) => {
          const thLvl = getLevel(s, TOWN_HALL_ID);
          const bhLvl = getLevel(s, BUILDER_HALL_ID);
          const isActive = originalIndex === selectedIndex;

          return (
            <li
              key={originalIndex}
              className={`snapshot-list__item${isActive ? ' snapshot-list__item--active' : ''}`}
              onClick={() => onSelect(originalIndex)}
            >
              <div className="snapshot-list__info">
                <div className="snapshot-list__levels">
                  {thLvl !== null && (
                    <span className="snapshot-list__level">{thLvl}홀</span>
                  )}
                  
                  {bhLvl !== null && (
                    <span className="snapshot-list__level snapshot-list__level--builder">
                      {bhLvl}홀
                    </span>
                  )}
                </div>
                <span className="snapshot-list__date">{formatTimestamp(s.timestamp)}</span>
              </div>
              <button
                className="snapshot-list__delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(originalIndex);
                }}
                title="삭제"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
