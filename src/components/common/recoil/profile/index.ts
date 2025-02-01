import { atom } from "recoil";

export const profileState = atom({
  key: "profileState",
  default: {} as any,
});

export const healthTopicState = atom({
  key: "healthTopicState",
  default: [] as any[],
});

