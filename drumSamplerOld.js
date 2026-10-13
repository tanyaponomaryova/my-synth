// #region Общие настройки микшера
const master = {
  volume: 0, // громкость в dB: 0 = без ослабления
  node: null,
};

const globalSettings = {
  bpm: 120,
};

function initMaster() {
  master.node = new Tone.Volume(master.volume).toDestination();
}

function initMasterUI() {
  const bpmSlider = document.getElementById('bpmSlider');
  bpmSlider.value = globalSettings.bpm;
  bpmSlider.addEventListener('input', (e) => {
    globalSettings.bpm = e.target.value;
    Tone.getTransport().bpm.value = globalSettings.bpm;
  });

  const masterVolumeSlider = document.getElementById('masterVolume');
  masterVolumeSlider.value = master.volume;
  masterVolumeSlider.addEventListener('input', (e) => {
    master.node.volume.value = e.target.value;
  });
}
// #endregion Общие настройки микшера

// #region DRUM SAMPLER
const drums = {
  steps: 16,
  subdivision: '16n',
  velocity: 1,
  // node -- ссылка на объект Tone.js, создаётся в initDrums
  // row -- ряд секвенсора в HTML, находится в initDrums
  tracks: {
    kick: {
      sampler: {
        urls: {
          // C2: 'BT0A0A7.WAV'
          C2: 'percs-bundle-clean-shake.wav',
        },
        // baseUrl: 'samples/roland_tr_909/',
        baseUrl: 'samples/',
        node: null,
      },
      channel: {
        volume: -100,
        pan: 0,
        mute: false,
        solo: false,
        node: null,
      },
      noteName: 'C2',
      sliderId: 'kickVolume',
      row: null,
    },
    snare: {
      sampler: {
        // urls: { C2: 'ST3T7S7.WAV' },
        // baseUrl: 'samples/roland_tr_909/',
        urls: { C2: 'short-water-drop_C.wav' },
        baseUrl: 'samples/',
        node: null,
      },
      channel: {
        volume: -100,
        pan: 0,
        mute: false,
        solo: false,
        node: null,
      },
      pingPongDelay: {
        wet: 0.2,
        delayTime: 0.25,
        maxDelayTime: 1,
        node: null,
      },
      noteName: 'C2',
      sliderId: 'snareVolume',
      row: null,
    },
    hihat: {
      sampler: {
        urls: { C2: 'HT3DA.WAV' },
        baseUrl: 'samples/roland_tr_909/',
        node: null,
      },
      channel: {
        volume: -100,
        pan: 0,
        mute: false,
        solo: false,
        node: null,
      },
      noteName: 'C2',
      sliderId: 'hihatVolume',
      row: null,
    },
    clap: {
      sampler: {
        urls: { C2: 'CLOP3.WAV' },
        baseUrl: 'samples/roland_tr_909/',
        node: null,
      },
      channel: {
        volume: -100,
        pan: 0,
        mute: false,
        solo: false,
        node: null,
      },
      noteName: 'C2',
      sliderId: 'clapVolume',
      row: null,
    },
  },
};

function initDrums() {
  const tracks = Object.entries(drums.tracks);

  tracks.forEach(([name, track]) => {
    track.sampler.node = new Tone.Sampler(track.sampler);
    track.channel.node = new Tone.Channel(track.channel).connect(master.node);
    if (track.pingPongDelay) {
      track.pingPongDelay.node = new Tone.PingPongDelay(track.pingPongDelay);

      track.sampler.node.chain(track.pingPongDelay.node, track.channel.node);
    } else {
      track.sampler.node.chain(track.channel.node);
    }

    track.row = document.querySelector(`.SequencerRow[data-track="${name}"]`);
  });

  const stepIndexes = [...Array(drums.steps).keys()];

  const sequence = new Tone.Sequence(
    (time, step) => {
      tracks.forEach(([, track]) => {
        if (track.row.children[step].classList.contains('active')) {
          // сэмпл проигрывается целиком, поэтому triggerAttack без release
          track.sampler.node.triggerAttack(
            track.noteName,
            time,
            drums.velocity
          );
        }
      });
      // визуальные изменения синхронизируем с аудио-временем
      Tone.Draw.schedule(() => highlightStep(step), time);
    },
    stepIndexes,
    drums.subdivision
  ).start(0);
}

function initDrumsUI() {
  // клики по кнопкам секвенсора (делегирование)
  document.querySelector('.Sequencer').addEventListener('click', (e) => {
    const button = e.target.closest('.ToggleButton');
    if (button) button.classList.toggle('active');
  });

  // громкость каждой дорожки
  Object.values(drums.tracks).forEach((track) => {
    const channelVolumeSlider = document.getElementById(track.sliderId);
    channelVolumeSlider.value = track.channel.volume; //

    channelVolumeSlider.addEventListener('input', (e) => {
      track.channel.node.volume.value = e.target.value;
    });
  });
}

