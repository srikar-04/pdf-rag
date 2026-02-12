import type { TextResult } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'


export const chunking = async (normalizedText: string) => {


    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 800,
        chunkOverlap: 150
    })


    const rawChunks = splitter.splitText(normalizedText)

}