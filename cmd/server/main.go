package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"strconv"
	"sync"
	"time"

	objectv1 "github.com/kinexon/fe-challenge/schemas/gen/go/object/v1"
	positionv1 "github.com/kinexon/fe-challenge/schemas/gen/go/position/v1"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const (
	// Map boundaries (in meters)
	mapWidth  = 100.0
	mapHeight = 100.0

	// Number of simulated objects and positions
	numObjects = 250

	// Update frequency
	updateInterval = 100 * time.Millisecond
)

// ObjectManager manages object metadata
type ObjectManager struct {
	mu      sync.RWMutex
	objects map[int64]*objectv1.Object
}

func NewObjectManager() *ObjectManager {
	return &ObjectManager{
		objects: make(map[int64]*objectv1.Object),
	}
}

func (om *ObjectManager) AddObject(obj *objectv1.Object) {
	om.mu.Lock()
	defer om.mu.Unlock()
	om.objects[obj.Id] = obj
}

func (om *ObjectManager) GetObject(id int64) *objectv1.Object {
	om.mu.RLock()
	defer om.mu.RUnlock()
	return om.objects[id]
}

func (om *ObjectManager) GetAllObjects() []*objectv1.Object {
	om.mu.RLock()
	defer om.mu.RUnlock()

	objects := make([]*objectv1.Object, 0, len(om.objects))
	for _, obj := range om.objects {
		objects = append(objects, obj)
	}
	return objects
}

// PositionManager manages all position data
type PositionManager struct {
	mu        sync.RWMutex
	positions map[int64]*positionv1.Position
	clients   map[chan *positionv1.Position]bool
	clientsMu sync.RWMutex
}

func NewPositionManager() *PositionManager {
	return &PositionManager{
		positions: make(map[int64]*positionv1.Position),
		clients:   make(map[chan *positionv1.Position]bool),
	}
}

// AddClient registers a new SSE client
func (pm *PositionManager) AddClient(client chan *positionv1.Position) {
	pm.clientsMu.Lock()
	defer pm.clientsMu.Unlock()
	pm.clients[client] = true
}

// RemoveClient unregisters an SSE client
func (pm *PositionManager) RemoveClient(client chan *positionv1.Position) {
	pm.clientsMu.Lock()
	defer pm.clientsMu.Unlock()
	delete(pm.clients, client)
	close(client)
}

// BroadcastPosition sends position update to all connected clients
func (pm *PositionManager) BroadcastPosition(pos *positionv1.Position) {
	pm.clientsMu.RLock()
	defer pm.clientsMu.RUnlock()

	for client := range pm.clients {
		select {
		case client <- pos:
		default:
			// Client is slow, skip
		}
	}
}

// UpdatePosition updates or creates a position
func (pm *PositionManager) UpdatePosition(pos *positionv1.Position) {
	pm.mu.Lock()
	pm.positions[pos.ObjectId] = pos
	pm.mu.Unlock()

	pm.BroadcastPosition(pos)
}

// GetPosition retrieves a single position by ID
func (pm *PositionManager) GetPosition(objectID int64) *positionv1.Position {
	pm.mu.RLock()
	defer pm.mu.RUnlock()
	return pm.positions[objectID]
}

// GetAllPositions retrieves all positions
func (pm *PositionManager) GetAllPositions() []*positionv1.Position {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	positions := make([]*positionv1.Position, 0, len(pm.positions))
	for _, pos := range pm.positions {
		positions = append(positions, pos)
	}
	return positions
}

// PositionSimulator simulates realistic position updates for objects
type PositionSimulator struct {
	positionID     int64
	objectID       int64
	tagID          string
	x, y           float64
	vx, vy         float64
	angle          float64
	speed          float64
	targetX        float64
	targetY        float64
	battery        int32
	sourceID       int64
	isValid        bool
	invalidCounter int // Counts updates while invalid (to pause updates)
}

