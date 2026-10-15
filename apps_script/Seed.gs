/**
 * Starter content for the Species and Stories tabs.
 * setup() only fills EMPTY cells and adds stories whose title isn't already there,
 * so anything you or Wade edit in the sheet is never overwritten.
 * Seeded stories are marked "Seed — verify" in the Added By column.
 */

const SEED_SPECIES = {
  'Citrus microcarpa': {
    'Fragrance Family': 'Citrus (hesperidic)',
    'Scent Notes': 'Blossom: neroli-like, honeyed white floral. Peel: sharp lime-tangerine zest. Leaf: green, petitgrain-like.',
    'Where the Scent Lives': 'Flowers; peel when scratched; crushed leaves',
    'Peak Scent Time': 'Morning, when blossoms first open',
    'Key Aroma Molecules': 'Limonene (peel); linalool and methyl anthranilate (blossom)',
    'Perfumery Link': 'Neroli, petitgrain, lime / mandarin oils',
  },
  'Murraya paniculata': {
    'Fragrance Family': 'White floral — orange blossom',
    'Scent Notes': 'Sweet orange blossom and jasmine over a green, citrusy leaf.',
    'Where the Scent Lives': 'Flowers (carries far); crushed leaves',
    'Peak Scent Time': 'Evening into night',
    'Bloom Season': 'Flushes several times a year, often a few days after heavy rain',
    'Key Aroma Molecules': 'Linalool, methyl anthranilate, (E)-β-ocimene',
    'Perfumery Link': 'Orange flower absolute, neroli',
  },
  'Gardenia jasminoides': {
    'Fragrance Family': 'White floral — creamy / lactonic',
    'Scent Notes': 'Creamy, coconut-lactonic, green-mushroomy, with jasmine and tuberose facets.',
    'Where the Scent Lives': 'Flowers',
    'Peak Scent Time': 'Evening and warm, humid days',
    'Key Aroma Molecules': 'Methyl benzoate, linalool, tiglates (e.g. cis-3-hexenyl tiglate), benzyl acetate',
    'Perfumery Link': 'Almost never extracted commercially; perfumers rebuild it as an accord (e.g. GARDENIA F-TEC).',
  },
  'Cestrum nocturnum': {
    'Fragrance Family': 'White floral — indolic / nocturnal',
    'Scent Notes': 'Heady honey, jasmine and indole; sweet enough to feel heavy on still nights.',
    'Where the Scent Lives': 'Flowers, and only after dark',
    'Peak Scent Time': 'Dusk to around midnight',
    'Bloom Season': 'Repeated flushes through the warm months',
    'Key Aroma Molecules': 'Benzyl alcohol, phenylethyl alcohol, indolic facets',
    'Safety Note': 'All parts are toxic if eaten. Very strong scent can trigger headaches in sensitive people.',
  },
  'Bougainvillea spp.': {
    'Fragrance Family': 'Scentless — a structural plant',
    'Scent Notes': 'The colourful bracts have no fragrance. The true flowers are tiny and white, hidden inside.',
    'Safety Note': 'Sharp thorns.',
  },
  'Vallaris glabra': {
    'Fragrance Family': 'Gourmand floral',
    'Scent Notes': 'Steamed jasmine rice, pandan, toasted coconut.',
    'Where the Scent Lives': 'Flower clusters',
    'Key Aroma Molecules': '2-Acetyl-1-pyrroline (the same molecule that scents jasmine rice and pandan)',
    'Perfumery Link': 'Rice / pandan accords (Fragrant Rice F-TEC reference)',
    'Safety Note': 'Milky latex sap; avoid getting it in eyes.',
  },
  'Pogostemon cablin': {
    'Fragrance Family': 'Earthy / woody — base note',
    'Scent Notes': 'Fresh leaf: green, minty-camphor, earthy. The classic dark, wine-like patchouli only develops once leaves are dried and aged.',
    'Where the Scent Lives': 'Leaves (brush or crush them)',
    'Peak Scent Time': 'Any time. Strongest on warm afternoons.',
    'Key Aroma Molecules': 'Patchoulol (patchouli alcohol), norpatchoulenol',
    'Perfumery Link': 'Patchouli essential oil, a backbone of chypre and oriental perfumes',
  },
  'Strobilanthes nivea': {
    'Fragrance Family': 'Sweet / gourmand (coumarinic)',
    'Scent Notes': 'Bruised leaf: sweet hay, tonka bean, warm steamed pandan.',
    'Where the Scent Lives': 'Leaves (bruise gently)',
  },
  'Osmanthus fragrans': {
    'Fragrance Family': 'Fruity floral',
    'Scent Notes': 'Ripe apricot and peach skin, with suede-leather and black-tea undertones.',
    'Where the Scent Lives': 'Tiny flower clusters along the stems',
    'Peak Scent Time': 'Warm mornings and evenings',
    'Key Aroma Molecules': 'β-Ionone, γ-decalactone, linalool, dihydro-β-ionone',
    'Perfumery Link': 'Osmanthus absolute, one of the most expensive floral materials',
  },
};

