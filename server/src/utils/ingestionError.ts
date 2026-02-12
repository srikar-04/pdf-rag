import { IngestionStep } from "../generated/prisma/client.js";

class IngestionError extends Error {
    public readonly ingestionStep: IngestionStep;

    constructor(
        ingestionStep: IngestionStep,
        message: string = 'Something went wrong in ingestion pipeline',
        stack?: string
    ) {
        super(message);

        this.ingestionStep = ingestionStep;
        this.message = message;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export default IngestionError;