import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdministrationPanelRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/administrationPanel/users-management'); }, [router]);
  return <div className="go-page grid min-h-[60vh] place-items-center text-sm text-[#858b94]">Abriendo administración…</div>;
}
