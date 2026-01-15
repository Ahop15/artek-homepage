import SectoralDistributionDataTable from '../../_shared/components/SectoralDistributionDataTable';
import { getSectoralDistributionData } from '../../_shared/utils/statisticsDataFetcher';
import { useLocale } from '@shared/hooks';

const SectoralDistributionTab2 = () => {
  const { locale } = useLocale();

  return (
    <SectoralDistributionDataTable
      centerType={'design'}
      sectoralDistributionData={() => getSectoralDistributionData('design-centers', locale)}
    />
  );
};

export default SectoralDistributionTab2;
