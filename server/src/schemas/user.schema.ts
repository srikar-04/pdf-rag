import * as z from "zod"

export const OAuthUserSchema = z.object({
    provider: z.enum(["google", "github", "GOOGLE", "GITHUB"]).transform((val) => val.toUpperCase() as "GOOGLE" | "GITHUB"),
    providerUserId: z.string(),
    email: z.email().optional(),
})

export const UserProfileSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, { message: "Username should be at least 3 characters" })
        .max(15, { message: "Username cannot exceed 15 characters" })
        .regex(/^[A-Za-z0-9_]+$/, {
            message: "Username can only contain letters, numbers, and underscores",
        }),
})

const UserUpdateSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, { error: "Username should be at least 3 characters" })
        .max(15, { error: "Username cannot exceed 15 characters" })
        .regex(/^[A-Za-z0-9_]+$/, {
            error: "Username can only contain letters, numbers, and underscores",
        })
        .optional(),
})

export type OAuthUserInput = z.infer<typeof OAuthUserSchema>

export type UserProfileInput = z.infer<typeof UserProfileSchema>

export type UserUpdateInput = z.infer<typeof UserUpdateSchema>
