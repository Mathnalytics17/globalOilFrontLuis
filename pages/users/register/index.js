import React, { useState, useEffect } from "react";
import axios from "axios";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    empresa: "",
    rol: "",
  });

  const [empresas, setEmpresas] = useState([]);
  const [roles, setRoles] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/companies/")
      .then((res) => setEmpresas(res.data))
      .catch((err) => console.error(err));

    axios.get("http://127.0.0.1:8000/api/roles/")
      .then((res) => setRoles(res.data))
      .catch((err) => console.error(err));
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://127.0.0.1:8000/api/users/register/", formData);
      setMessage("Registro exitoso. Inicie sesión");
    } catch (error) {
      setMessage("Error en el registro");
    }
  };

  return (
    <div>
      <h2>Registro</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleSubmit}>
        <input type="text" name="username" placeholder="Usuario" onChange={handleChange} required />
        <input type="email" name="email" placeholder="Correo" onChange={handleChange} required />
        <input type="password" name="password" placeholder="Contraseña" onChange={handleChange} required />

        <select name="empresa" onChange={handleChange} required>
          <option value="">Seleccione una Empresa</option>
          {empresas.map((emp) => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
        </select>

        <select name="rol" onChange={handleChange} required>
          <option value="">Seleccione un Rol</option>
          {roles.map((rol) => <option key={rol.id} value={rol.id}>{rol.nombre}</option>)}
        </select>

        <button type="submit">Registrarse</button>
      </form>
    </div>
  );
};

export default Register;
