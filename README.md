# Olfactory Garden app

A phone-first app for the rooftop garden. Scan a plant's QR label to:

- **read** its names (English / Thai / phonetic / botanical), scent profile, best time to smell it, aroma molecules, perfumery link, stories from around the world, and every past scent note
- **see** it two ways: *In our garden* (your latest photo of where it lives) and *In bloom* (your own bloom photo, or a reference image from Wikipedia / iNaturalist)
- **add** a scent note (date and time are stamped automatically), a photo, or a story

```
QR label ──► GitHub Pages (index.html, app.js) ──► Apps Script web app ──► Google Sheet + Drive photo folder
                     static, no data                   open, add-only         the single source of truth
```

## How the sheet is organised

Wade's **Master Catalogue** tab is unchanged. The app only reads it. The script adds four tabs:

| Tab | One row per | Who fills it |
|---|---|---|
| **Species** | botanical species (e.g. all 4 Night-Blooming Jasmines share one row) | Seeded by the script; edit freely |
| **Scent Journal** | scent note: Timestamp, Plant ID, Author, What I Smell, Intensity, Bloom Stage, Source | The app |
| **Photos** | uploaded photo (file saved in the *Olfactory Garden Photos* Drive folder next to the sheet) | The app |
| **Stories** | story, attached to a species | Seeded + the app |

What the app **never shows**: Qty, Container, Sunlight, Potting & Soil, Watering/Pruning, and the Box Tracker tab. Those stay in the sheet for Lalo and Wade. To show more columns, add them to `PUBLIC_FIELDS` in `apps_script/Code.gs`.

**Plant IDs** come from the *Catalog ID / Tape #* column. `021 (Box 21)` becomes ID `21`. QR codes point at `…/#/p/<ID>`, so don't renumber a plant once its label is printed. New plants just need a new number.

Seeded species details and stories are marked *Seed — verify*. They're a starting point: check them and edit them in the sheet.

## One-time setup (about 10 minutes)

1. **Add the script.** Open the Master Plant sheet → *Extensions → Apps Script*. Create three files and paste in the contents of `apps_script/Code.gs`, `apps_script/Seed.gs` and `apps_script/appsscript.json`. To see the manifest file, turn on *Project Settings → Show "appsscript.json"*. Save.
2. **Run setup.** Reload the sheet. A new **Olfactory Garden** menu appears. Run *1. Set up / sync app tabs* and approve the permissions it asks for (Sheets, Drive, fetching bloom images).
3. **Deploy the API.** In Apps Script: *Deploy → New deployment → Web app*.
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**. This lets anyone who scans a label read the garden and add notes, photos or stories, with no sign-in or passcode. Nothing can be edited or deleted through the app.
   - Copy the URL that ends in `/exec`.
4. **Point the app at it.** Paste that URL into `apiUrl` in `config.js`.
5. **Host it.** This repo is served by GitHub Pages (*Settings → Pages → Deploy from a branch → main / (root)*) at https://oelileo.github.io/olfactory-garden/. Every push to `main` updates the live app within a minute or two. Open the site and add it to your home screen.
6. **Print labels.** In the app, tap **QR labels → Print labels**. Laminate them or use outdoor label stock.

After later script edits, go to *Deploy → Manage deployments → Edit → Version: New version*. This keeps the same URL.

## Day-to-day

- **New plant:** Wade adds a row to Master Catalogue, then you run *Set up / sync app tabs* again. That creates its Species row and fetches a bloom image. Re-running is safe: it only fills empty cells.
- **Better bloom image:** paste any image URL into *Species → Bloom Image URL*. Or upload your own photo as *In bloom* in the app, which always wins over the online one.

## Local testing

```bash
python3 -m http.server 8766
```
Open `http://localhost:8766/?demo`. This needs `demo.json`, a gitignored fixture. Writes in demo mode stay in memory.

## Image credits

- `images/niam-hom-leaf.jpg`: cropped from "Saplings of Niamhom (Strobilanthes tonkinensis)" by Susawaengsup, Jaradrattanapaiboon et al., [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Saplings_of_Niamhom_(Strobilanthes_tonkinensis).png), CC BY 4.0.
- Bloom images linked from the Species tab carry their own credit in the *Bloom Image Credit* column.
