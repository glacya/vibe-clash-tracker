import { useState } from 'react';
import type { VillageEntry } from '../types/village';

interface Props {
  villages: VillageEntry[];
  selectedTag: string | null;
  onSelect: (tag: string) => void;
  onRename: (tag: string, nickname: string) => void;
  onDelete: (tag: string) => void;
}

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('ko-KR');
}

export function VillageTabs({ villages, selectedTag, onSelect, onRename, onDelete }: Props) {
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  function startEdit(entry: VillageEntry, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingTag(entry.tag);
    setEditValue(entry.nickname);
  }

  function commitEdit(tag: string) {
    const trimmed = editValue.trim();
    if (trimmed) onRename(tag, trimmed);
    setEditingTag(null);
  }

  function handleKeyDown(e: React.KeyboardEvent, tag: string) {
    if (e.key === 'Enter') commitEdit(tag);
    if (e.key === 'Escape') setEditingTag(null);
  }

  return (
    <nav className="village-tabs">
      <div className="village-tabs__header">계정</div>
      <ul className="village-tabs__list">
        {villages.map((entry) => {
          const isActive = entry.tag === selectedTag;
          const isEditing = editingTag === entry.tag;
          const latest = entry.snapshots[0];

          return (
            <li
              key={entry.tag}
              className={`village-tabs__item${isActive ? ' village-tabs__item--active' : ''}`}
              onClick={() => onSelect(entry.tag)}
            >
              <div className="village-tabs__body">
                {isEditing ? (
                  <input
                    className="village-tabs__nickname-input"
                    value={editValue}
                    autoFocus
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => commitEdit(entry.tag)}
                    onKeyDown={(e) => handleKeyDown(e, entry.tag)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="village-tabs__nickname">{entry.nickname}</span>
                )}
                <span className="village-tabs__tag">{entry.tag}</span>
                {latest && (
                  <span className="village-tabs__meta">
                    마을 데이터 {entry.snapshots.length}개<br></br>최신 {formatTimestamp(latest.timestamp)}
                  </span>
                )}
              </div>
              <div className="village-tabs__actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="village-tabs__btn"
                  title="닉네임 편집"
                  onClick={(e) => startEdit(entry, e)}
                >
                  ✎
                </button>
                <button
                  className="village-tabs__btn village-tabs__btn--danger"
                  title="마을 삭제"
                  onClick={() => {
                    if (confirm(`"${entry.nickname}" 마을과 모든 데이터를 삭제할까요?`)) {
                      onDelete(entry.tag);
                    }
                  }}
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
