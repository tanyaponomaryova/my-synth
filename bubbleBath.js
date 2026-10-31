// ================== НАСТРОЙКИ ==================

console.log(p5);

// Элемент, внутри которого живёт холст
const CONTAINER_ID = 'bubble-zone';

// Отладка: красная рамка вокруг холста + сообщения в консоли
const DEBUG = false;
// Если у div нулевой размер, используем эти значения
const FALLBACK_WIDTH = 600;
const FALLBACK_HEIGHT = 400;

// Холст больше зоны на BLEED px с каждой стороны, чтобы пузырьки у края
// не обрезались. Должен быть >= радиус самого большого пузыря при лопании
// (BUBBLE_SIZE_MAX * 1.3 / 2) + POSITION_SPREAD.
const BLEED = 60;

// Сетка
const SHOW_GRID = false; // false = скрыть сетку
const GRID_COLOR = [0, 0, 255, 50]; // HSB + alpha (диапазон 0-255)

// Размер пузырьков (диаметр, px)
const BUBBLE_SIZE_MIN = 10;
const BUBBLE_SIZE_MAX = 50;

// Разброс цвета вокруг базового (в единицах HSB 0-255)
const HUE_SPREAD = 10; // ± к оттенку
const SAT_SPREAD = 40; // ± к насыщенности
const BRI_SPREAD = 0; // ± к яркости
const BASE_SATURATION = 40; // базовая насыщенность
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
const notes = ['G4', 'A4', 'B4', 'G4', 'A4', 'A4', 'G4', 'B4', 'G4', 'B4'];
// Оттенок (hue) для каждой ноты — в том же порядке, что и notes
const colores = [150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150];

// Пример сетки 4x3:
// const COLS = 4;
// const ROWS = 3;
// const notes = [
//   'C3', 'D3', 'E3', 'G3',
//   'A3', 'C4', 'D4', 'E4',
//   'G4', 'A4', 'C5', 'D5',
// ];
// const colores = [0, 20, 40, 90, 130, 170, 210, 0, 20, 40, 90, 130];

// ================== ЗВУК ==================

// Звук пузырей -- один сэмпл. Положите файл в samples/ и впишите его имя сюда.
// Сэмпл играет при клике и пока курсор двигается с зажатой кнопкой.
const BUBBLE_SAMPLE = {
  baseUrl: 'samples/',
  file: 'pop-fx_G_major.wav', // <- имя вашего файла
  note: 'C4', // нота, на которой сэмпл звучит без транспонирования
  pitchByCell: false, // true = транспонировать по ноте клетки из массива notes
  volume: -6, // dB
  interval: 100000, // мс: как часто повторять сэмпл при движении курсора
};

const bubbleSound = { sampler: null, channel: null, loaded: false };
let lastSoundTime = 0;

function initBathSynth() {
  bubbleSound.channel = new Tone.Volume(BUBBLE_SAMPLE.volume).toDestination();
  bubbleSound.sampler = new Tone.Sampler({
    urls: { [BUBBLE_SAMPLE.note]: BUBBLE_SAMPLE.file },
    baseUrl: BUBBLE_SAMPLE.baseUrl,
    onload: () => (bubbleSound.loaded = true),
    onerror: (err) =>
      console.warn(
        '[bubble] не удалось загрузить ' +
          BUBBLE_SAMPLE.baseUrl +
          BUBBLE_SAMPLE.file +
          ' -- положите файл в проект',
        err
      ),
  }).connect(bubbleSound.channel);
}

function playBubbleSound(noteIdx) {
  if (!bubbleSound.loaded) return;
  const note =
    BUBBLE_SAMPLE.pitchByCell && notes[noteIdx]
      ? notes[noteIdx]
      : BUBBLE_SAMPLE.note;
  bubbleSound.sampler.triggerAttack(note, Tone.now());
  lastSoundTime = millis();
}

let container;
let cellW, cellH;
let zoneW, zoneH; // размер зоны без полей (width/height у p5 -- размер холста с полями)
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

  zoneW = w;
  zoneH = h;
  const cnv = createCanvas(w + BLEED * 2, h + BLEED * 2);
  cnv.parent(container);
  const el = cnv.elt;
  el.style.position = 'absolute';
  el.style.top = -BLEED + 'px';
  el.style.left = -BLEED + 'px';
  el.style.pointerEvents = 'none'; // события ловит сам контейнер, поля холста не кликабельны
  container.style.touchAction = 'none'; // чтобы палец не скроллил страницу
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
  container.addEventListener('pointerdown', onDown);
  container.addEventListener('pointermove', onMove);
  container.addEventListener('pointerup', onUp);
  container.addEventListener('pointercancel', onUp);

  // Подгоняем холст под размер div, если он меняется
  new ResizeObserver(() => {
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    if (!nw || !nh) return;
    zoneW = nw;
    zoneH = nh;
    resizeCanvas(nw + BLEED * 2, nh + BLEED * 2);
    el.style.top = -BLEED + 'px';
    el.style.left = -BLEED + 'px';
    updateGridSize();
  }).observe(container);
}

function updateGridSize() {
  cellW = zoneW / COLS;
  cellH = zoneH / ROWS;
}

// Индекс ноты в массиве notes для текущей позиции указателя
function getCellIndex() {
  const col = constrain(floor(pointerX / cellW), 0, COLS - 1);
  const row = constrain(floor(pointerY / cellH), 0, ROWS - 1);
  return row * COLS + col;
}

// ================== СОБЫТИЯ ==================

function updatePointer(e) {
  const r = container.getBoundingClientRect();
  // курсор, «пойманный» за пределами зоны, прижимаем к её краю
  pointerX = constrain(e.clientX - r.left, 0, zoneW);
  pointerY = constrain(e.clientY - r.top, 0, zoneH);
}

function onDown(e) {
  container.setPointerCapture(e.pointerId);
  updatePointer(e);
  isPressed = true;
  lastMoveTime = millis();
  Tone.start(); // нужно вызывать из жеста пользователя
  currentNote = notes[getCellIndex()] || '';
  playBubbleSound(getCellIndex());
  // (старый комментарий) Tone.start() нужно вызывать из жеста пользователя
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
}

// ================== DRAW ==================

function draw() {
  clear(); // прозрачный фон, видны только живые пузырьки
  translate(BLEED, BLEED); // дальше координаты считаются от угла зоны, а не холста

  if (SHOW_GRID) drawGrid();

  if (isPressed) {
    const idx = getCellIndex();
    const newNote = notes[idx]; // undefined, если клетка пустая

    if (newNote === undefined) {
      // Пустая клетка (нот меньше, чем клеток): тишина и без пузырьков
      currentNote = '';
    } else {
      const now = millis();
      const moving = now - lastMoveTime < MOVE_TIMEOUT;

      // Звук: при переходе в другую клетку и пока курсор движется
      if (
        newNote !== currentNote ||
        (moving && now - lastSoundTime >= BUBBLE_SAMPLE.interval)
      ) {
        currentNote = newNote;
        playBubbleSound(idx);
      }

      // Пузырьки
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
  for (let i = 1; i < COLS; i++) line(cellW * i, 0, cellW * i, zoneH);
  for (let j = 1; j < ROWS; j++) line(0, cellH * j, zoneW, cellH * j);
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
