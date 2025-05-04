import { useEffect } from "react";

import Router from "next/router";

export default function RegisterPage() {
  useEffect(() => {
    const { pathname } = Router;
    if (pathname === "/") {
      Router.push("/users/login");
    }
  });
  return <></>;
}
