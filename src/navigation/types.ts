export type RootStackParamList = {
  Tabs: undefined;
  JobCoordination: { jobId: string };
  JobExecution:    { jobId: string };
  NewJob:          undefined;
  Warehouse:       undefined;
};

export type TabParamList = {
  JobPool:   undefined;
  MyJobs:    undefined;
  Warehouse: undefined;
  Profile:   undefined;
};
