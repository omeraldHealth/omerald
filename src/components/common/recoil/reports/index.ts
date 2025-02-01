import { selector, atom } from "recoil";
import { profileState } from "../profile";

export const reportState = selector({
  key: 'reportState',
  get: ({ get }) => {
    const profile = get(profileState);
    const reportsArray = profile && profile?.reports?.map((report: any) => report.reportId);
    return reportsArray || [];
  },
});

export const reportTypesState = atom({
  key: "reportTypesState",
  default: [] as any[],
});

