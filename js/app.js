// Housekeeping App - Interactive UI Logic

// DOM Elements
const stairwaysContainer = document.getElementById('stairwaysContainer');
const statusSummary = document.getElementById('statusSummary');
const roomModal = document.getElementById('roomModal');
const modalCloseButtons = document.querySelectorAll('.modal-close');
const dashboardBtn = document.getElementById('dashboardBtn');
const rotaBtn = document.getElementById('rotaBtn');
const saveRoomBtn = document.getElementById('saveRoomBtn');
const resetRoomBtn = document.getElementById('resetRoomBtn');
const addEmployeeBtn = document.getElementById('addEmployeeBtn');
const legendContainer = document.getElementById('legend');

const dashboardView = document.getElementById('dashboardView');
const rotaView = document.getElementById('rotaView');
const employeesList = document.getElementById('employeesList');
const rotaGrid = document.getElementById('rotaGrid');
const rotaTimeModal = document.getElementById('rotaTimeModal');
const rotaTimeModalCloseButtons = document.querySelectorAll('.rota-time-modal-close');
const rotaEmployeeTitle = document.getElementById('rotaEmployeeTitle');
const rotaTimeBody = document.getElementById('rotaTimeBody');
const saveRotaTimesBtn = document.getElementById('saveRotaTimesBtn');

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const modalRoomTitle = document.getElementById('modalRoomTitle');
const roomStatus = document.getElementById('roomStatus');
const roomNotes = document.getElementById('roomNotes');
const roomGuest = document.getElementById('roomGuest');
const modalLastUpdated = document.getElementById('modalLastUpdated');

let currentRoomId = null;
let currentTimeModalEmployeeId = null;

