import RegionalDistributionDataTable from '../../_shared/components/RegionalDistributionDataTable';
import { getRegionalDistributionData } from '../../_shared/utils/statisticsDataFetcher';

const RegionalDistributionTab2 = () => {
  return (
    <RegionalDistributionDataTable
      centerType={'rd'}
      regionalDistributionData={() => getRegionalDistributionData('rd-centers')}
    />
  );
};

export default RegionalDistributionTab2;
