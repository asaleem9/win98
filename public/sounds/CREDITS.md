# Audio Credits

All audio in `public/sounds/` and `public/music/` is procedurally synthesized
for this project by `scripts/generate-audio.mjs` (oscillator/noise synthesis,
rendered to WAV, encoded to MP3). No third-party recordings or compositions
are used — these files are original to this repository and carry no external
license obligations.

The system sounds are period-*flavored* originals, not recreations of any
Microsoft, AOL, or other copyrighted audio.

To regenerate: `node scripts/generate-audio.mjs` (then encode with ffmpeg to mp3).
