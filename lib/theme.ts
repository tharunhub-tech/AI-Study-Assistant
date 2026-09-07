export interface Theme {
  scheme: 'light' | 'dark';
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  amber: string;
  amberSoft: string;
  good: string;
  goodSoft: string;
  danger: string;
  dangerSoft: string;
  userBubble: string;
  shadow: string;
}

export const lightTheme: Theme = {
  scheme: 'light',
  bg: '#F6F4EF',
  bgAlt: '#EDEAE2',
  surface: '#FFFFFF',
  surfaceAlt: '#F1EEE7',
  border: '#E2DDD2',
  text: '#191C22',
  textMuted: '#5C6270',
  textFaint: '#8B9099',
  accent: '#5B4BE0',
  accentSoft: '#E7E4FB',
  onAccent: '#FFFFFF',
  amber: '#B67412',
  amberSoft: '#FBEDD4',
  good: '#1E7F52',
  goodSoft: '#DCF2E6',
  danger: '#B23A34',
  dangerSoft: '#FBE3E1',
  userBubble: '#5B4BE0',
  shadow: '#1A1C22',
};

export const darkTheme: Theme = {
  scheme: 'dark',
  bg: '#0E1116',
  bgAlt: '#12161D',
  surface: '#171C24',
  surfaceAlt: '#1E242E',
  border: '#262D38',
  text: '#EDF0F5',
  textMuted: '#A2ABBA',
  textFaint: '#6C7686',
  accent: '#8E7DFF',
  accentSoft: '#232041',
  onAccent: '#0E1116',
  amber: '#F2B454',
  amberSoft: '#2E2517',
  good: '#4ED89A',
  goodSoft: '#14291F',
  danger: '#FF8B84',
  dangerSoft: '#2E1A19',
  userBubble: '#5B4BE0',
  shadow: '#000000',
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
