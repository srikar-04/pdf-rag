import type { TextResult } from "pdf-parse"
import IngestionResponse from "../utils/ingestionResponse.js";
import { IngestionStep } from "../generated/prisma/enums.js";

export const normalizeText = (raw: TextResult) => {

    return new IngestionResponse(IngestionStep.fetched, raw.text
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/-\n\s*/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim(), 'successfully normalized text')
}