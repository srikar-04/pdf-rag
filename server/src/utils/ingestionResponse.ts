import type { IngestionStep } from "../generated/prisma/enums.js";

class IngestionResponse {

    public readonly ingestionStep: IngestionStep
    public readonly success: true;
    public readonly message: string;
    public readonly data: any;

    constructor(
        ingestionStep: IngestionStep,
        data: any,
        message: string
    ){
        this.ingestionStep = ingestionStep;
        this.data = data;
        this.message = message;
        this.success = true
    }
}

export default IngestionResponse