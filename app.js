"use strict";

const $ = (sel) => document.querySelector(sel);

function el(tag, { dataset, ...props } = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  if (dataset) Object.assign(node.dataset, dataset);
  node.append(...children);
  return node;
}

function renderTitle(name) {
  // Highlight the "&" in names like "Mac & Cheese House".
  const [before, ...rest] = name.split("&");
  const title = $("#title");
  title.replaceChildren(before);
  if (rest.length) title.append(el("span", { textContent: "&" }), rest.join("&"));
  document.title = `${name} — Menu`;
}

function renderMenu(data) {
  const formatPrice = new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format;

  renderTitle(data.name);
  $("#footer-note").textContent = data.footer ?? "";
  if (data.location?.address) {
    const link = $("#location-link");
    link.textContent = `📍 ${data.location.address}`;
    link.href = data.location.maps
      ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${data.name}, ${data.location.address}`)}`;
    $("#location").hidden = false;
  }
  if (data.updated) {
    const date = new Date(data.updated).toLocaleDateString("nl-NL");
    $("#updated").textContent = ` (${date})`;
  }

  $("#nav").replaceChildren(
    ...data.categories.map((cat) => el("a", { href: `#${cat.id}`, textContent: cat.name })),
  );

  $("#menu").replaceChildren(
    ...data.categories.map((cat) =>
      el("section", { id: cat.id }, [
        el("h2", { textContent: cat.name }),
        ...(cat.note ? [el("p", { className: "note", textContent: cat.note })] : []),
        el("ul", {}, cat.items.map((item) => {
          const known = typeof item.price === "number";
          return el("li", { dataset: { search: item.name.toLowerCase() } }, [
            el("span", { textContent: item.name }),
            el("span", {
              className: known ? "price" : "price unknown",
              textContent: known ? formatPrice(item.price) : "Prijs onbekend",
            }),
          ]);
        })),
      ]),
    ),
  );
}

function setupSearch() {
  const empty = el("p", { className: "status", textContent: "Niets gevonden.", hidden: true });
  $("#menu").append(empty);

  $("#search").addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    let anyVisible = false;
    for (const section of document.querySelectorAll("#menu section")) {
      let sectionVisible = false;
      for (const li of section.querySelectorAll("li")) {
        const match = li.dataset.search.includes(query);
        li.hidden = !match;
        sectionVisible ||= match;
      }
      section.hidden = !sectionVisible;
      anyVisible ||= sectionVisible;
    }
    empty.hidden = anyVisible;
  });
}

function setupActiveNav() {
  const links = [...document.querySelectorAll("#nav a")];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const a of links) {
        const active = a.hash === `#${entry.target.id}`;
        a.classList.toggle("active", active);
        if (active) a.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
      }
    }
  }, { rootMargin: "-60px 0px -70% 0px" });
  document.querySelectorAll("#menu section").forEach((s) => observer.observe(s));
}

async function main() {
  try {
    const res = await fetch("menu.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    renderMenu(await res.json());
    setupSearch();
    setupActiveNav();
  } catch (err) {
    console.error(err);
    $("#menu").replaceChildren(el("p", { className: "status", textContent: "Menu kon niet geladen worden." }));
  }
}

main();
