import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Chat: undefined;
  Library: undefined;
  Report: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  DocDetail: { docId: string; chunkId?: string };
  History: undefined;
};
