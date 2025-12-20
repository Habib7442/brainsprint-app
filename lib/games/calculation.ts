import { supabase } from '../../lib/supabase';

export interface Question {
  question: string;
  answer: number | string; // Supabase stores as string, but keeping it flexible
  options: (number | string)[];
  id?: string;
}

// In-memory cache to store questions to avoid repeated fetches
let questionCache: Question[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

export const fetchMathsQuestions = async (): Promise<void> => {
  const now = Date.now();
  if (questionCache.length > 0 && (now - lastFetchTime < CACHE_DURATION)) {
    return; // Use cache
  }

  try {
    const { data, error } = await supabase
      .from('maths_questions')
      .select('*')
      .limit(100); // Fetch up to 100 questions

    if (error) throw error;

    if (data) {
      questionCache = data.map((q: any) => ({
        question: q.question_text,
        // force answer to string for consistent comparison
        answer: String(q.correct_answer), 
        // options is usually a JSON array of strings in DB ["1", "2"]
        // force all options to strings
        options: q.options 
          ? q.options.map((o: any) => String(o)) 
          : generateFallbackOptions(q.correct_answer).map(String),
        id: q.id
      }));
      lastFetchTime = Date.now();
    }
  } catch (err) {
    console.error('Error fetching maths questions:', err);
  }
};

const generateFallbackOptions = (answer: string | number): (string | number)[] => {
  const ansNum = parseFloat(String(answer));
  if (isNaN(ansNum)) return [String(answer), String(answer) + '1', String(answer) + '2', String(answer) + '3']; 

  const options = new Set<string>();
  options.add(String(ansNum));
  
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 10) + 1;
    const sign = Math.random() > 0.5 ? 1 : -1;
    const val = ansNum + (offset * sign);
    options.add(String(val));
  }
  return Array.from(options).sort(() => Math.random() - 0.5);
}

export const generateCalculationQuestion = (difficulty: number = 1): Question => {
  // If cache is empty (failed fetch or first load), use fallback generator logic temporarily
  if (questionCache.length === 0) {
      return generateLocalFallback(difficulty);
  }
  
  // Pick random from cache
  // In future, filtering by difficulty from the DB is better, 
  // but user said "fetch all and show".
  // Mapping 1-3 difficulty to 'easy', 'medium', 'hard' logic could be done here if needed.
  
  const randomIndex = Math.floor(Math.random() * questionCache.length);
  return questionCache[randomIndex];
};

// --- Keep Local Fallback so app doesn't crash if offline ---
const generateLocalFallback = (difficulty: number): Question => {
  const ops = difficulty === 1 ? ['+', '-'] : difficulty === 2 ? ['+', '-', '*'] : ['+', '-', '*', '/'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let num1 = Math.floor(Math.random() * (difficulty * 20)) + 1;
  let num2 = Math.floor(Math.random() * (difficulty * 20)) + 1;
  
  if (op === '/') {
    num1 = num2 * Math.floor(Math.random() * 10 + 1);
  } else if (op === '-' && num1 < num2) {
    [num1, num2] = [num2, num1];
  }

  let answer = 0;
  switch (op) {
    case '+': answer = num1 + num2; break;
    case '-': answer = num1 - num2; break;
    case '*': answer = num1 * num2; break;
    case '/': answer = num1 / num2; break;
  }

  const question = `${num1} ${op} ${num2} = ?`;
  const options = new Set<number>();
  options.add(answer);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 10) + 1;
    options.add(answer + (Math.random() > 0.5 ? 1 : -1) * offset);
  }

  return { question, answer, options: Array.from(options).sort(() => Math.random() - 0.5) };
};
