import { SideNavContent } from '@shared/components/layout/HeaderGlobals.tsx';
import sideNavTr from './sideNav.json';
import sideNavEn from './sideNav.en.json';

export type Locale = 'tr' | 'en';

const SIDENAV_MAP: Record<Locale, SideNavContent> = {
  tr: sideNavTr,
  en: sideNavEn,
};

export const getSideNavContent = (locale: Locale): SideNavContent => {
  return SIDENAV_MAP[locale] || SIDENAV_MAP.tr;
};
