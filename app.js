const STORAGE_KEY = "meetrb_quiz_answers_v3";
const QUESTION_SEQUENCE = ["experience", "translation", "outcomes", "complexity", "culture"];

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
  }

  if (answers.translation === "yes" || answers.translation === "maybe") {
    lines.push(
      "You value people who can move between leadership, product, and engineering without losing the customer or the compliance story.",
    );
  }

  if (answers.culture === "yes") {
    lines.push(
      "You’re serious about building cross-functional teams and a culture that performs in hybrid work—not leaving trust and pace to chance.",
    );
  }

  lines.push(
    "Putting that together, the answer is clear:",
    "Yes, you should hire Richard. The only real question is when you want him to start! Reach out to chat about how he can add value to your team.",
  );

  resultBody.innerHTML = "";

  const pill = document.createElement("div");
  pill.className = "result-pill";
  pill.textContent = "biased but honest";
  resultBody.appendChild(pill);

  const leadLines = lines.slice(0, -2);
  const verdictPair = lines.slice(-2);

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

function init() {
  initQuestionPage();
  initResultPage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

