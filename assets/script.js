(function(){
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

  function gdriveImg(url) {
    if (!url) return url;
    let id = null;
    let urlObj;
    try { urlObj = new URL(url); if (urlObj.searchParams.get("id")) id = urlObj.searchParams.get("id"); } catch (e) {}
    if (!id) { let m = url.match(/\/d\/([-\w]{25,})/); if (m) id = m[1]; }
    return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : url;
  }

  function buildCard(row){
    const titleKey = pickFirstKey(row, TITLE_HINTS);
    const sumKey = pickFirstKey(row, SUMMARY_HINTS);
    const title = norm(row[titleKey]) || "Projet sans titre";
    const summary = norm(row[sumKey]) || "";

    const sections = [];
    let firstImageHtml = "";

    for(const [label, columns] of Object.entries(GROUPS)){
      const present = columns.map(c => Object.keys(row).find(k => lc(k) === lc(c))).filter(Boolean);
      if(present.length){
        const items = present.map(k => {
          const v = norm(row[k]);
          if(!v) return null;

          if(isLikelyUrl(v) && /\.(jpg|jpeg|png|gif)$/i.test(v)){
            const imgUrl = gdriveImg(v);
            const imgTag = `<img src="${imgUrl}" class="card-img" alt="${escapeHtml(k)}" onclick="showLightbox('${imgUrl}')">`;
            if(!firstImageHtml) { firstImageHtml = imgTag; return null; }
            return `<div class="mb-2"><div class="key">${escapeHtml(k)}</div>${imgTag}</div>`;
          }

          if(isLikelyUrl(v) && /\.(pdf|docx?|xlsx?|pptx?)$/i.test(v)){
            return `<div class="file-preview"><a href="${escapeUrl(v)}" target="_blank">${escapeHtml(k)}</a></div>`;
          }

          const parts = splitMulti(v);
          if(parts.length > 1) return `<div class="mb-2"><div class="key">${escapeHtml(k)}</div>${parts.map(p=>`<span class="pill">${escapeHtml(p)}</span>`).join(" ")}</div>`;

          if(lc(k).includes("code")) return `<div class="mb-2"><div class="key">${escapeHtml(k)}</div><pre style="background:#f5f5f5;padding:5px;border-radius:4px;overflow:auto; max-height:200px;">${escapeHtml(v)}</pre></div>`;

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
        if(isLikelyUrl(v) && /\.(jpg|jpeg|png|gif)$/i.test(v)) return `<img src="${gdriveImg(v)}" class="card-img" onclick="showLightbox('${gdriveImg(v)}')">`;
        if(isLikelyUrl(v)) return `<span class="badge bg-light text-dark badge-kv"><span class="key">${escapeHtml(k)}:</span> <a href="${escapeUrl(v)}" target="_blank">${escapeHtml(v)}</a></span>`;
        return `<span class="badge bg-light text-dark badge-kv"><span class="key">${escapeHtml(k)}:</span> ${escapeHtml(v)}</span>`;
      });

    return `
      <div class="col">
        <div class="card h-100">
          <div class="card-body">
            ${firstImageHtml}
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
      ALL_KEYS = Object.keys(RAW[0]||{});
      const select = document.getElementById("keySelect");
      ALL_KEYS.forEach(k=>{const opt=document.createElement("option");opt.value=k;opt.textContent=k;select.appendChild(opt);});
      document.getElementById("downloadCsv").href = CSV_URL;
      render();
    }
  });

  document.getElementById("q").addEventListener("input", e=>{
    filter(e.target.value, document.getElementById("keySelect").value);
  });

  document.getElementById("keySelect").addEventListener("change", e=>{
    filter(document.getElementById("q").value, e.target.value);
  });

  // Lightbox
  window.showLightbox = function(src){
    const lb = document.getElementById("lightbox");
    const img = document.getElementById("lightbox-img");
    img.src = src;
    lb.style.display = "flex";
  }
})();
