// Helper: année dans le footer
const y = document.querySelectorAll("#year");
y.forEach((el) => (el.textContent = new Date().getFullYear()));

// Chargement des données
async function loadJSON(path) {
  const res = await fetch(path);
  return await res.json();
}

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire accents
    .replace(/[^a-z0-9]+/g, "-") // espaces -> -
    .replace(/(^-|-$)/g, ""); // bords propres
}

function getParam(name) {
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

async function hydrateArticle() {
  const container = document.querySelector("#article");
  if (!container) return;

  const slug = getParam("slug");

  let articles = [],
    patterns = [];
  try {
    [articles, patterns] = await Promise.all([
      loadJSON("data/articles.json"),
      loadJSON("data/patterns.json"),
    ]);
  } catch (e) {
    container.innerHTML = `<p>Impossible de charger les données.</p>`;
    return;
  }

  const item = [...articles, ...patterns].find(
    (it) => slugify(it.title) === slug
  );

  if (!item) {
    container.innerHTML = `
      <p>Oups… contenu introuvable.</p>
      <p><a class="btn ghost" href="articles.html">← Retour aux articles</a></p>`;
    return;
  }

  // --- SEO par page
  document.title = `${item.title} — Bulle Crochet`;
  const desc = item.excerpt || "Astuces & patrons crochet — Bulle Crochet.";
  let mdesc = document.querySelector('meta[name="description"]');
  if (!mdesc) {
    mdesc = document.createElement("meta");
    mdesc.setAttribute("name", "description");
    document.head.appendChild(mdesc);
  }
  mdesc.setAttribute("content", desc);

  // Canonical
  let canon = document.querySelector('link[rel="canonical"]');
  if (!canon) {
    canon = document.createElement("link");
    canon.rel = "canonical";
    document.head.appendChild(canon);
  }
  canon.href = location.href;

  // URLs d'image (compatibles sous-dossier GitHub Pages)
  const src800 = item.image || "assets/placeholder.webp";
  const src1600 = item.cover || src800;
  const absImg = new URL(src1600, location.href).href;

  // JSON-LD Article
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    description: desc,
    image: absImg ? [absImg] : [],
    author: { "@type": "Person", name: "Bulle Crochet" },
    keywords: (item.tags || []).join(", "),
  };
  const ldScript = document.createElement("script");
  ldScript.type = "application/ld+json";
  ldScript.textContent = JSON.stringify(ld);
  document.head.appendChild(ldScript);

  // Rendu
  container.innerHTML = `
    <article class="post">
      ${
        src800
          ? `
        <img class="post-cover"
             src="${src800}"
             srcset="${src800} 800w, ${src1600} 1600w"
             sizes="(min-width: 1100px) 900px, 100vw"
             alt="${item.alt || item.title}"
             width="1600" height="900"
             loading="eager" decoding="async">`
          : ""
      }
      <h1>${item.title}</h1>
      <div class="meta-row">
        ${item.level ? `<span class="meta-item">🧶 ${item.level}</span>` : ""}
        ${item.time ? `<span class="meta-item">⏱ ${item.time}</span>` : ""}
        ${item.type ? `<span class="meta-item">🏷 ${item.type}</span>` : ""}
      </div>
      <div class="prose">
        ${item.content || `<p>${item.excerpt || ""}</p>`}
      </div>
      <div class="tags">${(item.tags || [])
        .map((t) => `<span class="tag">${t}</span>`)
        .join("")}</div>
      <p class="back"><a href="${
        item.type === "Patron" ? "patrons.html" : "articles.html"
      }">← Retour</a></p>
    </article>`;
}

function toCard(item) {
  const tags = (item.tags || [])
    .map((t) => `<span class="tag">${t}</span>`)
    .join("");
  const meta = `
    <div class="meta-row">
      ${
        item.level
          ? `<span class="meta-item" aria-label="Niveau">🧶 ${item.level}</span>`
          : ""
      }
      ${
        item.time
          ? `<span class="meta-item" aria-label="Temps">⏱ ${item.time}</span>`
          : ""
      }
      ${
        item.type
          ? `<span class="meta-item" aria-label="Type">🏷 ${item.type}</span>`
          : ""
      }
    </div>`;

  // URL de la carte : 1) item.url si présent, sinon 2) page de détail avec slug
  const href = item.url || `article.html?slug=${slugify(item.title)}`;
  const imgSrc =
    item.image ||
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  const imgAlt = item.alt || item.title || "Illustration";

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

async function hydrateHome() {
  const [articles, patrons] = await Promise.all([
    loadJSON("data/articles.json"),
    loadJSON("data/patterns.json"),
  ]);
  const ha = document.querySelector("#home-articles");
  const hp = document.querySelector("#home-patrons");
  if (ha) ha.innerHTML = articles.slice(0, 6).map(toCard).join("");
  if (hp) hp.innerHTML = patrons.slice(0, 6).map(toCard).join("");
}

async function hydrateLists() {
  const la = document.querySelector("#list-articles");
  const lp = document.querySelector("#list-patrons");

  if (la) {
    const items = await loadJSON("data/articles.json");
    const input = document.querySelector("#search-articles");
    const render = (arr) => {
      la.innerHTML = arr.map(toCard).join("");
    };
    render(items);
    input?.addEventListener("input", () => {
      const q = input.value.toLowerCase();
      render(
        items.filter((it) =>
          (it.title + " " + (it.tags || []).join(" ")).toLowerCase().includes(q)
        )
      );
    });
  }

  if (lp) {
    const items = await loadJSON("data/patterns.json");
    const input = document.querySelector("#search-patrons");
    const render = (arr) => {
      lp.innerHTML = arr.map(toCard).join("");
    };
    render(items);
    input?.addEventListener("input", () => {
      const q = input.value.toLowerCase();
      render(
        items.filter((it) =>
          (it.title + " " + (it.tags || []).join(" ")).toLowerCase().includes(q)
        )
      );
    });
  }
}

hydrateHome();
hydrateLists();
hydrateArticle();

// Ombre du header quand on scrolle
(function(){
  const setShadow = () => {
    document.body.classList.toggle('is-scrolled', window.scrollY > 4);
  };
  setShadow();
  window.addEventListener('scroll', setShadow, { passive: true });
})();

// Mesurer la hauteur réelle du header (utile pour scroll-margin-top)
(function(){
  const header = document.querySelector('.site-header');
  if(!header) return;
  const setH = () => document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  setH();
  window.addEventListener('resize', setH);
})();