func NewPositionSimulator(positionID, objectID int64, tagID string) *PositionSimulator {
	return &PositionSimulator{
		positionID: positionID,
		objectID:   objectID,
		tagID:      tagID,
		x:          rand.Float64() * mapWidth,
		y:          rand.Float64() * mapHeight,
		angle:      rand.Float64() * 2 * math.Pi,
		speed:      0.5 + rand.Float64()*2.0, // 0.5 to 2.5 m/s
		battery:    80 + rand.Int31n(20),     // 80-100%
		sourceID:   1 + rand.Int63n(5),       // Source IDs 1-5
		isValid:    true,
	}
}

// Update simulates realistic movement
func (s *PositionSimulator) Update(dt float64) *positionv1.Position {
	// If invalid, count down but still send position updates (just marked as invalid)
	if !s.isValid {
		s.invalidCounter++
		// Stay invalid for 20-50 updates (2-5 seconds at 100ms interval)
		if s.invalidCounter > 20+rand.Intn(30) {
			// Become valid again and reset counter
			s.isValid = true
			s.invalidCounter = 0
		}
		// Still send position update, but marked as invalid
		// Don't update position while invalid (frozen in place)
		batteryPercentage := s.battery
		return &positionv1.Position{
			ObjectId:  s.objectID,
			TagId:     s.tagID,
			Timestamp: timestamppb.Now(),
			IsValid:   false,
			SourceId:  s.sourceID,
			X:         s.x,
			Y:         s.y,
			Z:         0.0,
			A:         s.angle,
			B:         0.0,
			C:         0.0,
			Latitude:  48.1351 + (s.y / 111000.0),
			Longitude: 11.5820 + (s.x / 111000.0),
			Altitude:  520.0,
			Flags:     []int32{},
			TenantId:  1,
			Battery: &positionv1.Position_Battery{
				Percentage:           &batteryPercentage,
				PercentageLastUpdate: timestamppb.Now(),
			},
		}
	}

	// Pick new target occasionally
	if rand.Float64() < 0.01 { // 1% chance each update (less frequent target changes)
		s.targetX = rand.Float64() * mapWidth
		s.targetY = rand.Float64() * mapHeight
	}

	// Move towards target with smooth acceleration
	if s.targetX != 0 || s.targetY != 0 {
		dx := s.targetX - s.x
		dy := s.targetY - s.y
		dist := math.Sqrt(dx*dx + dy*dy)

		if dist > 0.5 {
			// Desired velocity towards target
			desiredVx := (dx / dist) * s.speed
			desiredVy := (dy / dist) * s.speed

			// Smooth acceleration (lerp towards desired velocity)
			acceleration := 0.1 // Smoothing factor
			s.vx += (desiredVx - s.vx) * acceleration
			s.vy += (desiredVy - s.vy) * acceleration

			// Update angle smoothly
			targetAngle := math.Atan2(dy, dx)
			angleDiff := targetAngle - s.angle
			// Normalize angle difference to [-π, π]
			for angleDiff > math.Pi {
				angleDiff -= 2 * math.Pi
			}
			for angleDiff < -math.Pi {
				angleDiff += 2 * math.Pi
			}
			s.angle += angleDiff * 0.1 // Smooth rotation
		} else {
			// Near target, slow down
			s.vx *= 0.9
			s.vy *= 0.9
		}
	}

	// Add very small noise for realism (much less than before)
	s.vx += (rand.Float64() - 0.5) * 0.05
	s.vy += (rand.Float64() - 0.5) * 0.05

	// Apply damping to prevent excessive speed
	s.vx *= 0.98
	s.vy *= 0.98

	// Update position
	s.x += s.vx * dt
	s.y += s.vy * dt

	// Bounce off walls
	if s.x < 0 {
		s.x = 0
		s.vx = -s.vx
		s.targetX = mapWidth / 2
	}
	if s.x > mapWidth {
		s.x = mapWidth
		s.vx = -s.vx
		s.targetX = mapWidth / 2
	}
	if s.y < 0 {
		s.y = 0
		s.vy = -s.vy
		s.targetY = mapHeight / 2
	}
	if s.y > mapHeight {
		s.y = mapHeight
		s.vy = -s.vy
		s.targetY = mapHeight / 2
	}

	// Simulate battery drain (very slowly)
	if rand.Float64() < 0.001 && s.battery > 0 {
		s.battery--
	}

	// Occasionally mark as invalid (sensor issue) - 0.05% chance per update
	if rand.Float64() < 0.0005 {
		s.isValid = false
		s.invalidCounter = 0
	}

	// Create position message
	batteryPercentage := s.battery
	return &positionv1.Position{
		ObjectId:  s.objectID,
		TagId:     s.tagID,
		Timestamp: timestamppb.Now(),
		IsValid:   s.isValid,
		SourceId:  s.sourceID,
		X:         s.x,
		Y:         s.y,
		Z:         0.0,
		A:         s.angle,
		B:         0.0,
		C:         0.0,
		Latitude:  48.1351 + (s.y / 111000.0), // Approximate conversion near Munich
		Longitude: 11.5820 + (s.x / 111000.0),
		Altitude:  520.0, // Munich elevation
		Flags:     []int32{},
		TenantId:  1,
		Battery: &positionv1.Position_Battery{
			Percentage:           &batteryPercentage,
			PercentageLastUpdate: timestamppb.Now(),
		},
	}
}

