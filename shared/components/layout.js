import { useRouter } from "next/router";
import { Box, CssBaseline } from "@mui/material";
import Header from "./headerGlobal";
import Sidebar from "./sideBar";
import Footer from "./footer";

const Layout = ({ children }) => {
  const router = useRouter();

  const isFullWidthPage = [
    "/operations/manage",
    "/operations/manage2",
    "/customers",
    "/customers/account",
    "/brokers",
    "/administration/deposit-emitter",
    "/administration/deposit-investor",
    "/administration/refund",
    "/riskProfile",
    "/administration/new-receipt",
  ].includes(router.pathname);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <CssBaseline />

      {/* Header fijo con z-index alto */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 1100, // Asegura que siempre esté encima
          backgroundColor: "#ffffff",
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Header />
      </Box>

      {/* Contenedor Principal */}
      <Box sx={{ display: "flex", flex: 1, marginTop: "70px" }}> {/* Margen para evitar solapamiento */}
        {!isFullWidthPage && (
          <Box sx={{ width: "240px", flexShrink: 0 }}>
            <Sidebar />
          </Box>
        )}

        {/* Contenido principal */}
        <Box
          component="main"
          sx={{
            flex: 1,
            p: 3,
            backgroundColor: "#f5f5f5",
            minHeight: "calc(100vh - 64px)",
            overflowX: "hidden", // Evita scroll horizontal
            position: "relative", // Asegura que las gráficas no se salgan de su espacio
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default Layout;
