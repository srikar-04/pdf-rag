import * as z from 'zod'

const DocumentUploadSchema = z.object({
    fileSize: z.file().max(10_000_000, {error: 'file size cannot excede 10MB'}).min(10_000, {error: "file size should be atleast 0.1 mb"}),
    fileType: z.file().mime("application/pdf")
})

export type DocumentUploadType = z.infer<typeof DocumentUploadSchema>