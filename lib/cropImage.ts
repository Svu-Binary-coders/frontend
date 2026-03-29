// lib/cropImage.ts

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: any,
  fileName: string = "avatar.jpeg",
  fileType: string = "image/jpeg",
): Promise<File | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    // এখানে fileType ব্যবহার করছি যাতে অরিজিনাল ফরম্যাটেই সেভ হয়
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas is empty"));
        return;
      }

      // অরিজিনাল ফাইলের নাম ঠিক রাখছি (চাইলে নামের আগে 'cropped-' যোগ করতে পারেন)
      const file = new File([blob], fileName, {
        type: fileType,
        lastModified: Date.now(),
      });
      resolve(file);
    }, fileType);
  });
}
