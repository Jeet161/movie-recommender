// ============================================
// REEL MATCH — frontend logic
// Talks to the Flask API: /api/genres, /api/recommend, /api/favorites
// ============================================

const ratingSlider = document.getElementById("rating-slider");
const ratingValue = document.getElementById("rating-value");
const recommendBtn = document.getElementById("recommend-btn");
const resultsGrid = document.getElementById("results-grid");
const resultsMeta = document.getElementById("results-meta");
const emptyState = document.getElementById("empty-state");
const favoritesGrid = document.getElementById("favorites-grid");
const favoritesEmpty = document.getElementById("favorites-empty");
const favCountBadge = document.getElementById("fav-count");
const tabButtons = document.querySelectorAll(".tab-btn");
const views = document.querySelectorAll(".view");

let favoriteIds = new Set();
let selectedGenre = "Any";
let selectedDecade = "Any";

// ---------- Custom dropdown controller ----------
function setupCustomSelect({ wrapperId, triggerId, panelId, onChange }) {
  const wrapper = document.getElementById(wrapperId);
  const trigger = document.getElementById(triggerId);
  const panel = document.getElementById(panelId);
  const valueLabel = trigger.querySelector(".custom-select-value");

  function close() {
    wrapper.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  }

  function open() {
    document.querySelectorAll(".custom-select.open").forEach((el) => {
      if (el !== wrapper) el.classList.remove("open");
    });
    wrapper.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    wrapper.classList.contains("open") ? close() : open();
  });

  panel.addEventListener("click", (e) => {
    const option = e.target.closest(".custom-select-option");
    if (!option) return;

    panel.querySelectorAll(".custom-select-option").forEach((opt) => {
      opt.classList.remove("selected");
      opt.setAttribute("aria-selected", "false");
    });
    option.classList.add("selected");
    option.setAttribute("aria-selected", "true");
    valueLabel.textContent = option.textContent;

    close();
    onChange(option.dataset.value);
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  return {
    setOptions(items) {
      panel.innerHTML = "";
      items.forEach(({ value, label, selected }) => {
        const li = document.createElement("li");
        li.className = "custom-select-option" + (selected ? " selected" : "");
        li.dataset.value = value;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", selected ? "true" : "false");
        li.textContent = label;
        panel.appendChild(li);
      });
    },
  };
}

const genreDropdown = setupCustomSelect({
  wrapperId: "genre-custom-select",
  triggerId: "genre-trigger",
  panelId: "genre-panel",
  onChange: (value) => { selectedGenre = value; },
});

const decadeDropdown = setupCustomSelect({
  wrapperId: "decade-custom-select",
  triggerId: "decade-trigger",
  panelId: "decade-panel",
  onChange: (value) => { selectedDecade = value; },
});

// ---------- Tab switching ----------
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.tab;
    views.forEach((v) => v.classList.toggle("active", v.id === target));
    if (target === "favorites") {
      loadFavorites();
    }
  });
});

// ---------- Rating slider live label ----------
ratingSlider.addEventListener("input", () => {
  ratingValue.textContent = parseFloat(ratingSlider.value).toFixed(1);
});

// ---------- Load genres into dropdown ----------
async function loadGenres() {
  try {
    const res = await fetch("/api/genres");
    const genres = await res.json();
    const items = [{ value: "Any", label: "Any genre", selected: true }].concat(
      genres.map((g) => ({ value: g, label: g, selected: false }))
    );
    genreDropdown.setOptions(items);
  } catch (err) {
    console.error("Failed to load genres:", err);
  }
}

