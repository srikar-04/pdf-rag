import path from "node:path"
import axios from "axios"
import fs from 'fs'
import type { Document } from "../generated/prisma/client.js"
import { PDFParse } from 'pdf-parse'
import { pipeline } from "node:stream/promises"
import IngestionError from "../utils/ingestionError.js"
import { IngestionStep } from "../generated/prisma/client.js"
import IngestionResponse from "../utils/ingestionResponse.js"

const SCANNED_PDF_ERROR_MESSAGE =
    "No extractable text found in this PDF. It appears to be a scanned/image-only file. OCR is not supported yet, so please upload a text-based PDF.";

const hasMeaningfulExtractedText = (text: string): boolean => {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) return false;

    // Remove common page counters like "1 of 20" / "1/20" before scoring.
    const withoutPageCounters = normalized.replace(/\b\d+\s*(?:of|\/)\s*\d+\b/gi, " ").trim();
    const alphaWords = withoutPageCounters.match(/[A-Za-z]{2,}/g) ?? [];
    const uniqueAlphaWords = new Set(alphaWords.map((word) => word.toLowerCase()));
    const digitCount = (withoutPageCounters.match(/\d/g) ?? []).length;
    const alphaCount = (withoutPageCounters.match(/[A-Za-z]/g) ?? []).length;

    if (alphaCount === 0) return false;

    const tooLittleLanguageSignal = alphaWords.length < 12 || uniqueAlphaWords.size < 6;
    const mostlyNumericNoise = digitCount > alphaCount;

    return !(tooLittleLanguageSignal && mostlyNumericNoise);
};

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
    try {
        // load document using pdf loader from langchain
        const pdfParser = new PDFParse({
            url: tempPath
        })

        const result = await pdfParser.getText();
        const metadata = await pdfParser.getInfo({ parsePageInfo: true })

        if (!result.text || !hasMeaningfulExtractedText(result.text)) {
            throw new IngestionError(IngestionStep.fetched, SCANNED_PDF_ERROR_MESSAGE)
        }

        return new IngestionResponse("fetched", { result, metadata }, 'loaded pdf file and fetched text response')
    } finally {
        // delete local file even when parsing/validation fails
        fs.unlink(tempPath, (err) => {
            if (err) console.log('error deleting local file, pdfLoader integration : ', err)
            else console.log('local file deleted successfully from pdfLoader integration')
        })
    }

}
