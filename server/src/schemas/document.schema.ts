import * as z from 'zod'

export const DocumentUploadSchema = z.object({
    fileSize: z
        .number()
        .max(30 * 1024 * 1024, { error: 'File cannot exceed 30MB' })
        .min(10 * 1024, { error: 'File size must be at least 0.01MB' }),
    fileType: z.literal('application/pdf', { error: 'Only PDF files are allowed' })
})

export type DocumentUploadType = z.infer<typeof DocumentUploadSchema>
