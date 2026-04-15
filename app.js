const STORAGE_KEY = "meetrb_quiz_answers_v3";
const THEME_STORAGE_KEY = "meetrb_ui_theme_v1";
const DEFAULT_THEME = "modern";
const VALID_THEMES = new Set(["neo", "liquid", "win98", "modern"]);
const QUESTION_SEQUENCE = ["experience", "translation", "outcomes", "complexity", "culture"];
const ROTATING_ROLES = [
  "Richard",
  "a digital leader",
  "a design thinker",
  "a problem solver",
  "a product manager",
  "your next hire",
];

/** Inline SVGs for neo intro marquee (phrase → icon → phrase …). */
const NEO_ROLE_BANNER_ICONS = [
  `<svg class="neo-role-banner__illu-svg" viewBox="0 0 40 40" aria-hidden="true"><polygon points="20,3 25,14 37,15 28,24 31,36 20,30 9,36 12,24 3,15 15,14" fill="#ffe45c" stroke="#0a0a0a" stroke-width="2.2" stroke-linejoin="miter"/></svg>`,
  `<svg class="neo-role-banner__illu-svg" viewBox="0 0 40 40" aria-hidden="true"><rect x="6" y="10" width="28" height="20" rx="2" fill="#ffffff" stroke="#0a0a0a" stroke-width="2.2"/><rect x="9" y="14" width="22" height="10" fill="#1f6fff" stroke="#0a0a0a" stroke-width="1.8"/><path d="M14 28h12" stroke="#0a0a0a" stroke-width="2.2" stroke-linecap="square"/></svg>`,
  `<svg class="neo-role-banner__illu-svg" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="11" fill="#ffe45c" stroke="#0a0a0a" stroke-width="2.2"/><path d="M20 12v8l6 4" fill="none" stroke="#0a0a0a" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter"/></svg>`,
  `<svg class="neo-role-banner__illu-svg" viewBox="0 0 40 40" aria-hidden="true"><path d="M8 28 L14 14 L20 22 L26 10 L32 28 Z" fill="#ffffff" stroke="#0a0a0a" stroke-width="2.2" stroke-linejoin="miter"/><rect x="16" y="24" width="8" height="6" fill="#ff4db8" stroke="#0a0a0a" stroke-width="1.8"/></svg>`,
  `<svg class="neo-role-banner__illu-svg" viewBox="0 0 40 40" aria-hidden="true"><rect x="8" y="8" width="24" height="24" fill="#ffffff" stroke="#0a0a0a" stroke-width="2.2"/><path d="M12 14h16M12 20h16M12 26h10" stroke="#0a0a0a" stroke-width="2" stroke-linecap="square"/><circle cx="28" cy="26" r="3" fill="#1f6fff" stroke="#0a0a0a" stroke-width="1.6"/></svg>`,
  `<svg class="neo-role-banner__illu-svg" viewBox="0 0 40 40" aria-hidden="true"><rect x="6" y="14" width="28" height="18" rx="2" fill="#ffe45c" stroke="#0a0a0a" stroke-width="2.2"/><path d="M12 22 L18 28 L30 14" fill="none" stroke="#0a0a0a" stroke-width="2.6" stroke-linecap="square" stroke-linejoin="miter"/></svg>`,
];

let rotatingRoleTimerId = null;

function readAnswers() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function writeAnswer(questionId, value) {
  const current = readAnswers();
  const next = { ...current, [questionId]: value };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    /* ignore */
  }
}

function readTheme() {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw || !VALID_THEMES.has(raw)) return DEFAULT_THEME;
    return raw;
  } catch (e) {
    return DEFAULT_THEME;
  }
}

function writeTheme(theme) {
  if (!VALID_THEMES.has(theme)) return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    /* ignore */
  }
}

function applyTheme(theme) {
  const nextTheme = VALID_THEMES.has(theme) ? theme : DEFAULT_THEME;
  document.documentElement.dataset.uiTheme = nextTheme;
  return nextTheme;
}

/** Match `padding-top` on `body` to the real fixed `.site-header` height (removes gap below menu). */
function syncHeaderOffsetToMeasuredHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const h = header.getBoundingClientRect().height;
  document.documentElement.style.setProperty("--header-offset", `${Math.ceil(h)}px`);
}

let headerOffsetSyncScheduled = false;
function scheduleSyncHeaderOffset() {
  if (headerOffsetSyncScheduled) return;
  headerOffsetSyncScheduled = true;
  requestAnimationFrame(() => {
    headerOffsetSyncScheduled = false;
    syncHeaderOffsetToMeasuredHeader();
  });
}

function bindHeaderOffsetSync() {
  if (document.documentElement.dataset.headerOffsetBound === "true") return;
  document.documentElement.dataset.headerOffsetBound = "true";
  window.addEventListener("resize", scheduleSyncHeaderOffset, { passive: true });
  window.addEventListener("load", scheduleSyncHeaderOffset);
}

