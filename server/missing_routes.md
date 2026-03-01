# Missing Backend Routes & Handlers

> **Status: Priority 1 COMPLETED** ✅
> 
> The following Priority 1 routes have been implemented:
> - ✅ GET /chat - List all chats
> - ✅ GET /chat/:chatId - Get single chat with documents
> - ✅ GET /chat/:chatId/messages - Get messages for chat
> - ✅ GET /document - List all documents

---

> **Priority Order**: Routes are listed from highest to lowest priority based on frontend dependency.

---

## PRIORITY 1: Critical (Frontend Cannot Function Without These)

### 1. List All Documents
**Priority:** HIGH - Dashboard and DocumentsPage depend on this

| Attribute | Value |
|-----------|-------|
| Route | `GET /api/v1/document` |
| Middleware | `authMiddleware` |
| Purpose | List all documents for the current user |
| Frontend File | `src/lib/api.ts` → `documents.list()` |
| Frontend Usage | `useDocuments()` hook in Dashboard, DocumentsPage |
| Current Status | ❌ MISSING |

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "doc_123",
      "documentName": "example.pdf",
      "documentStatus": "ready",
      "createdAt": "2026-02-28T..."
    }
  ],
  "message": "Documents fetched successfully"
}
```

**Action:** Add route in `document.routes.ts` + controller function

---

### 2. List All Chats
**Priority:** HIGH - Sidebar and Dashboard depend on this

| Attribute | Value |
|-----------|-------|
| Route | `GET /api/v1/chat` |
| Middleware | `authMiddleware` |
| Purpose | List all chats for the current user |
| Frontend File | `src/lib/api.ts` → `chats.list()` |
| Frontend Usage | `useChats()` hook in Sidebar, Dashboard |
| Current Status | ❌ MISSING |

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "chat_123",
      "title": "My Chat",
      "chatStatus": "active",
      "createdAt": "2026-02-28T...",
      "updatedAt": "2026-02-28T..."
    }
  ],
  "message": "Chats fetched successfully"
}
```

**Action:** Add route in `chat.routes.ts` + controller function

---

### 3. Get Chat By ID
**Priority:** HIGH - ChatPage depends on this

| Attribute | Value |
|-----------|-------|
| Route | `GET /api/v1/chat/:chatId` |
| Middleware | `authMiddleware` |
| Purpose | Get single chat with its documents |
| Frontend File | `src/lib/api.ts` → `chats.get(chatId)` |
| Frontend Usage | `useChat()` hook in ChatPage |
| Current Status | ❌ MISSING |

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "chat_123",
    "title": "My Chat",
    "chatStatus": "active",
    "documents": [
      {
        "id": "doc_123",
        "documentName": "example.pdf",
        "documentStatus": "ready"
      }
    ],
    "createdAt": "2026-02-28T...",
    "updatedAt": "2026-02-28T..."
  },
  "message": "Chat fetched successfully"
}
```

**Note:** Response MUST include `documents` array for ChatPage to work

**Action:** Add route in `chat.routes.ts` + controller function

---

### 4. Get Messages for Chat
**Priority:** HIGH - ChatPage depends on this

| Attribute | Value |
|-----------|-------|
| Route | `GET /api/v1/chat/:chatId/messages` |
| Middleware | `authMiddleware` |
| Purpose | Get all messages for a specific chat |
| Frontend File | `src/lib/api.ts` → `messages.list(chatId)` |
| Frontend Usage | `useMessages()` hook in ChatPage |
| Current Status | ❌ MISSING |

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg_123",
      "chatId": "chat_123",
      "content": "Hello, how can I help?",
      "role": "assistant",
      "createdAt": "2026-02-28T..."
    },
    {
      "id": "msg_124",
      "chatId": "chat_123",
      "content": "What is this document about?",
      "role": "user",
      "createdAt": "2026-02-28T..."
    }
  ],
  "message": "Messages fetched successfully"
}
```

**Action:** Add route in `chat.routes.ts` + controller function

---

## PRIORITY 2: Important (Core Functionality)

### 5. Delete Chat
**Priority:** MEDIUM - Delete functionality in Sidebar

