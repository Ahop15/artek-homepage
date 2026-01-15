// noinspection DuplicatedCode

/**
 * Unified Statistics Data Fetcher
 */

import type { Locale } from '@shared/translations';

/**
 * Center type identifier
 */
export type CenterType = 'rd-centers' | 'design-centers';

/**
 * Base path for center statistics data
 */
const BASE_PATH = '/data/center-statistics';

/**
 * Memory cache for fetched data
 */
const dataCache = new Map<string, unknown>();

/**
 * Generic fetch function with caching
 */
async function fetchData<T>(path: string): Promise<T> {
  if (dataCache.has(path)) {
    return dataCache.get(path) as T;
  }

  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }

  try {
    const data = (await response.json()) as T;
    dataCache.set(path, data);
    return data;
  } catch {
    // Silent fail - components handle missing data gracefully with loaders
    throw new Error(`Failed to parse JSON from ${path}`);
  }
}

/**
 * Type Definitions
 */

export interface Center {
  name: string;
  city: string;
  sector: string;
}

export interface CenterStatistics {
  totalCenters: number;
  totalPersonnel: number;
  educationLevel: {
    bachelor: number;
    master: number;
    doctorate: number;
  };
  projects: {
    completed: number;
    ongoing: number;
  };
  patents: {
    total: number;
    registered: number;
    applied: number;
  };
  foreignPartnership: number;
}

export interface SectoralDistributionItem {
  name: string;
  value: number;
  showLabel: boolean;
}

export interface SectoralDistributionGroup {
  name: string;
  color: string;
  children: SectoralDistributionItem[];
}

export interface RegionalDistributionItem {
  name: string;
  value: number;
}

export type ColorScale = Record<string, string>;

/**
 * API Functions
 */

/**
 * Get centers list with locale-aware sector names
 *
 * @param centerType - Type of center (rd-centers | design-centers)
 * @param locale - Locale for sector name translation (default: 'tr')
 * @returns Promise<Center[]>
 *
 * @example
 * const rdCenters = await getCenters('rd-centers', 'en');
 * const designCenters = await getCenters('design-centers', 'tr');
 */
export async function getCenters(centerType: CenterType, locale: Locale = 'tr'): Promise<Center[]> {
  const centers = await fetchData<Center[]>(`${BASE_PATH}/${centerType}/centers.json`);

  // For Turkish, return as-is (sectors are already in Turkish)
  if (locale === 'tr') {
    return centers;
  }

  // For English, translate sector names
  const sectorNamesMap = await fetchData<Record<string, string>>(
    `${BASE_PATH}/${centerType}/sector_names_map.json`
  );

  return centers.map((center) => ({
    ...center,
    sector: sectorNamesMap[center.sector] || center.sector,
  }));
}

/**
 * Get center statistics (locale-independent)
 *
 * @param centerType - Type of center (rd-centers | design-centers)
 * @returns Promise<CenterStatistics>
 *
 * @example
 * const stats = await getCenterStatistics('rd-centers');
 */
export async function getCenterStatistics(centerType: CenterType): Promise<CenterStatistics> {
  return fetchData(`${BASE_PATH}/${centerType}/center_statistics.json`);
}

/**
 * Get sectoral distribution data (locale-specific, already transformed)
 *
 * @param centerType - Type of center (rd-centers | design-centers)
 * @param locale - Locale for data (default: 'tr')
 * @returns Promise<SectoralDistributionGroup[]>
 *
 * @example
 * const data = await getSectoralDistributionData('rd-centers', 'en');
 */
export async function getSectoralDistributionData(
  centerType: CenterType,
  locale: Locale = 'tr'
): Promise<SectoralDistributionGroup[]> {
  return fetchData(`${BASE_PATH}/${centerType}/sectoral_distribution_data.${locale}.json`);
}

/**
 * Get sectoral distribution color scale (locale-specific)
 *
 * @param centerType - Type of center (rd-centers | design-centers)
 * @param locale - Locale for color scale (default: 'tr')
 * @returns Promise<ColorScale>
 *
 * @example
 * const colors = await getSectoralDistributionColorScale('design-centers', 'tr');
 */
export async function getSectoralDistributionColorScale(
  centerType: CenterType,
  locale: Locale = 'tr'
): Promise<ColorScale> {
  return fetchData(
    `${BASE_PATH}/${centerType}/sectoral_distribution_data-color-scale.${locale}.json`
  );
}

/**
 * Get regional distribution data (locale-independent)
 *
 * @param centerType - Type of center (rd-centers | design-centers)
 * @returns Promise<RegionalDistributionItem[]>
 *
 * @example
 * const data = await getRegionalDistributionData('rd-centers');
 */
export async function getRegionalDistributionData(
  centerType: CenterType
): Promise<RegionalDistributionItem[]> {
  return fetchData(`${BASE_PATH}/${centerType}/regional_distribution_raw_data.json`);
}
