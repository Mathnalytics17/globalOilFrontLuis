import { useEffect } from 'react';
import Router from 'next/router';

export default function HomeRedirect() {
  useEffect(() => {
    Router.replace('/activesTree');
  }, []);
  return null;
}
