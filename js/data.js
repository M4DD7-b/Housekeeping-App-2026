// Housekeeping App - Data Management
const STORAGE_KEY = 'housekeeping_rooms';

// Define the hotel structure: 5 stairways, 4 floors
// Each stairway has a different number of rooms
const HOTEL_CONFIG = {
    stairways: [
        { id: 1, name: 'Stairway 51', roomsPerFloor: 8 },
        { id: 2, name: 'Stairway 49', roomsPerFloor: 10 },
        { id: 3, name: 'Stairway 47', roomsPerFloor: 6 },
        { id: 4, name: 'Stairway 45', roomsPerFloor: 12 },
        { id: 5, name: 'Stairway 43', roomsPerFloor: 9 }
    ],
    floors: [4, 3, 2, 1]
};

// Default room statuses
const DEFAULT_STATUSES = ['clean', 'dirty', 'inspected', 'maintenance', 'checkout'];

// Generate initial room data
function generateInitialRooms() {
    const rooms = [];
    
    HOTEL_CONFIG.stairways.forEach(stairway => {
        HOTEL_CONFIG.floors.forEach(floor => {
            for (let roomNum = 1; roomNum <= stairway.roomsPerFloor; roomNum++) {
                const roomId = `${stairway.id}-${floor}-${roomNum}`;
                rooms.push({
                    id: roomId,
                    stairway: stairway.id,
                    floor: floor,
                    name: String(roomNum),
                    status: getRandomStatus(),
                    notes: '',
                    guest: '',
                    lastUpdated: new Date().toISOString()
                });
            }
        });
    });
    
    return rooms;
}

// Get a random status (weighted towards clean)
function getRandomStatus() {
    const weights = {
        clean: 0.35,
        dirty: 0.25,
        inspected: 0.20,
        maintenance: 0.10,
        checkout: 0.10
    };
    
    const random = Math.random();
    let cumulative = 0;
    
    for (const [status, weight] of Object.entries(weights)) {
        cumulative += weight;
        if (random <= cumulative) {
            return status;
        }
    }
    
    return 'clean';
}

// Load rooms from localStorage or generate new
function loadRooms() {
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Error parsing stored rooms:', e);
        }
    }
    
    // Generate new rooms if none stored
    const rooms = generateInitialRooms();
    saveRooms(rooms);
    return rooms;
}

// Save rooms to localStorage
function saveRooms(rooms) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

// Get rooms by filter
function getRooms(filters = {}) {
    let rooms = loadRooms();
    
    if (filters.stairway) {
        rooms = rooms.filter(r => r.stairway === filters.stairway);
    }
    
    if (filters.floor) {
        rooms = rooms.filter(r => r.floor === filters.floor);
    }
    
    if (filters.status) {
        rooms = rooms.filter(r => r.status === filters.status);
    }
    
    return rooms;
}

// Get a single room by ID
function getRoom(roomId) {
    const rooms = loadRooms();
    return rooms.find(r => r.id === roomId);
}

// Update a room
function updateRoom(roomId, updates) {
    const rooms = loadRooms();
    const index = rooms.findIndex(r => r.id === roomId);
    
    if (index !== -1) {
        rooms[index] = {
            ...rooms[index],
            ...updates,
            lastUpdated: new Date().toISOString()
        };
        saveRooms(rooms);
        return rooms[index];
    }
    
    return null;
}

// Delete a room (reset to default)
function deleteRoom(roomId) {
    const rooms = loadRooms();
    const index = rooms.findIndex(r => r.id === roomId);
    
    if (index !== -1) {
        rooms[index] = {
            ...rooms[index],
            status: 'clean',
            notes: '',
            guest: '',
            lastUpdated: new Date().toISOString()
        };
        saveRooms(rooms);
        return rooms[index];
    }
    
    return null;
}

// Get status summary
function getStatusSummary() {
    const rooms = loadRooms();
    const summary = {};
    
    DEFAULT_STATUSES.forEach(status => {
        summary[status] = 0;
    });
    
    rooms.forEach(room => {
        if (summary[room.status] !== undefined) {
            summary[room.status]++;
        }
    });
    
    return summary;
}

// Get rooms grouped by stairway and floor
function getRoomsByLocation() {
    const rooms = loadRooms();
    const grouped = {};
    
    HOTEL_CONFIG.stairways.forEach(stairway => {
        grouped[stairway.id] = {
            name: stairway.name,
            floors: {}
        };
        
        HOTEL_CONFIG.floors.forEach(floor => {
            grouped[stairway.id].floors[floor] = rooms.filter(
                r => r.stairway === stairway.id && r.floor === floor
            ).sort((a, b) => parseInt(a.name) - parseInt(b.name));
        });
    });
    
    return grouped;
}

// Export rooms data
function exportRooms() {
    const rooms = loadRooms();
    const dataStr = JSON.stringify(rooms, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `housekeeping-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Reset all rooms to default state
function resetAllRooms() {
    localStorage.removeItem(STORAGE_KEY);
    return generateInitialRooms();
}

// Add a new room to an existing stairway/floor
function addRoom(stairwayId, floor, roomNumber) {
    const rooms = loadRooms();
    const roomId = `${stairwayId}-${floor}-${roomNumber}`;

    // Check if room already exists
    if (rooms.find(r => r.id === roomId)) {
        return null; // Room already exists
    }

    const newRoom = {
        id: roomId,
        stairway: parseInt(stairwayId),
        floor: parseInt(floor),
        number: String(roomNumber),
        status: 'clean',
        notes: '',
        guest: '',
        lastUpdated: new Date().toISOString()
    };

    rooms.push(newRoom);
    saveRooms(rooms);
    return newRoom;
}

// Export functions for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        HOTEL_CONFIG,
        DEFAULT_STATUSES,
        loadRooms,
        saveRooms,
        getRooms,
        getRoom,
        updateRoom,
        deleteRoom,
        getStatusSummary,
        getRoomsByLocation,
        exportRooms,
        resetAllRooms,
        addRoom
    };
}