import { useState, useEffect } from 'react';

// category/id 키로 공유 캐시
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, any | null>();

/**
 * "1d 2h 30m 45s" 형태의 문자열을 초(number)로 변환합니다.
 * null / undefined / 이미 number인 값은 그대로 반환합니다.
 */
function parseTime(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  let total = 0;
  for (const match of value.matchAll(/(\d+)\s*([dhms])/gi)) {
    const n = parseInt(match[1], 10);
    switch (match[2].toLowerCase()) {
      case 'd': total += n * 86400; break;
      case 'h': total += n * 3600;  break;
      case 'm': total += n * 60;    break;
      case 's': total += n;         break;
    }
  }
  return total;
}

/** JSON 객체를 재귀적으로 순회하며 "time" 키의 값을 초로 변환합니다. */
function transformTimeFields(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(transformTimeFields);
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = k === 'time' ? parseTime(v) : transformTimeFields(v);
    }
    return result;
  }
  return obj;
}

export function useItemData<T = unknown>(category: string, id: number | string): {
  data: T | null;
  loading: boolean;
} {
  const key = `${category}/${id}`;
  const [data, setData] = useState<T | null>(cache.has(key) ? cache.get(key) : null);
  const [loading, setLoading] = useState(!cache.has(key));

  useEffect(() => {
    if (cache.has(key)) {
      setData(cache.get(key) ?? null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/data/${category}/${id}.json`)
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then((json) => {
        const transformed = transformTimeFields(json) as T;
        cache.set(key, transformed);
        if (!cancelled) { setData(transformed); setLoading(false); }
      })
      .catch(() => {
        cache.set(key, null);
        if (!cancelled) { setData(null); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [key]);

  return { data, loading };
}