function syncThemeButtons(activeTheme) {
  const buttons = Array.from(document.querySelectorAll("[data-theme-option]"));
  buttons.forEach((button) => {
    const option = button.dataset.themeOption;
    const isActive = option === activeTheme;
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function applyThemeSideEffects(theme) {
  initIntroLineReveal(theme);
  initModernScrollReveal(theme);
  initRotatingIntro(theme);
  syncHeroArchisSurfaces();
  scheduleSyncHeaderOffset();
  syncWin98Desktop();
}

let win98ClockId = null;
let win98ZBase = 100;
let win98DragState = null;

const WIN98_DEFAULT_POS = {
  "win98-frame-intro": { left: "8%", top: "14%" },
  "win98-frame-hero": { left: "14%", top: "10%" },
  "win98-frame-portfolio": { left: "10%", top: "22%" },
  "win98-frame-cv": { left: "20%", top: "12%" },
  "win98-frame-quiz": { left: "18%", top: "16%" },
};

function loadWin98CvIframe(frame) {
  if (frame?.id !== "win98-frame-cv") return;
  const iframe = frame.querySelector(".win98-cv-iframe");
  if (!iframe) return;
  const url = iframe.dataset.win98CvSrc || "cv.html";
  if (!iframe.getAttribute("src")) iframe.src = url;
}

function clearWin98CvIframe() {
  document.querySelector("#win98-frame-cv .win98-cv-iframe")?.removeAttribute("src");
}

function teardownWin98Shell(shell) {
  if (win98ClockId) {
    clearInterval(win98ClockId);
    win98ClockId = null;
  }
  shell.querySelectorAll(".win98-frame").forEach((frame) => {
    frame.classList.remove("is-open", "is-minimized", "is-maximized");
    frame.style.zIndex = "";
    frame.style.left = "";
    frame.style.top = "";
    frame.style.width = "";
    frame.style.height = "";
    delete frame.dataset.win98Dragged;
  });
  const tasks = shell.querySelector("[data-win98-taskbar-tasks]");
  if (tasks) tasks.replaceChildren();
  const startMenu = shell.querySelector("#win98-start-menu");
  const startBtn = shell.querySelector("#win98-start-btn");
  const subMenu = shell.querySelector("#win98-theme-submenu");
  const subBtn = shell.querySelector("#win98-theme-submenu-btn");
  if (startMenu) startMenu.hidden = true;
  if (startBtn) startBtn.setAttribute("aria-expanded", "false");
  if (subMenu) subMenu.hidden = true;
  if (subBtn) subBtn.setAttribute("aria-expanded", "false");
  clearWin98CvIframe();
}

function updateWin98Clock(shell) {
  const el = shell.querySelector("[data-win98-clock]");
  if (!el) return;
  el.textContent = new Date().toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function startWin98Clock(shell) {
  if (win98ClockId) clearInterval(win98ClockId);
  updateWin98Clock(shell);
  win98ClockId = window.setInterval(() => updateWin98Clock(shell), 30000);
}

function bringWin98FrameToFront(shell, frame) {
  win98ZBase += 1;
  frame.style.zIndex = String(win98ZBase);
}

function updateTaskbarButtonPressed(shell, frame, pressed) {
  const btn = shell.querySelector(`[data-win98-taskbar-tasks] [data-win98-task-for="${frame.id}"]`);
  if (btn) btn.classList.toggle("is-pressed", !!pressed);
}

function ensureTaskbarButton(shell, frame) {
  const tasks = shell.querySelector("[data-win98-taskbar-tasks]");
  if (!tasks) return;
  let btn = tasks.querySelector(`[data-win98-task-for="${frame.id}"]`);
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "win98-task-btn";
    btn.dataset.win98TaskFor = frame.id;
    const title = frame.querySelector(".win98-titlebar-title");
    btn.textContent = title ? title.textContent.trim() : "Window";
    btn.addEventListener("click", () => {
      if (document.documentElement.dataset.uiTheme !== "win98") return;
      if (frame.classList.contains("is-minimized")) {
        frame.classList.remove("is-minimized");
        frame.classList.add("is-open");
        updateTaskbarButtonPressed(shell, frame, false);
        loadWin98CvIframe(frame);
      }
      if (frame.classList.contains("is-open")) {
        bringWin98FrameToFront(shell, frame);
      }
    });
    tasks.appendChild(btn);
  }
  updateTaskbarButtonPressed(shell, frame, false);
}

function removeTaskbarButton(shell, frame) {
  shell.querySelector(`[data-win98-taskbar-tasks] [data-win98-task-for="${frame.id}"]`)?.remove();
}

function openWin98Frame(shell, frame) {
  frame.classList.remove("is-minimized");
  frame.classList.add("is-open");
  const id = frame.id;
  if (!frame.dataset.win98Dragged && WIN98_DEFAULT_POS[id]) {
    frame.style.left = WIN98_DEFAULT_POS[id].left;
    frame.style.top = WIN98_DEFAULT_POS[id].top;
  }
  ensureTaskbarButton(shell, frame);
  bringWin98FrameToFront(shell, frame);
  loadWin98CvIframe(frame);
}

function closeWin98Frame(shell, frame) {
  frame.classList.remove("is-open", "is-minimized", "is-maximized");
  frame.style.zIndex = "";
  removeTaskbarButton(shell, frame);
  if (frame.id === "win98-frame-cv") clearWin98CvIframe();
}

function minimizeWin98Frame(shell, frame) {
  frame.classList.remove("is-open");
  frame.classList.add("is-minimized");
  updateTaskbarButtonPressed(shell, frame, true);
}

function toggleMaximizeWin98Frame(frame) {
  frame.classList.toggle("is-maximized");
}

function ensureWin98DesktopBound() {
  const shell = document.querySelector("main[data-win98-shell]");
  if (!shell || shell.dataset.win98Bound === "true") return;
  shell.dataset.win98Bound = "true";

  const startMenu = shell.querySelector("#win98-start-menu");
  const startBtn = shell.querySelector("#win98-start-btn");
  const subMenu = shell.querySelector("#win98-theme-submenu");
  const subTrigger = shell.querySelector("#win98-theme-submenu-btn");

  shell.addEventListener("click", (e) => {
    if (document.documentElement.dataset.uiTheme !== "win98") return;

    const themePick = e.target.closest(".win98-start-submenu [data-theme-option]");
    if (themePick && shell.contains(themePick)) {
      if (startMenu) startMenu.hidden = true;
      if (startBtn) startBtn.setAttribute("aria-expanded", "false");
      if (subMenu) subMenu.hidden = true;
      if (subTrigger) subTrigger.setAttribute("aria-expanded", "false");
      return;
    }

    const launcher = e.target.closest("[data-win98-target]");
    if (launcher && shell.contains(launcher)) {
      const id = launcher.dataset.win98Target;
      const frame = id ? document.getElementById(id) : null;
      if (frame?.classList.contains("win98-frame")) {
        if (launcher.closest("#win98-start-menu")) {
          if (startMenu) startMenu.hidden = true;
          if (startBtn) startBtn.setAttribute("aria-expanded", "false");
          if (subMenu) subMenu.hidden = true;
          if (subTrigger) subTrigger.setAttribute("aria-expanded", "false");
        }
        if (frame.classList.contains("is-minimized")) {
          frame.classList.remove("is-minimized");
          frame.classList.add("is-open");
          updateTaskbarButtonPressed(shell, frame, false);
          loadWin98CvIframe(frame);
        } else if (frame.classList.contains("is-open")) {
          bringWin98FrameToFront(shell, frame);
        } else {
          openWin98Frame(shell, frame);
        }
      }
      return;
    }

    const closeBtn = e.target.closest("[data-win98-close]");
    if (closeBtn && shell.contains(closeBtn)) {
      const frame = closeBtn.closest(".win98-frame");
      if (frame) closeWin98Frame(shell, frame);
      return;
    }

    const minBtn = e.target.closest("[data-win98-minimize]");
    if (minBtn && shell.contains(minBtn)) {
      const frame = minBtn.closest(".win98-frame");
      if (frame && frame.classList.contains("is-open")) minimizeWin98Frame(shell, frame);
      return;
    }

    const maxBtn = e.target.closest("[data-win98-maximize]");
    if (maxBtn && shell.contains(maxBtn)) {
      const frame = maxBtn.closest(".win98-frame");
      if (frame) toggleMaximizeWin98Frame(frame);
    }
  });

  startBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (document.documentElement.dataset.uiTheme !== "win98") return;
    if (!startMenu) return;
    const open = startMenu.hidden;
    startMenu.hidden = !open;
    startBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  subTrigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (document.documentElement.dataset.uiTheme !== "win98") return;
    if (!subMenu) return;
    const open = subMenu.hidden;
    subMenu.hidden = !open;
    subTrigger.setAttribute("aria-expanded", open ? "true" : "false");
  });

  shell.querySelector("[data-win98-shutdown]")?.addEventListener("click", () => {
    if (document.documentElement.dataset.uiTheme !== "win98") return;
    const next = "modern";
    applyTheme(next);
    writeTheme(next);
    syncThemeButtons(next);
    applyThemeSideEffects(next);
    if (startMenu) startMenu.hidden = true;
    if (startBtn) startBtn.setAttribute("aria-expanded", "false");
  });

  shell.addEventListener("mousedown", (e) => {
    if (document.documentElement.dataset.uiTheme !== "win98") return;
    const handle = e.target.closest("[data-win98-drag-handle]");
    if (!handle || !shell.contains(handle)) return;
    if (e.target.closest(".win98-titlebtn")) return;
    const frame = handle.closest(".win98-frame");
    if (!frame || !frame.classList.contains("is-open")) return;
    if (frame.classList.contains("is-maximized")) return;
    e.preventDefault();
    bringWin98FrameToFront(shell, frame);
    const r = frame.getBoundingClientRect();
    win98DragState = {
      frame,
      dx: e.clientX - r.left,
      dy: e.clientY - r.top,
    };
  });

  document.addEventListener("click", (e) => {
    if (document.documentElement.dataset.uiTheme !== "win98" || !startMenu || startMenu.hidden) return;
    const t = e.target;
    if (!(t instanceof Node)) return;
    if (startMenu.contains(t) || startBtn?.contains(t)) return;
    startMenu.hidden = true;
    startBtn?.setAttribute("aria-expanded", "false");
    if (subMenu) subMenu.hidden = true;
    subTrigger?.setAttribute("aria-expanded", "false");
  });
}

function syncWin98Desktop() {
  const shell = document.querySelector("main[data-win98-shell]");
  if (!shell) return;
  ensureWin98DesktopBound();
  if (document.documentElement.dataset.uiTheme !== "win98") {
    teardownWin98Shell(shell);
  } else {
    startWin98Clock(shell);
  }
}

function bindWin98GlobalDrag() {
  if (document.documentElement.dataset.win98DragBound === "true") return;
  document.documentElement.dataset.win98DragBound = "true";
  window.addEventListener("mousemove", (e) => {
    if (!win98DragState) return;
    const { frame, dx, dy } = win98DragState;
    let left = e.clientX - dx;
    let top = e.clientY - dy;
    const w = frame.offsetWidth;
    const h = frame.offsetHeight;
    const maxL = Math.max(0, window.innerWidth - 48);
    const maxT = Math.max(0, window.innerHeight - 48);
    left = Math.max(0, Math.min(left, maxL - w));
    top = Math.max(0, Math.min(top, maxT - h));
    frame.style.left = `${left}px`;
    frame.style.top = `${top}px`;
    frame.dataset.win98Dragged = "1";
  });
  window.addEventListener("mouseup", () => {
    win98DragState = null;
  });
}

function initThemeToggle() {
  const activeTheme = applyTheme(readTheme());
  const buttons = Array.from(document.querySelectorAll("[data-theme-option]"));
  syncThemeButtons(activeTheme);
  initLiquidButtonEffects();
  bindHeaderOffsetSync();
  applyThemeSideEffects(activeTheme);
  initThemeDropdown();
  initPortfolioDropdown();
  bindWin98GlobalDrag();
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => scheduleSyncHeaderOffset());
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTheme = button.dataset.themeOption;
      if (!VALID_THEMES.has(nextTheme)) return;
      applyTheme(nextTheme);
      writeTheme(nextTheme);
      syncThemeButtons(nextTheme);
      applyThemeSideEffects(nextTheme);
    });
  });
}

