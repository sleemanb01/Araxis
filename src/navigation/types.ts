export type RootStackParamList = {
  Tabs: undefined;
  JobCoordination: { jobId: string };
  JobExecution:    { jobId: string };
  NewJob:          undefined;
  NewRequest:      undefined;
  Warehouse:       undefined;
  Scan:            undefined;
  ItemEditor:      { barcode: string };
  Transfer:        undefined;
  FullCalendar:    { picker?: boolean; selected?: string } | undefined;
  AddReview:       { providerId: string; providerName: string };
  EditProfile:     undefined;
  EditLink:        { platform: import('../utils/social').SocialPlatform };
};

export type AuthStackParamList = {
  PhoneLogin: undefined;
  Otp:        { phone: string };
};

export type RegisterStackParamList = {
  RoleSelect:       undefined;
  CustomerRegister: undefined;
  ProviderRegister: undefined;
};

export type TabParamList = {
  JobPool:    undefined;
  MyJobs:     undefined;
  Warehouse:  undefined;
  Dashboard:  undefined;
  MyRequests: undefined;
  Profile:    undefined;
};
