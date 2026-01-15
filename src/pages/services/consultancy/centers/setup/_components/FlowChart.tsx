import { useLocale } from '@shared/hooks';

import chartContentTr from '../data/flow-chart/tr/data.md?raw';
import chartContentEn from '../data/flow-chart/en/data.md?raw';

import Mermaid from '@shared/components/visualization/Mermaid.tsx';

const CHART_CONTENT_MAP = {
  tr: chartContentTr,
  en: chartContentEn,
};

const FlowChart = () => {
  const { locale } = useLocale();

  return <Mermaid.Lazy chart={CHART_CONTENT_MAP[locale]} />;
};

export default FlowChart;