function initPortfolioDropdown() {
  const dropdowns = Array.from(document.querySelectorAll(".portfolio-dropdown"));
  dropdowns.forEach((dropdown) => {
    if (!(dropdown instanceof HTMLDetailsElement)) return;
    if (dropdown.dataset.bound === "true") return;
    dropdown.dataset.bound = "true";

    const closeMenu = () => {
      dropdown.open = false;
    };

    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (!dropdown.contains(target)) {
        closeMenu();
      }
    });

    dropdown.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.matches(".portfolio-dropdown-item")) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    });

    // Close portfolio menu once user scrolls away.
    window.addEventListener("scroll", () => {
      if (dropdown.open) {
        closeMenu();
      }
    });
  });
}

function splitIntroLines(text) {
  return [text.trim()];
}

function isLiquidIntroWelcomeBody(el, activeTheme) {
  return (
    activeTheme === "liquid" &&
    el.classList.contains("intro-card-body") &&
    el.closest(".intro-card") != null
  );
}

function initIntroLineReveal(activeTheme) {
  const introBodies = Array.from(document.querySelectorAll(".intro-card-body"));
  introBodies.forEach((el) => {
    if (!el.dataset.originalText) {
      el.dataset.originalText = (el.textContent || "").trim();
    }

    el.classList.remove("line-reveal-active");

    if (activeTheme !== "modern" && activeTheme !== "liquid") {
      el.textContent = el.dataset.originalText;
      return;
    }

    if (isLiquidIntroWelcomeBody(el, activeTheme)) {
      el.textContent = el.dataset.originalText;
      return;
    }

    const pieces = splitIntroLines(el.dataset.originalText);
    el.innerHTML = "";
    pieces.forEach((piece, idx) => {
      const line = document.createElement("span");
      line.className = "intro-reveal-line";
      line.style.setProperty("--line-delay", `${idx * 180}ms`);
      line.textContent = piece;
      el.appendChild(line);
    });
  });
}

