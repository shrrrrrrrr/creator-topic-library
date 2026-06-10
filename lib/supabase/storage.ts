import {
  compressImageBeforeUpload,
  type ImageUploadKind,
} from "@/lib/images/image-compression";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const toolboxAssetsBucket = "toolbox-assets";
const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const compressionKindByFolder: Record<
  "avatars" | "covers" | "wallpapers",
  ImageUploadKind
> = {
  avatars: "avatar",
  covers: "toolbox-cover",
  wallpapers: "toolbox-wallpaper",
};

function createSafeFileName(fileName: string) {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function assertAllowedImageFile(file: File) {
  if (!allowedImageTypes.has(file.type)) {
    throw new Error("暂不支持该图片格式，请上传 jpg、png 或 webp。");
  }
}

export async function uploadToolboxImage(
  file: File,
  folder: "avatars" | "covers" | "wallpapers"
) {
  assertAllowedImageFile(file);
  const uploadFile = await compressImageBeforeUpload(
    file,
    compressionKindByFolder[folder]
  );

  if (!isSupabaseConfigured()) {
    throw new Error("当前未配置 Supabase，无法上传图片。");
  }

  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("请先登录后再上传图片。");
  }

  const safeFileName = createSafeFileName(uploadFile.name) || "image.webp";
  const path = `${userData.user.id}/${folder}/${crypto.randomUUID()}-${safeFileName}`;
  const { error } = await supabase.storage
    .from(toolboxAssetsBucket)
    .upload(path, uploadFile, {
      contentType: uploadFile.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error("图片上传失败，请稍后重试。");
  }

  const { data } = supabase.storage.from(toolboxAssetsBucket).getPublicUrl(path);

  return data.publicUrl;
}
