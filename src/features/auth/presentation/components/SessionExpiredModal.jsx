// components/SessionExpiredModal.jsx

export default function SessionExpiredModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          textAlign: 'center',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        }}
      >
        <h2 style={{ color: '#e53e3e', marginBottom: '1rem' }}>
          Sesión expirada
        </h2>

        <p style={{ marginBottom: '1.5rem', color: '#4a5568' }}>
          Tu sesión ha expirado. Inicia sesión nuevamente para continuar.
        </p>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: '#e53e3e',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
          }}
        >
          Ir al login
        </button>
      </div>
    </div>
  );
}