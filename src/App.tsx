import { useState, useEffect } from 'react';
import { JsonPaste } from './components/JsonPaste';
import { VillageTabs } from './components/VillageTabs';
import { SnapshotList } from './components/SnapshotList';
import { VillageOverview } from './components/VillageOverview';
import { CreditPage } from './components/CreditPage';
import type { VillageSnapshot, VillageMap } from './types/village';
import './App.css';

const STORAGE_KEY = 'clash_tracker_data';

function loadFromStorage(): VillageMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as VillageMap) : {};
  } catch {
    return {};
  }
}

function saveToStorage(map: VillageMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export default function App() {
  const [villageMap, setVillageMap] = useState<VillageMap>(loadFromStorage);
  const [selectedTag, setSelectedTag] = useState<string | null>(() => {
    const keys = Object.keys(loadFromStorage());
    return keys[0] ?? null;
  });
  const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState(0);
  const [showPaste, setShowPaste] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  useEffect(() => {
    saveToStorage(villageMap);
  }, [villageMap]);

  // 마을 목록 (추가 순서 유지: 처음 등록된 스냅샷의 timestamp 기준)
  const villages = Object.values(villageMap).sort((a, b) => {
    const aFirst = a.snapshots[a.snapshots.length - 1]?.timestamp ?? 0;
    const bFirst = b.snapshots[b.snapshots.length - 1]?.timestamp ?? 0;
    return aFirst - bFirst;
  });

  function handleLoad(snapshot: VillageSnapshot) {
    setVillageMap((prev) => {
      const existing = prev[snapshot.tag];
      if (existing) {
        // 같은 tag: 기존 마을에 스냅샷 추가 (최신순 정렬)
        const snapshots = [snapshot, ...existing.snapshots].sort(
          (a, b) => b.timestamp - a.timestamp,
        );
        return { ...prev, [snapshot.tag]: { ...existing, snapshots } };
      } else {
        // 새 마을: 닉네임 자동 부여
        const villageCount = Object.keys(prev).length + 1;
        return {
          ...prev,
          [snapshot.tag]: {
            tag: snapshot.tag,
            nickname: `마을 #${villageCount}`,
            snapshots: [snapshot],
          },
        };
      }
    });
    setSelectedTag(snapshot.tag);
    setSelectedSnapshotIndex(0);
    setShowPaste(false);
  }

  function handleRename(tag: string, nickname: string) {
    setVillageMap((prev) => ({
      ...prev,
      [tag]: { ...prev[tag], nickname },
    }));
  }

  function handleDeleteVillage(tag: string) {
    setVillageMap((prev) => {
      const next = { ...prev };
      delete next[tag];
      return next;
    });
    setSelectedTag((prev) => {
      if (prev !== tag) return prev;
      const remaining = Object.keys(villageMap).filter((t) => t !== tag);
      return remaining[0] ?? null;
    });
  }

  function handleDeleteSnapshot(index: number) {
    if (!selectedTag) return;
    setVillageMap((prev) => {
      const entry = prev[selectedTag];
      const snapshots = entry.snapshots.filter((_, i) => i !== index);
      if (snapshots.length === 0) {
        // 스냅샷 전부 삭제 시 마을도 제거
        const next = { ...prev };
        delete next[selectedTag];
        return next;
      }
      return { ...prev, [selectedTag]: { ...entry, snapshots } };
    });
    setSelectedSnapshotIndex((prev) => Math.max(0, prev > index ? prev - 1 : prev));
  }

  const selectedVillage = selectedTag ? villageMap[selectedTag] ?? null : null;
  const selectedSnapshot = selectedVillage?.snapshots[selectedSnapshotIndex] ?? null;

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title" onClick={() => setShowCredits(true)}>Vibe Clash Tracker</h1>
        <div className="app__header-actions">
          <button className="app__add-btn" onClick={() => setShowPaste((v) => !v)}>
            {showPaste ? '닫기' : '+ 마을 데이터 추가'}
          </button>
          <button className="app__credit-btn" onClick={() => setShowCredits(true)}>
            크레딧
          </button>
        </div>
      </header>

      {showCredits && <CreditPage onClose={() => setShowCredits(false)} />}

      <div className="app__body">
        {/* 왼쪽: 마을 탭 */}
        <aside className="app__village-sidebar">
          <VillageTabs
            villages={villages}
            selectedTag={selectedTag}
            onSelect={(tag) => {
              setSelectedTag(tag);
              setSelectedSnapshotIndex(0);
            }}
            onRename={handleRename}
            onDelete={handleDeleteVillage}
          />
        </aside>

        {/* 오른쪽: 메인 영역 */}
        <main className="app__main">
          {showPaste && (
            <div className="app__paste-panel">
              <JsonPaste onLoad={handleLoad} />
            </div>
          )}

          {villages.length === 0 && !showPaste ? (
            <div className="app__empty">
              <p>저장된 마을이 없습니다.</p>
              <button className="app__add-btn" onClick={() => setShowPaste(true)}>
                첫 번째 마을 데이터 추가하기
              </button>
            </div>
          ) : selectedVillage ? (
            <div className="app__content">
              <div className="app__snapshot-sidebar">
                <SnapshotList
                  snapshots={selectedVillage.snapshots}
                  selectedIndex={selectedSnapshotIndex}
                  onSelect={setSelectedSnapshotIndex}
                  onDelete={handleDeleteSnapshot}
                />
              </div>
              <div className="app__detail">
                {selectedSnapshot && (
                  <VillageOverview
                    snapshot={selectedSnapshot}
                    nickname={selectedVillage.nickname}
                  />
                )}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
