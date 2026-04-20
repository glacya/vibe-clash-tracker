import { useItemData } from './useItemData';
import type { BuildingDataFile } from '../types/buildingData';

export function useBuildingData(id: number): { data: BuildingDataFile | null; loading: boolean } {
  return useItemData<BuildingDataFile>('buildings', id);
}
