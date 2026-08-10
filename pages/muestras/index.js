import { useEffect } from 'react';
import { useRouter } from 'next/router';

const MuestrasIndexRedirect = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/muestras/lotes');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#292929] text-white p-10">
      Redirigiendo a lotes de muestras...
    </div>
  );
};

export default MuestrasIndexRedirect;
