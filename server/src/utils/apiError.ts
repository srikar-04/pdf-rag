class ApiError extends Error {
    public readonly statusCode: number;
    public readonly data: null;
    public readonly success: false;
    public readonly errors: string[];
    
    constructor(
        statusCode: number,
        message: string = 'Something went wrong',
        errors: string[] = [],
        stack?: string
    ) {
        super(message);
        
        this.statusCode = statusCode;
        this.data = null;
        this.success = false;
        this.errors = errors;
        this.message = message;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export default ApiError;