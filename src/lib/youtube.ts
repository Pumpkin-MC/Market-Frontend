const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export const extractYoutubeVideoId = (url?: string): string | null => {
  if (!url) return null;
  const markers = ['youtu.be/', 'youtube.com/embed/', 'youtube.com/shorts/', 'v='];
  const marker = markers.find(m => url.includes(m));
  if (!marker) return null;
  const id = url.split(marker)[1].split(/[/?&#]/)[0];
  return YOUTUBE_ID.test(id) ? id : null;
};
