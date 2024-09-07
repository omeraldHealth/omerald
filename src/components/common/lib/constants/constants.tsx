import React from 'react';
import {
  NewspaperIcon,
  PhoneIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

// Using Heroicons as React components
export const UsersSolid = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
  </svg>
);

export const CaseSolid = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm4 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
  </svg>
);

export const UserSolid = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

export const MailSolid = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
  </svg>
);

export const LOGO =
  "https://res.cloudinary.com/drjut62wv/image/upload/v1657025892/omerald/logo/Omerald_575X575-removebg-preview_vhtzp8.png";

export const LOGO_ICON =
  "https://res.cloudinary.com/drjut62wv/image/upload/v1654278337/omerald/logo/logoIcon_qdyypn.png";

export const AVATAR =
  "https://res.cloudinary.com/drjut62wv/image/upload/v1654281805/omerald/avatar/man_lpx8mt.png";

export const LOGO_WHITE =
  "https://res.cloudinary.com/drjut62wv/image/upload/v1652576040/omerald/logo/logo-white_fhvjob.webp";

// Default logo for diagnostic centers - used as fallback when logo is broken or missing
export const DEFAULT_DC_LOGO_URL =
  "https://res.cloudinary.com/drjut62wv/image/upload/v1677945620/omerald/diagnosticCenter/onlyOmeraldLogo_kwbcj8.png";

export const DASHBOARD_STATS_CARDS = [
  {
    bgColor: "#4E36E2",
    Icon: UsersSolid,
    text: "Members",
    route: "/members",
  },
  {
    bgColor: "#48A9F8",
    Icon: CaseSolid,
    text: "Reports Uploaded",
    route: "/reports",
  },
  {
    bgColor: "#1BD084",
    Icon: UserSolid,
    text: "Reports Accepted",
    route: "/reports",
  },
  {
    bgColor: "#8BC740",
    Icon: MailSolid,
    text: "Related Articles",
    route: "/articles",
  },
];

export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  DOCTOR: "doctor",
};

export const FORM_TYPES = {
  TEXT: "text",
  TEXTAREA: "textarea",
  SELECT: "select",
  CHECKBOX: "checkbox",
  SWITCH: "switch",
  NUMBER: "number",
  UPLOAD: "file",
  MULTI_SELECT: "multi_select",
  DatePicker: "ReactDatepicker",
};

export const topicList = [
  {
    id: 1,
    title: "Blood sugar levels",
    icon: "/vectors/Blood.svg",
    style:
      "bg-orange-100 hover:scale-105 duration-300 w-full flex items-center mb-4 h-16 lg:h-20 pl-4 rounded-lg transition-transform",
  },
  {
    id: 2,
    title: "Anxiety and mood conditions",
    icon: "/vectors/Mood.svg",
    style:
      "bg-yellow-100 hover:scale-105 duration-400 w-full flex items-center mb-4 h-16 lg:h-20 pl-4 rounded-lg transition-transform",
  },
  {
    id: 3,
    title: "Joint Pain",
    icon: "/vectors/Pain.svg",
    style:
      "bg-green-100 hover:scale-105 duration-500 w-full flex items-center mb-4 h-16 lg:h-20 pl-4 rounded-lg transition-transform",
  },
  {
    id: 4,
    title: "Sleep",
    icon: "/vectors/Sleep.svg",
    style:
      "bg-violet-100 hover:scale-105 duration-600 w-full flex items-center mb-4 h-16 lg:h-20 pl-4 rounded-lg transition-transform",
  },
  {
    id: 5,
    title: "Stress response",
    icon: "/vectors/Stress.svg",
    style:
      "bg-blue-100 hover:scale-105 duration-700 w-full flex items-center mb-4 h-16 lg:h-20 pl-4 rounded-lg transition-transform",
  },
];

export const supportLinks = [
  {
    name: "Sales",
    href: "/contact",
    description:
      "Varius facilisi mauris sed sit. Non sed et duis dui leo, vulputate id malesuada non. Cras aliquet purus dui laoreet diam sed lacus, fames.",
    icon: PhoneIcon,
  },
  {
    name: "Technical Support",
    href: "/contact",
    description:
      "Varius facilisi mauris sed sit. Non sed et duis dui leo, vulputate id malesuada non. Cras aliquet purus dui laoreet diam sed lacus, fames.",
    icon: QuestionMarkCircleIcon,
  },
  {
    name: "Media Inquiries",
    href: "/contact",
    description:
      "Varius facilisi mauris sed sit. Non sed et duis dui leo, vulputate id malesuada non. Cras aliquet purus dui laoreet diam sed lacus, fames.",
    icon: NewspaperIcon,
  },
];

