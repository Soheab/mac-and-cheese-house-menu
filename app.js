"use strict";

const $ = (sel) => document.querySelector(sel);

const formatPrice = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format;

// Set from menu.json's "currency" once it has loaded.
let currencySymbol = "€";

function currencySymbolFor(currency) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency })
    .formatToParts(0)
    .find((part) => part.type === "currency").value;
}

// A price with the currency symbol in front, e.g. "€ 8,95".
function priceNodes(amount) {
  return [
    el("span", { className: "currency", textContent: currencySymbol }),
    formatPrice(amount),
  ];
}

const CART_KEY = "mac-and-cheese-house-menu:cart";

function el(tag, { dataset, ...props } = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  if (dataset) Object.assign(node.dataset, dataset);
  node.append(...children);
  return node;
}

function thumbNode(item) {
  if (!item.image) return [];
  return [el("img", {
    className: "thumb", src: item.image, alt: "", loading: "lazy", decoding: "async",
    width: 40, height: 40,
  })];
}

function renderTitle(name) {
  // Highlight the "&" in names like "Mac & Cheese House".
  const [before, ...rest] = name.split("&");
  const title = $("#title");
  title.replaceChildren(before);
  if (rest.length) title.append(el("span", { textContent: "&" }), rest.join("&"));
  document.title = `${name} — Menu`;
}

// ---------------------------------------------------------------------------
// Cart: purely a calculator, nothing is ever sent anywhere. Quantities are
// kept in localStorage so a reload doesn't lose them.
// ---------------------------------------------------------------------------

const products = new Map(); // key -> { name, price }
const cart = new Map(); // key -> quantity
const controls = new Map(); // key -> .qty element in the menu list

const itemKey = (cat, item) => `${cat.id}/${item.name}`;

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) ?? "{}");
    for (const [key, qty] of Object.entries(saved)) {
      // Drop items that were removed from the menu or lost their price.
      if (products.has(key) && Number.isInteger(qty) && qty > 0) cart.set(key, qty);
    }
  } catch {
    // Corrupt or unavailable storage: start with an empty cart.
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(Object.fromEntries(cart)));
  } catch {
    // Private mode etc.: the cart still works for this page view.
  }
}

function setQty(key, qty) {
  if (qty > 0) cart.set(key, qty);
  else cart.delete(key);
  saveCart();
  renderCart();
}

function qtyControl(key, name) {
  const qty = cart.get(key) ?? 0;
  if (qty === 0) {
    return [el("button", {
      type: "button", className: "add", textContent: "+",
      ariaLabel: `${name} toevoegen`,
      onclick: () => setQty(key, 1),
    })];
  }
  return [
    el("button", {
      type: "button", textContent: "−", ariaLabel: `Eén ${name} minder`,
      onclick: () => setQty(key, qty - 1),
    }),
    el("span", { textContent: qty }),
    el("button", {
      type: "button", textContent: "+", ariaLabel: `Eén ${name} meer`,
      onclick: () => setQty(key, qty + 1),
    }),
  ];
}

function renderCart() {
  for (const [key, node] of controls) {
    node.replaceChildren(...qtyControl(key, products.get(key).name));
  }

  let count = 0;
  let totalCents = 0;
  const lines = [];
  for (const [key, qty] of cart) {
    const { name, price } = products.get(key);
    // Sum in cents to avoid floating point drift (0.1 + 0.2 and friends).
    const lineCents = Math.round(price * 100) * qty;
    count += qty;
    totalCents += lineCents;
    lines.push(el("li", {}, [
      el("span", { className: "name", textContent: name }),
      el("div", { className: "qty" }, qtyControl(key, name)),
      el("span", { className: "price" }, priceNodes(lineCents / 100)),
    ]));
  }

  $("#cart-count").textContent = count === 1 ? "1 item" : `${count} items`;
  $("#cart-bar-total").replaceChildren(...priceNodes(totalCents / 100));
  $("#cart-total").replaceChildren(...priceNodes(totalCents / 100));
  $("#cart-lines").replaceChildren(...lines);
  $("#cart-bar").hidden = count === 0;
  document.body.classList.toggle("has-cart", count > 0);
  if (count === 0 && $("#cart").open) $("#cart").close();
}