let lastStep = null;

function highlightStep(step) {
  //   console.log('HIGHLIGHT:', step);

  Object.values(drums.tracks).forEach((track) => {
    const buttons = track.row.querySelectorAll('.ToggleButton');

    // убрать предыдущий highlight
    if (lastStep !== null) {
      buttons[lastStep].classList.remove('playing');
    }

    // добавить новый
    buttons[step].classList.add('playing');
  });

  lastStep = step;
}
// #endregion

// общая функция для смены типа осциллятора у любого синта
// newType -- строка
function changeOscillatorType(synthObj, newType) {
  console.log(synthObj);
  console.log(newType);
  synthObj.synth.node.oscillator.type = newType;
  console.log(synthObj.synth.node.oscillator.type);
}

// #region SYNTH 1
const synth1 = {
  synth: {
    oscillator: {
      type: 'sine',
    },
    envelope: {
      attack: 0.005,
      decay: 0.2,
      sustain: 0.3,
      release: 1,
    },
    node: null,
  },
  filter: {
    frequency: 2100,
    rolloff: -12,
    node: null,
  },
  // эффект 1
  pingPongDelay: {
    wet: 0.2,
    delayTime: 0.25,
    maxDelayTime: 2,
    node: null,
  },
  // эффект 2
  phaser: {
    frequency: 0,
    octaves: 1,
    baseFrequency: 1000,
  },
  channel: {
    volume: -100,
    node: null,
  },
  sequence: [
    {
      time: '0:0:2',
      noteName: 'G5',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '0:1:0',
      noteName: 'A5',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '0:2:0',
      noteName: 'A5',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '0:2:2',
      noteName: 'A5',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '0:3:2',
      noteName: 'B5',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '1:0:0',
      noteName: 'G5',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '1:1:0',
      noteName: 'A5',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '1:2:0',
      noteName: 'A5',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '1:3:0',
      noteName: 'G5',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '1:3:2',
      noteName: 'B5',
      duration: '8n',
      velocity: 1,
    },
  ],
  loop: '2m',
};

function initSynth1() {
  synth1.synth.node = new Tone.Synth(synth1.synth);
  // synth1.filter.node = new Tone.AutoFilter(synth1.filter).start();
  synth1.pingPongDelay.node = new Tone.PingPongDelay(synth1.pingPongDelay);
  synth1.phaser.node = new Tone.Phaser(synth1.phaser);
  synth1.channel.node = new Tone.Channel(synth1.channel).connect(master.node);
  synth1.synth.node.chain(
    // synth1.filter.node,
    synth1.pingPongDelay.node,
    synth1.phaser.node,
    synth1.channel.node
  );

  const part = new Tone.Part((time, note) => {
    synth1.synth.node.triggerAttackRelease(
      note.noteName,
      note.duration,
      time,
      note.velocity
    );
  }, synth1.sequence).start(0);

  part.loopEnd = synth1.loop;
  part.loop = true;
}

function initSynth1UI() {
  const channelVolumeSlider = document.getElementById('synth1ChannelVolume');
  channelVolumeSlider.value = synth1.channel.volume.value;

  channelVolumeSlider.addEventListener('input', (e) => {
    synth1.channel.node.volume.value = e.target.value;
  });

  // эффекты
  // ppd
  const ppdSlider = document.getElementById('pingPongDelay1');
  ppdSlider.value = synth1.pingPongDelay.delayTime;
  ppdSlider.addEventListener('input', (e) => {
    synth1.pingPongDelay.node.delayTime.value = e.target.value;
  });

  // phaser
  const phaserSlider = document.getElementById('phaser1');
  phaserSlider.value = synth1.phaser.frequency;
  phaserSlider.addEventListener('input', (e) => {
    synth1.phaser.node.frequency.value = e.target.value;
  });

  // осциллятор
  const oscillatorTypeButtonSet = document
    .getElementById('oscillatorType1')
    .querySelectorAll('.ToggleButton');

  oscillatorTypeButtonSet.forEach((button) => {
    button.addEventListener('click', () => {
      changeOscillatorType(synth1, button.dataset.type);
      oscillatorTypeButtonSet.forEach((b) => {
        b.classList.remove('active');
      });
      button.classList.toggle('active');
    });
  });
}
// #endregion SYNTH 1

