const VIRTUAL_EMAIL_DOMAIN = "creator-topic-library.local";

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string) {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    return "请输入昵称。";
  }

  if (normalizedUsername.length < 2 || normalizedUsername.length > 30) {
    return "昵称长度建议为 2 到 30 位。";
  }

  return null;
}

export function validatePassword(password: string) {
  if (password.length < 6 || password.length > 20) {
    return "密码长度建议为 6 到 20 位。";
  }

  return null;
}

export function usernameToVirtualEmail(username: string) {
  const normalizedUsername = normalizeUsername(username);
  const bytes = new TextEncoder().encode(normalizedUsername);
  const encodedUsername = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `u-${encodedUsername}@${VIRTUAL_EMAIL_DOMAIN}`;
}
