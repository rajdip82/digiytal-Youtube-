import { GoogleGenAI } from "@google/genai";
import fs from "fs";

async function generateHeroImage() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found");
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Create a futuristic digital product landing page hero image about YouTube growth and creator mastery. 
Dark modern background with purple, orange, and blue neon gradient lighting. 
In the center place a modern laptop showing a YouTube analytics dashboard with a rising graph and growing subscribers. 
Around the laptop show glowing YouTube play icons, floating digital particles, and futuristic UI elements representing creator success. 
Add cinematic lighting, glowing light streaks, and futuristic UI elements. 
Style should look like a premium SaaS website hero section. 
Clean composition, modern startup design, high contrast lighting, ultra detailed digital illustration. 
Theme: YouTube Growth, Creator Mastery, AI Creator Economy. 
Professional advertising poster style, vibrant colors, glowing particles, dramatic lighting.

Text on image:
"Master YouTube Growth"
"Create Documentary Videos • Grow Your Channel • Master AI"

Style:
futuristic, cinematic lighting, neon glow, modern tech UI, premium startup landing page design`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K" // Using 1K for faster generation and reliability in this environment
        },
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64Data = part.inlineData.data;
        fs.writeFileSync("hero-image-base64.txt", base64Data);
        console.log("Image generated and saved to hero-image-base64.txt");
        return;
      }
    }
    console.error("No image part found in response");
  } catch (error) {
    console.error("Error generating image:", error);
  }
}

generateHeroImage();
