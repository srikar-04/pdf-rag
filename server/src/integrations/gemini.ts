import dotenv from 'dotenv'
dotenv.config()
import OpenAI from "openai";
const gemini_api_key = process.env.GEMINI_API_KEY

if(!gemini_api_key) {
    console.log('gemini api key: ', gemini_api_key)
    throw new Error('gemini api key not found')
}

export const geminiClient = new OpenAI({
    apiKey: gemini_api_key,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
})

export const geminiEmbeddingClient = async (text: string | string[]) => {
    const response = await geminiClient.embeddings.create({
        model: "gemini-embedding-001",
        input: text
    })

    return response.data
}



// getting list of available models
// const list = await openaiClient.models.list()

// const models = []

// for(const model of list.data) {
//     models.push(model.id)
// }

// console.log(models)
/**
 * [
  'models/gemini-2.5-flash',
  'models/gemini-2.5-pro',
  'models/gemini-2.0-flash',
  'models/gemini-2.0-flash-001',
  'models/gemini-2.0-flash-exp-image-generation',
  'models/gemini-2.0-flash-lite-001',
  'models/gemini-2.0-flash-lite',
  'models/gemini-exp-1206',
  'models/gemini-2.5-flash-preview-tts',
  'models/gemini-2.5-pro-preview-tts',
  'models/gemma-3-1b-it',
  'models/gemma-3-4b-it',
  'models/gemma-3-12b-it',
  'models/gemma-3-27b-it',
  'models/gemma-3n-e4b-it',
  'models/gemma-3n-e2b-it',
  'models/gemini-flash-latest',
  'models/gemini-flash-lite-latest',
  'models/gemini-pro-latest',
  'models/gemini-2.5-flash-lite',
  'models/gemini-2.5-flash-image',
  'models/gemini-2.5-flash-preview-09-2025',
  'models/gemini-2.5-flash-lite-preview-09-2025',
  'models/gemini-3-pro-preview',
  'models/gemini-3-flash-preview',
  'models/gemini-3-pro-image-preview',
  'models/nano-banana-pro-preview',
  'models/gemini-robotics-er-1.5-preview',
  'models/gemini-2.5-computer-use-preview-10-2025',
  'models/deep-research-pro-preview-12-2025',
  'models/gemini-embedding-001',
  'models/aqa',
  'models/imagen-4.0-generate-preview-06-06',
  'models/imagen-4.0-ultra-generate-preview-06-06',
  'models/imagen-4.0-generate-001',
  'models/imagen-4.0-ultra-generate-001',
  'models/imagen-4.0-fast-generate-001',
  'models/veo-2.0-generate-001',
  'models/veo-3.0-generate-001',
  'models/veo-3.0-fast-generate-001',
  'models/veo-3.1-generate-preview',
  'models/veo-3.1-fast-generate-preview',
  'models/gemini-2.5-flash-native-audio-latest',
  'models/gemini-2.5-flash-native-audio-preview-09-2025',
  'models/gemini-2.5-flash-native-audio-preview-12-2025',
  'models/lyria-realtime-exp'
]
 */