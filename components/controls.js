// ============ Поведение ручек (.Knob) и флаконов (.Bottle) ============
// Каждый такой элемент содержит настоящий <input type="range"> (скрыт визуально).
// Скрипт:
//   * превращает движение мыши/пальца в значение input и шлёт событие 'input',
//     поэтому scriptNew.js ничего не знает о ручках и флаконах;
//   * пишет --value (0..1) в CSS, по нему рисуются угол стрелки и уровень жидкости;
//   * слушает 'valuesync' -- его bindSlider() шлёт, когда JS задаёт стартовое значение.
(function () {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function range(input) {
    return {
      min: Number(input.min || 0),
      max: Number(input.max || 100),
      step: Number(input.step) || 1,
    };
  }

  function getFraction(input) {
    const { min, max } = range(input);
    return (Number(input.value) - min) / (max - min);
  }

  // f: 0..1 -> значение input с учётом step, затем событие input
  function setFraction(input, f) {
    const { min, max, step } = range(input);
    const decimals = (String(step).split('.')[1] || '').length;
    let v = min + clamp(f, 0, 1) * (max - min);
    v = Math.round((v - min) / step) * step + min;
    v = Number(clamp(v, min, max).toFixed(decimals));
    if (String(v) === input.value) return;
    input.value = v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Общая обвязка: pointer-события + синхронизация вида.
  // toFraction(event, root, current) -> 0..1
  function enhance(root, toFraction) {
    const input = root.querySelector('input[type="range"]');
    if (!input) return;

    const render = () => root.style.setProperty('--value', getFraction(input));
    input.addEventListener('input', render);
    input.addEventListener('valuesync', render);
    render();

    let dragging = false;
    const apply = (e) =>
      setFraction(input, toFraction(e, root, getFraction(input)));

    root.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      root.setPointerCapture(e.pointerId);
      input.focus({ preventScroll: true });
      apply(e);
      e.preventDefault();
    });
    root.addEventListener('pointermove', (e) => dragging && apply(e));
    const stop = (e) => {
      dragging = false;
      if (root.hasPointerCapture(e.pointerId)) {
        root.releasePointerCapture(e.pointerId);
      }
    };
    root.addEventListener('pointerup', stop);
    root.addEventListener('pointercancel', stop);
  }

  // Ручка: значение = угол от центра ручки до курсора.
  // 0° -- вверх, диапазон -135°..+135°, внизу «мёртвая зона».
  function knobFraction(e, root, current) {
    const r = root.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const angle = clamp((Math.atan2(dx, -dy) * 180) / Math.PI, -135, 135);
    const f = (angle + 135) / 270;
    // курсор перешёл через мёртвую зону: остаёмся на ближайшем краю, а не прыгаем min <-> max
    if (Math.abs(f - current) > 0.6) return current > 0.5 ? 1 : 0;
    return f;
  }

  // Флакон: значение = высота курсора относительно корпуса (низ = 0, верх = 1).
  function bottleFraction(e, root) {
    const r = root.querySelector('.Bottle-body').getBoundingClientRect();
    return 1 - (e.clientY - r.top) / r.height;
  }

  document.querySelectorAll('.Knob').forEach((el) => enhance(el, knobFraction));
  document
    .querySelectorAll('.Bottle')
    .forEach((el) => enhance(el, bottleFraction));
})();
