/**
 * Spotter — prototype navigation & interactions
 * Profiles are generated forever (no fixed roster). Each connection keeps its own DM history in memory.
 */

// -----------------------------------------------------------------------------
// Data for procedural profiles (names & bio pieces—combine for variety)
// -----------------------------------------------------------------------------
const FIRST_MALE = [
  "James", "Michael", "David", "Chris", "Ryan", "Daniel", "Matt", "Alex", "Jordan", "Sam",
  "Tyler", "Brandon", "Eric", "Kevin", "Jason", "Marcus", "Devin", "Caleb", "Ethan", "Noah",
  "Logan", "Dylan", "Aiden", "Luke", "Nathan", "Josh", "Ben", "Adam", "Derek", "Carter",
  "Owen", "Sean", "Patrick", "Ravi", "Diego", "Malik", "Andre", "Isaiah", "Grant", "Hunter",
  "Blake", "Colin", "Eric", "Jared", "Kyle", "Peter", "Travis", "Wesley", "Zach", "Connor",
];

const FIRST_FEMALE = [
  "Emma", "Olivia", "Sophia", "Mia", "Ava", "Isabella", "Riley", "Taylor", "Casey", "Morgan",
  "Quinn", "Alex", "Jamie", "Dana", "Rachel", "Nina", "Priya", "Ashley", "Holly", "Zoe",
  "Lily", "Grace", "Chloe", "Anna", "Sara", "Kelly", "Jade", "Brooke", "Maya", "Elena",
  "Vanessa", "Tara", "Kim", "Amy", "Brianna", "Crystal", "Deanna", "Faith", "Hailey", "Ivy",
  "Jenna", "Kate", "Laura", "Melissa", "Nicole", "Paige", "Sierra", "Traci", "Yasmin", "Renee",
];

const LAST_INITIALS = "ABCDEFGHJKLMNPRSTVWYZ".split("");

const GOAL_KEYS = ["lose weight", "build muscle", "improve endurance", "stay consistent"];
const EXP_KEYS = ["beginner", "intermediate", "advanced"];
const WORKOUT_KEYS = ["gym", "home", "running", "mixed"];
const AVAIL_KEYS = ["mornings", "afternoons", "evenings", "flexible"];

const BIO_OPEN = [
  "I’m into realistic goals—nothing crash-course.",
  "The gym used to intimidate me; I go at my own pace now.",
  "I work weird hours sometimes, but I still try to move a few times a week.",
  "Home workouts, gym, or a walk—I’m not picky as long as we check in.",
  "I like accountability without the guilt trips.",
  "Still figuring some of this out, and that’s okay.",
  "Small wins matter more than perfect weeks, in my book.",
  "If life gets busy, we reset—no drama.",
];

const BIO_MID = [
  "Looking for someone who texts honest updates, not highlight reels.",
  "Happy to share what’s worked for me without acting like an expert.",
  "I’ll cheer for showing up tired, not just crushing PRs.",
  "I prefer short sessions I can actually finish.",
  "Rest days are part of the plan, not failure.",
  "I care more about habits than six-packs.",
  "We can laugh at the awkward gym moments together.",
];

const BIO_CLOSE = [
  "Say hi if that vibe fits you.",
  "Hope we can keep each other steady.",
  "Here for kindness and consistency.",
  "Let’s make this low-pressure and fun.",
  "Rooting for you already.",
];

const FAKE_PARTNER_REPLIES = [
  "Love that. I’m right here with you.",
  "Yes—that’s the energy. One step at a time.",
  "Ha, same. We’ve totally got this.",
  "I’m proud of you for saying it out loud.",
  "That’s real. Thanks for trusting me with that.",
  "Solid. Want to pick a tiny goal for tomorrow?",
  "Noted. No judgment ever—just teamwork.",
  "Thanks for texting. That already counts.",
  "Feel you. Want to shrink the plan a bit?",
  "Heard. I’m cheering from the sidelines.",
];

// -----------------------------------------------------------------------------
// Session state (in-memory only)
// -----------------------------------------------------------------------------
const session = {
  user: {
    name: "",
    goal: "",
    experience: "",
    workoutType: "",
    availability: "",
    seeking: "",
    newToFitness: false,
    /** Max search radius (miles), 1–20 from preferences slider */
    maxDistanceMiles: 10,
    minAge: 18,
    maxAge: 50,
  },
  privacy: {
    showDistance: true,
    showAge: true,
    matchedOnly: true,
    pausedDiscover: false,
  },
  blockedPartnerIds: [],
  reportedPartnerIds: [],
  activePartner: null,
  workoutsThisWeek: 2,
  weeklyGoal: 4,
  streakDays: 3,
  accountabilityScore: 82,
  rescheduleIndex: 0,
  swipeDeck: [],
  dmThreads: [],
  /** partner id -> [{ from: 'user' | O'partner', text }] */
  chatMessagesByPartner: {},
  /** Monotonic id suffix for generated profiles */
  profileSerial: 0,
  profilePage: 1,
  editingProfile: false,
};

/** How many generated cards to keep ready in Discover */
const SWIPE_DECK_TARGET = 16;

