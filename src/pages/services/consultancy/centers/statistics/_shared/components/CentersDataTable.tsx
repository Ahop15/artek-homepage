import React, { useCallback } from 'react';
import DataTableWithSearch from '@shared/components/data/DataTableWithSearch';
import { useLocale } from '@shared/hooks';
import { translate } from '@shared/translations';
import type { Center } from '../utils/statisticsDataFetcher';

interface CentersDataTableProps {
  centersData: Center[] | (() => Promise<Center[]>);
}

const CentersDataTable: React.FC<CentersDataTableProps> = ({ centersData }) => {
  // Translations
  const { locale } = useLocale();
  const t = translate(locale);

  const headers = [
    { key: 'name', header: t.centersDataTable.headers.companyName },
    { key: 'city', header: t.centersDataTable.headers.city },
    { key: 'sector', header: t.centersDataTable.headers.sector },
  ];

  // Transform data function (works for both sync and async)
  const transformData = useCallback(async () => {
    // Resolve data (sync or async)
    const resolvedData = typeof centersData === 'function' ? await centersData() : centersData;

    return resolvedData.map((center, index) => ({
      id: String(index + 1),
      name: center.name,
      city: center.city,
      sector: center.sector,
    }));
  }, [centersData]);

  return (
    <DataTableWithSearch.Lazy
      data={transformData}
      headers={headers}
      searchPlaceholder={t.centersDataTable.searchPlaceholder}
    />
  );
};

export default CentersDataTable;
