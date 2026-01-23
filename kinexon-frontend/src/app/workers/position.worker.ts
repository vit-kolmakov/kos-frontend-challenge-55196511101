/// <reference lib="webworker" />

import { RawSSEPayload, PositionUpdate } from "@/app/models/asset.model";

// INFO: In-file const so as not to break the production build.
export const POSITIONS_STREAM_ROUTE =
  "http://localhost:8080/api/positions/stream";

console.log("[Worker] Initializing SSE connection to:", POSITIONS_STREAM_ROUTE);

const eventSource = new EventSource(POSITIONS_STREAM_ROUTE);

/**
 * INFO: Though all of the data from the BE is captured the unused fields are discarded to minimize `postMessage` payload size as a micro-optimization
 * Zero-Copy Transferable Objects are leveraged to
 * We pack the telemetry into a Float64Array to avoid the Structured Clone Algorithm.
 * [0] objectId, [1] x, [2] y, [3] angle, [4] isValid (1/0), [5] battery, [6] timestamp
 * A Float32Array cannot carry strings only 32-bit floating-point numbers.
 * To include the timestamp from the backend while maintaining the high-performance binary transfer,
 * the ISO string is converted to a Unix Epoch (milliseconds) and stored as a Float64 in order to avoid precision loss
 */
eventSource.onmessage = (event: MessageEvent<string>) => {
  try {
    const rawData = JSON.parse(event.data) as RawSSEPayload;

    /**
     * INFO: Buffer [7 slots / 56 bytes]:
     * 0: objectId, 1: x, 2: y, 3: angle, 4: isValid, 5: battery, 6: timestamp
     */
    const arrayBuffer = new Float64Array(7);
    arrayBuffer[0] = rawData.object_id;
    arrayBuffer[1] = rawData.x;
    arrayBuffer[2] = rawData.y;
    arrayBuffer[3] = rawData.a;
    arrayBuffer[4] = rawData.is_valid ? 1 : 0;
    arrayBuffer[5] = rawData.battery.percentage;
    arrayBuffer[6] = new Date(rawData.timestamp).getTime();

    postMessage(arrayBuffer.buffer, [arrayBuffer.buffer]);
  } catch (error) {
    console.error("Worker failed to parse SSE message:", error);
  }
};

eventSource.onerror = (err) => {
  console.error("[Worker] SSE Connection Error:", err);
};

/**
 * INFO: Legacy implementation was a deep copy (Structured Clone) of the object created by postMessage()
 *  the computational cost for 250 objects every 100ms was negligible but less capable of scaling up to thousands of items
 */
// const positionUpdate: PositionUpdate = {
//   objectId: rawData.object_id,
//   x: rawData.x,
//   y: rawData.y,
//   angle: rawData.a,
//   isValid: rawData.is_valid,
//   battery: rawData.battery.percentage,
//   timestamp: rawData.timestamp,
// };
