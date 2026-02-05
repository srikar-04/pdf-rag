import * as z from 'zod'

export const DocumentUploadSchema = z.object({
    fileSize: z.number().max(10_000_000, {error: 'File cannot exceed 10MB'}).min(1000_000, {error: 'File size must me atleast 0.1MB'}),
    fileType: z.literal('application/pdf', {error: 'only pdf files are allowed'})
})

export type DocumentUploadType = z.infer<typeof DocumentUploadSchema>