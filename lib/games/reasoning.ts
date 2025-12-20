import { Question } from './calculation';

export const generateReasoningQuestion = (difficulty: number = 1): Question => {
  // Logic: Number Series
  // Diff 1: Linear (+2, +5...)
  // Diff 2: Geometric (*2, *3...) or Alternating (+2, -1...)
  // Diff 3: Complex (Square, Cube, Fibonacci-ish)

  const patterns = difficulty === 1 ? ['linear'] : difficulty === 2 ? ['geometric', 'alternating'] : ['square', 'fibonacci'];
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];

  let sequence: number[] = [];
  let answer = 0;
  let start = Math.floor(Math.random() * 10) + 1;

  if (pattern === 'linear') {
    const diff = Math.floor(Math.random() * 5) + 1;
    sequence = [start, start + diff, start + diff * 2, start + diff * 3];
    answer = start + diff * 4;
  } else if (pattern === 'geometric') {
    const ratio = Math.floor(Math.random() * 2) + 2; // 2 or 3
    start = Math.floor(Math.random() * 5) + 1;
    sequence = [start, start * ratio, start * ratio * ratio, start * ratio * ratio * ratio];
    answer = start * Math.pow(ratio, 4);
  } else if (pattern === 'alternating') {
    const diff1 = Math.floor(Math.random() * 5) + 2;
    const diff2 = Math.floor(Math.random() * 3) + 1;
    sequence = [start, start + diff1, start + diff1 - diff2, start + diff1 - diff2 + diff1];
    answer = sequence[3] - diff2;
  } else if (pattern === 'square') {
    start = Math.floor(Math.random() * 5) + 1;
    sequence = [start**2, (start+1)**2, (start+2)**2, (start+3)**2];
    answer = (start+4)**2;
  } else { // Fibonacci-ish
    sequence = [start, start+1, start+(start+1), (start+1)+(start+(start+1))];
    answer = sequence[2] + sequence[3];
  }

  const question = `${sequence.join(', ')}, ?`;

  // Generate options
  const options = new Set<number>();
  options.add(answer);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 10) + 1;
    options.add(answer + (Math.random() > 0.5 ? offset : -offset));
  }

  return {
    question,
    answer,
    options: Array.from(options).sort(() => Math.random() - 0.5),
  };
};
