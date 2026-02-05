import type { Session } from "@auth/express";

declare module "@auth/express" {
    interface Session {
        provider?: string;
        providerUserId?: string;
    }
}
declare module "@auth/core/jwt" {
    interface JWT {
        provider?: string;
        providerUserId?: string;
    }
}

declare global {
    namespace Express {
        interface Request {
            user?: Session['user']
        }
    }
}