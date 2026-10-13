# mac-and-cheese-house-menu

An unofficial online menu for **Mac & Cheese House**, which has no menu of its own online. The prices were copied by hand from the restaurant's self-service ordering kiosk, so they may be out of date.

Live: https://mchouse.soheab.com

## How it works

It is a static site with no build step. All menu data lives in [`menu.json`](menu.json), and [`app.js`](app.js) renders the page from it at load time, including the category navigation, the search box and a cart. The cart only adds up prices to show a total; it does not place orders and is kept in `localStorage`.

To change the menu, edit `menu.json`:

```json
{
  "name": "Mac & Cheese House",
  "currency": "EUR",
  "location": {
    "address": "Passage 56, 3431 LR Nieuwegein",
    "maps": "https://maps.app.goo.gl/2kTJcpQowUy6GhL77"
  },
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

A `price` of `null` is shown as "Prijs onbekend". Items can also have an `image` (a path relative to the site root), shown as a small thumbnail before the name.

## Running locally

`fetch()` does not work over `file://`, so serve the folder:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## License

The code and menu data are [MIT](LICENSE). The drink images in `images/` are cropped from photos of the restaurant's ordering kiosk. The brand names and logos on them are trademarks of their respective owners, are shown only to identify the products on the menu, and are not covered by the MIT license.

Not affiliated with Mac & Cheese House or any of the brands listed.
