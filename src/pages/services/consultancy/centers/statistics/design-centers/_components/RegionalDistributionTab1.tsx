import ChoroplethChart from '@shared/components/visualization/ChoroplethChart';
import { getRegionalDistributionData } from '../../_shared/utils/statisticsDataFetcher';

const RegionalDistributionTab1 = () => {
  return (
    <ChoroplethChart data={() => getRegionalDistributionData('design-centers')} options={{}} />
  );
};

export default RegionalDistributionTab1;
