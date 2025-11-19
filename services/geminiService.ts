import { GoogleGenAI, Modality } from "@google/genai";

// Helper to safely get the AI client only when needed
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("API Key faltante. Verifica la configuración en Vercel (Environment Variables).");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateVehicleImage = async (
  brand: string,
  model: string,
  type: string,
  year: string,
  color: string
): Promise<string> => {
  try {
    const ai = getAIClient();
    const prompt = `Generate a high-quality, photorealistic studio image of a ${color} ${year} ${brand} ${model} ${type}, side profile view, isolated on a dark clean background. Professional automotive photography.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts && parts.length > 0 && parts[0].inlineData) {
      const base64ImageBytes = parts[0].inlineData.data;
      return `data:image/png;base64,${base64ImageBytes}`;
    }

    throw new Error("No image generated");
  } catch (error: any) {
    console.error("Error generating vehicle image:", error);
    if (error.message.includes("API Key")) throw error;
    return "https://picsum.photos/800/600?grayscale&blur=2";
  }
};

export const generateVehicle360 = async (
  brand: string,
  model: string,
  type: string,
  year: string,
  color: string,
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> => {
  const angles = [
    "front view",
    "front-left side view",
    "left side view",
    "rear-left side view",
    "rear view",
    "rear-right side view",
    "right side view",
    "front-right side view"
  ];

  const total = angles.length;
  let completed = 0;
  const results: string[] = new Array(total).fill("");

  const generateAngle = async (angleDescription: string, retries = 2): Promise<string> => {
    try {
      const ai = getAIClient();
      const prompt = `Photorealistic studio photo of a ${color} ${year} ${brand} ${model} ${type}, ${angleDescription}, isolated on a simple dark gray background. Cinematic lighting, 4k. The car should be centered and fully visible.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts && parts.length > 0 && parts[0].inlineData) {
        const base64ImageBytes = parts[0].inlineData.data;
        return `data:image/png;base64,${base64ImageBytes}`;
      }
      throw new Error(`Failed to generate ${angleDescription}`);
    } catch (e: any) {
      console.error(`Error on angle ${angleDescription}:`, e.message || e);
      
      // If it's an API Key or Quota error, fail fast so the user knows
      if (e.message && (e.message.includes("API Key") || e.message.includes("403") || e.message.includes("400"))) {
        throw e; 
      }

      if (retries > 0) {
        const waitTime = 2000 * (3 - retries); 
        await delay(waitTime);
        return generateAngle(angleDescription, retries - 1);
      }
      throw e;
    }
  };

  const CONCURRENCY = 2; // Lowered concurrency to be safer with free tier
  const queue = angles.map((angle, index) => ({ angle, index }));

  const worker = async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      if (!task) break;

      try {
        results[task.index] = await generateAngle(task.angle);
      } catch (e) {
        console.error(`Final error generating ${task.angle}:`, e);
        // Fallback to transparent pixel if generation fails but not due to auth
        results[task.index] = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      } finally {
        completed++;
        if (onProgress) onProgress(completed, total);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  return results;
};