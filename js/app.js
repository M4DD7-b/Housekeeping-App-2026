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
const mainAreaBtn = document.getElementById('mainAreaBtn');
const apartmentsAreaBtn = document.getElementById('apartmentsAreaBtn');

const dashboardView = document.getElementById('dashboardView');
const rotaView = document.getElementById('rotaView');
const employeesList = document.getElementById('employeesList');
const rotaGrid = document.getElementById('rotaGrid');
const rotaTimeModal = document.getElementById('rotaTimeModal');
const rotaTimeModalCloseButtons = document.querySelectorAll('.rota-time-modal-close');
const rotaEmployeeTitle = document.getElementById('rotaEmployeeTitle');
const rotaTimeBody = document.getElementById('rotaTimeBody');
const saveRotaTimesBtn = document.getElementById('saveRotaTimesBtn');
const exportScheduleBtn = document.getElementById('exportScheduleBtn');

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const modalRoomTitle = document.getElementById('modalRoomTitle');
const roomStatus = document.getElementById('roomStatus');
const roomNotes = document.getElementById('roomNotes');
const roomGuest = document.getElementById('roomGuest');
const roomBreakfast = document.getElementById('roomBreakfast');
const modalLastUpdated = document.getElementById('modalLastUpdated');

let currentRoomId = null;
let currentTimeModalEmployeeId = null;
let currentDashboardArea = 'main';

