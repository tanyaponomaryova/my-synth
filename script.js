// const drums = {
//   // node -- это ссылка на объект этого "устройства",
//   // который создаётся в функции init

//   // настройки семплера для барабанов
//   sampler: {
//     urls: {
//       C2: 'BT7A0D0.WAV',
//       D2: 'ST0T3S7.WAV',
//     },
//     baseUrl: 'roland_tr_909/',
//     node: null,
//   },
//   tremolo: {
//     wet: 0.5,
//     frequency: 100,
//     type: 'square',
//     depth: 0.9,
//     spread: 100,
//     node: null,
//   },
//   jcReverb: {
//     wet: 0.1,
//     roomSize: 0.05,
//     node: null,
//   },
//   channel: {
//     volume: -24,
//     pan: 0,
//     mute: false,
//     solo: false,
//     node: null,
//   },
//   sequence: [
//     {
//       time: '0:0:0',
//       noteName: 'C2',
//       duration: '2n',
//       velocity: 1,
//     },
//     {
//       time: '0:1:0',
//       noteName: 'D2',
//       duration: '2n',
//       velocity: 1,
//     },
//     {
//       time: '0:1:2',
//       noteName: 'C2',
//       duration: '8n',
//       velocity: 1,
//     },
//     {
//       time: '0:2:0',
//       noteName: 'C2',
//       duration: '8n',
//       velocity: 1,
//     },
//     {
//       time: '0:3:0',
//       noteName: 'D2',
//       duration: '2n',
//       velocity: 1,
//     },
//     {
//       time: '0:3:3',
//       noteName: 'D2',
//       duration: '2n',
//       velocity: 1,
//     },
//     {
//       time: '1:0:0',
//       noteName: 'C2',
//       duration: '2n',
//       velocity: 1,
//     },
//     {
//       time: '1:1:0',
//       noteName: 'D2',
//       duration: '2n',
//       velocity: 1,
//     },
//     {
//       time: '1:2:2',
//       noteName: 'C2',
//       duration: '2n',
//       velocity: 1,
//     },
//     {
//       time: '1:3:0',
//       noteName: 'D2',
//       duration: '2n',
//       velocity: 1,
//     },
//   ],
//   loop: '2m',
// };

// function initDrums() {
//   // так как мы вынесли настройки семплера отдельно
//   // ко всем настройкам барабанов, то при создании их передаём
//   drums.sampler.node = new Tone.Sampler(drums.sampler);
//   drums.tremolo.node = new Tone.Tremolo(drums.tremolo).start();
//   drums.jcReverb.node = new Tone.JCReverb(drums.jcReverb);
//   drums.channel.node = new Tone.Channel(drums.channel).toDestination();

//   drums.sampler.node.chain(
//     drums.tremolo.node,
//     drums.jcReverb.node,
//     drums.channel.node
//   );

//   const part = new Tone.Part((time, note) => {
//     drums.sampler.node.triggerAttackRelease(
//       note.noteName,
//       note.duration,
//       time,
//       note.velocity
//     );
//   }, drums.sequence).start(0);

//   part.loopEnd = drums.loop;
//   part.loop = true;
// }

// function initDrumsUI() {
//   const channelVolumeSlider = document.getElementById('drumsChannelVolume');
//   channelVolumeSlider.value = drums.channel.volume;

//   channelVolumeSlider.addEventListener('input', (e) => {
//     drums.channel.node.volume.value = e.target.value;
//   });
// }

const bassLow = {
  synth: {
    volume: 0.8,
    detune: 0.3,
    portamento: 0.05,
    envelope: {
      attack: 0.05,
      attackCurve: 'exponential',
      decay: 0.2,
      decayCurve: 'exponential',
      sustain: 0.2,
      release: 1.5,
      releaseCurve: 'exponential',
    },
    oscillator: {
      type: 'sawtooth',
      modulationType: 'sine',
      phase: 0,
      harmonicity: 0.5,
      node: null,
    },
  },
  tremolo: {
    wet: 1,
    frequency: 30,
    type: 'square',
    depth: 0.9,
    spread: 100,
    node: null,
  },
  channel: {
    volume: -24,
    pan: 0,
    mute: false,
    solo: false,
    node: null,
  },
  sequence: [
    {
      time: '0:0:0',
      noteName: 'C2',
      duration: '1m',
      velocity: 1,
    },
    {
      time: '1:0:0',
      noteName: 'F2',
      duration: '1m',
      velocity: 1,
    },
  ],
  loop: '2m',
};

