# 📚 API Documentation — Box REST Backend (v2)

Base URL (local): `http://localhost:3000`

Authentication (optional, if configured): send header `x-api-key: <YOUR_API_KEY>`

---

## 🧪 Health Check

**GET** `/health`

### Request

```bash
curl -X GET http://localhost:3000/health
```

### Response `200`

```json
{ "status": "ok", "ts": 1729269714000 }
```

---

## 📥 Ingest a Message

**POST** `/ingest`

Stores a sensor message in MongoDB.  
The payload must follow a **standard structure** for telemetry data.

### Headers

- `Content-Type: application/json`
- `x-api-key: <YOUR_API_KEY>` (only if API_KEY is set in `.env`)

### Body Schema

```json
{
  "payload": {
    "type": "string", // ex: "pulse", "step", "temperature"
    "value": 42, // ex: 75
    "unit": "string", // ex: "bpm", "steps", "°C"
    "timestamp": "string" // optional ISO 8601 datetime (e.g. "2025-10-20T18:30:00Z")
  },
  "source": "string", // optional device identifier
  "type": "string" // optional message type label
}
```

### Example — basic

```bash
curl -X POST http://localhost:3000/ingest   -H "Content-Type: application/json"   -d '{
    "payload": {
      "type": "pulse",
      "value": 80,
      "unit": "bpm"
    },
    "source": "boitier-42"
  }'
```

### Example — with timestamp and API key

```bash
curl -X POST http://localhost:3000/ingest   -H "Content-Type: application/json"   -H "x-api-key: super-secret-key"   -d '{
    "payload": {
      "type": "temperature",
      "value": 22.8,
      "unit": "°C",
      "timestamp": "2025-10-20T18:45:00Z"
    },
    "source": "boitier-campus",
    "type": "telemetry"
  }'
```

### Success Response `201`

```json
{ "ok": true, "id": "6714c1c0f2abc1234def5678" }
```

### Error Responses

- `400 Bad Request` — invalid body (schema validation failed)
- `401 Unauthorized` — missing/invalid API key (if enabled)
- `500 Server Error` — unexpected failure

---

## 📜 List Messages (Paginated)

**GET** `/messages`

Returns stored messages with optional filters and pagination.

### Query Parameters

| Param    | Description                                | Example             |
| -------- | ------------------------------------------ | ------------------- |
| `page`   | Page number (default: `1`, min: `1`)       | `page=2`            |
| `limit`  | Items per page (default: `50`, max: `200`) | `limit=20`          |
| `source` | Filter by device source                    | `source=boitier-42` |
| `type`   | Filter by message type                     | `type=telemetry`    |

### Example — basic

```bash
curl -X GET http://localhost:3000/messages
```

### Example — with API key

```bash
curl -X GET http://localhost:3000/messages   -H "x-api-key: super-secret-key"
```

### Example — with filters + pagination

```bash
curl -G http://localhost:3000/messages   -H "x-api-key: super-secret-key"   -d "source=boitier-42"   -d "type=telemetry"   -d "page=1"   -d "limit=10"
```

### Success Response `200`

```json
{
  "page": 1,
  "limit": 10,
  "total": 3,
  "items": [
    {
      "_id": "6714c1c0f2abc1234def5678",
      "payload": {
        "type": "pulse",
        "value": 78,
        "unit": "bpm",
        "timestamp": "2025-10-20T18:45:00.000Z"
      },
      "source": "boitier-42",
      "type": "telemetry",
      "receivedAt": "2025-10-20T18:45:02.123Z"
    }
  ]
}
```

---

## 🧰 Notes

- Always send `Content-Type: application/json` for POST requests.
- If `API_KEY` is set in `.env`, include it via the `x-api-key` header.
- `timestamp` is optional — the server will set it to the current date/time if omitted.
- MongoDB automatically indexes:
  - `receivedAt` — for sorting by newest messages
  - `expireAt` — for TTL deletion (if configured)
- Typical `.env` configuration:
  ```env
  PORT=3000
  MONGODB_URI=mongodb://app:root@localhost:27017/?authSource=messagesdb
  API_KEY=super-secret-key
  DB_NAME=messagesdb
  ```

---

## ✅ Quick Recap

| Endpoint    | Method | Description                                |
| ----------- | ------ | ------------------------------------------ |
| `/health`   | GET    | Check if server is alive                   |
| `/ingest`   | POST   | Send a message (type/value/unit/timestamp) |
| `/messages` | GET    | Retrieve stored messages                   |
