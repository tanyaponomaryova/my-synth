// #region ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// Привязка ползунка: ставит начальное значение, применяет его и слушает input.
// Принимает id или сам элемент. onChange получает уже число.
function bindSlider(idOrElement, initialValue, onChange) {
  const el =
    typeof idOrElement === 'string'
      ? document.getElementById(idOrElement)
      : idOrElement;
  if (!el) {
    console.warn('Ползунок не найден:', idOrElement);
    return;
  }
  // id может стоять на обёртке (.Slider, .Knob): тогда берём input внутри неё
  const slider = el.matches('input')
    ? el
    : el.querySelector('input[type="range"]');
  if (!slider) {
    console.warn('Внутри нет input[type="range"]:', idOrElement);
    return;
  }
  slider.value = initialValue;
  // сообщаем ручкам и флаконам, что значение изменено из кода (обновить вид)
  slider.dispatchEvent(new Event('valuesync', { bubbles: true }));
  onChange(initialValue);
  slider.addEventListener('input', (e) => onChange(Number(e.target.value)));
}

// Создаёт по одному зацикленному Part на каждую мелодию из synth.sequences.
// Звучит только активная мелодия. Выбор (synth.pendingMelody) применяется
// не сразу, а когда начинается следующий цикл: первое же событие нового цикла
// (у любой из мелодий) замечает, что номер цикла сменился, и делает pending активной.
function startPart(synth, callback) {
  const transport = Tone.getTransport();
  const loopTicks = Tone.Time(synth.loop).toTicks();
  const state = (synth.melody = { active: 0, loopIndex: -1 });

  const adopt = (drawTime) => {
    let next = synth.pendingMelody ?? 0;
    if (next < 0 || next >= synth.sequences.length) next = 0;
    if (next === state.active) return;
    state.active = next;
    // сообщаем интерфейсу (убрать «ожидание» у радио-кнопки) в момент, когда это слышно
    const notify = () =>
      document.dispatchEvent(
        new CustomEvent('melodychange', {
          detail: { synth: synth.id, index: next },
        })
      );
    if (drawTime === undefined) notify();
    else Tone.getDraw().schedule(notify, drawTime);
  };

  // после Stop цикл начнётся заново: применяем выбор сразу
  transport.on('stop', () => {
    state.loopIndex = -1;
    adopt();
  });

  return synth.sequences.map((notes, index) => {
    const part = new Tone.Part((time, note) => {
      const loopIndex = Math.floor(
        Math.round(transport.getTicksAtTime(time)) / loopTicks
      );
      if (loopIndex !== state.loopIndex) {
        state.loopIndex = loopIndex;
        adopt(time);
      }
      if (index === state.active) callback(time, note);
    }, notes).start(0);
    part.loopEnd = synth.loop;
    part.loop = true;
    return part;
  });
}
// #endregion

// #region Общие настройки микшера
const master = {
  volume: 0, // громкость в dB: 0 = без ослабления
  node: null,
  meter: null, // измеритель уровня: от него зависит количество пены в стиралке
};

const globalSettings = {
  bpm: 120,
};

function initMaster() {
  master.node = new Tone.Volume(master.volume).toDestination();
  master.meter = new Tone.Meter({ smoothing: 0.8 });
  master.node.connect(master.meter);
}

// Для washer.js: общая громкость 0..1 (-60 dB -> 0, -10 dB -> 1)
window.synthAudio = {
  getLevel() {
    if (!master.meter) return 0;
    const db = master.meter.getValue();
    return Math.min(1, Math.max(0, (db + 60) / 50)) || 0;
  },
};

