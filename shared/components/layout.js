import { useRouter } from "next/router";
import { Box, CssBaseline } from "@mui/material";
import * as React from 'react';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import PropTypes from 'prop-types';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip'
import FolderIcon from '@mui/icons-material/Folder';
import { ThemeSwitcher } from '@toolpad/core/DashboardLayout';
import SearchIcon from '@mui/icons-material/Search';
import CloudCircleIcon from '@mui/icons-material/CloudCircle';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import TimelineIcon from '@mui/icons-material/Timeline';
import ScienceIcon from '@mui/icons-material/Science';
import BusinessIcon from '@mui/icons-material/Business';
import SettingsIcon from '@mui/icons-material/Settings';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { AppProvider } from '@toolpad/core/AppProvider';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import {
  Account,
  AccountPreview,
  AccountPopoverFooter,
  SignOutButton,
} from '@toolpad/core/Account';
import { useAuth } from '../context/AuthContext'





const Layout = ({ children }) => {
  const router = useRouter();
  const { user, logout } = useAuth();

    // Configuración de autenticación
    const authentication = React.useMemo(() => {
      return {
        signIn: () => {
          // No necesitamos implementación aquí ya que el login se maneja en AuthContext
        },
        signOut: () => {
          logout();
        },
      };
    }, [logout]);

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


    // Navegación dinámica basada en roles
    const getDynamicNavigation = () => {
      const ALL_NAV_ITEMS = [
        {
          kind: 'header',
          title: 'Panel de administración',
          roles: ['GLOBAL', 'ADMIN', 'EMPRESA']
        },
        {
          segment: 'activesTree',
          title: 'Árbol de activos',
          icon: <DashboardIcon />,
          roles: ['GLOBAL', 'ADMIN', 'EMPRESA', 'OPERARIO']
        },
        {
          segment: 'pruebas',
          title: 'Pruebas',
          icon: <ScienceIcon />,
          roles: ['GLOBAL', 'ADMIN', 'LABORATORISTA']
        },
        {
          segment: 'muestras',
          title: 'Muestras',
          icon: <FolderIcon />,
          roles: ['GLOBAL', 'ADMIN', 'EMPRESA', 'LABORATORISTA', 'OPERARIO'],
          children: [
            {
              segment: 'cliente-muestra',
              title: 'Ingresar Muestra',
              icon: <DescriptionIcon />,
              roles: ['GLOBAL', 'ADMIN', 'EMPRESA', 'OPERARIO']
            },
            {
              segment: 'ingresar-muestra-lab',
              title: 'Ingreso al laboratorio',
              icon: <DescriptionIcon />,
              roles: ['GLOBAL', 'ADMIN', 'LABORATORISTA']
            },
            {
              segment: 'revision-muestras',
              title: 'Revisar Muestras',
              icon: <DescriptionIcon />,
              roles: ['GLOBAL', 'ADMIN', 'LABORATORISTA']
            },
           
          ]
        },
        {
          segment: 'dashboard',
          title: 'Dashboard',
          icon: <TimelineIcon />,
          roles: ['GLOBAL', 'ADMIN', 'EMPRESA']
        },
        {
          segment: 'documents-list',
          title: 'Documentos',
          icon: <FolderIcon />,
          roles: ['GLOBAL', 'ADMIN', 'EMPRESA']
        },
        {
          segment: 'administrationPanel/users-management',
          title: 'Gestión de usuarios',
          icon: <PersonIcon />,
          roles: ['GLOBAL', 'ADMIN']
        },
        {
          segment: 'administrationPanel/company-management',
          title: 'Gestión de empresas',
          icon: <BusinessIcon />,
          roles: ['GLOBAL']
        },
        {
          segment: 'administrationPanel/system-settings',
          title: 'Configuración del sistema',
          icon: <SettingsIcon />,
          roles: ['GLOBAL']
        }
      ];
  
      // Filtrar items basados en el rol del usuario
      return ALL_NAV_ITEMS.filter(item => {
        if (item.kind === 'header') return true;
        
        const hasPermission = item.roles.includes(user?.role);
        
        if (item.children) {
          const hasVisibleChildren = item.children.some(child => 
            child.roles.includes(user?.role)
          );
          return hasPermission && hasVisibleChildren;
        }
        
        return hasPermission;
      }).filter((item, index, array) => {
        if (item.kind === 'header') {
          const nextItem = array[index + 1];
          return nextItem && nextItem.kind !== 'header';
        }
        return true;
      });
    };
  
    const NAVIGATION = getDynamicNavigation();
  
  function AccountSidebarPreview(props) {
    const { handleClick, open, mini } = props;
    return (
      <Stack direction="column" p={0}>
        <Divider />
        <AccountPreview
          variant={mini ? 'condensed' : 'expanded'}
          handleClick={handleClick}
          open={open}
        />
      </Stack>
    );
  }
  
  AccountSidebarPreview.propTypes = {
    /**
     * The handler used when the preview is expanded
     */
    handleClick: PropTypes.func,
    mini: PropTypes.bool.isRequired,
    /**
     * The state of the Account popover
     * @default false
     */
    open: PropTypes.bool,
  };
  function ToolbarActionsSearch() {
    return (
      <Stack direction="row">
        <Tooltip title="Search" enterDelay={1000}>
          <div>
            <IconButton
              type="button"
              aria-label="search"
              sx={{
                display: { xs: 'inline', md: 'none' },
              }}
            >
              <SearchIcon />
            </IconButton>
          </div>
        </Tooltip>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          slotProps={{
            input: {
              endAdornment: (
                <IconButton type="button" aria-label="search" size="small">
                  <SearchIcon />
                </IconButton>
              ),
              sx: { pr: 0.5 },
            },
          }}
          sx={{ display: { xs: 'none', md: 'inline-block' }, mr: 1 }}
        />
        <ThemeSwitcher />
      </Stack>
    );
  }

  function SidebarFooterAccountPopover() {
    return (
      <Stack direction="column">
        <Typography variant="body2" mx={2} mt={1}>
          Cuenta
        </Typography>
        <MenuList>
          <MenuItem
            component="button"
            sx={{
              justifyContent: 'flex-start',
              width: '100%',
              columnGap: 2,
            }}
          >
            <ListItemIcon>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: '0.95rem',
                }}
                src={session?.user?.image ?? ''}
                alt={session?.user?.name ?? ''}
              >
                {session?.user?.name?.[0]}
              </Avatar>
            </ListItemIcon>
            <ListItemText
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                width: '100%',
              }}
              primary={session?.user?.name || user?.email}
              secondary={user?.role}
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        </MenuList>
        <Divider />
        <AccountPopoverFooter>
          <SignOutButton onClick={logout} />
        </AccountPopoverFooter>
      </Stack>
    );
  }
  
  const createPreviewComponent = (mini) => {
    function PreviewComponent(props) {
      return <AccountSidebarPreview {...props} mini={mini} />;
    }
    return PreviewComponent;
  };
  
  function SidebarFooterAccount({ mini }) {
    const PreviewComponent = React.useMemo(() => createPreviewComponent(mini), [mini]);
    return (
      <Account
        slots={{
          preview: PreviewComponent,
          popoverContent: SidebarFooterAccountPopover,
        }}
        slotProps={{
          popover: {
            transformOrigin: { horizontal: 'left', vertical: 'bottom' },
            anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
            disableAutoFocus: true,
            slotProps: {
              paper: {
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: (theme) =>
                    `drop-shadow(0px 2px 8px ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.32)'})`,
                  mt: 1,
                  '&::before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    bottom: 10,
                    left: 0,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translate(-50%, -50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              },
            },
          },
        }}
      />
    );
  }
  
  SidebarFooterAccount.propTypes = {
    mini: PropTypes.bool.isRequired,
  };
  function SidebarFooter({ mini }) {
    return (
      <Typography
        variant="caption"
        sx={{ m: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}
      >
        {mini ? '© MUI' : `© ${new Date().getFullYear()} Made with love by MUI`}
      </Typography>
    );
  }
  
  SidebarFooter.propTypes = {
    mini: PropTypes.bool.isRequired,
  };
  
  function CustomAppTitle() {
    return (
      <Stack direction="row" alignItems="center" spacing={2}>
        <CloudCircleIcon fontSize="large" color="primary" />
        <Typography variant="h6">My App</Typography>
        <Chip size="small" label="BETA" color="info" />
        <Tooltip title="Connected to production">
          <CheckCircleIcon color="success" fontSize="small" />
        </Tooltip>
      </Stack>
    );
  }
  // Configuración de sesión
  const [session, setSession] = React.useState({
    user: {
      name: user?.first_name || user?.email,
      email: user?.email,
      image: 'https://avatars.githubusercontent.com/u/19550456',
    }
  });

  // Actualizar sesión cuando el usuario cambia
  React.useEffect(() => {
    setSession({
      user: {
        name: user?.first_name || user?.email,
        email: user?.email,
        image: 'https://avatars.githubusercontent.com/u/19550456',
      }
    });
  }, [user]);
  return (
    <AppProvider
     navigation={NAVIGATION}
     authentication={authentication}
     session={session}
   
    >
    <DashboardLayout  defaultSidebarCollapsed
      slots={{
        appTitle: CustomAppTitle,
        toolbarActions: ToolbarActionsSearch,
        sidebarFooter: SidebarFooter,
        toolbarAccount: () => null, sidebarFooter: SidebarFooterAccount
      }}>
      <Box component="section" sx={{ p: 2, border: '1px dashed grey' }}>
          
          {children}
        </Box>

    </DashboardLayout>
    </AppProvider>
      
  );
};

export default Layout;
