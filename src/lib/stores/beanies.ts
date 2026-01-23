// Beanie Baby data - real images from beaniepedia.com

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
  { name: 'Spot', animal: 'Dog', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2023/02/spotwpotbboc.jpg?fit=300%2C300&ssl=1', birthday: 'January 3, 1993', poem: 'See Spot run, see Spot play\nSee Spot brighten up your day', rarity: 'common' },
  { name: 'Squealer', animal: 'Pig', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2012/10/41TP0C93AYL._SL500_AA300_.jpg?fit=300%2C300&ssl=1', birthday: 'April 23, 1993', poem: 'Squealer likes to joke around\nHe is known as the class clown', rarity: 'common' },
  { name: 'Legs', animal: 'Frog', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2012/10/legs.jpg?fit=350%2C350&ssl=1', birthday: 'April 25, 1993', poem: 'Legs lives in a lily pad\nCatching flies is never bad', rarity: 'common' },
  { name: 'Flash', animal: 'Dolphin', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2012/10/flash.jpg?fit=350%2C350&ssl=1', birthday: 'May 13, 1993', poem: 'You know dolphins are smart\nBut Flash has got a kind heart', rarity: 'common' },
  { name: 'Chocolate', animal: 'Moose', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2012/10/41Uh6b0cn1L._SL500_AA300_.jpg?fit=300%2C300&ssl=1', birthday: 'April 27, 1993', poem: 'Licorice, gum and a chocolate bar\nThis moose travels near and far', rarity: 'common' },
  { name: 'Cubbie', animal: 'Bear', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2012/10/cubbie1.jpg?fit=254%2C254&ssl=1', birthday: 'November 14, 1993', poem: 'Cubbie used to eat crackers and honey\nAnd what happened to his money?', rarity: 'common' },
  { name: 'Ally', animal: 'Alligator', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2012/10/ally.png?fit=300%2C300&ssl=1', birthday: 'March 14, 1994', poem: 'When Ally gets out of classes\nHe wears his dark sunglasses', rarity: 'common' },
  { name: 'Snort', animal: 'Bull', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/08/snort.jpg?fit=540%2C540&ssl=1', birthday: 'May 15, 1995', poem: 'Although Snort is not so tall\nHe loves to play basketball', rarity: 'common' },
  { name: 'Happy', animal: 'Hippo', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2021/09/happy.jpg?fit=244%2C244&ssl=1', birthday: 'February 25, 1994', poem: 'Happy the hippo loves to wade\nIn the water and in the shade', rarity: 'common' },
  { name: 'Speedy', animal: 'Turtle', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/11/speedy.jpg?fit=300%2C300&ssl=1', birthday: 'August 14, 1994', poem: 'Speedy ran marathons in the past\nSome say he was never fast', rarity: 'common' },
  { name: 'Bumble', animal: 'Bee', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2012/11/bumblebeanie-1.jpg?fit=350%2C350&ssl=1', birthday: 'October 16, 1995', poem: 'Bumble the bee will not sting you\nIt is only love that will bring you', rarity: 'common' },
  { name: 'Lucky', animal: 'Ladybug', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2021/10/lucky.jpg?fit=414%2C414&ssl=1', birthday: 'May 1, 1995', poem: 'Lucky the ladybug loves the lotto\nSomeday she\'ll win and say "I got-o!"', rarity: 'common' },
  { name: 'Hoot', animal: 'Owl', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/09/hoot.jpg?fit=408%2C408&ssl=1', birthday: 'August 9, 1995', poem: 'Late at night when you\'re asleep\nHoot is awake and doesn\'t make a peep', rarity: 'common' },
  { name: 'Dotty', animal: 'Dalmatian', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2015/11/dotty-1.jpg?fit=380%2C380&ssl=1', birthday: 'October 17, 1996', poem: 'Dotty is the dog for you and me\nShe\'s as cute as she can be', rarity: 'common' },
  { name: 'Crunch', animal: 'Shark', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2015/10/crunch-1.jpg?fit=500%2C500&ssl=1', birthday: 'January 13, 1996', poem: 'What\'s for breakfast, what\'s for lunch?\nYum! Yum! Munch! Munch! Munch!', rarity: 'common' },
  { name: 'Scoop', animal: 'Pelican', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/10/scoop.jpg?fit=338%2C338&ssl=1', birthday: 'July 1, 1996', poem: 'All day long he scoops up fish\nTo fill his bill, is his wish', rarity: 'common' },
  { name: 'Ringo', animal: 'Raccoon', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/09/ringo.jpg?fit=300%2C300&ssl=1', birthday: 'July 14, 1995', poem: 'Ringo hides behind a mask\nHe\'ll be your friend, if you ask', rarity: 'common' },
  { name: 'Roary', animal: 'Lion', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/09/roary.jpg?fit=434%2C434&ssl=1', birthday: 'February 20, 1996', poem: 'Deep in the jungle they crowned him king\nBut being brave is not his thing', rarity: 'common' },

  // === UNCOMMON ===
  { name: 'Pinky', animal: 'Flamingo', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2019/01/pinky-1.jpg?fit=300%2C300&ssl=1', birthday: 'February 13, 1995', poem: 'Pinky loves the Everglades\nFrom the hottest pink she never fades', rarity: 'uncommon' },
  { name: 'Patti', animal: 'Platypus', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2012/10/patti.jpg?fit=352%2C352&ssl=1', birthday: 'January 6, 1993', poem: 'Ran into Patti one day while walking\nBelieve me she is not much for talking', rarity: 'uncommon' },
  { name: 'Stripes', animal: 'Tiger', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2013/02/71rxb-lg0UL._AA1500_.jpg?fit=300%2C300&ssl=1', birthday: 'June 11, 1995', poem: 'Stripes was never fierce nor strong\nSo with tigers he didn\'t belong', rarity: 'uncommon' },
  { name: 'Goldie', animal: 'Goldfish', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/03/goldie.jpg?fit=300%2C300&ssl=1', birthday: 'November 14, 1994', poem: 'She\'s got the rhythm, she\'s got the soul\nWhat more could you want in a fish bowl?', rarity: 'uncommon' },
  { name: 'Twigs', animal: 'Giraffe', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2015/10/twigsboo-2.jpg?fit=354%2C355&ssl=1', birthday: 'May 19, 1995', poem: 'Twigs has his head up in the clouds\nHe stands tall, above the crowds', rarity: 'uncommon' },
  { name: 'Waddle', animal: 'Penguin', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2024/07/waddlebud.jpg?fit=500%2C500&ssl=1', birthday: 'December 19, 1995', poem: 'Waddle the penguin likes to dress up\nEvery day he wears his tux', rarity: 'uncommon' },
  { name: 'Sly', animal: 'Fox', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/11/sly.jpg?fit=562%2C562&ssl=1', birthday: 'September 12, 1996', poem: 'Sly is a fox and tricky is he\nPlease don\'t chase him, let him be', rarity: 'uncommon' },
  { name: 'Bongo', animal: 'Monkey', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2012/11/bongoboo-1.jpg?fit=1500%2C1500&ssl=1', birthday: 'August 17, 1995', poem: 'Bongo the monkey lives in a tree\nThe happiest monkey you\'ll ever see', rarity: 'uncommon' },
  { name: 'Waves', animal: 'Orca', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/11/waves.jpg?fit=523%2C523&ssl=1', birthday: 'December 8, 1996', poem: 'Join him today on the Internet\nHis homepage is the best yet', rarity: 'uncommon' },
  { name: 'Claude', animal: 'Crab', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2015/10/claude-1.jpg?fit=540%2C540&ssl=1', birthday: 'September 3, 1996', poem: 'Claude the crab paints by the sea\nA famous artist he hopes to be', rarity: 'uncommon' },
  { name: 'Mystic', animal: 'Unicorn', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2021/10/mystic.jpg?fit=300%2C300&ssl=1', birthday: 'May 21, 1994', poem: 'Once upon a time so far away\nA unicorn was born one magical day', rarity: 'uncommon' },

  // === RARE ===
  { name: 'Rex', animal: 'Tyrannosaurus', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2021/10/rex.jpg?fit=300%2C300&ssl=1', birthday: 'January 1, 1995', poem: 'Rex is very very rare\nGet him if you dare', rarity: 'rare' },
  { name: 'Steg', animal: 'Stegosaurus', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/11/steg.jpeg?fit=225%2C225&ssl=1', birthday: 'January 1, 1995', poem: 'No Jurassic Park for Steg\nHe prefers to eat a drumstick leg', rarity: 'rare' },
  { name: 'Garcia', animal: 'Bear', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/02/garcia.jpg?fit=300%2C300&ssl=1', birthday: 'August 1, 1995', poem: 'The Deadhead bear likes to party\nHe\'s one groovy arty smarty', rarity: 'rare' },
  { name: 'Peace', animal: 'Bear', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/02/peace.jpg?fit=543%2C543&ssl=1', birthday: 'February 1, 1996', poem: 'All races, all colors, under the sun\nJoin hands together and have some fun', rarity: 'rare' },
  { name: 'Valentino', animal: 'Bear', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/02/valentino.jpeg?fit=450%2C450&ssl=1', birthday: 'February 14, 1994', poem: 'His heart is red and full of love\nHe cares for you so give a hug', rarity: 'rare' },
  { name: 'Erin', animal: 'Bear', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/02/erin.jpg?fit=502%2C502&ssl=1', birthday: 'March 17, 1997', poem: 'Named after the beautiful Emerald Isle\nThis bear will make you smile', rarity: 'rare' },
  { name: 'Glory', animal: 'Bear', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2020/03/glory.jpg?fit=450%2C450&ssl=1', birthday: 'July 4, 1997', poem: 'Waving the flag for all to see\nBorn on the Fourth of July is he', rarity: 'rare' },

  // === ULTRA RARE ===
  { name: 'Peanut', animal: 'Elephant', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2013/01/51AMQPG4cHL._SL500_AA300_.jpg?fit=300%2C300&ssl=1', birthday: 'January 25, 1995', poem: 'Peanut the elephant walks on tip-toe\nSneaking around wherever she may go', rarity: 'ultra-rare' },
  { name: 'Nana', animal: 'Monkey', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2019/01/nana.jpg?fit=352%2C352&ssl=1', birthday: 'August 1, 1995', poem: 'This monkey was named after a star\nCollectors traveled near and far', rarity: 'ultra-rare' },

  // === LEGENDARY ===
  { name: 'Princess', animal: 'Bear', image: 'https://i0.wp.com/beaniepedia.com/beanies/files/2025/06/princessbud.jpg?fit=400%2C400&ssl=1', birthday: 'October 1, 1997', poem: 'Like an angel she came from heaven above\nShe shared her compassion, her pain, her love', rarity: 'legendary' },
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
