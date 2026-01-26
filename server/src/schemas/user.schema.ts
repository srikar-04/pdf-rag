import * as z from "zod"

export const userSchema = z.object({
    id: z.uuid(),
    username: z.string().trim().toLowerCase().min(3, {error: "username should be minimum 3 characters"}).max(15, {error: "username cannot excede 15 characters"}),
    email: z.email({error: (iss) => (`invalid email id: ${iss.message}, ${iss.code}`)}),
    provider: z.enum(["google", "github"]),
    providerUserId: z.string(),
    created_at: z.date().optional(),
    updated_at: z.date().optional(),
    deletedAt: z.date().optional()
})

export type UserInput = z.infer<typeof userSchema>