function setupCart() {
  const dialog = $("#cart");
  $("#cart-bar").addEventListener("click", () => dialog.showModal());
  $("#cart-close").addEventListener("click", () => dialog.close());
  $("#cart-clear").addEventListener("click", () => {
    cart.clear();
    saveCart();
    renderCart();
  });
  // Close when tapping the backdrop (the dialog element itself, outside its content).
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) dialog.close();
    }
  });
  loadCart();
  renderCart();
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

function renderMenu(data) {
  renderTitle(data.name);
  if (data.currency) currencySymbol = currencySymbolFor(data.currency);
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
          const children = [
            ...thumbNode(item),
            el("span", { className: "name", textContent: item.name }),
            known
              ? el("span", { className: "price" }, priceNodes(item.price))
              : el("span", { className: "price unknown", textContent: "Prijs onbekend" }),
          ];
          if (known) {
            const key = itemKey(cat, item);
            const control = el("div", { className: "qty" });
            products.set(key, { name: item.name, price: item.price });
            controls.set(key, control);
            children.push(control);
          }
          return el("li", { dataset: { search: item.name.toLowerCase() } }, children);
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
  const toolbar = $("#toolbar");
  const links = [...$("#nav").querySelectorAll("a")];
  const sections = [...document.querySelectorAll("#menu section")];
  let current = null;
  let queued = false;

  // The active section is the last one whose top has passed the sticky toolbar.
  // Before any has (top of the page), it's the first one; at the very bottom,
  // the last one, since short trailing sections can never reach the toolbar.
  function update() {
    queued = false;
    // Keep section scroll offsets in sync with the toolbar's real height.
    document.documentElement.style.setProperty("--toolbar-h", `${toolbar.offsetHeight}px`);
    const visible = sections.filter((s) => !s.hidden);
    if (!visible.length) return;
    const atBottom = window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    const line = toolbar.getBoundingClientRect().bottom + 8;
    let active = visible[0];
    for (const s of visible) {
      if (s.getBoundingClientRect().top <= line) active = s;
    }
    if (atBottom) active = visible.at(-1);
    if (active === current) return;
    // Mirror the active category in the URL (without adding history entries)
    // so a reload or a shared link opens on the same category. The first
    // update only records the starting point, so a fresh visit keeps a clean URL.
    // The first category drops the hash instead, so reloading at the top
    // stays at the top rather than scrolling the header out of view.
    if (current) {
      const url = active === sections[0] ? location.pathname + location.search : `#${active.id}`;
      history.replaceState(null, "", url);
    }
    current = active;
    for (const a of links) {
      const on = a.hash === `#${active.id}`;
      a.classList.toggle("active", on);
      if (on) a.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }

  const schedule = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  $("#search").addEventListener("input", schedule);
  update();
}

// The menu is rendered after a fetch, so the browser's own jump to "#id" (and
// its scroll restoration) happens before the sections exist. Redo it here.
function restoreCategory() {
  const id = decodeURIComponent(location.hash.slice(1));
  const section = id ? document.getElementById(id) : null;
  if (section?.matches("#menu section")) section.scrollIntoView({ block: "start" });
}

// We restore the category ourselves (see restoreCategory), so stop the browser
// from restoring a stale scroll position on top of that.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

async function main() {
  try {
    const res = await fetch("menu.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    renderMenu(await res.json());
    setupSearch();
    setupActiveNav();
    restoreCategory();
    setupCart();
  } catch (err) {
    console.error(err);
    $("#menu").replaceChildren(el("p", { className: "status", textContent: "Menu kon niet geladen worden." }));
  }
}

main();