// #region SYNTH 2
const synth2 = {
  // Если нужно ярче и «стеклянней»,
  // поднимите modulationIndex до 4–5 и частоту фильтра до 5000.
  // Если ещё мягче и теплее, опустите modulationIndex до 1.5
  // и фильтр до 2200. Чтобы больше «воды», увеличьте
  // decay реверба до 4 и wet эха до 0.35.
  synth: {
    harmonicity: 3.99,
    modulationIndex: 1.5,
    oscillator: {
      type: 'sine',
      node: null,
    },
    envelope: {
      attack: 0.002,
      decay: 0.9,
      sustain: 0,
      release: 0.9,
    },
    modulation: {
      type: 'sine',
    },
    modulationEnvelope: {
      attack: 0.002,
      decay: 0.15,
      sustain: 0,
      release: 0.2,
    },
    node: null,
  },
  filter: {
    type: 'lowpass',
    frequency: 2200,
    Q: 0.5,
    node: null,
  },
  // эхо
  chorus: {
    frequency: 1,
    delayTime: 10,
    depth: 0.25,
    wet: 0.35,
    node: null,
  },
  channel: {
    volume: -100,
    node: null,
  },
  sequence: [
    {
      time: '0:1:0',
      noteName: 'D5',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '0:1:2',
      noteName: 'E5',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '0:2:2',
      noteName: 'D5',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '0:3:0',
      noteName: 'C5',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '1:0:2',
      noteName: 'E5',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '1:1:2',
      noteName: 'C5',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '1:2:0',
      noteName: 'A4',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '1:3:0',
      noteName: 'G5',
      duration: '8n',
      velocity: 1,
    },
    {
      time: '1:3:2',
      noteName: 'A5',
      duration: '8n',
      velocity: 1,
    },
  ],
  loop: '2m',
};

function initSynth2() {
  synth2.synth.node = new Tone.AMSynth(synth2.synth);
  synth2.filter.node = new Tone.Filter(synth2.filter);
  synth2.chorus.node = new Tone.Chorus(synth2.chorus).start();
  synth2.channel.node = new Tone.Channel(synth2.channel).connect(master.node);
  synth2.synth.node.chain(
    synth2.filter.node,
    synth2.chorus.node,
    synth2.channel.node
  );

  const part = new Tone.Part((time, note) => {
    synth2.synth.node.triggerAttackRelease(
      note.noteName,
      note.duration,
      time,
      note.velocity
    );
  }, synth2.sequence).start(0);

  part.loopEnd = synth2.loop;
  part.loop = true;
}

function initSynth2UI() {
  const channelVolumeSlider = document.getElementById('synth2ChannelVolume');
  channelVolumeSlider.value = synth2.channel.volume.value;

  channelVolumeSlider.addEventListener('input', (e) => {
    synth2.channel.node.volume.value = e.target.value;
  });

  // осциллятор
  const oscillatorTypeButtonSet = document
    .getElementById('oscillatorType2')
    .querySelectorAll('.ToggleButton');

  oscillatorTypeButtonSet.forEach((button) => {
    button.addEventListener('click', () => {
      changeOscillatorType(synth2, button.dataset.type);
      oscillatorTypeButtonSet.forEach((b) => {
        b.classList.remove('active');
      });
      button.classList.toggle('active');
    });
  });
}
// #endregion SYNTH 2

// #region SYNTH 3
const synth3 = {
  // Подсказки по настройке:
  // - Чтобы мелодия была слышна чётче, поднимите bandpass.Q до 10–14
  //   (шум станет «свистящим», менее водяным).
  // - Чтобы было больше «шума» и меньше мелодии, опустите Q до 2–3.
  // - Чтобы пена шуршала сильнее, поднимите foam.volume до -24.
  // - Чтобы волны качались медленнее и глубже, tremolo.frequency 0.1, depth 0.5.
  // - Ещё бархатнее: lowpass.frequency 1200.
  synth: {
    oscillator: {
      type: 'sine',
      node: null,
    },
    noise: {
      type: 'pink', // 'brown' — ещё глубже и глуше
      playbackRate: 1,
    },
    envelope: {
      attack: 0.8, // вода «набирается» плавно
      decay: 0.5,
      sustain: 1,
      release: 2.5,
    },
    node: null,
  },
  // узкий фильтр, который настраивается на ноту — отвечает за мелодию
  bandpass: {
    type: 'bandpass',
    frequency: 440,
    Q: 2,
    rolloff: -12,
    node: null,
  },
  // бархат: срезаем всё острое
  lowpass: {
    type: 'lowpass',
    frequency: 1800,
    Q: 0.3,
    rolloff: -24,
    node: null,
  },
  // медленные «волны» — громкость плавно качается
  tremolo: {
    frequency: 0.18,
    depth: 0.4,
    spread: 90,
    wet: 1,
    node: null,
  },
  chorus: {
    frequency: 0.6,
    delayTime: 18,
    depth: 0.6,
    wet: 0.45,
    node: null,
  },
  reverb: {
    decay: 5,
    preDelay: 0.05,
    wet: 0.45,
    node: null,
  },
  // слой шуршащей пены (играет постоянно, мелодию не играет)
  foam: {
    noise: {
      type: 'white',
    },
    highpass: {
      type: 'highpass',
      frequency: 5000,
      Q: 0.2,
      node: null,
    },
    tremolo: {
      frequency: 0.35,
      depth: 0.8,
      node: null,
    },
    volume: -32,
    node: null,
  },
  channel: {
    volume: -100,
    node: null,
  },
  // скольжение фильтра между нотами (сек) — чем больше, тем «водянистее»
  glide: 0.08,
  sequence: [
    {
      time: '0:0:0',
      noteName: 'D4',
      duration: '2n',
      velocity: 1,
    },
    {
      time: '0:2:0',
      noteName: 'F4',
      duration: '2n',
      velocity: 1,
    },
    {
      time: '1:0:0',
      noteName: 'A4',
      duration: '2n',
      velocity: 1,
    },
    {
      time: '2:0:0',
      noteName: 'G4',
      duration: '2n',
      velocity: 1,
    },
    {
      time: '2:2:0',
      noteName: 'E4',
      duration: '2n',
      velocity: 1,
    },
    {
      time: '3:0:0',
      noteName: 'D4',
      duration: '1m',
      velocity: 1,
    },
  ],
  loop: '4m',
};

