export const getVideoThumbnail = (
  videoUrl: string,
  options?: {
    width?: number;
    height?: number;
    second?: number;
    quality?: "auto" | number;
  },
) => {
  const {
    width = 400,
    height = 300,
    second = 1,
    quality = "auto",
  } = options ?? {};

 return videoUrl
   .replace(
     "/video/upload/",
     `/video/upload/w_${width},h_${height},c_fill,so_${second},q_${quality},f_auto/`,
   )
   .replace(/\.(mp4|webm|mov|mkv|avi)$/i, ".jpg");
};