function initThemeDropdown() {
  const dropdowns = Array.from(document.querySelectorAll(".theme-dropdown"));
  dropdowns.forEach((dropdown) => {
    if (dropdown.dataset.bound === "true") return;
    dropdown.dataset.bound = "true";

    const trigger = dropdown.querySelector(".theme-dropdown-trigger");
    if (!trigger) return;

    const closeMenu = () => {
      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    };

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const shouldOpen = !dropdown.classList.contains("open");
      if (shouldOpen) {
        dropdown.classList.add("open");
        trigger.setAttribute("aria-expanded", "true");
      } else {
        closeMenu();
      }
    });

    dropdown.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.matches("[data-theme-option]")) {
        closeMenu();
      }
    });

    document.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (!dropdown.contains(target)) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    });

    window.addEventListener("scroll", () => {
      if (dropdown.classList.contains("open")) {
        closeMenu();
      }
    });
  });
}

function removeNeoRoleSrOnly() {
  document.querySelectorAll(".neo-role-banner-sr").forEach((el) => el.remove());
}

function appendNeoRoleMarqueeCycle(track) {
  const phrases = ROTATING_ROLES.slice(1);
  phrases.forEach((phrase, i) => {
    const p = document.createElement("span");
    p.className = "neo-role-banner__phrase";
    p.textContent = phrase;
    track.appendChild(p);
    const illu = document.createElement("span");
    illu.className = "neo-role-banner__illu";
    illu.setAttribute("aria-hidden", "true");
    illu.innerHTML = NEO_ROLE_BANNER_ICONS[i % NEO_ROLE_BANNER_ICONS.length];
    track.appendChild(illu);
  });
}

function initRotatingIntro(activeTheme) {
  const roleEl = document.getElementById("rotating-role");
  if (!roleEl) return;

  if (rotatingRoleTimerId) {
    window.clearTimeout(rotatingRoleTimerId);
    rotatingRoleTimerId = null;
  }

  const theme =
    activeTheme && VALID_THEMES.has(activeTheme)
      ? activeTheme
      : document.documentElement.dataset.uiTheme || DEFAULT_THEME;

  if (theme === "neo") {
    removeNeoRoleSrOnly();
    roleEl.classList.remove("is-typing", "neo-role-banner");
    roleEl.removeAttribute("aria-hidden");
    roleEl.textContent = "";

    const frame = document.querySelector(".neo-intro-framed");
    if (frame) {
      const sr = document.createElement("span");
      sr.className = "visually-hidden neo-role-banner-sr";
      sr.textContent = ROTATING_ROLES.slice(1).join(". ") + ".";
      frame.insertBefore(sr, frame.firstChild);

      const rails = frame.querySelectorAll("[data-neo-marquee-rail]");
      rails.forEach((rail) => {
        rail.textContent = "";
        const track = document.createElement("div");
        track.className = "neo-role-banner__track";
        appendNeoRoleMarqueeCycle(track);
        appendNeoRoleMarqueeCycle(track);
        rail.appendChild(track);
      });
    }
    return;
  }

  removeNeoRoleSrOnly();
  roleEl.classList.remove("neo-role-banner");
  roleEl.removeAttribute("aria-hidden");
  roleEl.textContent = "";
  roleEl.classList.add("is-typing");

  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let isPaused = false;

  function tick() {
    const currentPhrase = ROTATING_ROLES[phraseIndex];

    if (!isDeleting && !isPaused) {
      charIndex += 1;
      roleEl.textContent = currentPhrase.slice(0, charIndex);
      if (charIndex >= currentPhrase.length) {
        isPaused = true;
        rotatingRoleTimerId = window.setTimeout(() => {
          isPaused = false;
          isDeleting = true;
          tick();
        }, 950);
        return;
      }
      rotatingRoleTimerId = window.setTimeout(tick, 68);
      return;
    }

    if (isDeleting && !isPaused) {
      charIndex -= 1;
      roleEl.textContent = currentPhrase.slice(0, Math.max(0, charIndex));
      if (charIndex <= 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % ROTATING_ROLES.length;
        rotatingRoleTimerId = window.setTimeout(tick, 220);
        return;
      }
      rotatingRoleTimerId = window.setTimeout(tick, 42);
    }
  }

  tick();
}

