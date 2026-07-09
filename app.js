(() => {
  "use strict";

  const STORAGE_KEY = "deadline-points";
  const RING_R      = 104;
  const RING_CIRC   = 2 * Math.PI * RING_R;

  const WEEKDAYS = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];
  const MONTHS   = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

  // ---------- элементы ----------
  const el = {
    screens:      document.querySelectorAll(".screen"),
    tabs:         document.querySelectorAll(".tab"),
    weekdayEl:    document.getElementById("weekday"),
    todayDateEl:  document.getElementById("today-date"),
    currentTimeEl:document.getElementById("current-time"),
    timer:        document.getElementById("timer"),
    timerCaption: document.getElementById("timer-caption"),
    targetLine:   document.getElementById("target-line"),
    pointsList:   document.getElementById("points-list"),
    ringProgress: document.getElementById("ring-progress"),
    ringWrap:     document.getElementById("ring-wrap"),
    noPointsMsg:  document.getElementById("no-points-msg"),
    cta:          document.getElementById("cta"),
    ctaBtn:       document.getElementById("cta-btn"),
    hiddenPicker: document.getElementById("hidden-time-picker"),
    newTime:      document.getElementById("new-time"),
    addBtn:       document.getElementById("add-btn"),
    deadlineList: document.getElementById("deadline-list"),
    listHint:     document.getElementById("list-hint"),
    app:          document.getElementById("app"),
    secondDot:    document.getElementById("ring-second-dot"),
  };

  // ---------- состояние ----------
  function loadDeadlines() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(raw)) return raw.filter(isValidTime).sort();
    } catch (e) { /* ignore */ }
    return [];
  }
  function saveDeadlines(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
  function isValidTime(v) {
    return typeof v === "string" && /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
  }

  let deadlines = loadDeadlines();
  let selectedTargetTime = null;

  // ---------- навигация ----------
  const screenOrder = ["screen-countdown", "screen-settings"];
  let activeScreenIdx = 0;

  function switchToScreen(idx) {
    if (idx < 0 || idx >= screenOrder.length) return;
    activeScreenIdx = idx;
    const targetId = screenOrder[idx];
    el.screens.forEach(s => { s.dataset.active = String(s.id === targetId); });
    el.tabs.forEach(t => { t.setAttribute("aria-current", String(t.dataset.target === targetId)); });
    if (targetId === "screen-settings") renderSettings();
  }

  el.tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const idx = screenOrder.indexOf(tab.dataset.target);
      if (idx !== -1) switchToScreen(idx);
    });
  });

  // ---------- свайпы ----------
  let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeMoved  = false;

  el.app.addEventListener("touchstart", e => {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    swipeMoved  = false;
  }, { passive: true });

  el.app.addEventListener("touchmove", () => { swipeMoved = true; }, { passive: true });

  el.app.addEventListener("touchend", e => {
    if (!swipeMoved) return;
    const dx = e.changedTouches[0].clientX - swipeStartX;
    const dy = e.changedTouches[0].clientY - swipeStartY;

    // Горизонтальный свайп — переключение экрана
    if (Math.abs(dx) >= 40 && Math.abs(dy) < Math.abs(dx) * 0.9) {
      switchToScreen(dx < 0 ? activeScreenIdx + 1 : activeScreenIdx - 1);
      return;
    }

    // Вертикальный свайп — смена цели (только на экране отсчёта)
    if (Math.abs(dy) >= 60 && Math.abs(dx) < Math.abs(dy) * 0.9) {
      if (activeScreenIdx !== 0) return;
      const now = new Date();
      const todayPoints = deadlines.map(t => ({ time: t, date: timeToDateToday(now, t) }));
      if (todayPoints.length < 2) return;

      let idx = todayPoints.findIndex(p => p.time === selectedTargetTime);
      if (idx === -1) {
        idx = todayPoints.findIndex(p => p.date.getTime() > now.getTime());
        if (idx === -1) idx = todayPoints.length - 1;
      }

      if (dy < 0) {
        idx = (idx + 1) % todayPoints.length;
      } else {
        idx = (idx - 1 + todayPoints.length) % todayPoints.length;
      }

      // не даём выбрать прошедшую точку
      if (todayPoints[idx].date.getTime() <= now.getTime()) return;

      selectedTargetTime = todayPoints[idx].time;
      renderCountdown();
    }
  }, { passive: true });

  // ---------- быстрый выбор времени со стартового экрана ----------
  el.ctaBtn.addEventListener("click", () => {
    el.hiddenPicker.value = "";
    el.hiddenPicker.showPicker();
  });

  el.hiddenPicker.addEventListener("change", () => {
    const val = el.hiddenPicker.value;
    if (!isValidTime(val) || deadlines.includes(val)) return;
    deadlines.push(val);
    deadlines.sort();
    saveDeadlines(deadlines);
    renderSettings();
    renderCountdown();
  });

  // ---------- добавление / удаление / редактирование ----------
  el.addBtn.addEventListener("click", () => {
    const val = el.newTime.value;
    if (!isValidTime(val)) return;
    if (!deadlines.includes(val)) {
      deadlines.push(val);
      deadlines.sort();
      saveDeadlines(deadlines);
      renderSettings();
      renderCountdown();
    }
    el.newTime.value = "";
  });

  function removeDeadline(time) {
    deadlines = deadlines.filter(t => t !== time);
    if (selectedTargetTime === time) selectedTargetTime = null;
    saveDeadlines(deadlines);
    renderSettings();
    renderCountdown();
  }

  function editDeadline(oldTime, li) {
    const timeSpan = li.querySelector(".deadline-item__time");
    const inp = document.createElement("input");
    inp.type = "time";
    inp.className = "deadline-item__edit-input";
    inp.value = oldTime;
    timeSpan.replaceWith(inp);
    inp.focus();

    const confirm = () => {
      const newTime = inp.value;
      if (isValidTime(newTime) && newTime !== oldTime && !deadlines.includes(newTime)) {
        deadlines = deadlines.map(t => t === oldTime ? newTime : t).sort();
        if (selectedTargetTime === oldTime) selectedTargetTime = newTime;
        saveDeadlines(deadlines);
        renderCountdown();
      }
      renderSettings();
    };

    inp.addEventListener("blur", confirm);
    inp.addEventListener("keydown", e => {
      if (e.key === "Enter") inp.blur();
      if (e.key === "Escape") renderSettings();
    });
  }

  function renderSettings() {
    el.deadlineList.innerHTML = "";
    el.listHint.hidden = deadlines.length > 0;
    deadlines.forEach(time => {
      const li = document.createElement("li");
      li.className = "deadline-item";
      li.innerHTML = `
        <span class="deadline-item__time">${time}</span>
        <div class="deadline-item__actions">
          <button class="deadline-item__edit" aria-label="Изменить ${time}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/>
            </svg>
          </button>
          <button class="deadline-item__del" aria-label="Удалить ${time}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>
        </div>`;
      li.querySelector(".deadline-item__del").addEventListener("click", () => removeDeadline(time));
      li.querySelector(".deadline-item__edit").addEventListener("click", () => editDeadline(time, li));
      el.deadlineList.appendChild(li);
    });
  }

  // ---------- утилиты времени ----------
  function timeToDateToday(base, hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
  }

  function startOfDay(d) {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
  }

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function humanDuration(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h === 0 && m === 0) return `${s} сек`;
    if (h === 0) return `${m} мин`;
    return `${h} ч ${m} мин`;
  }

  // ---------- рендер шапки ----------
  function renderHeader(now) {
    const wd = WEEKDAYS[now.getDay()];
    el.weekdayEl.textContent  = wd.charAt(0).toUpperCase() + wd.slice(1);
    el.todayDateEl.textContent = `${now.getDate()} ${MONTHS[now.getMonth()]}`;
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    el.currentTimeEl.textContent = `${hh}:${mm}`;
  }

  // ---------- рендер точек под кольцом ----------
  function renderPointsList(todayPoints, upcoming, now) {
    el.pointsList.innerHTML = "";
    const centerTime = selectedTargetTime || (upcoming[0] && upcoming[0].time);

    function renderChip(p) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.dataset.state = p.date.getTime() <= now.getTime() ? "done" : "upcoming";
      if (selectedTargetTime === p.time || centerTime === p.time) chip.dataset.selected = "true";
      chip.textContent = p.time;
      chip.addEventListener("click", () => {
        if (p.date.getTime() <= now.getTime() || selectedTargetTime === p.time) return;
        selectedTargetTime = p.time;
        renderCountdown();
      });
      el.pointsList.appendChild(chip);
    }

    if (!centerTime) return;
    const centerIdx = todayPoints.findIndex(p => p.time === centerTime);
    if (centerIdx === -1) return;

    if (todayPoints.length <= 3) {
      todayPoints.forEach(p => renderChip(p));
      return;
    }

    if (centerIdx === 0) {
      const end = Math.min(centerIdx + 3, todayPoints.length);
      for (let i = centerIdx; i < end; i++) renderChip(todayPoints[i]);
    } else if (centerIdx === todayPoints.length - 1) {
      const start = Math.max(0, centerIdx - 2);
      for (let i = start; i <= centerIdx; i++) renderChip(todayPoints[i]);
    } else {
      const start = centerIdx - 1;
      const end = Math.min(start + 3, todayPoints.length);
      for (let i = start; i < end; i++) renderChip(todayPoints[i]);
    }
  }

  // ---------- основной рендер отсчёта ----------
  function renderCountdown() {
    const now = new Date();
    renderHeader(now);

    const todayPoints = deadlines.map(t => ({ time: t, date: timeToDateToday(now, t) }));
    const upcoming    = todayPoints.filter(p => p.date.getTime() > now.getTime());

    if (deadlines.length === 0) {
      el.cta.hidden           = false;
      el.ringWrap.hidden      = true;
      el.targetLine.textContent = "";
      el.pointsList.innerHTML = "";
      el.ringProgress.style.strokeDashoffset = RING_CIRC;
      document.title = "Кицунэ — преврати дедлайн в свою суперсилу";
      return;
    }

    el.cta.hidden = true;
    el.ringWrap.hidden    = false;

    renderPointsList(todayPoints, upcoming, now);

    if (selectedTargetTime) {
      const sel = todayPoints.find(p => p.time === selectedTargetTime);
      if (!sel || sel.date.getTime() <= now.getTime()) {
        selectedTargetTime = null;
      }
    }

    let target = null;
    if (selectedTargetTime) {
      target = todayPoints.find(p => p.time === selectedTargetTime);
    }
    if (!target) {
      target = upcoming[0];
    }

    if (!target) {
      // Все точки пройдены, и ничего не выбрано
      el.timer.textContent        = "✓";
      el.timerCaption.textContent = "всё выполнено";
      el.targetLine.textContent   = "";
      el.ringProgress.style.strokeDashoffset  = "0";
      document.title = "Кицунэ — преврати дедлайн в свою суперсилу";
      return;
    }

    const diff = target.date.getTime() - now.getTime();
    if (diff <= 0) {
      // Выбранная точка уже в прошлом
      el.timer.textContent        = "✓";
      el.timerCaption.textContent = "выполнено";
      el.targetLine.textContent   = `до ${target.time}`;
      el.ringProgress.style.strokeDashoffset  = "0";
      document.title = "Кицунэ — преврати дедлайн в свою суперсилу";
      return;
    }

    el.timer.textContent        = humanDuration(diff);
    el.timerCaption.textContent = "осталось";
    el.targetLine.textContent   = `до ${target.time}`;
    document.title = `${humanDuration(diff)} | Кицунэ`;

    const idx      = todayPoints.findIndex(p => p.time === target.time);
    const prevPoint = idx > 0 ? todayPoints[idx - 1].date : startOfDay(now);
    const progress  = clamp((now.getTime() - prevPoint.getTime()) / (target.date.getTime() - prevPoint.getTime()), 0, 1);
    el.ringProgress.style.strokeDashoffset = String(RING_CIRC * (1 - progress));

  }

  // ---------- анимация секундной стрелки ----------
  function animateSecondDot() {
    if (el.secondDot && !el.ringWrap.hidden) {
      const now = new Date();
      const ms = now.getMilliseconds();
      const sec = now.getSeconds();
      const deg = ((sec + ms / 1000) / 60) * 360;
      el.secondDot.setAttribute("transform", `rotate(${deg}, 120, 120)`);
    }
    requestAnimationFrame(animateSecondDot);
  }

  // ---------- инициализация ----------
  el.ringProgress.style.strokeDasharray = String(RING_CIRC);
  renderSettings();
  renderCountdown();
  setInterval(renderCountdown, 1000);
  animateSecondDot();

  // ---------- service worker ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js?v=__CACHE_VERSION__").catch(() => {});
    });
  }
})();
