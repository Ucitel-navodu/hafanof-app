export type RootStackParamList = {
  Login: undefined;
  CHome: undefined;
  Cal: undefined;
  Approve: undefined;
  DogsList: undefined;
  DogDetail: { dogId: string; tab?: "denik" | "zdravi" | "adopce" };
  FHome: undefined;
  Log: { dogId?: string };
  Upload: { dogId?: string };
  Wishes: undefined;
  Pay: { wishId: string };
  Done: { wishId: string };
  Patron: undefined;
  Browse: undefined;
  Apply: { dogId: string };
};
