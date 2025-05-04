import { useFormik } from "formik";
import * as Yup from "yup";
import clienteAxios from "../../../shared/config/axios";
import { useAuth}  from "../../../shared/context/AuthContext"; // Ajusta la ruta según tu estructura
import { toast } from "react-toastify";
import { useRouter } from 'next/navigation'; // ✅ Next.js usa useRouter
import { useState, useEffect } from "react";


const LoginForm = () => {
    const { login } = useAuth();
    const router = useRouter(); // ✅ Next.js usa useRouter

    
    useEffect(() => {
        const token = localStorage.getItem("access_token");
        console.log("Token:", token);
        if (token) {
            router.replace("/dashboard"); // Si ya está autenticado, redirigir al dashboard
        }
    }, []);
    const formik = useFormik({
        initialValues: initialValue(),
        validationSchema: Yup.object(validationSchema()),
        onSubmit: async (formValue) => {
            try {
                const response = await clienteAxios.post('/users/login/', formValue);
                const { access } = response.data;
                login(access); 

                if (response.status === 200) {
                    toast.success("Login exitoso");
                    router.push('/'); // ✅ Redirigir en Next.js con router.push
                } else {
                    toast.error("Error al iniciar sesión");
                    console.log("Login failed:", response.data);
                }
            } catch (error) {
                toast.error("Error en la solicitud: " );
            }
        },
    });

    return (
        <div className="login-form-container">
            <form className="login-form" onSubmit={formik.handleSubmit}>
                <h2>Iniciar Sesión</h2>
                <div className="form-group">
                    <label htmlFor="email">Correo Electrónico</label>
                    <input
                        type="email"
                        name="email"
                        id="email"
                        placeholder="Ingresa tu correo"
                        value={formik.values.email}
                        onChange={formik.handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Contraseña</label>
                    <input
                        type="password"
                        name="password"
                        id="password"
                        placeholder="Ingresa tu contraseña"
                        value={formik.values.password}
                        onChange={formik.handleChange}
                        required
                    />
                </div>
                <button type="submit" className="submit-button">Iniciar Sesión</button>
            </form>
        </div>
    );
};

function initialValue() {
    return { email: "", password: "" };
}

function validationSchema() {
    return {
        email: Yup.string().email("Formato de email inválido").required("Requerido"),
        password: Yup.string().required("Requerido"),
    };
}

export default LoginForm;
