import { useState,useEffect } from "react";
import { login } from "../../../services/auth";
import { useRouter } from "next/navigation"; // Importa `next/navigation` en lugar de `next/router`

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const router = useRouter();
    useEffect(() => {
        const token = localStorage.getItem("access_token");
        console.log("Token:", token);
        if (token) {
            router.replace("/dashboard"); // Si ya está autenticado, redirigir al dashboard
        }
    }, []);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null); // Limpiar error anterior

        try {
            await login(username, password);
            router.push("/dashboard");
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div>
            <h2>Login</h2>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit">Login</button>
            </form>
        </div>
    );
}
