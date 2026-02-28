# Backend API Issues & Mismatches

> ⚠️ **Documenting frontend-backend API mismatches**
> 
> These issues will be addressed at the end after frontend is complete.

---

## Missing Endpoints (Not in Backend)

| Frontend Expects | Issue |
|-----------------|-------|
| `GET /api/v1/chat` | Endpoint does not exist - Need to add |
| `GET /api/v1/chat/:id` | Endpoint does not exist - Need to add |
| `DELETE /api/v1/chat/:id` | Endpoint does not exist - Need to add |
| `GET /api/v1/chat/:id/messages` | Endpoint does not exist - Need to add |
| `DELETE /api/v1/document/:id` | Endpoint does not exist - Need to add |

---

## Wrong Method/Path

| Frontend Uses | Backend Has | Fix Required |
|--------------|-------------|--------------|
| `POST /api/v1/chat` (body: `{title}`) | `POST /api/v1/chat/create-chat` | Change frontend to use `/create-chat` |
| `POST /api/v1/message/query/:chatId/:docId` | `GET /api/v1/message/query/:chatId/:docId` | Change frontend to use GET method |

---

## Current Backend Routes

### Auth (`/api/v1/auth`)
- `GET /auth/session` ✅
- `POST /auth/logout` ✅

### Chat (`/api/v1/chat`)
- `POST /create-chat` ✅ (but frontend uses wrong path)

### Document (`/api/v1/document`)
- `POST /upload/:chatId` ✅
- `POST /ingest/:documentId` ✅
- `GET /status/:documentId` ✅

### Message (`/api/v1/message`)
- `GET /query/:chatId/:documentId` ✅ (but frontend uses POST)

---

## Required Backend Changes

1. **Add `GET /chat`** - List all chats for user
2. **Add `GET /chat/:id`** - Get single chat with documents
3. **Add `DELETE /chat/:id`** - Delete a chat
4. **Add `GET /chat/:id/messages`** - Get messages for a chat
5. **Add `DELETE /document/:id`** - Delete a document

---

*Created: February 28, 2026*
