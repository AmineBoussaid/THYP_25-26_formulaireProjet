(function(){
  // === CONFIG ===
  const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS4ybpehNFsjedAtbGrVbK5g8N3tYesdpf03RnMoH4UsbWPDz_oYZ43rAXKF2b2a96ozzjD-LTpkV56/pub?gid=837220721&single=true&output=csv"; 

  const TITLE_HINTS = ["Titre du projet"];
  const SUMMARY_HINTS = ["Description détaillée"];

  const GROUPS = {
    "Contenu & objectifs": ["Objectifs","Public cible","Membres de l’équipe","Commentaires additionnels"],
    "Aspects techniques": ["Technologies utilisées","Type de projet","Ressources nécessaires","Lien vers le dépôt","Date de début prévue","Date de fin","Durée estimée","Budget estimé"]
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

  // === Google Drive image direct link ===
  function gdriveImg(url) {
    if (!url) return url;
    let id = null;

    try {
      let urlObj = new URL(url);
      if (urlObj.searchParams.get("id")) {
        id = urlObj.searchParams.get("id");
      }
    } catch (e) {}

    if (!id) {
      let m = url.match(/\/d\/([-\w]{25,})/);
      if (m) id = m[1];
    }

    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : url;
  }

  // === BUILD CARDS ===
  function buildCard(row){
    const titleKey = pickFirstKey(row, TITLE_HINTS);
    const sumKey = pickFirstKey(row, SUMMARY_HINTS);
    const title = norm(row[titleKey]) || "Projet sans titre";
    const summary = norm(row[sumKey]) || "";

    // Cherche une image principale
    let mainImage = "";
    for(const val of Object.values(row)){
      if(isLikelyUrl(val)){
        const imgUrl = gdriveImg(val);
        if(imgUrl.includes("drive.google.com/thumbnail") || /\.(jpg|jpeg|png|gif)$/i.test(val)){
          mainImage = `<img src="${imgUrl}" class="main-img" alt="${escapeHtml(title)}" data-bs-toggle="modal" data-bs-target="#imgModal" onclick="showImage('${imgUrl}')">`;
          break;
        }
      }
    }

    const sections = [];
    for(const [label, columns] of Object.entries(GROUPS)){
      const present = columns.map(c => Object.keys(row).find(k => lc(k) === lc(c))).filter(Boolean);
      if(present.length){
        const items = present.map(k => {
          const v = norm(row[k]);
          if(!v) return null;

          // Images supplémentaires
          if(isLikelyUrl(v)){
            const imgUrl = gdriveImg(v);
            if(imgUrl.includes("drive.google.com/thumbnail") || /\.(jpg|jpeg|png|gif)$/i.test(v)){
              return `<div class="mb-2">
                        <div class="key">${escapeHtml(k)}</div>
                        <img src="${imgUrl}" class="card-img" alt="${escapeHtml(k)}" data-bs-toggle="modal" data-bs-target="#imgModal" onclick="showImage('${imgUrl}')">
                      </div>`;
            }
          }

          // Fichiers (PDF, DOC, etc.)
          if(isLikelyUrl(v) && /\.(pdf|docx?|xlsx?|pptx?)$/i.test(v)){
            return `<div class="file-preview"><a href="${escapeUrl(v)}" target="_blank">${escapeHtml(k)}</a></div>`;
          }

          // Multi-éléments
          const parts = splitMulti(v);
          if(parts.length > 1) return `<div class="mb-2"><div class="key">${escapeHtml(k)}</div>${parts.map(p=>`<span class="pill">${escapeHtml(p)}</span>`).join(" ")}</div>`;

          // Code projet
          if(lc(k).includes("code")) return `<div class="mb-2"><div class="key">${escapeHtml(k)}</div><pre class="code-block">${escapeHtml(v)}</pre></div>`;

          // Texte simple
          return `<div class="mb-2"><div class="key">${escapeHtml(k)}</div><div>${escapeHtml(v)}</div></div>`;
        }).filter(Boolean);
        if(items.length) sections.push(`<div class="mb-2"><div class="muted fw-semibold mb-1">${label}</div>${items.join("")}</div>`);
      }
    }

    return `
      <div class="col">
        <div class="card h-100 project-card">
          ${mainImage}
          <div class="card-body">
            <h5 class="card-title mb-1">${escapeHtml(title)}</h5>
            ${summary ? `<p class="card-text">${escapeHtml(summary)}</p>` : ""}
            ${sections.join("")}
          </div>
        </div>
      </div>
    `;
  }

  function render(){
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    if(!FILTERED.length) return grid.innerHTML="<p>Aucun projet trouvé.</p>";
    grid.innerHTML = FILTERED.map(buildCard).join("");
    document.getElementById("count").textContent = `${FILTERED.length} projet(s) affiché(s)`;
  }

  function filter(q, key){
    q = lc(q);
    FILTERED = RAW.filter(r=>{
      if(!q) return true;
      if(key) return lc(r[key]||"").includes(q);
      return Object.values(r).some(v=>lc(v||"").includes(q));
    });
    render();
  }

  // === INIT ===
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results){
      RAW = results.data;
      FILTERED = [...RAW];
      ALL_KEYS = Object.keys(RAW[0] || {});
      const sel = document.getElementById("keySelect");
      ALL_KEYS.forEach(k=>{ const opt = document.createElement("option"); opt.value=k; opt.textContent=k; sel.appendChild(opt); });
      document.getElementById("downloadCsv").href = CSV_URL;
      render();
    }
  });

  document.getElementById("q").addEventListener("input", e=>{
    const key = document.getElementById("keySelect").value || null;
    filter(e.target.value, key);
  });
  document.getElementById("keySelect").addEventListener("change", e=>{
    const q = document.getElementById("q").value || "";
    filter(q, e.target.value || null);
  });

  // === ZOOM IMAGE (modale) ===
  window.showImage = function(url){
    document.getElementById("modalImage").src = url;
  };
})();
