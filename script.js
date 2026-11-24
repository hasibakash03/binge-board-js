// Binge Board - plain JavaScript, TVMaze API, no framework.
// Sections: 1 Data and state, 2 localStorage, 3 API (async/await), 4 DOM rendering, 5 Events, 6 Start

/* ===== 1. Data and state ===== */
const API = 'https://api.tvmaze.com';
const GENRES = ['All', 'Drama', 'Comedy', 'Action', 'Crime', 'Science-Fiction', 'Thriller', 'Romance', 'Horror', 'Fantasy', 'Anime'];
const SORTS = [
  { key: 'rating', label: 'Top rated' },
  { key: 'newest', label: 'Newest' },
];

// Everything the page needs to remember lives in this one object
const state = {
  view: 'browse',   // 'browse' or 'watchlist'
  shows: [],        // shows loaded from the API (popular list or search results)
  genre: 'All',
  sort: 'rating',
  query: '',
  requestId: 0,     // used to ignore old answers when the user searches again quickly
  watchlist: loadWatchlist(),
};

// Pick the elements once, so we can use them everywhere
const $ = (selector) => document.querySelector(selector);
const grid = $('#grid');
const statusBox = $('#status');
const chipsBox = $('#chips');
const sortsBox = $('#sorts');
const details = $('#details');

/* ===== 2. localStorage (watchlist survives a refresh) ===== */
function loadWatchlist() {
  try {
    return JSON.parse(localStorage.getItem('watchlist')) || [];
  } catch (err) {
    return []; // saved data was broken, start empty
  }
}

function saveWatchlist() {
  localStorage.setItem('watchlist', JSON.stringify(state.watchlist));
}

function isSaved(show) {
  return state.watchlist.some((s) => s.id === show.id);
}

function toggleSave(show) {
  if (isSaved(show)) {
    state.watchlist = state.watchlist.filter((s) => s.id !== show.id); // remove
  } else {
    state.watchlist.push(show); // add
  }
  saveWatchlist();
  render();
}

/* ===== 3. API calls with fetch + async/await ===== */
// Turn a raw TVMaze show into a small object (this is what we also save in localStorage)
function toShow(item) {
  return {
    id: item.id,
    name: item.name,
    year: (item.premiered || '').slice(0, 4),
    rating: item.rating && item.rating.average ? item.rating.average : 0,
    poster: item.image ? item.image.medium : null,
    big: item.image ? item.image.original : null,
    genres: item.genres || [],
    status: item.status,
    network: item.network ? item.network.name : item.webChannel ? item.webChannel.name : '',
    summary: stripTags(item.summary || ''),
    link: item.officialSite || item.url,
  };
}

// TVMaze summaries contain HTML like <p><b>..</b></p>; we only want the text
function stripTags(html) {
  const box = document.createElement('div');
  box.innerHTML = html;
  return box.textContent;
}

// Ask the API. Throws an error if the network fails or the server answers badly.
async function getJSON(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error('Bad response: ' + res.status);
  return res.json();
}

// Load the popular list (no search) or the search results (with a search word)
async function loadShows() {
  const myRequest = ++state.requestId;
  showStatus('loading');
  try {
    let shows;
    if (state.query) {
      const results = await getJSON('/search/shows?q=' + encodeURIComponent(state.query));
      shows = results.map((r) => toShow(r.show)); // search results are wrapped: { score, show }
    } else {
      const results = await getJSON('/shows?page=0');
      shows = results.map(toShow);
    }
    if (myRequest !== state.requestId) return; // a newer request exists, drop this answer
    state.shows = shows;
    render();
  } catch (err) {
    if (myRequest !== state.requestId) return;
    state.shows = [];
    showStatus('error');
  }
}

/* ===== 4. DOM rendering ===== */
// Create an element in one line: tag, class, text
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

// Filter by genre, then sort. Returns the array to display.
function visibleShows() {
  const source = state.view === 'watchlist' ? state.watchlist : state.shows;
  const filtered = source.filter((s) => state.genre === 'All' || s.genres.includes(state.genre));
  if (state.view === 'watchlist') return filtered;
  if (state.sort === 'rating') filtered.sort((a, b) => b.rating - a.rating);
  else filtered.sort((a, b) => b.year.localeCompare(a.year)); // newest first
  return filtered.slice(0, 60); // show at most 60 cards so the page stays fast
}

function renderCard(show, index) {
  const card = el('article', 'card');
  card.style.animationDelay = Math.min(index, 10) * 50 + 'ms'; // cards fade in one after another
  card.dataset.id = show.id;

  const poster = el('div', 'poster');
  if (show.poster) {
    const img = el('img');
    img.src = show.poster;
    img.alt = show.name;
    img.loading = 'lazy';
    poster.append(img);
  } else {
    poster.append(el('div', 'no-poster', show.name));
  }
  if (show.rating > 0) poster.append(el('span', 'rating', '★ ' + show.rating.toFixed(1)));

  const heart = el('button', 'heart' + (isSaved(show) ? ' saved' : ''), isSaved(show) ? '♥' : '♡');
  heart.setAttribute('aria-label', isSaved(show) ? 'Remove from watchlist' : 'Save to watchlist');
  heart.dataset.action = 'heart';
  poster.append(heart);

  const info = el('div', 'card-info');
  info.append(el('h3', 'card-title', show.name));
  info.append(el('p', 'card-meta', (show.year || '—') + ' · ' + (show.genres[0] || 'TV')));

  card.append(poster, info);
  return card;
}

