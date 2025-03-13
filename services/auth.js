export async function login(username, password) {
    try {
        const response = await fetch("http://localhost:8000/api/token/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Error al iniciar sesión");
        }

        const data = await response.json();
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);
        window.dispatchEvent(new Event("storage")); // Forzar actualización

    } catch (error) {
        console.error("Login error:", error.message);
        throw error;
    }
}

export async function refreshToken() {
    try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("No refresh token available");

        const response = await fetch("http://localhost:8000/api/token/refresh/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: refreshToken }),
        });

        if (!response.ok) {
            throw new Error("Refresh token inválido");
        }

        const data = await response.json();
        localStorage.setItem("access_token", data.access);
        window.dispatchEvent(new Event("storage")); // Forzar actualización
        return data.access;

    } catch (error) {
        console.error("Error al refrescar token:", error.message);
        logout();
        return null;
    }
}

export function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.dispatchEvent(new Event("storage")); // Notificar a los componentes
}
