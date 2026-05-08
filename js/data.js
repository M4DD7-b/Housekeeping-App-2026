import { supabase } from './supabase.js';

/* =========================
   ROOMS
========================= */

export async function loadRooms() {
    const { data, error } = await supabase
        .from('rooms')
        .select(`
            *,
            stairways (
                id,
                name,
                area
            )
        `)
        .order('stairway_id')
        .order('floor', { ascending: false })
        .order('name');

    if (error) {
        console.error('Error loading rooms:', error);
        return [];
    }

    return data || [];
}

export async function getRooms(filters = {}) {
    let query = supabase
        .from('rooms')
        .select(`
            *,
            stairways (
                id,
                name,
                area
            )
        `);

    if (filters.stairway_id) {
        query = query.eq('stairway_id', filters.stairway_id);
    }

    if (filters.floor) {
        query = query.eq('floor', filters.floor);
    }

    if (filters.status) {
        query = query.eq('status', filters.status);
    }

    const { data, error } = await query
        .order('stairway_id')
        .order('floor', { ascending: false })
        .order('name');

    if (error) {
        console.error('Error loading filtered rooms:', error);
        return [];
    }

    return data || [];
}

export async function getRoom(roomId) {
    const { data, error } = await supabase
        .from('rooms')
        .select(`
            *,
            stairways (
                id,
                name,
                area
            )
        `)
        .eq('id', roomId)
        .single();

    if (error) {
        console.error('Error loading room:', error);
        return null;
    }

    return data;
}

export async function updateRoom(roomId, updates) {
    const { data, error } = await supabase
        .from('rooms')
        .update({
            ...updates,
            last_updated: new Date().toISOString()
        })
        .eq('id', roomId)
        .select()
        .single();

    if (error) {
        console.error('Error updating room:', error);
        return null;
    }

    return data;
}

export async function resetRoom(roomId) {
    return await updateRoom(roomId, {
        status: 'checked',
        notes: '',
        guest: 0,
        breakfast: false
    });
}

export async function getStatusSummary(area = 'main') {
    const { data, error } = await supabase
        .from('rooms')
        .select(`
            status,
            stairways!inner (
                area
            )
        `)
        .eq('stairways.area', area);

    if (error) {
        console.error('Error loading status summary:', error);
        return {};
    }

    const summary = {
        done: 0,
        service: 0,
        checked: 0,
        maintenance: 0,
        checkout: 0,
        occupied: 0
    };

    data.forEach(room => {
        summary[room.status] = (summary[room.status] || 0) + 1;
    });

    return summary;
}

export async function getRoomsByLocation(area = 'main') {
    const { data, error } = await supabase
        .from('rooms')
        .select(`
            *,
            stairways!inner (
                id,
                name,
                area
            )
        `)
        .eq('stairways.area', area)
        .order('stairway_id')
        .order('floor', { ascending: false })
        .order('name');

    if (error) {
        console.error('Error loading grouped rooms:', error);
        return {};
    }

    const grouped = {};

    data.forEach(room => {
        const stairway = room.stairways;

        if (!grouped[stairway.id]) {
            grouped[stairway.id] = {
                name: stairway.name,
                floors: {}
            };
        }

        if (!grouped[stairway.id].floors[room.floor]) {
            grouped[stairway.id].floors[room.floor] = [];
        }

        grouped[stairway.id].floors[room.floor].push(room);
    });

    return grouped;
}

export async function resetAllRooms() {
    const { error } = await supabase
        .from('rooms')
        .update({
            status: 'checked',
            notes: '',
            guest: 0,
            breakfast: false,
            last_updated: new Date().toISOString()
        })
        .neq('id', '');

    if (error) {
        console.error('Error resetting all rooms:', error);
    }
}

/* =========================
   EMPLOYEES
========================= */

export async function getEmployees() {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('id');

    if (error) {
        console.error('Error loading employees:', error);
        return [];
    }

    return data || [];
}

export async function addEmployee(name) {
    const cleanName = name.trim();

    const { data: existing } = await supabase
        .from('employees')
        .select('id')
        .ilike('name', cleanName)
        .maybeSingle();

    if (existing) {
        alert('Employee already exists');
        return null;
    }

    const { data, error } = await supabase
        .from('employees')
        .insert({
            name: cleanName
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding employee:', error);
        return null;
    }

    return data;
}

export async function removeEmployee(employeeId) {
    const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

    if (error) {
        console.error('Error removing employee:', error);
    }
}

/* =========================
   ROTA
========================= */

export function calculateShiftHours(start_time, end_time) {
    if (!start_time || !end_time) {
        return 0;
    }

    const [startHours, startMinutes] = start_time
        .split(':')
        .map(Number);

    const [endHours, endMinutes] = end_time
        .split(':')
        .map(Number);

    const start = startHours + startMinutes / 60;
    const end = endHours + endMinutes / 60;

    const diff = end - start;

    return diff > 0
        ? Math.round(diff * 100) / 100
        : 0;
}

export async function updateRotaAssignment(
    employeeId,
    day,
    assigned
) {
    const existing = await getRotaDay(employeeId, day);

    const { error } = await supabase
        .from('rota')
        .upsert({
            employee_id: employeeId,
            day,
            assigned,
            start_time: assigned
                ? existing?.start_time || null
                : null,
            end_time: assigned
                ? existing?.end_time || null
                : null,
            hours: assigned
                ? existing?.hours || 0
                : 0,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'employee_id,day'
        });

    if (error) {
        console.error('Error updating rota assignment:', error);
    }
}

export async function updateRotaShiftTimes(
    employeeId,
    day,
    start_time,
    end_time
) {
    const assigned = Boolean(start_time && end_time);

    const hours = calculateShiftHours(
        start_time,
        end_time
    );

    const { error } = await supabase
        .from('rota')
        .upsert({
            employee_id: employeeId,
            day,
            assigned,
            start_time: start_time || null,
            end_time: end_time || null,
            hours,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'employee_id,day'
        });

    if (error) {
        console.error('Error updating rota shift times:', error);
    }
}

export async function getRotaDay(employeeId, day) {
    const { data, error } = await supabase
        .from('rota')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('day', day)
        .maybeSingle();

    if (error) {
        console.error('Error loading rota day:', error);
        return null;
    }

    return data;
}

export async function getRota() {
    const { data, error } = await supabase
        .from('rota')
        .select('*');

    if (error) {
        console.error('Error loading rota:', error);
        return [];
    }

    return data || [];
}
