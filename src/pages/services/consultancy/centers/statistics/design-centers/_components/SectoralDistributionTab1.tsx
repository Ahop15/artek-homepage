import {
  getSectoralDistributionData,
  getSectoralDistributionColorScale,
} from '../../_shared/utils/statisticsDataFetcher';
import { useLocale } from '@shared/hooks';
import TreemapChart from '@shared/components/visualization/TreemapChart';
import { useState, useEffect } from 'react';

const SectoralDistributionTab1 = () => {
  const { locale } = useLocale();
  const [colorScale, setColorScale] = useState<Record<string, string>>({});

  useEffect(() => {
    getSectoralDistributionColorScale('design-centers', locale)
      .then(setColorScale)
      .catch(() => {
        // Silent fail - use empty color scale
        setColorScale({});
      });
  }, [locale]);

  return (
    <TreemapChart
      data={() => getSectoralDistributionData('design-centers', locale)}
      options={{
        color: {
          scale: colorScale,
        },
      }}
    />
  );
};

export default SectoralDistributionTab1;