function initBassLow() {
  bassLow.synth.node = new Tone.PolySynth(bassLow.synth);
  bassLow.tremolo.node = new Tone.Tremolo(bassLow.tremolo).start();
  bassLow.channel.node = new Tone.Channel(bassLow.channel).toDestination();
  bassLow.synth.node.chain(bassLow.tremolo.node, bassLow.channel.node);

  const part = new Tone.Part((time, note) => {
    bassLow.synth.node.triggerAttackRelease(
      [note.noteName, note.noteName, note.noteName],
      note.duration,
      time,
      note.velocity
    );
  }, bassLow.sequence).start('1:0:0');

  part.loopEnd = bassLow.loop;
  part.loop = true;
}

function initBassLowUI() {
  const channelVolumeSlider = document.getElementById('bassLowChannelVolume');
  channelVolumeSlider.value = bassLow.channel.volume;

  channelVolumeSlider.addEventListener('input', (e) => {
    bassLow.channel.node.volume.value = e.target.value;
  });
}

const bassHigh = {
  synth: {
    volume: 1,
    detune: 0,
    portamento: 0.01,
    harmonicity: 0.5,
    modulationIndex: 4,
    modulation: {
      type: 'square',
      modulationType: 'triangle',
      phase: 0,
      harmonicity: 0,
    },
    modulationEnvelope: {
      attack: 0.5,
      attackCurve: 'exponential',
      decay: 0.8,
      decayCurve: 'exponential',
      sustain: 0.3,
      release: 0.1,
      releaseCurve: 'exponential',
    },
    oscillator: {
      type: 'triangle',
      modulationType: 'sawtooth',
      phase: 0,
      harmonicity: 0,
    },
    envelope: {
      attack: 0.1,
      attackCurve: 'exponential',
      decay: 0.9,
      decayCurve: 'exponential',
      sustain: 0.9,
      release: 0.7,
      releaseCurve: 'exponential',
    },
    node: null,
  },
  stereoWidener: {
    wet: 0.8,
    width: 0.9,
    node: null,
  },
  jcReverb: {
    wet: 0.4,
    roomSize: 0.1,
    node: null,
  },
  channel: {
    volume: -8,
    pan: 0,
    mute: false,
    solo: false,
    node: null,
  },
  sequence: [
    {
      time: '1:2:2',
      noteName: 'D2',
      duration: '4n',
      velocity: 1,
    },
    {
      time: '1:3:0',
      noteName: 'F2',
      duration: '4n',
      velocity: 1,
    },
    {
      time: '1:3:2',
      noteName: 'G2',
      duration: '4n',
      velocity: 1,
    },
    {
      time: '3:2:2',
      noteName: 'C3',
      duration: '4n',
      velocity: 1,
    },
    {
      time: '3:3:2',
      noteName: 'A2',
      duration: '4n',
      velocity: 1,
    },
    {
      time: '6:2:2',
      noteName: 'F2',
      duration: '4n',
      velocity: 1,
    },
    {
      time: '6:3:0',
      noteName: 'A2',
      duration: '4n',
      velocity: 1,
    },
    {
      time: '6:3:2',
      noteName: 'F2',
      duration: '4n',
      velocity: 1,
    },
    {
      time: '7:0:0',
      noteName: 'G2',
      duration: '4n',
      velocity: 1,
    },
  ],
  loop: '8m',
};

function initBassHigh() {
  bassHigh.synth.node = new Tone.FMSynth(bassHigh.synth);
  bassHigh.stereoWidener.node = new Tone.StereoWidener(bassHigh.stereoWidener);
  bassHigh.jcReverb.node = new Tone.JCReverb(bassHigh.jcReverb);
  bassHigh.channel.node = new Tone.Channel(bassHigh.channel).toDestination();
  bassHigh.synth.node.chain(
    bassHigh.stereoWidener.node,
    bassHigh.jcReverb.node,
    bassHigh.channel.node
  );

  const part = new Tone.Part((time, note) => {
    bassHigh.synth.node.triggerAttackRelease(
      note.noteName,
      note.duration,
      time,
      note.velocity
    );
  }, bassHigh.sequence).start('2:0:0');

  part.loopEnd = bassHigh.loop;
  part.loop = true;
}

function initBassHighUI() {
  const channelVolumeSlider = document.getElementById('bassHighChannelVolume');
  channelVolumeSlider.value = bassHigh.channel.volume;

  channelVolumeSlider.addEventListener('input', (e) => {
    bassHigh.channel.node.volume.value = e.target.value;
  });
}

