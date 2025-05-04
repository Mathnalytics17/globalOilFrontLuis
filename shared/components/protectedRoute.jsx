// components/ProtectedRole.js
import { useRouter } from 'next/router';
import { useAuth } from '../../context/authContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { useEffect } from 'react';

const ProtectedRole = ({ children, requiredRoles, redirectPath = '/unauthorized' }) => {
  const { user, isLoading, hasRole } = useAuth();
  const router = useRouter();

  // Verificación de permisos (misma lógica que tenías)
  const checkAccess = () => {
    if (!user) return false;
    if (!requiredRoles) return true;
    
    const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return rolesArray.some(role => hasRole(role));
  };

  // Redirige si no cumple (ahora con useEffect para mejor manejo)
  useEffect(() => {
    if (!isLoading && !checkAccess()) {
      router.push(user ? redirectPath : '/areaPrivada/users/login');
    }
  }, [isLoading, user, requiredRoles]);

  if (isLoading) {
    return <LoadingSpinner />; // Igual que antes
  }

  if (!checkAccess()) {
    return null; // Evita renderizado innecesario
  }

  return children; // Exactamente igual que tu versión
};

export default ProtectedRole;