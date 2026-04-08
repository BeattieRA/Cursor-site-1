const STORAGE_KEY = "meetrb_quiz_answers_v3";
const THEME_STORAGE_KEY = "meetrb_ui_theme_v1";
const DEFAULT_THEME = "modern";
const VALID_THEMES = new Set(["neo", "liquid", "win98", "propaganda", "bloomberg", "modern"]);
const QUESTION_SEQUENCE = ["experience", "translation", "outcomes", "complexity", "culture"];
const ROTATING_ROLES = [
  "Richard",
  "a digital leader",
  "a design thinker",
  "a problem solver",
  "a product manager",
  "your next hire",
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

function syncThemeButtons(activeTheme) {
  const buttons = Array.from(document.querySelectorAll("[data-theme-option]"));
  buttons.forEach((button) => {
    const option = button.dataset.themeOption;
    const isActive = option === activeTheme;
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function initThemeToggle() {
  const activeTheme = applyTheme(readTheme());
  const buttons = Array.from(document.querySelectorAll("[data-theme-option]"));
  syncThemeButtons(activeTheme);
  initLiquidButtonEffects();
  initIntroLineReveal(activeTheme);
  initModernScrollReveal(activeTheme);
  initRotatingIntro();
  initThemeDropdown();
  initPortfolioDropdown();

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTheme = button.dataset.themeOption;
      if (!VALID_THEMES.has(nextTheme)) return;
      applyTheme(nextTheme);
      writeTheme(nextTheme);
      syncThemeButtons(nextTheme);
      initIntroLineReveal(nextTheme);
      initModernScrollReveal(nextTheme);
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

function initIntroLineReveal(activeTheme) {
  const introBodies = Array.from(document.querySelectorAll(".intro-card-body"));
  introBodies.forEach((el) => {
    if (!el.dataset.originalText) {
      el.dataset.originalText = (el.textContent || "").trim();
    }

    el.classList.remove("line-reveal-active");

    if (activeTheme !== "modern") {
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
  });
}

function initRotatingIntro() {
  const roleEl = document.getElementById("rotating-role");
  if (!roleEl) return;

  if (rotatingRoleTimerId) {
    window.clearTimeout(rotatingRoleTimerId);
    rotatingRoleTimerId = null;
  }

  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let isPaused = false;

  roleEl.textContent = "";
  roleEl.classList.add("is-typing");

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
      ".ui-mode-callout, .intro-card, .intro-card-heading, .intro-card-body, .hero, .hero-stats-block, .quiz-card, .result-card, .footnote",
    ),
  );
  const delayedRevealMap = new Map([
    ["intro-card-body", 220],
    ["intro-card-body-2", 520],
  ]);
  const introBodyTargets = Array.from(document.querySelectorAll(".intro-card-body"));
  const deferredIntroTargets = window.scrollY <= 0 ? introBodyTargets : [];
  const immediateTargets = revealTargets.filter((el) => !deferredIntroTargets.includes(el));

  revealTargets.forEach((el) => {
    el.classList.remove("is-revealed");
    el.classList.remove("line-reveal-active");
    if (activeTheme === "modern") {
      el.setAttribute("data-modern-reveal", "true");
    } else {
      el.removeAttribute("data-modern-reveal");
    }
  });

  if (activeTheme !== "modern") return;

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

function init() {
  ensurePageScrollUnlocked();
  ensureSiteFooter();
  initThemeToggle();
  initPortfolioCarousel();
  initQuestionPage();
  initResultPage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