function initMasterUI() {
  bindSlider('bpmSlider', globalSettings.bpm, (v) => {
    globalSettings.bpm = v;
    Tone.getTransport().bpm.value = v;
  });

  bindSlider('masterVolume', master.volume, (v) => {
    master.node.volume.value = v;
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
        urls: { C2: 'percs-bundle-clean-shake.wav' },
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
        maxDelay: 1, // в Tone.js параметр называется maxDelay
        node: null,
      },
      noteName: 'C2',
      sliderId: 'snareVolume',
      row: null,
    },
    hihat: {
      sampler: {
        urls: { C2: 'wood-click_144bpm.wav' },
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
      sliderId: 'hihatVolume',
      row: null,
    },
    clap: {
      sampler: {
        urls: { C2: 'percussion-ding.wav' },
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

  new Tone.Sequence(
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
      Tone.getDraw().schedule(() => highlightStep(step), time);
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
    bindSlider(track.sliderId, track.channel.volume, (v) => {
      track.channel.node.volume.value = v;
    });
  });
}

let lastStep = null;

function highlightStep(step) {
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

// #region ОБЩЕЕ ДЛЯ ВСЕХ СИНТОВ
// Настройки общих эффектов.
// Ползунок эффекта (0..1) у каждого синта хранится в synth.amount и управляет
// самым заметным параметром эффекта, а не wet:
//   tremolo -> depth (глубина «качания» громкости)
//   delay   -> feedback (сколько повторов) + wet включается, если ползунок > 0
//   reverb  -> decay (длина хвоста, сек) + wet включается, если ползунок > 0
// wet ниже -- фиксированная «громкость эффекта», когда он включён.
const commonFx = {
  tremolo: { frequency: 4, depth: 0.6, wet: 1 },
  pingPongDelay: { delayTime: '8n', feedback: 0.3, maxDelay: 2, wet: 0.5 },
  reverb: { decay: 3, preDelay: 0.02, wet: 0.6 },
};

// Как значение ползунка 0..1 превращается в параметр эффекта
const fxRange = {
  delayFeedback: (v) => v * 0.9, // 0.9 максимум, дальше начинается самовозбуд
  reverbDecay: (v) => 0.5 + v * 7.5, // от 0.5 до 8 секунд
};

// Подключает к концу внутренней цепочки синта общие эффекты и канал:
//   lastNode -> tremolo -> pingPongDelay -> reverb -> channel -> master
async function connectCommonFx(synth, lastNode) {
  synth.fx = {
    tremolo: new Tone.Tremolo({
      ...commonFx.tremolo,
      depth: synth.amount.tremolo,
    }).start(),
    pingPongDelay: new Tone.PingPongDelay({
      ...commonFx.pingPongDelay,
      feedback: fxRange.delayFeedback(synth.amount.pingPongDelay),
      wet: synth.amount.pingPongDelay > 0 ? commonFx.pingPongDelay.wet : 0,
    }),
    reverb: new Tone.Reverb({
      ...commonFx.reverb,
      decay: fxRange.reverbDecay(synth.amount.reverb),
      wet: synth.amount.reverb > 0 ? commonFx.reverb.wet : 0,
    }),
  };
  synth.channel.node = new Tone.Channel(synth.channel).connect(master.node);

  lastNode.chain(
    synth.fx.tremolo,
    synth.fx.pingPongDelay,
    synth.fx.reverb,
    synth.channel.node
  );

  await synth.fx.reverb.ready; // Reverb генерирует импульс асинхронно
}

// Что умеют ползунки с data-param="...":
//   get(synth)    -- стартовое значение из конфига синта
//   set(synth, v) -- применить значение к созданным узлам
// Чтобы добавить новый параметр, достаточно дописать сюда одну строку.
const synthParams = {
  // общие
  volume: {
    get: (s) => s.channel.volume,
    set: (s, v) => (s.channel.node.volume.value = v),
  },
  // tremolo: ползунок = глубина качания громкости
  tremolo: {
    get: (s) => s.amount.tremolo,
    set: (s, v) => (s.fx.tremolo.depth.value = v),
  },
  // delay: ползунок = feedback (число повторов); на 0 эффект полностью выключен
  delay: {
    get: (s) => s.amount.pingPongDelay,
    set: (s, v) => {
      s.fx.pingPongDelay.feedback.value = fxRange.delayFeedback(v);
      s.fx.pingPongDelay.wet.value = v > 0 ? commonFx.pingPongDelay.wet : 0;
    },
  },
  // reverb: ползунок = длина хвоста (decay); на 0 эффект полностью выключен.
  // Смена decay заново генерирует импульс, поэтому делаем это с задержкой,
  // чтобы не пересчитывать его на каждый пиксель движения ползунка.
  reverb: {
    get: (s) => s.amount.reverb,
    set: (s, v) => {
      s.fx.reverb.wet.value = v > 0 ? commonFx.reverb.wet : 0;
      clearTimeout(s.reverbTimer);
      if (v > 0) {
        s.reverbTimer = setTimeout(() => {
          s.fx.reverb.decay = fxRange.reverbDecay(v);
        }, 120);
      }
    },
  },
  // внутренние (есть только у некоторых синтов)
  //   phaser: {
  //     get: (s) => s.phaser?.frequency, // у synth2/3 фазера нет -> undefined
  //     set: (s, v) => {
  //       if (s.phaser?.node) s.phaser.node.frequency.value = v;
  //     },
  //   },
};

// Один UI для всех синтов. Ищет в HTML:
//   <input type="range" data-synth="synth1" data-param="volume">
//   <div data-synth="synth1" data-param="oscillator"> ...кнопки... </div>
function initSynthsUI() {
  // ползунки
  document
    .querySelectorAll('input[data-synth][data-param]')
    .forEach((slider) => {
      const synth = synths[slider.dataset.synth];
      const param = synthParams[slider.dataset.param];

      console.log(slider.dataset.synth, slider.dataset.param);

      if (!synth || !param) {
        console.warn('Неизвестный data-synth / data-param:', slider);
        return;
      }

      const initial = param.get(synth);
      if (initial === undefined) {
        console.warn('У синта нет такого параметра:', slider);
        return;
      }

      bindSlider(slider, initial, (v) => {
        console.log(
          '\n onChange \nсинт:',
          slider.dataset.synth,
          '\n параметр:',
          slider.dataset.param,
          '\n значение:',
          v
        );

        param.set(synth, v);
      });
    });

  // выбор осциллятора (у NoiseSynth его нет -- такие группы пропускаем)
  document.querySelectorAll('[data-param="oscillator"]').forEach((group) => {
    const synth = synths[group.dataset.synth];
    if (!synth || !synth.synth.node.oscillator) return;

    const buttons = group.querySelectorAll('.ToggleButton');
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        console.log(
          'click \n синт:',
          group.dataset.synth,
          '\n параметр:',
          group.dataset.param,
          '\n тип: ',
          button.dataset.type
        );

        synth.synth.node.oscillator.type = button.dataset.type;
        buttons.forEach((b) => b.classList.remove('active'));
        button.classList.add('active');
      });
    });
  });
}
// #endregion

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
  // внутренний эффект (только у этого синта)
  phaser: {
    frequency: 0,
    octaves: 1,
    baseFrequency: 1000,
    node: null,
  },
  // стартовое положение ползунков общих эффектов (0 = выключен, 1 = максимум)
  amount: {
    tremolo: 0,
    pingPongDelay: 0.2,
    reverb: 0,
  },
  channel: {
    volume: -100,
    node: null,
  },
  // Три мелодии одного синта. Выбираются радио-кнопками под ручкой громкости;
  // новая мелодия включается только когда закончится текущий loop.
  // Длина loop (ниже) общая для всех трёх мелодий.
  sequences: [
    // мелодия 1 (исходная)
    [
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
    // мелодия 2: спокойная, редкие ноты
    [
      { time: '0:0:0', noteName: 'B5', duration: '4n', velocity: 1 },
      { time: '0:1:2', noteName: 'A5', duration: '8n', velocity: 1 },
      { time: '0:2:2', noteName: 'G5', duration: '4n', velocity: 1 },
      { time: '1:0:0', noteName: 'A5', duration: '8n', velocity: 1 },
      { time: '1:1:0', noteName: 'B5', duration: '4n', velocity: 1 },
      { time: '1:2:0', noteName: 'G5', duration: '8n', velocity: 1 },
      { time: '1:3:0', noteName: 'A5', duration: '4n', velocity: 1 },
    ],
    // мелодия 3: оживлённая, восьмыми
    [
      { time: '0:0:0', noteName: 'G5', duration: '8n', velocity: 1 },
      { time: '0:0:2', noteName: 'A5', duration: '8n', velocity: 1 },
      { time: '0:1:0', noteName: 'B5', duration: '8n', velocity: 1 },
      { time: '0:1:2', noteName: 'A5', duration: '8n', velocity: 1 },
      { time: '0:2:0', noteName: 'G5', duration: '8n', velocity: 1 },
      { time: '0:2:2', noteName: 'A5', duration: '8n', velocity: 1 },
      { time: '0:3:0', noteName: 'B5', duration: '8n', velocity: 1 },
      { time: '0:3:2', noteName: 'B5', duration: '8n', velocity: 1 },
      { time: '1:0:0', noteName: 'A5', duration: '8n', velocity: 1 },
      { time: '1:0:2', noteName: 'G5', duration: '8n', velocity: 1 },
      { time: '1:1:0', noteName: 'A5', duration: '8n', velocity: 1 },
      { time: '1:2:0', noteName: 'B5', duration: '8n', velocity: 1 },
      { time: '1:2:2', noteName: 'A5', duration: '8n', velocity: 1 },
      { time: '1:3:0', noteName: 'G5', duration: '8n', velocity: 1 },
    ],
  ],
  loop: '2m',
};

