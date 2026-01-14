# KINEXON Frontend Challenge - Setup Guide

This guide will help you set up and run the challenge backend server.

## Prerequisites

- Docker 28

## Installation

1. **Clone or download this repository**

2. **Navigate to the project directory**

   ```bash
   cd fe-challenge
   ```

3. **Run with Docker**

```bash
# Build the Docker image
docker build -t kinexon-challenge .

# Run the container
docker run -p 8080:8080 kinexon-challenge
```

## Verifying the Server

Once the server is running, you should see output like:

```text
2026/01/09 10:00:00 Starting server on :8080
2026/01/09 10:00:00 Simulating 250 objects on a 100 x 100 meter map
2026/01/09 10:00:00 Update interval: 100ms

Available endpoints:
  - GET  /api/positions/stream  (SSE stream of position updates)
  - GET  /api/positions         (Get all positions)
  - GET  /api/position?id=X     (Get single position)
  - GET  /api/objects           (Get all objects with metadata)
  - GET  /api/object?id=X       (Get single object with metadata)
  - GET  /api/stats             (Get system stats)
```

Visit `http://localhost:8080` in your browser to see the server status page.

## Testing the API

### Test SSE Stream (in browser console)

```javascript
const eventSource = new EventSource('http://localhost:8080/api/positions/stream');
eventSource.onmessage = (event) => {
  console.log('Position update:', JSON.parse(event.data));
};
```

### Test REST endpoints (with curl)

```bash
# Get all positions
curl http://localhost:8080/api/positions

# Get single position
curl http://localhost:8080/api/position?id=1

# Get all objects with metadata
curl http://localhost:8080/api/objects

# Get single object with metadata
curl http://localhost:8080/api/object?id=5

# Get stats
curl http://localhost:8080/api/stats
```

## Troubleshooting

### Port already in use

If port 8080 is already in use, you can modify the port in `cmd/server/main.go`:

```go
port := ":8080"  // Change to another port like ":3000"
```

### CORS issues

The server is configured to allow all origins (`Access-Control-Allow-Origin: *`). If you still encounter CORS issues, ensure you're not using a browser extension that blocks requests.

### Module errors

If you see module-related errors, ensure you're in the project root directory and run:

```bash
go mod tidy
```

## What's Next?

1. The server is now running and simulating 250 objects with 250 position updates
2. Open the [README.md](README.md) to understand the challenge requirements
3. Start building your frontend application!
4. Your frontend should connect to `http://localhost:8080/api/positions/stream` for position data and `/api/objects` for object metadata

## Server Configuration

You can modify simulation parameters in `cmd/server/main.go`:

```go
const (
    mapWidth  = 100.0        // Map width in meters
    mapHeight = 100.0        // Map height in meters
    numObjects = 250         // Number of simulated objects
    updateInterval = 100 * time.Millisecond  // Update frequency
)
```

## Need Help?

- Check the [README.md](README.md) for full challenge details
- Reach out to your contact person if you have any questions

---

Good luck with the challenge! 🚀
