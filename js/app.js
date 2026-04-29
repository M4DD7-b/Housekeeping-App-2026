// Housekeeping App - Interactive UI Logic

// DOM Elements
const stairwaysContainer = document.getElementById('stairwaysContainer');
const statusSummary = document.getElementById('statusSummary');
const roomModal = document.getElementById('roomModal');
const modalClose = document.querySelector('.modal-close');
const refreshBtn = document.getElementById('refreshBtn');
const exportBtn = document.getElementById('exportBtn');
const saveRoomBtn = document.getElementById('saveRoomBtn');
const deleteRoomBtn = document.getElementById('deleteRoomBtn');

// Add Room elements
const addRoomBtn = document.getElementById('addRoomBtn');
const addRoomModal = document.getElementById('addRoomModal');
const addRoomModalClose = document.getElementById('addRoomModalClose');
const addStairway = document.getElementById('addStairway');
const addFloor = document.getElementById('addFloor');
const addRoomName = document.getElementById('addRoomName');
const confirmAddRoomBtn = document.getElementById('confirmAddRoomBtn');

// Modal form elements
const modalRoomTitle = document.getElementById('modalRoomTitle');
const roomStatus = document.getElementById('roomStatus');
const roomNotes = document.getElementById('roomNotes');
const roomGuest = document.getElementById('roomGuest');
const modalLastUpdated = document.getElementById('modalLastUpdated');

let currentRoomId = null;

// Initialize the app
function init() {
    renderStairways();
    renderStatusSummary();
    setupEventListeners();
}

// Render all stairways with their rooms
function renderStairways() {
    const roomsByLocation = getRoomsByLocation();
    
    stairwaysContainer.innerHTML = '';
    
    for (const [stairwayId, stairwayData] of Object.entries(roomsByLocation)) {
        const stairwayEl = document.createElement('div');
        stairwayEl.className = 'stairway';
        stairwayEl.innerHTML = `
            <div class="stairway-header">${stairwayData.name}</div>
            <div class="stairway-rooms" data-stairway="${stairwayId}">
                ${renderFloorRooms(stairwayData.floors)}
            </div>
        `;
        
        stairwaysContainer.appendChild(stairwayEl);
    }
}

// Render rooms for all floors in a stairway
function renderFloorRooms(floors) {
    let html = '';
    
    // Render floors in order (4 to 1)
    const floorOrder = [4, 3, 2, 1];
    
    floorOrder.forEach(floor => {
        const floorRooms = floors[floor] || [];
        
        floorRooms.forEach(room => {
            html += createRoomCard(room);
        });
    });
    
    return html;
}

// Create HTML for a single room card
function createRoomCard(room) {
    const statusLabel = getStatusLabel(room.status);
    const displayNumber = `${room.floor}${room.name.padStart(2, '0')}`;
    
    return `
        <div class="room-card ${room.status}" 
             data-room-id="${room.id}"
             title="Room ${displayNumber} - ${statusLabel}">
            <div class="room-number">${displayNumber}</div>
            <div class="room-status">${statusLabel}</div>
            ${room.guest ? `<div class="room-guest">${escapeHtml(room.guest)}</div>` : ''}
        </div>
    `;
}

// Get readable status label
function getStatusLabel(status) {
    const labels = {
        clean: 'Clean',
        dirty: 'Dirty',
        inspected: 'Inspected',
        maintenance: 'Maintenance',
        checkout: 'Checkout'
    };
    return labels[status] || status;
}

// Render status summary cards
function renderStatusSummary() {
    const summary = getStatusSummary();
    
    const statusConfig = [
        { key: 'clean', label: 'Clean' },
        { key: 'dirty', label: 'Dirty' },
        { key: 'inspected', label: 'Inspected' },
        { key: 'maintenance', label: 'Maintenance' },
        { key: 'checkout', label: 'Checkout' }
    ];
    
    statusSummary.innerHTML = statusConfig.map(config => `
        <div class="summary-card ${config.key}">
            <div class="count">${summary[config.key]}</div>
            <div class="label">${config.label}</div>
        </div>
    `).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Room card clicks
    stairwaysContainer.addEventListener('click', (e) => {
        const roomCard = e.target.closest('.room-card');
        if (roomCard) {
            openRoomModal(roomCard.dataset.roomId);
        }
    });
    
    // Modal close
    modalClose.addEventListener('click', closeModal);
    roomModal.addEventListener('click', (e) => {
        if (e.target === roomModal) {
            closeModal();
        }
    });
    
    // Refresh button
    refreshBtn.addEventListener('click', () => {
        renderStairways();
        renderStatusSummary();
    });
    
    // Export button
    exportBtn.addEventListener('click', () => {
        exportRooms();
    });
    
    // Save room button
    saveRoomBtn.addEventListener('click', () => {
        if (currentRoomId) {
            saveRoomChanges();
        }
    });
    
    // Delete room button
    deleteRoomBtn.addEventListener('click', () => {
        if (currentRoomId && confirm('Reset this room to clean status?')) {
            deleteRoom(currentRoomId);
            closeModal();
            renderStairways();
            renderStatusSummary();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && roomModal.classList.contains('active')) {
            closeModal();
        }
        if (e.key === 'Escape' && addRoomModal.classList.contains('active')) {
            closeAddRoomModal();
        }
    });

    // Add Room button
    addRoomBtn.addEventListener('click', () => {
        addRoomModal.classList.add('active');
    });

    // Add Room modal close
    addRoomModalClose.addEventListener('click', closeAddRoomModal);
    addRoomModal.addEventListener('click', (e) => {
        if (e.target === addRoomModal) {
            closeAddRoomModal();
        }
    });

    // Confirm Add Room
    confirmAddRoomBtn.addEventListener('click', () => {
        const stairway = parseInt(addStairway.value);
        const floor = parseInt(addFloor.value);
        const roomName = addRoomName.value.trim();

        if (!number || number < 1) {
            alert('Please enter a valid room number');
            return;
        }

        if (addRoom(stairway, floor, roomName)) {
            closeAddRoomModal();
            addRoomNumber.value = '';
            renderStairways();
            renderStatusSummary();
        } else {
            alert('Room already exists in this location!');
        }
    });
}

// Open room modal
function openRoomModal(roomId) {
    const room = getRoom(roomId);
    
    if (!room) return;
    
    currentRoomId = roomId;
    
    const displayNumber = `${room.floor}${String(room.number).padStart(2, '0')}`;
    modalRoomTitle.textContent = `Room ${displayNumber} Details`;
    
    roomStatus.value = room.status;
    roomNotes.value = room.notes || '';
    roomGuest.value = room.guest || '';
    modalLastUpdated.textContent = formatDate(room.lastUpdated);
    
    roomModal.classList.add('active');
}

// Close room modal
function closeModal() {
    roomModal.classList.remove('active');
    currentRoomId = null;
}

// Close Add Room modal
function closeAddRoomModal() {
    addRoomModal.classList.remove('active');
    addRoomNumber.value = '';
}

// Save room changes
function saveRoomChanges() {
    if (!currentRoomId) return;
    
    const updates = {
        status: roomStatus.value,
        notes: roomNotes.value.trim(),
        guest: roomGuest.value.trim()
    };
    
    updateRoom(currentRoomId, updates);
    closeModal();
    renderStairways();
    renderStatusSummary();
}

// Format date for display
function formatDate(isoString) {
    if (!isoString) return '-';
    
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);