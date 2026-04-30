// Housekeeping App - Interactive UI Logic

// DOM Elements
const stairwaysContainer = document.getElementById('stairwaysContainer');
const statusSummary = document.getElementById('statusSummary');
const roomModal = document.getElementById('roomModal');
const modalClose = document.querySelector('.modal-close');
const refreshBtn = document.getElementById('refreshBtn');
const exportBtn = document.getElementById('exportBtn');
const saveRoomBtn = document.getElementById('saveRoomBtn');
const resetRoomBtn = document.getElementById('resetRoomBtn');

// Modal form elements
const modalRoomTitle = document.getElementById('modalRoomTitle');
const roomStatus = document.getElementById('roomStatus');
const roomNotes = document.getElementById('roomNotes');
const roomGuest = document.getElementById('roomGuest');
const modalLastUpdated = document.getElementById('modalLastUpdated');

let currentRoomId = null;

// Initialize the app
async function init() {
    const roomsData = await fetch('data/rooms.json').then(r => r.json());
    
    if (roomsData.rooms && roomsData.rooms.length > 0) {
        importRooms(roomsData.rooms);
    }
    
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
    const displayName = `${room.name}`;
    
    return `
        <div class="room-card ${room.status}" 
             data-room-id="${room.id}"
             title="Room ${displayName} - ${statusLabel}">
            <div class="room-header">
                <span class="room-name">${displayName}</span>
                <span class="room-floor">Floor ${room.floor}</span>
            </div>
            <div class="room-status">${statusLabel}</div>
            ${room.guest ? `<div class="room-guest">${escapeHtml(room.guest)}</div>` : ''}
        </div>
    `;
}

// Get readable status label
function getStatusLabel(status) {
    const labels = {
        done: 'Done',
        dirty: 'Dirty',
        checked: 'Checked',
        maintenance: 'Maintenance',
        checkout: 'Checkout',
        occupied: 'Occupied'
    };
    return labels[status] || status;
}

// Render status summary cards
function renderStatusSummary() {
    const summary = getStatusSummary();
    
    const statusConfig = [
        { key: 'done', label: 'Done' },
        { key: 'dirty', label: 'Dirty' },
        { key: 'checked', label: 'Checked' },
        { key: 'maintenance', label: 'Maintenance' },
        { key: 'checkout', label: 'Checkout' },
        { key: 'occupied', label: 'Occupied' }
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
    
    // Reset room button
    resetRoomBtn.addEventListener('click', () => {
        if (currentRoomId && confirm('Reset this room to checked status?')) {
            resetRoom(currentRoomId);
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
    });
}

// Open room modal
function openRoomModal(roomId) {
    const room = getRoom(roomId);
    
    if (!room) return;
    
    currentRoomId = roomId;
    
    const displayName = `${room.name}`;
    modalRoomTitle.textContent = `${room.name} Details`;
    
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