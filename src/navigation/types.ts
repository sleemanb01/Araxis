export type RootStackParamList = {
  Tabs:              undefined;
  ServiceCallDetail: { callId: string };
  ItemEditor:        { itemId?: string };
  Transfer:          undefined;
  Crew:              { openUid?: string; add?: boolean } | undefined;
  NewServiceCall:    undefined;
};

export type AuthStackParamList = {
  PhoneLogin: undefined;
  Otp:        { phone: string };
};

export type TabParamList = {
  Dashboard: undefined;
  Warehouse: undefined;
  Profile:   undefined;
};
