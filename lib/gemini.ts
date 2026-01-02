import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export interface ReasoningQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
}

export const generateReasoningQuestions = async (
  topic: string = 'Coding-Decoding',
  count: number = 20
): Promise<ReasoningQuestion[]> => {
  if (!apiKey) {
    throw new Error("EXPO_PUBLIC_GEMINI_API_KEY is not set");
  }

  const prompt = `
    Generate ${count} reasoning questions on the topic '${topic}' for competitive exams.
    Target Level: **IBPS PO, RRB Assistant, SBI Clerk, RRB NTPC, RRB JE, SSC CHSL, SSC CGL, Bank PO, Bank Clerk, Bank SO**. 
    
    ## Guidelines:
    1. **High Quality**: Questions must be logical, tricky, and free of errors.
    2. **Verified Correctness**: Double-check the answer key and explanation. The explanation must logically lead to the correct option.
    3. **Exam Pattern**: Follow the exact style and complexity of the mentioned exams.
    4. **Distinct Options**: Ensure all 4 options are distinct and plausible.
    
    The difficulty should increase step-by-step:
    - First 30% questions: Easy (Foundation/Clerk level)
    - Middle 40% questions: Medium (PO/SSC CGL level)
    - Last 30% questions: Hard (Mains/Advanced level)

    Each question must be unique and not repeated.
    Ensure strict JSON output.
    
    The output must closely follow this schema:
    [
      {
        "id": "unique_string",
        "question": "Question text here (include any necessary instructions/diagram description)",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "The correct option string exactly matching one of the options",
        "explanation": "Detailed, step-by-step explanation of the logic. Why is the answer correct? Why are others wrong?",
        "difficulty": "Easy" | "Medium" | "Hard",
        "topic": "${topic}"
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Using latest flash model for speed
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING" },
              question: { type: "STRING" },
              options: { 
                type: "ARRAY",
                items: { type: "STRING" }
              },
              correctAnswer: { type: "STRING" },
              explanation: { type: "STRING" },
              difficulty: { type: "STRING", enum: ["Easy", "Medium", "Hard"] },
              topic: { type: "STRING" }
            },
            required: ["id", "question", "options", "correctAnswer", "explanation", "difficulty", "topic"]
          }
        }
      }
    });

    const responseText = response.text;
    
    if (!responseText) {
      throw new Error("Empty response from AI");
    }

    const questions = JSON.parse(responseText) as ReasoningQuestion[];
    
    // Add fallback IDs if missing
    return questions.map((q, index) => ({
      ...q,
      id: q.id || `q-${index}-${Date.now()}`
    }));

  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};
