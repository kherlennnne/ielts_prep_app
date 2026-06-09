"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ACTIVE_TIME_HEARTBEAT_SECONDS, INACTIVITY_TIMEOUT_SECONDS } from "@/lib/auth";

export function AutoLogout() {
  const router = useRouter();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let lastHeartbeatAt = 0;
    let heartbeatInFlight = false;

    const sendActivityHeartbeat = () => {
      const now = Date.now();
      if (
        heartbeatInFlight ||
        now - lastHeartbeatAt < ACTIVE_TIME_HEARTBEAT_SECONDS * 1000
      ) {
        return;
      }

      lastHeartbeatAt = now;
      heartbeatInFlight = true;
      fetch("/api/auth/activity", { method: "POST", keepalive: true })
        .then((response) => {
          if (response.status === 401) {
            router.replace("/login");
            router.refresh();
          }
        })
        .catch(() => {
          // Auth activity should not interrupt the learner's current page.
        })
        .finally(() => {
          heartbeatInFlight = false;
        });
    };

    const logoutForInactivity = async () => {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "inactivity" }),
        });
      } finally {
        router.replace("/login");
        router.refresh();
      }
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(logoutForInactivity, INACTIVITY_TIMEOUT_SECONDS * 1000);
      sendActivityHeartbeat();
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    resetTimer();
    for (const eventName of events) {
      window.addEventListener(eventName, resetTimer, { passive: true });
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") resetTimer();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      for (const eventName of events) {
        window.removeEventListener(eventName, resetTimer);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  return null;
}
