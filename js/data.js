// Housekeeping App - Data Management
const STORAGE_KEY = 'housekeeping_rooms';

// Define the hotel structure: 5 stairways, 4 floors
// Each stairway has a different number of rooms
const HOTEL_CONFIG = {
    stairways: [
        { id: 1, name: 'Stairway 51', roomsPerFloor: 1 },
        { id: 2, name: 'Stairway 49', roomsPerFloor: 1 },
        { id: 3, name: 'Stairway 47', roomsPerFloor: 1 },
        { id: 4, name: 'Stairway 45', roomsPerFloor: 1 },
        { id: 5, name: 'Stairway 43', roomsPerFloor: 1 }
    ],
    floors: [4, 3, 2, 1]
};

// Default room statuses
const DEFAULT_STATUSES = ['done', 'dirty', 'checked', 'maintenance', 'checkout', 'occupied'];

// Load rooms from localStorage or return empty if none stored
function loadRooms() {
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Error parsing stored rooms:', e);
        }
    }
    
    // Return empty array - no auto-generation
    // Rooms must be explicitly added via importRooms()
    return [];
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

// Reset a room (reset to default)
function resetRoom(roomId) {
    const rooms = loadRooms();
    const index = rooms.findIndex(r => r.id === roomId);
    
    if (index !== -1) {
        rooms[index] = {
            ...rooms[index],
            status: 'checked',
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
            ).sort((a, b) => String(a.name).localeCompare(String(b.name)));
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
    return [];
}

// Import rooms from a JSON array (e.g., from rooms.json)
function importRooms(roomList) {
    if (!Array.isArray(roomList)) {
        console.error('Invalid room list: expected an array');
        return false;
    }
    
    const rooms = roomList.map(room => ({
        id: room.id,
        stairway: room.stairway,
        floor: room.floor,
        name: room.name,
        status: room.status || 'checked',
        notes: room.notes || '',
        guest: room.guest || '',
        lastUpdated: room.lastUpdated || new Date().toISOString()
    }));
    
    saveRooms(rooms);
    return true;
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
        resetRoom,
        getStatusSummary,
        getRoomsByLocation,
        exportRooms,
        resetAllRooms,
        importRooms
    };

    // Also expose functions globally for browser use
    if (typeof window !== 'undefined') {
        window.HOTEL_CONFIG = HOTEL_CONFIG;
        window.DEFAULT_STATUSES = DEFAULT_STATUSES;
        window.loadRooms = loadRooms;
        window.saveRooms = saveRooms;
        window.getRooms = getRooms;
        window.getRoom = getRoom;
        window.updateRoom = updateRoom;
        window.resetRoom = resetRoom;
        window.getStatusSummary = getStatusSummary;
        window.getRoomsByLocation = getRoomsByLocation;
        window.exportRooms = exportRooms;
        window.resetAllRooms = resetAllRooms;
        window.importRooms = importRooms;
    };
}