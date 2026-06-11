export interface UserDisplay {
  label: string;
  badgeClass: string;
  cardBorderClass: string;
  cardBgClass: string;
}

const USER_STYLES: Record<string, UserDisplay> = {
  cutie: {
    label: "cutie",
    badgeClass: "bg-rose-100 text-rose-700 border-rose-200",
    cardBorderClass: "border-l-4 border-l-rose-400",
    cardBgClass: "bg-rose-50/40",
  },
  pookie: {
    label: "pookie",
    badgeClass: "bg-violet-100 text-violet-700 border-violet-200",
    cardBorderClass: "border-l-4 border-l-violet-400",
    cardBgClass: "bg-violet-50/40",
  },
};

export function getUserDisplay(username?: string | null): UserDisplay | null {
  if (!username) return null;

  const key = username.toLowerCase();
  return USER_STYLES[key] ?? {
    label: username,
    badgeClass: "bg-gray-100 text-gray-600 border-gray-200",
    cardBorderClass: "border-l-4 border-l-gray-300",
    cardBgClass: "bg-gray-50/40",
  };
}
