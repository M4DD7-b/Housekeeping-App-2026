// Housekeeping App - Interactive UI Logic

import { supabase } from './supabase.js';

// This file manages the user interface interactions, including rendering rooms, handling modals, and managing the rota.
import {
    getRoom,
    updateRoom,
    resetRoom,
    getRoomsByLocation,
    getStatusSummary,
    addEmployee,
    getEmployees,
    getRota,
    updateRotaAssignment,
    calculateShiftHours,
    removeEmployee,
    updateRotaShiftTimes
} from './data.js';

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
    await renderStairways();
    await renderStatusSummary();
    await showDashboardView();
    await setupEventListeners();
    await updateDashboardAreaButtons();

    supabase
    .channel('rooms-channel')
    .on(
        'postgres_changes',
        {
            event: '*',
            schema: 'public',
            table: 'rooms'
        },
        async () => {
            await renderStairways();
            await renderStatusSummary();
        }
    )
    .subscribe();
}

// Render all stairways with their rooms
async function renderStairways() {
    const roomsByLocation = await getRoomsByLocation(currentDashboardArea);
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
async function renderStatusSummary() {
    const summary = await getStatusSummary(currentDashboardArea);
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
async function setupEventListeners() {
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

    const legendToggle = document.querySelector('.legend-toggle');

    if (legendToggle) {
        legendToggle.addEventListener('click', () => {
            const legendWrapper = document.querySelector('.legendWrapper');
            const expanded = legendWrapper.classList.toggle('open');

            legendToggle.setAttribute(
                'aria-expanded',
                expanded ? 'true' : 'false'
            );
        });
    }

    const employeesToggle = document.getElementById('employeesToggle');

    if (employeesToggle) {

        employeesToggle.addEventListener('click', () => {

            const employeesSection =
                document.getElementById('employeesSection');

            employeesSection.classList.toggle('collapsed');
        });
    }

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

    resetRoomBtn.addEventListener('click', async () => {
        if (currentRoomId && confirm('Reset this room to checked status?')) {
            await resetRoom(currentRoomId);
            closeModal();
            await renderStairways();
            await renderStatusSummary();
        }
    });

    addEmployeeBtn.addEventListener('click', async () => {
        const employeeName = prompt('Enter employee name:');
        if (employeeName && employeeName.trim()) {
            await addEmployee(employeeName.trim());
            await renderEmployees();
            await renderRotaGrid();
        }
    });

    employeesList.addEventListener('click', (e) => {
        const nameButton = e.target.closest('.employee-name-btn');
        if (nameButton) {
            openRotaTimeModal(nameButton.dataset.employeeId);
        }
    });

    rotaGrid.addEventListener('click', async (e) => {
        const nameButton = e.target.closest('.employee-name-btn');
        if (nameButton) {
            await openRotaTimeModal(nameButton.dataset.employeeId);
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
async function openRoomModal(roomId) {
    const room = await getRoom(roomId);
    if (!room) return;

    currentRoomId = roomId;
    modalRoomTitle.textContent = `${room.name} Details`;
    roomStatus.value = room.status;
    roomNotes.value = room.notes || '';
    roomGuest.value = room.guest || 0;
    const guestCount = Number(roomGuest.value);
    roomBreakfast.checked = guestCount > 0 && (room.breakfast || false);
    roomBreakfast.disabled = guestCount <= 0;
    modalLastUpdated.textContent = formatDate(room.last_updated);
    roomModal.classList.add('active');
}

// Close room modal
function closeModal() {
    roomModal.classList.remove('active');
    currentRoomId = null;
}

// Save room changes
async function saveRoomChanges() {
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

    await updateRoom(currentRoomId, updates);
    closeModal();
    await renderStairways();
    await renderStatusSummary();
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
async function showDashboardView() {
    dashboardView.classList.remove('hidden');
    rotaView.classList.add('hidden');
    legendContainer.classList.remove('hidden');
    dashboardBtn.classList.add('active');
    rotaBtn.classList.remove('active');
    await updateDashboardAreaButtons();
}

async function switchDashboardArea(area) {
    if (currentDashboardArea === area) return;
    currentDashboardArea = area;
    await renderStairways();
    await renderStatusSummary();
    await updateDashboardAreaButtons();
}

async function updateDashboardAreaButtons() {
    mainAreaBtn.classList.toggle('active', currentDashboardArea === 'main');
    apartmentsAreaBtn.classList.toggle('active', currentDashboardArea === 'apartments');
}

// Show rota view
async function showRotaView() {
    dashboardView.classList.add('hidden');
    rotaView.classList.remove('hidden');
    legendContainer.classList.add('hidden');
    dashboardBtn.classList.remove('active');
    rotaBtn.classList.add('active');
    await renderEmployees();
    await renderRotaGrid();
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
async function renderEmployees() {
    const employees = await getEmployees();

    employeesList.innerHTML = '';

    employees.forEach(employee => {
        const employeeEl = document.createElement('div');
        employeeEl.className = 'employee-item';

        employeeEl.innerHTML = `
            <button type="button" class="employee-name-btn" data-employee-id="${employee.id}">
                ${escapeHtml(employee.name)}
            </button>
            <button type="button" class="remove-employee-btn" data-employee-id="${employee.id}" title="Remove Employee">✕</button>
        `;

        employeesList.appendChild(employeeEl);
    });

    document.querySelectorAll('.remove-employee-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const employeeId = Number(e.target.dataset.employeeId);
            if (confirm('Are you sure you want to remove this employee?')) {
                await removeEmployee(employeeId);
                await renderEmployees();
                await renderRotaGrid();
            }
        });
    });
}

async function renderRotaGrid() {
    const employees = await getEmployees();
    const rota = await getRota();
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
            const assignment = rota.find(r =>
                r.employee_id === employee.id &&
                r.day === dayKey
            ) || { assigned: false, hours: 0, start_time: '', end_time: '' };

            const timeLabel = assignment.assigned && assignment.start_time && assignment.end_time
    ? `${assignment.start_time}–${assignment.end_time}`
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
            const assignment = rota.find(r =>
                r.employee_id === employee.id &&
                r.day === dayKey
            );
            return sum + (assignment?.hours || 0);
        }, 0);
        const totalDisplay = totalHours ? `${Math.round(totalHours * 100) / 100}h` : '';
        employeeRow.innerHTML += `<div class="rota-cell rota-total-hours">${totalDisplay}</div>`;

        rotaGrid.appendChild(employeeRow);
    });

    document.querySelectorAll('.assignment-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleAssignmentChange);
    });
}