// -----------------------------------------------------------------------------
// DOM references
// -----------------------------------------------------------------------------
const els = {
  progressFill: document.getElementById("progress-fill"),
  progressTrack: document.getElementById("progress-track"),
  stepLabel: document.getElementById("step-label"),
  flowHeader: document.querySelector(".flow-header"),
  screens: {
    welcome: document.getElementById("screen-welcome"),
    preferences: document.getElementById("screen-preferences"),
    main: document.getElementById("screen-main"),
    chat: document.getElementById("screen-chat"),
    progress: document.getElementById("screen-progress"),
  },
  form: document.getElementById("prefs-form"),
  chatLog: document.getElementById("chat-log"),
  chatInput: document.getElementById("chat-input"),
  nextWorkoutText: document.getElementById("next-workout-text"),
  statStreak: document.getElementById("stat-streak"),
  statWorkouts: document.getElementById("stat-workouts"),
  statScore: document.getElementById("stat-score"),
  progressSummary: document.getElementById("progress-summary"),
  encouragementMsg: document.getElementById("encouragement-msg"),
  panelSwipe: document.getElementById("panel-swipe"),
  panelMessages: document.getElementById("panel-messages"),
  panelProfile: document.getElementById("panel-profile"),
  swipeCard: document.getElementById("swipe-card"),
  swipeStage: document.getElementById("swipe-stage"),
  swipeEmpty: document.getElementById("swipe-empty"),
  swipeHelper: document.getElementById("swipe-helper"),
  dmList: document.getElementById("dm-list"),
  dmEmpty: document.getElementById("dm-empty"),
  tabSwipeBtn: document.getElementById("tab-swipe-btn"),
  tabMessagesBtn: document.getElementById("tab-messages-btn"),
  tabProfileBtn: document.getElementById("tab-profile-btn"),
  tabBadge: document.getElementById("tab-badge"),
  darkModeToggle: document.getElementById("dark-mode-toggle"),
  privacyDistanceToggle: document.getElementById("privacy-distance-toggle"),
  privacyAgeToggle: document.getElementById("privacy-age-toggle"),
  privacyMatchesToggle: document.getElementById("privacy-matches-toggle"),
  privacyPauseToggle: document.getElementById("privacy-pause-toggle"),
  privacyStatus: document.getElementById("privacy-status"),
  safetyFeedback: document.getElementById("safety-feedback"),
};

// -----------------------------------------------------------------------------
// Random & generation
// -----------------------------------------------------------------------------
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildBio() {
  return `${pick(BIO_OPEN)} ${pick(BIO_MID)} ${pick(BIO_CLOSE)}`;
}

