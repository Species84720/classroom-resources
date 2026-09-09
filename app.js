const state = { resources: [] };
const els = {
  search: document.querySelector('#search'),
  year: document.querySelector('#year'),
  subject: document.querySelector('#subject'),
  clear: document.querySelector('#clear'),
  resources: document.querySelector('#resources'),
  status: document.querySelector('#status')
};

const normalise = value => String(value ?? '').toLocaleLowerCase('en-GB');

function searchableText(r) {
  return normalise([
    r.title, r.description, r.year_group, r.learning_intent, r.resource_type, r.language,
    ...(r.subjects || []), ...(r.topics || []), ...(r.themes || []), ...(r.labels || [])
  ].join(' '));
}

function unique(field) {
  return [...new Set(state.resources.flatMap(r => r[field] || []))].sort((a,b) => a.localeCompare(b, 'en-GB'));
}

function fillSelect(select, values) {
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
}

function render() {
  const q = normalise(els.search.value.trim());
  const year = els.year.value;
  const subject = els.subject.value;

  const shown = state.resources.filter(r => {
    if (q && !searchableText(r).includes(q)) return false;
    if (year && r.year_group !== year) return false;
    if (subject && !(r.subjects || []).includes(subject)) return false;
    return true;
  });

  els.resources.replaceChildren();
  for (const r of shown) {
    const article = document.createElement('article');
    article.className = 'card';

    const h = document.createElement('h2');
    h.textContent = r.title;

    const description = document.createElement('p');
    description.textContent = r.description;

    const intent = document.createElement('p');
    intent.className = 'meta';
    intent.textContent = `Learning: ${r.learning_intent}`;

    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = `${r.year_group} · ${(r.subjects || []).join(', ')} · about ${r.estimated_minutes} min`;

    const tags = document.createElement('div');
    tags.className = 'tags';
    const tagValues = [...(r.topics || []), ...(r.themes || []), ...(r.labels || [])].slice(0, 8);
    for (const value of tagValues) {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = value;
      tags.append(span);
    }

    const link = document.createElement('a');
    link.href = r.url;
    link.textContent = 'Open resource';
    link.setAttribute('aria-label', `Open ${r.title}`);

    article.append(h, description, intent, meta, tags, link);
    els.resources.append(article);
  }

  els.status.textContent = `${shown.length} resource${shown.length === 1 ? '' : 's'} found`;
}

async function init() {
  try {
    const response = await fetch('resources.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Catalogue could not be loaded');
    state.resources = await response.json();

    const years = [...new Set(state.resources.map(r => r.year_group))].sort((a,b) => a.localeCompare(b, 'en-GB', {numeric:true}));
    fillSelect(els.year, years);
    fillSelect(els.subject, unique('subjects'));
    render();
  } catch (err) {
    els.status.textContent = 'The resource catalogue could not be loaded.';
    console.error(err);
  }
}

for (const el of [els.search, els.year, els.subject]) el.addEventListener('input', render);
els.clear.addEventListener('click', () => {
  els.search.value = '';
  els.year.value = '';
  els.subject.value = '';
  render();
  els.search.focus();
});
init();