async function handleRotaTimeBodyChange(e) {
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

async function openRotaTimeModal(employeeId) {
    const employees = await getEmployees();
    const employee = employees.find(emp => emp.id === Number(employeeId));
    
    if (!employee) return;

    currentTimeModalEmployeeId = employeeId;
    rotaEmployeeTitle.textContent = `Edit Schedule for ${employee.name}`;

    const rota = await getRota();
    
    rotaTimeBody.innerHTML = '';

    daysOfWeek.forEach(day => {
        const dayKey = day.toLowerCase();

        const assignment = rota.find(r =>
            r.employee_id === employee.id &&
            r.day === dayKey
        );

        const row = document.createElement('div');

        row.className = 'time-row';

        row.innerHTML = `
            <div class="time-row-header">${day}</div>

            <label class="time-assigned-checkbox">
                <input type="checkbox" class="time-assigned-checkbox" data-day="${dayKey}" ${assignment?.assigned ? 'checked' : ''}>
                <span>Assigned</span>
            </label>

            <div class="time-inputs">
                <input
                    type="time"
                    class="time-input start-time"
                    value="${assignment?.start_time || ''}"
                    ${!assignment?.assigned ? 'disabled' : ''}
                >
                <span class="time-separator">to</span>
                <input
                    type="time"
                    class="time-input end-time"
                    value="${assignment?.end_time || ''}"
                    ${!assignment?.assigned ? 'disabled' : ''}
                >
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

async function saveRotaTimeSettings() {
    if (!currentTimeModalEmployeeId) return;

    const updates = [];

    rotaTimeBody.querySelectorAll('.time-row').forEach(row => {
        const day = row.querySelector('.time-assigned-checkbox').dataset.day;

        const assigned =
            row.querySelector('.time-assigned-checkbox').checked;

        const startTime = row.querySelector('.start-time').value;
        const endTime = row.querySelector('.end-time').value;

        updates.push(
            updateRotaShiftTimes(
                currentTimeModalEmployeeId,
                day,
                startTime,
                endTime
            )
        );
    });

    await Promise.all(updates);

    closeRotaTimeModal();

    await renderRotaGrid();
}

async function handleAssignmentChange(e) {
    const cell = e.target.closest('.rota-assignment');

    const employeeId = Number(cell.dataset.employeeId);
    const day = cell.dataset.day;
    const assigned = e.target.checked;

    await updateRotaAssignment(
        employeeId,
        day,
        assigned,
        0
    );

    await renderRotaGrid();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
