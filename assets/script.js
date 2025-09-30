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

  // === Utils ===
  const norm = s => (s||"").toString().trim();
  const lc = s => norm(s).toLowerCase();
  const escapeHtml = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
                           .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const escapeUrl = s => { try { return new URL(s).toString(); } catch { return s; } };
  const splitMulti = val => !val ? [] : val.split(/[,;]\s*/).map(v => v.trim()).filter(Boolean);
  const isLikelyUrl = s => /^https?:\/\/|^www\./i.test(s);

  function pickFirstKey(obj, hints){
    for(const h of hints){
      const k = Object.keys(obj).find(k => lc(k) === lc(h));
      if(k) return k;
    }
    return null;
  }

  // === Google Drive image direct link ===
  function gdriveImg(url) {
    if (!url) return url;
    let id = null;
    try {
      let u = new URL(url);
      if (u.searchParams.get("id")) id = u.searchParams.get("id");
    } catch (e) {}
    if (!id) {
      let m = url.match(/\/d\/([-\w]{25,})/);
      if (m) id = m[1];
    }
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : url;
  }

  // === Build cards ===
  function buildCard(row){
    const titleKey = pickFirstKey(row, TITLE_HINTS);
    const sumKey = pickFirstKey(row, SUMMARY_HINTS);
    const title = norm(row[titleKey]) || "Projet sans titre";
    const summary = norm(row[sumKey]) || "";

    let projectImg = null;
    if (row["Icône ou logo du projet"]) {
      projectImg = gdriveImg(row["Icône ou logo du projet"]);
    }

    const sections = [];
    for(const [label, columns] of Object.entries(GROUPS)){
      const present = columns.map(c => Object.keys(row).find(k => lc(k) === lc(c))).filter(Boolean);
      if(present.length){
        const items = present.map(k => {
          const v = norm(row[k]);
          if(!v) return null;

          if(isLikelyUrl(v) && /\.(jpg|jpeg|png|gif)$/i.test(v)){
            const imgUrl = gdriveImg(v);
            return `<div class="mb-2">
                      <div class="key">${escapeHtml(k)}</div>
                      <img src="${imgUrl}" class="card-img-top zoomable" alt="${escapeHtml(k)}">
                    </div>`;
          }

          if(isLikelyUrl(v) && /\.(pdf|docx?|xlsx?|pptx?)$/i.test(v)){
            return `<div class="file-preview"><a href="${escapeUrl(v)}" target="_blank">${escapeHtml(k)}</a></div>`;
          }

          const parts = splitMulti(v);
          if(parts.length > 1) return `<div class="mb-2"><div class="key">${escapeHtml(k)}</div>${parts.map(p=>`<span class="pill">${escapeHtml(p)}</span>`).join(" ")}</div>`;

          return `<div class="mb-2"><div class="key">${escapeHtml(k)}</div><div>${escapeHtml(v)}</div></div>`;
        }).filter(Boolean);
        if(items.length) sections.push(`<div class="mb-2"><div class="muted fw-semibold mb-1">${label}</div>${items.join("")}</div>`);
      }
    }

    return `
      <div class="col">
        <div class="card h-100">
          ${projectImg ? `<img src="${projectImg}" class="card-img-top zoomable" alt="logo projet">` : ""}
          <div class="card-body">
            <h5 class="card-title">${escapeHtml(title)}</h5>
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

    // Ajouter zoom sur images
    document.querySelectorAll(".zoomable").forEach(img=>{
      img.addEventListener("click", () => openLightbox(img.src));
    });

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

  // === Lightbox ===
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.innerHTML = `<img src="" alt="zoom">`;
  document.body.appendChild(lightbox);

  function openLightbox(src){
    lightbox.querySelector("img").src = src;
    lightbox.classList.add("active");
  }
  lightbox.addEventListener("click", ()=>lightbox.classList.remove("active"));

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
})();
