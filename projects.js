"use strict";

const projectGrid = document.querySelector(".project-grid");
const projectStatus = document.getElementById("project-status");
const projectCount = document.getElementById("project-count");
const projectCardThemes = ["project-card--olive", "project-card--blue", "project-card--rose"];

function createProjectCard(repository, index) {
  const card = document.createElement("a");
  card.className = `project-card ${projectCardThemes[index % projectCardThemes.length]}`;
  card.href = repository.html_url;
  card.target = "_blank";
  card.rel = "noreferrer";

  const title = document.createElement("span");
  title.className = "project-title";
  const displayName = repository.name === "eco-ai-engineers-future-2027"
    ? "ECO AI · Future 2027"
    : repository.name;
  title.textContent = displayName;

  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = " ↗";
  title.append(arrow);

  const description = document.createElement("p");
  description.textContent = repository.description || "No description on GitHub yet.";

  const tags = document.createElement("span");
  tags.className = "tag-row";
  const language = document.createElement("span");
  language.textContent = (repository.language || "project").toLowerCase();
  const stars = document.createElement("span");
  stars.textContent = `${repository.stargazers_count} stars`;
  tags.append(language, stars);

  card.append(title, description, tags);
  return card;
}

async function loadGitHubProjects() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    // This uses only public repository data; the saved cards remain visible if GitHub is unavailable.
    const response = await fetch(
      "https://api.github.com/users/d6s8/repos?sort=pushed&per_page=100",
      {
        headers: { Accept: "application/vnd.github+json" },
        signal: controller.signal,
      },
    );
    if (!response.ok) {
      throw new Error(`GitHub returned HTTP ${response.status}.`);
    }

    const repositories = await response.json();
    if (!Array.isArray(repositories)) {
      throw new Error("GitHub returned an unexpected repository list.");
    }

    const projects = repositories
      .filter((repository) => !repository.fork && !repository.archived)
      .slice(0, 3);
    if (projects.length === 0) {
      throw new Error("No public projects were returned.");
    }

    projectGrid.replaceChildren(...projects.map(createProjectCard));
    projectCount.textContent = `${String(projects.length).padStart(2, "0")} projects`;
    projectStatus.textContent = "synced from public GitHub repositories";
  } catch (error) {
    projectStatus.textContent = "GitHub is unavailable; showing the saved project list.";
    console.error("Could not load projects from GitHub.", error);
  } finally {
    window.clearTimeout(timeout);
  }
}

loadGitHubProjects();