| Attribute | Value |
|-----------|-------|
| Route | `DELETE /api/v1/chat/:chatId` |
| Middleware | `authMiddleware` |
| Purpose | Delete a chat and optionally its messages |
| Frontend File | `src/lib/api.ts` → `chats.delete(chatId)` |
| Frontend Usage | `useDeleteChat()` hook in Sidebar |
| Current Status | ❌ MISSING |

**Expected Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Chat deleted successfully"
}
```

**Action:** Add route in `chat.routes.ts` + controller function

---

### 6. Delete Document
**Priority:** MEDIUM - Delete functionality in DocumentsPage

| Attribute | Value |
|-----------|-------|
| Route | `DELETE /api/v1/document/:documentId` |
| Middleware | `authMiddleware` |
| Purpose | Delete a document |
| Frontend File | `src/lib/api.ts` → `documents.delete(documentId)` |
| Frontend Usage | `useDeleteDocument()` hook in DocumentsPage |
| Current Status | ❌ MISSING |

**Expected Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Document deleted successfully"
}
```

**Action:** Add route in `document.routes.ts` + controller function

---

## PRIORITY 3: Verify Existing Routes

### 7. Create Chat
**Priority:** VERIFY - Should work but verify

| Attribute | Value |
|-----------|-------|
| Route | `POST /api/v1/chat/create-chat` |
| Middleware | `authMiddleware` |
| Request Body | `{ "title": "Chat Title" }` |
| Purpose | Create a new chat |
| Frontend File | `src/lib/api.ts` → `chats.create({ title })` |
| Frontend Usage | `useCreateChat()` hook |
| Current Status | ✅ EXISTS (verify it works) |

---

### 8. Query Message (Send Message)
**Priority:** VERIFY - Verify GET method works

| Attribute | Value |
|-----------|-------|
| Route | `GET /api/v1/message/query/:chatId/:documentId?query=your question` |
| Middleware | `authMiddleware` |
| Query Param | `query` (URL query parameter) |
| Purpose | Send a query and get AI response |
| Frontend File | `src/lib/api.ts` → `messages.send(chatId, documentId, query)` |
| Frontend Usage | `useSendMessage()` hook in ChatPage |
| Current Status | ✅ EXISTS (verify it's GET, not POST) |

**Important:** Backend must accept GET request with `query` as URL parameter

---

### 9. Upload Document
**Priority:** VERIFY - Should work

| Attribute | Value |
|-----------|-------|
| Route | `POST /api/v1/document/upload/:chatId` |
| Middleware | `authMiddleware` + `upload` + `validatePdfUpload` |
| Request Body | FormData with `file` |
| Purpose | Upload PDF to a chat |
| Frontend File | `src/lib/api.ts` → `documents.upload(chatId, file)` |
| Frontend Usage | `DocumentUpload` component |
| Current Status | ✅ EXISTS |

---

### 10. Document Status
**Priority:** VERIFY - Should work

| Attribute | Value |
|-----------|-------|
| Route | `GET /api/v1/document/status/:documentId` |
| Middleware | `authMiddleware` |
| Purpose | Get document processing status |
| Frontend File | `src/lib/api.ts` → `documents.status(documentId)` |
| Frontend Usage | `useDocumentStatus()` hook |
| Current Status | ✅ EXISTS |

---

### 11. Ingest Document
**Priority:** VERIFY - Should work

| Attribute | Value |
|-----------|-------|
| Route | `POST /api/v1/document/ingest/:documentId` |
| Middleware | `authMiddleware` |
| Purpose | Start document ingestion/embedding |
| Frontend File | `src/lib/api.ts` → `documents.ingest(documentId)` |
| Frontend Usage | `DocumentUpload` component after upload |
| Current Status | ✅ EXISTS |

---

## Summary: Routes to Add

### ✅ COMPLETED - Priority 1 & 2

All Priority 1 and Priority 2 routes have been implemented:

| Route | Method | Status |
|-------|--------|--------|
| `/chat` | GET | ✅ Implemented |
| `/chat/:chatId` | GET | ✅ Implemented |
| `/chat/:chatId/messages` | GET | ✅ Implemented |
| `/chat/:chatId` | DELETE | ✅ Implemented |
| `/document` | GET | ✅ Implemented |
| `/document/:documentId` | DELETE | ✅ Implemented |

---

## All Backend Routes Complete ✅

---

*Document created: February 28, 2026*
