<script lang="ts">
  import { onMount } from 'svelte';
  import CloseButton from '$lib/components/CloseButton.svelte';
  import HidingBeanie from '$lib/components/HidingBeanie.svelte';
  import { playSound } from '$lib/stores/audio';
  import { registerSpots, getBeaniesForArea, type HidingSpot } from '$lib/stores/beanieHunt';
  import type { Beanie } from '$lib/stores/beanies';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Hidden beanie behind globe
  const hidingSpots: HidingSpot[] = [{ id: 'behind-globe' }];
  let hiddenBeanie = $state<Beanie | null>(null);

  // View state
  type View = 'home' | 'article' | 'mindmaze';
  let currentView = $state<View>('home');
  let currentArticleId = $state<string | null>(null);
  let isLoading = $state(false);
  let searchQuery = $state('');
  let searchResults = $state<string[]>([]);
  let isSearching = $state(false);

  // Sidebar state
  let expandedCategories = $state<Set<string>>(new Set());

  // Navigation history
  let history = $state<string[]>([]);
  let historyIndex = $state(-1);

  // MindMaze state
  let mindmazeQuestions = $state<MindMazeQuestion[]>([]);
  let currentQuestion = $state(0);
  let mindmazeScore = $state(0);
  let selectedAnswer = $state<number | null>(null);
  let showResult = $state(false);
  let mindmazeComplete = $state(false);

  // ============================================================
  // ARTICLE DATABASE
  // ============================================================

  interface Article {
    id: string;
    title: string;
    category: string;
    subcategory: string;
    content: string[];
    funFact: string;
    imageColor: string;
    imageCaption: string;
    seeAlso: string[];
  }

  interface MindMazeQuestion {
    question: string;
    answers: string[];
    correct: number;
  }

  const articles: Record<string, Article> = {
    'space': {
      id: 'space',
      title: 'Space Exploration',
      category: 'Science & Technology',
      subcategory: 'Space',
      content: [
        'Space exploration is the investigation of outer space through the use of astronomy, space technology, and human spaceflight. While the observation of objects in space has been occurring for thousands of years, it was not until the twentieth century that rockets powerful enough to overcome the force of gravity were developed, enabling physical exploration beyond the Earth\'s atmosphere.',
        'The Space Age began on October 4, 1957, with the launch of Sputnik 1, the first artificial satellite, by the Soviet Union. This event triggered the Space Race between the United States and the Soviet Union. On July 20, 1969, American astronaut Neil Armstrong became the first human to walk on the Moon during the Apollo 11 mission, an event watched by an estimated 600 million people worldwide.',
        'Since the Apollo era, space exploration has continued with robotic probes visiting every planet in our solar system. The Hubble Space Telescope, launched in 1990, has provided unprecedented views of distant galaxies and nebulae, fundamentally changing our understanding of the universe\'s age and expansion.'
      ],
      funFact: 'A day on Venus is longer than a year on Venus! It takes Venus 243 Earth days to rotate once on its axis, but only 225 Earth days to orbit the Sun.',
      imageColor: '#1a1a3e',
      imageCaption: 'The Space Shuttle Discovery launches from Kennedy Space Center, 1988',
      seeAlso: ['computers', 'inventions']
    },
    'dinosaurs': {
      id: 'dinosaurs',
      title: 'Dinosaurs',
      category: 'Science & Technology',
      subcategory: 'Dinosaurs',
      content: [
        'Dinosaurs were a diverse group of reptiles that first appeared during the Triassic period, approximately 230 million years ago. They were the dominant terrestrial vertebrates for over 160 million years, from the late Triassic period until the end of the Cretaceous period, about 65 million years ago. The word "dinosaur" was coined in 1842 by the English paleontologist Sir Richard Owen, derived from Greek words meaning "terrible lizard."',
        'Dinosaurs varied enormously in size and shape. The largest known dinosaurs, the sauropods such as Argentinosaurus, could reach lengths of over 30 meters and weights exceeding 70 metric tons. In contrast, the smallest known dinosaur, Microraptor, was roughly the size of a crow. Scientists have identified over 1,000 distinct dinosaur species from fossil evidence found on every continent.',
        'The extinction of non-avian dinosaurs approximately 65 million years ago is attributed to a catastrophic asteroid impact near what is now the Yucatan Peninsula in Mexico. This event, known as the Chicxulub impact, created a crater over 180 kilometers wide and triggered global climate changes that most large land animals could not survive. However, birds are now understood to be living dinosaurs, the descendants of small theropod dinosaurs.'
      ],
      funFact: 'The Tyrannosaurus Rex had teeth up to 9 inches long, but its arms were so short they could not even reach its own mouth!',
      imageColor: '#4a6741',
      imageCaption: 'Skeleton of Tyrannosaurus Rex, American Museum of Natural History',
      seeAlso: ['reptiles', 'ancient-egypt']
    },
    'inventions': {
      id: 'inventions',
      title: 'Great Inventions',
      category: 'Science & Technology',
      subcategory: 'Inventions',
      content: [
        'Throughout human history, inventions have transformed the way people live, work, and communicate. The invention of the printing press by Johannes Gutenberg around 1440 is widely considered one of the most important events of the modern era. By making books affordable and widely available, the printing press helped spread knowledge and literacy across Europe and eventually the world.',
        'The Industrial Revolution of the 18th and 19th centuries saw an explosion of transformative inventions. The steam engine, developed by James Watt in the 1760s, powered factories and locomotives, reshaping transportation and manufacturing. Thomas Edison\'s practical electric light bulb, demonstrated in 1879, extended the productive hours of the day and paved the way for the electrification of the modern world.',
        'The twentieth century brought inventions that would have seemed like science fiction to earlier generations. Alexander Fleming\'s discovery of penicillin in 1928 launched the antibiotic revolution in medicine. The development of the transistor at Bell Laboratories in 1947 laid the groundwork for all modern electronics, from radios to computers to cellular telephones.'
      ],
      funFact: 'The microwave oven was invented by accident! In 1945, engineer Percy Spencer noticed that a candy bar in his pocket melted while he was working near an active radar set.',
      imageColor: '#8B7355',
      imageCaption: 'Replica of Gutenberg\'s printing press, Gutenberg Museum, Mainz, Germany',
      seeAlso: ['computers', 'space']
    },
    'computers': {
      id: 'computers',
      title: 'Computers',
      category: 'Science & Technology',
      subcategory: 'Computers',
      content: [
        'A computer is an electronic device that processes information according to a set of instructions called a program. The history of computing begins with mechanical calculating devices such as the abacus, used for thousands of years. The first programmable computer is generally considered to be the Z3, built by German engineer Konrad Zuse in 1941. However, the modern computer age truly began with the development of electronic computers in the 1940s.',
        'The ENIAC (Electronic Numerical Integrator and Computer), completed in 1945, was one of the first general-purpose electronic computers. It weighed 30 tons and filled an entire room. The invention of the integrated circuit in the late 1950s made it possible to miniaturize computer components dramatically. By the 1970s, the first personal computers appeared, and in 1981, IBM released its PC, which became the standard for business computing.',
        'The development of the World Wide Web by Tim Berners-Lee in 1989 transformed the computer from a specialized tool into an essential part of everyday life. By the mid-1990s, millions of people worldwide were connecting to the Internet for communication, information, and entertainment. The rise of multimedia computing has made possible applications ranging from digital encyclopedias to video games to online commerce.'
      ],
      funFact: 'The first computer "bug" was a real bug! In 1947, a moth was found stuck in a relay of the Harvard Mark II computer, and engineers taped it into the log book with the note "First actual case of bug being found."',
      imageColor: '#2f4f4f',
      imageCaption: 'An IBM Personal Computer (PC), Model 5150, circa 1981',
      seeAlso: ['inventions', 'space']
    },
    'ancient-egypt': {
      id: 'ancient-egypt',
      title: 'Ancient Egypt',
      category: 'History',
      subcategory: 'Ancient Egypt',
      content: [
        'Ancient Egypt was one of the oldest and longest-lasting civilizations in world history. Located along the banks of the Nile River in northeastern Africa, Egyptian civilization began around 3100 BC when Upper and Lower Egypt were unified under the first pharaoh, and it endured for nearly three thousand years. The ancient Egyptians developed one of the first writing systems, hieroglyphics, and made lasting contributions to architecture, art, mathematics, and medicine.',
        'The pyramids of Giza remain among the most recognizable structures ever built. The Great Pyramid, constructed around 2560 BC as a tomb for Pharaoh Khufu, stood as the tallest man-made structure in the world for over 3,800 years. Built from approximately 2.3 million limestone blocks, each weighing an average of 2.5 tons, the precision of its construction continues to astonish modern engineers.',
        'Egyptian society was organized around the pharaoh, who was considered both a political leader and a living god. Religion played a central role in daily life, with Egyptians worshipping a pantheon of gods including Ra, the sun god; Osiris, god of the afterlife; and Isis, goddess of magic and motherhood. The elaborate mummification process and burial practices of the ancient Egyptians reflected their deep belief in an afterlife.'
      ],
      funFact: 'Ancient Egyptians loved their cats so much that the penalty for killing a cat, even accidentally, was death! When a household cat died, the family would shave their eyebrows in mourning.',
      imageColor: '#C4A35A',
      imageCaption: 'The Great Sphinx and Pyramids of Giza, Egypt',
      seeAlso: ['medieval', 'continents']
    },
    'medieval': {
      id: 'medieval',
      title: 'The Medieval Period',
      category: 'History',
      subcategory: 'Medieval',
      content: [
        'The Medieval period, also known as the Middle Ages, spans roughly from the fall of the Western Roman Empire in 476 AD to the beginning of the Renaissance in the 14th century. This era is often divided into the Early Middle Ages (5th to 10th century), the High Middle Ages (11th to 13th century), and the Late Middle Ages (14th to 15th century). During this time, European society was organized under the feudal system, a hierarchy of lords, vassals, and serfs.',
        'The medieval period saw the construction of magnificent cathedrals and castles across Europe. Gothic architecture, which emerged in the 12th century, introduced innovations such as flying buttresses and pointed arches that allowed buildings to reach unprecedented heights. The period also saw the founding of the first universities, including the University of Bologna (1088) and the University of Oxford (circa 1096).',
        'Despite being sometimes called the "Dark Ages," the medieval period was a time of significant cultural and technological advancement. Innovations included the heavy plow, the horse collar, windmills, and mechanical clocks. The Crusades, a series of religious wars between 1096 and 1291, brought Europeans into contact with the advanced civilizations of the Islamic world, leading to an exchange of knowledge in mathematics, medicine, and astronomy.'
      ],
      funFact: 'Medieval knights were so heavily armored that if they fell off their horses, they often could not get up without help! A full suit of plate armor could weigh between 45 and 55 pounds.',
      imageColor: '#6B4226',
      imageCaption: 'A medieval castle in the Rhine Valley, Germany',
      seeAlso: ['ancient-egypt', 'world-wars', 'art']
    },
    'world-wars': {
      id: 'world-wars',
      title: 'The World Wars',
      category: 'History',
      subcategory: 'World Wars',
      content: [
        'The two World Wars of the twentieth century were the largest and most destructive conflicts in human history. World War I (1914-1918), originally called the Great War, involved most of the world\'s great powers assembled in two opposing alliances: the Allies and the Central Powers. The immediate cause was the assassination of Archduke Franz Ferdinand of Austria-Hungary, but deeper causes included militarism, imperial rivalries, and a complex system of alliances.',
        'World War II (1939-1945) was even more devastating, involving over 70 million military personnel and resulting in an estimated 70 to 85 million deaths. The war began when Nazi Germany, under Adolf Hitler, invaded Poland on September 1, 1939. The conflict expanded to encompass nearly every part of the world, with major theaters of war in Europe, the Pacific, North Africa, and East Asia.',
        'The aftermath of the World Wars reshaped the global political order. The United Nations was established in 1945 to promote international cooperation and prevent future conflicts. The wars also accelerated decolonization movements across Asia and Africa, led to the creation of the state of Israel, and set the stage for the Cold War between the United States and the Soviet Union.'
      ],
      funFact: 'During World War I, the British created a fleet of fake horses and fake trees as observation posts. Some "trees" on the Western Front were actually hollow metal replicas, used to hide soldiers who could spy on enemy lines.',
      imageColor: '#556B2F',
      imageCaption: 'Allied troops landing on Normandy Beach, D-Day, June 6, 1944',
      seeAlso: ['cold-war', 'inventions']
    },
    'cold-war': {
      id: 'cold-war',
      title: 'The Cold War',
      category: 'History',
      subcategory: 'Cold War',
      content: [
        'The Cold War was a prolonged period of geopolitical tension between the United States and its Western allies and the Soviet Union and its Eastern bloc allies, lasting from approximately 1947 to 1991. Unlike previous major conflicts, the Cold War was characterized not by direct military engagement between the two superpowers, but by proxy wars, nuclear arms races, espionage, and ideological competition between capitalism and communism.',
        'Key events of the Cold War included the Berlin Blockade (1948-49), the Korean War (1950-53), the Cuban Missile Crisis (1962), and the Vietnam War (1955-75). The arms race led to the development of nuclear arsenals capable of destroying civilization many times over, a concept known as "mutually assured destruction" (MAD). The Space Race, in which the two superpowers competed for supremacy in space exploration, was another defining feature of the era.',
        'The Cold War ended with the dissolution of the Soviet Union on December 26, 1991. The fall of the Berlin Wall on November 9, 1989, had symbolized the beginning of the end, as communist governments across Eastern Europe collapsed. The reunification of Germany in 1990 and the independence of former Soviet republics marked the conclusion of nearly half a century of ideological division.'
      ],
      funFact: 'During the Cold War, the CIA spent $20 million on "Operation Acoustic Kitty," a project to surgically implant listening devices in cats to spy on the Soviet embassy. The first cat was released near the embassy and was immediately hit by a taxi.',
      imageColor: '#4a4a6a',
      imageCaption: 'The Berlin Wall, seen from the West Berlin side, 1986',
      seeAlso: ['world-wars', 'space', 'computers']
    },
    'continents': {
      id: 'continents',
      title: 'The Continents',
      category: 'Geography',
      subcategory: 'Continents',
      content: [
        'Earth\'s landmass is divided into seven continents: Africa, Antarctica, Asia, Australia (sometimes called Oceania), Europe, North America, and South America. Together, these continents make up approximately 29 percent of the Earth\'s surface, with the remaining 71 percent covered by water. Asia is by far the largest continent, covering about 44.6 million square kilometers, while Australia is the smallest at approximately 7.7 million square kilometers.',
        'The continents were not always in their present positions. According to the theory of plate tectonics, the Earth\'s outer shell is divided into several plates that slowly move over the planet\'s mantle. About 300 million years ago, all the continents were joined together in a single supercontinent called Pangaea. Over millions of years, Pangaea broke apart, and the continents drifted to their current locations.',
        'Each continent has its own distinct geography, climate, and ecosystems. Africa contains the world\'s largest desert (the Sahara) and the longest river (the Nile). Asia includes the highest mountain (Mount Everest) and the deepest lake (Lake Baikal). South America is home to the largest rainforest (the Amazon) and the driest place on Earth (the Atacama Desert).'
      ],
      funFact: 'Africa is so large that you could fit the United States, China, India, and most of Europe inside it and still have room left over!',
      imageColor: '#2E8B57',
      imageCaption: 'Physical map of the world showing the seven continents',
      seeAlso: ['oceans', 'mountains', 'countries']
    },
    'oceans': {
      id: 'oceans',
      title: 'The Oceans',
      category: 'Geography',
      subcategory: 'Oceans',
      content: [
        'The world\'s oceans cover approximately 361 million square kilometers, or about 71 percent of the Earth\'s surface. There are five recognized oceans: the Pacific, Atlantic, Indian, Southern (Antarctic), and Arctic. The Pacific Ocean is by far the largest, covering more area than all of the land on Earth combined. At its deepest point, the Mariana Trench, the Pacific reaches a depth of approximately 11,034 meters.',
        'Oceans play a vital role in regulating Earth\'s climate. They absorb heat from the sun and distribute it around the globe through ocean currents, acting as a massive thermostat that moderates temperatures. The Gulf Stream, for example, carries warm water from the tropics to the North Atlantic, giving Western Europe a much milder climate than it would otherwise have at its latitude.',
        'Despite covering most of the planet, the oceans remain largely unexplored. Scientists estimate that more than 80 percent of the ocean floor has never been mapped, explored, or even seen by human eyes. More people have traveled to space than have visited the deepest parts of the ocean. Marine biologists believe that millions of ocean species remain undiscovered.'
      ],
      funFact: 'The ocean contains about 20 million tons of gold! Unfortunately, it is so diluted (about 13 billionths of a gram per liter) that extracting it would cost far more than the gold is worth.',
      imageColor: '#006994',
      imageCaption: 'Satellite view of the Pacific Ocean from space',
      seeAlso: ['continents', 'ocean-life', 'mountains']
    },
    'countries': {
      id: 'countries',
      title: 'Countries of the World',
      category: 'Geography',
      subcategory: 'Countries',
      content: [
        'As of the mid-1990s, there are approximately 190 independent countries in the world, each with its own government, culture, and identity. Countries range enormously in size, from Russia, which spans over 17 million square kilometers across two continents, to Vatican City, which occupies only 0.44 square kilometers within the city of Rome, Italy.',
        'The concept of the nation-state as we know it is relatively modern. While kingdoms and empires have existed for millennia, the idea that a country should be defined by the people who share a common language, culture, and identity emerged primarily in the 18th and 19th centuries. The process of decolonization in the 20th century led to the creation of dozens of new nations, particularly in Africa and Asia.',
        'Countries are organized in numerous ways, from democracies where leaders are elected by the people, to monarchies where power is inherited, to various forms of authoritarian government. International organizations such as the United Nations, founded in 1945, provide forums for countries to cooperate on issues ranging from peacekeeping to public health to environmental protection.'
      ],
      funFact: 'The shortest international border in the world is between Zambia and Botswana. It is only about 150 meters long, where the two countries meet at a single point along the Zambezi River!',
      imageColor: '#8B4513',
      imageCaption: 'Political map of the world showing national boundaries',
      seeAlso: ['continents', 'world-wars', 'cold-war']
    },
    'mountains': {
      id: 'mountains',
      title: 'Mountains',
      category: 'Geography',
      subcategory: 'Mountains',
      content: [
        'Mountains are large landforms that rise prominently above the surrounding terrain. They are formed by tectonic forces, volcanic activity, or erosion, and are found on every continent and even beneath the oceans. Mount Everest, located in the Himalayan mountain range on the border between Nepal and Tibet, is the highest point on Earth at 8,848 meters above sea level.',
        'Mountain ranges are typically formed at the boundaries of tectonic plates. The Himalayas, for example, were created by the collision of the Indian and Eurasian plates, a process that began about 50 million years ago and continues today, causing the Himalayas to grow by approximately one centimeter per year. The Andes, the longest continental mountain range at over 7,000 kilometers, were formed by the subduction of oceanic plates beneath the South American plate.',
        'Mountains have a profound influence on climate and ecosystems. As air rises over mountains, it cools and releases moisture, creating wetter conditions on the windward side and drier conditions on the leeward side, a phenomenon known as a rain shadow. Mountains also serve as important water sources, as snowmelt from high peaks feeds rivers that supply water to billions of people worldwide.'
      ],
      funFact: 'Mauna Kea in Hawaii is technically the tallest mountain on Earth! While Everest is highest above sea level, Mauna Kea rises about 10,203 meters from its base on the ocean floor, compared to Everest\'s 8,848 meters above sea level.',
      imageColor: '#708090',
      imageCaption: 'Mount Everest as seen from Kala Patthar, Nepal',
      seeAlso: ['continents', 'oceans']
    },
    'mammals': {
      id: 'mammals',
      title: 'Mammals',
      category: 'Animals',
      subcategory: 'Mammals',
      content: [
        'Mammals are warm-blooded vertebrates characterized by the presence of hair or fur, mammary glands that produce milk for feeding their young, and a neocortex region of the brain. There are approximately 5,500 known species of mammals, ranging from the tiny bumblebee bat, weighing only 2 grams, to the blue whale, the largest animal ever to have lived on Earth, reaching lengths of up to 30 meters and weights of nearly 200 metric tons.',
        'Mammals have adapted to virtually every environment on Earth. Marine mammals such as whales and dolphins live entirely in the ocean. Bats are the only mammals capable of true flight. Moles and other burrowing mammals spend most of their lives underground. The diversity of mammalian adaptations reflects over 200 million years of evolution, during which mammals evolved from small, nocturnal creatures living alongside dinosaurs into the dominant land animals of the modern era.',
        'Intelligence is a notable feature of many mammal species. Primates, cetaceans (whales and dolphins), and elephants are among the most intelligent animals on Earth. Great apes, our closest living relatives, have been observed using tools, solving complex problems, and even learning basic sign language. Dolphins communicate using a complex system of clicks and whistles and have demonstrated self-awareness in mirror recognition tests.'
      ],
      funFact: 'A group of flamingos is called a "flamboyance," but here\'s a mammal fact: sea otters hold hands while they sleep so they don\'t drift apart! They also wrap themselves in kelp for the same reason.',
      imageColor: '#8B6914',
      imageCaption: 'African elephant and calf in Amboseli National Park, Kenya',
      seeAlso: ['ocean-life', 'reptiles', 'insects']
    },
    'reptiles': {
      id: 'reptiles',
      title: 'Reptiles',
      category: 'Animals',
      subcategory: 'Reptiles',
      content: [
        'Reptiles are cold-blooded vertebrates that have scales or scutes covering their bodies. The class Reptilia includes four main orders: crocodilians (crocodiles and alligators), squamates (lizards and snakes), testudines (turtles and tortoises), and rhynchocephalia (tuataras). There are approximately 10,000 known species of reptiles, found on every continent except Antarctica.',
        'Unlike mammals and birds, reptiles are ectothermic, meaning they rely on external sources of heat to regulate their body temperature. This is why reptiles are often seen basking in the sun. While this might seem like a disadvantage, ectothermy actually requires far less energy than maintaining a constant body temperature, allowing reptiles to survive on much less food than similarly sized mammals.',
        'Reptiles have a long evolutionary history stretching back over 300 million years. During the Mesozoic Era, reptiles were the dominant land animals, including the dinosaurs. Today, the largest living reptile is the saltwater crocodile, which can reach lengths of over 6 meters and weights exceeding 1,000 kilograms. The smallest is the nano-chameleon, discovered in Madagascar, which can perch comfortably on the tip of a finger.'
      ],
      funFact: 'Crocodiles cannot stick out their tongues! Their tongues are attached to the roof of their mouths by a membrane, which keeps them in place while the crocodile is submerged in water.',
      imageColor: '#556B2F',
      imageCaption: 'Green sea turtle swimming over a coral reef',
      seeAlso: ['dinosaurs', 'mammals', 'ocean-life']
    },
    'ocean-life': {
      id: 'ocean-life',
      title: 'Ocean Life',
      category: 'Animals',
      subcategory: 'Ocean Life',
      content: [
        'The oceans are home to an astonishing diversity of life, from microscopic plankton to the enormous blue whale. Marine ecosystems include coral reefs, deep-sea vents, kelp forests, and the open ocean. Coral reefs, sometimes called the "rainforests of the sea," cover less than one percent of the ocean floor but support approximately 25 percent of all marine species.',
        'The deep ocean remains one of the least explored environments on Earth. In the abyssal zone, below 4,000 meters, organisms have adapted to extreme conditions: near-freezing temperatures, crushing pressure, and total darkness. Many deep-sea creatures produce their own light through bioluminescence. The giant squid, which can reach lengths of up to 13 meters, was not filmed alive in its natural habitat until 2004.',
        'Marine ecosystems are critically important to life on Earth. Phytoplankton, tiny photosynthetic organisms that drift in the upper layers of the ocean, produce approximately 50 percent of the world\'s oxygen. The ocean also serves as a major carbon sink, absorbing about 30 percent of the carbon dioxide produced by human activities, helping to regulate the global climate.'
      ],
      funFact: 'The mantis shrimp can punch with the force of a bullet! Its specialized claws accelerate at over 50 miles per hour, creating cavitation bubbles that produce a second shockwave. They have been known to break aquarium glass!',
      imageColor: '#008B8B',
      imageCaption: 'A coral reef teeming with tropical fish, Great Barrier Reef, Australia',
      seeAlso: ['oceans', 'mammals', 'reptiles']
    },
    'insects': {
      id: 'insects',
      title: 'Insects',
      category: 'Animals',
      subcategory: 'Insects',
      content: [
        'Insects are the most diverse group of organisms on Earth, with an estimated 5.5 million species, of which roughly one million have been scientifically described. They belong to the phylum Arthropoda and are characterized by a three-part body (head, thorax, and abdomen), three pairs of jointed legs, compound eyes, and one pair of antennae. Insects are found on every continent, including Antarctica, and in virtually every terrestrial and freshwater habitat.',
        'The ecological importance of insects cannot be overstated. Bees, butterflies, and other insect pollinators are essential for the reproduction of approximately 75 percent of flowering plants and about 35 percent of food crops worldwide. Insects also play crucial roles as decomposers, breaking down dead organic matter and recycling nutrients back into the soil. Without insects, most terrestrial ecosystems would collapse.',
        'Insects display remarkable adaptations and behaviors. Monarch butterflies migrate up to 4,800 kilometers from Canada to central Mexico each autumn. Leafcutter ants cultivate fungus gardens, making them one of the few non-human species to practice agriculture. Fireflies produce light through a chemical reaction called bioluminescence, used to attract mates with species-specific flash patterns.'
      ],
      funFact: 'A flea can jump up to 150 times its own body length! That would be like a human jumping over a 75-story building. Fleas achieve this feat using a pad of a rubber-like protein called resilin, which stores and releases energy like a spring.',
      imageColor: '#6B8E23',
      imageCaption: 'A monarch butterfly resting on a milkweed flower',
      seeAlso: ['mammals', 'reptiles', 'ocean-life']
    },
    'music': {
      id: 'music',
      title: 'Music',
      category: 'Arts & Culture',
      subcategory: 'Music',
      content: [
        'Music is an art form whose medium is sound organized in time. It is one of the universal cultural aspects of all human societies, with archaeological evidence of musical instruments dating back at least 40,000 years. Music encompasses a vast range of styles and traditions, from the complex orchestral compositions of the Western classical tradition to the improvised melodies of jazz, from the rhythmic patterns of African drumming to the electronic sounds of modern pop and dance music.',
        'Western classical music has a rich history spanning over a thousand years. The Medieval period saw the development of musical notation and polyphony. The Baroque era (1600-1750) produced composers such as Johann Sebastian Bach and Antonio Vivaldi. The Classical period (1750-1820) brought the symphonies of Wolfgang Amadeus Mozart and Ludwig van Beethoven. The Romantic era expanded the orchestra and the emotional range of music, while the 20th century saw revolutionary developments in atonality, minimalism, and electronic music.',
        'The invention of sound recording in the late 19th century transformed music from an exclusively live experience into one that could be captured, reproduced, and distributed worldwide. The development of radio, television, and eventually the compact disc and digital formats made music accessible to billions of people. Popular music genres such as rock and roll, hip-hop, and electronic dance music have become global cultural phenomena.'
      ],
      funFact: 'Mozart wrote his first symphony at age 8 and composed over 600 works before his death at age 35. Some historians believe he could hear a piece of music once and write it down from memory perfectly!',
      imageColor: '#722F37',
      imageCaption: 'A symphony orchestra performing at the Vienna Musikverein',
      seeAlso: ['art', 'literature', 'film']
    },
    'art': {
      id: 'art',
      title: 'Art',
      category: 'Arts & Culture',
      subcategory: 'Art',
      content: [
        'Art is a diverse range of human activities involving the creation of visual, auditory, or performed artifacts that express the creator\'s imagination, ideas, or technical skill. The history of visual art stretches back at least 40,000 years to the cave paintings of Lascaux in France and Altamira in Spain. These remarkable images of animals and human handprints provide evidence that artistic expression is a fundamental human impulse.',
        'The Renaissance (14th to 17th century) marked a dramatic transformation in Western art. Artists such as Leonardo da Vinci, Michelangelo, and Raphael developed techniques of perspective, anatomy, and composition that produced works of unprecedented realism and beauty. Leonardo\'s Mona Lisa and Michelangelo\'s ceiling of the Sistine Chapel remain among the most celebrated works of art in the world.',
        'Modern art, beginning in the late 19th century, challenged traditional conventions of representation. Impressionists like Claude Monet focused on capturing light and atmosphere rather than precise detail. The 20th century saw even more radical departures, from Picasso\'s Cubism to Salvador Dali\'s Surrealism to Jackson Pollock\'s Abstract Expressionism. Contemporary art continues to push boundaries, incorporating new media such as video, digital technology, and interactive installations.'
      ],
      funFact: 'The Mona Lisa has no eyebrows! Some historians believe Leonardo da Vinci originally painted them but they were accidentally removed during a restoration. Others think it was fashionable in Renaissance Florence for women to shave their eyebrows.',
      imageColor: '#8B6914',
      imageCaption: 'The Mona Lisa by Leonardo da Vinci, c. 1503-1519, Louvre Museum, Paris',
      seeAlso: ['music', 'literature', 'medieval']
    },
    'literature': {
      id: 'literature',
      title: 'Literature',
      category: 'Arts & Culture',
      subcategory: 'Literature',
      content: [
        'Literature is the art of written works, encompassing fiction, poetry, drama, and nonfiction. The oldest known literary work is the Epic of Gilgamesh, a Sumerian poem dating from around 2100 BC that tells the story of a king\'s quest for immortality. Literature has served throughout history as a means of entertainment, education, cultural preservation, and social commentary.',
        'The invention of the printing press in the 15th century democratized access to literature, and the novel as a literary form emerged in the 17th and 18th centuries. Miguel de Cervantes\' Don Quixote (1605) is often cited as the first modern novel. The 19th century saw the rise of literary realism with authors such as Charles Dickens, Leo Tolstoy, and Mark Twain, who depicted the social conditions of their times with unprecedented detail and insight.',
        'The 20th century brought dramatic experimentation in literary form and content. Modernist writers such as James Joyce, Virginia Woolf, and Franz Kafka broke with conventional narrative techniques, exploring stream of consciousness and fragmented storytelling. Literature has also become increasingly global, with writers from Africa, Asia, Latin America, and other regions contributing diverse voices and perspectives to the world\'s literary heritage.'
      ],
      funFact: 'The longest novel ever written is "In Search of Lost Time" by Marcel Proust. It contains approximately 1.2 million words across seven volumes. Reading it aloud non-stop would take about 150 hours!',
      imageColor: '#704214',
      imageCaption: 'A collection of leather-bound classic literature volumes',
      seeAlso: ['music', 'art', 'film']
    },
    'film': {
      id: 'film',
      title: 'Film',
      category: 'Arts & Culture',
      subcategory: 'Film',
      content: [
        'Film, also called motion pictures or cinema, is a visual art form that uses moving images to tell stories, convey ideas, or document reality. The history of film began in the 1890s with the invention of devices capable of recording and projecting moving images. The Lumiere brothers held the first public film screening in Paris on December 28, 1895, showing short clips of everyday scenes that astonished audiences who had never seen moving pictures.',
        'The early decades of cinema were dominated by silent films, in which stories were told through visual action and occasional title cards. The introduction of synchronized sound in "The Jazz Singer" (1927) revolutionized the industry, and "talkies" quickly replaced silent films. The 1930s through 1950s are often called Hollywood\'s Golden Age, producing classic films and iconic stars. The introduction of color film, widescreen formats, and eventually computer-generated imagery continued to expand the possibilities of cinema.',
        'Film has grown into one of the world\'s most influential art forms and largest entertainment industries. By the 1990s, the global film industry generates billions of dollars annually. Beyond entertainment, film has proven to be a powerful medium for education, propaganda, and social change. Documentaries, independent films, and works from diverse national cinema traditions offer perspectives that challenge and enrich audiences worldwide.'
      ],
      funFact: 'The first movie ever to use computer-generated imagery (CGI) was "Westworld" in 1973, which used 2D computer animation. The first use of 3D CGI in film was in "Futureworld" in 1976.',
      imageColor: '#2F2F2F',
      imageCaption: 'A vintage 35mm film projector in a classic movie theater',
      seeAlso: ['music', 'art', 'literature', 'computers']
    }
  };

  // ============================================================
  // CATEGORY TREE STRUCTURE
  // ============================================================

  interface CategoryNode {
    label: string;
    children?: CategoryNode[];
    articleId?: string;
  }

  const categoryTree: CategoryNode[] = [
    {
      label: 'Science & Technology',
      children: [
        { label: 'Space', articleId: 'space' },
        { label: 'Dinosaurs', articleId: 'dinosaurs' },
        { label: 'Inventions', articleId: 'inventions' },
        { label: 'Computers', articleId: 'computers' }
      ]
    },
    {
      label: 'History',
      children: [
        { label: 'Ancient Egypt', articleId: 'ancient-egypt' },
        { label: 'Medieval', articleId: 'medieval' },
        { label: 'World Wars', articleId: 'world-wars' },
        { label: 'Cold War', articleId: 'cold-war' }
      ]
    },
    {
      label: 'Geography',
      children: [
        { label: 'Continents', articleId: 'continents' },
        { label: 'Oceans', articleId: 'oceans' },
        { label: 'Countries', articleId: 'countries' },
        { label: 'Mountains', articleId: 'mountains' }
      ]
    },
    {
      label: 'Animals',
      children: [
        { label: 'Mammals', articleId: 'mammals' },
        { label: 'Reptiles', articleId: 'reptiles' },
        { label: 'Ocean Life', articleId: 'ocean-life' },
        { label: 'Insects', articleId: 'insects' }
      ]
    },
    {
      label: 'Arts & Culture',
      children: [
        { label: 'Music', articleId: 'music' },
        { label: 'Art', articleId: 'art' },
        { label: 'Literature', articleId: 'literature' },
        { label: 'Film', articleId: 'film' }
      ]
    }
  ];

  // All article IDs for counting
  const allArticleIds = Object.keys(articles);
  const totalArticles = allArticleIds.length;

  // ============================================================
  // DID YOU KNOW FACTS
  // ============================================================

  const didYouKnowFacts = [
    'The Great Wall of China is not visible from space with the naked eye, despite the popular myth.',
    'Honey never spoils. Archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible.',
    'Octopuses have three hearts and blue blood.',
    'A group of flamingos is called a "flamboyance."',
    'Bananas are berries, but strawberries are not.',
    'The shortest war in history lasted only 38 to 45 minutes, between Britain and Zanzibar in 1896.',
    'Venus is the only planet in our solar system that spins clockwise.',
    'There are more possible iterations of a game of chess than there are atoms in the known universe.',
    'The inventor of the Pringles can is buried in one.',
    'Scotland\'s national animal is the unicorn.'
  ];

  let randomFact = $state(didYouKnowFacts[Math.floor(Math.random() * didYouKnowFacts.length)]);

  // ============================================================
  // MINDMAZE QUESTIONS
  // ============================================================

  const allMindmazeQuestions: MindMazeQuestion[] = [
    { question: 'What was the first artificial satellite launched into space?', answers: ['Explorer 1', 'Sputnik 1', 'Vanguard 1', 'Luna 1'], correct: 1 },
    { question: 'How many years ago did dinosaurs go extinct?', answers: ['10 million', '65 million', '150 million', '250 million'], correct: 1 },
    { question: 'Who invented the printing press?', answers: ['Leonardo da Vinci', 'Benjamin Franklin', 'Johannes Gutenberg', 'Thomas Edison'], correct: 2 },
    { question: 'What was the name of the first general-purpose electronic computer?', answers: ['UNIVAC', 'ENIAC', 'Apple I', 'Colossus'], correct: 1 },
    { question: 'Around what year did Ancient Egyptian civilization begin?', answers: ['5000 BC', '3100 BC', '1500 BC', '500 BC'], correct: 1 },
    { question: 'What is the largest ocean on Earth?', answers: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correct: 3 },
    { question: 'Which is the tallest mountain in the world above sea level?', answers: ['K2', 'Mount Kilimanjaro', 'Mount Everest', 'Mauna Kea'], correct: 2 },
    { question: 'What is the largest living reptile?', answers: ['Komodo dragon', 'Green anaconda', 'Saltwater crocodile', 'Leatherback sea turtle'], correct: 2 },
    { question: 'Who painted the Mona Lisa?', answers: ['Michelangelo', 'Raphael', 'Rembrandt', 'Leonardo da Vinci'], correct: 3 },
    { question: 'When did the Berlin Wall fall?', answers: ['1985', '1987', '1989', '1991'], correct: 2 },
    { question: 'What percentage of Earth\'s surface is covered by oceans?', answers: ['51%', '61%', '71%', '81%'], correct: 2 },
    { question: 'What was the immediate cause of World War I?', answers: ['Invasion of Poland', 'Assassination of Archduke Franz Ferdinand', 'Sinking of the Lusitania', 'Treaty of Versailles'], correct: 1 },
    { question: 'What percentage of flowering plants rely on insect pollinators?', answers: ['25%', '50%', '75%', '90%'], correct: 2 },
    { question: 'In what year was the World Wide Web invented?', answers: ['1985', '1989', '1993', '1995'], correct: 1 },
    { question: 'Which continent is the largest by area?', answers: ['Africa', 'North America', 'Europe', 'Asia'], correct: 3 },
    { question: 'What is the oldest known literary work?', answers: ['The Iliad', 'The Epic of Gilgamesh', 'The Bible', 'The Odyssey'], correct: 1 },
    { question: 'When was the first public film screening held?', answers: ['1885', '1895', '1905', '1915'], correct: 1 },
    { question: 'What composer wrote his first symphony at age 8?', answers: ['Beethoven', 'Bach', 'Mozart', 'Chopin'], correct: 2 },
    { question: 'The medieval feudal system organized society into which groups?', answers: ['Kings, priests, farmers', 'Lords, vassals, serfs', 'Nobles, merchants, slaves', 'Generals, soldiers, peasants'], correct: 1 },
    { question: 'What is the smallest country in the world?', answers: ['Monaco', 'San Marino', 'Vatican City', 'Liechtenstein'], correct: 2 }
  ];

  // ============================================================
  // NAVIGATION FUNCTIONS
  // ============================================================

  function navigateToArticle(articleId: string) {
    if (!articles[articleId]) return;
    playSound('click', 0.2);
    isLoading = true;

    // Update history
    if (currentArticleId !== null) {
      // Trim forward history when navigating to new article
      history = history.slice(0, historyIndex + 1);
      history.push(currentArticleId);
      historyIndex = history.length - 1;
    }

    setTimeout(() => {
      currentArticleId = articleId;
      currentView = 'article';
      isLoading = false;
      isSearching = false;
    }, 300);
  }

  function goBack() {
    if (historyIndex < 0) return;
    playSound('click', 0.2);
    const prevId = history[historyIndex];
    historyIndex--;
    isLoading = true;
    setTimeout(() => {
      currentArticleId = prevId;
      currentView = 'article';
      isLoading = false;
    }, 300);
  }

  function goForward() {
    if (historyIndex >= history.length - 1) return;
    playSound('click', 0.2);
    historyIndex++;
    // The current article at historyIndex+1 was where we were
    // Actually, after going back, the current article is history[historyIndex]
    // Going forward means going to the article after current position
    const nextIndex = historyIndex + 1;
    if (nextIndex < history.length) {
      historyIndex = nextIndex;
      const nextId = history[historyIndex];
      isLoading = true;
      setTimeout(() => {
        currentArticleId = nextId;
        currentView = 'article';
        isLoading = false;
      }, 300);
    }
  }

  function goHome() {
    playSound('click', 0.2);
    if (currentArticleId !== null) {
      history = history.slice(0, historyIndex + 1);
      history.push(currentArticleId);
      historyIndex = history.length - 1;
    }
    currentView = 'home';
    currentArticleId = null;
    randomFact = didYouKnowFacts[Math.floor(Math.random() * didYouKnowFacts.length)];
  }

  function handlePrint() {
    playSound('click', 0.2);
    // Simulate print action
  }

  function handleCopy() {
    if (!currentArticleId || !articles[currentArticleId]) return;
    playSound('click', 0.2);
    const article = articles[currentArticleId];
    const text = `${article.title}\n\n${article.content.join('\n\n')}\n\nFun Fact: ${article.funFact}\n\n(Copied from Encarta Encyclopedia)`;
    navigator.clipboard.writeText(text).catch(() => {
      // Clipboard API may not be available
    });
  }

  // ============================================================
  // SEARCH
  // ============================================================

  function handleSearch() {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      isSearching = false;
      searchResults = [];
      return;
    }
    playSound('ding', 0.2);
    isSearching = true;
    searchResults = allArticleIds.filter(id => {
      const article = articles[id];
      return (
        article.title.toLowerCase().includes(q) ||
        article.content.some(p => p.toLowerCase().includes(q)) ||
        article.funFact.toLowerCase().includes(q)
      );
    });
  }

  function clearSearch() {
    searchQuery = '';
    isSearching = false;
    searchResults = [];
  }

  // ============================================================
  // CATEGORY TREE
  // ============================================================

  function toggleCategory(label: string) {
    playSound('click', 0.2);
    const next = new Set(expandedCategories);
    if (next.has(label)) {
      next.delete(label);
    } else {
      next.add(label);
    }
    expandedCategories = next;
  }

  // ============================================================
  // MINDMAZE
  // ============================================================

  function startMindMaze() {
    playSound('click', 0.2);
    // Pick 5 random questions
    const shuffled = [...allMindmazeQuestions].sort(() => Math.random() - 0.5);
    mindmazeQuestions = shuffled.slice(0, 5);
    currentQuestion = 0;
    mindmazeScore = 0;
    selectedAnswer = null;
    showResult = false;
    mindmazeComplete = false;
    currentView = 'mindmaze';
  }

  function selectMindmazeAnswer(index: number) {
    if (selectedAnswer !== null) return;
    selectedAnswer = index;
    showResult = true;
    const correct = mindmazeQuestions[currentQuestion].correct;
    if (index === correct) {
      mindmazeScore++;
      playSound('success', 0.3);
    } else {
      playSound('error', 0.2);
    }
  }

  function nextQuestion() {
    playSound('click', 0.2);
    if (currentQuestion < mindmazeQuestions.length - 1) {
      currentQuestion++;
      selectedAnswer = null;
      showResult = false;
    } else {
      mindmazeComplete = true;
      playSound('coin', 0.3);
    }
  }

  // ============================================================
  // DERIVED STATE
  // ============================================================

  let currentArticle = $derived(currentArticleId ? articles[currentArticleId] : null);
  let canGoBack = $derived(historyIndex >= 0);
  let canGoForward = $derived(historyIndex < history.length - 1);
  let currentArticleNumber = $derived(
    currentArticleId ? allArticleIds.indexOf(currentArticleId) + 1 : 0
  );

  // ============================================================
  // CROSS-LINK RENDERING
  // ============================================================

  function renderCrossLinks(text: string): string {
    let result = text;
    for (const [id, article] of Object.entries(articles)) {
      if (id === currentArticleId) continue;
      const escapedTitle = article.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b(${escapedTitle})\\b`, 'gi');
      let replaced = false;
      result = result.replace(regex, (match) => {
        if (replaced) return match;
        replaced = true;
        return `<button class="inline-cross-link" onclick="document.dispatchEvent(new CustomEvent('encarta-nav', {detail: '${id}'}))">${match}</button>`;
      });
    }
    return result;
  }

  function handleCrossLinkNav(e: Event) {
    const detail = (e as CustomEvent).detail;
    if (typeof detail === 'string' && articles[detail]) {
      navigateToArticle(detail);
    }
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  onMount(() => {
    registerSpots('encarta', hidingSpots);
    const beanies = getBeaniesForArea('encarta');
    hiddenBeanie = beanies.get('behind-globe') || null;

    document.addEventListener('encarta-nav', handleCrossLinkNav);
    return () => {
      document.removeEventListener('encarta-nav', handleCrossLinkNav);
    };
  });
</script>

<div class="encarta-container">
  <CloseButton onClose={onClose} />

  <!-- HEADER BAR -->
  <div class="header-bar">
    <div class="header-title">
      <span class="header-icon">&#128214;</span>
      <span class="header-text">Encarta Encyclopedia</span>
      <span class="header-edition">98</span>
    </div>
  </div>

  <!-- TOOLBAR -->
  <div class="toolbar">
    <button class="toolbar-btn" onclick={goBack} disabled={!canGoBack} title="Back">
      <span class="tb-icon">&#9664;</span> Back
    </button>
    <button class="toolbar-btn" onclick={goForward} disabled={!canGoForward} title="Forward">
      Forward <span class="tb-icon">&#9654;</span>
    </button>
    <div class="toolbar-sep"></div>
    <button class="toolbar-btn" onclick={goHome} title="Home">
      <span class="tb-icon">&#127968;</span> Home
    </button>
    <button class="toolbar-btn" onclick={startMindMaze} title="MindMaze">
      <span class="tb-icon">&#9876;</span> MindMaze
    </button>
    <div class="toolbar-sep"></div>
    <button class="toolbar-btn" onclick={handlePrint} disabled={currentView !== 'article'} title="Print">
      <span class="tb-icon">&#128424;</span> Print
    </button>
    <button class="toolbar-btn" onclick={handleCopy} disabled={currentView !== 'article'} title="Copy">
      <span class="tb-icon">&#128203;</span> Copy
    </button>
  </div>

  <!-- MAIN AREA -->
  <div class="main-area">
    <!-- SIDEBAR -->
    <div class="sidebar">
      <!-- Search -->
      <div class="search-box">
        <input
          type="text"
          class="search-input"
          placeholder="Search encyclopedia..."
          bind:value={searchQuery}
          onkeydown={(e) => { if (e.key === 'Enter') handleSearch(); }}
        />
        <button class="search-btn" onclick={handleSearch} title="Search">&#128269;</button>
        {#if isSearching}
          <button class="search-clear" onclick={clearSearch} title="Clear search">&times;</button>
        {/if}
      </div>

      <!-- Search Results or Category Tree -->
      <div class="sidebar-content">
        {#if isSearching}
          <div class="search-results">
            <div class="search-results-header">
              Search Results ({searchResults.length})
            </div>
            {#if searchResults.length === 0}
              <div class="no-results">No articles found.</div>
            {:else}
              {#each searchResults as resultId}
                <button
                  class="search-result-item"
                  class:active={currentArticleId === resultId}
                  onclick={() => navigateToArticle(resultId)}
                >
                  &#128196; {articles[resultId].title}
                </button>
              {/each}
            {/if}
          </div>
        {:else}
          <div class="category-tree">
            {#each categoryTree as category}
              <div class="category-node">
                <button
                  class="category-label"
                  onclick={() => toggleCategory(category.label)}
                >
                  <span class="tree-icon">{expandedCategories.has(category.label) ? '&#9660;' : '&#9654;'}</span>
                  <span class="folder-icon">{expandedCategories.has(category.label) ? '&#128194;' : '&#128193;'}</span>
                  {category.label}
                </button>
                {#if expandedCategories.has(category.label) && category.children}
                  <div class="category-children">
                    {#each category.children as child}
                      <button
                        class="leaf-node"
                        class:active={currentArticleId === child.articleId}
                        onclick={() => child.articleId && navigateToArticle(child.articleId)}
                      >
                        <span class="leaf-icon">&#128196;</span>
                        {child.label}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- CONTENT AREA -->
    <div class="content-area">
      {#if isLoading}
        <div class="loading-screen">
          <div class="cd-spinner"></div>
          <div class="loading-text">Reading from CD-ROM...</div>
        </div>
      {:else if currentView === 'home'}
        <!-- HOME SCREEN -->
        <div class="home-screen">
          <div class="home-top">
            <div class="globe-container">
              <div class="globe">
                <div class="globe-shine"></div>
                <div class="globe-line globe-line-1"></div>
                <div class="globe-line globe-line-2"></div>
                <div class="globe-line globe-line-3"></div>
                <div class="globe-meridian globe-meridian-1"></div>
                <div class="globe-meridian globe-meridian-2"></div>
              </div>
              {#if hiddenBeanie}
                <div class="beanie-spot">
                  <HidingBeanie beanie={hiddenBeanie} />
                </div>
              {/if}
            </div>
            <div class="home-title-block">
              <h1 class="home-title">Microsoft Encarta</h1>
              <h2 class="home-subtitle">Encyclopedia</h2>
              <div class="home-edition">Deluxe Edition &bull; 1998</div>
              <div class="home-tagline">Explore the world of knowledge</div>
            </div>
          </div>

          <div class="did-you-know">
            <div class="dyk-header">&#128161; Did You Know?</div>
            <div class="dyk-text">{randomFact}</div>
          </div>

          <div class="home-categories">
            <div class="home-cat-header">Browse by Category</div>
            <div class="home-cat-grid">
              {#each categoryTree as category}
                <button
                  class="home-cat-btn"
                  onclick={() => {
                    expandedCategories = new Set([category.label]);
                    if (category.children && category.children.length > 0 && category.children[0].articleId) {
                      navigateToArticle(category.children[0].articleId);
                    }
                  }}
                >
                  <span class="hc-icon">
                    {#if category.label === 'Science & Technology'}&#128300;
                    {:else if category.label === 'History'}&#127984;
                    {:else if category.label === 'Geography'}&#127757;
                    {:else if category.label === 'Animals'}&#128062;
                    {:else if category.label === 'Arts & Culture'}&#127912;
                    {/if}
                  </span>
                  <span class="hc-label">{category.label}</span>
                </button>
              {/each}
            </div>
          </div>

          <div class="home-footer-text">
            Insert Disc 2 for additional multimedia content
          </div>
        </div>

      {:else if currentView === 'article' && currentArticle}
        <!-- ARTICLE VIEW -->
        <div class="article-view">
          <div class="article-category-bar">
            {currentArticle.category} &rsaquo; {currentArticle.subcategory}
          </div>

          <h1 class="article-title">{currentArticle.title}</h1>

          <div class="article-image" style="background-color: {currentArticle.imageColor};">
            <div class="image-placeholder-icon">&#128247;</div>
            <div class="image-caption">{currentArticle.imageCaption}</div>
          </div>

          <div class="article-body">
            {#each currentArticle.content as paragraph}
              <p class="article-paragraph">{@html renderCrossLinks(paragraph)}</p>
            {/each}
          </div>

          <div class="fun-fact-box">
            <div class="fun-fact-header">&#127775; Fun Fact</div>
            <div class="fun-fact-text">{currentArticle.funFact}</div>
          </div>

          {#if currentArticle.seeAlso.length > 0}
            <div class="see-also">
              <div class="see-also-header">See Also</div>
              <div class="see-also-links">
                {#each currentArticle.seeAlso as refId}
                  {#if articles[refId]}
                    <button
                      class="cross-link"
                      onclick={() => navigateToArticle(refId)}
                    >
                      {articles[refId].title}
                    </button>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}
        </div>

      {:else if currentView === 'mindmaze'}
        <!-- MINDMAZE -->
        <div class="mindmaze">
          <div class="mm-castle-header">
            <div class="mm-tower mm-tower-left">
              <div class="mm-battlement"></div>
              <div class="mm-tower-body"></div>
            </div>
            <div class="mm-banner">
              <h2 class="mm-title">MindMaze</h2>
              <div class="mm-subtitle">The Castle of Knowledge</div>
            </div>
            <div class="mm-tower mm-tower-right">
              <div class="mm-battlement"></div>
              <div class="mm-tower-body"></div>
            </div>
          </div>

          {#if mindmazeComplete}
            <div class="mm-complete">
              <div class="mm-complete-icon">&#127942;</div>
              <h3 class="mm-complete-title">Quest Complete!</h3>
              <div class="mm-final-score">
                You answered {mindmazeScore} of {mindmazeQuestions.length} correctly!
              </div>
              <div class="mm-score-stars">
                {#each Array(mindmazeScore) as _}
                  <span class="mm-star filled">&#9733;</span>
                {/each}
                {#each Array(mindmazeQuestions.length - mindmazeScore) as _}
                  <span class="mm-star empty">&#9734;</span>
                {/each}
              </div>
              <div class="mm-buttons">
                <button class="mm-btn" onclick={startMindMaze}>Play Again</button>
                <button class="mm-btn" onclick={goHome}>Return to Encyclopedia</button>
              </div>
            </div>
          {:else if mindmazeQuestions.length > 0}
            <div class="mm-game">
              <div class="mm-progress">
                Question {currentQuestion + 1} of {mindmazeQuestions.length}
                &nbsp;&bull;&nbsp;
                Score: {mindmazeScore}
              </div>

              <div class="mm-question-card">
                <div class="mm-question-text">
                  {mindmazeQuestions[currentQuestion].question}
                </div>

                <div class="mm-answers">
                  {#each mindmazeQuestions[currentQuestion].answers as answer, i}
                    <button
                      class="mm-answer"
                      class:selected={selectedAnswer === i}
                      class:correct={showResult && i === mindmazeQuestions[currentQuestion].correct}
                      class:wrong={showResult && selectedAnswer === i && i !== mindmazeQuestions[currentQuestion].correct}
                      onclick={() => selectMindmazeAnswer(i)}
                      disabled={selectedAnswer !== null}
                    >
                      <span class="mm-answer-letter">{String.fromCharCode(65 + i)}</span>
                      {answer}
                    </button>
                  {/each}
                </div>

                {#if showResult}
                  <div class="mm-feedback" class:mm-correct={selectedAnswer === mindmazeQuestions[currentQuestion].correct} class:mm-wrong={selectedAnswer !== mindmazeQuestions[currentQuestion].correct}>
                    {#if selectedAnswer === mindmazeQuestions[currentQuestion].correct}
                      &#9989; Correct! Well done, noble scholar!
                    {:else}
                      &#10060; Incorrect. The answer was: {mindmazeQuestions[currentQuestion].answers[mindmazeQuestions[currentQuestion].correct]}
                    {/if}
                  </div>
                  <button class="mm-next-btn" onclick={nextQuestion}>
                    {currentQuestion < mindmazeQuestions.length - 1 ? 'Next Question' : 'See Results'}
                  </button>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- STATUS BAR -->
  <div class="status-bar">
    <div class="status-left">
      {#if currentView === 'article' && currentArticle}
        Article {currentArticleNumber} of {totalArticles}
      {:else if currentView === 'mindmaze'}
        MindMaze - Test Your Knowledge
      {:else}
        Ready
      {/if}
    </div>
    <div class="status-right">
      Encarta 98 &bull; &copy; Microsoft Corporation
    </div>
  </div>
</div>

<style>
  /* ============================================================
     BASE LAYOUT
     ============================================================ */
  .encarta-container {
    position: fixed;
    inset: 0;
    background: #1a1a2e;
    display: flex;
    flex-direction: column;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #222;
    z-index: 100;
    overflow: hidden;
  }

  /* ============================================================
     HEADER
     ============================================================ */
  .header-bar {
    background: linear-gradient(180deg, #5b2d8e 0%, #3a1a5e 100%);
    padding: 6px 60px 6px 16px;
    display: flex;
    align-items: center;
    min-height: 36px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    flex-shrink: 0;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-icon {
    font-size: 20px;
  }

  .header-text {
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .header-edition {
    color: #c9a6ff;
    font-size: 12px;
    font-weight: 700;
    background: rgba(255,255,255,0.15);
    padding: 1px 6px;
    border-radius: 3px;
    margin-left: 4px;
  }

  /* ============================================================
     TOOLBAR
     ============================================================ */
  .toolbar {
    background: linear-gradient(180deg, #e8e0f0 0%, #c8b8d8 100%);
    border-bottom: 1px solid #9a8aaa;
    padding: 3px 8px;
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .toolbar-btn {
    background: linear-gradient(180deg, #f0eaf6 0%, #d8cce8 100%);
    border: 1px solid #9a8aaa;
    border-radius: 3px;
    padding: 3px 10px;
    font-size: 12px;
    font-family: inherit;
    color: #333;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 3px;
    white-space: nowrap;
  }

  .toolbar-btn:hover:not(:disabled) {
    background: linear-gradient(180deg, #fff 0%, #e8ddf4 100%);
    border-color: #6b4d8e;
  }

  .toolbar-btn:active:not(:disabled) {
    background: linear-gradient(180deg, #c8b8d8 0%, #e8e0f0 100%);
  }

  .toolbar-btn:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .tb-icon {
    font-size: 11px;
  }

  .toolbar-sep {
    width: 1px;
    height: 20px;
    background: #9a8aaa;
    margin: 0 4px;
  }

  /* ============================================================
     MAIN AREA
     ============================================================ */
  .main-area {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
  }

  /* ============================================================
     SIDEBAR
     ============================================================ */
  .sidebar {
    width: 240px;
    min-width: 240px;
    background: linear-gradient(180deg, #f5f0fa 0%, #e8e0f0 100%);
    border-right: 2px solid #9a8aaa;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .search-box {
    padding: 6px;
    background: #d8cce8;
    border-bottom: 1px solid #9a8aaa;
    display: flex;
    gap: 4px;
    align-items: center;
    position: relative;
  }

  .search-input {
    flex: 1;
    padding: 4px 6px;
    font-size: 12px;
    font-family: inherit;
    border: 1px solid #9a8aaa;
    border-radius: 2px;
    background: #fff;
    outline: none;
    min-width: 0;
  }

  .search-input:focus {
    border-color: #5b2d8e;
  }

  .search-btn {
    background: linear-gradient(180deg, #f0eaf6 0%, #d8cce8 100%);
    border: 1px solid #9a8aaa;
    border-radius: 2px;
    padding: 3px 6px;
    font-size: 13px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .search-btn:hover {
    background: #fff;
  }

  .search-clear {
    position: absolute;
    right: 38px;
    background: none;
    border: none;
    font-size: 14px;
    cursor: pointer;
    color: #888;
    padding: 2px 4px;
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  /* Category Tree */
  .category-tree {
    user-select: none;
  }

  .category-node {
    margin: 0;
  }

  .category-label {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    padding: 4px 8px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    background: none;
    border: none;
    cursor: pointer;
    color: #2a1a4e;
    text-align: left;
  }

  .category-label:hover {
    background: rgba(91, 45, 142, 0.1);
  }

  .tree-icon {
    font-size: 9px;
    width: 12px;
    text-align: center;
    flex-shrink: 0;
  }

  .folder-icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .category-children {
    padding-left: 16px;
  }

  .leaf-node {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    padding: 3px 8px;
    font-size: 12px;
    font-family: inherit;
    background: none;
    border: none;
    cursor: pointer;
    color: #333;
    text-align: left;
  }

  .leaf-node:hover {
    background: rgba(91, 45, 142, 0.1);
    color: #5b2d8e;
  }

  .leaf-node.active {
    background: #5b2d8e;
    color: #fff;
    border-radius: 2px;
  }

  .leaf-icon {
    font-size: 12px;
    flex-shrink: 0;
  }

  /* Search Results */
  .search-results-header {
    padding: 6px 8px;
    font-size: 12px;
    font-weight: 600;
    color: #5b2d8e;
    border-bottom: 1px solid #d8cce8;
  }

  .no-results {
    padding: 16px 8px;
    font-size: 12px;
    color: #888;
    text-align: center;
    font-style: italic;
  }

  .search-result-item {
    display: block;
    width: 100%;
    padding: 5px 8px;
    font-size: 12px;
    font-family: inherit;
    background: none;
    border: none;
    cursor: pointer;
    color: #333;
    text-align: left;
  }

  .search-result-item:hover {
    background: rgba(91, 45, 142, 0.1);
    color: #5b2d8e;
  }

  .search-result-item.active {
    background: #5b2d8e;
    color: #fff;
  }

  /* ============================================================
     CONTENT AREA
     ============================================================ */
  .content-area {
    flex: 1;
    overflow-y: auto;
    background: #fff;
    min-width: 0;
  }

  /* ============================================================
     LOADING
     ============================================================ */
  .loading-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 16px;
    background: #f8f4fc;
  }

  .cd-spinner {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 4px solid #d8cce8;
    border-top-color: #5b2d8e;
    animation: cd-spin 0.8s linear infinite;
  }

  @keyframes cd-spin {
    to { transform: rotate(360deg); }
  }

  .loading-text {
    font-size: 13px;
    color: #5b2d8e;
    font-style: italic;
  }

  /* ============================================================
     HOME SCREEN
     ============================================================ */
  .home-screen {
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    min-height: 100%;
    background: linear-gradient(180deg, #f8f4fc 0%, #e8e0f0 50%, #d0c4e0 100%);
  }

  .home-top {
    display: flex;
    align-items: center;
    gap: 32px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .globe-container {
    position: relative;
    width: 120px;
    height: 120px;
    flex-shrink: 0;
  }

  .globe {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1a6b8a 0%, #0d4f6b 30%, #1a8a6b 60%, #0d6b4f 100%);
    box-shadow:
      inset -10px -10px 30px rgba(0,0,0,0.4),
      inset 5px 5px 20px rgba(255,255,255,0.15),
      0 4px 20px rgba(0,0,0,0.3);
    animation: globe-rotate 12s linear infinite;
    position: relative;
    overflow: hidden;
  }

  .globe-shine {
    position: absolute;
    top: 15px;
    left: 20px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%);
  }

  .globe-line {
    position: absolute;
    width: 100%;
    height: 1px;
    background: rgba(255,255,255,0.15);
    left: 0;
  }

  .globe-line-1 { top: 30%; }
  .globe-line-2 { top: 50%; }
  .globe-line-3 { top: 70%; }

  .globe-meridian {
    position: absolute;
    top: 0;
    width: 1px;
    height: 100%;
    background: rgba(255,255,255,0.15);
  }

  .globe-meridian-1 { left: 40%; }
  .globe-meridian-2 { left: 65%; }

  @keyframes globe-rotate {
    0% { background-position: 0 0; }
    100% { background-position: 240px 0; }
  }

  .beanie-spot {
    position: absolute;
    bottom: -10px;
    right: -15px;
    z-index: 5;
  }

  .home-title-block {
    text-align: center;
  }

  .home-title {
    font-size: 28px;
    font-weight: 300;
    color: #3a1a5e;
    margin: 0;
    letter-spacing: 1px;
  }

  .home-subtitle {
    font-size: 20px;
    font-weight: 600;
    color: #5b2d8e;
    margin: 0;
  }

  .home-edition {
    font-size: 12px;
    color: #7a5a9e;
    margin-top: 6px;
  }

  .home-tagline {
    font-size: 13px;
    color: #888;
    font-style: italic;
    margin-top: 4px;
  }

  .did-you-know {
    background: linear-gradient(135deg, #2a5a6a 0%, #1a4a5a 100%);
    color: #fff;
    padding: 16px 20px;
    border-radius: 6px;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }

  .dyk-header {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 6px;
    color: #7ae0c0;
  }

  .dyk-text {
    font-size: 13px;
    line-height: 1.5;
    color: #dceef4;
  }

  .home-categories {
    width: 100%;
    max-width: 500px;
  }

  .home-cat-header {
    font-size: 14px;
    font-weight: 600;
    color: #5b2d8e;
    margin-bottom: 10px;
    text-align: center;
  }

  .home-cat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px;
  }

  .home-cat-btn {
    background: linear-gradient(180deg, #fff 0%, #f0eaf6 100%);
    border: 1px solid #c8b8d8;
    border-radius: 4px;
    padding: 12px 8px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-family: inherit;
    transition: all 0.15s ease;
  }

  .home-cat-btn:hover {
    background: linear-gradient(180deg, #fff 0%, #e0d4f0 100%);
    border-color: #5b2d8e;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(91, 45, 142, 0.2);
  }

  .hc-icon {
    font-size: 24px;
  }

  .hc-label {
    font-size: 11px;
    font-weight: 600;
    color: #3a1a5e;
    text-align: center;
  }

  .home-footer-text {
    font-size: 11px;
    color: #aaa;
    font-style: italic;
    margin-top: 8px;
  }

  /* ============================================================
     ARTICLE VIEW
     ============================================================ */
  .article-view {
    padding: 20px 24px 32px;
    max-width: 700px;
  }

  .article-category-bar {
    font-size: 11px;
    color: #5b2d8e;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .article-title {
    font-size: 24px;
    font-weight: 300;
    color: #2a1a4e;
    margin: 0 0 16px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid #5b2d8e;
  }

  .article-image {
    width: 100%;
    max-width: 400px;
    height: 180px;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 0 0 16px 0;
    border: 1px solid #ccc;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
  }

  .image-placeholder-icon {
    font-size: 36px;
    opacity: 0.5;
  }

  .image-caption {
    color: rgba(255,255,255,0.8);
    font-size: 11px;
    margin-top: 8px;
    text-align: center;
    padding: 0 12px;
    font-style: italic;
  }

  .article-body {
    margin-bottom: 20px;
  }

  .article-paragraph {
    font-size: 14px;
    line-height: 1.7;
    color: #333;
    margin: 0 0 14px 0;
    text-align: justify;
  }

  .fun-fact-box {
    background: linear-gradient(135deg, #f8f0ff 0%, #efe4f8 100%);
    border: 1px solid #d8cce8;
    border-left: 4px solid #5b2d8e;
    padding: 12px 16px;
    border-radius: 0 4px 4px 0;
    margin-bottom: 20px;
  }

  .fun-fact-header {
    font-size: 13px;
    font-weight: 700;
    color: #5b2d8e;
    margin-bottom: 4px;
  }

  .fun-fact-text {
    font-size: 13px;
    line-height: 1.5;
    color: #444;
  }

  .see-also {
    border-top: 1px solid #d8cce8;
    padding-top: 12px;
  }

  .see-also-header {
    font-size: 13px;
    font-weight: 700;
    color: #5b2d8e;
    margin-bottom: 8px;
  }

  .see-also-links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .cross-link {
    background: none;
    border: none;
    font-family: inherit;
    font-size: 13px;
    color: #0066cc;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
  }

  .cross-link:hover {
    color: #004499;
  }

  /* Inline cross-links in article text */
  :global(.inline-cross-link) {
    background: none;
    border: none;
    font-family: inherit;
    font-size: inherit;
    color: #0066cc;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    line-height: inherit;
  }

  :global(.inline-cross-link:hover) {
    color: #004499;
  }

  /* ============================================================
     MINDMAZE
     ============================================================ */
  .mindmaze {
    min-height: 100%;
    background: linear-gradient(180deg, #2a1a0a 0%, #3d2a14 30%, #2a1a0a 100%);
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .mm-castle-header {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 16px 16px 0;
    gap: 0;
  }

  .mm-tower {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 40px;
  }

  .mm-battlement {
    width: 40px;
    height: 12px;
    background: repeating-linear-gradient(
      90deg,
      #8B7355 0px, #8B7355 8px,
      transparent 8px, transparent 12px
    );
  }

  .mm-tower-body {
    width: 30px;
    height: 40px;
    background: linear-gradient(180deg, #8B7355 0%, #6B5335 100%);
    border: 1px solid #5a4530;
  }

  .mm-banner {
    background: linear-gradient(180deg, #5b2d8e 0%, #3a1a5e 100%);
    padding: 12px 32px;
    text-align: center;
    border: 2px solid #8B7355;
    border-bottom: none;
  }

  .mm-title {
    font-size: 22px;
    font-weight: 700;
    color: #f0d890;
    margin: 0;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
    letter-spacing: 2px;
  }

  .mm-subtitle {
    font-size: 11px;
    color: #c9a6ff;
    margin-top: 2px;
  }

  .mm-game {
    padding: 20px;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .mm-progress {
    font-size: 13px;
    color: #c9a6ff;
    margin-bottom: 16px;
    text-align: center;
  }

  .mm-question-card {
    background: linear-gradient(180deg, #f8f0e8 0%, #ede0d0 100%);
    border: 2px solid #8B7355;
    border-radius: 6px;
    padding: 20px;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }

  .mm-question-text {
    font-size: 16px;
    font-weight: 600;
    color: #2a1a0a;
    margin-bottom: 16px;
    line-height: 1.4;
    text-align: center;
  }

  .mm-answers {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .mm-answer {
    background: linear-gradient(180deg, #fff 0%, #f0eaf6 100%);
    border: 2px solid #c8b8d8;
    border-radius: 4px;
    padding: 10px 14px;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.15s ease;
    color: #333;
  }

  .mm-answer:hover:not(:disabled) {
    border-color: #5b2d8e;
    background: linear-gradient(180deg, #fff 0%, #e8ddf4 100%);
  }

  .mm-answer:disabled {
    cursor: default;
  }

  .mm-answer.correct {
    border-color: #2e7d32;
    background: linear-gradient(180deg, #e8f5e9 0%, #c8e6c9 100%);
  }

  .mm-answer.wrong {
    border-color: #c62828;
    background: linear-gradient(180deg, #ffebee 0%, #ffcdd2 100%);
  }

  .mm-answer-letter {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #5b2d8e;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .mm-feedback {
    margin-top: 12px;
    padding: 10px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    text-align: center;
  }

  .mm-correct {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .mm-wrong {
    background: #ffebee;
    color: #c62828;
  }

  .mm-next-btn {
    display: block;
    margin: 14px auto 0;
    background: linear-gradient(180deg, #5b2d8e 0%, #3a1a5e 100%);
    color: #fff;
    border: 1px solid #2a1a4e;
    border-radius: 4px;
    padding: 8px 24px;
    font-size: 14px;
    font-family: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .mm-next-btn:hover {
    background: linear-gradient(180deg, #6b3d9e 0%, #4a2a6e 100%);
  }

  .mm-complete {
    padding: 32px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .mm-complete-icon {
    font-size: 48px;
  }

  .mm-complete-title {
    font-size: 22px;
    font-weight: 700;
    color: #f0d890;
    margin: 0;
  }

  .mm-final-score {
    font-size: 16px;
    color: #dceef4;
  }

  .mm-score-stars {
    font-size: 28px;
    display: flex;
    gap: 4px;
  }

  .mm-star.filled {
    color: #f0d890;
  }

  .mm-star.empty {
    color: #555;
  }

  .mm-buttons {
    display: flex;
    gap: 12px;
    margin-top: 8px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .mm-btn {
    background: linear-gradient(180deg, #5b2d8e 0%, #3a1a5e 100%);
    color: #fff;
    border: 1px solid #2a1a4e;
    border-radius: 4px;
    padding: 8px 20px;
    font-size: 13px;
    font-family: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .mm-btn:hover {
    background: linear-gradient(180deg, #6b3d9e 0%, #4a2a6e 100%);
  }

  /* ============================================================
     STATUS BAR
     ============================================================ */
  .status-bar {
    background: linear-gradient(180deg, #d8cce8 0%, #c8b8d8 100%);
    border-top: 1px solid #9a8aaa;
    padding: 3px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #555;
    flex-shrink: 0;
    min-height: 22px;
  }

  .status-left, .status-right {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ============================================================
     RESPONSIVE
     ============================================================ */
  @media (max-width: 768px) {
    .sidebar {
      width: 180px;
      min-width: 180px;
    }

    .home-title {
      font-size: 22px;
    }

    .home-subtitle {
      font-size: 16px;
    }

    .globe-container, .globe {
      width: 90px;
      height: 90px;
    }

    .home-top {
      gap: 16px;
    }

    .article-title {
      font-size: 20px;
    }

    .mm-question-text {
      font-size: 14px;
    }
  }

  @media (max-width: 520px) {
    .sidebar {
      width: 0;
      min-width: 0;
      border-right: none;
      display: none;
    }

    .toolbar-btn {
      padding: 3px 6px;
      font-size: 11px;
    }

    .article-view {
      padding: 16px;
    }

    .home-screen {
      padding: 16px;
    }

    .home-cat-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
