const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');

async function test() {
  try {
    const r = await yts('Tabi No Tochuu Natsumi Kiyoura');
    const videos = r.videos;
    if (videos.length > 0) {
      const first = videos[0];
      console.log('Found video:', first.title, first.url, first.timestamp);
      const info = await ytdl.getInfo(first.url);
      const audioFormat = ytdl.chooseFormat(info.formats, { filter: 'audioonly' });
      console.log('Audio Stream URL:', audioFormat ? audioFormat.url : 'No format');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
