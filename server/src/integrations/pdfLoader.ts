import path from "node:path"
import axios from "axios"
import fs from 'fs'
import type { Document } from "../generated/prisma/client.js"
import { PDFParse } from 'pdf-parse'
import { pipeline } from "node:stream/promises"
import IngestionError from "../utils/ingestionError.js"
import { IngestionStep } from "../generated/prisma/client.js"
import IngestionResponse from "../utils/ingestionResponse.js"

const downloadPdfFromImagekit = async (documentId: string, url: string) => {

    const tempDir = path.join(process.cwd(), "public", "temp");

    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempPath = path.join(tempDir, `${documentId}.pdf`);

    // we have to stream the response
    // if we did not steam, the whole file will be added to ram
    // so large files may crash the server
    const streamResponse = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 15000
    })


    await pipeline(streamResponse.data, fs.createWriteStream(tempPath))

    return tempPath

}

export const pdfLoader = async (docDetails: Document) => {

    const tempPath = await downloadPdfFromImagekit(docDetails.id, docDetails.storagePath)

    // load document using pdf loader from langchain and then delete temp file
    const pdfParser = new PDFParse({
        url: tempPath
    })

    const result = await pdfParser.getText();
    const metadata = await pdfParser.getInfo({parsePageInfo: true})

    if (!result.text || result.text.trim().length === 0) {
        throw new IngestionError(IngestionStep.none, 'failed to load pdf')
    }

    // delete local file
    fs.unlink(tempPath, (err) => {
        if (err) console.log('error deleting local file, pdfLoader integration : ', err)
        else console.log('local file deleted successfully from pdfLoader integration')
    })

    return new IngestionResponse("fetched", {result, metadata}, 'loaded pdf file and fetched text response')

}