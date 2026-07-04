// The article corpus for Encyclopedia 98. Written in the confident, slightly
// breathless voice of a mid-90s multimedia encyclopedia — knowledge as it stood
// in 1998, played entirely straight. Kept as plain data (no React) so the search,
// trivia and article-of-the-day logic can import it in pure unit tests.

export type CategoryId =
  | 'history'
  | 'science'
  | 'geography'
  | 'technology'
  | 'arts'
  | 'sports'
  | 'life1998';

/** Keys of the inline SVG diagrams in illustrations.tsx. */
export type IllustrationKey =
  | 'solar-system'
  | 'dino-scale'
  | 'modem'
  | 'heart'
  | 'volcano'
  | 'photosynthesis'
  | 'compact-disc';

export interface Category {
  id: CategoryId;
  name: string;
  /** One-line description shown on the home screen category grid. */
  blurb: string;
}

export interface ArticleMedia {
  illustration: IllustrationKey;
  caption: string;
}

export interface FactBoxEntry {
  label: string;
  value: string;
}

/** A single multiple-choice question, used to build the MindMaze trivia game. */
export interface ArticleQuiz {
  question: string;
  answer: string;
  /** Three wrong answers; shuffled with the right one at play time. */
  distractors: string[];
}

export interface Article {
  id: string;
  title: string;
  category: CategoryId;
  /** One sentence, shown in the article list and search results. */
  summary: string;
  /** Body paragraphs, ~120–200 words in total. */
  body: string[];
  /** Ids of related articles, rendered as "see also" chips. */
  seeAlso: string[];
  media?: ArticleMedia;
  factbox?: FactBoxEntry[];
  /** Extra search terms not present in the title/summary/body. */
  keywords?: string[];
  quiz?: ArticleQuiz;
}

export const CATEGORIES: Category[] = [
  { id: 'history', name: 'History', blurb: 'Empires, inventions and turning points of the past.' },
  { id: 'science', name: 'Science & Nature', blurb: 'The living world and the laws that govern it.' },
  { id: 'geography', name: 'Geography', blurb: 'The continents, mountains and wild places of the Earth.' },
  { id: 'technology', name: 'Technology', blurb: 'The machines and networks remaking the modern world.' },
  { id: 'arts', name: 'Arts', blurb: 'The painters, players and musicians of every age.' },
  { id: 'sports', name: 'Sports & Leisure', blurb: 'Games, champions and the pastimes of millions.' },
  { id: 'life1998', name: 'Life in 1998', blurb: 'The gadgets, crazes and worries of the present day.' },
];