// [Species Key, Title, Region / Culture, Story, Source]
const SEED_STORIES = [
  ['Citrus microcarpa', 'The everyday lime of the Philippines', 'Philippines',
    'Called kalamansi, this little citrus is squeezed over pancit, mixed with soy sauce and chili as a dipping sauce, and stirred into hot water with honey as a cold remedy. Most Filipino homes have a jar of it on the table.',
    'General ethnobotany; Wikipedia "Calamansi"'],
  ['Citrus microcarpa', 'Golden fruit for the New Year', 'Southern China / Chinese diaspora',
    'Small potted citrus trees full of gold fruit, including kumquats and calamondins, are given and displayed at Lunar New Year. The fruit stands for gold and abundance, and the Cantonese word for this kind of orange sounds like the word for luck.',
    'Lunar New Year customs'],
  ['Murraya paniculata', 'The fragrance that travels nine li', 'China',
    'In Chinese this plant is 九里香 (jiǔ lǐ xiāng), "nine-li fragrance". A li is an old unit of distance, about half a kilometre, so the name boasts that its scent carries for kilometres on a warm night.',
    'Chinese common name'],
  ['Gardenia jasminoides', 'A singer\'s signature flower', 'United States',
    'Billie Holiday made a white gardenia worn in her hair part of her stage image from the late 1930s. She later said she first pinned one on to hide a burn on her hair before a show.',
    'Billie Holiday biographies'],
  ['Gardenia jasminoides', 'The flower that dyes things yellow', 'China & Japan',
    'Gardenia fruit has been used for centuries as a golden-yellow dye for silk, and it still colours foods today. Japanese yellow pickled radish and chestnut sweets are examples. In Japanese the plant is kuchinashi. The name is often read as "no mouth", because the ripe fruit never splits open.',
    'Gardenia fruit (zhizi / kuchinashi) dye traditions'],
  ['Cestrum nocturnum', 'Queen of the Night', 'South Asia & Thailand',
    'Across India and Pakistan this plant is raat ki rani, "queen of the night", and it is a favourite image for longing in songs and poetry. Its Thai name ราตรี (ratree) simply means "night". The flowers look plain by day and only release their scent after dark.',
    'Hindi/Urdu & Thai common names'],
  ['Bougainvillea spp.', 'Named for an admiral, likely found by a woman in disguise', 'France / Brazil',
    'The plant is named for Louis-Antoine de Bougainville, whose ship sailed around the world in 1766–69. The botanist Philibert Commerson described it in Brazil. He was helped by Jeanne Baret, who had disguised herself as a man to join the voyage. She is widely credited with collecting the specimen, and she became the first woman known to have sailed around the world.',
    'Glynis Ridley, "The Discovery of Jeanne Baret" (2010)'],
  ['Vallaris glabra', 'Why a vine smells like rice', 'Thailand / Southeast Asia',
    'Thai chommanat flowers smell like freshly cooked rice for a chemical reason. They contain 2-acetyl-1-pyrroline, the same molecule behind jasmine rice and pandan leaf. One molecule links three very different plants.',
    'Wongpornchai et al., Food Chemistry (2003) — 2AP in Vallaris glabra'],
  ['Pogostemon cablin', 'The scent of a real Kashmir shawl', 'India → Europe, 1800s',
    'In the 19th century, shawls from Kashmir were packed with dried patchouli leaves to keep moths away on the long voyage to Europe. European buyers came to expect the smell, and a shawl without it was suspected of being a fake. Some European weavers began scenting their own shawls with patchouli to make them sell.',
    'History of patchouli in perfumery'],
  ['Osmanthus fragrans', 'The tree on the moon', 'China',
    'Chinese legend says an osmanthus tree grows on the moon. A man named Wu Gang was condemned to chop it down forever, but the cut heals each time. Osmanthus blooms around the Mid-Autumn (Moon) Festival, when people drink osmanthus wine and eat osmanthus sweets. "Plucking osmanthus in the moon palace" was once a saying for passing the imperial exams.',
    'Chinese folklore; Mid-Autumn Festival customs'],
];

function seedSpeciesAndStories_() {
  const ss = SpreadsheetApp.getActive();

  const species = ss.getSheetByName(CFG.SPECIES_SHEET);
  const t = readTable_(species);
  t.rows.forEach(function (r, i) {
    const seed = SEED_SPECIES[r['Species Key']];
    if (!seed) return;
    Object.keys(seed).forEach(function (h) {
      const col = t.headers.indexOf(h);
      if (col >= 0 && !r[h]) species.getRange(t.firstDataRow + i, col + 1).setValue(seed[h]);
    });
  });

  const stories = ss.getSheetByName(CFG.STORIES_SHEET);
  const have = readTable_(stories).rows.map(function (r) { return r['Species Key'] + '|' + r['Title']; });
  const now = new Date();
  const rows = SEED_STORIES
    .filter(function (s) { return have.indexOf(s[0] + '|' + s[1]) === -1; })
    .map(function (s) { return s.concat(['Seed — verify', now]); });
  if (rows.length) stories.getRange(stories.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}