function initModernScrollReveal(activeTheme) {
  const revealTargets = Array.from(
    document.querySelectorAll(
      ".theme-dropdown, .intro-card, .intro-card-heading, .intro-flight-stage, .intro-card-body, .intro-modern-trio, .hero, .hero-stats-block, .quiz-card, .result-card, .footnote",
    ),
  );
  const delayedRevealMap = new Map([
    ["intro-card-body", 220],
    ["intro-card-body-2", 520],
  ]);
  const introBodyTargets = Array.from(document.querySelectorAll(".intro-card-body"));
  const deferredIntroTargets =
    window.scrollY <= 0
      ? introBodyTargets.filter((el) => !isLiquidIntroWelcomeBody(el, activeTheme))
      : [];
  const immediateTargets = revealTargets.filter(
    (el) =>
      !deferredIntroTargets.includes(el) && !isLiquidIntroWelcomeBody(el, activeTheme),
  );

  revealTargets.forEach((el) => {
    el.classList.remove("is-revealed");
    el.classList.remove("line-reveal-active");
    if (
      (activeTheme === "modern" || activeTheme === "liquid") &&
      !isLiquidIntroWelcomeBody(el, activeTheme)
    ) {
      el.setAttribute("data-modern-reveal", "true");
    } else {
      el.removeAttribute("data-modern-reveal");
    }
  });

  if (activeTheme !== "modern" && activeTheme !== "liquid") return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const target = entry.target;
        const isIntroBody = target.classList.contains("intro-card-body");
        const key = isIntroBody && target === introBodyTargets[1] ? "intro-card-body-2" : "intro-card-body";
        const delay = isIntroBody ? delayedRevealMap.get(key) || 0 : 0;

        const revealTarget = () => {
          target.classList.add("is-revealed");
          if (isIntroBody) {
            target.classList.add("line-reveal-active");
          }
        };

        if (delay > 0) {
          window.setTimeout(revealTarget, delay);
        } else {
          revealTarget();
        }
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
  );

  immediateTargets.forEach((el) => observer.observe(el));

  if (!deferredIntroTargets.length) return;
  const revealDeferredOnScroll = () => {
    deferredIntroTargets.forEach((el) => observer.observe(el));
    window.removeEventListener("scroll", revealDeferredOnScroll);
  };
  window.addEventListener("scroll", revealDeferredOnScroll, { once: true });
}

const HERO_ARCHIS_SURFACE_FNS = {
  convex_squircle: (x) => Math.pow(1 - Math.pow(1 - x, 4), 0.25),
  convex_circle: (x) => Math.sqrt(1 - (1 - x) * (1 - x)),
  concave: (x) => 1 - Math.sqrt(1 - (1 - x) * (1 - x)),
  lip: (x) => {
    const convex = Math.pow(1 - Math.pow(1 - Math.min(x * 2, 1), 4), 0.25);
    const concave = 1 - Math.sqrt(1 - (1 - x) * (1 - x)) + 0.1;
    const t = 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
    return convex * (1 - t) + concave * t;
  },
};

const HERO_ARCHIS_CFG = {
  surfaceKey: "convex_squircle",
  glassThick: 80,
  bezelW: 48,
  ior: 2.8,
  scaleRatio: 1,
  blurAmt: 0.35,
  specOpacity: 0.5,
  specSat: 4,
};

const heroArchisTeardowns = [];
let heroArchisFilterSerial = 0;

function calculateHeroArchisRefractionProfile(glassThickness, bezelWidth, heightFn, ior, samples) {
  samples = samples || 128;
  const eta = 1 / ior;
  function refract(nx, ny) {
    const dot = ny;
    const k = 1 - eta * eta * (1 - dot * dot);
    if (k < 0) return null;
    const sq = Math.sqrt(k);
    return [-(eta * dot + sq) * nx, eta - (eta * dot + sq) * ny];
  }
  const profile = new Float64Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = i / samples;
    const y = heightFn(x);
    const dx = x < 1 ? 0.0001 : -0.0001;
    const y2 = heightFn(x + dx);
    const deriv = (y2 - y) / dx;
    const mag = Math.sqrt(deriv * deriv + 1);
    const ref = refract(-deriv / mag, -1 / mag);
    if (!ref) {
      profile[i] = 0;
      continue;
    }
    profile[i] = ref[0] * ((y * bezelWidth + glassThickness) / ref[1]);
  }
  return profile;
}

