const searchInput = document.querySelector("#article-search");
const tagFilter = document.querySelector("#tag-filter");
const projectFilter = document.querySelector("#project-filter");
const cards = [...document.querySelectorAll(".article-card")];
const empty = document.querySelector("#article-empty");

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const tag = tagFilter.value;
  const project = projectFilter.value;
  let visible = 0;

  for (const card of cards) {
    const matchesSearch = !query || card.dataset.title.includes(query) || card.dataset.description.includes(query);
    const matchesTag = !tag || card.dataset.tags.split(",").includes(tag);
    const matchesProject = !project || card.dataset.project === project;
    const show = matchesSearch && matchesTag && matchesProject;
    card.hidden = !show;
    if (show) visible += 1;
  }

  empty.hidden = visible !== 0;
}

[searchInput, tagFilter, projectFilter].forEach((control) => {
  control.addEventListener("input", applyFilters);
  control.addEventListener("change", applyFilters);
});
