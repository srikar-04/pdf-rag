
type RetrievalType = {
    queryEmbeddings:  number[],
    chatId: string,
    documentId: string
}

export const retrieval = async ({queryEmbeddings, chatId, documentId}: RetrievalType) => {


    // chatId and document id are for filtering qdrant response

}