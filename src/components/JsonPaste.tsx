import { useState } from 'react';
import type { VillageSnapshot } from '../types/village';

interface Props {
  onLoad: (snapshot: VillageSnapshot) => void;
}

export function JsonPaste({ onLoad }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    try {
      const json = JSON.parse(text.trim()) as VillageSnapshot;
      if (!json.tag || !json.timestamp) {
        setError('올바른 마을 데이터가 아닙니다. (tag 또는 timestamp 필드 없음)');
        return;
      }
      setError('');
      setText('');
      onLoad(json);
    } catch {
      setError('JSON 파싱 오류: 붙여넣은 내용을 확인해주세요.');
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = e.clipboardData.getData('text');
    setText(pasted);
    // 붙여넣기 직후 자동 파싱 시도
    setTimeout(() => {
      try {
        const json = JSON.parse(pasted.trim()) as VillageSnapshot;
        if (json.tag && json.timestamp) {
          setError('');
          setText('');
          onLoad(json);
        }
      } catch {
        // 자동 파싱 실패 시 무시 — 사용자가 버튼으로 제출
      }
    }, 0);
  }

  return (
    <div className="json-paste">
      <h2 className="json-paste__title">마을 데이터 붙여넣기</h2>
      <p className="json-paste__desc">
        <strong>설정 - 추가 설정 - 마을 데이터를 JSON 형식으로 내보내기</strong><br></br>
        이후 복사된 텍스트를 아래 칸에 붙여넣으세요. 마을 데이터를 쉽게 저장할 수 있습니다!
      </p>
      <textarea
        className="json-paste__area"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={handlePaste}
        placeholder='{"tag": "#XXXX", "timestamp": ..., "buildings": [...], ...}'
        rows={8}
        spellCheck={false}
      />
      {error && <p className="json-paste__error">{error}</p>}
      <button
        className="json-paste__btn"
        onClick={handleSubmit}
        disabled={!text.trim()}
      >
        불러오기
      </button>
    </div>
  );
}
