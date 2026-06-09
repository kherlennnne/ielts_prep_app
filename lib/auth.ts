export const AUTH_COOKIE_NAME = "ielts_auth";
export const AUTH_COOKIE_VALUE = "ok";
export const REMEMBER_COOKIE_NAME = "ielts_remember";
export const LAST_ACTIVE_COOKIE_NAME = "ielts_last_active";
export const USER_COOKIE_NAME = "ielts_user";
export const SESSION_COOKIE_NAME = "ielts_session_id";
export const LOGIN_PATH = "/login";

export const REMEMBER_ME_MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day
export const INACTIVITY_TIMEOUT_SECONDS = 60 * 60 * 2; // 2 hours
export const ACTIVE_TIME_HEARTBEAT_SECONDS = 60;
export const ACTIVE_TIME_MAX_DELTA_SECONDS = 90;

// Users with restricted access (no materials section)
export const RESTRICTED_USERS = ["pookie"];
