export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  /** Fake filename shown in playlists / the virtual filesystem */
  fileName: string;
  src: string;
  /** Nominal bitrate/samplerate for the Winamp readout */
  kbps: number;
  khz: number;
}

export const musicTracks: MusicTrack[] = [
  {
    id: 'dial-up-dreams',
    title: 'Dial-Up Dreams',
    artist: 'The Modem Tones',
    fileName: 'the_modem_tones-dial_up_dreams.mp3',
    src: '/music/dial-up-dreams.mp3',
    kbps: 96,
    khz: 22,
  },
  {
    id: 'y2k-panic',
    title: 'Y2K Panic',
    artist: 'Millennium Bug',
    fileName: 'millennium_bug-y2k_panic.mp3',
    src: '/music/y2k-panic.mp3',
    kbps: 96,
    khz: 22,
  },
  {
    id: 'midnight-midi',
    title: 'Midnight MIDI',
    artist: 'SoundBlaster Crew',
    fileName: 'soundblaster_crew-midnight_midi.mp3',
    src: '/music/midnight-midi.mp3',
    kbps: 96,
    khz: 22,
  },
  {
    id: 'compuserve-sunset',
    title: 'CompuServe Sunset',
    artist: 'The Modem Tones',
    fileName: 'the_modem_tones-compuserve_sunset.mp3',
    src: '/music/compuserve-sunset.mp3',
    kbps: 96,
    khz: 22,
  },
  {
    id: 'screensaver-groove',
    title: 'Screensaver Groove',
    artist: 'After Dark',
    fileName: 'after_dark-screensaver_groove.mp3',
    src: '/music/screensaver-groove.mp3',
    kbps: 96,
    khz: 22,
  },
  {
    id: 'pentium-power',
    title: 'Pentium Power',
    artist: 'MMX Overdrive',
    fileName: 'mmx_overdrive-pentium_power.mp3',
    src: '/music/pentium-power.mp3',
    kbps: 96,
    khz: 22,
  },
];

export function getTrackByFileName(fileName: string): MusicTrack | undefined {
  const lower = fileName.toLowerCase();
  return musicTracks.find((t) => t.fileName.toLowerCase() === lower || t.src.endsWith(lower));
}
