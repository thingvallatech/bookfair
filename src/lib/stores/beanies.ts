// Beanie Baby data - local images with transparent backgrounds

export interface Beanie {
  name: string;
  animal: string;
  image: string;
  birthday: string;
  poem: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'ultra-rare' | 'legendary';
}

export const ALL_BEANIES: Beanie[] = [
  // === COMMON ===
  { name: 'Spot', animal: 'Dog', image: '/beanies/spot.png', birthday: 'January 3, 1993', poem: 'See Spot run, see Spot play\nSee Spot brighten up your day', rarity: 'common' },
  { name: 'Squealer', animal: 'Pig', image: '/beanies/squealer.png', birthday: 'April 23, 1993', poem: 'Squealer likes to joke around\nHe is known as the class clown', rarity: 'common' },
  { name: 'Legs', animal: 'Frog', image: '/beanies/legs.png', birthday: 'April 25, 1993', poem: 'Legs lives in a lily pad\nCatching flies is never bad', rarity: 'common' },
  { name: 'Flash', animal: 'Dolphin', image: '/beanies/flash.png', birthday: 'May 13, 1993', poem: 'You know dolphins are smart\nBut Flash has got a kind heart', rarity: 'common' },
  { name: 'Chocolate', animal: 'Moose', image: '/beanies/chocolate.png', birthday: 'April 27, 1993', poem: 'Licorice, gum and a chocolate bar\nThis moose travels near and far', rarity: 'common' },
  { name: 'Cubbie', animal: 'Bear', image: '/beanies/cubbie.png', birthday: 'November 14, 1993', poem: 'Cubbie used to eat crackers and honey\nAnd what happened to his money?', rarity: 'common' },
  { name: 'Ally', animal: 'Alligator', image: '/beanies/ally.png', birthday: 'March 14, 1994', poem: 'When Ally gets out of classes\nHe wears his dark sunglasses', rarity: 'common' },
  { name: 'Snort', animal: 'Bull', image: '/beanies/snort.png', birthday: 'May 15, 1995', poem: 'Although Snort is not so tall\nHe loves to play basketball', rarity: 'common' },
  { name: 'Happy', animal: 'Hippo', image: '/beanies/happy.png', birthday: 'February 25, 1994', poem: 'Happy the hippo loves to wade\nIn the water and in the shade', rarity: 'common' },
  { name: 'Speedy', animal: 'Turtle', image: '/beanies/speedy.png', birthday: 'August 14, 1994', poem: 'Speedy ran marathons in the past\nSome say he was never fast', rarity: 'common' },
  { name: 'Bumble', animal: 'Bee', image: '/beanies/bumble.png', birthday: 'October 16, 1995', poem: 'Bumble the bee will not sting you\nIt is only love that will bring you', rarity: 'common' },
  { name: 'Lucky', animal: 'Ladybug', image: '/beanies/lucky.png', birthday: 'May 1, 1995', poem: 'Lucky the ladybug loves the lotto\nSomeday she\'ll win and say "I got-o!"', rarity: 'common' },
  { name: 'Hoot', animal: 'Owl', image: '/beanies/hoot.png', birthday: 'August 9, 1995', poem: 'Late at night when you\'re asleep\nHoot is awake and doesn\'t make a peep', rarity: 'common' },
  { name: 'Dotty', animal: 'Dalmatian', image: '/beanies/dotty.png', birthday: 'October 17, 1996', poem: 'Dotty is the dog for you and me\nShe\'s as cute as she can be', rarity: 'common' },
  { name: 'Crunch', animal: 'Shark', image: '/beanies/crunch.png', birthday: 'January 13, 1996', poem: 'What\'s for breakfast, what\'s for lunch?\nYum! Yum! Munch! Munch! Munch!', rarity: 'common' },
  { name: 'Scoop', animal: 'Pelican', image: '/beanies/scoop.png', birthday: 'July 1, 1996', poem: 'All day long he scoops up fish\nTo fill his bill, is his wish', rarity: 'common' },
  { name: 'Ringo', animal: 'Raccoon', image: '/beanies/ringo.png', birthday: 'July 14, 1995', poem: 'Ringo hides behind a mask\nHe\'ll be your friend, if you ask', rarity: 'common' },
  { name: 'Roary', animal: 'Lion', image: '/beanies/roary.png', birthday: 'February 20, 1996', poem: 'Deep in the jungle they crowned him king\nBut being brave is not his thing', rarity: 'common' },

  // === UNCOMMON ===
  { name: 'Pinky', animal: 'Flamingo', image: '/beanies/pinky.png', birthday: 'February 13, 1995', poem: 'Pinky loves the Everglades\nFrom the hottest pink she never fades', rarity: 'uncommon' },
  { name: 'Patti', animal: 'Platypus', image: '/beanies/patti.png', birthday: 'January 6, 1993', poem: 'Ran into Patti one day while walking\nBelieve me she is not much for talking', rarity: 'uncommon' },
  { name: 'Stripes', animal: 'Tiger', image: '/beanies/stripes.png', birthday: 'June 11, 1995', poem: 'Stripes was never fierce nor strong\nSo with tigers he didn\'t belong', rarity: 'uncommon' },
  { name: 'Goldie', animal: 'Goldfish', image: '/beanies/goldie.png', birthday: 'November 14, 1994', poem: 'She\'s got the rhythm, she\'s got the soul\nWhat more could you want in a fish bowl?', rarity: 'uncommon' },
  { name: 'Twigs', animal: 'Giraffe', image: '/beanies/twigs.png', birthday: 'May 19, 1995', poem: 'Twigs has his head up in the clouds\nHe stands tall, above the crowds', rarity: 'uncommon' },
  { name: 'Waddle', animal: 'Penguin', image: '/beanies/waddle.png', birthday: 'December 19, 1995', poem: 'Waddle the penguin likes to dress up\nEvery day he wears his tux', rarity: 'uncommon' },
  { name: 'Sly', animal: 'Fox', image: '/beanies/sly.png', birthday: 'September 12, 1996', poem: 'Sly is a fox and tricky is he\nPlease don\'t chase him, let him be', rarity: 'uncommon' },
  { name: 'Bongo', animal: 'Monkey', image: '/beanies/bongo.png', birthday: 'August 17, 1995', poem: 'Bongo the monkey lives in a tree\nThe happiest monkey you\'ll ever see', rarity: 'uncommon' },
  { name: 'Waves', animal: 'Orca', image: '/beanies/waves.png', birthday: 'December 8, 1996', poem: 'Join him today on the Internet\nHis homepage is the best yet', rarity: 'uncommon' },
  { name: 'Claude', animal: 'Crab', image: '/beanies/claude.png', birthday: 'September 3, 1996', poem: 'Claude the crab paints by the sea\nA famous artist he hopes to be', rarity: 'uncommon' },
  { name: 'Mystic', animal: 'Unicorn', image: '/beanies/mystic.png', birthday: 'May 21, 1994', poem: 'Once upon a time so far away\nA unicorn was born one magical day', rarity: 'uncommon' },

  // === RARE ===
  { name: 'Rex', animal: 'Tyrannosaurus', image: '/beanies/rex.png', birthday: 'January 1, 1995', poem: 'Rex is very very rare\nGet him if you dare', rarity: 'rare' },
  { name: 'Steg', animal: 'Stegosaurus', image: '/beanies/steg.png', birthday: 'January 1, 1995', poem: 'No Jurassic Park for Steg\nHe prefers to eat a drumstick leg', rarity: 'rare' },
  { name: 'Garcia', animal: 'Bear', image: '/beanies/garcia.png', birthday: 'August 1, 1995', poem: 'The Deadhead bear likes to party\nHe\'s one groovy arty smarty', rarity: 'rare' },
  { name: 'Peace', animal: 'Bear', image: '/beanies/peace.png', birthday: 'February 1, 1996', poem: 'All races, all colors, under the sun\nJoin hands together and have some fun', rarity: 'rare' },
  { name: 'Valentino', animal: 'Bear', image: '/beanies/valentino.png', birthday: 'February 14, 1994', poem: 'His heart is red and full of love\nHe cares for you so give a hug', rarity: 'rare' },
  { name: 'Erin', animal: 'Bear', image: '/beanies/erin.png', birthday: 'March 17, 1997', poem: 'Named after the beautiful Emerald Isle\nThis bear will make you smile', rarity: 'rare' },
  { name: 'Glory', animal: 'Bear', image: '/beanies/glory.png', birthday: 'July 4, 1997', poem: 'Waving the flag for all to see\nBorn on the Fourth of July is he', rarity: 'rare' },

  // === ULTRA RARE ===
  { name: 'Peanut', animal: 'Elephant', image: '/beanies/peanut.png', birthday: 'January 25, 1995', poem: 'Peanut the elephant walks on tip-toe\nSneaking around wherever she may go', rarity: 'ultra-rare' },
  { name: 'Nana', animal: 'Monkey', image: '/beanies/nana.png', birthday: 'August 1, 1995', poem: 'This monkey was named after a star\nCollectors traveled near and far', rarity: 'ultra-rare' },

  // === LEGENDARY ===
  { name: 'Princess', animal: 'Bear', image: '/beanies/princess.png', birthday: 'October 1, 1997', poem: 'Like an angel she came from heaven above\nShe shared her compassion, her pain, her love', rarity: 'legendary' },
];

// Rarity weights for random selection
const RARITY_WEIGHTS: Record<string, number> = {
  'common': 60,
  'uncommon': 25,
  'rare': 10,
  'ultra-rare': 4,
  'legendary': 1
};

// Pick a random beanie based on rarity weights
export function pickRandomBeanie(exclude: string[] = []): Beanie {
  const available = ALL_BEANIES.filter(b => !exclude.includes(b.name));
  if (available.length === 0) return ALL_BEANIES[0];

  // Calculate total weight
  let totalWeight = 0;
  for (const beanie of available) {
    totalWeight += RARITY_WEIGHTS[beanie.rarity];
  }

  // Pick random
  let roll = Math.random() * totalWeight;
  for (const beanie of available) {
    roll -= RARITY_WEIGHTS[beanie.rarity];
    if (roll <= 0) return beanie;
  }

  return available[0];
}