function buildAvatarDataUrl(initials, gender) {
  const bg = gender === "female" ? "#d4ebe6" : "#b8dfd5";
  const fg = "#2d7a6e";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="260" viewBox="0 0 420 260">
    <rect width="420" height="260" fill="${bg}"/>
    <circle cx="210" cy="96" r="48" fill="${fg}" opacity="0.28"/>
    <path d="M118 232c12-60 54-92 92-92s80 32 92 92" fill="${fg}" opacity="0.32"/>
    <text x="210" y="112" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="800" fill="${fg}">${initials}</text>
  </svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Random distance in miles, between 0.5 and cap (cap max 20). */
function randomDistanceWithinCap(maxMi) {
  const cap = Math.max(1, Math.min(20, Number(maxMi) || 20));
  const lo = 0.5;
  const hi = cap;
  const v = lo + Math.random() * (hi - lo);
  return Math.round(v * 10) / 10;
}

/** Human-readable “X mi away” for UI. */
function formatMilesAway(miles) {
  if (miles == null || Number.isNaN(Number(miles))) return "— mi away";
  const m = Number(miles);
  const shown = Number.isInteger(m) ? String(m) : m.toFixed(1);
  return `${shown} mi away`;
}

/**
 * New random person respecting “who you want to pair with.”
 * Every call returns a unique id so history never collides.
 */
function generateProfile() {
  const seeking = session.user.seeking || "both";
  let gender;
  if (seeking === "male") gender = "male";
  else if (seeking === "female") gender = "female";
  else gender = Math.random() < 0.5 ? "male" : "female";

  const firstPool = gender === "male" ? FIRST_MALE : FIRST_FEMALE;
  const first = pick(firstPool);
  const lastL = pick(LAST_INITIALS);
  const displayName = `${first} ${lastL}.`;
  const initials = (first.charAt(0) + lastL).toUpperCase();

  session.profileSerial += 1;
  const id = `spotter-${session.profileSerial}-${Date.now().toString(36)}`;

  return {
    id,
    displayName,
    initials,
    gender,
    age: randomInt(Math.min(session.user.minAge, session.user.maxAge), Math.max(session.user.minAge, session.user.maxAge)),
    goal: pick(GOAL_KEYS),
    experience: pick(EXP_KEYS),
    workoutType: pick(WORKOUT_KEYS),
    availability: pick(AVAIL_KEYS),
    bio: buildBio(),
    distanceMiles: randomDistanceWithinCap(session.user.maxDistanceMiles),
    avatarUrl: buildAvatarDataUrl(initials, gender),
  };
}

function topUpSwipeDeck() {
  while (session.swipeDeck.length < SWIPE_DECK_TARGET) {
    session.swipeDeck.push(generateProfile());
  }
}

// -----------------------------------------------------------------------------
// Screen navigation
// -----------------------------------------------------------------------------
function showScreen(screenKey) {
  const stepMap = {
    welcome: 1,
    preferences: 2,
    main: 3,
    chat: 4,
    progress: 5,
  };
  const step = stepMap[screenKey] || 1;
  const pct = (step / 5) * 100;

  Object.entries(els.screens).forEach(([key, el]) => {
    if (!el) return;
    if (key === screenKey) {
      el.removeAttribute("hidden");
      el.classList.add("screen--active");
    } else {
      el.setAttribute("hidden", "");
      el.classList.remove("screen--active");
    }
  });

  if (els.flowHeader) {
    if (screenKey === "main") {
      els.flowHeader.classList.add("flow-header--hub");
    } else {
      els.flowHeader.classList.remove("flow-header--hub");
    }
  }

  if (els.progressFill) els.progressFill.style.width = `${pct}%`;
  if (els.stepLabel) {
    els.stepLabel.textContent = screenKey === "main" ? "Home" : `${step} / 5`;
  }
  if (els.progressTrack) {
    els.progressTrack.setAttribute("aria-valuenow", String(step));
    els.progressTrack.setAttribute(
      "aria-valuetext",
      screenKey === "main"
        ? "Home: Discover and Messages"
        : `Step ${step} of 5: ${titleCase(screenKey)}`,
    );
  }
}

function titleCase(key) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function displayGoalLabel(goal) {
  if (!goal) return "";
  return goal
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function displayWorkoutLabel(w) {
  const labels = {
    gym: "Gym",
    home: "Home workouts",
    running: "Running / Cardio",
    mixed: "Mixed",
  };
  return labels[w] || w;
}

function displayExperience(e) {
  if (!e) return "";
  return e.charAt(0).toUpperCase() + e.slice(1);
}

function displayAvailability(a) {
  if (!a) return "";
  return a.charAt(0).toUpperCase() + a.slice(1);
}

// -----------------------------------------------------------------------------
// Main app tabs: Discover vs Messages
// -----------------------------------------------------------------------------
function selectMainTab(tab) {
  const isSwipe = tab === "swipe";
  const isMessages = tab === "messages";
  const isProfile = tab === "profile";

  if (els.panelSwipe) {
    els.panelSwipe.hidden = !isSwipe;
    els.panelSwipe.classList.toggle("main-panel--active", isSwipe);
  }
  if (els.panelMessages) {
    els.panelMessages.hidden = !isMessages;
    els.panelMessages.classList.toggle("main-panel--active", isMessages);
  }
  if (els.panelProfile) {
    els.panelProfile.hidden = !isProfile;
    els.panelProfile.classList.toggle("main-panel--active", isProfile);
  }

  const buttons = [
    [els.tabSwipeBtn, isSwipe],
    [els.tabMessagesBtn, isMessages],
    [els.tabProfileBtn, isProfile],
  ];
  buttons.forEach(([btn, active]) => {
    if (!btn) return;
    btn.classList.toggle("tab-bar__btn--active", active);
    btn.setAttribute("aria-current", active ? "page" : "false");
  });

  if (isProfile) renderProfilePanel();
}

function renderProfilePanel() {
  const name = session.user.name || "Your name";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "YO";
  const profileName = document.getElementById("profile-name");
  const profileMeta = document.getElementById("profile-meta");
  const profileFilters = document.getElementById("profile-filters");
  const profileAvatar = document.getElementById("profile-avatar");
  if (profileName) profileName.textContent = name;
  if (profileMeta) {
    profileMeta.textContent = `${displayGoalLabel(session.user.goal)} · ${displayExperience(session.user.experience)} · ${displayAvailability(session.user.availability)}`;
  }
  if (profileFilters) {
    const seekLabel = session.user.seeking === "both" ? "Anyone" : session.user.seeking === "male" ? "Men" : "Women";
    const distText = session.privacy.showDistance ? `Within ${session.user.maxDistanceMiles} miles` : "Distance hidden";
    const ageText = session.privacy.showAge ? `Ages ${session.user.minAge}-${session.user.maxAge}` : "Age hidden";
    profileFilters.textContent = `Looking for: ${seekLabel} · ${ageText} · ${distText}`;
  }
  if (profileAvatar) profileAvatar.textContent = initials;
  syncPrivacyControls();
}

function syncPrivacyControls() {
  if (els.privacyDistanceToggle) els.privacyDistanceToggle.checked = session.privacy.showDistance;
  if (els.privacyAgeToggle) els.privacyAgeToggle.checked = session.privacy.showAge;
  if (els.privacyMatchesToggle) els.privacyMatchesToggle.checked = session.privacy.matchedOnly;
  if (els.privacyPauseToggle) els.privacyPauseToggle.checked = session.privacy.pausedDiscover;
  if (els.privacyStatus) {
    const parts = [];
    parts.push(session.privacy.showDistance ? "distance visible" : "distance hidden");
    parts.push(session.privacy.showAge ? "age visible" : "age hidden");
    parts.push(session.privacy.matchedOnly ? "matched-only messages" : "open messages");
    if (session.privacy.pausedDiscover) parts.push("profile paused");
    els.privacyStatus.textContent = `Current privacy: ${parts.join(" · ")}.`;
  }
}

function readPrivacyControls() {
  if (els.privacyDistanceToggle) session.privacy.showDistance = els.privacyDistanceToggle.checked;
  if (els.privacyAgeToggle) session.privacy.showAge = els.privacyAgeToggle.checked;
  if (els.privacyMatchesToggle) session.privacy.matchedOnly = els.privacyMatchesToggle.checked;
  if (els.privacyPauseToggle) session.privacy.pausedDiscover = els.privacyPauseToggle.checked;
  syncPrivacyControls();
  renderProfilePanel();
}

// -----------------------------------------------------------------------------
// Swipe deck (Discover tab)
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// Swipe deck (Discover tab)
// -----------------------------------------------------------------------------
const SWIPE_THRESHOLD = 95;
let swipePointerId = null;
let swipeDrag = { startX: 0, startY: 0, active: false, target: null };

function initSwipeDeck() {
  session.swipeDeck = [];
  topUpSwipeDeck();
  renderSwipeCard();
}

function fillSwipeCardEl(profile) {
  const avatar = document.getElementById("swipe-card-avatar");
  avatar.textContent = profile.initials;
  avatar.style.backgroundImage = profile.avatarUrl || "";
  avatar.dataset.photo = profile.avatarUrl ? "true" : "false";
  document.getElementById("swipe-card-name").textContent = profile.displayName;
  document.getElementById("swipe-card-age").textContent = String(profile.age);
  const tags = `${displayExperience(profile.experience)} · ${displayAvailability(profile.availability)} · ${displayWorkoutLabel(profile.workoutType)}`;
  document.getElementById("swipe-card-tags").textContent = tags;
  document.getElementById("swipe-card-bio").textContent = profile.bio;
  const distEl = document.getElementById("swipe-card-distance");
  if (distEl) distEl.textContent = formatMilesAway(profile.distanceMiles);
}

function setSwipeStamps(dx) {
  const pass = document.getElementById("swipe-stamp-pass");
  const conn = document.getElementById("swipe-stamp-connect");
  if (!pass || !conn || !els.swipeCard) return;

  const showPass = dx < -40;
  const showConn = dx > 40;
  const passOpacity = showPass ? Math.min(1, Math.abs(dx) / 120) : 0;
  const connOpacity = showConn ? Math.min(1, dx / 120) : 0;

  pass.style.opacity = passOpacity;
  conn.style.opacity = connOpacity;

  els.swipeCard.classList.toggle("swipe-card--preview-pass", showPass);
  els.swipeCard.classList.toggle("swipe-card--preview-connect", showConn);
}

function applySwipeTransform(dx, rotationFactor) {
  if (!els.swipeCard) return;
  const rot = rotationFactor * 0.08;
  els.swipeCard.style.transform = `translateX(${dx}px) rotate(${rot}deg)`;
}

function resetSwipeCardVisual() {
  if (!els.swipeCard) return;
  els.swipeCard.style.transform = "";
  els.swipeCard.classList.remove(
    "swipe-card--fly-left",
    "swipe-card--fly-right",
    "swipe-card--preview-pass",
    "swipe-card--preview-connect",
  );
  setSwipeStamps(0);
}

function renderSwipeCard() {
  resetSwipeCardVisual();
  topUpSwipeDeck();
  const hasCards = session.swipeDeck.length > 0;
  if (els.swipeStage) els.swipeStage.hidden = !hasCards;
  if (els.swipeEmpty) els.swipeEmpty.hidden = hasCards;
  if (els.swipeHelper) els.swipeHelper.hidden = !hasCards;
  if (!hasCards || !els.swipeCard) return;
  fillSwipeCardEl(session.swipeDeck[0]);
}

function completeSwipe(direction) {
  if (!session.swipeDeck.length || !els.swipeCard) return;
  const profile = session.swipeDeck.shift();
  if (direction === "right") {
    upsertDmThread(profile, "You teamed up—tap to chat", false);
  }

  const isConnect = direction === "right";
  els.swipeCard.classList.toggle("swipe-card--preview-connect", isConnect);
  els.swipeCard.classList.toggle("swipe-card--preview-pass", !isConnect);
  setSwipeStamps(isConnect ? 120 : -120);

  window.setTimeout(() => {
    els.swipeCard.classList.add(isConnect ? "swipe-card--fly-right" : "swipe-card--fly-left");
  }, 180);

  window.setTimeout(() => {
    els.swipeCard.classList.remove(
      "swipe-card--fly-right",
      "swipe-card--fly-left",
      "swipe-card--preview-pass",
      "swipe-card--preview-connect",
    );
    topUpSwipeDeck();
    renderSwipeCard();
  }, 520);
}

function onSwipePointerDown(e) {
  if (!session.swipeDeck.length) return;
  if (e.button !== undefined && e.button !== 0) return;
  if (e.target.closest("button, input, select, textarea, a")) return;
  swipeDrag.active = true;
  swipeDrag.startX = e.clientX;
  swipeDrag.startY = e.clientY;
  swipeDrag.target = e.currentTarget;
  swipePointerId = e.pointerId;
  if (swipeDrag.target && swipeDrag.target.setPointerCapture) {
    swipeDrag.target.setPointerCapture(e.pointerId);
  }
}

function onSwipePointerMove(e) {
  if (!swipeDrag.active || e.pointerId !== swipePointerId) return;
  const dx = e.clientX - swipeDrag.startX;
  applySwipeTransform(dx, dx);
  setSwipeStamps(dx);
}

function onSwipePointerUp(e) {
  if (!swipeDrag.active || e.pointerId !== swipePointerId) return;
  swipeDrag.active = false;
  try {
    if (swipeDrag.target && swipeDrag.target.releasePointerCapture) {
      swipeDrag.target.releasePointerCapture(swipePointerId);
    }
  } catch {
    /* ignore */
  }
  swipePointerId = null;
  swipeDrag.target = null;
  const dx = e.clientX - swipeDrag.startX;
  if (dx > SWIPE_THRESHOLD) {
    completeSwipe("right");
  } else if (dx < -SWIPE_THRESHOLD) {
    completeSwipe("left");
  } else {
    resetSwipeCardVisual();
  }
}

function bindSwipeGestures() {
  const swipeSurface = els.panelSwipe || els.swipeStage || els.swipeCard;
  if (!swipeSurface) return;
  swipeSurface.addEventListener("pointerdown", onSwipePointerDown);
  swipeSurface.addEventListener("pointermove", onSwipePointerMove);
  swipeSurface.addEventListener("pointerup", onSwipePointerUp);
  swipeSurface.addEventListener("pointercancel", onSwipePointerUp);
}

// -----------------------------------------------------------------------------
// DM threads & list
// -----------------------------------------------------------------------------
function upsertDmThread(profile, lastMessage, unread) {
  const idx = session.dmThreads.findIndex((t) => t.profile.id === profile.id);
  if (idx >= 0) {
    session.dmThreads.splice(idx, 1);
  }
  session.dmThreads.unshift({
    profile,
    lastMessage,
    time: "Just now",
    unread: !!unread,
  });
  renderDmList();
  updateTabBadge();
}

function updateTabBadge() {
  const n = session.dmThreads.filter((t) => t.unread).length;
  if (!els.tabBadge) return;
  if (n > 0) {
    els.tabBadge.hidden = false;
    els.tabBadge.textContent = String(n);
  } else {
    els.tabBadge.hidden = true;
  }
}

function renderDmList() {
  if (!els.dmList || !els.dmEmpty) return;
  els.dmList.innerHTML = "";
  if (session.dmThreads.length === 0) {
    els.dmEmpty.hidden = false;
    return;
  }
  els.dmEmpty.hidden = true;
  session.dmThreads.filter((thread) => !session.blockedPartnerIds.includes(thread.profile.id)).forEach((thread) => {
    const li = document.createElement("li");
    li.className = "dm-row" + (thread.unread ? " dm-row--unread" : "");

    const av = document.createElement("div");
    av.className = "dm-row__avatar";
    av.setAttribute("aria-hidden", "true");
    av.textContent = thread.profile.initials;

    const body = document.createElement("div");
    body.className = "dm-row__body";
    const top = document.createElement("div");
    top.className = "dm-row__top";
    const nameEl = document.createElement("span");
    nameEl.className = "dm-row__name";
    nameEl.textContent = thread.profile.displayName;
    const timeEl = document.createElement("span");
    timeEl.className = "dm-row__time";
    timeEl.textContent = thread.time;
    top.appendChild(nameEl);
    top.appendChild(timeEl);
    const dist = document.createElement("p");
    dist.className = "dm-row__distance";
    dist.textContent = formatMilesAway(thread.profile.distanceMiles);
    const prev = document.createElement("p");
    prev.className = "dm-row__preview";
    prev.textContent = thread.lastMessage;
    body.appendChild(top);
    body.appendChild(dist);
    body.appendChild(prev);
    li.appendChild(av);
    li.appendChild(body);
    li.addEventListener("click", () => openChatWith(thread.profile));
    els.dmList.appendChild(li);
  });
}

function enterMainApp() {
  session.dmThreads = [];
  session.chatMessagesByPartner = {};
  session.blockedPartnerIds = [];
  session.reportedPartnerIds = [];
  session.profileSerial = 0;
  session.profilePage = 1;
  session.swipeDeck = [];
  initSwipeDeck();
  renderDmList();
  updateTabBadge();
  selectMainTab("swipe");
  showScreen("main");
}

// -----------------------------------------------------------------------------
// Form validation
// -----------------------------------------------------------------------------
function clearFieldErrors() {
  ["name", "goal", "experience", "workout", "availability", "seeking", "age"].forEach((suffix) => {
    const err = document.getElementById(`error-${suffix === "workout" ? "workout" : suffix}`);
    if (err) err.textContent = "";
  });
}

function validatePrefsForm() {
  clearFieldErrors();
  let ok = true;
  const name = document.getElementById("user-name").value.trim();
  const goal = document.getElementById("goal").value;
  const experience = document.getElementById("experience").value;
  const workout = document.getElementById("workout-type").value;
  const availability = document.getElementById("availability").value;
  const seeking = document.getElementById("seeking").value;
  const minAge = Number(document.getElementById("min-age").value);
  const maxAge = Number(document.getElementById("max-age").value);

  if (name.length < 2) {
    document.getElementById("error-name").textContent = "Please enter at least 2 characters.";
    ok = false;
  }
  if (!goal) {
    document.getElementById("error-goal").textContent = "Choose a goal so we can help.";
    ok = false;
  }
  if (!experience) {
    document.getElementById("error-experience").textContent = "Select the level that feels closest.";
    ok = false;
  }
  if (!workout) {
    document.getElementById("error-workout").textContent = "Let us know where you like to move.";
    ok = false;
  }
  if (!availability) {
    document.getElementById("error-availability").textContent = "When works best on most weeks?";
    ok = false;
  }
  if (!seeking) {
    document.getElementById("error-seeking").textContent = "Pick who you’d like to be paired with.";
    ok = false;
  }
  if (minAge > maxAge) {
    document.getElementById("error-age").textContent = "Minimum age cannot be higher than maximum age.";
    ok = false;
  }

  return ok;
}

function readFormIntoSession() {
  session.user.name = document.getElementById("user-name").value.trim();
  session.user.goal = document.getElementById("goal").value;
  session.user.experience = document.getElementById("experience").value;
  session.user.workoutType = document.getElementById("workout-type").value;
  session.user.availability = document.getElementById("availability").value;
  session.user.seeking = document.getElementById("seeking").value;
  session.user.minAge = Number(document.getElementById("min-age").value) || 18;
  session.user.maxAge = Number(document.getElementById("max-age").value) || 40;
  session.user.newToFitness = document.getElementById("new-to-fitnessToggle").checked;
  const distEl = document.getElementById("max-distance");
  const raw = distEl ? parseInt(distEl.value, 10) : 10;
  session.user.maxDistanceMiles = Math.max(1, Math.min(20, Number.isFinite(raw) ? raw : 10));
}

// -----------------------------------------------------------------------------
// Chat: stored messages per partner + UI
// -----------------------------------------------------------------------------
function partnerDisplayName() {
  return session.activePartner ? session.activePartner.displayName : "Your partner";
}

function getPartnerMessages(profileId) {
  if (!session.chatMessagesByPartner[profileId]) {
    session.chatMessagesByPartner[profileId] = [];
  }
  return session.chatMessagesByPartner[profileId];
}

function syncThreadPreview(profileId, lastRaw) {
  const preview = lastRaw.length > 96 ? lastRaw.slice(0, 93) + "…" : lastRaw;
  const idx = session.dmThreads.findIndex((x) => x.profile.id === profileId);
  if (idx === -1) return;
  const t = session.dmThreads[idx];
  t.lastMessage = preview;
  t.time = "Just now";
  if (idx > 0) {
    session.dmThreads.splice(idx, 1);
    session.dmThreads.unshift(t);
  }
  renderDmList();
  updateTabBadge();
}

function addBubbleToDom(text, from, partnerDisplay) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble chat-bubble--${from}`;
  bubble.textContent = text;
  const meta = document.createElement("div");
  meta.className = "chat-meta";
  meta.textContent = from === "partner" ? partnerDisplay : "You";
  els.chatLog.appendChild(bubble);
  els.chatLog.appendChild(meta);
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

/** Append one message: save + paint + refresh DM preview line */
function appendChatBubble(text, from) {
  if (!session.activePartner) return;
  const profile = session.activePartner;
  const pid = profile.id;
  getPartnerMessages(pid).push({ from, text });
  addBubbleToDom(text, from, profile.displayName);
  syncThreadPreview(pid, text);
}

function paintChatHistory(profile) {
  els.chatLog.innerHTML = "";
  getPartnerMessages(profile.id).forEach(({ from, text }) => {
    addBubbleToDom(text, from, profile.displayName);
  });
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function seedInitialChatForPartner(profile) {
  const userFirst = session.user.name ? session.user.name.split(" ")[0] : "there";
  const partnerFirst = profile.displayName.split(" ")[0];
  const lines = [
    {
      from: "partner",
      text: `Hey ${userFirst}! Glad you matched—I’m ${partnerFirst}. I’m here for low-pressure accountability.`,
    },
    {
      from: "user",
      text: "Thanks! Trying to stay consistent without burning out.",
    },
    {
      from: "partner",
      text: "That’s the sweet spot. Want to pick one tiny check-in this week—like a text after you move?",
    },
  ];
  const store = getPartnerMessages(profile.id);
  store.length = 0;
  lines.forEach(({ from, text }) => store.push({ from, text }));
  paintChatHistory(profile);
  syncThreadPreview(profile.id, lines[lines.length - 1].text);
}

function updateChatHeader() {
  const p = session.activePartner;
  if (!p) return;
  document.getElementById("chat-partner-name").textContent = p.displayName;
  document.getElementById("chat-partner-initials").textContent = p.initials;
  const distHd = document.getElementById("chat-partner-distance");
  if (distHd) distHd.textContent = formatMilesAway(p.distanceMiles);
}

function openChatWith(profile) {
  session.activePartner = profile;
  updateChatHeader();
  const thread = session.dmThreads.find((t) => t.profile.id === profile.id);
  if (thread) thread.unread = false;
  renderDmList();
  updateTabBadge();

  if (getPartnerMessages(profile.id).length === 0) {
    seedInitialChatForPartner(profile);
  } else {
    paintChatHistory(profile);
  }

  if (els.chatInput) {
    els.chatInput.value = "";
  }
  showScreen("chat");
}

/** After you send a solo message, partner “types back” (demo). */
function scheduleFakePartnerReply(partnerId) {
  const delay = 650 + Math.random() * 1100;
  window.setTimeout(() => {
    if (!session.activePartner || session.activePartner.id !== partnerId) return;
    appendChatBubble(pick(FAKE_PARTNER_REPLIES), "partner");
  }, delay);
}

// -----------------------------------------------------------------------------
// Safety: report and block
// -----------------------------------------------------------------------------
function reportActivePartner() {
  if (!session.activePartner) return;
  const id = session.activePartner.id;
  if (!session.reportedPartnerIds.includes(id)) session.reportedPartnerIds.push(id);
  if (els.safetyFeedback) {
    els.safetyFeedback.textContent = `${session.activePartner.displayName} was reported in this demo. A real app would send this to moderation review.`;
  }
}

function blockActivePartner() {
  if (!session.activePartner) return;
  const blocked = session.activePartner;
  if (!session.blockedPartnerIds.includes(blocked.id)) session.blockedPartnerIds.push(blocked.id);
  session.dmThreads = session.dmThreads.filter((thread) => thread.profile.id !== blocked.id);
  delete session.chatMessagesByPartner[blocked.id];
  renderDmList();
  updateTabBadge();
  session.activePartner = null;
  showScreen("main");
  selectMainTab("messages");
  if (els.dmEmpty) {
    els.dmEmpty.hidden = session.dmThreads.length > 0;
  }
}

// -----------------------------------------------------------------------------
// Quick actions: motivation & reschedule
// -----------------------------------------------------------------------------
const MOTIVATION_LINES = [
  "You’ve already done the brave part by showing up today. One small step is enough.",
  "Remember: consistency beats intensity. I’m proud of you for staying in the conversation.",
  "It’s okay if today feels heavy. We can shrink the plan—something gentle still counts.",
  "Progress isn’t linear. If you miss a workout, we simply pick the next doable moment.",
  "You don’t need to prove anything to anyone here. I’m on your side.",
];

const RESCHEDULE_OPTIONS = [
  "Easy 20-minute mobility · Day after tomorrow 6:15 PM",
  "Walk or light jog 15 minutes · This Saturday 9:00 AM",
  "Home bodyweight circuit (two rounds) · Tomorrow lunch break",
  "Recovery stretch playlist · Tonight 8:00 PM—only if you feel up for it",
];

function randomMotivation() {
  return MOTIVATION_LINES[Math.floor(Math.random() * MOTIVATION_LINES.length)];
}

// -----------------------------------------------------------------------------
// Progress screen
// -----------------------------------------------------------------------------
function syncProgressUI() {
  els.statStreak.textContent = `${session.streakDays} day${session.streakDays === 1 ? "" : "s"}`;
  els.statWorkouts.textContent = `${session.workoutsThisWeek} / ${session.weeklyGoal}`;
  els.statScore.textContent = `${session.accountabilityScore}%`;

  const name = session.user.name ? session.user.name.split(" ")[0] : "You";
  els.progressSummary.textContent = `${name}, you’ve checked in regularly with ${partnerDisplayName()}. That steady rhythm builds trust—and habits.`;

  if (session.workoutsThisWeek >= session.weeklyGoal) {
    els.encouragementMsg.textContent =
      "You hit your weekly target in this demo. In real life, we’d celebrate—and set a kind plan for next week.";
  } else if (session.workoutsThisWeek <= 1) {
    els.encouragementMsg.textContent =
      "Early days are the hardest. Be gentle with yourself; showing up here is already momentum.";
  } else {
    els.encouragementMsg.textContent =
      "You’re in a healthy middle zone—keep leaning on small wins. They add up faster than it feels.";
  }
}

// -----------------------------------------------------------------------------
// Profile editing and preference controls
// -----------------------------------------------------------------------------
function populateFormFromSession() {
  const mappings = [
    ["user-name", session.user.name],
    ["goal", session.user.goal],
    ["experience", session.user.experience],
    ["workout-type", session.user.workoutType],
    ["availability", session.user.availability],
    ["seeking", session.user.seeking],
    ["min-age", session.user.minAge],
    ["max-age", session.user.maxAge],
    ["max-distance", session.user.maxDistanceMiles],
  ];
  mappings.forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) el.value = String(value);
  });
  const newbie = document.getElementById("new-to-fitnessToggle");
  if (newbie) newbie.checked = !!session.user.newToFitness;
  syncRangeControls();
}

function syncRangeControls() {
  const minAge = document.getElementById("min-age");
  const maxAge = document.getElementById("max-age");
  const ageOut = document.getElementById("age-range-value");
  if (minAge && maxAge && ageOut) {
    let min = Number(minAge.value);
    let max = Number(maxAge.value);
    if (min > max) {
      if (document.activeElement === minAge) maxAge.value = String(min);
      else minAge.value = String(max);
      min = Number(minAge.value);
      max = Number(maxAge.value);
    }
    ageOut.textContent = `${min}–${max}`;
    minAge.setAttribute("aria-valuenow", String(min));
    maxAge.setAttribute("aria-valuenow", String(max));
  }

  const distSlider = document.getElementById("max-distance");
  const distOut = document.getElementById("distance-value");
  if (distSlider && distOut) {
    distOut.textContent = distSlider.value;
    distSlider.setAttribute("aria-valuenow", distSlider.value);
  }
}

// -----------------------------------------------------------------------------
// Event bindings
// -----------------------------------------------------------------------------
function bindEvents() {
  ["max-distance", "min-age", "max-age"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", syncRangeControls);
  });
  syncRangeControls();

  document.getElementById("btn-get-started").addEventListener("click", () => {
    session.editingProfile = false;
    const submitBtn = document.getElementById("btn-find-match");
    if (submitBtn) submitBtn.textContent = "Start discovering";
    showScreen("preferences");
  });

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validatePrefsForm()) return;
    readFormIntoSession();
    if (session.editingProfile) {
      session.swipeDeck = [];
      topUpSwipeDeck();
      renderSwipeCard();
      renderProfilePanel();
      selectMainTab("profile");
      showScreen("main");
      session.editingProfile = false;
      const submitBtn = document.getElementById("btn-find-match");
      if (submitBtn) submitBtn.textContent = "Start discovering";
    } else {
      enterMainApp();
    }
  });

  if (els.tabSwipeBtn) els.tabSwipeBtn.addEventListener("click", () => selectMainTab("swipe"));
  if (els.tabMessagesBtn) els.tabMessagesBtn.addEventListener("click", () => selectMainTab("messages"));
  if (els.tabProfileBtn) els.tabProfileBtn.addEventListener("click", () => selectMainTab("profile"));
  const btnEditProfile = document.getElementById("btn-edit-profile");
  if (btnEditProfile) btnEditProfile.addEventListener("click", () => {
    session.editingProfile = true;
    populateFormFromSession();
    const submitBtn = document.getElementById("btn-find-match");
    if (submitBtn) submitBtn.textContent = "Save profile changes";
    showScreen("preferences");
  });
  if (els.darkModeToggle) {
    els.darkModeToggle.addEventListener("change", () => {
      document.body.classList.toggle("dark-mode", els.darkModeToggle.checked);
    });
  }

  [els.privacyDistanceToggle, els.privacyAgeToggle, els.privacyMatchesToggle, els.privacyPauseToggle].forEach((toggle) => {
    if (toggle) toggle.addEventListener("change", readPrivacyControls);
  });
  syncPrivacyControls();


  document.getElementById("btn-swipe-pass").addEventListener("click", () => {
    if (session.swipeDeck.length) completeSwipe("left");
  });
  document.getElementById("btn-swipe-connect").addEventListener("click", () => {
    if (session.swipeDeck.length) completeSwipe("right");
  });
  document.getElementById("btn-swipe-reset").addEventListener("click", () => {
    session.profilePage += 1;
    session.swipeDeck = [];
    topUpSwipeDeck();
    renderSwipeCard();
  });

  document.getElementById("btn-chat-back").addEventListener("click", () => {
    showScreen("main");
    selectMainTab("messages");
  });

  function sendTypedMessage() {
    if (!els.chatInput || !session.activePartner) return;
    const text = els.chatInput.value.trim();
    if (!text) return;
    appendChatBubble(text, "user");
    els.chatInput.value = "";
    scheduleFakePartnerReply(session.activePartner.id);
  }

  const btnSend = document.getElementById("btn-chat-send");
  if (btnSend) {
    btnSend.addEventListener("click", sendTypedMessage);
  }
  if (els.chatInput) {
    els.chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendTypedMessage();
      }
    });
  }

  document.getElementById("btn-worked-out").addEventListener("click", () => {
    appendChatBubble("I got my workout in today ✅", "user");
    appendChatBubble("Love that! That’s real follow-through. How did your body feel afterward?", "partner");
    if (session.workoutsThisWeek < session.weeklyGoal) {
      session.workoutsThisWeek += 1;
    }
    if (session.workoutsThisWeek >= 3) {
      session.streakDays = Math.min(session.streakDays + 1, 7);
    }
    session.accountabilityScore = Math.min(99, session.accountabilityScore + 2);
  });

  document.getElementById("btn-motivation").addEventListener("click", () => {
    appendChatBubble("Could use a little pep talk—having a slow day.", "user");
    appendChatBubble(randomMotivation(), "partner");
  });

  document.getElementById("btn-reschedule").addEventListener("click", () => {
    session.rescheduleIndex =
      (session.rescheduleIndex + 1) % RESCHEDULE_OPTIONS.length;
    const next = RESCHEDULE_OPTIONS[session.rescheduleIndex];
    els.nextWorkoutText.textContent = next;
    appendChatBubble("I might need to move our plan—is that okay?", "user");
    appendChatBubble(
      "Of course. Life happens. Let’s use this updated time—no stress, we’ll text a quick check-in before.",
      "partner",
    );
  });

  const btnReportUser = document.getElementById("btn-report-user");
  if (btnReportUser) btnReportUser.addEventListener("click", reportActivePartner);

  const btnBlockUser = document.getElementById("btn-block-user");
  if (btnBlockUser) btnBlockUser.addEventListener("click", blockActivePartner);

  document.getElementById("btn-to-progress").addEventListener("click", () => {
    syncProgressUI();
    showScreen("progress");
  });

  document.getElementById("btn-back-chat").addEventListener("click", () => {
    showScreen("chat");
  });

  document.getElementById("btn-restart").addEventListener("click", () => {
    session.user = {
      name: "",
      goal: "",
      experience: "",
      workoutType: "",
      availability: "",
      seeking: "",
      newToFitness: false,
      maxDistanceMiles: 10,
      minAge: 18,
      maxAge: 50,
    };
    session.privacy = { showDistance: true, showAge: true, matchedOnly: true, pausedDiscover: false };
    session.blockedPartnerIds = [];
    session.reportedPartnerIds = [];
    session.activePartner = null;
    session.swipeDeck = [];
    session.dmThreads = [];
    session.chatMessagesByPartner = {};
    session.profileSerial = 0;
    session.profilePage = 1;
    session.workoutsThisWeek = 2;
    session.weeklyGoal = 4;
    session.streakDays = 3;
    session.accountabilityScore = 82;
    session.rescheduleIndex = 0;
    els.form.reset();
    clearFieldErrors();
    syncRangeControls();
    els.nextWorkoutText.textContent =
      "Light 25-minute walk or stretch · Tomorrow 7:30 AM";
    showScreen("welcome");
  });

  bindSwipeGestures();
}

// -----------------------------------------------------------------------------
// Init
// -----------------------------------------------------------------------------
function init() {
  bindEvents();
  showScreen("welcome");
}

init();
