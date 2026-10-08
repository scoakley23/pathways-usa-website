// "Try a question": reads a civics question aloud and checks a spoken (or typed) answer.
// Uses the browser's built-in speech features; falls back to text where they're missing.
(() => {
  const root = document.getElementById("demo");
  if (!root) return;

  // From the official USCIS civics test. `accept` lists alternatives; an answer is
  // correct when it contains every word of any one alternative.
  const QUESTIONS = [
    {
      q: "What is the supreme law of the land?",
      answer: "The Constitution",
      accept: [["constitution"]],
      why: "The Constitution sets up the government and protects basic rights. No law can go against it.",
    },
    {
      q: "What is the capital of the United States?",
      answer: "Washington, D.C.",
      accept: [["washington"], ["district of columbia"]],
      why: "Washington, D.C. is home to the White House, Congress, and the Supreme Court.",
    },
    {
      q: "How many U.S. senators are there?",
      answer: "One hundred (100)",
      accept: [["100"], ["hundred"]],
      why: "Each of the 50 states elects two senators, so there are 100 in total.",
    },
    {
      q: "We elect a U.S. senator for how many years?",
      answer: "Six (6)",
      accept: [["6"], ["six"]],
      why: "Senators serve six-year terms. About one-third of the Senate is elected every two years.",
    },
    {
      q: "What is the name of the national anthem?",
      answer: "The Star-Spangled Banner",
      accept: [["star spangled"], ["star spangle"]],
      why: "Francis Scott Key wrote the words in 1814, during the War of 1812.",
    },
    {
      q: "Who was the first President?",
      answer: "George Washington",
      accept: [["washington"]],
      why: "George Washington served as the first President, from 1789 to 1797.",
    },
    {
      q: "What ocean is on the East Coast of the United States?",
      answer: "The Atlantic Ocean",
      accept: [["atlantic"]],
      why: "The Atlantic Ocean runs along the East Coast, from Maine to Florida.",
    },
    {
      q: "What ocean is on the West Coast of the United States?",
      answer: "The Pacific Ocean",
      accept: [["pacific"]],
      why: "The Pacific Ocean runs along the West Coast, from Washington State to California.",
    },
    {
      q: "When do we celebrate Independence Day?",
      answer: "July 4",
      accept: [["july", "4"], ["july", "4th"], ["july", "fourth"]],
      why: "The Declaration of Independence was adopted on July 4, 1776.",
    },
    {
      q: "How many amendments does the Constitution have?",
      answer: "Twenty-seven (27)",
      accept: [["27"], ["twenty seven"]],
      why: "The Constitution has 27 amendments. The first ten are called the Bill of Rights.",
    },
    {
      q: "What are the two major political parties in the United States?",
      answer: "Democratic and Republican",
      accept: [["democratic", "republican"], ["democrat", "republican"], ["democrats", "republicans"]],
      why: "The Democratic and Republican parties are the two largest political parties in the U.S.",
    },
    {
      q: "Who is in charge of the executive branch?",
      answer: "The President",
      accept: [["president"]],
      why: "The President leads the executive branch, which carries out the nation's laws.",
    },
  ];

  const $ = (id) => document.getElementById(id);
  const playBtn = $("demo-play");
  const playLabel = $("demo-play-label");
  const qText = $("demo-q");
  const showBtn = $("demo-show");
  const answerBox = $("demo-answer");
  const micBtn = $("demo-mic");
  const micLabel = $("demo-mic-label");
  const heard = $("demo-heard");
  const typeForm = $("demo-type");
  const typeInput = $("demo-input");
  const result = $("demo-result");

  const synth = window.speechSynthesis;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Shuffle once so each visitor sees a different order.
  const order = QUESTIONS.map((_, i) => i).sort(() => Math.random() - 0.5);
  let pos = 0;
  let answered = 0;
  let correct = 0;
  let recognizer = null;
  let listening = false;
  let done = false;

  const current = () => QUESTIONS[order[pos % order.length]];

  function normalize(text) {
    return text
      .toLowerCase()
      .replace(/['’.]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function isCorrect(text) {
    const padded = ` ${normalize(text)} `;
    return current().accept.some((words) => words.every((w) => padded.includes(` ${w} `)));
  }

  function speak() {
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(current().q);
    u.lang = "en-US";
    u.rate = 0.9;
    const voice = synth.getVoices().find((v) => v.lang === "en-US");
    if (voice) u.voice = voice;
    u.onstart = () => { playBtn.classList.add("playing"); playLabel.textContent = "Listening to the question…"; };
    u.onend = u.onerror = () => { playBtn.classList.remove("playing"); playLabel.textContent = "Play the question again"; };
    synth.speak(u);
  }

  function showQuestionText() {
    qText.hidden = false;
    showBtn.hidden = true;
  }

  function setListening(on) {
    listening = on;
    micBtn.classList.toggle("listening", on);
    micBtn.setAttribute("aria-label", on ? "Stop listening" : "Answer out loud");
    micLabel.textContent = on ? "Listening… say your answer" : "Tap and answer out loud";
  }

  function check(text, typed = false) {
    if (done || !text.trim()) return;
    done = true;
    if (recognizer && listening) recognizer.abort();
    setListening(false);
    synth && synth.cancel();

    const ok = isCorrect(text);
    answered += 1;
    if (ok) correct += 1;
    const q = current();

    heard.hidden = false;
    heard.textContent = `${typed ? "Your answer" : "You said"}: “${text.trim()}”`;
    answerBox.classList.add("answered");
    result.hidden = false;
    result.className = `demo-result ${ok ? "ok" : "miss"}`;
    $("demo-result-title").textContent = ok ? "✓ Correct!" : `Not quite. The answer is: ${q.answer}`;
    $("demo-result-text").textContent = q.why;
    $("demo-score").textContent = `${correct} of ${answered} correct`;
    showQuestionText();
    $("demo-next").focus({ preventScroll: true });
  }

  function load() {
    done = false;
    const q = current();
    $("demo-num").textContent = String(pos + 1);
    qText.textContent = q.q;
    heard.hidden = true;
    result.hidden = true;
    answerBox.classList.remove("answered");
    typeInput.value = "";
    if (synth) {
      qText.hidden = true;
      showBtn.hidden = false;
      playLabel.textContent = "Listen to the question";
    } else {
      showQuestionText();
    }
  }

  // Without speech output, show the question as text instead of a play button.
  if (!synth) {
    playBtn.hidden = true;
  } else {
    playBtn.addEventListener("click", speak);
    synth.getVoices(); // starts loading voices in some browsers
  }
  showBtn.addEventListener("click", showQuestionText);

  if (Recognition) {
    micBtn.addEventListener("click", () => {
      if (done) return;
      if (listening) { recognizer.stop(); return; }
      synth && synth.cancel();
      recognizer = new Recognition();
      recognizer.lang = "en-US";
      recognizer.interimResults = true;
      recognizer.maxAlternatives = 3;
      recognizer.onresult = (event) => {
        const res = event.results[event.results.length - 1];
        heard.hidden = false;
        heard.textContent = `You said: “${res[0].transcript.trim()}”`;
        if (!res.isFinal) return;
        // Accept the answer if any of the recognizer's guesses is correct.
        const alts = Array.from(res, (alt) => alt.transcript);
        check(alts.find((t) => isCorrect(t)) || alts[0]);
      };
      recognizer.onerror = (event) => {
        setListening(false);
        micLabel.textContent =
          event.error === "not-allowed" || event.error === "service-not-allowed"
            ? "Microphone is blocked. Type your answer below instead."
            : event.error === "no-speech"
              ? "Didn't hear anything. Tap to try again."
              : "Couldn't hear that. Tap to try again, or type below.";
      };
      recognizer.onend = () => { if (listening) setListening(false); };
      try {
        recognizer.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    });
  } else {
    micBtn.hidden = true;
    micLabel.textContent = "Voice answers aren't supported in this browser (try Chrome or Safari). Type your answer instead:";
    typeInput.placeholder = "Type your answer";
  }

  typeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    check(typeInput.value, true);
  });

  $("demo-next").addEventListener("click", () => {
    pos += 1;
    load();
    if (synth) speak();
  });

  load();
})();
