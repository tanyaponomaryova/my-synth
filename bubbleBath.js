// ================== НАСТРОЙКИ ==================

console.log(p5);

// Элемент, внутри которого живёт холст
const CONTAINER_ID = 'bubble-zone';

// Отладка: красная рамка вокруг холста + сообщения в консоли
const DEBUG = false;
// Если у div нулевой размер, используем эти значения
const FALLBACK_WIDTH = 600;
const FALLBACK_HEIGHT = 400;

// Сетка
const SHOW_GRID = true; // false = скрыть сетку
const GRID_COLOR = [0, 0, 255, 50]; // HSB + alpha (диапазон 0-255)

// Размер пузырьков (диаметр, px)
const BUBBLE_SIZE_MIN = 15;
const BUBBLE_SIZE_MAX = 50;

// Разброс цвета вокруг базового (в единицах HSB 0-255)
const HUE_SPREAD = 5; // ± к оттенку
const SAT_SPREAD = 40; // ± к насыщенности
const BRI_SPREAD = 0; // ± к яркости
const BASE_SATURATION = 100; // базовая насыщенность
const BASE_BRIGHTNESS = 255; // базовая яркость
const BUBBLE_ALPHA = 255; // прозрачность заливки (0-255)

// Поведение
const SPAWN_INTERVAL = 20; // мс между пузырьками (меньше = чаще)
const SPAWN_ONLY_WHEN_MOVING = false; // true = пузырьки только пока мышь двигается
const MOVE_TIMEOUT = 100; // мс без движения, после которых считаем, что мышь стоит
const POSITION_SPREAD = 20; // отклонение от позиции курсора (радиус, px)
const LIFETIME_MIN = 800; // мс жизни до лопания
const LIFETIME_MAX = 5000;
const GROW_TIME = 250; // мс на «надувание»
const POP_TIME = 120; // мс анимации лопания

// ================== СЕТКА И НОТЫ ==================

// Размер сетки (COLS * ROWS должно быть >= notes.length)
const COLS = 5; // количество столбцов
const ROWS = 2; // количество строк

// Ноты сразу с октавой. Раскладываются по сетке по порядку:
// слева направо, сверху вниз, начиная с первой (левой верхней) клетки.
// const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];
// const notes = ['F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5'];
const notes = ['G4', 'A4', 'B4', 'G4', 'A4', 'A4', 'G4', 'B4'];
// Оттенок (hue) для каждой ноты — в том же порядке, что и notes
const colores = [130, 130, 130, 130, 130, 170, 210];

// Пример сетки 4x3:
// const COLS = 4;
// const ROWS = 3;
// const notes = [
//   'C3', 'D3', 'E3', 'G3',
//   'A3', 'C4', 'D4', 'E4',
//   'G4', 'A4', 'C5', 'D5',
// ];
// const colores = [0, 20, 40, 90, 130, 170, 210, 0, 20, 40, 90, 130];

// ================== ДАННЫЕ ==================

const synth = {
  synth: {
    type: 'FMSynth',
    volume: -8,

    harmonicity: 3.5,
    modulationIndex: 2.2,

    oscillator: {
      type: 'sine',
    },

    modulation: {
      type: 'sine',
    },

    envelope: {
      attack: 0.002,
      decay: 0.8,
      sustain: 0.15,
      release: 1.2,
    },

    modulationEnvelope: {
      attack: 0.001,
      decay: 0.22,
      sustain: 0,
      release: 0.08,
    },

    node: null,
  },

  filter: {
    type: 'lowpass',
    frequency: 4800,
    rolloff: -12,
    Q: 0.6,
    node: null,
  },

  chorus: {
    frequency: 0.3,
    delayTime: 3,
    depth: 0.08,
    wet: 0.04,
    node: null,
  },

  feedbackDelay: {
    delayTime: '8n',
    feedback: 0.12,
    wet: 0.08,
    node: null,
  },

  reverb: {
    decay: 3.2,
    preDelay: 0.015,
    wet: 0.24,
    node: null,
  },

  channel: {
    volume: -10,
    node: null,
  },
};

async function initBathSynth() {
  synth.synth.node = new Tone.FMSynth(synth.synth);
  synth.filter.node = new Tone.Filter(synth.filter);
  synth.chorus.node = new Tone.Chorus(synth.chorus).start();
  synth.feedbackDelay.node = new Tone.FeedbackDelay(synth.feedbackDelay);
  synth.reverb.node = new Tone.Reverb(synth.reverb);
  synth.channel.node = new Tone.Channel(synth.channel);

  await synth.reverb.node.ready;

  synth.synth.node.chain(
    synth.filter.node,
    synth.chorus.node,
    synth.feedbackDelay.node,
    synth.reverb.node,
    synth.channel.node,
    Tone.Destination
  );
}

let container;
let cellW, cellH;
let isPressed = false;
let pointerX = 0,
  pointerY = 0;
let lastMoveTime = 0;
let lastSpawnTime = 0;
let currentNote = '';
let bubbles = [];

// ================== SETUP ==================

