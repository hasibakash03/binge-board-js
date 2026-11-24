# Binge Board (plain HTML, CSS, JavaScript)

A Netflix-style dark web app to find TV shows and keep a personal watchlist.
Course: CSE-2340 Software Development I, Mini Project 3-4. Author: Hasib Akash, IIUC.
No framework, no build step, no npm. Data comes from the free [TVMaze API](https://www.tvmaze.com/api) (no key needed).

## Features
- Popular shows load when the page opens (`/shows`).
- Search any show by name (`/search/shows?q=`), on button click or after you stop typing.
- Genre filter (Drama, Comedy, Action...) and sort (Top rated / Newest).
- Click a card to see details: poster, rating, year, network, genres, summary.
- Heart button saves a show to **My Watchlist**; it stays after a page refresh.
- "Surprise me" opens a random show from the list on screen.
- Loading skeleton, error message with Retry button, and empty states.

## How to run
1. Open the folder and double-click `index.html`. It needs an internet connection for the API.
2. That is all. (Optional: `python -m http.server` in this folder, then open http://localhost:8000.)

## Files
| File | What it does |
|---|---|
| `index.html` | Page structure: header, search, chips, grid, details dialog |
| `style.css` | Dark Netflix look, card hover and fade effects, mobile layout |
| `script.js` | All the logic (sections 1 to 6, each marked by a comment) |

## Rubric map (where to find each item)
| Rubric item (marks) | Where in `script.js` |
|---|---|
| DOM manipulation and dynamic rendering (4) | Section 4: `el()` helper, `renderCard()`, `render()`, `renderChips()`, `showStatus()`, `openDetails()`. Uses `querySelector`, `createElement`, `append`, `replaceChildren`, `classList.toggle`, `dataset`. |
| Events and JS logic (3) | Section 5: `addEventListener` for tabs, search `submit` and `input`, chips, sort, card click, heart, Surprise me, Retry. Logic in `visibleShows()` (`filter`, `sort`, `slice`), `toggleSave()` (`filter`, `push`), `isSaved()` (`some`), card click (`find`), `render()` (`map`), `toShow()` (`map` over API results), `GENRES.map` and `SORTS.map`. |
| API and async (4) | Section 3: `getJSON()` and `loadShows()` use `fetch` with `async/await` and `try/catch`. States: loading skeleton, error + Retry, empty ("Nothing found") in `showStatus()`. A request counter ignores outdated answers. |
| localStorage (3) | Section 2: `loadWatchlist()` (`getItem` + `JSON.parse`), `saveWatchlist()` (`setItem` + `JSON.stringify`), `toggleSave()` add/remove. Badge count and My Watchlist tab read the saved list on load. |

## Notes
- Only the first 60 matching shows are drawn, to keep the page fast.
- If saved data in localStorage is broken, the app starts with an empty watchlist instead of crashing.