export const ARTICLES: Article[] = [
  // ===================== HISTORY =====================
  {
    id: 'ancient-egypt',
    title: 'Ancient Egypt',
    category: 'history',
    summary: 'The kingdom of the Nile, where god-kings raised pyramids that still stand after 4,500 years.',
    body: [
      "For nearly three thousand years the civilisation of ancient Egypt flourished along the banks of the River Nile, whose yearly flood laid down the black silt that made farming possible in a desert land. From this narrow ribbon of green arose one of the most enduring cultures in human history, ruled by god-kings called pharaohs.",
      "The Egyptians were master builders. The Great Pyramid at Giza, raised for the pharaoh Khufu around 2560 B.C., stood as the tallest structure on Earth for more than four thousand years. They wrote in a system of picture-signs known as hieroglyphics, mummified their dead in the belief that the soul lived on, and worshipped a great family of gods such as Ra, Osiris and Isis. Much of what we know was unlocked in 1822, when scholars used the Rosetta Stone to read hieroglyphics at last.",
    ],
    seeAlso: ['roman-empire', 'printing-press'],
    factbox: [
      { label: 'Flourished', value: 'c. 3100–30 B.C.' },
      { label: 'Great Pyramid', value: 'c. 2560 B.C.' },
    ],
    keywords: ['pharaoh', 'pyramid', 'nile', 'hieroglyphics', 'mummy', 'giza'],
    quiz: {
      question: 'The yearly flood of which river made farming possible in ancient Egypt?',
      answer: 'The Nile',
      distractors: ['The Amazon', 'The Tigris', 'The Congo'],
    },
  },
  {
    id: 'roman-empire',
    title: 'The Roman Empire',
    category: 'history',
    summary: 'From a city on seven hills to an empire that ringed the Mediterranean with roads, law and legions.',
    body: [
      "At its height around A.D. 117 the Roman Empire stretched from the misty frontier of Britain to the deserts of Arabia, governing some sixty million people. What began as a small city-state on the River Tiber grew, through the discipline of its legions and the genius of its engineers, into the greatest power the ancient world had known.",
      "The Romans gave us far more than conquest. Their network of straight paved roads — over fifty thousand miles of them — bound the empire together, and their aqueducts carried fresh water across valleys on graceful stone arches. Roman law, Roman concrete and the Latin language shaped the civilisation of Europe for centuries after the western empire finally fell in A.D. 476. Even the calendar we use today descends from the reforms of Julius Caesar.",
    ],
    seeAlso: ['ancient-egypt', 'printing-press'],
    factbox: [
      { label: 'Founded', value: 'traditionally 753 B.C.' },
      { label: 'Western fall', value: 'A.D. 476' },
    ],
    keywords: ['rome', 'caesar', 'legion', 'aqueduct', 'colosseum', 'latin'],
    quiz: {
      question: 'In which year did the western Roman Empire fall?',
      answer: 'A.D. 476',
      distractors: ['A.D. 1066', '753 B.C.', 'A.D. 1215'],
    },
  },
  {
    id: 'printing-press',
    title: 'The Printing Press',
    category: 'history',
    summary: "Gutenberg's press of movable type put books — and ideas — within reach of the common reader.",
    body: [
      "Around 1450, in the German city of Mainz, a goldsmith named Johannes Gutenberg perfected a machine that would change the world more surely than any army: the printing press with movable metal type. Before it, every book had to be copied by hand, a labour of months that made books rare and costly. Gutenberg's press could produce them by the hundred.",
      "The famous Gutenberg Bible was among the first fruits of the new art. Within fifty years presses had spread across Europe, and the number of books in existence leapt from thousands to millions. Ordinary people could now own the written word. Historians credit the press with fuelling the Renaissance, the Reformation and the Scientific Revolution. It remains, five centuries on, the ancestor of every newspaper, paperback and — some say — every computer screen.",
    ],
    seeAlso: ['roman-empire', 'the-internet'],
    factbox: [
      { label: 'Invented', value: 'c. 1450' },
      { label: 'By', value: 'Johannes Gutenberg' },
    ],
    keywords: ['gutenberg', 'book', 'movable type', 'renaissance', 'mainz'],
    quiz: {
      question: 'Who perfected the printing press with movable type around 1450?',
      answer: 'Johannes Gutenberg',
      distractors: ['Leonardo da Vinci', 'Thomas Edison', 'Isaac Newton'],
    },
  },
  {
    id: 'the-titanic',
    title: 'The Titanic',
    category: 'history',
    summary: "The 'unsinkable' liner that struck an iceberg in 1912 — and, in 1997, the biggest film ever made.",
    body: [
      "On the night of 14 April 1912, the White Star liner R.M.S. Titanic, the largest moving object ever built and widely believed to be unsinkable, struck an iceberg in the North Atlantic on her maiden voyage. In under three hours she foundered, and more than 1,500 of the roughly 2,200 souls aboard were lost, for the ship carried lifeboats for barely half her passengers.",
      "The wreck lay undiscovered until 1985, when Dr Robert Ballard found it two and a half miles down. The disaster has never loosened its grip on the public imagination. In 1997 the director James Cameron told the story afresh in a motion picture that became the highest-grossing film in history and swept the Academy Awards, sending a whole new generation to read about that terrible, star-lit night.",
    ],
    seeAlso: ['antarctica'],
    factbox: [
      { label: 'Sank', value: '15 April 1912' },
      { label: 'Lives lost', value: '~1,500' },
      { label: 'Film released', value: '1997' },
    ],
    keywords: ['ship', 'iceberg', 'cameron', 'white star', 'shipwreck', 'atlantic'],
    quiz: {
      question: 'What did the Titanic strike on the night of 14 April 1912?',
      answer: 'An iceberg',
      distractors: ['A German U-boat', 'A coral reef', 'Another ocean liner'],
    },
  },
  {
    id: 'great-wall',
    title: 'The Great Wall of China',
    category: 'history',
    summary: 'A rampart of earth and stone that snakes for thousands of miles across northern China.',
    body: [
      "The Great Wall of China is the longest structure ever built by human hands. Winding across mountains and deserts for some four thousand miles, it was raised over many centuries by successive dynasties to guard the empire's northern frontier against raiders from the steppe. The grandest sections that visitors climb today, faced in brick and stone, were built by the Ming dynasty between the 14th and 17th centuries.",
      "It is a popular myth that the wall is the only man-made object visible from the Moon; in truth it is far too narrow to be seen with the naked eye from space. Yet it remains a wonder all the same — a reminder of the immense labour of the countless workers, soldiers and convicts who built it, many of whom died and were buried in its very shadow.",
    ],
    seeAlso: ['ancient-egypt'],
    factbox: [
      { label: 'Length', value: '~4,000 miles' },
      { label: 'Grandest parts', value: 'Ming dynasty' },
    ],
    keywords: ['china', 'wall', 'ming', 'fortification', 'dynasty'],
    quiz: {
      question: 'The Great Wall of China was built chiefly to defend against invaders from which direction?',
      answer: 'The north',
      distractors: ['The south', 'The sea to the east', 'The Himalayas'],
    },
  },

  // ===================== SCIENCE & NATURE =====================
  {
    id: 'volcanoes',
    title: 'Volcanoes',
    category: 'science',
    summary: 'Windows into the molten heart of the Earth, where liquid rock breaks through to the surface.',
    body: [
      "A volcano is an opening in the Earth's crust through which molten rock, ash and gas escape from deep below. The molten rock is called magma while it remains underground, and lava once it reaches the surface. Most volcanoes lie along the edges of the great plates that make up the Earth's crust, and the majority of the world's active volcanoes ring the Pacific Ocean in a belt known as the Ring of Fire.",
      "Eruptions can be quietly effusive, oozing rivers of lava, or catastrophically explosive. The eruption of Mount St Helens in the United States in 1980 tore away the top of the mountain in seconds. Ash thrown high into the atmosphere can even cool the whole planet for a year or two. Yet volcanic soils are among the most fertile on Earth, which is why people have always farmed in their shadow.",
    ],
    seeAlso: ['mount-everest'],
    media: {
      illustration: 'volcano',
      caption: 'A cross-section of a stratovolcano, showing the magma chamber deep below, the central vent, and the cone built of layered ash and lava.',
    },
    factbox: [
      { label: 'Ring of Fire', value: '~75% of active volcanoes' },
      { label: 'Lava temperature', value: 'up to 1,250°C' },
    ],
    keywords: ['eruption', 'magma', 'lava', 'ring of fire', 'crater'],
    quiz: {
      question: 'Molten rock is called lava once it reaches the surface. What is it called while still underground?',
      answer: 'Magma',
      distractors: ['Basalt', 'Pumice', 'Cinder'],
    },
  },
  {
    id: 'human-heart',
    title: 'The Human Heart',
    category: 'science',
    summary: 'A tireless muscular pump that drives blood on its endless journey through the body.',
    body: [
      "The heart is a muscle about the size of a clenched fist, sitting behind the breastbone a little to the left of centre. It is the engine of the circulatory system, and it never rests: in an average lifetime it beats some two and a half billion times without pause.",
      "The heart has four chambers. The two upper chambers, the atria, receive blood; the two lower chambers, the ventricles, pump it out. Blood returning from the body enters the right side, is sent to the lungs to collect oxygen, comes back to the left side, and is then driven with great force to every corner of the body through vessels called arteries. Beating roughly seventy times a minute, this remarkable pump moves the body's entire supply of blood — around five litres — on a complete round trip in well under a minute.",
    ],
    seeAlso: ['photosynthesis'],
    media: {
      illustration: 'heart',
      caption: 'The four chambers of the human heart. Blue shows blood returning from the body; red shows freshly oxygenated blood setting out again.',
    },
    factbox: [
      { label: 'Beats per day', value: '~100,000' },
      { label: 'Chambers', value: '4' },
    ],
    keywords: ['blood', 'circulation', 'artery', 'ventricle', 'organ', 'pulse'],
    quiz: {
      question: 'How many chambers does the human heart have?',
      answer: 'Four',
      distractors: ['Two', 'Three', 'Six'],
    },
  },
  {
    id: 'photosynthesis',
    title: 'Photosynthesis',
    category: 'science',
    summary: 'The green magic by which plants make food from sunlight, air and water.',
    body: [
      "Photosynthesis is the process by which green plants make their own food, and it is arguably the most important chemical reaction on Earth. Using the energy of sunlight, captured by the green pigment chlorophyll, a plant combines carbon dioxide drawn from the air with water drawn up through its roots. From these simple ingredients it manufactures sugar, which fuels its growth, and releases oxygen as a by-product.",
      "That oxygen is the same gas that animals — including ourselves — must breathe to live. Nearly all the oxygen in the atmosphere was put there by plants and by tiny drifting sea-plants called plankton. In this quiet, ceaseless way the world's forests and oceans renew the very air we breathe, and every meal we eat can be traced back to a green leaf turning sunlight into life.",
    ],
    seeAlso: ['human-heart', 'amazon-rainforest'],
    media: {
      illustration: 'photosynthesis',
      caption: 'A leaf takes in carbon dioxide and water and, using the energy of sunlight, makes sugar and gives off oxygen.',
    },
    factbox: [
      { label: 'Powered by', value: 'sunlight' },
      { label: 'Gives off', value: 'oxygen' },
    ],
    keywords: ['plant', 'chlorophyll', 'leaf', 'oxygen', 'carbon dioxide', 'sunlight'],
    quiz: {
      question: 'Which gas do plants release as a by-product of photosynthesis?',
      answer: 'Oxygen',
      distractors: ['Carbon dioxide', 'Nitrogen', 'Hydrogen'],
    },
  },
  {
    id: 'dinosaurs',
    title: 'Dinosaurs',
    category: 'science',
    summary: "The 'terrible lizards' that ruled the Earth for 160 million years before vanishing.",
    body: [
      "Dinosaurs were a group of reptiles that dominated the land for over 160 million years, from around 230 million years ago until their sudden disappearance 65 million years ago. Their name, coined in 1842, means 'terrible lizard'. They ranged from creatures no bigger than a chicken to the mighty Brachiosaurus, which stood taller than a four-storey house, and the terrible hunter Tyrannosaurus rex.",
      "Everything we know of them we owe to fossils — bones and footprints turned to stone over countless ages. Most scientists now believe the dinosaurs were wiped out when a giant asteroid struck the Earth, throwing up so much dust that the Sun was blotted out and the climate collapsed. Yet they may not be wholly gone: many palaeontologists now argue that the very birds in our gardens are the living descendants of the dinosaurs.",
    ],
    seeAlso: ['volcanoes', 'solar-system'],
    media: {
      illustration: 'dino-scale',
      caption: 'A size comparison: the towering Brachiosaurus, the fearsome Tyrannosaurus rex, and a human being, all drawn to the same scale.',
    },
    factbox: [
      { label: 'Reigned', value: '~230–65 million years ago' },
      { label: 'Name means', value: "'terrible lizard'" },
    ],
    keywords: ['fossil', 'reptile', 'tyrannosaurus', 'trex', 'asteroid', 'extinction', 'jurassic'],
    quiz: {
      question: "What does the word 'dinosaur' mean?",
      answer: 'Terrible lizard',
      distractors: ['Giant reptile', 'Ancient beast', 'Thunder foot'],
    },
  },
  {
    id: 'solar-system',
    title: 'The Solar System',
    category: 'science',
    summary: 'The Sun and its family of nine planets, held in their orbits by the pull of gravity.',
    body: [
      "The Solar System is the Sun together with everything held captive by its gravity: nine planets, their many moons, and countless asteroids and comets. The Sun itself is an ordinary star, a vast ball of burning gas so large that a million Earths could fit inside it, and it holds more than 99 per cent of all the matter in the system.",
      "The planets fall into two families. The four inner worlds — Mercury, Venus, Earth and Mars — are small and rocky. Beyond the asteroid belt lie the four giants — Jupiter, Saturn, Uranus and Neptune — great balls of gas and liquid, Saturn famous for its shining rings. Farthest out, tiny and cold, circles Pluto. Only one world, so far as we know, teems with life: our own blue planet, third from the Sun.",
    ],
    seeAlso: ['pluto', 'space-shuttle', 'dinosaurs'],
    media: {
      illustration: 'solar-system',
      caption: 'The nine planets in order from the Sun: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, and distant Pluto.',
    },
    factbox: [
      { label: 'Planets', value: '9' },
      { label: 'The Sun holds', value: '>99% of all mass' },
    ],
    keywords: ['sun', 'planet', 'jupiter', 'saturn', 'mars', 'orbit', 'gravity', 'space'],
    quiz: {
      question: 'Which is the largest planet in the Solar System?',
      answer: 'Jupiter',
      distractors: ['Saturn', 'Earth', 'Neptune'],
    },
  },
  {
    id: 'pluto',
    title: 'Pluto (planet)',
    category: 'science',
    summary: "The smallest and most distant planet, a frozen world at the edge of the Sun's realm.",
    body: [
      "Pluto, discovered in 1930 by the American astronomer Clyde Tombaugh, is the ninth and outermost planet of the Solar System. It is a tiny, frozen world — smaller even than our own Moon — orbiting so far from the Sun that a single Pluto year lasts 248 Earth years. From its surface the Sun would appear as little more than a very bright star.",
      "Pluto is a curious member of the planetary family. Its orbit is so tilted and stretched that for twenty years at a time it actually swings closer to the Sun than Neptune, as it does between 1979 and 1999. It has a large companion moon, Charon, discovered in 1978. No spacecraft has yet visited this distant outpost, and much about the little world remains a mystery to the astronomers who still debate its exact nature.",
    ],
    seeAlso: ['solar-system'],
    factbox: [
      { label: 'Discovered', value: '1930' },
      { label: 'Year length', value: '248 Earth years' },
    ],
    keywords: ['planet', 'tombaugh', 'charon', 'neptune', 'dwarf', 'ninth planet'],
    quiz: {
      question: 'Who discovered Pluto in 1930?',
      answer: 'Clyde Tombaugh',
      distractors: ['Galileo Galilei', 'Edwin Hubble', 'Isaac Newton'],
    },
  },
  {
    id: 'dolly-the-sheep',
    title: 'Dolly the Sheep',
    category: 'science',
    summary: 'The first mammal cloned from an adult cell, and the most famous sheep in the world.',
    body: [
      "In February 1997 scientists at the Roslin Institute near Edinburgh announced an achievement that many had thought impossible: they had cloned a sheep. Dolly, born the previous July, was the first mammal ever created from a single cell taken from an adult animal. She was, in effect, an identical twin of her mother, born years apart.",
      "Dolly's arrival caused a sensation and a storm of debate. If a sheep could be cloned, people asked, could a human being be next? Ethicists, church leaders and governments hurried to consider the question, while scientists saw enormous promise in the technique for medicine and farming. Dolly — named, it is said, after the singer Dolly Parton — lives a fairly ordinary life at the institute, and has become a mother the natural way. She stands as the symbol of a new and controversial age of biology.",
    ],
    seeAlso: ['human-heart'],
    factbox: [
      { label: 'Born', value: 'July 1996' },
      { label: 'Announced', value: 'February 1997' },
      { label: 'Where', value: 'Roslin Institute, Scotland' },
    ],
    keywords: ['clone', 'cloning', 'genetics', 'roslin', 'dna', 'biology'],
    quiz: {
      question: 'What kind of animal was Dolly, the first clone from an adult cell?',
      answer: 'A sheep',
      distractors: ['A cow', 'A mouse', 'A goat'],
    },
  },
  {
    id: 'electricity',
    title: 'Electricity',
    category: 'science',
    summary: 'The flow of tiny charged particles that lights our homes and powers the modern age.',
    body: [
      "Electricity is a form of energy carried by the movement of tiny charged particles called electrons. Though people had marvelled at lightning and static sparks since ancient times, it was only in the 18th and 19th centuries that scientists such as Benjamin Franklin and Michael Faraday learned to understand and harness it.",
      "An electric current is simply a stream of electrons flowing through a wire, much as water flows through a pipe. In a power station, huge generators spin coils of wire within magnets to produce this current, which then travels along cables to our homes. There it lights our lamps, warms our toasters and drives the motors in a hundred machines. It was Thomas Edison who, in 1879, produced a practical electric light bulb, and within a single generation the electric light had banished the darkness from the world's great cities.",
    ],
    seeAlso: ['compact-disc', 'the-internet'],
    factbox: [
      { label: 'Carried by', value: 'electrons' },
      { label: 'Light bulb', value: 'Edison, 1879' },
    ],
    keywords: ['electron', 'current', 'edison', 'faraday', 'power', 'voltage', 'circuit'],
    quiz: {
      question: 'The flow of which tiny charged particles makes up an electric current?',
      answer: 'Electrons',
      distractors: ['Atoms', 'Photons', 'Protons'],
    },
  },
  {
    id: 'el-nino',
    title: 'The El Niño of 1997–98',
    category: 'science',
    summary: "A vast warming of the Pacific that turned the world's weather upside down.",
    body: [
      "El Niño is a natural warming of the surface waters of the eastern Pacific Ocean that occurs every few years and throws the world's weather into confusion. The name, meaning 'the Christ Child' in Spanish, was given by Peruvian fishermen because the warm water often arrives around Christmas.",
      "The El Niño of 1997 and 1998 was among the strongest ever recorded. As the warm pool of water shifted eastward, the ordinary pattern of winds and rains broke down across the globe. California and Peru were battered by floods and mudslides; Indonesia and Australia suffered drought and terrible forest fires; and freak storms struck many other regions. The event has cost billions of dollars and many lives, and has taught scientists a great deal about how the oceans and the atmosphere work together to shape the weather of the whole planet.",
    ],
    seeAlso: ['volcanoes'],
    factbox: [
      { label: 'Name means', value: "'The Christ Child'" },
      { label: 'Peak', value: '1997–1998' },
    ],
    keywords: ['weather', 'pacific', 'ocean', 'climate', 'flood', 'drought'],
    quiz: {
      question: 'The weather event El Niño is a warming of which ocean?',
      answer: 'The Pacific',
      distractors: ['The Atlantic', 'The Indian', 'The Arctic'],
    },
  },

  // ===================== GEOGRAPHY =====================
  {
    id: 'antarctica',
    title: 'Antarctica',
    category: 'geography',
    summary: 'The coldest, windiest, driest continent — a frozen wilderness at the bottom of the world.',
    body: [
      "Antarctica is the continent surrounding the South Pole, and it is a land of superlatives: the coldest, the windiest, the driest and the highest continent on Earth. Almost the whole of it — some 98 per cent — lies buried beneath an ice sheet that is, in places, nearly three miles thick. This single sheet holds around seven-tenths of all the fresh water in the world.",
      "No people live there permanently. The only human inhabitants are the scientists who man the research stations, studying everything from penguins to the hole in the ozone layer discovered above the pole. By an international treaty signed in 1959 the whole continent is set aside for peaceful scientific research, owned by no nation. The lowest temperature ever recorded anywhere on Earth — nearly minus 90 degrees Celsius — was measured here, at the Russian Vostok station.",
    ],
    seeAlso: ['mount-everest'],
    factbox: [
      { label: 'Ice holds', value: '~70% of world fresh water' },
      { label: 'Coldest recorded', value: '−89°C' },
    ],
    keywords: ['south pole', 'ice', 'penguin', 'continent', 'ozone', 'cold'],
    quiz: {
      question: 'Which continent surrounds the South Pole?',
      answer: 'Antarctica',
      distractors: ['Australia', 'Greenland', 'Siberia'],
    },
  },
  {
    id: 'mount-everest',
    title: 'Mount Everest',
    category: 'geography',
    summary: 'At over 29,000 feet, the highest mountain on Earth and the ultimate prize of climbers.',
    body: [
      "Mount Everest, standing on the border of Nepal and Tibet in the Himalayas, is the highest mountain on Earth. Its summit reaches 29,028 feet — about five and a half miles — above sea level, so high that the air holds barely a third of the oxygen found at sea level, and jet streams can lash the peak with hurricane-force winds. The Tibetans call it Chomolungma, 'Goddess Mother of the World'.",
      "For decades the mountain defeated every attempt to climb it. Then, on 29 May 1953, the New Zealander Edmund Hillary and the Sherpa Tenzing Norgay became the first to stand on the roof of the world. Since then hundreds have followed, though the mountain remains deadly: many climbers have perished on its slopes, and the thin 'death zone' near the summit allows no long stay. Everest is, quite literally, still growing by a few millimetres each year.",
    ],
    seeAlso: ['antarctica', 'volcanoes'],
    factbox: [
      { label: 'Height', value: '29,028 ft' },
      { label: 'First climbed', value: '29 May 1953' },
    ],
    keywords: ['mountain', 'himalaya', 'hillary', 'tenzing', 'nepal', 'climb', 'peak'],
    quiz: {
      question: 'Who, with Tenzing Norgay, first reached the summit of Everest in 1953?',
      answer: 'Edmund Hillary',
      distractors: ['Robert Scott', 'George Mallory', 'Roald Amundsen'],
    },
  },
  {
    id: 'amazon-rainforest',
    title: 'The Amazon Rainforest',
    category: 'geography',
    summary: 'The largest rainforest on Earth, a green ocean of trees teeming with life.',
    body: [
      "The Amazon rainforest of South America is the largest tropical forest in the world, covering more than two million square miles, most of it in Brazil. It is drained by the mighty Amazon River, which carries more water than the next several largest rivers combined. So vast and so dense is the forest that it is often called the 'lungs of the planet', for its countless trees breathe out a great share of the world's oxygen.",
      "No place on Earth is richer in life. A single square mile may hold more kinds of tree than the whole of Europe, and scientists believe that millions of insect species there have never even been named. Yet the forest is under threat. Each year great tracts are cleared by burning for farms and cattle ranches, and conservationists warn that this destruction endangers not only countless species but the balance of the world's climate itself.",
    ],
    seeAlso: ['photosynthesis'],
    factbox: [
      { label: 'Mostly in', value: 'Brazil' },
      { label: 'Nicknamed', value: "'lungs of the planet'" },
    ],
    keywords: ['jungle', 'brazil', 'amazon river', 'tropical', 'forest', 'rainforest'],
    quiz: {
      question: 'In which country does most of the Amazon rainforest lie?',
      answer: 'Brazil',
      distractors: ['Mexico', 'India', 'Congo'],
    },
  },

  // ===================== TECHNOLOGY =====================
  {
    id: 'the-internet',
    title: 'The Internet',
    category: 'technology',
    summary: 'The global network of computers that is fast becoming the information highway of the age.',
    body: [
      "The Internet is a vast network that links millions of computers around the world, allowing them to share information almost instantly. It grew out of a project begun by the United States military in the late 1960s, and for years remained the preserve of scientists and universities. All that changed in the 1990s with the invention of the World Wide Web, which made the network easy enough for anyone to use.",
      "Today a person with a home computer, a modem and a telephone line can send electronic mail across the world in seconds, read newspapers from distant countries, or 'surf' from one Web page to the next. The network is growing at a breathless pace: already some experts predict that the number of users may reach 100 million by the year 2005. What the Internet will finally become, no one can yet say.",
    ],
    seeAlso: ['the-modem', 'year-2000-problem', 'printing-press', 'getting-online'],
    factbox: [
      { label: 'Grew from', value: 'US military network, 1969' },
      { label: 'The Web arrived', value: 'early 1990s' },
    ],
    keywords: ['web', 'world wide web', 'email', 'online', 'network', 'surf', 'www'],
    quiz: {
      question: 'The Internet grew out of a network first built in the late 1960s by whom?',
      answer: 'The United States military',
      distractors: ['Microsoft', 'The United Nations', 'British Telecom'],
    },
  },
  {
    id: 'compact-disc',
    title: 'The Compact Disc',
    category: 'technology',
    summary: 'A shining disc of plastic that stores music and data as microscopic pits read by a laser.',
    body: [
      "The compact disc, or CD, is a shining platter of plastic and aluminium, twelve centimetres across, that has transformed the way we store sound and information. Introduced in 1982, it swept away the vinyl record and the cassette tape within a decade by offering clear sound that never wears out with playing.",
      "The secret of the CD is that it stores information not as a groove but as a spiral track of microscopic pits, so small that a single disc holds a track over three miles long if unwound. A tiny laser beam, not a needle, reads these pits as the disc spins, turning them into the numbers a computer understands. The same technology gave us the CD-ROM, which can hold an entire encyclopedia — pictures, sound and all — on one disc, and the recordable CD, on which a home computer can store its own files.",
    ],
    seeAlso: ['electricity'],
    media: {
      illustration: 'compact-disc',
      caption: 'A laser beam reads the spiral track of microscopic pits pressed into the underside of a compact disc.',
    },
    factbox: [
      { label: 'Introduced', value: '1982' },
      { label: 'Diameter', value: '12 cm' },
    ],
    keywords: ['cd', 'cd-rom', 'laser', 'music', 'disc', 'digital'],
    quiz: {
      question: 'What reads the information on a compact disc?',
      answer: 'A laser beam',
      distractors: ['A steel needle', 'A magnet', 'A tiny brush'],
    },
  },
  {
    id: 'deep-blue',
    title: 'Deep Blue',
    category: 'technology',
    summary: 'The IBM chess computer that defeated the world champion Garry Kasparov in 1997.',
    body: [
      "Deep Blue was a chess-playing computer built by the IBM company, and in May 1997 it achieved something no machine had done before: it defeated the reigning world chess champion, Garry Kasparov, in a full match under tournament conditions. The final score was three and a half games to two and a half.",
      "Deep Blue won not by cleverness of the human kind but by sheer speed, examining as many as 200 million chess positions every second and choosing the strongest reply. Kasparov, widely held to be the finest player who ever lived, was visibly shaken by the defeat and accused the machine of showing an almost human intuition. Watched around the world, the match raised profound questions about the nature of thought and whether machines might one day truly think.",
    ],
    seeAlso: ['chess', 'the-internet'],
    factbox: [
      { label: 'Match', value: 'May 1997' },
      { label: 'Speed', value: '~200 million positions/second' },
    ],
    keywords: ['ibm', 'chess', 'kasparov', 'computer', 'artificial intelligence', 'ai'],
    quiz: {
      question: "Which world chess champion did IBM's Deep Blue defeat in 1997?",
      answer: 'Garry Kasparov',
      distractors: ['Bobby Fischer', 'Anatoly Karpov', 'Boris Spassky'],
    },
  },
  {
    id: 'space-shuttle',
    title: 'The Space Shuttle',
    category: 'technology',
    summary: "The world's first reusable spacecraft, launched like a rocket and landing like a glider.",
    body: [
      "The Space Shuttle, flown by the American space agency NASA since 1981, was the first spacecraft designed to be used again and again. Earlier rockets were thrown away after a single flight; the Shuttle blasts off like a rocket, circles the Earth as a spacecraft, and then glides back to land on a runway like an aeroplane, ready to fly once more.",
      "A fleet of these winged orbiters has carried satellites into space, lofted the Hubble Space Telescope, and ferried crews to build space stations. The programme has known tragedy: in 1986 the shuttle Challenger was destroyed shortly after launch, killing all seven aboard, a disaster watched live by millions. Yet the Shuttle flies on, and is now the workhorse for the building of a great new International Space Station, a project drawing together the United States, Russia and many other nations in orbit above our heads.",
    ],
    seeAlso: ['mir-space-station', 'solar-system'],
    factbox: [
      { label: 'First flight', value: '1981' },
      { label: 'Lands like', value: 'a glider' },
    ],
    keywords: ['nasa', 'rocket', 'spacecraft', 'challenger', 'orbit', 'astronaut'],
    quiz: {
      question: 'What made the Space Shuttle different from earlier spacecraft?',
      answer: 'It could be reused',
      distractors: ['It was unmanned', 'It could reach the Moon', 'It never left orbit'],
    },
  },
  {
    id: 'mir-space-station',
    title: 'Mir Space Station',
    category: 'technology',
    summary: 'Russia\'s orbiting outpost, where cosmonauts have lived in space for years at a time.',
    body: [
      "Mir, whose name means both 'peace' and 'world' in Russian, is a space station that has orbited the Earth since 1986. Built up piece by piece over ten years, it was the first station where human beings could live and work in space for very long periods; one cosmonaut, Dr Valeri Polyakov, stayed aboard for a record 438 days without once returning to Earth.",
      "For much of the 1990s Mir was the only permanently manned outpost in space, and in a remarkable turn after the Cold War, American astronauts came to live aboard the Russian station as partners. Life on Mir has not been without alarms — a fire and a collision with a supply craft in 1997 gave its crews some anxious days. Now growing old, Mir is nearing the end of its long service, its work about to pass to the new International Space Station.",
    ],
    seeAlso: ['space-shuttle'],
    factbox: [
      { label: 'Launched', value: '1986' },
      { label: 'Name means', value: "'peace' / 'world'" },
    ],
    keywords: ['russia', 'cosmonaut', 'space station', 'orbit', 'soviet'],
    quiz: {
      question: 'Mir, the space station, was built and operated by which country?',
      answer: 'Russia',
      distractors: ['The United States', 'China', 'France'],
    },
  },
  {
    id: 'year-2000-problem',
    title: 'The Year 2000 Problem',
    category: 'technology',
    summary: "The 'Millennium Bug' — a lurking flaw that could confuse the world's computers on 1 January 2000.",
    body: [
      "The Year 2000 Problem, widely known as the 'Millennium Bug' or 'Y2K', is a flaw hidden in a great many of the world's computers. To save precious memory in the early days of computing, programmers often recorded the year using only its last two digits — writing 1998 as simply '98'. The trouble is that when the year 2000 arrives, such machines may read '00' as 1900, and become hopelessly confused.",
      "Experts warn that unless the fault is put right, computers controlling banks, power stations, aircraft and much else could fail or behave strangely as the new century dawns. Around the world, companies and governments are now spending enormous sums — hundreds of billions of dollars in all — to hunt down and correct the bug before the fateful stroke of midnight on 31 December 1999. Whether these efforts will prove sufficient, only the first morning of the new millennium will reveal.",
    ],
    seeAlso: ['the-internet', 'millennium-bug-home'],
    factbox: [
      { label: 'Also called', value: 'Y2K / Millennium Bug' },
      { label: 'Deadline', value: '1 January 2000' },
    ],
    keywords: ['y2k', 'millennium bug', 'computer', 'bug', '2000', 'date'],
    quiz: {
      question: 'Why did early programmers store the year as only two digits, causing the Millennium Bug?',
      answer: 'To save computer memory',
      distractors: ['To make dates easier to read', 'Because of a law', 'To confuse hackers'],
    },
  },
  {
    id: 'walkman',
    title: 'The Walkman',
    category: 'technology',
    summary: 'The pocket cassette player from Sony that let a generation carry its music anywhere.',
    body: [
      "The Walkman is a small, portable cassette player, first sold by the Japanese company Sony in 1979, that changed forever the way people listen to music. Before it, music was something you sat down to hear at home; the Walkman, light enough to clip to a belt and played through featherweight headphones, allowed a person to carry a personal soundtrack wherever they went — on the bus, in the street or out for a jog.",
      "It was an immediate and enormous success, and 'Walkman' soon became the common word for any such player, whoever made it. Tens of millions have been sold. In more recent years the cassette version has been joined by players for the compact disc, the so-called 'Discman', though these skip if jogged too hard. The little machine turned listening into a private pleasure, and the sight of a person lost in music behind a pair of headphones has become one of the familiar images of the modern age.",
    ],
    seeAlso: ['compact-disc'],
    factbox: [
      { label: 'First sold', value: '1979' },
      { label: 'Maker', value: 'Sony' },
    ],
    keywords: ['cassette', 'sony', 'music', 'headphones', 'portable', 'tape', 'discman'],
    quiz: {
      question: 'Which company introduced the Walkman in 1979?',
      answer: 'Sony',
      distractors: ['Panasonic', 'Apple', 'Philips'],
    },
  },
  {
    id: 'pagers',
    title: 'Pagers',
    category: 'technology',
    summary: 'The little beepers, clipped to a belt, that keep doctors and dealmakers within reach.',
    body: [
      "A pager, or 'beeper', is a small wireless device, usually clipped to a belt or slipped into a pocket, that alerts its owner that someone wishes to reach them. When a message is sent, the pager beeps or vibrates and displays a telephone number, or sometimes a short line of text, on its little screen. The owner then finds a telephone and returns the call.",
      "For years the pager has been the badge of the busy and the important — the doctor on call, the businessman closing a deal, the parent who must never be out of touch. Teenagers, too, have taken up the beeper, and have invented codes of numbers to send simple messages to one another. Some observers wonder whether the pager's days are now numbered, as the mobile telephone shrinks and falls in price. For the moment, though, the beep of a pager remains one of the everyday sounds of the age.",
    ],
    seeAlso: ['getting-online'],
    factbox: [
      { label: 'Also called', value: 'beeper' },
      { label: 'Shows', value: 'a number to call back' },
    ],
    keywords: ['beeper', 'wireless', 'message', 'mobile', 'phone'],
    quiz: {
      question: 'What does a pager do when someone wishes to reach its owner?',
      answer: 'It beeps and shows a number',
      distractors: ['It rings like a telephone', 'It sends a letter', 'It prints a message'],
    },
  },
  {
    id: 'the-modem',
    title: 'The Modem',
    category: 'technology',
    summary: 'The device that lets computers talk to one another down an ordinary telephone line.',
    body: [
      "A modem is the device that allows a computer to send and receive information over an ordinary telephone line, and it is the doorway through which most people reach the Internet from home. Its odd name is a shortening of 'modulator-demodulator', which describes just what it does: it turns the computer's digital data into audible tones that can travel down a telephone wire, and turns them back into data at the other end. This is the source of the strange screech a modem makes as it 'dials up' and connects.",
      "Modems are measured by their speed, in units called bits per second. The fastest home modems of today can manage 56,000 bits a second — enough to fetch a page of text in a moment, though a single photograph may still take a patient minute or two to appear. Faster connections are coming, but for now the humble modem remains the family's link to the wider world.",
    ],
    seeAlso: ['the-internet', 'getting-online'],
    media: {
      illustration: 'modem',
      caption: "A modem turns the computer's digital data into sound to travel down the telephone line, then back into data at the far end.",
    },
    factbox: [
      { label: 'Name from', value: 'modulator-demodulator' },
      { label: 'Top home speed', value: '56 kbit/s' },
    ],
    keywords: ['dial-up', 'modulator', 'baud', 'telephone', 'connection', 'internet'],
    quiz: {
      question: "The word 'modem' is short for which two words?",
      answer: 'Modulator-demodulator',
      distractors: ['Modern machine', 'Mobile demonstrator', 'Module of memory'],
    },
  },

  // ===================== ARTS =====================
  {
    id: 'leonardo',
    title: 'Leonardo da Vinci',
    category: 'arts',
    summary: 'The supreme genius of the Renaissance — painter, inventor, scientist and dreamer.',
    body: [
      "Leonardo da Vinci, born in 1452 in the Italian town of Vinci, is often called the greatest genius who ever lived. He was the very model of the 'Renaissance man', a person of boundless curiosity who excelled at almost everything he turned his mind to. As a painter he created two of the most famous pictures in the world, the Mona Lisa with her mysterious smile and The Last Supper.",
      "But Leonardo was far more than a painter. His notebooks, filled with mirror-writing and thousands of drawings, reveal a mind centuries ahead of its time. He designed flying machines, tanks and diving suits, dissected human bodies to learn how they worked, and studied the flight of birds and the flow of water. Most of his grand schemes were never built, and many of his paintings left unfinished, yet what survives is enough to secure his place among the towering figures of human achievement.",
    ],
    seeAlso: ['printing-press', 'human-heart'],
    factbox: [
      { label: 'Born', value: '1452, Vinci, Italy' },
      { label: 'Most famous work', value: 'Mona Lisa' },
    ],
    keywords: ['renaissance', 'painter', 'mona lisa', 'inventor', 'italy', 'art'],
    quiz: {
      question: 'Which mysterious, smiling portrait was painted by Leonardo da Vinci?',
      answer: 'The Mona Lisa',
      distractors: ['The Scream', 'The Night Watch', 'Girl with a Pearl Earring'],
    },
  },
  {
    id: 'shakespeare',
    title: 'William Shakespeare',
    category: 'arts',
    summary: "England's greatest playwright, whose plays have held the stage for four hundred years.",
    body: [
      "William Shakespeare, born in Stratford-upon-Avon in 1564, is widely regarded as the greatest writer in the English language. In a career of some twenty years he wrote around thirty-seven plays and more than 150 sonnets, working with a company of actors in London at the famous Globe Theatre on the banks of the Thames.",
      "His plays range from the darkest tragedy to the merriest comedy: Hamlet, Macbeth and Romeo and Juliet, A Midsummer Night's Dream and many more are still performed the world over, and have been translated into every major language. So rich was his command of words that he is credited with inventing hundreds of phrases we use without thinking to this day. Remarkably little is known for certain about the man himself, which has led a few to wonder whether the son of a small-town glover could really have written such works — though most scholars have no doubt at all that he did.",
    ],
    seeAlso: ['printing-press'],
    factbox: [
      { label: 'Born', value: '1564, Stratford-upon-Avon' },
      { label: 'Plays', value: '~37' },
    ],
    keywords: ['playwright', 'theatre', 'hamlet', 'globe', 'poet', 'england', 'drama'],
    quiz: {
      question: "In which London theatre were many of Shakespeare's plays performed?",
      answer: 'The Globe',
      distractors: ['The Colosseum', 'The Palladium', 'Covent Garden'],
    },
  },
  {
    id: 'the-beatles',
    title: 'The Beatles',
    category: 'arts',
    summary: 'The four young men from Liverpool who became the most famous band in the history of music.',
    body: [
      "The Beatles were a rock and roll group from the English city of Liverpool who became, in the 1960s, the most popular and influential band the world has ever known. The four members — John Lennon, Paul McCartney, George Harrison and Ringo Starr — rose from playing small clubs to a fame so overwhelming that the newspapers coined a word for it: 'Beatlemania'.",
      "Between 1962 and their break-up in 1970 they transformed popular music. Beginning with simple, joyful songs of young love, they went on to make records of astonishing invention, and albums such as Sgt. Pepper's Lonely Hearts Club Band changed what people thought music could be. Their songs have been sung by more people than those of any other composer of the century. Though the band is long parted, and John Lennon was tragically killed in 1980, the music of the Beatles is loved as dearly today as ever it was.",
    ],
    seeAlso: ['walkman', 'compact-disc'],
    factbox: [
      { label: 'From', value: 'Liverpool, England' },
      { label: 'Active', value: '1960–1970' },
    ],
    keywords: ['band', 'lennon', 'mccartney', 'rock', 'music', 'liverpool', 'beatlemania'],
    quiz: {
      question: 'From which English city did the Beatles come?',
      answer: 'Liverpool',
      distractors: ['London', 'Manchester', 'Birmingham'],
    },
  },

  // ===================== SPORTS & LEISURE =====================
  {
    id: 'michael-jordan',
    title: 'Michael Jordan',
    category: 'sports',
    summary: 'The basketball player widely hailed as the greatest ever to play the game.',
    body: [
      "Michael Jordan, born in 1963, is considered by many to be the finest basketball player in the history of the sport. Playing for most of his career with the Chicago Bulls, he combined a soaring, seemingly gravity-defying leap — which earned him the nickname 'Air Jordan' — with a fierce will to win that lifted his whole team.",
      "Under his leadership the Bulls won the championship of the National Basketball Association six times in the 1990s. Jordan has been the game's greatest ambassador, admired around the world, and his popularity turned basketball into a truly global sport and made him one of the most famous people on the planet. His name upon a pair of sports shoes could sell them by the million. Having briefly retired to try his hand at professional baseball, he returned to lead the Bulls to still more titles, cementing a legend that reaches far beyond the basketball court.",
    ],
    seeAlso: ['olympic-games'],
    factbox: [
      { label: 'Team', value: 'Chicago Bulls' },
      { label: 'NBA titles', value: '6' },
    ],
    keywords: ['basketball', 'nba', 'bulls', 'chicago', 'air jordan', 'sport'],
    quiz: {
      question: 'With which team did Michael Jordan win six NBA championships?',
      answer: 'The Chicago Bulls',
      distractors: ['The Los Angeles Lakers', 'The Boston Celtics', 'The New York Knicks'],
    },
  },
  {
    id: 'olympic-games',
    title: 'The Olympic Games',
    category: 'sports',
    summary: 'The greatest festival of sport, held every four years since the days of ancient Greece.',
    body: [
      "The Olympic Games are the world's foremost sporting festival, gathering athletes from almost every nation to compete every four years. Their origin lies in ancient Greece, where games were held at Olympia in honour of the god Zeus for more than a thousand years. The modern Games were revived in 1896 by a Frenchman, Baron Pierre de Coubertin, who believed that friendly competition might bring the peoples of the world closer together.",
      "Today the summer and winter Games are watched on television by billions. To win an Olympic gold medal is the highest honour in most sports, and the lighting of the Olympic flame, carried by runners all the way from Greece, is a moment of great ceremony. The Games have not always escaped the troubles of the wider world — they were cancelled during the two World Wars — but the five linked rings of the Olympic flag remain a rare and hopeful symbol of the nations united in peace.",
    ],
    seeAlso: ['michael-jordan'],
    factbox: [
      { label: 'Revived', value: '1896' },
      { label: 'Held every', value: '4 years' },
    ],
    keywords: ['olympics', 'athletics', 'greece', 'medal', 'sport', 'games'],
    quiz: {
      question: 'In which country were the ancient Olympic Games held?',
      answer: 'Greece',
      distractors: ['Italy', 'Egypt', 'France'],
    },
  },
  {
    id: 'chess',
    title: 'Chess',
    category: 'sports',
    summary: 'The royal game of kings and queens, a battle of wits fought on sixty-four squares.',
    body: [
      "Chess is a game of skill for two players, fought upon a board of sixty-four light and dark squares. Each player commands an army of sixteen pieces — pawns, knights, bishops, rooks, a queen and a king — and the object is to trap the enemy king in a position from which it cannot escape, a state called checkmate. The game is thought to have arisen in India some fifteen hundred years ago and to have reached Europe by way of Persia and the Arab world.",
      "Chess is at once simple to learn and endlessly deep; the number of possible games is greater than the number of atoms in the known universe. For this reason it has long fascinated mathematicians and, more recently, the builders of computers. In 1997 the contest between man and machine reached a historic climax when the IBM computer Deep Blue defeated the world champion, Garry Kasparov — the first time a reigning champion had lost a match to a machine.",
    ],
    seeAlso: ['deep-blue'],
    factbox: [
      { label: 'Squares', value: '64' },
      { label: 'Origin', value: 'India, ~1,500 years ago' },
    ],
    keywords: ['board game', 'checkmate', 'king', 'queen', 'strategy', 'kasparov'],
    quiz: {
      question: 'What is the name for trapping the enemy king so that it cannot escape?',
      answer: 'Checkmate',
      distractors: ['Stalemate', 'Castling', 'Gambit'],
    },
  },

  // ===================== LIFE IN 1998 =====================
  {
    id: 'millennium-bug-home',
    title: 'The Millennium Bug in Your Home',
    category: 'life1998',
    summary: 'Could your video recorder, your car or your microwave be caught out by the year 2000?',
    body: [
      "Much has been written of the danger the Millennium Bug poses to the great computers in banks and power stations, but many families now wonder what it may mean for the machines in their own homes. The worry is that any device containing a hidden clock or 'chip' — and there are far more of these about the house than most people realise — might stumble when the year 2000 arrives.",
      "In truth, experts say, there is little cause for alarm at home. Your video recorder may show the wrong date, and could refuse to record a programme set for the new year, but it will still play your tapes. Some older personal computers may need a small correction, easily made. Motor cars, microwave ovens and washing machines will almost all carry on quite happily, for their chips have no need to know the year. The sensible householder need do no more than check the family computer and, perhaps, keep a candle handy for New Year's Eve — just in case.",
    ],
    seeAlso: ['year-2000-problem', 'getting-online'],
    factbox: [
      { label: 'Real home risk', value: 'low' },
      { label: 'Worth checking', value: 'the family PC' },
    ],
    keywords: ['y2k', 'millennium', 'home', 'computer', 'video recorder', '2000'],
    quiz: {
      question: 'According to experts, how much danger does the Millennium Bug pose to a typical microwave oven?',
      answer: 'Little or none',
      distractors: ['It will explode', 'It will stop working forever', 'It will run backwards'],
    },
  },
  {
    id: 'beanie-babies',
    title: 'Beanie Babies',
    category: 'life1998',
    summary: 'The little bean-filled animals that became a craze — and, some hope, a fortune.',
    body: [
      "Beanie Babies are small, soft toy animals, understuffed with plastic beans so that they flop and pose in lifelike ways, made by the American company Ty. Since the mid-1990s they have grown from a simple children's plaything into one of the great collecting crazes of the age, gripping grown adults quite as much as children.",
      "The secret of the craze is that the company makes each animal for only a short time before 'retiring' it, so that collectors scramble to own every one. Rare retired Beanies have changed hands for hundreds or even thousands of dollars, and many families keep their treasures in plastic cases, the little paper tag carefully protected, convinced that these humble toys are an investment that will pay for a child's education one day. Whether the boom will last, or the beanbags one day be worth no more than any other toy, is a question that divides the experts.",
    ],
    seeAlso: ['getting-online'],
    factbox: [
      { label: 'Made by', value: 'Ty Inc.' },
      { label: 'Filled with', value: 'plastic beans' },
    ],
    keywords: ['toy', 'collectible', 'ty', 'craze', 'fad', 'collecting'],
    quiz: {
      question: 'What are Beanie Babies stuffed with, giving them their name?',
      answer: 'Plastic beans',
      distractors: ['Cotton wool', 'Foam chips', 'Sand'],
    },
  },
  {
    id: 'getting-online',
    title: 'Getting Online',
    category: 'life1998',
    summary: 'How the modern family joins the Internet — one screeching modem call at a time.',
    body: [
      "Joining the Internet has become, in the space of a very few years, something that ordinary families do at the kitchen table. To 'get online' you need three things: a personal computer, a modem, and an account with a company that provides the connection — a service such as America Online, which posts its free trial discs through letterboxes by the million.",
      "The ritual is a familiar one. You bid the computer to 'dial up'; the modem seizes the telephone line, plays its strange screeching song, and after a few moments announces that you are connected. Now the world is at your fingertips — electronic mail, chat rooms, and pages upon pages of the World Wide Web. But there are trials too: the connection ties up the family telephone, so that callers hear an engaged tone, and a large picture may take an age to trickle down the line. For all that, more households join the throng every single day.",
    ],
    seeAlso: ['the-internet', 'the-modem', 'year-2000-problem'],
    factbox: [
      { label: 'You need', value: 'PC, modem, an account' },
      { label: 'Ties up', value: 'the telephone line' },
    ],
    keywords: ['dial-up', 'aol', 'internet', 'modem', 'online', 'chat room'],
    quiz: {
      question: 'While the family computer is dialled up to the Internet, what happens to the telephone line?',
      answer: 'It is busy and cannot take calls',
      distractors: ['It works as normal', 'It rings continuously', 'It is disconnected forever'],
    },
  },
];

/** Fast id → article lookup, built once at module load. */
export const ARTICLES_BY_ID: Record<string, Article> = Object.fromEntries(
  ARTICLES.map((a) => [a.id, a]),
);

export function getArticle(id: string): Article | undefined {
  return ARTICLES_BY_ID[id];
}

export function articlesInCategory(category: CategoryId): Article[] {
  return ARTICLES.filter((a) => a.category === category).sort((a, b) => a.title.localeCompare(b.title));
}

export function getCategory(id: CategoryId): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