// Initialize the app
async function init() {
    let storedRooms = loadRooms();

    if (storedRooms.length === 0) {
        try {
            const response = await fetch('data/rooms.json');
            if (response.ok) {
                const roomsData = await response.json();
                if (roomsData.rooms && roomsData.rooms.length > 0) {
                    importRooms(roomsData.rooms);
                }
            } else {
                console.warn('Unable to fetch rooms.json:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error loading room data:', error);
        }

        storedRooms = loadRooms();
    }

    renderStairways();
    renderStatusSummary();
    showDashboardView();
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
            <div class="stairway-header stairway-header-${stairwayId}">${stairwayData.name}</div>
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
            ${room.notes ? `<div class="room-notes">${escapeHtml(room.notes)}</div>` : ''}
        </div>
    `;
}

// Get readable status label
function getStatusLabel(status) {
    const labels = {
        done: 'Done',
        service: 'Service',
        checked: 'Checked',
        maintenance: 'Under Maintenance',
        checkout: 'Checked Out',
        occupied: 'Occupied'
    };
    return labels[status] || status;
}

// Render status summary cards
function renderStatusSummary() {
    const summary = getStatusSummary();
    const statusConfig = [
        { key: 'done', label: 'Done' },
        { key: 'service', label: 'Service' },
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
    stairwaysContainer.addEventListener('click', (e) => {
        const roomCard = e.target.closest('.room-card');
        if (roomCard) {
            openRoomModal(roomCard.dataset.roomId);
        }
    });

    modalCloseButtons.forEach(button => button.addEventListener('click', closeModal));

    roomModal.addEventListener('click', (e) => {
        if (e.target === roomModal) {
            closeModal();
        }
    });

    dashboardBtn.addEventListener('click', showDashboardView);
    rotaBtn.addEventListener('click', showRotaView);

    saveRoomBtn.addEventListener('click', () => {
        if (currentRoomId) {
            saveRoomChanges();
        }
    });

    resetRoomBtn.addEventListener('click', () => {
        if (currentRoomId && confirm('Reset this room to checked status?')) {
            resetRoom(currentRoomId);
            closeModal();
            renderStairways();
            renderStatusSummary();
        }
    });

    addEmployeeBtn.addEventListener('click', () => {
        const employeeName = prompt('Enter employee name:');
        if (employeeName && employeeName.trim()) {
            addEmployee(employeeName.trim());
            renderEmployees();
            renderRotaGrid();
        }
    });

    employeesList.addEventListener('click', (e) => {
        const nameButton = e.target.closest('.employee-name-btn');
        if (nameButton) {
            openRotaTimeModal(nameButton.dataset.employeeId);
        }
    });

    rotaGrid.addEventListener('click', (e) => {
        const nameButton = e.target.closest('.employee-name-btn');
        if (nameButton) {
            openRotaTimeModal(nameButton.dataset.employeeId);
        }
    });

    rotaTimeModalCloseButtons.forEach(button => button.addEventListener('click', closeRotaTimeModal));
    saveRotaTimesBtn.addEventListener('click', saveRotaTimeSettings);
    rotaTimeBody.addEventListener('change', handleRotaTimeBodyChange);

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

// Show dashboard view
function showDashboardView() {
    dashboardView.classList.remove('hidden');
    rotaView.classList.add('hidden');
    legendContainer.classList.remove('hidden');
    dashboardBtn.classList.add('active');
    rotaBtn.classList.remove('active');
}

// Show rota view
function showRotaView() {
    dashboardView.classList.add('hidden');
    rotaView.classList.remove('hidden');
    legendContainer.classList.add('hidden');
    dashboardBtn.classList.remove('active');
    rotaBtn.classList.add('active');
    renderEmployees();
    renderRotaGrid();
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

// Rota Management Functions
function renderEmployees() {
    const employees = getEmployees();
    employeesList.innerHTML = '';

    employees.forEach(employee => {
        const employeeEl = document.createElement('div');
        employeeEl.className = 'employee-item';
        employeeEl.innerHTML = `
            <button type="button" class="employee-name-btn">${escapeHtml(employee.name)}</button>
            <button class="btn btn-danger btn-sm remove-employee" data-employee-id="${employee.id}">×</button>
        `;
        employeeEl.querySelector('.employee-name-btn').dataset.employeeId = employee.id;
        employeesList.appendChild(employeeEl);
    });

    document.querySelectorAll('.remove-employee').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const employeeId = e.target.dataset.employeeId;
            if (confirm('Remove this employee from the rota?')) {
                removeEmployee(employeeId);
                renderEmployees();
                renderRotaGrid();
            }
        });
    });
}

function renderRotaGrid() {
    const employees = getEmployees();
    const rota = getRota();
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    rotaGrid.innerHTML = '';

    const headerRow = document.createElement('div');
    headerRow.className = 'rota-row rota-header';
    headerRow.innerHTML = '<div class="rota-cell rota-employee">Employee</div>';

    days.forEach(day => {
        headerRow.innerHTML += `<div class="rota-cell rota-day">${day}</div>`;
    });

    rotaGrid.appendChild(headerRow);

    employees.forEach(employee => {
        const employeeRow = document.createElement('div');
        employeeRow.className = 'rota-row';
        employeeRow.innerHTML = `
            <div class="rota-cell rota-employee">
                <button type="button" class="employee-name-btn" data-employee-id="${employee.id}">
                    ${escapeHtml(employee.name)}
                </button>
            </div>`;

        days.forEach(day => {
            const dayKey = day.toLowerCase();
            const assignment = rota[employee.id]?.[dayKey] || { assigned: false, hours: 0, startTime: '', endTime: '' };
            const timeLabel = assignment.assigned && assignment.startTime && assignment.endTime
                ? `${assignment.startTime}–${assignment.endTime}`
                : assignment.assigned && assignment.hours
                    ? `${assignment.hours}h`
                    : '';
            employeeRow.innerHTML += `
                <div class="rota-cell rota-assignment" data-employee-id="${employee.id}" data-day="${dayKey}">
                    <label class="rota-checkbox">
                        <input type="checkbox" class="assignment-checkbox" ${assignment.assigned ? 'checked' : ''}>
                        <span>Assign</span>
                    </label>
                    <input type="number" min="0" max="24" value="${assignment.hours}" class="hours-input" ${assignment.assigned ? '' : 'disabled'}>
                    <div class="assignment-time-label">${timeLabel}</div>
                </div>
            `;
        });

        rotaGrid.appendChild(employeeRow);
    });

    document.querySelectorAll('.assignment-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleAssignmentChange);
    });

    document.querySelectorAll('.hours-input').forEach(input => {
        input.addEventListener('change', handleHoursChange);
    });
}

function handleRotaTimeBodyChange(e) {
    const checkbox = e.target.closest('.time-assigned-checkbox');
    if (checkbox) {
        const row = checkbox.closest('.time-row');
        const startInput = row.querySelector('.start-time');
        const endInput = row.querySelector('.end-time');
        const enabled = checkbox.checked;
        startInput.disabled = !enabled;
        endInput.disabled = !enabled;
        if (!enabled) {
            startInput.value = '';
            endInput.value = '';
        }
    }
}

function openRotaTimeModal(employeeId) {
    const employee = getEmployees().find(emp => emp.id === employeeId);
    if (!employee) return;

    currentTimeModalEmployeeId = employeeId;
    rotaEmployeeTitle.textContent = `${employee.name} Shift Times`;
    const rota = getRota();
    const employeeRota = rota[employeeId] || {};

    rotaTimeBody.innerHTML = '';

    daysOfWeek.forEach(day => {
        const dayKey = day.toLowerCase();
        const assignment = employeeRota[dayKey] || { assigned: false, hours: 0, startTime: '', endTime: '' };

        const row = document.createElement('div');
        row.className = 'time-row';
        row.innerHTML = `
            <div class="time-day">${day}</div>
            <label class="time-assign">
                <input type="checkbox" class="time-assigned-checkbox" data-day="${dayKey}" ${assignment.assigned ? 'checked' : ''}>
                Assigned
            </label>
            <div class="time-input-group">
                <input type="time" class="time-input start-time" data-day="${dayKey}" value="${assignment.startTime || ''}" ${assignment.assigned ? '' : 'disabled'}>
                <span>to</span>
                <input type="time" class="time-input end-time" data-day="${dayKey}" value="${assignment.endTime || ''}" ${assignment.assigned ? '' : 'disabled'}>
            </div>
        `;
        rotaTimeBody.appendChild(row);
    });

    rotaTimeModal.classList.add('active');
}

function closeRotaTimeModal() {
    rotaTimeModal.classList.remove('active');
    currentTimeModalEmployeeId = null;
}

function saveRotaTimeSettings() {
    if (!currentTimeModalEmployeeId) return;

    const rota = getRota();
    if (!rota[currentTimeModalEmployeeId]) {
        rota[currentTimeModalEmployeeId] = {};
    }

    rotaTimeBody.querySelectorAll('.time-row').forEach(row => {
        const day = row.querySelector('.time-assigned-checkbox').dataset.day;
        const assigned = row.querySelector('.time-assigned-checkbox').checked;
        const startTime = row.querySelector('.start-time').value;
        const endTime = row.querySelector('.end-time').value;

        rota[currentTimeModalEmployeeId][day] = {
            assigned: assigned,
            hours: assigned ? calculateShiftHours(startTime, endTime) : 0,
            startTime: assigned ? startTime : '',
            endTime: assigned ? endTime : ''
        };
    });

    saveRota(rota);
    closeRotaTimeModal();
    renderRotaGrid();
}

function handleAssignmentChange(e) {
    const cell = e.target.closest('.rota-assignment');
    const employeeId = cell.dataset.employeeId;
    const day = cell.dataset.day;
    const assigned = e.target.checked;
    const hoursInput = cell.querySelector('.hours-input');

    hoursInput.disabled = !assigned;
    if (!assigned) {
        hoursInput.value = 0;
    }

    updateRotaAssignment(employeeId, day, assigned, parseInt(hoursInput.value) || 0);
}

function handleHoursChange(e) {
    const cell = e.target.closest('.rota-assignment');
    const employeeId = cell.dataset.employeeId;
    const day = cell.dataset.day;
    const hours = parseInt(e.target.value) || 0;

    updateRotaAssignment(employeeId, day, true, hours);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
