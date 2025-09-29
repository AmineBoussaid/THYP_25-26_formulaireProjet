(function(){
  // === CONFIG ===
  const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS4ybpehNFsjedAtbGrVbK5g8N3tYesdpf03RnMoH4UsbWPDz_oYZ43rAXKF2b2a96ozzjD-LTpkV56/pub?output=csv";

  const TITLE_HINTS = ["Titre du projet","Titre","Project title","Nom du projet"];
  const SUMMARY_HINTS = ["Résumé","Résumé du projet","Description","Pitch","Synthèse"];

  const GROUPS = {
    "Contenu & objectifs": ["Objectifs","Problématique","Public cible","Audience","Cible"],
    "Aspects techniques": ["Technologies","Fonctionnalités"]
  };

  let RAW = [];
  let FILTERED = [];
  let ALL_KEYS = [];

  // === UTILITAIRES ===
  const norm = s => (s||"").toString().trim();
  const lc = s => norm(s).toLowerCase();

  function pickFirstKey(obj, hints){
    for(const h of hints){
      const k = Object.keys(obj).find(k => lc(k) === lc(h));
      if(k) return k;
    }
    return null;
  }

  function splitMulti(val){
    if(!val) return [];
    return val.split(/[,;]\s*/).map(v => v.trim()).filter(Boolean);
  }

  function isLikelyUrl(s){
    return /^https?:\/\/|^www\./i.test(s);
  }

  function escapeHtml(s){
    return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
            .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  function escapeUrl(s){
    try { return new URL(s).toString(); }
    catch { return s; }
  }

  // === BUILD CARDS ===
  function buildCard(row){
    const titleKey = pickFirstKey(row, TITLE_HINTS);
    const sumKey = pickFirstKey(row, SUMMARY_HINTS);
    const title = norm(row[titleKey]) || "Projet sans titre";
    const summary = norm(row[sumKey]) || "";

    const sections = [];
    for(const [label, columns] of Object.entries(GROUPS)){
      const present = columns.map(c => Object.keys(row).find(k => lc(k) === lc(c))).filter(Boolean);
      if(present.length){
        const items = present.map(k => {
          const v = norm(row[k]);
          if(!v) return null;
          const parts = splitMulti(v);
          if(parts.length > 1) return `<div class="mb-2"><div class="key">${escapeHtml(k)}</div>${parts.map(p=>`<span class="pill">${escapeHtml(p)}</span>`).join(" ")}</div>`;
          if(isLikelyUrl(v)) return `<div class="mb-2"><div class="key">${escapeHtml(k)}</div><div><a href="${escapeUrl(v)}" target="_blank">${escapeHtml(v)}</a></div></div>`;
          return `<div class="mb-2"><div class="key">${escapeHtml(k)}</div><div>${escapeHtml(v)}</div></div>`;
        }).filter(Boolean);
        if(items.length) sections.push(`<div class="mb-2"><div class="muted fw-semibold mb-1">${label}</div>${items.join("")}</div>`);
      }
    }

    const groupedKeys = new Set([].concat(...Object.values(GROUPS)).map(x=>lc(x)));
    if(titleKey) groupedKeys.add(lc(titleKey));
    if(sumKey) groupedKeys.add(lc(sumKey));

    const misc = Object.keys(row).filter(k=>lc(k) && !groupedKeys.has(lc(k)) && norm(row[k]))
      .map(k=>{
        const v = norm(row[k]);
        const parts = splitMulti(v);
        if(parts.length>1) return `<span class="badge bg-light text-dark badge-kv"><span class="key">${escapeHtml(k)}:</span> ${parts.map(p=>`<span class="pill">${escapeHtml(p)}</span>`).join(" ")}</span>`;
        if(isLikelyUrl(v)) return `<span class="badge bg-light text-dark badge-kv"><span class="key">${escapeHtml(k)}:</span> <a href="${escapeUrl(v)}" target="_blank">${escapeHtml(v)}</a></span>`;
        return `<span class="badge bg-light text-dark badge-kv"><span class="key">${escapeHtml(k)}:</span> ${escapeHtml(v)}</span>`;
      });

    return `
      <div class="col">
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title mb-1">${escapeHtml(title)}</h5>
            ${summary ? `<p class="card-text">${escapeHtml(summary)}</p>` : ""}
            ${sections.join("")}
            ${misc.length ? `<div class="mt-2">${misc.join(" ")}</div>` : ""}
          </div>
        </div>
      </div>
    `;
  }

  function render(){
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    if(!FILTERED.length){
      document.getElementById("count").textContent = "Aucun résultat.";
      return;
    }
    document.getElementById("count").textContent = `${FILTERED.length} projet(s)`;
    grid.innerHTML = FILTERED.map(buildCard).join("");
  }

  function searchFilter(q,key){
    const qlc = lc(q);
    return RAW.filter(row=>{
      if(key) return lc(row[key]||"").includes(qlc);
      return Object.values(row).some(v=>lc(v).includes(qlc));
    });
  }

  function populateKeySelect(){
    const sel = document.getElementById("keySelect");
    sel.innerHTML = `<option value="">— Filtrer par colonne —</option>`;
    ALL_KEYS.forEach(k=>{
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      sel.appendChild(opt);
    });
  }

  // === INIT ===
  document.getElementById("downloadCsv").href = CSV_URL;

  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results){
      RAW = results.data.map(r=>{
        const o = {};
        Object.keys(r).forEach(k=>{ o[k.trim()] = (r[k]??"").trim(); });
        return o;
      });
      const keySet = new Set();
      RAW.forEach(r=>Object.keys(r).forEach(k=>keySet.add(k)));
      ALL_KEYS = Array.from(keySet);
      populateKeySelect();
      FILTERED = RAW.slice();
      render();
    }
  });

  // === ÉCOUTEURS ===
  const qInput = document.getElementById("q");
  const keySel = document.getElementById("keySelect");

  function applyFilters(){
    const q = qInput.value||"";
    const key = keySel.value||"";
    FILTERED = searchFilter(q,key);
    render();
  }

  qInput.addEventListener("input", applyFilters);
  keySel.addEventListener("change", applyFilters);
})();