async function initSynth1() {
  // внутренняя часть: синт -> phaser
  synth1.synth.node = new Tone.Synth(synth1.synth);
  synth1.phaser.node = new Tone.Phaser(synth1.phaser);
  synth1.synth.node.connect(synth1.phaser.node);

  // общая часть: tremolo -> pingPongDelay -> reverb -> channel -> master
  await connectCommonFx(synth1, synth1.phaser.node);

  startPart(synth1, (time, note) => {
    synth1.synth.node.triggerAttackRelease(
      note.noteName,
      note.duration,
      time,
      note.velocity
    );
  });
}

// #endregion SYNTH 1

// #region SYNTH 2
const synth2 = {
  // Если нужно ярче и «стеклянней»,
  // поднимите modulationIndex до 4–5 и частоту фильтра до 5000.
  // Если ещё мягче и теплее, опустите modulationIndex до 1.5
  // и фильтр до 2200. Чтобы больше «воды», увеличьте
  // decay реверба (commonFx.reverb.decay) до 4 и wet эха до 0.35.
  synth: {
    harmonicity: 3.99,
    modulationIndex: 1.5,
    oscillator: {
      type: 'sine',
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
  // внутренние эффекты (только у этого синта)
  filter: {
    type: 'lowpass',
    frequency: 2200,
    Q: 0.5,
    node: null,
  },
  chorus: {
    frequency: 1,
    delayTime: 10,
    depth: 0.25,
    wet: 0.35,
    node: null,
  },
  amount: {
    tremolo: 0,
    pingPongDelay: 0,
    reverb: 0.2,
  },
  channel: {
    volume: -100,
    node: null,
  },
  // Три мелодии одного синта. Выбираются радио-кнопками под ручкой громкости;
  // новая мелодия включается только когда закончится текущий loop.
  // Длина loop (ниже) общая для всех трёх мелодий.
  sequences: [
    // мелодия 1 (исходная)
    [
      // Такт 1
      {
        time: '0:0:0',
        noteName: 'G3',
        duration: '2n',
        velocity: 0.35,
      },
      {
        time: '0:2:0',
        noteName: 'D4',
        duration: '4n',
        velocity: 0.25,
      },
      {
        time: '0:3:0',
        noteName: 'G4',
        duration: '4n',
        velocity: 0.3,
      },

      // Такт 2
      {
        time: '1:0:0',
        noteName: 'E3',
        duration: '2n',
        velocity: 0.35,
      },
      {
        time: '1:2:0',
        noteName: 'B3',
        duration: '4n',
        velocity: 0.25,
      },
      {
        time: '1:3:0',
        noteName: 'E4',
        duration: '4n',
        velocity: 0.3,
      },
    ],
    // мелодия 2: C -> D
    [
      { time: '0:0:0', noteName: 'C3', duration: '2n', velocity: 0.35 },
      { time: '0:2:0', noteName: 'G3', duration: '4n', velocity: 0.25 },
      { time: '0:3:0', noteName: 'C4', duration: '4n', velocity: 0.3 },
      { time: '1:0:0', noteName: 'D3', duration: '2n', velocity: 0.35 },
      { time: '1:2:0', noteName: 'A3', duration: '4n', velocity: 0.25 },
      { time: '1:3:0', noteName: 'D4', duration: '4n', velocity: 0.3 },
    ],
    // мелодия 3: Am -> D
    [
      { time: '0:0:0', noteName: 'A3', duration: '2n', velocity: 0.35 },
      { time: '0:2:0', noteName: 'E4', duration: '4n', velocity: 0.25 },
      { time: '0:3:0', noteName: 'A4', duration: '4n', velocity: 0.3 },
      { time: '1:0:0', noteName: 'D3', duration: '2n', velocity: 0.35 },
      { time: '1:2:0', noteName: 'A3', duration: '4n', velocity: 0.25 },
      { time: '1:3:0', noteName: 'D4', duration: '4n', velocity: 0.3 },
    ],
  ],
  loop: '2m',
};

async function initSynth2() {
  // внутренняя часть: синт -> filter -> chorus
  synth2.synth.node = new Tone.AMSynth(synth2.synth);
  synth2.filter.node = new Tone.Filter(synth2.filter);
  synth2.chorus.node = new Tone.Chorus(synth2.chorus).start();
  synth2.synth.node.chain(synth2.filter.node, synth2.chorus.node);

  // общая часть
  await connectCommonFx(synth2, synth2.chorus.node);

  startPart(synth2, (time, note) => {
    synth2.synth.node.triggerAttackRelease(
      note.noteName,
      note.duration,
      time,
      note.velocity
    );
  });
}

// #endregion SYNTH 2

// #region SYNTH 3
const synth3 = {
  // Основной звук — мелодия
  synth: {
    harmonicity: 3.99,
    modulationIndex: 1.5,
    oscillator: {
      type: 'sine',
    },
    envelope: {
      attack: 0.02,
      decay: 0.8,
      sustain: 0.15,
      release: 1.0,
    },
    modulation: {
      type: 'sine',
    },
    modulationEnvelope: {
      attack: 0.01,
      decay: 0.15,
      sustain: 0,
      release: 0.2,
    },
    node: null,
  },

  // Фильтр мелодии — сохраняем читаемость нот
  bandpass: {
    type: 'bandpass',
    frequency: 440,
    Q: 1.2,
    rolloff: -12,
    node: null,
  },

  // Мягкий верхний срез
  lowpass: {
    type: 'lowpass',
    frequency: 2200,
    Q: 0.4,
    rolloff: -24,
    node: null,
  },

  chorus: {
    frequency: 0.5,
    delayTime: 18,
    depth: 0.35,
    wet: 0.2,
    node: null,
  },

  // Фоновый розовый шум моря
  seaNoise: {
    type: 'pink',
    volume: -10, // dB: тихий, но различимый фон
    node: null,
    gain: null,
  },

  // Медленное изменение фильтра шума
  filterLfo: {
    frequency: 0.035,
    min: 500,
    max: 1100,
    node: null,
  },

  // Общие эффекты
  amount: {
    tremolo: 0.2,
    pingPongDelay: 0,
    reverb: 0.25,
  },

  // Громкость канала
  channel: {
    volume: -100,
    node: null,
  },

  glide: 0.08,

  // Три мелодии одного синта. Выбираются радио-кнопками под ручкой громкости;
  // новая мелодия включается только когда закончится текущий loop.
  // Длина loop (ниже) общая для всех трёх мелодий.
  sequences: [
    // мелодия 1 (исходная)
    [
      { time: '0:0:0', noteName: 'C3', duration: '4n', velocity: 0.9 },
      { time: '0:1:0', noteName: 'D3', duration: '4n', velocity: 0.9 },
      { time: '0:2:0', noteName: 'E3', duration: '2n', velocity: 0.9 },

      { time: '1:0:0', noteName: 'A3', duration: '4n', velocity: 0.9 },
      { time: '1:1:0', noteName: 'G3', duration: '4n', velocity: 0.9 },
      { time: '1:2:0', noteName: 'E3', duration: '4n', velocity: 0.9 },
      { time: '1:3:0', noteName: 'D3', duration: '4n', velocity: 0.9 },

      { time: '2:0:0', noteName: 'C3', duration: '4n', velocity: 0.9 },
      { time: '2:1:0', noteName: 'D3', duration: '4n', velocity: 0.9 },
      { time: '2:2:0', noteName: 'E3', duration: '2n', velocity: 0.9 },

      { time: '3:0:0', noteName: 'A3', duration: '4n', velocity: 0.9 },
      { time: '3:1:0', noteName: 'G3', duration: '4n', velocity: 0.9 },
      { time: '3:2:0', noteName: 'C3', duration: '4n', velocity: 0.9 },
      { time: '3:3:0', noteName: 'E3', duration: '2n', velocity: 0.9 },
    ],
    // мелодия 2: плавная волна
    [
      { time: '0:0:0', noteName: 'E3', duration: '4n', velocity: 0.9 },
      { time: '0:1:0', noteName: 'G3', duration: '4n', velocity: 0.9 },
      { time: '0:2:0', noteName: 'A3', duration: '2n', velocity: 0.9 },
      { time: '1:0:0', noteName: 'G3', duration: '4n', velocity: 0.9 },
      { time: '1:1:0', noteName: 'E3', duration: '4n', velocity: 0.9 },
      { time: '1:2:0', noteName: 'D3', duration: '2n', velocity: 0.9 },
      { time: '2:0:0', noteName: 'E3', duration: '4n', velocity: 0.9 },
      { time: '2:1:0', noteName: 'G3', duration: '4n', velocity: 0.9 },
      { time: '2:2:0', noteName: 'A3', duration: '4n', velocity: 0.9 },
      { time: '2:3:0', noteName: 'G3', duration: '4n', velocity: 0.9 },
      { time: '3:0:0', noteName: 'E3', duration: '4n', velocity: 0.9 },
      { time: '3:1:0', noteName: 'D3', duration: '4n', velocity: 0.9 },
      { time: '3:2:0', noteName: 'C3', duration: '2n', velocity: 0.9 },
    ],
    // мелодия 3: медленная, длинные ноты
    [
      { time: '0:0:0', noteName: 'C3', duration: '2n', velocity: 0.9 },
      { time: '0:2:0', noteName: 'E3', duration: '2n', velocity: 0.9 },
      { time: '1:0:0', noteName: 'D3', duration: '2n', velocity: 0.9 },
      { time: '1:2:0', noteName: 'A3', duration: '2n', velocity: 0.9 },
      { time: '2:0:0', noteName: 'G3', duration: '2n', velocity: 0.9 },
      { time: '2:2:0', noteName: 'E3', duration: '2n', velocity: 0.9 },
      { time: '3:0:0', noteName: 'D3', duration: '2n', velocity: 0.9 },
      { time: '3:2:0', noteName: 'C3', duration: '2n', velocity: 0.9 },
    ],
  ],

  loop: '4m',
};

async function initSynth3() {
  synth3.synth.node = new Tone.FMSynth(synth3.synth);

  synth3.bandpass.node = new Tone.Filter(synth3.bandpass);
  synth3.lowpass.node = new Tone.Filter(synth3.lowpass);
  synth3.chorus.node = new Tone.Chorus(synth3.chorus).start();

  // Цепочка мелодии
  synth3.synth.node.chain(
    synth3.bandpass.node,
    synth3.lowpass.node,
    synth3.chorus.node
  );

  // Розовый шум моря
  synth3.seaNoise.node = new Tone.Noise('pink');

  // ВАЖНО: Gain принимает линейную громкость, а не dB
  const noiseLinearGain = Math.pow(10, synth3.seaNoise.volume / 20);

  synth3.seaNoise.gain = new Tone.Gain(noiseLinearGain);

  synth3.seaNoise.node.connect(synth3.seaNoise.gain);

  // Шум проходит через фильтр, но не через фильтр мелодии
  synth3.seaNoise.gain.connect(synth3.lowpass.node);

  synth3.seaNoise.node.start();

  // Плавное движение фильтра — эффект морских волн
  synth3.filterLfo.node = new Tone.LFO({
    frequency: synth3.filterLfo.frequency,
    min: synth3.filterLfo.min,
    max: synth3.filterLfo.max,
    type: 'sine',
  });

  synth3.filterLfo.node.connect(synth3.lowpass.node.frequency);

  synth3.filterLfo.node.start();

  // Общие эффекты проекта
  await connectCommonFx(synth3, synth3.chorus.node);

  // Запуск мелодии
  startPart(synth3, (time, note) => {
    synth3.synth.node.triggerAttackRelease(
      note.noteName,
      note.duration,
      time,
      note.velocity
    );
  });
}

// #endregion SYNTH 3

// реестр: по нему data-synth="synth1" находит объект синта
const synths = { synth1, synth2, synth3 };
// имя синта нужно, чтобы сообщать интерфейсу о смене мелодии
Object.entries(synths).forEach(([id, s]) => (s.id = id));

// #region ВЫБОР МЕЛОДИИ (радио-кнопки под ручками громкости)
// Ищет в HTML: <div class="MelodyPicker" data-melody-synth="synth1"> с тремя radio.
// Работает и до первого нажатия Play: выбор запоминается и применится на старте.
function initMelodyUI() {
  document.querySelectorAll('.MelodyPicker').forEach((picker) => {
    const id = picker.dataset.melodySynth;
    const synth = synths[id];
    if (!synth) {
      console.warn('Неизвестный data-melody-synth:', picker);
      return;
    }
    const radios = picker.querySelectorAll('input[type="radio"]');

    // «в очереди»: выбрано, но ещё не звучит (ждём конца loop)
    const refresh = () => {
      const playing = synth.melody ? synth.melody.active : 0;
      radios.forEach((r) =>
        r
          .closest('.MelodyRadio')
          .classList.toggle(
            'is-queued',
            r.checked && Number(r.value) !== playing
          )
      );
    };

    radios.forEach((r) => {
      if (r.checked) synth.pendingMelody = Number(r.value);
      r.addEventListener('change', () => {
        synth.pendingMelody = Number(r.value);
        refresh();
      });
    });

    document.addEventListener('melodychange', (e) => {
      if (e.detail.synth === id) refresh();
    });
    refresh();
  });
}
// #endregion

// #region СТАРТ / PLAY / PAUSE
let initialized = false;

async function initAll() {
  initMaster();

  initDrums();

  await Promise.all([initSynth1(), initSynth2(), initSynth3()]);

  // UI подключаем, когда все узлы уже созданы
  initMasterUI();
  initDrumsUI();
  initSynthsUI();

  await Tone.loaded(); // ждём загрузки сэмплов
}

// Иконку play/pause рисует CSS (.DrumButton.is-playing), текст кнопки не трогаем
function setPlayButtonText(button, isPlaying) {
  button.classList.toggle('is-playing', isPlaying);
  button.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
  // стиральная машина (washer.js) крутится, пока играет музыка
  document.dispatchEvent(
    new CustomEvent('playstatechange', { detail: { playing: isPlaying } })
  );
}

document.addEventListener('DOMContentLoaded', () => {
  const playButton = document.getElementById('startButton');
  const stopButton = document.getElementById('stopButton'); // необязательная
  const transport = Tone.getTransport();

  setPlayButtonText(playButton, false);
  initMelodyUI();

  playButton.addEventListener('click', async () => {
    await Tone.start(); // обязательно внутри клика пользователя

    // первая загрузка -- один раз
    if (!initialized) {
      initialized = true;
      playButton.disabled = true;
      await initAll();
      playButton.disabled = false;
    }

    if (transport.state === 'started') {
      transport.pause();
      setPlayButtonText(playButton, false);
    } else {
      transport.start();
      setPlayButtonText(playButton, true);
    }
  });

  // кнопка Stop: сброс на начало и снятие подсветки
  if (stopButton) {
    stopButton.addEventListener('click', () => {
      transport.stop();
      document
        .querySelectorAll('.playing')
        .forEach((el) => el.classList.remove('playing'));
      lastStep = null;
      setPlayButtonText(playButton, false);
    });
  }
});
// #endregion
