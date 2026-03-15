'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
    } else {
      const user = JSON.parse(storedUser);
      if (user.profile === 'ADM') {
        router.push('/adm');
      } else if (user.profile === 'Aluno') {
        router.push('/aluno');
      } else {
        router.push('/login');
      }
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Redirecionando...</p>
    </div>
  );
}