function render() {
  const watching = state.view === 'watchlist';
  const list = visibleShows();

  // Header tabs and badge
  $('#tab-browse').classList.toggle('active', !watching);
  $('#tab-watchlist').classList.toggle('active', watching);
  $('#badge').textContent = state.watchlist.length;

  // Controls only make sense while browsing; the genre chips work on both tabs
  $('#search-form').classList.toggle('hidden', watching);
  $('#sorts').parentElement.classList.toggle('hidden', watching);
  $('#page-title').classList.toggle('hidden', !watching);
  $('#page-title').textContent = 'My Watchlist (' + state.watchlist.length + ')';
  renderChips();
  renderSorts();

  // Cards
  grid.replaceChildren(...list.map(renderCard));

  // Empty states
  if (list.length === 0) {
    if (watching && state.watchlist.length === 0) showStatus('empty-watchlist');
    else showStatus('empty');
  } else {
    statusBox.replaceChildren();
  }
}

function renderChips() {
  chipsBox.replaceChildren(
    ...GENRES.map((g) => {
      const chip = el('button', 'chip' + (g === state.genre ? ' active' : ''), g);
      chip.dataset.genre = g;
      return chip;
    })
  );
}

function renderSorts() {
  sortsBox.replaceChildren(
    ...SORTS.map((s) => {
      const btn = el('button', 'toggle' + (s.key === state.sort ? ' active' : ''), s.label);
      btn.dataset.sort = s.key;
      return btn;
    })
  );
}

// One message box for loading, error and empty cases
function showStatus(kind) {
  const messages = {
    error: ['📡', "Couldn't reach TVMaze", 'Check your internet connection, then try again.', 'Retry'],
    empty: ['🎬', 'Nothing found', 'Try another search word or genre.'],
    'empty-watchlist': ['💔', 'Your watchlist is empty', 'Tap the heart on any show to save it here.', 'Browse'],
  };

  if (kind === 'loading') {
    // 10 grey shimmering placeholder cards
    grid.replaceChildren(...Array.from({ length: 10 }, () => el('div', 'skeleton')));
    statusBox.replaceChildren();
    return;
  }

  if (kind === 'error') grid.replaceChildren(); // remove the skeletons
  const [icon, title, text, button] = messages[kind];
  const box = el('div', 'status');
  box.append(el('div', 'status-icon', icon), el('h2', 'status-title', title), el('p', 'status-text', text));
  if (button) {
    const btn = el('button', 'btn', button);
    btn.id = 'status-action';
    btn.dataset.kind = kind;
    box.append(btn);
  }
  statusBox.replaceChildren(box);
}

// Details pop-up
function openDetails(show) {
  const inner = el('div', 'details-inner');
  const image = show.big || show.poster;
  if (image) {
    const img = el('img', 'details-img');
    img.src = image;
    img.alt = show.name;
    inner.append(img);
  }

  const body = el('div', 'details-body');
  const meta = ['★ ' + (show.rating ? show.rating.toFixed(1) : 'n/a'), show.year || '—', show.status, show.network]
    .filter(Boolean)
    .join(' · ');
  body.append(el('h2', '', show.name), el('p', 'details-meta', meta));
  if (show.genres.length) body.append(el('p', '', show.genres.join(', ')));
  body.append(el('p', '', show.summary || 'No description available.'));

  const actions = el('div', 'spotlight-actions');
  const saveBtn = el('button', 'btn primary', isSaved(show) ? '♥ Saved (click to remove)' : '♡ Save to watchlist');
  saveBtn.addEventListener('click', () => {
    toggleSave(show);
    saveBtn.textContent = isSaved(show) ? '♥ Saved (click to remove)' : '♡ Save to watchlist';
  });
  const closeBtn = el('button', 'btn', 'Close');
  closeBtn.addEventListener('click', () => details.close());
  actions.append(saveBtn, closeBtn);
  body.append(actions);

  inner.append(body);
  details.replaceChildren(inner);
  details.showModal();
}

/* ===== 5. Events ===== */
// Tabs
$('#tab-browse').addEventListener('click', () => {
  state.view = 'browse';
  render();
});
$('#tab-watchlist').addEventListener('click', () => {
  state.view = 'watchlist';
  render();
});

// Search: runs when the form is submitted, and also 500 ms after the user stops typing
$('#search-form').addEventListener('submit', (e) => {
  e.preventDefault(); // stop the page from reloading
  state.query = $('#search-input').value.trim();
  loadShows();
});
let typingTimer;
$('#search-input').addEventListener('input', (e) => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    state.query = e.target.value.trim();
    loadShows();
  }, 500);
});

// Genre chips and sort buttons: one listener on the parent handles all the buttons inside it
chipsBox.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-genre]');
  if (!chip) return;
  state.genre = chip.dataset.genre;
  render();
});
sortsBox.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-sort]');
  if (!btn) return;
  state.sort = btn.dataset.sort;
  render();
});

// Cards: the heart saves, anywhere else opens the details
grid.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const source = state.view === 'watchlist' ? state.watchlist : state.shows;
  const show = source.find((s) => s.id === Number(card.dataset.id));
  if (!show) return;
  if (e.target.closest('[data-action="heart"]')) toggleSave(show);
  else openDetails(show);
});

// Surprise me: open a random show from what is on screen
$('#surprise').addEventListener('click', () => {
  const list = visibleShows();
  if (list.length) openDetails(list[Math.floor(Math.random() * list.length)]);
});

// Retry / Browse button inside the message box
statusBox.addEventListener('click', (e) => {
  const btn = e.target.closest('#status-action');
  if (!btn) return;
  if (btn.dataset.kind === 'error') loadShows();
  else {
    state.view = 'browse';
    render();
  }
});

// Clicking the dark area outside the dialog closes it
details.addEventListener('click', (e) => {
  if (e.target === details) details.close();
});

/* ===== 6. Start ===== */
render();
loadShows();
