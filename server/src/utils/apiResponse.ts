class ApiResponse {

    public readonly statusCode: number;
    public readonly success: boolean;
    public readonly message: string;
    public readonly data: any;

    constructor(
        statusCode: number,
        data: any,
        message: string
    ){
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400
    }
}

export default ApiResponse