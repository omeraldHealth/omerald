import { atom, selector } from "recoil";
import { profileState } from "../profile";

export const memberState = selector({
  key: 'memberState',
  get: ({ get }) => {
    const profile = get(profileState);
    if (profile?.members) {
      const memberIds = profile.members.map((member: any) => member.memberId);
      memberIds.push(profile._id);
      return memberIds;
    }
    return [];
  },
});

export const memberProfile = atom({
  key: "memberProfileState",
  default: {} as any,
});

export const memberDetail = atom({
  key: "memberDetailState",
  default: "",
});

export const memberDetailInitialTab = atom({
  key: "memberDetailInitialTabState",
  default: "overview" as "overview" | "reports" | "bmi" | "muac" | "anthropometric" | "immunization" | "iap" | "foodAllergies" | "bodyImpact",
});