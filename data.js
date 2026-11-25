// The data, fetched once per page: meta.json, then every category file. app.js, hero.js and the charts all await
// this one promise, so each file is requested a single time. getJson fetches any other data file, such as
// adoption.json on the countries page.
export const getJson = (name) => fetch(`data/${name}.json`).then((r) => {
  if (!r.ok) throw new Error(`data/${name}.json: ${r.status}`);
  return r.json();
});

export const data = getJson('meta').then(async (meta) => ({ meta, categories: await Promise.all(meta.categories.map((c) => getJson(c.id))) }));
