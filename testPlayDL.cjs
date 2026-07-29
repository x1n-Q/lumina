const play = require('play-dl');

async function test() {
  try {
    const url = 'https://www.youtube.com/watch?v=SpYXISeKFPg';
    const stream = await play.stream(url);
    console.log('Stream type:', stream.type);
    console.log('Stream URL / Pipe ready');
  } catch (err) {
    console.error('play-dl error:', err);
  }
}

test();
