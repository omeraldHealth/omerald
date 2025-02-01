import { atom } from "recoil";

export const userState = atom({
  key: "user",
  default: {} as any,
});

export const phoneNumberState = atom({
  key: "contact",
  default: "",
});

