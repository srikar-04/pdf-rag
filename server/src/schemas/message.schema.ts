import * as z from 'zod'

export const UserMessageSchema = z.object({
    content: z.string().trim().min(1, {error: 'message cannot be empyt'}).max(1000, {error: 'message cannot exceed 1000 characters'}).transform(val => val.trim())
})

export const UserMessageUpdateSchema = z.object({
    content: z.string().trim().min(1, {error: 'message cannot be empyt'}).max(1000, {error: 'message cannot exceed 1000 characters'}).optional()
})

export type UserMessageInput = z.infer<typeof UserMessageSchema>

export type UserMessageUpdateInput = z.infer<typeof UserMessageUpdateSchema>