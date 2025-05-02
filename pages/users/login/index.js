import { useState,useEffect } from "react";
import { login } from "../../../services/auth";
import { useRouter } from "next/navigation"; // Importa `next/navigation` en lugar de `next/router`
import * as React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { ST } from "next/dist/shared/lib/utils";
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import SettingsSuggestRoundedIcon from '@mui/icons-material/SettingsSuggestRounded';
import ThumbUpAltRoundedIcon from '@mui/icons-material/ThumbUpAltRounded';
import MuiCard from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import { useAuth } from '../../../shared/context/AuthContext';



const Card = styled(MuiCard)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'center',
    width: '100%',
    padding: theme.spacing(4),
    gap: theme.spacing(2),
    boxShadow:
      'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
    [theme.breakpoints.up('sm')]: {
      width: '450px',
    },
    ...theme.applyStyles('dark', {
      boxShadow:
        'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
    }),
  }));


export default function LoginPage() {

    const [emailError, setEmailError] = React.useState(false);
    const [emailErrorMessage, setEmailErrorMessage] = React.useState('');
    const [passwordError, setPasswordError] = React.useState(false);
    const [passwordErrorMessage, setPasswordErrorMessage] = React.useState('');
    const [open, setOpen] = React.useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const router = useRouter();
   
    const { login } = useAuth();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
      email: '',
      password: '',
    });
    const [fieldErrors, setFieldErrors] = useState({
      email: '',
      password: '',
    });
  
    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Validación en tiempo real
      if (name === 'email') {
        setFieldErrors(prev => ({ 
          ...prev, 
          email: !value.includes('@') ? 'Email debe contener @' : '' 
        }));
      }
      if (name === 'password') {
        setFieldErrors(prev => ({ 
          ...prev, 
          password: value.length < 6 ? 'Mínimo 6 caracteres' : '' 
        }));
      }
    };
  
    const validateForm = () => {
      const errors = {};
      let isValid = true;
  
      if (!formData.email.includes('@')) {
        errors.email = 'Email inválido';
        isValid = false;
      }
  
      if (formData.password.length < 6) {
        errors.password = 'La contraseña debe tener al menos 6 caracteres';
        isValid = false;
      }
  
      setFieldErrors(errors);
      return isValid;
    };
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      
      if (!validateForm()) return;
  
      setIsSubmitting(true);
      setError('');
      
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        console.log('siuh')
      } else {
        setError(result.error || 'Error al iniciar sesión');
      }
      
      setIsSubmitting(false);
    };
  console.log(error)

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        console.log("Token:", token);
        if (token) {
            router.replace("/dashboard"); // Si ya está autenticado, redirigir al dashboard
        }
    }, []);
    
    const items = [
        {
          icon: <SettingsSuggestRoundedIcon sx={{ color: 'text.secondary' }} />,
          title: 'Adaptable performance',
          description:
            'Our product effortlessly adjusts to your needs, boosting efficiency and simplifying your tasks.',
        },
        {
          icon: <ConstructionRoundedIcon sx={{ color: 'text.secondary' }} />,
          title: 'Built to last',
          description:
            'Experience unmatched durability that goes above and beyond with lasting investment.',
        },
        {
          icon: <ThumbUpAltRoundedIcon sx={{ color: 'text.secondary' }} />,
          title: 'Great user experience',
          description:
            'Integrate our product into your routine with an intuitive and easy-to-use interface.',
        },
        {
          icon: <AutoFixHighRoundedIcon sx={{ color: 'text.secondary' }} />,
          title: 'Innovative functionality',
          description:
            'Stay ahead with features that set new standards, addressing your evolving needs better than the rest.',
        },
      ];


      const handleClickOpen = () => {
        setOpen(true);
      };
    
      const handleClose = () => {
        setOpen(false);
      };
    
      const validateInputs = () => {
        const email = document.getElementById('email');
        const password = document.getElementById('password');
    
        let isValid = true;
    
        if (!email.value || !/\S+@\S+\.\S+/.test(email.value)) {
          setEmailError(true);
          setEmailErrorMessage('Please enter a valid email address.');
          isValid = false;
        } else {
          setEmailError(false);
          setEmailErrorMessage('');
        }
    
        if (!password.value || password.value.length < 6) {
          setPasswordError(true);
          setPasswordErrorMessage('Password must be at least 6 characters long.');
          isValid = false;
        } else {
          setPasswordError(false);
          setPasswordErrorMessage('');
        }
    
        return isValid;
      };
    


    
    return (
        <Stack    
        direction="column"
        component="main"
        sx={[
          {
            justifyContent: 'center',
            height: 'calc((1 - var(--template-frame-height, 0)) * 100%)',
            marginTop: 'max(40px - var(--template-frame-height, 0px), 0px)',
            minHeight: '100%',
          },
          (theme) => ({
            '&::before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              zIndex: -1,
              inset: 0,
              backgroundImage:
                'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
              backgroundRepeat: 'no-repeat',
              ...theme.applyStyles('dark', {
                backgroundImage:
                  'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
              }),
            },
          }),
        ]}>

            <Stack   
                direction={{ xs: 'column-reverse', md: 'row' }}
                sx={{
                    justifyContent: 'center',
                    gap: { xs: 6, sm: 12 },
                    p: 2,
                    mx: 'auto',
                }}>

                <Stack  direction={{ xs: 'column-reverse', md: 'row' }}
                    sx={{
                    justifyContent: 'center',
                    gap: { xs: 6, sm: 12 },
                    p: { xs: 2, sm: 4 },
                    m: 'auto',
                    }}>

