export async function onRequest(context) {
  const CHANNEL_ID = 'UCCRTRjVQmrCqBcrM8VED-wg';
  const API_KEY    = 'AIzaSyDDqwBt8I8Fl_0Dyah9jKe9t4kawF_9Cf8';

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&eventType=live&type=video&key=${API_KEY}`;

  try {
    const res  = await fetch(url);
    const data = await res.json();

    const live = data.items && data.items.length > 0;
    const videoId = live ? data.items[0].id.videoId : null;
    const title   = live ? data.items[0].snippet.title : null;

    return new Response(JSON.stringify({ live, videoId, title }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ live: false, error: e.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
