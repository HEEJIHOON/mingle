/* ===== 도시 탭 ===== */
const regionTabs = document.querySelector(".tabs");
const cityBox = document.getElementById("cities");

function showRegion(i) {
  [...regionTabs.children].forEach((b, k) => b.setAttribute("aria-selected", k === i));
  cityBox.innerHTML = REGIONS[i].cities
    .map(([city, country, first]) =>
      `<div class="city${first ? " first" : ""}"><b>${city}</b><small>${country}</small></div>`)
    .join("");
}

REGIONS.forEach((region, i) => {
  const b = document.createElement("button");
  b.className = "tab";
  b.setAttribute("role", "tab");
  b.textContent = region.name;
  b.onclick = () => showRegion(i);
  regionTabs.appendChild(b);
});
showRegion(0);

/* ===== 숙소 탭 ===== */
const stayTabs = document.querySelector(".stabs");
const stayBox = document.getElementById("stays");

const card = (name, desc, tags) =>
  `<div class="stc"><b>${name}</b><p>${desc}</p>${tags.map((t) => `<span>${t}</span>`).join("")}</div>`;

function showStay(n) {
  [...stayTabs.children].forEach((b, k) => b.setAttribute("aria-selected", k === n));
  stayBox.innerHTML =
    STAYS[n].items.map(([name, desc, tags]) => card(name, desc, tags)).join("") +
    card("현지 감성 숙소", "여행의 분위기를 더해줄 특별한 공간", ["감성", "추천"]);
}

STAYS.forEach((stay, n) => {
  const b = document.createElement("button");
  b.className = "stab";
  b.setAttribute("role", "tab");
  b.textContent = stay.country;
  b.onclick = () => showStay(n);
  stayTabs.appendChild(b);
});
showStay(0);
