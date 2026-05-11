"use client";

import { useEffect, useState } from "react";
import { USER_COOKIE_NAME, RESTRICTED_USERS } from "@/lib/auth";

export function useUser() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${USER_COOKIE_NAME}=([^;]*)`)
    );
    setUsername(match ? decodeURIComponent(match[1]) : null);
  }, []);

  return {
    username,
    isRestricted: username !== null && RESTRICTED_USERS.includes(username),
    isCutie: username === "cutie",
  };
}
