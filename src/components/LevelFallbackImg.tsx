import { useState, useEffect } from 'react';

interface Props {
  category: string;
  id: number;
  lvl: number;
  className?: string;
}

export function LevelFallbackImg({ category, id, lvl, className }: Props) {
  const [tryLvl, setTryLvl] = useState(Math.max(1, lvl));

  useEffect(() => { setTryLvl(Math.max(1, lvl)); }, [id, lvl]);

  return (
    <img
      className={className}
      src={`/images/${category}/${id}/${tryLvl}.png`}
      alt=""
      onError={(e) => {
        if (tryLvl > 1) {
          setTryLvl((prev) => prev - 1);
        } else {
          (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
        }
      }}
    />
  );
}