function generateHeroArchisDisplacementMap(w, h, radius, bezelWidth, profile, maxDisp) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 128;
    d[i + 1] = 128;
    d[i + 2] = 0;
    d[i + 3] = 255;
  }

  const r = radius;
  const rSq = r * r;
  const r1Sq = (r + 1) ** 2;
  const rBSq = Math.max(r - bezelWidth, 0) ** 2;
  const wB = w - r * 2;
  const hB = h - r * 2;
  const S = profile.length;

  for (let y1 = 0; y1 < h; y1++) {
    for (let x1 = 0; x1 < w; x1++) {
      const x = x1 < r ? x1 - r : x1 >= w - r ? x1 - r - wB : 0;
      const y = y1 < r ? y1 - r : y1 >= h - r ? y1 - r - hB : 0;
      const dSq = x * x + y * y;
      if (dSq > r1Sq || dSq < rBSq) continue;
      const dist = Math.sqrt(dSq);
      const fromSide = r - dist;
      const op = dSq < rSq ? 1 : 1 - (dist - Math.sqrt(rSq)) / (Math.sqrt(r1Sq) - Math.sqrt(rSq));
      if (op <= 0 || dist === 0) continue;
      const cos = x / dist;
      const sin = y / dist;
      const bi = Math.min(((fromSide / bezelWidth) * S) | 0, S - 1);
      const disp = profile[bi] || 0;
      const dX = (-cos * disp) / maxDisp;
      const dY = (-sin * disp) / maxDisp;
      const idx = (y1 * w + x1) * 4;
      d[idx] = (128 + dX * 127 * op + 0.5) | 0;
      d[idx + 1] = (128 + dY * 127 * op + 0.5) | 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

function generateHeroArchisSpecularMap(w, h, radius, bezelWidth, angle) {
  angle = angle != null ? angle : Math.PI / 3;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;
  d.fill(0);

  const r = radius;
  const rSq = r * r;
  const r1Sq = (r + 1) ** 2;
  const rBSq = Math.max(r - bezelWidth, 0) ** 2;
  const wB = w - r * 2;
  const hB = h - r * 2;
  const sv = [Math.cos(angle), Math.sin(angle)];

  for (let y1 = 0; y1 < h; y1++) {
    for (let x1 = 0; x1 < w; x1++) {
      const x = x1 < r ? x1 - r : x1 >= w - r ? x1 - r - wB : 0;
      const y = y1 < r ? y1 - r : y1 >= h - r ? y1 - r - hB : 0;
      const dSq = x * x + y * y;
      if (dSq > r1Sq || dSq < rBSq) continue;
      const dist = Math.sqrt(dSq);
      const fromSide = r - dist;
      const op = dSq < rSq ? 1 : 1 - (dist - Math.sqrt(rSq)) / (Math.sqrt(r1Sq) - Math.sqrt(rSq));
      if (op <= 0 || dist === 0) continue;
      const cos = x / dist;
      const sin = -y / dist;
      const dot = Math.abs(cos * sv[0] + sin * sv[1]);
      const edge = Math.sqrt(Math.max(0, 1 - (1 - fromSide) ** 2));
      const coeff = dot * edge;
      const col = (255 * coeff) | 0;
      const alpha = (col * coeff * op) | 0;
      const idx = (y1 * w + x1) * 4;
      d[idx] = col;
      d[idx + 1] = col;
      d[idx + 2] = col;
      d[idx + 3] = alpha;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

function bindHeroArchisSurface(sizeEl, styleEl, defs, filterId) {
  const cfg = HERO_ARCHIS_CFG;
  let filterNode = null;
  let timer = null;

  function rebuildFilter() {
    const w = sizeEl.offsetWidth;
    const h = sizeEl.offsetHeight;
    if (w < 2 || h < 2) return;

    const heightFn = HERO_ARCHIS_SURFACE_FNS[cfg.surfaceKey];
    const radius = Math.max(2, Math.floor(Math.min(w, h) / 2) - 1);
    const clampedBezel = Math.max(
      1,
      Math.min(cfg.bezelW, radius - 1, Math.min(w, h) / 2 - 1),
    );

    const profile = calculateHeroArchisRefractionProfile(cfg.glassThick, clampedBezel, heightFn, cfg.ior, 128);
    const maxDisp = Math.max(...Array.from(profile).map(Math.abs)) || 1;
    const dispUrl = generateHeroArchisDisplacementMap(w, h, radius, clampedBezel, profile, maxDisp);
    const specUrl = generateHeroArchisSpecularMap(w, h, radius, clampedBezel * 2.5);
    const scale = maxDisp * cfg.scaleRatio;

    if (filterNode) filterNode.remove();
    const svgTmp = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgTmp.innerHTML = `
        <filter id="${filterId}" x="0%" y="0%" width="100%" height="100%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="${cfg.blurAmt}" result="blurred_source" />
            <feImage href="${dispUrl}" x="0" y="0" width="${w}" height="${h}" result="disp_map" />
            <feDisplacementMap in="blurred_source" in2="disp_map"
                scale="${scale}" xChannelSelector="R" yChannelSelector="G"
                result="displaced" />
            <feColorMatrix in="displaced" type="saturate" values="${cfg.specSat}" result="displaced_sat" />
            <feImage href="${specUrl}" x="0" y="0" width="${w}" height="${h}" result="spec_layer" />
            <feComposite in="displaced_sat" in2="spec_layer" operator="in" result="spec_masked" />
            <feComponentTransfer in="spec_layer" result="spec_faded">
                <feFuncA type="linear" slope="${cfg.specOpacity}" />
            </feComponentTransfer>
            <feBlend in="spec_masked" in2="displaced" mode="normal" result="with_sat" />
            <feBlend in="spec_faded" in2="with_sat" mode="normal" />
        </filter>
    `;
    filterNode = svgTmp.querySelector("filter");
    if (filterNode) defs.appendChild(filterNode);

    styleEl.style.setProperty("--hero-archis-backdrop", `url(#${filterId})`);
  }

  function scheduleRebuild() {
    window.clearTimeout(timer);
    timer = window.setTimeout(rebuildFilter, 30);
  }

  function onWinResize() {
    window.clearTimeout(timer);
    timer = window.setTimeout(rebuildFilter, 120);
  }

  window.addEventListener("resize", onWinResize);

  let ro;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(scheduleRebuild);
    ro.observe(sizeEl);
  }

  requestAnimationFrame(() => requestAnimationFrame(rebuildFilter));

  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("resize", onWinResize);
    if (ro) ro.disconnect();
    if (filterNode) filterNode.remove();
    styleEl.style.removeProperty("--hero-archis-backdrop");
  };
}

function teardownHeroArchisSurfaces() {
  heroArchisTeardowns.splice(0).forEach((fn) => fn());
}

/** Modern hero: archisvaze/liquid-glass refraction per control (Chromium). */
function syncHeroArchisSurfaces() {
  teardownHeroArchisSurfaces();
  heroArchisFilterSerial = 0;
  if (document.documentElement.dataset.uiTheme !== DEFAULT_THEME) return;

  const defs = document.getElementById("hero-archis-defs");
  if (!defs) return;

  const queue = [
    ...document.querySelectorAll(".hero .btn"),
    ...document.querySelectorAll(".hero .hero-linkedin"),
  ];

  queue.forEach((el) => {
    const filterId = `hero-archis-surf-${heroArchisFilterSerial++}`;
    heroArchisTeardowns.push(bindHeroArchisSurface(el, el, defs, filterId));
  });
}

function initLiquidButtonEffects() {
  const selectors = ".btn, .header-cta, .hero-linkedin, .ui-mode-btn, .brand-pill";
  const elements = Array.from(document.querySelectorAll(selectors));
  ensureGlassFilterSvg();

  elements.forEach((element) => {
    element.classList.add("glass-button");
    ensureGlassLayers(element);

    if (element.dataset.liquidFxBound === "true") return;
    element.dataset.liquidFxBound = "true";

    element.addEventListener("mousemove", (e) => {
      const activeTheme = document.documentElement.dataset.uiTheme;
      if (activeTheme !== "liquid" && activeTheme !== "modern") return;
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      element.style.setProperty("--glass-mx", `${x}px`);
      element.style.setProperty("--glass-my", `${y}px`);

      const specular = element.querySelector(".glass-specular");
      if (specular) {
        const specularGradient =
          activeTheme === "modern"
            ? `radial-gradient(
          circle at ${x}px ${y}px,
          rgba(108,224,255,0.26) 0%,
          rgba(108,224,255,0.12) 30%,
          rgba(108,224,255,0) 62%
        )`
            : `radial-gradient(
          circle at ${x}px ${y}px,
          rgba(255,255,255,0.22) 0%,
          rgba(255,255,255,0.08) 30%,
          rgba(255,255,255,0) 60%
        )`;
        specular.style.background = specularGradient;
      }
    });

    element.addEventListener("mouseleave", () => {
      element.style.removeProperty("--glass-mx");
      element.style.removeProperty("--glass-my");

      const specular = element.querySelector(".glass-specular");
      if (specular) {
        specular.style.background = "none";
      }
    });
  });
}

function ensureGlassFilterSvg() {
  if (document.getElementById("glass-distortion")) return;

  const svgMarkup = `
    <svg aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">
      <filter id="glass-distortion">
        <feTurbulence type="turbulence" baseFrequency="0.008" numOctaves="2" result="noise"></feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="77"></feDisplacementMap>
      </filter>
    </svg>
  `;

  document.body.insertAdjacentHTML("afterbegin", svgMarkup);
}

function ensureGlassLayers(element) {
  if (element.dataset.glassLayersReady === "true") return;

  const content = document.createElement("div");
  content.className = "glass-content";

  while (element.firstChild) {
    content.appendChild(element.firstChild);
  }

  const filter = document.createElement("div");
  filter.className = "glass-filter";

  const overlay = document.createElement("div");
  overlay.className = "glass-overlay";

  const specular = document.createElement("div");
  specular.className = "glass-specular";

  element.appendChild(filter);
  element.appendChild(overlay);
  element.appendChild(specular);
  element.appendChild(content);
  element.dataset.glassLayersReady = "true";
}

function initQuestionPage() {
  const body = document.body;
  const pageType = body.dataset.page;
  if (pageType !== "question") return;

  const questionId = body.dataset.questionId;
  if (!questionId) return;

  const idxFromData = Number(body.dataset.questionIndex || "0");
  const totalFromData = Number(body.dataset.questionTotal || "0");
  const index =
    idxFromData > 0 ? idxFromData : Math.max(QUESTION_SEQUENCE.indexOf(questionId) + 1, 1);
  const total = totalFromData > 0 ? totalFromData : QUESTION_SEQUENCE.length;

  const progressEl = document.getElementById("quiz-progress");
  if (progressEl) {
    progressEl.textContent = `Question ${index} of ${total}`;
  }

  const answers = readAnswers();
  const storedValue = answers[questionId];

  const optionLabels = Array.from(document.querySelectorAll(".quiz-option"));
  const nextButton = document.getElementById("btn-next");
  const prevButton = document.getElementById("btn-prev");

  let currentValue = storedValue || "";

  function updateSelectedClasses() {
    optionLabels.forEach((label) => {
      const input = label.querySelector("input[type=radio]");
      if (!input) return;
      if (input.value === currentValue) {
        label.classList.add("selected");
      } else {
        label.classList.remove("selected");
      }
    });
    if (nextButton) {
      nextButton.disabled = !currentValue;
    }
  }

  optionLabels.forEach((label) => {
    const input = label.querySelector("input[type=radio]");
    if (!input) return;

    if (storedValue && input.value === storedValue) {
      input.checked = true;
    }

    input.addEventListener("change", () => {
      currentValue = input.value;
      updateSelectedClasses();
    });
  });

  updateSelectedClasses();

  const nextHref = body.dataset.next;
  const prevHref = body.dataset.prev;

  if (prevButton) {
    if (prevHref) {
      prevButton.disabled = false;
      prevButton.addEventListener("click", () => {
        window.location.href = prevHref;
      });
    } else {
      prevButton.disabled = true;
    }
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      if (!currentValue) return;
      writeAnswer(questionId, currentValue);
      if (nextHref) {
        window.location.href = nextHref;
      } else {
        window.location.href = "result.html";
      }
    });

    if (index === total) {
      nextButton.textContent = "See your result";
    }
  }
}

function initResultPage() {
  const body = document.body;
  const pageType = body.dataset.page;
  if (pageType !== "result") return;

  const resultBody = document.getElementById("result-body");
  if (!resultBody) return;

  const answers = readAnswers();

  const yesishKeys = QUESTION_SEQUENCE;
  let strongAlignment = 0;
  let gentleAlignment = 0;

  yesishKeys.forEach((key) => {
    const value = answers[key];
    if (!value) return;
    if (value === "yes" || value === "some") {
      strongAlignment += 1;
    } else if (value === "maybe") {
      gentleAlignment += 1;
    }
  });

  const lines = [];
  const strengths = [];

  if (strongAlignment >= 3) {
    lines.push(
      "From your answers, it looks like you’re serious about shipping real products with great UX... not just slide decks.",
    );
  } else if (strongAlignment >= 1 || gentleAlignment >= 2) {
    lines.push(
      "You’re on the hook for real product and platform change, and you know it. You need a partner who can help manage change while velocity stays high.",
    );
  } else {
    lines.push(
      "Even if you’re just exploring, it helps to have someone who has been through messy launches, regulation, and scale before.",
    );
  }

  if (answers.outcomes === "yes") {
    lines.push(
      "You want end-to-end ownership of product outcomes in a high-growth context. That is exactly where Richard is most useful.",
    );
    strengths.push("Outcome ownership");
  }

  if (answers.translation === "yes" || answers.translation === "maybe") {
    lines.push(
      "You value people who can move between leadership, product, and engineering without losing the customer or the compliance story.",
    );
    strengths.push("Exec-to-delivery translation");
  }

  if (answers.culture === "yes") {
    lines.push(
      "You’re serious about building cross-functional teams and a culture that performs in hybrid work—not leaving trust and pace to chance.",
    );
    strengths.push("Hybrid team leadership");
  }

  if (answers.complexity === "yes" || answers.complexity === "some") {
    strengths.push("Complex financial product UX");
  }

  if (answers.experience === "yes" || answers.experience === "some") {
    strengths.push("10+ years in fintech product and UX");
  }

  lines.push(
    "Putting that together, the answer is clear:",
    "Yes, you should hire Richard. The only real question is...when you want him to start! Reach out to chat about how he can add value to your team.",
  );

  resultBody.innerHTML = "";

  const leadLines = lines.slice(0, -2);
  const verdictPair = lines.slice(-2);

  if (document.documentElement.dataset.uiTheme === "modern") {
    const quickTake = leadLines[0] || verdictPair[0];
    const focusedStrengths = strengths.slice(0, 3);
    const fallbackStrengths = [
      "Product and UX leadership in regulated environments",
      "Cross-functional delivery with measurable outcomes",
      "Clarity from strategy through execution",
    ];
    const bullets = focusedStrengths.length ? focusedStrengths : fallbackStrengths;

    const heroBlock = document.createElement("section");
    heroBlock.className = "modern-result-hero";

    const support = document.createElement("p");
    support.className = "modern-result-support";
    support.textContent = quickTake;

    const list = document.createElement("ul");
    list.className = "modern-result-quick-list";

    bullets.forEach((itemText) => {
      const li = document.createElement("li");
      li.textContent = itemText;
      list.appendChild(li);
    });

    const closing = document.createElement("p");
    closing.className = "modern-result-closing";
    closing.textContent = "If this sounds like your team, let’s chat.";

    heroBlock.append(support, list, closing);
    resultBody.appendChild(heroBlock);
    return;
  }

  leadLines.forEach((text) => {
    const p = document.createElement("p");
    p.className = "result-text";
    p.textContent = text;
    resultBody.appendChild(p);
  });

  const callout = document.createElement("div");
  callout.className = "result-callout";

  const intro = document.createElement("p");
  intro.className = "result-callout-intro";
  intro.textContent = verdictPair[0];

  const verdict = document.createElement("p");
  verdict.className = "result-callout-verdict";
  verdict.textContent = verdictPair[1];

  callout.appendChild(intro);
  callout.appendChild(verdict);
  resultBody.appendChild(callout);
}

function initPortfolioCarousel() {
  const track = document.querySelector("[data-portfolio-track]");
  if (!(track instanceof HTMLElement)) return;

  const prevBtn = document.querySelector("[data-carousel-prev]");
  const nextBtn = document.querySelector("[data-carousel-next]");
  const cards = Array.from(track.querySelectorAll(".portfolio-card"));
  if (!cards.length) return;

  const getStep = () => {
    const first = cards[0];
    const second = cards[1];
    if (!(first instanceof HTMLElement)) return 320;
    if (!(second instanceof HTMLElement)) return Math.round(first.getBoundingClientRect().width + 16);
    const a = first.getBoundingClientRect();
    const b = second.getBoundingClientRect();
    return Math.max(220, Math.round(b.left - a.left));
  };

  if (prevBtn instanceof HTMLButtonElement) {
    prevBtn.addEventListener("click", () => {
      track.scrollBy({ left: -getStep(), behavior: "smooth" });
    });
  }

  if (nextBtn instanceof HTMLButtonElement) {
    nextBtn.addEventListener("click", () => {
      track.scrollBy({ left: getStep(), behavior: "smooth" });
    });
  }
}

function ensureSiteFooter() {
  if (document.querySelector(".site-footer")) return;

  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <a
      class="site-footer-icon-link"
      href="https://www.linkedin.com/in/beattiera/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="LinkedIn"
      title="LinkedIn"
    >
      <svg class="site-footer-linkedin-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.27 2.38 4.27 5.48v6.26zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"
        />
      </svg>
    </a>
  `;
  document.body.appendChild(footer);
}

function ensurePageScrollUnlocked() {
  document.documentElement.style.overflowY = "auto";
  document.documentElement.style.height = "auto";
  document.body.style.overflowY = "auto";
  document.body.style.height = "auto";
  if (document.body.style.position === "fixed") {
    document.body.style.position = "";
  }
}

/** Hero background: autoplay + loop (muted); respect reduced motion. */
function initHeroBgVideo() {
  const videos = Array.from(document.querySelectorAll(".hero-bg-video, .liquid-page-bg-video video"));
  if (!videos.length) return;

  const markVideoReady = (video) => {
    video.classList.add("is-ready");
  };

  const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSaveData = !!(navigator.connection && navigator.connection.saveData);
  if (isReducedMotion || isSaveData) {
    videos.forEach((video) => {
      video.removeAttribute("autoplay");
      video.loop = false;
      video.preload = "metadata";
      video.pause();
      video.classList.remove("is-ready");
    });
    return;
  }

  const playVideo = (video) => {
    const tryPlay = () => {
      markVideoReady(video);
      video.play().catch(() => {});
    };
    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener("canplay", tryPlay, { once: true });
      video.addEventListener("loadeddata", () => markVideoReady(video), { once: true });
    }
  };

  videos.forEach((video) => {
    video.loop = true;
    video.preload = "metadata";
    if (video.readyState >= 2) {
      markVideoReady(video);
    }
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (!(video instanceof HTMLVideoElement)) return;
          if (entry.isIntersecting) {
            playVideo(video);
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.05 }
    );

    videos.forEach((video) => observer.observe(video));
    return;
  }

  videos.forEach((video) => {
    if (video.readyState >= 2) {
      video.play().catch(() => {});
    } else {
      video.addEventListener("canplay", () => video.play().catch(() => {}), { once: true });
    }
  });
}

function init() {
  ensurePageScrollUnlocked();
  ensureSiteFooter();
  initThemeToggle();
  initPortfolioCarousel();
  initQuestionPage();
  initResultPage();
  initHeroBgVideo();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

