const TOTAL_PROBLEMS = 12;

const quizForm = document.querySelector("#quizForm");
const scoreValue = document.querySelector("#scoreValue");
const scoreMessage = document.querySelector("#scoreMessage");
const answeredCount = document.querySelector("#answeredCount");
const progressBar = document.querySelector("#progressBar");
const submitButton = document.querySelector("#submitButton");
const newQuizButton = document.querySelector("#newQuizButton");
const tryAgainButton = document.querySelector("#tryAgainButton");
const resultPanel = document.querySelector("#resultPanel");
const resultTitle = document.querySelector("#resultTitle");
const resultText = document.querySelector("#resultText");

let problems = [];
let submitted = false;
let activeIndex = 0;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function makeProblem(type) {
  if (type === "add") {
    const a = randomInt(125, 899);
    const b = randomInt(76, 698);
    return { text: `${a} + ${b}`, answer: a + b };
  }

  if (type === "subtract") {
    const a = randomInt(350, 1200);
    const b = randomInt(90, a - 25);
    return { text: `${a} - ${b}`, answer: a - b };
  }

  if (type === "multiply") {
    const a = randomInt(12, 24);
    const b = randomInt(3, 12);
    return { text: `${a} × ${b}`, answer: a * b };
  }

  const divisor = randomInt(3, 12);
  const answer = randomInt(8, 24);
  return { text: `${divisor * answer} ÷ ${divisor}`, answer };
}

function generateProblems() {
  const types = shuffle([
    "add",
    "add",
    "add",
    "subtract",
    "subtract",
    "subtract",
    "multiply",
    "multiply",
    "multiply",
    "divide",
    "divide",
    "divide",
  ]);

  return types.map((type, index) => ({
    id: index + 1,
    elapsedMs: null,
    endMs: null,
    failedOut: false,
    isComplete: false,
    startMs: null,
    studentAnswer: null,
    tries: 0,
    ...makeProblem(type),
  }));
}

function formatSeconds(ms) {
  if (!Number.isFinite(ms)) {
    return "--";
  }

  return `${(ms / 1000).toFixed(1)}s`;
}

function normalizeAnswer(value) {
  const trimmed = value.trim();

  if (!/^-?\d+$/.test(trimmed)) {
    return null;
  }

  return Number(trimmed);
}

function getCards() {
  return [...quizForm.querySelectorAll(".problem-card")];
}

function getInputs() {
  return [...quizForm.querySelectorAll(".answer-input")];
}

function getCompletedCount() {
  return problems.filter((problem) => problem.isComplete).length;
}

function renderProblems() {
  quizForm.innerHTML = problems
    .map(
      (problem, index) => `
        <article
          class="problem-card"
          data-id="${problem.id}"
          data-index="${index}"
          ${index === 0 ? "" : "hidden"}
        >
          <div class="problem-topline">
            <span class="problem-number">${problem.id}</span>
            <span class="problem-status">Current</span>
          </div>
          <label class="equation" for="answer-${problem.id}">
            <span class="equation-text">${problem.text}</span>
            <span aria-hidden="true">=</span>
          </label>
          <input
            class="answer-input"
            id="answer-${problem.id}"
            inputmode="numeric"
            autocomplete="off"
            data-lpignore="true"
            data-has-typed="false"
            value=""
            placeholder="?"
            type="text"
            aria-label="Answer for problem ${problem.id}: ${problem.text}"
          />
          <div class="problem-actions">
            <span class="time-taken">Time: --</span>
            <span class="tries-left">Tries left: 3</span>
            <button class="button small answer-button" type="button">
              Check answer
            </button>
          </div>
          <span class="feedback" aria-live="polite"></span>
          <img
            class="feedback-image"
            src=""
            alt=""
            hidden
          />
        </article>
      `,
    )
    .join("");
}

function startProblem(index) {
  const problem = problems[index];

  if (!problem || problem.startMs !== null) {
    return;
  }

  problem.startMs = performance.now();
}

function updateProgress() {
  const completed = getCompletedCount();
  const percent = (completed / TOTAL_PROBLEMS) * 100;

  answeredCount.textContent =
    completed === TOTAL_PROBLEMS
      ? "All problems answered"
      : `${completed} of ${TOTAL_PROBLEMS} answered`;
  progressBar.style.width = `${percent}%`;
  submitButton.disabled = completed !== TOTAL_PROBLEMS || submitted;
}

function showFeedbackImage(image, state) {
  const imageMap = {
    disappointed: {
      alt: "A duck looking slightly disappointed.",
      src: "assets/duck-disappointed.png",
    },
    distraught: {
      alt: "A duck looking distraught with tears.",
      src: "assets/duck-distraught.png",
    },
    happy: {
      alt: "A happy duck holding a pencil.",
      src: "assets/duck-happy.png",
    },
  };

  image.src = imageMap[state].src;
  image.alt = imageMap[state].alt;
  image.hidden = false;
}

function showNextProblem(index) {
  activeIndex = index + 1;

  if (activeIndex < problems.length) {
    const nextCard = quizForm.querySelector(`[data-index="${activeIndex}"]`);
    nextCard.hidden = false;
    nextCard.querySelector(".problem-status").textContent = "Current";
    startProblem(activeIndex);
    nextCard.querySelector(".answer-input").focus();
    nextCard.scrollIntoView({ behavior: "auto", block: "center" });
  } else {
    scoreMessage.textContent = "Ready to check.";
    submitButton.focus();
  }

  updateProgress();
}