<Stack
      sx={{ flexDirection: 'column', alignSelf: 'center', gap: 4, maxWidth: 450 }}
    >
      <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
       
      </Box>
      {items.map((item, index) => (
        <Stack key={index} direction="row" sx={{ gap: 2 }}>
          {item.icon}
          <div>
            <Typography gutterBottom sx={{ fontWeight: 'medium' }}>
              {item.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {item.description}
            </Typography>
          </div>
        </Stack>
      ))}
    </Stack>
    <Card variant="outlined">
      <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
        
      </Box>
      <Typography
        component="h1"
        variant="h4"
        sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}
      >
        Sign in
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}
      >
        <FormControl>
          <FormLabel htmlFor="email">Email</FormLabel>
          <TextField
            error={emailError}
            helperText={emailErrorMessage}
            id="email"
            type="email"
            name="email"
            onChange={handleChange}
            value={formData.email}
            placeholder="your@email.com"
            autoComplete="email"
            autoFocus
            required
            fullWidth
            variant="outlined"
            color={emailError ? 'error' : 'primary'}
          />
        </FormControl>
        <FormControl>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <FormLabel htmlFor="password">Password</FormLabel>
            <Link
              component="button"
              type="button"
              onClick={handleClickOpen}
              variant="body2"
              sx={{ alignSelf: 'baseline' }}
            >
              Forgot your password?
            </Link>
          </Box>
          <TextField
            error={passwordError}
            helperText={passwordErrorMessage}
            name="password"
            placeholder="••••••"
            type="password"
            id="password"
            onChange={handleChange}
            value={formData.password}
            autoComplete="current-password"
            autoFocus
            required
            fullWidth
            variant="outlined"
            color={passwordError ? 'error' : 'primary'}
          />
        </FormControl>
        <FormControlLabel
          control={<Checkbox value="remember" color="primary" />}
          label="Remember me"
        />
       
       <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>
        <Typography sx={{ textAlign: 'center' }}>
          Don&apos;t have an account?{' '}
          <span>
            <Link
              href="/users/create-user"
              variant="body2"
              sx={{ alignSelf: 'center' }}
            >
              Sign up
            </Link>
          </span>
        </Typography>
      </Box>
      <Divider>or</Divider>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => alert('Sign in with Google')}
     
        >
          Sign in with Google
        </Button>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => alert('Sign in with Facebook')}
          
        >
          Sign in with Facebook
        </Button>
      </Box>
    </Card>

                    </Stack>
                  
            </Stack>
                        
        </Stack>
        
    );
}
