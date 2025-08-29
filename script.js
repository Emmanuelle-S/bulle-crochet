/* ============================
   Bulle Crochet — script.js
   ============================ */

/* ————— Helpers de base ————— */

// Année dans le footer
(() => {
  const y = document.querySelectorAll("#year");
  y.forEach(el => el.textContent = new Date().getFullYear());
})();

// Charger un JSON (articles/patterns)
async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Impossible de charger ${path}`);
  return await res.json();
}

// Récupérer un paramètre d’URL
function getParam(name) {
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

// Normaliser (pour comparer sans accents/majuscules)
function normalize(str = "") {
  return str.toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Charger un fragment HTML (contenu d’article)
async function fetchContentFragment(slug) {
  if (!slug) return null;
  const url = `content/articles/${encodeURIComponent(slug)}.html`;
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// Ouvrir tous les <details> dans un conteneur donné
function openAllDetails(root) {
  (root || document).querySelectorAll("details").forEach(d => (d.open = true));
}

/* ————— Rendu des cartes ————— */

function toCard(item) {
  // Lien cible : page de détail si on a un slug
  const href = item.slug
    ? `article.html?slug=${encodeURIComponent(item.slug)}`
    : `#`;

  const imgSrc =
    item.image ||
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="; // 1×1 transparent
  const imgAlt = item.alt || item.title || "Illustration";
  const tags  = (item.tags || []).map(t => `<span class="tag">${t}</span>`).join("");

  const meta = `
    <div class="meta-row">
      ${item.level ? `<span class="meta-item" aria-label="Niveau">🧶 ${item.level}</span>` : ""}
      ${item.time  ? `<span class="meta-item" aria-label="Temps">⏱ ${item.time}</span>`  : ""}
      ${item.type  ? `<span class="meta-item" aria-label="Type">🏷 ${item.type}</span>`  : ""}
    </div>`;

  // Si pas de slug, on rend une <article> non cliquable (rare)
  if (!item.slug) {
    return `
      <article class="card" aria-label="${item.title}">
        <img class="thumb" src="${imgSrc}" alt="${imgAlt}"
             width="800" height="450" loading="lazy" decoding="async">
        <h3>${item.title}</h3>
        <p>${item.excerpt || ""}</p>
        ${meta}
        <div class="tags">${tags}</div>
      </article>`;
  }

  return `
    <a class="card" href="${href}" aria-label="${item.title}">
      <img class="thumb" src="${imgSrc}" alt="${imgAlt}"
           width="800" height="450" loading="lazy" decoding="async">
      <h3>${item.title}</h3>
      <p>${item.excerpt || ""}</p>
      ${meta}
      <div class="tags">${tags}</div>
    </a>`;
}

/* ————— Hydratation Accueil ————— */

async function hydrateHome() {
  const ha = document.querySelector("#home-articles");
  const hp = document.querySelector("#home-patrons");
  if (!ha && !hp) return;

  try {
    const [articles, patrons] = await Promise.all([
      loadJSON("data/articles.json"),
      loadJSON("data/patterns.json")
    ]);

    if (ha) ha.innerHTML = articles.slice(0, 6).map(toCard).join("");
    if (hp) hp.innerHTML = patrons.slice(0, 6).map(toCard).join("");
  } catch (e) {
    console.warn(e);
  }
}

/* ————— Hydratation des listes (pages Articles / Patrons) ————— */

async function hydrateLists() {
  // Liste Articles
  const la = document.querySelector("#list-articles");
  if (la) {
    try {
      const items = await loadJSON("data/articles.json");
      const input = document.querySelector("#search-articles");
      const render = arr => { la.innerHTML = arr.map(toCard).join(""); };

      render(items);
      input?.addEventListener("input", () => {
        const q = normalize(input.value);
        render(items.filter(it =>
          normalize(it.title + " " + (it.tags || []).join(" ")).includes(q)
        ));
      });
    } catch (e) {
      console.warn(e);
    }
  }

  // Liste Patrons
  const lp = document.querySelector("#list-patrons");
  if (lp) {
    try {
      const items = await loadJSON("data/patterns.json");
      const input = document.querySelector("#search-patrons");
      const render = arr => { lp.innerHTML = arr.map(toCard).join(""); };

      render(items);
      input?.addEventListener("input", () => {
        const q = normalize(input.value);
        render(items.filter(it =>
          normalize(it.title + " " + (it.tags || []).join(" ")).includes(q)
        ));
      });
    } catch (e) {
      console.warn(e);
    }
  }
}

/* ————— Page de détail (article.html) ————— */

async function hydrateArticle() {
  const container = document.querySelector("#article");
  if (!container) return;

  try {
    // Charger toutes les données (articles + patrons)
    const [articles, patterns] = await Promise.all([
      loadJSON("data/articles.json"),
      loadJSON("data/patterns.json")
    ]);
    const all = [...articles, ...patterns];

    // Trouver l’item à partir du slug de l’URL
    const slug = getParam("slug");
    const item = all.find(it => normalize(it.slug) === normalize(slug));

    if (!item) {
      container.innerHTML = `
        <section class="section">
          <h1>Oups… contenu introuvable</h1>
          <p><a class="btn ghost" href="articles.html">← Retour aux articles</a></p>
        </section>`;
      return;
    }

    // Charger le fragment HTML (/content/articles/<slug>.html)
    let contentHTML = await fetchContentFragment(item.slug);
    if (!contentHTML) {
      // fallback : petit contenu par défaut
      contentHTML = `<p>${item.excerpt || ""}</p>`;
    }

    // Injection dans le template
    container.innerHTML = `
      <article class="post">
        ${ (item.cover || item.image) ? `
          <img class="post-cover"
               src="${item.cover || item.image}"
               alt="${item.alt || item.title || ""}"
               width="1600" height="900"
               loading="eager" decoding="async">` : ``}
        <h1>${item.title}</h1>
        <div class="meta-row">
          ${item.level ? `<span class="meta-item">🧶 ${item.level}</span>` : ""}
          ${item.time  ? `<span class="meta-item">⏱ ${item.time}</span>`  : ""}
          ${item.type  ? `<span class="meta-item">🏷 ${item.type}</span>`  : ""}
        </div>

        <div class="prose">
          ${contentHTML}
        </div>

        <div class="tags">
          ${(item.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}
        </div>

        <p class="back">
          <a href="${item.type === "Patron" ? "patrons.html" : "articles.html"}">← Retour</a>
        </p>
      </article>
    `;

    // Ouvre tous les <details> du contenu injecté
    openAllDetails(container);

    // JSON-LD (SEO) minimal
    try {
      const ld = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": item.title,
        "description": item.excerpt || "",
        "image": (item.cover || item.image) ? [location.origin + "/" + (item.cover || item.image)] : [],
        "author": { "@type": "Person", "name": "Bulle Crochet" },
        "keywords": (item.tags || []).join(", ")
      };
      const ldScript = document.createElement("script");
      ldScript.type = "application/ld+json";
      ldScript.textContent = JSON.stringify(ld);
      document.head.appendChild(ldScript);
    } catch {}
  } catch (e) {
    console.warn(e);
  }
}

/* ————— Lancement ————— */

hydrateHome();
hydrateLists();
hydrateArticle();
