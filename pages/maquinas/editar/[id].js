import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Compatibility route for existing links and bookmarks from the former Spanish URL.
export default function LegacyMachineEditRedirect() {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) router.replace(`/machines/edit-machine?id=${id}`);
  }, [id, router]);

  return null;
}
