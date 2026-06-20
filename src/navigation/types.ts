export type RootStackParamList = {
  Tabs: undefined;
  JobCoordination: { jobId: string };
  JobExecution:    { jobId: string };
  NewJob:          undefined;
  Warehouse:       undefined;
  AddReview:       { providerId: string; providerName: string };
  EditProfile:     undefined;
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
  JobPool:   undefined;
  MyJobs:    undefined;
  Warehouse: undefined;
  Profile:   undefined;
};