const rythm = {
  synth: {
    volume: 0.8,
    detune: 4,
    portamento: 0.01,
    harmonicity: 0,
    modulation: {
      type: 'triangle',
      phase: 0,
      harmonicity: 0,
    },
    modulationEnvelope: {
      attack: 0.01,
      attackCurve: 'exponential',
      decay: 0.9,
      decayCurve: 'exponential',
      sustain: 0.8,
      release: 0.01,
      releaseCurve: 'exponential',
    },
    oscillator: {
      type: 'sawtooth',
      modulationType: 'sine',
      phase: 0,
      harmonicity: 0,
    },
    envelope: {
      attack: 0.01,
      attackCurve: 'exponential',
      decay: 0.9,
      decayCurve: 'exponential',
      sustain: 0.1,
      release: 0.9,
      releaseCurve: 'exponential',
    },
    node: null,
  },
  autoFilter: {
    wet: 1,
    frequency: '1m',
    type: 'sine',
    depth: 0.8,
    baseFrequency: 200,
    octaves: 3.0,
    filter: {
      type: 'lowpass',
      rolloff: -12,
    },
    node: null,
  },
  pingPongDelay: {
    wet: 0.2,
    delayTime: 0.25,
    maxDelayTime: 1,
    node: null,
  },
  jcReverb: {
    wet: 0.4,
    roomSize: 0.1,
    node: null,
  },
  channel: {
    volume: -20,
    pan: 0,
    mute: false,
    solo: false,
    node: null,
  },
  sequence: [
    {
      time: '0:1:0',
      noteName: 'A6',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '0:0:0',
      noteName: 'A6',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '0:1:2',
      noteName: 'C6',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '0:0:1',
      noteName: 'F6',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '0:0:2',
      noteName: 'C6',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '0:0:3',
      noteName: 'F6',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '0:1:3',
      noteName: 'F6',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '0:2:1',
      noteName: 'C6',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '0:2:3',
      noteName: 'F6',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '0:3:2',
      noteName: 'A6',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '1:0:1',
      noteName: 'C6',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '1:0:0',
      noteName: 'A#5',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '1:0:3',
      noteName: 'F6',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '1:1:1',
      noteName: 'A6',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '1:3:1',
      noteName: 'F6',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '1:3:3',
      noteName: 'A6',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '1:2:3',
      noteName: 'C6',
      duration: '16n',
      velocity: 1,
    },
    {
      time: '1:1:3',
      noteName: 'F6',
      duration: '16n',
      velocity: 1,
    },
  ],
  loop: '2m',
};

function initRythm() {
  rythm.synth.node = new Tone.AMSynth(rythm.synth);
  rythm.autoFilter.node = new Tone.AutoFilter(rythm.autoFilter).start();
  rythm.pingPongDelay.node = new Tone.PingPongDelay(rythm.pingPongDelay);
  rythm.jcReverb.node = new Tone.JCReverb(rythm.jcReverb);
  rythm.channel.node = new Tone.Channel(rythm.channel).toDestination();
  rythm.synth.node.chain(
    rythm.autoFilter.node,
    rythm.pingPongDelay.node,
    rythm.jcReverb.node,
    rythm.channel.node
  );

  const part = new Tone.Part((time, note) => {
    rythm.synth.node.triggerAttackRelease(
      note.noteName,
      note.duration,
      time,
      note.velocity
    );
  }, rythm.sequence).start(0);

  part.loopEnd = rythm.loop;
  part.loop = true;
}

function initRythmUI() {
  const channelVolumeSlider = document.getElementById('rythmChannelVolume');
  channelVolumeSlider.value = rythm.channel.volume;

  channelVolumeSlider.addEventListener('input', (e) => {
    rythm.channel.node.volume.value = e.target.value;
  });
}

function initWebAudio() {
  Tone.start();
}

function initTransport() {
  const transport = Tone.getTransport();
  transport.bpm.value = 112;
  transport.start();
}

// document.addEventListener('DOMContentLoaded', () => {
//   const startButton = document.getElementById('startButton');

//   startButton.addEventListener('click', () => {
//     initWebAudio();
//     // initDrums();
//     // initDrumsUI();

//     initBassLow();
//     initBassLowUI();

//     initBassHigh();
//     initBassHighUI();

//     initRythm();
//     initRythmUI();

//     initTransport();
//   });
// });
