# Gemini instructions: filling the Species and Stories tabs

Wade's Gemini already fills in the **Master Catalogue** row from a catalog number and a photo. Add the text below to his instructions, either in the Gem or pasted after his usual request, so Gemini also fills in the **Species** and **Stories** tabs that the app reads.

```
After you fill in the plant's row on the "Master Catalogue" tab, also update two more tabs in this same spreadsheet. Never change or delete existing rows; only add new ones at the bottom. Never touch the "Scent Journal" or "Photos" tabs.

SPECIES TAB: first take the "Species Key", which is the first two words of the Botanical Name you just entered (genus + species only, e.g. "Gardenia carinata"; no cultivar, no brackets; use "Genus spp." if the species is unknown). It must match exactly, including capitals. If a row with that Species Key already exists in column A, do nothing on this tab. Otherwise add one row:
- Species Key: as above
- Common Name: the English name
- Fragrance Family: e.g. "White floral — creamy", "Citrus (hesperidic)", "Earthy / woody — base note"
- Scent Notes: what it smells like, in a perfumer's words, 1–2 sentences
- Where the Scent Lives: flowers, crushed leaves, bark, fruit peel, in the air, etc.
- Peak Scent Time: time of day it smells strongest
- Bloom Season: in a tropical Bangkok climate
- Key Aroma Molecules: main known fragrance compounds, or "not well studied"
- Perfumery Link: related essential oils, absolutes or accords
- Safety Note: toxicity, thorns, sap or allergens; leave blank if none
- Bloom Image URL: a Wikipedia or Wikimedia Commons link to a photo of the flower (or of the leaves if it's grown for its leaves); leave blank if you can't find one
- Bloom Image Credit: e.g. "Wikipedia — Gardenia carinata"

STORIES TAB: only if you added a new Species row, also add 2–3 rows of cultural, historical, mythological or scientific stories about this species from anywhere in the world:
- Species Key: exactly the same value as on the Species tab
- Title: short and evocative
- Region / Culture
- Story: 3–5 plain, warm sentences. Only things a reputable source supports; hedge anything uncertain with "is said to" or "often"
- Source: a book, article or website a reader could check
- Added By: a link to the source (web address)
- Timestamp: leave blank

Never invent facts. If you don't know something, leave that cell blank.
```

## Checking it worked

- **Species tab:** has a new row whose Species Key matches the first two words of the Botanical Name exactly.
- **Stories tab:** has 2–3 new rows with that same Species Key, each with a source link in Added By.
- **Missing image:** if the Bloom Image URL is blank, run **Olfactory Garden → Fetch missing bloom images** from the sheet menu.
- **Same species as an existing plant** (e.g. a second Golden Gardenia): no Species or Stories rows are added. The new plant shares the existing ones.