// SimulationEngine manages all position simulations
type SimulationEngine struct {
	simulators []*PositionSimulator
	pm         *PositionManager
	om         *ObjectManager
	ticker     *time.Ticker
	done       chan bool
}

func NewSimulationEngine(pm *PositionManager, om *ObjectManager) *SimulationEngine {
	// Create one simulator per object
	simulators := make([]*PositionSimulator, numObjects)

	for i := 0; i < numObjects; i++ {
		objectID := int64(i + 1)
		obj := om.GetObject(objectID)

		tagID := "UNKNOWN"
		if obj != nil {
			tagID = obj.Name
		}

		simulators[i] = NewPositionSimulator(objectID, objectID, tagID)
	}

	return &SimulationEngine{
		simulators: simulators,
		pm:         pm,
		om:         om,
		ticker:     time.NewTicker(updateInterval),
		done:       make(chan bool),
	}
}

func (se *SimulationEngine) Start() {
	go func() {
		dt := updateInterval.Seconds()
		for {
			select {
			case <-se.ticker.C:
				for _, sim := range se.simulators {
					pos := sim.Update(dt)
					se.pm.UpdatePosition(pos)
				}
			case <-se.done:
				return
			}
		}
	}()
}

func (se *SimulationEngine) Stop() {
	se.ticker.Stop()
	se.done <- true
}

// createObjects generates 100 objects with realistic properties
func createObjects() []*objectv1.Object {
	objects := make([]*objectv1.Object, numObjects)

	for i := 0; i < numObjects; i++ {
		objID := int64(i + 1)

		// Assign object type based on distribution
		var objectType string
		typeRand := rand.Float64()
		if typeRand < 0.4 {
			objectType = "container"
		} else if typeRand < 0.7 {
			objectType = "tool"
		} else {
			objectType = "order"
		}

		obj := &objectv1.Object{
			Id:         objID,
			Name:       fmt.Sprintf("%s-%03d", objectType, objID),
			Labels:     []string{objectType},
			Properties: make(map[string]string),
		}

		// Add common properties
		obj.Properties["status"] = []string{"idle", "in_transit", "processing", "completed"}[rand.Intn(4)]
		obj.Properties["zone"] = fmt.Sprintf("Zone-%c", 'A'+rand.Intn(5))

		// Add type-specific properties
		switch objectType {
		case "container":
			obj.Properties["capacity"] = fmt.Sprintf("%d", 100+rand.Intn(400)) // 100-500 units
			obj.Properties["fill_level"] = fmt.Sprintf("%d", rand.Intn(101))   // 0-100%
			obj.Properties["material_type"] = []string{"raw_material", "components", "finished_goods", "packaging"}[rand.Intn(4)]
			obj.Properties["temperature"] = fmt.Sprintf("%.1f", 18.0+rand.Float64()*8.0) // 18-26°C

		case "tool":
			obj.Properties["tool_type"] = []string{"forklift", "pallet_jack", "tugger", "agv"}[rand.Intn(4)]
			obj.Properties["max_load"] = fmt.Sprintf("%d", 500+rand.Intn(1500)) // 500-2000 kg
			obj.Properties["operator"] = []string{"John", "Maria", "Ahmed", "Lisa", "automatic"}[rand.Intn(5)]
			obj.Properties["maintenance_due"] = fmt.Sprintf("%d", rand.Intn(90)) // days until maintenance
			obj.Properties["usage_hours"] = fmt.Sprintf("%d", rand.Intn(10000))  // total operating hours

		case "order":
			obj.Properties["order_id"] = fmt.Sprintf("ORD-%06d", 100000+rand.Intn(900000))
			obj.Properties["priority"] = []string{"low", "medium", "high", "urgent"}[rand.Intn(4)]
			obj.Properties["customer"] = []string{"ACME Corp", "Tech Industries", "Global Supplies", "Manufacturing Inc"}[rand.Intn(4)]
			obj.Properties["item_count"] = fmt.Sprintf("%d", 1+rand.Intn(50)) // 1-50 items
			obj.Properties["due_date"] = time.Now().Add(time.Duration(rand.Intn(30)) * 24 * time.Hour).Format("2006-01-02")
		}

		objects[i] = obj
	}

	return objects
}

