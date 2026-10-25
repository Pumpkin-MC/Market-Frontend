export const extractYoutubeVideoId = (url?: string): string | null => {
  if (!url) return null;
  try {
    if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1].split(/[?#]/)[0];
    } else if (url.includes('youtube.com/embed/')) {
      return url.split('youtube.com/embed/')[1].split(/[?#]/)[0];
    } else if (url.includes('youtube.com/shorts/')) {
      return url.split('youtube.com/shorts/')[1].split(/[?#]/)[0];
    } else if (url.includes('v=')) {
      return url.split('v=')[1].split(/[&?#]/)[0];
    }
    return null;
  } catch {
    return null;
  }
};
