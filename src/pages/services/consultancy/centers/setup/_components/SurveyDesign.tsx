import SimpleSurvey from '@shared/components/ui/SimpleSurvey.tsx';
import { useLocale } from '@shared/hooks';

import successContentTr from '../data/survey-design/tr/success-message.md?raw';
import failureContentTr from '../data/survey-design/tr/failure-message.md?raw';
import questionsTr from '../data/survey-design/tr/questions.json';

import successContentEn from '../data/survey-design/en/success-message.md?raw';
import failureContentEn from '../data/survey-design/en/failure-message.md?raw';
import questionsEn from '../data/survey-design/en/questions.json';

const SUCCESS_CONTENT_MAP = {
  tr: successContentTr,
  en: successContentEn,
};

const FAILURE_CONTENT_MAP = {
  tr: failureContentTr,
  en: failureContentEn,
};

const QUESTIONS_MAP = {
  tr: questionsTr,
  en: questionsEn,
};

const SurveyDesign = () => {
  const { locale } = useLocale();

  return (
    <SimpleSurvey
      id="tasarim-merkezi"
      questions={QUESTIONS_MAP[locale]}
      successContent={SUCCESS_CONTENT_MAP[locale]}
      failureContent={FAILURE_CONTENT_MAP[locale]}
    />
  );
};

export default SurveyDesign;
