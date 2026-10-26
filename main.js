/* ===== 공통 탭 (WAI-ARIA tabs: roving tabindex, 방향키, Home/End) ===== */
function setupTabs(tabList, panel, prefix, labels, onSelect) {
  const tabs = [];
  panel.setAttribute("role", "tabpanel");
  panel.tabIndex = 0;

  const select = (i, focus) => {
    tabs.forEach((b, k) => {
      const on = k === i;
      b.setAttribute("aria-selected", on);
      b.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", tabs[i].id);
    onSelect(i);
    if (focus) tabs[i].focus();
  };

  labels.forEach((label, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = tabList.classList.contains("tabs") ? "tab" : "stab";
    b.id = `${prefix}-tab-${i}`;
    b.setAttribute("role", "tab");
    b.setAttribute("aria-controls", panel.id);
    b.textContent = label;
    b.onclick = () => select(i, false);
    b.addEventListener("keydown", (e) => {
      const last = tabs.length - 1;
      const next = {
        ArrowRight: i === last ? 0 : i + 1,
        ArrowLeft: i === 0 ? last : i - 1,
        Home: 0,
        End: last,
      }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select(next, true);
    });
    tabs.push(b);
    tabList.appendChild(b);
  });
  select(0, false);
}

/* ===== 도시 탭 (world.html) ===== */
const regionTabs = document.querySelector(".tabs");
const cityBox = document.getElementById("cities");

if (regionTabs && cityBox) {
  setupTabs(regionTabs, cityBox, "region", REGIONS.map((r) => r.name), (i) => {
    cityBox.innerHTML = REGIONS[i].cities
      .map(([city, country]) => `<div class="city"><b>${city}</b><small>${country}</small></div>`)
      .join("");
  });
}

/* ===== 숙소 탭 (stay.html) ===== */
const stayTabs = document.querySelector(".stabs");
const stayBox = document.getElementById("stays");

if (stayTabs && stayBox) {
  const card = (name, desc, tags) =>
    `<div class="stc"><b>${name}</b><p>${desc}</p>${tags.map((t) => `<span>${t}</span>`).join("")}</div>`;

  setupTabs(stayTabs, stayBox, "stay", STAYS.map((s) => s.country), (n) => {
    stayBox.innerHTML = STAYS[n].items.map(([name, desc, tags]) => card(name, desc, tags)).join("");
  });
}
