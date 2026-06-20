// Central place for all calls to the Forge backend.
// Change BASE_URL in one spot if the backend moves.

const BASE_URL = "http://localhost:5000";

// Generic fetch wrapper with error handling.
// credentials:"include" makes the httpOnly auth cookie travel with every request.
async function request(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        ...options
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text}`);
    }

    return res.json();
}

// --- Auth ---
export async function signup(email, password) {
    return request("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });
}

export async function login(email, password) {
    return request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });
}

export async function logout() {
    return request("/auth/logout", { method: "POST" });
}

export async function getMe() {
    return request("/auth/me");
}

// --- Incidents ---
export async function createIncident(title, description) {
    return request("/incidents", {
        method: "POST",
        body: JSON.stringify({ title, description })
    });
}

export async function listIncidents() {
    return request("/incidents");
}

export async function uploadEvidence(incidentId, files) {
    const formData = new FormData();
    for (const file of files) {
        formData.append("files", file);
    }
    // NOTE: no Content-Type header (browser sets multipart boundary),
    // but we still need credentials so the cookie travels.
    const res = await fetch(`${BASE_URL}/incidents/${incidentId}/files`, {
        method: "POST",
        credentials: "include",
        body: formData,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload ${res.status}: ${text}`);
    }
    return res.json();
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
export async function forgotPassword(email) {
    return request("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email })
    });
}

export async function resetPassword(token, password) {
    return request("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password })
    });
}