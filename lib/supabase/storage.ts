import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const toolboxAssetsBucket = "toolbox-assets";
const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function createSafeFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function assertAllowedImageFile(file: File) {
  if (!allowedImageTypes.has(file.type)) {
    throw new Error("只支持 JPG、PNG、WebP、GIF、SVG 等常见图片类型。");
  }
}

export async function uploadToolboxImage(
  file: File,
  folder: "avatars" | "covers" | "wallpapers"
) {
  assertAllowedImageFile(file);

  if (!isSupabaseConfigured()) {
    throw new Error("当前未配置 Supabase，无法上传图片。");
  }

  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("请先登录后再上传图片。");
  }

  const safeFileName = createSafeFileName(file.name) || "image";
  const path = `${userData.user.id}/${folder}/${crypto.randomUUID()}-${safeFileName}`;
  const { error } = await supabase.storage
    .from(toolboxAssetsBucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(toolboxAssetsBucket).getPublicUrl(path);

  return data.publicUrl;
}
