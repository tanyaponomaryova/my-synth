// ============ Звуки интерфейса (сэмплы из samples/ui/) ============
// 1) Положите файлы в папку samples/ui/ и впишите их имена в UI_SOUNDS ниже.
// 2) Громкость: у каждого звука своё поле volume (dB); общая громкость -- ползунок UI.
// Если файла нет, звук просто не играет (список отсутствующих будет в консоли).
(function () {
  if (typeof Tone === 'undefined') return;

  const FOLDER = 'samples/ui/';

  // files     -- один или несколько файлов; у одноразовых звуков выбирается случайный
  // volume    -- громкость звука в dB (0 = как в файле, -12 = тише). ГЛАВНАЯ РУЧКА БАЛАНСА
  // loop      -- зацикленный звук (нужен бесшовный файл)
  // move      -- звук «следует за рукой»: громче при быстром движении, затихает, когда рука стоит
  // sensitivity -- насколько быстро движение доводит звук до полной громкости (только move)
  // rate      -- [мин, макс] скорость воспроизведения по значению ползунка (только move)
  // detune    -- случайный разброс высоты в центах (только одноразовые), чтобы не надоедало
  // fade      -- плавное появление/исчезание в секундах (шум стиралки)
  const UI_SOUNDS = {
    sock: {
      files: ['sock-rustle.wav'],
      volume: -14,
      loop: true,
      move: true,
      sensitivity: 1.5,
    }, // носки на трубе
    fill: {
      files: ['water-fill.wav'],
      volume: -14,
      loop: true,
      move: true,
      sensitivity: 1.5,
      rate: [0.85, 1.35],
    }, // флаконы
    knob: {
      files: ['knob-creak.wav'],
      volume: -18,
      loop: true,
      move: true,
      sensitivity: 1,
    }, // ручки
    washer: {
      files: ['freesound_community-washing-machine-soft-60397.mp3'],
      volume: -22,
      loop: true,
      fade: 1,
    }, // шум работающей машины
    curtain: {
      files: ['curtain-1.wav', 'curtain-2.wav'],
      volume: -12,
      detune: 100,
    }, // выбор осциллятора
    pause: { files: ['pause-knock.wav'], volume: -14, detune: 100 }, // клик по барабану / Stop
    tile: {
      files: ['tile-knock-1.wav', 'tile-knock-2.wav', 'tile-knock-3.wav'],
      volume: -10,
      detune: 150,
    }, // клики по секвенсору
  };

  const rand = (a, b) => a + Math.random() * (b - a);
  const bus = new Tone.Volume(-12).toDestination(); // отдельная шина: не зависит от мастера синта
  const missing = [];
  const sounds = {};

  Object.entries(UI_SOUNDS).forEach(([name, cfg]) => {
    const gain = new Tone.Gain(cfg.move ? 0 : 1).connect(bus);
    const players = cfg.files.map((file) => {
      const p = new Tone.Player({
        url: FOLDER + file,
        loop: !!cfg.loop,
        fadeIn: cfg.fade || 0,
        fadeOut: cfg.fade || 0,
        onerror: () => missing.push(file),
      }).connect(gain);
      p.volume.value = cfg.volume;
      return p;
    });
    sounds[name] = { cfg, gain, players, active: false, timer: 0 };
  });
  setTimeout(() => {
    if (missing.length)
      console.info(
        '[ui-sounds] нет файлов в ' + FOLDER + ':',
        missing.join(', ')
      );
  }, 3000);

  const ready = (s) => s.players.filter((p) => p.loaded);

  // --- одноразовый звук ---
  function hit(name) {
    const s = sounds[name];
    const list = ready(s);
    if (!list.length) return;
    const p = list[Math.floor(Math.random() * list.length)];
    const d = s.cfg.detune || 0;
    p.playbackRate = Math.pow(2, rand(-d, d) / 1200);
    p.start();
  }

  // --- «голос», следующий за движением: стартует при активности, затихает и останавливается в покое ---
  function poke(name, level, f) {
    const s = sounds[name];
    const p = ready(s)[0];
    if (!p) return;
    if (!s.active) {
      s.active = true;
      p.start(Tone.now(), Math.random() * p.buffer.duration);
    }
    if (s.cfg.rate)
      p.playbackRate = s.cfg.rate[0] + f * (s.cfg.rate[1] - s.cfg.rate[0]);
    s.gain.gain.rampTo(level, 0.05);
    clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      s.gain.gain.rampTo(0, 0.2);
      s.timer = setTimeout(() => {
        p.stop();
        s.active = false;
      }, 350);
    }, 120);
  }

  const fraction = (input) =>
    (Number(input.value) - Number(input.min || 0)) /
    (Number(input.max || 100) - Number(input.min || 0));

  // скорость изменения значения (доля диапазона в секунду) -> громкость голоса
  function watchMove(input, name) {
    const cfg = UI_SOUNDS[name];
    let lastF = fraction(input);
    let lastT = performance.now();
    input.addEventListener('input', () => {
      const now = performance.now();
      const f = fraction(input);
      const speed = Math.abs(f - lastF) / Math.max(0.016, (now - lastT) / 1000);
      lastF = f;
      lastT = now;
      poke(name, 0.2 + 0.8 * Math.min(1, speed * cfg.sensitivity), f);
    });
  }

  document
    .querySelectorAll('.Slider input[type="range"]')
    .forEach((i) => watchMove(i, 'sock'));
  document
    .querySelectorAll('.Bottle input[type="range"]')
    .forEach((i) => watchMove(i, 'fill'));
  document
    .querySelectorAll('.Knob input[type="range"]')
    .forEach((i) => watchMove(i, 'knob'));

  document
    .querySelectorAll('.OscButton')
    .forEach((b) => b.addEventListener('click', () => hit('curtain')));
  ['startButton', 'stopButton'].forEach((id) =>
    document.getElementById(id).addEventListener('click', () => hit('pause'))
  );
  document.querySelector('.Sequencer').addEventListener('click', (e) => {
    if (e.target.closest('.ToggleButton')) hit('tile');
  });

  // шум стиралки: пока играет музыка
  document.addEventListener('playstatechange', (e) => {
    const p = ready(sounds.washer)[0];
    if (!p) return;
    if (e.detail.playing) {
      if (p.state !== 'started') p.start();
    } else {
      p.stop();
    }
  });

  // громкость интерфейса (ползунок UI); самый левый край = выключено
  const ui = document.querySelector('#uiVolume input');
  const applyUi = () => {
    bus.mute = Number(ui.value) <= Number(ui.min);
    bus.volume.value = Number(ui.value);
  };
  ui.addEventListener('input', applyUi);
  applyUi();

  // AudioContext можно запустить только жестом пользователя: любое нажатие запускает его
  ['pointerdown', 'keydown'].forEach((ev) =>
    document.addEventListener(ev, () => Tone.start(), { capture: true })
  );
})();
