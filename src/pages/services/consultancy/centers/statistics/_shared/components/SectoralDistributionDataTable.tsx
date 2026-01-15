import React, { useCallback } from 'react';
import DataTableWithSearch from '@shared/components/data/DataTableWithSearch';
import { useLocale } from '@shared/hooks';
import { translate } from '@shared/translations';
import type { SectoralDistributionGroup } from '../utils/statisticsDataFetcher';

interface TableRow {
  id: string;
  sector: string;
  count: number;
}

interface SectoralDistributionDataTableProps {
  centerType: 'rd' | 'design';
  sectoralDistributionData:
    | SectoralDistributionGroup[]
    | (() => Promise<SectoralDistributionGroup[]>);
}

const SectoralDistributionDataTable: React.FC<SectoralDistributionDataTableProps> = ({
  centerType,
  sectoralDistributionData,
}) => {
  // Translations
  const { locale } = useLocale();
  const t = translate(locale);

  const centerTypeLabel = t.centerType[centerType];

  // Transform data function (works for both sync and async)
  const transformData = useCallback(async () => {
    // Resolve data (sync or async)
    const resolvedData =
      typeof sectoralDistributionData === 'function'
        ? await sectoralDistributionData()
        : sectoralDistributionData;

    const flatRows: TableRow[] = [];
    let idCounter = 1;

    resolvedData.forEach((category) => {
      category.children.forEach((child) => {
        flatRows.push({
          id: String(idCounter++),
          sector: child.name,
          count: child.value,
        });
      });
    });
    return flatRows;
  }, [sectoralDistributionData]);

  const headers = [
    { key: 'sector', header: t.sectoralDistributionDataTable.headers.sector },
    {
      key: 'count',
      header: t.sectoralDistributionDataTable.headers.centerCount.replace(
        '{centerType}',
        centerTypeLabel
      ),
      isSortable: true,
    },
  ];

  return (
    <DataTableWithSearch.Lazy
      data={transformData}
      headers={headers}
      searchPlaceholder={t.sectoralDistributionDataTable.searchPlaceholder}
      defaultSortKey="count"
      defaultSortDirection="DESC"
    />
  );
};

export default SectoralDistributionDataTable;
