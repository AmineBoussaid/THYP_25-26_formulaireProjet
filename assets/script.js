// Ton lien CSV publié
let url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTUFXMInGPyLiSOswMpHCzhrsKUHaRgZQrp7pEQQ8FPSgIL12YC5KLjkIpofeAL6UndiS4ulKX9GD12/pub?gid=1627457581&single=true&output=csv';

async function fetchProjectsCSV() {
    try {
        const response = await fetch(url);
        const csvText = await response.text();
        console.log("CSV récupéré :", csvText);


        // Parse CSV en JSON
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        const data = parsed.data;

        const container = document.getElementById("projects-container");
        container.innerHTML = "";

        data.forEach(project => {
            const card = document.createElement("div");
            card.className = "project-card";

            // Icône/logo
            if(project["Icône ou logo du projet"]) {
                const logo = document.createElement("img");
                logo.src = project["Icône ou logo du projet"];
                logo.alt = project["Titre du projet"] + " logo";
                card.appendChild(logo);
            }

            // Titre
            const title = document.createElement("h2");
            title.textContent = project["Titre du projet"];
            card.appendChild(title);

            // Description
            const desc = document.createElement("p");
            desc.textContent = project["Description détaillée"];
            card.appendChild(desc);

            // Visuel projet (image ou vidéo)
            if(project["Visuel du projet (image ou vidéo)"]) {
                const url = project["Visuel du projet (image ou vidéo)"];
                if(url.match(/\.(jpeg|jpg|gif|png)$/i)) {
                    const img = document.createElement("img");
                    img.src = url;
                    card.appendChild(img);
                } else {
                    // Assume YouTube ou autre iframe
                    const video = document.createElement("iframe");
                    video.src = url;
                    video.width = "100%";
                    video.height = "200";
                    video.frameBorder = "0";
                    video.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
                    video.allowFullscreen = true;
                    card.appendChild(video);
                }
            }

            container.appendChild(card);
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des projets :", error);
    }
}

fetchProjectsCSV();
