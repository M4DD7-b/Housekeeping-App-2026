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
const DEFAULT_STATUSES = ['done', 'service', 'checked', 'maintenance', 'checkout', 'occupied'];

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

// Reset all rooms to default state
function resetAllRooms() {
    localStorage.removeItem(STORAGE_KEY);
    return [];
}

// Employee and Rota Management
const EMPLOYEES_KEY = 'housekeeping_employees';
const ROTA_KEY = 'housekeeping_rota';

// Get all employees
function getEmployees() {
    const stored = localStorage.getItem(EMPLOYEES_KEY);
    
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Error parsing stored employees:', e);
        }
    }
    
    return [];
}

// Add a new employee
function addEmployee(name) {
    const employees = getEmployees();
    const newEmployee = {
        id: Date.now().toString(),
        name: name.trim()
    };
    
    employees.push(newEmployee);
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
    return newEmployee;
}

// Remove an employee
function removeEmployee(employeeId) {
    const employees = getEmployees();
    const filtered = employees.filter(emp => emp.id !== employeeId);
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(filtered));
    
    // Also remove from rota
    const rota = getRota();
    delete rota[employeeId];
    saveRota(rota);
}

// Get rota data
function getRota() {
    const stored = localStorage.getItem(ROTA_KEY);
    
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error('Error parsing stored rota:', e);
        }
    }
    
    return {};
}

// Save rota data
function saveRota(rota) {
    localStorage.setItem(ROTA_KEY, JSON.stringify(rota));
}

// Calculate shift hours from start and end times
function calculateShiftHours(startTime, endTime) {
    if (!startTime || !endTime) {
        return 0;
    }

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const start = startHours + startMinutes / 60;
    const end = endHours + endMinutes / 60;
    const diff = end - start;
    return diff > 0 ? Math.round(diff * 100) / 100 : 0;
}

// Update rota assignment
function updateRotaAssignment(employeeId, day, assigned, hours) {
    const rota = getRota();
    const existing = rota[employeeId]?.[day] || {};

    if (!rota[employeeId]) {
        rota[employeeId] = {};
    }
    
    rota[employeeId][day] = {
        assigned: assigned,
        hours: assigned ? hours : 0,
        startTime: assigned ? existing.startTime || '' : '',
        endTime: assigned ? existing.endTime || '' : ''
    };
    
    saveRota(rota);
}

function updateRotaShiftTimes(employeeId, day, startTime, endTime) {
    const rota = getRota();
    
    if (!rota[employeeId]) {
        rota[employeeId] = {};
    }

    const assigned = Boolean(startTime && endTime);
    const hours = calculateShiftHours(startTime, endTime);

    rota[employeeId][day] = {
        assigned: assigned,
        hours: assigned ? hours : 0,
        startTime: assigned ? startTime : '',
        endTime: assigned ? endTime : ''
    };

    saveRota(rota);
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
        resetAllRooms,
        importRooms,
        getEmployees,
        addEmployee,
        removeEmployee,
        getRota,
        saveRota,
        updateRotaAssignment,
        updateRotaShiftTimes
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

        window.resetAllRooms = resetAllRooms;
        window.getEmployees = getEmployees;
        window.addEmployee = addEmployee;
        window.removeEmployee = removeEmployee;
        window.getRota = getRota;
        window.saveRota = saveRota;
        window.updateRotaAssignment = updateRotaAssignment;
        window.updateRotaShiftTimes = updateRotaShiftTimes;
        window.importRooms = importRooms;
    };
}
