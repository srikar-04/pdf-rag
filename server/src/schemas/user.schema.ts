import * as z from "zod"

export const OAuthUserSchema = z.object({
    provider: z.enum(["GOOGLE", "GITHUB"]).transform((val) => val.toUpperCase() as "GOOGLE" | "GITHUB"),
    providerUserId: z.string(),
    email: z.email().optional(),
})

export const UserProfileSchema = z.object({
    username: z.string().trim().min(3, { message: "username should be minimum 3 characters" }).max(15, { message: "username cannot excede 15 characters" }),
})

const UserUpdateSchema = z.object({
    username: z.string().trim().min(3, { error: "username should be minimum 3 characters" }).max(15, { error: "username cannot excede 15 characters" }).optional(),
})

export type OAuthUserInput = z.infer<typeof OAuthUserSchema>

export type UserProfileInput = z.infer<typeof UserProfileSchema>

export type UserUpdateInput = z.infer<typeof UserUpdateSchema>