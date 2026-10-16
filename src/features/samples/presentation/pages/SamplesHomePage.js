import { useEffect } from 'react';
import { useRouter } from 'next/router';

const MuestrasIndexRedirect = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/muestras/lotes');
  }, [router]);

  return (
    <main className="go-page">
      <div className="go-shell">
        <div className="go-empty-state min-h-[240px]">
          <span className="go-spinner" aria-hidden="true" />
          <strong>Abriendo lotes de muestras</strong>
          <span>Redirigiendo al espacio operativo de muestras…</span>
        </div>
      </div>
    </main>
  );
};

export default MuestrasIndexRedirect;
