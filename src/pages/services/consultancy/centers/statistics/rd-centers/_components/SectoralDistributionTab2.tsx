import SectoralDistributionDataTable from '../../_shared/components/SectoralDistributionDataTable';
import { getSectoralDistributionData } from '../../_shared/utils/statisticsDataFetcher';
import { useLocale } from '@shared/hooks';

const SectoralDistributionTab2 = () => {
  const { locale } = useLocale();

  return (
    <SectoralDistributionDataTable
      centerType={'rd'}
      sectoralDistributionData={() => getSectoralDistributionData('rd-centers', locale)}
    />
  );
};

export default SectoralDistributionTab2;
