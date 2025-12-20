import { Question } from './calculation';

export const generatePuzzleQuestion = (difficulty: number = 1): Question => {
  // Logic: Odd One Out (Emoji based)
  // Difficulty affects similarity of emojis or number of items (though UI is fixed to 4 options)
  
  const sets = [
    { common: '😀', odd: '😃' },
    { common: '🍎', odd: '🍅' },
    { common: '🚗', odd: '🚕' },
    { common: '🐶', odd: '🐕' },
    { common: '⬛', odd: '◼️' },
    { common: '🌲', odd: '🌳' },
    { common: '⌚', odd: '⏰' },
    { common: '🍕', odd: '🧀' },
    { common: '⚽', odd: '🏀' },
    { common: '🌙', odd: '🌚' },
    { common: '🔒', odd: '🔓' },
    { common: '🔨', odd: '🪓' },
    { common: '🍌', odd: '🌽' }, // Yellow things
    { common: '🧊', odd: '🥛' }, // White things
    { common: '✈️', odd: '🚀' },
    { common: '👓', odd: '🕶️' },
    { common: '👖', odd: '👕' },
    { common: '🍓', odd: '🍒' },
  ];
  
  // Higher difficulty could pick more subtle pairs (handled by manually extending the list strictly)
  // For now, random selection
  
  const set = sets[Math.floor(Math.random() * sets.length)];
  const isText = Math.random() > 0.5; // Sometimes use numbers/text for variety? No, emojis are fun.
  
  // Actually, let's mix it up with Numbers for difficult levels
  if (difficulty > 1 && Math.random() > 0.7) {
     // Number pattern odd one out
     // e.g. 2, 4, 6, 7 (7 is odd)
     // Implementation complexity higher, sticking to Emojis for "Puzzle" / "Visual" feel for now.
  }

  const options: (string | number)[] = [set.common, set.common, set.common, set.odd];
  
  // Shuffle options
  return {
    question: "Find the Odd One Out",
    answer: set.odd,
    options: options.sort(() => Math.random() - 0.5),
  };
};
