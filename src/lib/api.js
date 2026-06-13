// Central place for all calls to the Forge backend.
// Change BASE_URL in one spot if the backend moves.

const BASE_URL = "http://localhost:5000";

// Generic fetch wrapper with error handling
async function request(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text}`);
    }

    return res.json();
}

// --- Incidents ---
export async function createIncident(title, description) {
    return request("/incidents", {
        method: "POST",
        body: JSON.stringify({ title, description })
    });
}

// --- Reports ---
export async function getReport(incidentId) {
    return request(`/reports/${incidentId}`);
}

export async function rescoreReport(reportId) {
    return request(`/reports/${reportId}/score`, { method: "POST" });
}

// --- Graph ---
export async function getGraph() {
    return request("/graph");
}

// The WebSocket URL builder for live updates
export function getWebSocketUrl(incidentId) {
    return `ws://localhost:5000/ws/incidents/${incidentId}`;
}
export async function listIncidents() {
    return request("/incidents");
}
export async function uploadEvidence(incidentId, files) {
    const formData = new FormData();
    for (const file of files) {
        formData.append("files", file);
    }
    const res = await fetch(`${BASE_URL}/incidents/${incidentId}/files`, {
        method: "POST",
        body: formData,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload ${res.status}: ${text}`);
    }
    return res.json();
}