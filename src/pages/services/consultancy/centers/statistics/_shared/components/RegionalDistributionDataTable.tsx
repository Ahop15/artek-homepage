import React, { useCallback } from 'react';
import DataTableWithSearch from '@shared/components/data/DataTableWithSearch';
import { useLocale } from '@shared/hooks';
import { translate } from '@shared/translations';

interface RegionalDistributionDataTableProps {
    centerType: 'rd' | 'design';
    regionalDistributionData: Array<{ name: string; value: number }> | (() => Promise<Array<{ name: string; value: number }>>);
}

const RegionalDistributionDataTable: React.FC<RegionalDistributionDataTableProps> = ({centerType, regionalDistributionData}) => {
    // Translations
    const { locale } = useLocale();
    const t = translate(locale);

    const centerTypeLabel = t.centerType[centerType];

    // Transform data function (works for both sync and async)
    const transformData = useCallback(async () => {
        // Resolve data (sync or async)
        const resolvedData = typeof regionalDistributionData === 'function'
            ? await regionalDistributionData()
            : regionalDistributionData;

        return resolvedData
            .map((item) => ({
                city: item.name,
                count: item.value
            }))
            .map((item, index) => ({
                id: String(index + 1), // DataTable için unique row id
                ...item
            }));
    }, [regionalDistributionData]);

    const headers = [
        { key: 'city', header: t.regionalDistributionDataTable.headers.city },
        { key: 'count', header: t.regionalDistributionDataTable.headers.centerCount.replace('{centerType}', centerTypeLabel), isSortable: true }
    ];

    return (
        <DataTableWithSearch.Lazy
            data={transformData}
            headers={headers}
            searchPlaceholder={t.regionalDistributionDataTable.searchPlaceholder}
            defaultSortKey="count"
            defaultSortDirection="DESC"
        />
    );
};

export default RegionalDistributionDataTable;