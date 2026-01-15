import RegionalDistributionDataTable from '../../_shared/components/RegionalDistributionDataTable';
import { getRegionalDistributionData } from '../../_shared/utils/statisticsDataFetcher';

const RegionalDistributionTab2 = () => {
  return (
    <RegionalDistributionDataTable
      centerType={'design'}
      regionalDistributionData={() => getRegionalDistributionData('design-centers')}
    />
  );
};

export default RegionalDistributionTab2;
