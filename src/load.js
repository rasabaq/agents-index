// Loads the dataset once for the whole page: data/meta.json, then one file per category.
// hero.js, app.js, sections.js and charts.js all await this same promise (a module runs once per page).
// If a file still fails after one retry, the hero says so with a Reload button, and styles.css (.no-data)
// hides every part of the page drawn from the data.
const get = (name) => fetch(`data/${name}.json`).then((r) => {
  if (!r.ok) throw new Error(`data/${name}.json: ${r.status}`);
  return r.json();
});
// One retry, after a short pause, rides out a dropped connection.
const getOrRetry = (name) => get(name).catch(() => new Promise((ok) => setTimeout(ok, 500)).then(() => get(name)));

export const data = (async () => {
  const meta = await getOrRetry('meta');
  return { meta, categories: await Promise.all(meta.categories.map((c) => getOrRetry(c.id))) };
})();

data.catch((err) => {
  console.error(err);
  // Only someone running the site on their own machine needs the file name and the dev hint.
  const dev = ['localhost', '127.0.0.1'].includes(location.hostname);
  const note = document.createElement('p');
  note.className = 'load-note';
  note.setAttribute('role', 'alert');
  note.innerHTML = dev
    ? `Could not load <code>${err.message.replace(/[&<>]/g, '')}</code>. Serve the folder over HTTP, for example with <code>npm start</code>.`
    : 'The data did not load. Check your connection, then try again.';
  const reload = document.createElement('button');
  reload.type = 'button';
  reload.className = 'hero-btn hero-btn-1';
  reload.textContent = 'Reload';
  reload.addEventListener('click', () => location.reload());
  document.querySelector('.hero-ctas').replaceChildren(note, reload);
  document.documentElement.classList.add('no-data');
});
