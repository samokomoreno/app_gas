import { GoogleGenAI, Modality } from "@google/genai";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateVehicleImage = async (
  brand: string,
  model: string,
  type: string,
  year: string,
  color: string
): Promise<string> => {
  // Fallback single image generation
  try {
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
  } catch (error) {
    console.error("Error generating vehicle image:", error);
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
  // 8 Angles for 360 view
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

  // Helper to generate a single angle with retry logic
  const generateAngle = async (angleDescription: string, retries = 2): Promise<string> => {
    try {
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
    } catch (e) {
      if (retries > 0) {
        // Exponential backoff: 2s, 4s, etc.
        const waitTime = 2000 * (3 - retries); 
        await delay(waitTime);
        return generateAngle(angleDescription, retries - 1);
      }
      throw e;
    }
  };

  // Queue Processing with Concurrency Limit
  // Limit concurrency to 3 to avoid API rate limits (429 errors) which cause generation failures
  const CONCURRENCY = 3;
  const queue = angles.map((angle, index) => ({ angle, index }));

  const worker = async () => {
    while (queue.length > 0) {
      const task = queue.shift();
      if (!task) break;

      try {
        results[task.index] = await generateAngle(task.angle);
      } catch (e) {
        console.error(`Final error generating ${task.angle}:`, e);
        // Fallback: Transparent placeholder to maintain array integrity without crashing
        results[task.index] = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      } finally {
        completed++;
        if (onProgress) onProgress(completed, total);
      }
    }
  };

  // Start workers
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  return results;
};