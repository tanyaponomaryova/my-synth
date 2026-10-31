// ============ Стиральная машина: анимация барабана, пены и тряски ============
// Слушает 'playstatechange' (его шлёт scriptNew.js при Play/Pause/Stop).
//  * барабан крутится со скоростью, привязанной к BPM: один оборот за такт (4 доли);
//    разгоняется и тормозит плавно, как настоящий барабан;
//  * количество пузырьков пены зависит от громкости (window.synthAudio.getLevel());
//  * весь .Washer трясётся, пока играет музыка: тряска «привязана» к углу барабана,
//    поэтому на высоком BPM она чаще, а на громком звуке сильнее.
(function () {
  const button = document.getElementById('startButton');
  const washer = document.querySelector('.Washer');
  const drum = button && button.querySelector('.DrumGlass-drum');
  const foam = button && button.querySelector('.DrumGlass-foam');
  // .DrumGlass-foam может быть закомментирован в HTML: тогда крутим барабан без пены
  if (!button || !washer || !drum) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const BUBBLES = 32;
  const rand = (a, b) => a + Math.random() * (b - a);

  // пул пузырьков: снаружи включается классом, внутри <i> -- всплывает
  const bubbles = [];
  for (let n = 0; foam && n < BUBBLES; n++) {
    const b = document.createElement('span');
    b.className = 'Bubble';
    b.style.setProperty('--x', rand(6, 88).toFixed(1) + '%');
    b.style.setProperty('--s', rand(2, 6).toFixed(1) + 'cqw');
    b.style.setProperty('--dx', rand(-4, 4).toFixed(1) + 'cqw');
    b.style.setProperty('--rise', rand(14, 30).toFixed(1) + 'cqw');
    b.style.setProperty('--d', rand(2.2, 4.5).toFixed(2) + 's');
    b.style.setProperty('--delay', (-rand(0, 4)).toFixed(2) + 's');
    b.append(document.createElement('i'));
    foam.append(b);
    bubbles.push(b);
  }

  let playing = false;
  let running = false;
  let last = 0;
  let angle = 0; // угол барабана, °
  let speed = 0; // °/с
  let shake = 0; // 0..1, плавно нарастает и затухает
  let level = 0; // сглаженная громкость 0..1
  let shown = -1; // сколько пузырьков сейчас включено

  const getBpm = () =>
    typeof Tone !== 'undefined' ? Tone.getTransport().bpm.value : 120;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // --- барабан: 360° за 4 доли => 1.5 * bpm °/с ---
    const motion = reduceMotion.matches ? 0.4 : 1;
    const targetSpeed = playing ? 1.5 * getBpm() * motion : 0;
    speed +=
      (targetSpeed - speed) * (1 - Math.exp(-(playing ? 2.2 : 0.9) * dt));
    angle = (angle + speed * dt) % 360;
    drum.style.transform = `rotate(${angle.toFixed(2)}deg)`;

    // --- громкость -> пена ---
    const target = window.synthAudio ? window.synthAudio.getLevel() : 0;
    level += (target - level) * (1 - Math.exp(-8 * dt));
    const count = playing ? Math.round(2 + level * (BUBBLES - 2)) : 0;
    if (count !== shown) {
      bubbles.forEach((b, i) => b.classList.toggle('is-on', i < count));
      shown = count;
    }

    // --- тряска всего корпуса ---
    shake +=
      ((playing ? 1 : 0) - shake) * (1 - Math.exp(-(playing ? 4 : 5) * dt));
    if (reduceMotion.matches || shake < 0.005) {
      washer.style.transform = '';
    } else {
      const a = washer.offsetWidth * 0.012 * shake * (0.6 + 0.4 * level);
      const rad = (angle * Math.PI) / 180;
      const t = now / 1000;
      const x = Math.sin(rad) * a * 0.8 + Math.sin(t * 107) * a * 0.35;
      const y = Math.cos(rad * 2) * a * 0.5 + Math.sin(t * 144) * a * 0.2;
      const r = Math.sin(rad) * 0.18 * shake;
      washer.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${r.toFixed(3)}deg)`;
    }

    // всё остановилось -- выключаем цикл до следующего Play
    if (!playing && speed < 0.3 && shake < 0.005 && shown === 0) {
      speed = 0;
      washer.style.transform = '';
      running = false;
      return;
    }
    requestAnimationFrame(frame);
  }

  document.addEventListener('playstatechange', (e) => {
    playing = e.detail.playing;
    if (!running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }
  });
})();