// Initialize the app
async function init() {
    let storedRooms = loadRooms();

    try {
        const response = await fetch('data/rooms.json');
        if (response.ok) {
            const roomsData = await response.json();
            if (roomsData.rooms && roomsData.rooms.length > 0) {
                if (storedRooms.length === 0) {
                    importRooms(roomsData.rooms);
                } else {
                    mergeMissingRooms(roomsData.rooms, storedRooms);
                }
            }
        } else {
            console.warn('Unable to fetch rooms.json:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Error loading room data:', error);
    }

    storedRooms = loadRooms();

    renderStairways();
    renderStatusSummary();
    showDashboardView();
    setupEventListeners();
    updateDashboardAreaButtons();
}

function mergeMissingRooms(roomList, storedRooms) {
    const storedIds = new Set(storedRooms.map(room => room.id));
    const missingRooms = roomList
        .filter(room => !storedIds.has(room.id))
        .map(room => ({
            id: room.id,
            stairway: room.stairway,
            floor: room.floor,
            name: room.name,
            status: room.status || 'checked',
            notes: room.notes || '',
            guest: room.guest || '',
            breakfast: room.breakfast || false,
            area: room.area || 'main',
            lastUpdated: room.lastUpdated || new Date().toISOString()
        }));

    if (missingRooms.length > 0) {
        saveRooms([...storedRooms, ...missingRooms]);
    }
}

// Render all stairways with their rooms
function renderStairways() {
    const roomsByLocation = getRoomsByLocation(currentDashboardArea);
    stairwaysContainer.innerHTML = '';

    const stairwayIds = Object.keys(roomsByLocation);
    if (stairwayIds.length === 0) {
        stairwaysContainer.innerHTML = '<div class="empty-state">No rooms available for this view.</div>';
        return;
    }

    for (const [stairwayId, stairwayData] of Object.entries(roomsByLocation)) {
        const stairwayEl = document.createElement('div');
        stairwayEl.className = 'stairway';
        stairwayEl.innerHTML = `
            <div class="stairway-header stairway-header-${stairwayId}">
                <button class="stairway-toggle" type="button" aria-expanded="false">
                    <span>${stairwayData.name}</span>
                    <span class="stairway-toggle-arrow">▾</span>
                </button>
            </div>
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
    
    const guestText = room.guest > 0 ? `(${room.guest})` : '';
    
    // Display breakfast only when guests exist, otherwise show only guest count if present
    let breakfastDisplay = '';
    if (room.guest > 0 && room.breakfast) {
        breakfastDisplay = `<div class="room-breakfast">Breakfast Included ${guestText}</div>`;
    } else if (room.guest > 0) {
        breakfastDisplay = `<div class="room-breakfast">${guestText}</div>`;
    }

    return `
        <div class="room-card ${room.status}" 
             data-room-id="${room.id}"
             title="Room ${displayName} - ${statusLabel}">
            <div class="room-header">
                <span class="room-name">${displayName}</span>
                <span class="room-floor">Floor ${room.floor}</span>
            </div>
            <div class="room-status">${statusLabel}</div>
            ${breakfastDisplay}
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
    const summary = getStatusSummary(currentDashboardArea);
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
        const toggleButton = e.target.closest('.stairway-toggle');
        if (toggleButton) {
            const stairway = toggleButton.closest('.stairway');
            const rooms = stairway.querySelector('.stairway-rooms');
            const expanded = stairway.classList.toggle('open');
            toggleButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            if (rooms) {
                rooms.style.display = expanded ? 'flex' : 'none';
            }
            return;
        }

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
    mainAreaBtn.addEventListener('click', () => switchDashboardArea('main'));
    apartmentsAreaBtn.addEventListener('click', () => switchDashboardArea('apartments'));

    saveRoomBtn.addEventListener('click', () => {
        if (currentRoomId) {
            saveRoomChanges();
        }
    });

    roomGuest.addEventListener('input', handleGuestInputChange);

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
    exportScheduleBtn.addEventListener('click', exportSchedule);

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
    roomGuest.value = room.guest || 0;
    const guestCount = Number(roomGuest.value);
    roomBreakfast.checked = guestCount > 0 && (room.breakfast || false);
    roomBreakfast.disabled = guestCount <= 0;
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

    const guestValue = roomGuest.value;
    const guestNumber = Number(guestValue);

    if (guestValue.trim() === '' || Number.isNaN(guestNumber)) {
        alert('Please enter the number of guests for this room.');
        roomGuest.focus();
        return;
    }

    if (guestNumber < 0) {
        alert('Number of guests cannot be negative.');
        roomGuest.focus();
        return;
    }

    if (roomBreakfast.checked && guestNumber === 0) {
        alert('Breakfast can only be included when there is at least one guest.');
        roomBreakfast.checked = false;
        roomBreakfast.disabled = true;
        roomGuest.focus();
        return;
    }

    const updates = {
        status: roomStatus.value,
        notes: roomNotes.value.trim(),
        guest: guestNumber,
        breakfast: roomBreakfast.checked && guestNumber > 0
    };

    updateRoom(currentRoomId, updates);
    closeModal();
    renderStairways();
    renderStatusSummary();
}

function handleGuestInputChange() {
    const guestNumber = Number(roomGuest.value);
    if (Number.isNaN(guestNumber) || guestNumber <= 0) {
        roomBreakfast.checked = false;
        roomBreakfast.disabled = true;
    } else {
        roomBreakfast.disabled = false;
    }
}

// Show dashboard view
function showDashboardView() {
    dashboardView.classList.remove('hidden');
    rotaView.classList.add('hidden');
    legendContainer.classList.remove('hidden');
    dashboardBtn.classList.add('active');
    rotaBtn.classList.remove('active');
    updateDashboardAreaButtons();
}

function switchDashboardArea(area) {
    if (currentDashboardArea === area) return;
    currentDashboardArea = area;
    renderStairways();
    renderStatusSummary();
    updateDashboardAreaButtons();
}

function updateDashboardAreaButtons() {
    mainAreaBtn.classList.toggle('active', currentDashboardArea === 'main');
    apartmentsAreaBtn.classList.toggle('active', currentDashboardArea === 'apartments');
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

    headerRow.innerHTML += '<div class="rota-cell rota-total-hours">Total Hours</div>';
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
                : '';
            employeeRow.innerHTML += `
                <div class="rota-cell rota-assignment" data-employee-id="${employee.id}" data-day="${dayKey}">
                    <label class="rota-checkbox">
                        <input type="checkbox" class="assignment-checkbox" ${assignment.assigned ? 'checked' : ''}>
                        <span>Assign</span>
                    </label>
                    <div class="assignment-time-label">${timeLabel}</div>
                </div>
            `;
        });

        const totalHours = days.reduce((sum, day) => {
            const dayKey = day.toLowerCase();
            return sum + (rota[employee.id]?.[dayKey]?.hours || 0);
        }, 0);
        const totalDisplay = totalHours ? `${Math.round(totalHours * 100) / 100}h` : '';
        employeeRow.innerHTML += `<div class="rota-cell rota-total-hours">${totalDisplay}</div>`;

        rotaGrid.appendChild(employeeRow);
    });

    document.querySelectorAll('.assignment-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleAssignmentChange);
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

function exportSchedule() {
    window.print();
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

    updateRotaAssignment(employeeId, day, assigned, 0);
    renderRotaGrid();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