// ---------- Build a ticket-stub card for a movie ----------
function buildStub(movie, options = {}) {
  const { showScore = false, isFavoritesView = false } = options;
  const isSaved = favoriteIds.has(movie.id);

  const stub = document.createElement("div");
  stub.className = "stub";

  const scoreBar = showScore && typeof movie.score === "number"
    ? `<div class="match-bar"><div class="match-bar-fill" style="width:${Math.max(0, Math.min(100, movie.score))}%"></div></div>`
    : "";

  stub.innerHTML = `
    <div class="stub-main">
      <span class="stub-genre">${movie.genre}</span>
      <h3 class="stub-title">${movie.title}</h3>
      <p class="stub-meta">${movie.year} · dir. ${movie.director}</p>
      <div class="stub-score-row">
        <span class="stub-rating">${movie.rating.toFixed(1)}</span>
        <span class="stub-rating-label">IMDb-style rating</span>
      </div>
      ${scoreBar}
    </div>
    <div class="stub-perf"></div>
    <div class="stub-stub-section">
      <span class="stub-admit">ADMIT ONE</span>
      ${
        isFavoritesView
          ? `<button class="remove-btn" data-id="${movie.id}">Remove</button>`
          : `<button class="save-btn ${isSaved ? "saved" : ""}" data-id="${movie.id}">${isSaved ? "Saved ✓" : "Save"}</button>`
      }
    </div>
  `;

  return stub;
}

// ---------- Fetch recommendations ----------
async function getRecommendations() {
  const preferences = {
    genre: selectedGenre,
    min_rating: parseFloat(ratingSlider.value),
    decade: selectedDecade,
  };

  recommendBtn.disabled = true;
  recommendBtn.querySelector("span").textContent = "Rolling film...";

  try {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences),
    });
    const movies = await res.json();

    resultsGrid.innerHTML = "";

    if (movies.length === 0) {
      emptyState.style.display = "block";
      resultsMeta.textContent = "";
    } else {
      emptyState.style.display = "none";
      resultsMeta.textContent = `${movies.length} film${movies.length === 1 ? "" : "s"} matched your picks`;
      movies.forEach((movie) => {
        resultsGrid.appendChild(buildStub(movie, { showScore: true }));
      });
    }
  } catch (err) {
    console.error("Failed to fetch recommendations:", err);
    resultsMeta.textContent = "Something went wrong fetching recommendations.";
  } finally {
    recommendBtn.disabled = false;
    recommendBtn.querySelector("span").textContent = "Get Recommendations";
  }
}

recommendBtn.addEventListener("click", getRecommendations);

// ---------- Favorites ----------
async function loadFavorites() {
  try {
    const res = await fetch("/api/favorites");
    const favorites = await res.json();

    favoriteIds = new Set(favorites.map((m) => m.id));
    favCountBadge.textContent = favorites.length;

    favoritesGrid.innerHTML = "";
    if (favorites.length === 0) {
      favoritesEmpty.style.display = "block";
    } else {
      favoritesEmpty.style.display = "none";
      favorites.forEach((movie) => {
        favoritesGrid.appendChild(buildStub(movie, { isFavoritesView: true }));
      });
    }
  } catch (err) {
    console.error("Failed to load favorites:", err);
  }
}

async function addFavorite(movieId) {
  try {
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: movieId }),
    });
    const favorites = await res.json();
    favoriteIds = new Set(favorites.map((m) => m.id));
    favCountBadge.textContent = favorites.length;
  } catch (err) {
    console.error("Failed to save favorite:", err);
  }
}

async function removeFavorite(movieId) {
  try {
    const res = await fetch(`/api/favorites/${movieId}`, { method: "DELETE" });
    const favorites = await res.json();
    favoriteIds = new Set(favorites.map((m) => m.id));
    favCountBadge.textContent = favorites.length;
    loadFavorites();
  } catch (err) {
    console.error("Failed to remove favorite:", err);
  }
}

// ---------- Event delegation for save/remove buttons ----------
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("save-btn")) {
    const id = parseInt(e.target.dataset.id, 10);
    addFavorite(id).then(() => {
      e.target.textContent = "Saved ✓";
      e.target.classList.add("saved");
    });
  }
  if (e.target.classList.contains("remove-btn")) {
    const id = parseInt(e.target.dataset.id, 10);
    removeFavorite(id);
  }
});

// ---------- Init ----------
loadGenres();
loadFavorites();