// HTTP Handlers

func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func (pm *PositionManager) handleSSE(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	// Set headers for SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	// Create client channel
	client := make(chan *positionv1.Position, numObjects*2)
	pm.AddClient(client)
	defer pm.RemoveClient(client)

	// Send initial snapshot
	positions := pm.GetAllPositions()
	for _, pos := range positions {
		data, err := json.Marshal(posToJSON(pos))
		if err != nil {
			continue
		}
		fmt.Fprintf(w, "data: %s\n\n", data)
		w.(http.Flusher).Flush()
	}

	// Stream updates
	for {
		select {
		case pos := <-client:
			data, err := json.Marshal(posToJSON(pos))
			if err != nil {
				continue
			}
			fmt.Fprintf(w, "data: %s\n\n", data)
			w.(http.Flusher).Flush()
		case <-r.Context().Done():
			return
		}
	}
}

func (pm *PositionManager) handleGetPosition(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	objectIDStr := r.URL.Query().Get("id")
	if objectIDStr == "" {
		http.Error(w, "Missing id parameter", http.StatusBadRequest)
		return
	}

	objectID, err := strconv.ParseInt(objectIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid id parameter", http.StatusBadRequest)
		return
	}

	pos := pm.GetPosition(objectID)
	if pos == nil {
		http.Error(w, "Position not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posToJSON(pos))
}

func (pm *PositionManager) handleGetAllPositions(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	positions := pm.GetAllPositions()
	jsonPositions := make([]map[string]interface{}, len(positions))
	for i, pos := range positions {
		jsonPositions[i] = posToJSON(pos)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jsonPositions)
}

func handleGetStats(w http.ResponseWriter, r *http.Request, pm *PositionManager, om *ObjectManager) {
	enableCORS(w)

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	pm.mu.RLock()
	totalPositions := len(pm.positions)
	pm.mu.RUnlock()

	om.mu.RLock()
	totalObjects := len(om.objects)
	om.mu.RUnlock()

	pm.clientsMu.RLock()
	connectedClients := len(pm.clients)
	pm.clientsMu.RUnlock()

	stats := map[string]interface{}{
		"total_objects":      totalObjects,
		"total_positions":    totalPositions,
		"connected_clients":  connectedClients,
		"update_interval_ms": updateInterval.Milliseconds(),
		"map_dimensions": map[string]float64{
			"width":  mapWidth,
			"height": mapHeight,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (om *ObjectManager) handleGetAllObjects(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	objects := om.GetAllObjects()
	jsonObjects := make([]map[string]interface{}, len(objects))
	for i, obj := range objects {
		jsonObjects[i] = objectToJSON(obj)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jsonObjects)
}

func (om *ObjectManager) handleGetObject(w http.ResponseWriter, r *http.Request) {
	enableCORS(w)

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	objectIDStr := r.URL.Query().Get("id")
	if objectIDStr == "" {
		http.Error(w, "Missing id parameter", http.StatusBadRequest)
		return
	}

	objectID, err := strconv.ParseInt(objectIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid id parameter", http.StatusBadRequest)
		return
	}

	obj := om.GetObject(objectID)
	if obj == nil {
		http.Error(w, "Object not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(objectToJSON(obj))
}

// Convert protobuf Object to JSON-friendly map
func objectToJSON(obj *objectv1.Object) map[string]interface{} {
	return map[string]interface{}{
		"id":         obj.Id,
		"name":       obj.Name,
		"labels":     obj.Labels,
		"properties": obj.Properties,
	}
}

// Convert protobuf Position to JSON-friendly map
func posToJSON(pos *positionv1.Position) map[string]interface{} {
	result := map[string]interface{}{
		"object_id": pos.ObjectId,
		"tag_id":    pos.TagId,
		"timestamp": pos.Timestamp.AsTime().Format(time.RFC3339Nano),
		"is_valid":  pos.IsValid,
		"source_id": pos.SourceId,
		"x":         pos.X,
		"y":         pos.Y,
		"z":         pos.Z,
		"a":         pos.A,
		"b":         pos.B,
		"c":         pos.C,
		"latitude":  pos.Latitude,
		"longitude": pos.Longitude,
		"altitude":  pos.Altitude,
		"flags":     pos.Flags,
		"tenant_id": pos.TenantId,
	}

	if pos.Battery != nil {
		battery := map[string]interface{}{}
		if pos.Battery.Percentage != nil {
			battery["percentage"] = *pos.Battery.Percentage
		}
		if pos.Battery.PercentageLastUpdate != nil {
			battery["percentage_last_update"] = pos.Battery.PercentageLastUpdate.AsTime().Format(time.RFC3339Nano)
		}
		if pos.Battery.Voltage != nil {
			battery["voltage"] = *pos.Battery.Voltage
		}
		if pos.Battery.State != nil {
			battery["state"] = *pos.Battery.State
		}
		result["battery"] = battery
	}

	return result
}

func main() {
	// Create object manager and populate with objects
	om := NewObjectManager()
	objects := createObjects()
	for _, obj := range objects {
		om.AddObject(obj)
	}

	// Create position manager and simulation engine
	pm := NewPositionManager()
	engine := NewSimulationEngine(pm, om)
	engine.Start()
	defer engine.Stop()

	// Register handlers
	http.HandleFunc("/api/positions/stream", pm.handleSSE)
	http.HandleFunc("/api/positions", pm.handleGetAllPositions)
	http.HandleFunc("/api/position", pm.handleGetPosition)
	http.HandleFunc("/api/objects", om.handleGetAllObjects)
	http.HandleFunc("/api/object", om.handleGetObject)
	http.HandleFunc("/api/stats", func(w http.ResponseWriter, r *http.Request) {
		handleGetStats(w, r, pm, om)
	})

	// Serve static files (for candidate's frontend)
	fs := http.FileServer(http.Dir("./public"))
	http.Handle("/", fs)

	port := ":8080"
	log.Printf("Starting server on %s", port)
	log.Printf("Simulating %d objects on a %.0f x %.0f meter map",
		numObjects, mapWidth, mapHeight)
	log.Printf("Update interval: %v", updateInterval)
	log.Printf("\nAvailable endpoints:")
	log.Printf("  - GET  /api/objects           (Get all objects with metadata)")
	log.Printf("  - GET  /api/object?id=X       (Get single object)")
	log.Printf("  - GET  /api/positions/stream  (SSE stream of position updates)")
	log.Printf("  - GET  /api/positions         (Get all positions)")
	log.Printf("  - GET  /api/position?id=X     (Get single position)")
	log.Printf("  - GET  /api/stats             (Get system stats)")
	log.Fatal(http.ListenAndServe(port, nil))
}
