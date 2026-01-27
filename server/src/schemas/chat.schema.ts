import * as z from 'zod'

const ChatCreateSchema = z.object({
    title: z.string().trim().min(3, {error: 'title should be atleast 3 characters'}).max(50, {error: 'title cannot excede 50 characters'})
})

const ChatUpdateSchema = z.object({
    title: z.string().trim().min(3, {error: 'title should be atleast 3 characters'}).max(50, {error: 'title cannot excede 50 characters'}).optional()
})

export type ChatCreateType = z.infer<typeof ChatCreateSchema>

export type ChatUpdateType = z.infer<typeof ChatUpdateSchema>