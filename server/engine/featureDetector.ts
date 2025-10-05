import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ContentFeatures {
  contentType: "text" | "image" | "video" | "audio";
  topics: string[];
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  tones: string[];
  imageScores?: {
    aesthetics?: number;
    brand?: string;
    subjects?: string[];
  };
  sourceTrust: number;
}

export async function detectFeatures(input: {
  content: string;
  imageUrl?: string;
  userId?: string;
}): Promise<ContentFeatures> {
  const { content, imageUrl } = input;
  
  const contentType = imageUrl ? "image" : "text";
  
  const prompt = imageUrl
    ? `Analyze this image and text: "${content}"
       
       Provide a JSON response with:
       - topics: array of topics (e.g., ["food", "travel", "technology", "philosophy", "art"])
       - sentiment: object with positive, neutral, negative scores (sum to 1.0)
       - tones: array of tones (e.g., ["informative", "emotional", "humorous", "mysterious"])
       - imageScores: object with aesthetics (0-1), brand (detected brand name or null), subjects (array of detected subjects)
       
       Return ONLY valid JSON.`
    : `Analyze this text: "${content}"
       
       Provide a JSON response with:
       - topics: array of topics (e.g., ["food", "travel", "technology", "philosophy", "art"])
       - sentiment: object with positive, neutral, negative scores (sum to 1.0)
       - tones: array of tones (e.g., ["informative", "emotional", "humorous", "mysterious"])
       
       Return ONLY valid JSON.`;

  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "user",
        content: imageUrl
          ? [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          : prompt
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.3,
      max_tokens: 500
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(result.trim());

    const features: ContentFeatures = {
      contentType,
      topics: parsed.topics || [],
      sentiment: {
        positive: parsed.sentiment?.positive || 0.33,
        neutral: parsed.sentiment?.neutral || 0.34,
        negative: parsed.sentiment?.negative || 0.33
      },
      tones: parsed.tones || [],
      imageScores: imageUrl ? {
        aesthetics: parsed.imageScores?.aesthetics || 0.5,
        brand: parsed.imageScores?.brand || undefined,
        subjects: parsed.imageScores?.subjects || []
      } : undefined,
      sourceTrust: 0.9
    };

    console.log(`[FEATURE DETECTION] Content analyzed:`, {
      contentType: features.contentType,
      topics: features.topics.join(", "),
      tones: features.tones.join(", "),
      sentiment: `P:${features.sentiment.positive.toFixed(2)} N:${features.sentiment.neutral.toFixed(2)} NEG:${features.sentiment.negative.toFixed(2)}`,
      imageScores: features.imageScores ? `aesthetics:${features.imageScores.aesthetics?.toFixed(2)}, brand:${features.imageScores.brand || 'none'}` : 'N/A'
    });

    return features;
  } catch (error) {
    console.error("[FEATURE DETECTION] Error:", error);
    
    return {
      contentType,
      topics: ["general"],
      sentiment: { positive: 0.5, neutral: 0.3, negative: 0.2 },
      tones: ["neutral"],
      imageScores: imageUrl ? { aesthetics: 0.5, subjects: [] } : undefined,
      sourceTrust: 0.5
    };
  }
}