function initSynth3() {
  synth3.synth.node = new Tone.NoiseSynth(synth3.synth);
  synth3.bandpass.node = new Tone.Filter(synth3.bandpass);
  synth3.lowpass.node = new Tone.Filter(synth3.lowpass);
  synth3.tremolo.node = new Tone.Tremolo(synth3.tremolo).start();
  synth3.chorus.node = new Tone.Chorus(synth3.chorus).start();
  synth3.reverb.node = new Tone.Reverb(synth3.reverb);
  synth3.channel.node = new Tone.Channel(synth3.channel).connect(master.node);

  // основной голос
  synth3.synth.node.chain(
    synth3.bandpass.node,
    synth3.lowpass.node,
    synth3.tremolo.node,
    synth3.chorus.node,
    synth3.reverb.node,
    synth3.channel.node
  );

  // слой пены
  synth3.foam.node = new Tone.Noise(synth3.foam.noise);
  synth3.foam.node.volume.value = synth3.foam.volume;
  synth3.foam.highpass.node = new Tone.Filter(synth3.foam.highpass);
  synth3.foam.tremolo.node = new Tone.Tremolo(synth3.foam.tremolo).start();
  synth3.foam.node.chain(
    synth3.foam.highpass.node,
    synth3.foam.tremolo.node,
    synth3.reverb.node
  );
  synth3.foam.node.start();

  // мелодия: настраиваем фильтр на ноту, затем запускаем шум
  const part = new Tone.Part((time, note) => {
    const freq = Tone.Frequency(note.noteName).toFrequency();
    synth3.bandpass.node.frequency.setTargetAtTime(freq, time, synth3.glide);
    synth3.synth.node.triggerAttackRelease(note.duration, time, note.velocity);
  }, synth3.sequence).start(0);

  part.loopEnd = synth3.loop;
  part.loop = true;
}

function initSynth3UI() {
  const channelVolumeSlider = document.getElementById('synth3ChannelVolume');
  channelVolumeSlider.value = synth3.channel.volume.value;

  channelVolumeSlider.addEventListener('input', (e) => {
    synth3.channel.node.volume.value = e.target.value;
  });

  // осциллятор
  const oscillatorTypeButtonSet = document
    .getElementById('oscillatorType3')
    .querySelectorAll('.ToggleButton');

  oscillatorTypeButtonSet.forEach((button) => {
    button.addEventListener('click', () => {
      changeOscillatorType(synth3, button.dataset.type);
      oscillatorTypeButtonSet.forEach((b) => {
        b.classList.remove('active');
      });
      button.classList.toggle('active');
    });
  });
}
// #endregion SYNTH 3

function initWebAudio() {
  return Tone.start();
}

function initTransport() {
  const transport = Tone.getTransport();
  transport.bpm.value = globalSettings.bpm;
  transport.start();
}

document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('startButton');

  startButton.addEventListener('click', async () => {
    initWebAudio();

    initMaster();
    initMasterUI();

    initDrums();
    initDrumsUI();

    initSynth1();
    initSynth1UI();

    initSynth2();
    initSynth2UI();

    initSynth3();
    initSynth3UI();

    initTransport();
  });
});
