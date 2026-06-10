export type ImageUploadKind = "avatar" | "toolbox-cover" | "toolbox-wallpaper";

type CompressionRule = {
  maxDimension: number;
  maxSizeBytes: number;
  quality: number;
};

const maxOriginalSizeBytes = 10 * 1024 * 1024;

const compressionRules: Record<ImageUploadKind, CompressionRule> = {
  avatar: {
    maxDimension: 512,
    maxSizeBytes: 200 * 1024,
    quality: 0.75,
  },
  "toolbox-cover": {
    maxDimension: 800,
    maxSizeBytes: 350 * 1024,
    quality: 0.75,
  },
  "toolbox-wallpaper": {
    maxDimension: 1600,
    maxSizeBytes: 800 * 1024,
    quality: 0.72,
  },
};

const compressibleImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function formatFileSize(bytes: number) {
  return `${Math.round(bytes / 1024)}KB`;
}

function getCompressedFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "").trim() || "image";

  return `${baseName}.webp`;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("图片上传失败，请稍后重试。"));
    };
    image.src = imageUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("图片上传失败，请稍后重试。"));
          return;
        }

        resolve(blob);
      },
      type,
      quality
    );
  });
}

function getScaledSize(width: number, height: number, maxDimension: number) {
  const longestSide = Math.max(width, height);

  if (longestSide <= maxDimension) {
    return { width, height };
  }

  const ratio = maxDimension / longestSide;

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export async function compressImageBeforeUpload(
  file: File,
  kind: ImageUploadKind
) {
  if (file.size > maxOriginalSizeBytes) {
    throw new Error("图片过大，请更换一张较小的图片。");
  }

  if (file.type === "image/gif") {
    throw new Error("暂不支持该图片格式，请上传 jpg、png 或 webp。");
  }

  if (!compressibleImageTypes.has(file.type)) {
    throw new Error("暂不支持该图片格式，请上传 jpg、png 或 webp。");
  }

  const rule = compressionRules[kind];
  const image = await loadImage(file);
  let { width, height } = getScaledSize(
    image.naturalWidth,
    image.naturalHeight,
    rule.maxDimension
  );
  let quality = rule.quality;
  let compressedBlob: Blob | null = null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("图片上传失败，请稍后重试。");
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    compressedBlob = await canvasToBlob(canvas, "image/webp", quality);

    if (compressedBlob.size <= rule.maxSizeBytes) {
      break;
    }

    if (quality > 0.5) {
      quality = Math.max(0.5, quality - 0.08);
    } else {
      width = Math.max(1, Math.round(width * 0.86));
      height = Math.max(1, Math.round(height * 0.86));
    }
  }

  if (!compressedBlob) {
    throw new Error("图片上传失败，请稍后重试。");
  }

  const compressedFile = new File([compressedBlob], getCompressedFileName(file.name), {
    lastModified: Date.now(),
    type: "image/webp",
  });

  if (process.env.NODE_ENV === "development") {
    console.info(
      `[image-compression] ${kind}: ${formatFileSize(file.size)} -> ${formatFileSize(
        compressedFile.size
      )}`
    );
  }

  return compressedFile;
}
