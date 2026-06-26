export type RootStackParamList = {
  Tabs:              undefined;
  ServiceCallDetail: { callId: string; readOnly?: boolean };
  ItemEditor:        { itemId?: string };
  Transfer:          { crewId?: string } | undefined;
  CrewDetail:        { crewId: string };
  CrewWithdrawals:   { crewId: string };
  CrewJobs:          { crewId: string };
  FinancialDashboard: undefined;
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