function setup() {
  container = document.getElementById(CONTAINER_ID);
  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
  }

  let w = container.clientWidth;
  let h = container.clientHeight;
  if (!w || !h) {
    console.warn(
      '[bubble] У #' +
        CONTAINER_ID +
        ' нулевой размер (' +
        w +
        'x' +
        h +
        '). Задайте ему width/height в CSS. Пока использую ' +
        FALLBACK_WIDTH +
        'x' +
        FALLBACK_HEIGHT
    );
    w = w || FALLBACK_WIDTH;
    h = h || FALLBACK_HEIGHT;
    container.style.minWidth = w + 'px';
    container.style.minHeight = h + 'px';
  }

  if (COLS * ROWS < notes.length) {
    console.warn(
      '[bubble] Сетка ' +
        COLS +
        'x' +
        ROWS +
        ' меньше, чем нот: ' +
        notes.length
    );
  }

  const cnv = createCanvas(w, h);
  cnv.parent(container);
  const el = cnv.elt;
  el.style.position = 'absolute';
  el.style.top = '0';
  el.style.left = '0';
  el.style.touchAction = 'none'; // чтобы палец не скроллил страницу
  if (DEBUG) {
    el.style.outline = '2px solid red';
    console.log(
      '[bubble] setup ок, холст ' + w + 'x' + h + ', Tone: ' + typeof Tone
    );
  }

  colorMode(HSB, 255);
  updateGridSize();

  // СОЗДАНИЕ СИНТА
  initBathSynth();

  // Свои события на самом холсте: работает только внутри элемента
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);

  // Подгоняем холст под размер div, если он меняется
  new ResizeObserver(() => {
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    if (!nw || !nh) return;
    resizeCanvas(nw, nh);
    updateGridSize();
  }).observe(container);
}

function updateGridSize() {
  cellW = width / COLS;
  cellH = height / ROWS;
}

// Индекс ноты в массиве notes для текущей позиции указателя
function getCellIndex() {
  const col = constrain(floor(pointerX / cellW), 0, COLS - 1);
  const row = constrain(floor(pointerY / cellH), 0, ROWS - 1);
  return row * COLS + col;
}

// ================== СОБЫТИЯ ==================

function updatePointer(e) {
  const r = e.target.getBoundingClientRect();
  pointerX = e.clientX - r.left;
  pointerY = e.clientY - r.top;
}

function onDown(e) {
  e.target.setPointerCapture(e.pointerId);
  updatePointer(e);
  isPressed = true;
  lastMoveTime = millis();
  // Tone.start() нужно вызывать из жеста пользователя
  //   Tone.start().then(() => {
  //     if (DEBUG) console.log('[bubble] AudioContext: ' + Tone.context.state);
  //   });
  //   if (DEBUG)
  //     console.log('[bubble] pointerdown', round(pointerX), round(pointerY));
}

function onMove(e) {
  updatePointer(e);
  if (isPressed) lastMoveTime = millis();
}

function onUp() {
  isPressed = false;
  currentNote = '';
  synth.synth.node.triggerRelease();
}

// ================== DRAW ==================

function draw() {
  clear(); // прозрачный фон, видны только живые пузырьки

  if (SHOW_GRID) drawGrid();

  if (isPressed) {
    const idx = getCellIndex();
    const newNote = notes[idx]; // undefined, если клетка пустая

    if (newNote === undefined) {
      // Пустая клетка (нот меньше, чем клеток): тишина и без пузырьков
      if (currentNote !== '') {
        currentNote = '';
        synth.synth.node.triggerRelease();
      }
    } else {
      // Звук
      if (newNote !== currentNote) {
        currentNote = newNote;
        synth.synth.node.triggerRelease();
        synth.synth.node.triggerAttack(newNote);
      }

      // Пузырьки
      const now = millis();
      const moving = now - lastMoveTime < MOVE_TIMEOUT;
      if (
        (!SPAWN_ONLY_WHEN_MOVING || moving) &&
        now - lastSpawnTime >= SPAWN_INTERVAL
      ) {
        lastSpawnTime = now;
        spawnBubble(idx, now);
      }
    }
  }

  drawBubbles();
}

function drawGrid() {
  push();
  stroke(...GRID_COLOR);
  strokeWeight(1);
  for (let i = 1; i < COLS; i++) line(cellW * i, 0, cellW * i, height);
  for (let j = 1; j < ROWS; j++) line(0, cellH * j, width, cellH * j);
  pop();
}

function spawnBubble(noteIdx, now) {
  // случайная точка в круге вокруг курсора
  const angle = random(TWO_PI);
  const dist = POSITION_SPREAD * sqrt(random());
  const baseHue = colores[noteIdx] !== undefined ? colores[noteIdx] : 0;

  bubbles.push({
    x: pointerX + cos(angle) * dist,
    y: pointerY + sin(angle) * dist,
    size: random(BUBBLE_SIZE_MIN, BUBBLE_SIZE_MAX),
    born: now,
    life: random(LIFETIME_MIN, LIFETIME_MAX),
    h: (baseHue + random(-HUE_SPREAD, HUE_SPREAD) + 255) % 255,
    s: constrain(BASE_SATURATION + random(-SAT_SPREAD, SAT_SPREAD), 0, 255),
    b: constrain(BASE_BRIGHTNESS + random(-BRI_SPREAD, BRI_SPREAD), 0, 255),
  });
}

function drawBubbles() {
  const now = millis();
  noStroke();

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const bub = bubbles[i];
    const age = now - bub.born;
    let d = bub.size;
    let alpha = BUBBLE_ALPHA;

    if (age < GROW_TIME) {
      // надувание (ease-out)
      const t = age / GROW_TIME;
      d = bub.size * (1 - pow(1 - t, 3));
    } else if (age > bub.life) {
      // лопание: чуть раздувается и исчезает
      const t = (age - bub.life) / POP_TIME;
      if (t >= 1) {
        bubbles.splice(i, 1);
        continue;
      }
      d = bub.size * (1 + 0.3 * t);
      alpha = BUBBLE_ALPHA * (1 - t);
    }

    fill(bub.h, bub.s, bub.b, alpha);
    ellipse(bub.x, bub.y, d, d);
  }
}
