# mac-and-cheese-house-menu

An unofficial online menu for **Mac & Cheese House**, which has no menu of its own online. The prices were copied by hand from the restaurant's self-service ordering kiosk, so they may be out of date.

Live: https://mchouse.soheab.com

## How it works

It is a static site with no build step. All menu data lives in [`menu.json`](menu.json), and [`app.js`](app.js) renders the page from it at load time, including the category navigation and the search box.

To change the menu, edit `menu.json`:

```json
{
  "name": "Mac & Cheese House",
  "currency": "EUR",
  "updated": "2026-10-13",
  "footer": "Raadpleeg het personeel voor informatie over allergenen.",
  "categories": [
    {
      "id": "snacks",
      "name": "Snacks",
      "note": "Optional line shown under the heading.",
      "items": [{ "name": "Patat", "price": 3.95 }]
    }
  ]
}
```

A `price` of `null` is shown as "Prijs onbekend".

## Running locally

`fetch()` does not work over `file://`, so serve the folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## License

[MIT](LICENSE). Not affiliated with Mac & Cheese House.