function completeProblem(index) {
  if (submitted) {
    return;
  }

  const problem = problems[index];
  const card = quizForm.querySelector(`[data-index="${index}"]`);
  const input = card.querySelector(".answer-input");
  const status = card.querySelector(".problem-status");
  const feedback = card.querySelector(".feedback");
  const timeTaken = card.querySelector(".time-taken");
  const triesLeft = card.querySelector(".tries-left");
  const feedbackImage = card.querySelector(".feedback-image");
  const answer = normalizeAnswer(input.value);

  if (input.dataset.hasTyped !== "true" || answer === null) {
    feedback.textContent = "Type a whole number answer before pressing Tab.";
    input.focus();
    return;
  }

  problem.tries += 1;
  problem.studentAnswer = answer;

  if (answer !== problem.answer && problem.tries < 3) {
    const remaining = 3 - problem.tries;

    triesLeft.textContent = `Tries left: ${remaining}`;
    status.textContent = "Try again";
    feedback.textContent =
      remaining === 1 ? "Not quite. Last try." : "Not quite. Try again.";
    showFeedbackImage(feedbackImage, "disappointed");
    input.value = "";
    input.dataset.hasTyped = "false";
    input.focus();
    return;
  }

  problem.endMs = performance.now();
  problem.elapsedMs = problem.endMs - problem.startMs;
  problem.failedOut = answer !== problem.answer;
  problem.isComplete = true;

  input.disabled = true;
  card.classList.add("complete");
  status.textContent = problem.failedOut ? "Out of tries" : "Correct";
  feedback.textContent = problem.failedOut
    ? `Correct answer: ${problem.answer}`
    : "Correct. Keep going.";
  timeTaken.textContent = `Time: ${formatSeconds(problem.elapsedMs)}`;
  triesLeft.textContent = problem.failedOut ? "Tries used: 3" : `Tries used: ${problem.tries}`;
  showFeedbackImage(feedbackImage, problem.failedOut ? "distraught" : "happy");
  card.querySelector(".answer-button").disabled = true;

  showNextProblem(index);
}

function getTotalElapsedMs() {
  return problems.reduce((total, problem) => total + (problem.elapsedMs || 0), 0);
}

function scoreQuiz() {
  if (submitted || getCompletedCount() !== TOTAL_PROBLEMS) {
    return;
  }

  let correct = 0;

  getCards().forEach((card, index) => {
    const problem = problems[index];
    const status = card.querySelector(".problem-status");
    const feedback = card.querySelector(".feedback");
    const isCorrect = !problem.failedOut && problem.studentAnswer === problem.answer;

    card.classList.remove("complete", "correct", "incorrect");
    card.classList.add(isCorrect ? "correct" : "incorrect");
    status.textContent = isCorrect ? "Correct" : "Review";
    feedback.textContent = isCorrect
      ? `Correct in ${formatSeconds(problem.elapsedMs)} after ${problem.tries} ${problem.tries === 1 ? "try" : "tries"}.`
      : `Out of tries. Correct answer: ${problem.answer}`;

    if (isCorrect) {
      correct += 1;
    }
  });

  const percent = Math.round((correct / TOTAL_PROBLEMS) * 100);
  const totalTime = formatSeconds(getTotalElapsedMs());

  submitted = true;
  scoreValue.textContent = `${correct} / ${TOTAL_PROBLEMS}`;
  scoreMessage.textContent = `Total time: ${totalTime}`;
  resultTitle.textContent = correct >= 10 ? "Strong score." : "Good practice set.";
  resultText.textContent =
    correct === TOTAL_PROBLEMS
      ? `Perfect round: ${percent}% in ${totalTime}. Start a new set when you want another challenge.`
      : `You got ${correct} correct (${percent}%) in ${totalTime}. Review the marked cards, then try a fresh set.`;
  resultPanel.hidden = false;
  submitButton.disabled = true;
  submitButton.textContent = "Checked";
}

function startNewQuiz() {
  problems = generateProblems();
  submitted = false;
  activeIndex = 0;
  renderProblems();
  scoreValue.textContent = `0 / ${TOTAL_PROBLEMS}`;
  scoreMessage.textContent = "Ready when you are.";
  submitButton.disabled = true;
  submitButton.textContent = "Check answers";
  resultPanel.hidden = true;
  updateProgress();
  startProblem(0);
  quizForm.querySelector(".answer-input")?.focus();
}

quizForm.addEventListener("click", (event) => {
  const button = event.target.closest(".answer-button");

  if (!button) {
    return;
  }

  const card = button.closest(".problem-card");
  completeProblem(Number(card.dataset.index));
});

quizForm.addEventListener("input", (event) => {
  if (!event.target.matches(".answer-input")) {
    return;
  }

  event.target.dataset.hasTyped = event.target.value.trim() === "" ? "false" : "true";
});

quizForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (activeIndex < TOTAL_PROBLEMS) {
    completeProblem(activeIndex);
  }
});

quizForm.addEventListener("keydown", (event) => {
  if (!event.target.matches(".answer-input")) {
    return;
  }

  if (event.key === "Enter" || event.key === "Tab") {
    event.preventDefault();
    completeProblem(Number(event.target.closest(".problem-card").dataset.index));
  }
});

submitButton.addEventListener("click", scoreQuiz);
newQuizButton.addEventListener("click", startNewQuiz);
tryAgainButton.addEventListener("click", startNewQuiz);

startNewQuiz();
