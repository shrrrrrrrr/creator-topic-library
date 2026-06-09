import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const DEVICE_ID_KEY = "media-tool.auth.deviceId";
const MAX_ACTIVE_DEVICES = 5;
const DEVICE_EXPIRE_DAYS = 30;

export type ActiveDevice = {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  user_agent: string;
  last_seen_at: string;
  created_at: string;
};

export class DeviceLimitError extends Error {
  constructor() {
    super("当前账号已达到 5 台设备在线上限，请退出其他设备后再登录。");
    this.name = "DeviceLimitError";
  }
}

export class DeviceRevokedError extends Error {
  constructor() {
    super("当前设备已被下线，请重新登录。");
    this.name = "DeviceRevokedError";
  }
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getCurrentDeviceId() {
  if (typeof window === "undefined") {
    return "";
  }

  const storedDeviceId = window.localStorage.getItem(DEVICE_ID_KEY);

  if (storedDeviceId) {
    return storedDeviceId;
  }

  const nextDeviceId = createId();
  window.localStorage.setItem(DEVICE_ID_KEY, nextDeviceId);

  return nextDeviceId;
}

function getDeviceName() {
  if (typeof window === "undefined") {
    return "Unknown device";
  }

  const platform = navigator.platform || "Unknown platform";
  const browser = navigator.userAgent.includes("Edg")
    ? "Edge"
    : navigator.userAgent.includes("Chrome")
      ? "Chrome"
      : navigator.userAgent.includes("Firefox")
        ? "Firefox"
        : navigator.userAgent.includes("Safari")
          ? "Safari"
          : "Browser";

  return `${browser} on ${platform}`;
}

function getExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() - DEVICE_EXPIRE_DAYS);

  return date.toISOString();
}

function isMissingRevokedDevicesTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return /revoked_devices|does not exist|schema cache/i.test(message);
}

async function revokeDevice(userId: string, deviceId: string) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("revoked_devices").upsert(
    {
      user_id: userId,
      device_id: deviceId,
      revoked_at: new Date().toISOString(),
    },
    { onConflict: "user_id,device_id" }
  );

  if (error && !isMissingRevokedDevicesTable(error)) {
    throw error;
  }
}

async function ensureCurrentDeviceIsNotRevoked(userId: string, deviceId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("revoked_devices")
    .select("id")
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    if (isMissingRevokedDevicesTable(error)) {
      return;
    }

    throw error;
  }

  if (data) {
    throw new DeviceRevokedError();
  }
}

export async function cleanupExpiredDevices(userId: string) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("active_devices")
    .delete()
    .eq("user_id", userId)
    .lt("last_seen_at", getExpiryDate());

  if (error) {
    throw error;
  }
}

export async function registerCurrentDevice(userId: string) {
  if (!isSupabaseConfigured() || typeof window === "undefined") {
    return;
  }

  const supabase = getSupabaseClient();
  const deviceId = getCurrentDeviceId();

  await ensureCurrentDeviceIsNotRevoked(userId, deviceId);
  await cleanupExpiredDevices(userId);

  const { data: existingDevice, error: existingError } = await supabase
    .from("active_devices")
    .select("*")
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingDevice) {
    const { error } = await supabase
      .from("active_devices")
      .update({
        device_name: getDeviceName(),
        user_agent: navigator.userAgent,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existingDevice.id);

    if (error) {
      throw error;
    }

    return;
  }

  const { count, error: countError } = await supabase
    .from("active_devices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("last_seen_at", getExpiryDate());

  if (countError) {
    throw countError;
  }

  if ((count ?? 0) >= MAX_ACTIVE_DEVICES) {
    throw new DeviceLimitError();
  }

  const { error } = await supabase.from("active_devices").insert({
    user_id: userId,
    device_id: deviceId,
    device_name: getDeviceName(),
    user_agent: navigator.userAgent,
    last_seen_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

export async function getActiveDevices(userId: string) {
  if (!isSupabaseConfigured()) {
    return [];
  }

  await cleanupExpiredDevices(userId);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("active_devices")
    .select("*")
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ActiveDevice[];
}

export async function removeActiveDevice(deviceRowId: string) {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = getSupabaseClient();
  const { data: device, error: selectError } = await supabase
    .from("active_devices")
    .select("user_id, device_id")
    .eq("id", deviceRowId)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (device) {
    await revokeDevice(String(device.user_id), String(device.device_id));
  }

  const { error } = await supabase
    .from("active_devices")
    .delete()
    .eq("id", deviceRowId);

  if (error) {
    throw error;
  }
}

export async function removeCurrentDevice(userId: string) {
  if (!isSupabaseConfigured() || typeof window === "undefined") {
    return;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("active_devices")
    .delete()
    .eq("user_id", userId)
    .eq("device_id", getCurrentDeviceId());

  if (error) {
    throw error;
  }
}
