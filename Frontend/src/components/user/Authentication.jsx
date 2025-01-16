import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Typography
} from '@mui/material';
import api from '../../api';
const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/users/login/', formData);
      const { tokens, user } = response.data;
      
      localStorage.setItem(ACCESS_TOKEN, tokens.access);
      localStorage.setItem(REFRESH_TOKEN, tokens.refresh);
      
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.error || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'grey.100'
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardHeader
          title="Login"
          subheader="Enter your credentials to access your account"
        />
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <TextField
                fullWidth
                id="email"
                name="email"
                label="Email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                id="password"
                name="password"
                label="Password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </Box>
          </form>
        </CardContent>
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Button
              variant="text"
              onClick={() => navigate('/register')}
              sx={{ textTransform: 'none' }}
            >
              Register
            </Button>
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [userId, setUserId] = useState(null);
  const [otp, setOtp] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/user/register/', formData);
      setUserId(response.data.user_id);
      setVerificationStep(true);
    } catch (error) {
      setError(error.response?.data?.error || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/user/verify-email/', {
        user_id: userId,
        otp: otp
      });
      
      const { tokens } = response.data;
      
      localStorage.setItem(ACCESS_TOKEN, tokens.access);
      localStorage.setItem(REFRESH_TOKEN, tokens.refresh);
      
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  if (verificationStep) {
    return (
      <Box 
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: 'grey.100'
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 400 }}>
          <CardHeader
            title="Verify Your Email"
            subheader="Enter the verification code sent to your email"
          />
          <CardContent>
            <form onSubmit={handleVerification}>
              <Box sx={{ mb: 3 }}>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  id="otp"
                  label="Verification Code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  sx={{ mb: 2 }}
                />
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Verify Email'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box 
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'grey.100'
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardHeader
          title="Register"
          subheader="Create a new account"
        />
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <TextField
                fullWidth
                id="first_name"
                name="first_name"
                label="First Name"
                required
                value={formData.first_name}
                onChange={handleChange}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                id="last_name"
                name="last_name"
                label="Last Name"
                required
                value={formData.last_name}
                onChange={handleChange}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                id="email"
                name="email"
                label="Email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                id="password"
                name="password"
                label="Password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                sx={{ mb: 2 }}
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
              >
                {loading ? 'Registering...' : 'Register'}
              </Button>
            </Box>
          </form>
        </CardContent>
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Button
              variant="text"
              onClick={() => navigate('/login')}
              sx={{ textTransform: 'none' }}
            >
              Login
            </Button>
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export { Login, Register };