// ================== НАСТРОЙКИ ==================

console.log(p5);

// Элемент, внутри которого живёт холст
const CONTAINER_ID = 'bubble-zone';

// Отладка: красная рамка вокруг холста + сообщения в консоли
const DEBUG = true;
// Если у div нулевой размер, используем эти значения
const FALLBACK_WIDTH = 600;
const FALLBACK_HEIGHT = 400;

// Сетка
const SHOW_GRID = true; // false = скрыть сетку
const GRID_COLOR = [0, 0, 255, 255]; // HSB + alpha (диапазон 0-255)

// Размер пузырьков (диаметр, px)
const BUBBLE_SIZE_MIN = 15;
const BUBBLE_SIZE_MAX = 50;

// Разброс цвета вокруг базового (в единицах HSB 0-255)
const HUE_SPREAD = 5; // ± к оттенку
const SAT_SPREAD = 40; // ± к насыщенности
const BRI_SPREAD = 0; // ± к яркости
const BASE_SATURATION = 100; // базовая насыщенность
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

// ================== ДАННЫЕ ==================

let synth;

const notes = ['C', 'D', 'E', 'G', 'A'];
const colores = [130, 130, 130, 130, 130, 170, 210]; // hue по ноте
const octaves = ['4'];
const tonos = [255]; // brightness по октаве

// const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
// const colores = [0, 20, 40, 90, 130, 170, 210]; // hue по ноте
// const octaves = ['2', '3', '4', '5', '6', '7'];
// const tonos = [105, 135, 165, 195, 225, 255]; // brightness по октаве

let container;
let divX, divY;
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

  synth = new Tone.Synth().toDestination();

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
  divX = width / notes.length;
  divY = height / octaves.length;
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
  synth.triggerRelease();
}

// ================== DRAW ==================

function draw() {
  clear(); // прозрачный фон, видны только живые пузырьки

  if (SHOW_GRID) drawGrid();

  if (isPressed) {
    const noteIdx = constrain(floor(pointerX / divX), 0, notes.length - 1);
    const octIdx = constrain(floor(pointerY / divY), 0, octaves.length - 1);

    // Звук
    const newNote = notes[noteIdx] + octaves[octIdx];
    if (newNote !== currentNote) {
      currentNote = newNote;
      synth.triggerRelease();
      synth.triggerAttack(newNote);
    }

    // Пузырьки
    const now = millis();
    const moving = now - lastMoveTime < MOVE_TIMEOUT;
    if (
      (!SPAWN_ONLY_WHEN_MOVING || moving) &&
      now - lastSpawnTime >= SPAWN_INTERVAL
    ) {
      lastSpawnTime = now;
      spawnBubble(noteIdx, octIdx, now);
    }
  }

  drawBubbles();
}

function drawGrid() {
  push();
  stroke(...GRID_COLOR);
  strokeWeight(1);
  for (let i = 1; i < notes.length; i++) line(divX * i, 0, divX * i, height);
  for (let j = 1; j < octaves.length; j++) line(0, divY * j, width, divY * j);
  pop();
}

function spawnBubble(noteIdx, octIdx, now) {
  // случайная точка в круге вокруг курсора
  const angle = random(TWO_PI);
  const dist = POSITION_SPREAD * sqrt(random());

  bubbles.push({
    x: pointerX + cos(angle) * dist,
    y: pointerY + sin(angle) * dist,
    size: random(BUBBLE_SIZE_MIN, BUBBLE_SIZE_MAX),
    born: now,
    life: random(LIFETIME_MIN, LIFETIME_MAX),
    h: (colores[noteIdx] + random(-HUE_SPREAD, HUE_SPREAD) + 255) % 255,
    s: constrain(BASE_SATURATION + random(-SAT_SPREAD, SAT_SPREAD), 0, 255),
    b: constrain(tonos[octIdx] + random(-BRI_SPREAD, BRI_SPREAD), 0, 255),
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
