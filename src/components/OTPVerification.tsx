// src/components/OTPVerification.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiVerifyOTP } from '../api/client'; // replace with your actual API call
import { useAuth } from '../context/authContext';

interface OTPVerificationProps {
  userEmail: string;
  phoneNumber: string;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({ userEmail, phoneNumber }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser, setToken } = useAuth();
  const navigate = useNavigate();

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      // Call your backend to verify OTP
      const response = await apiVerifyOTP({ email: userEmail, otp });

      if (response.success && response.user) {
        // Store user and token in auth context and localStorage
        setUser(response.user);
        setToken(response.token); // assuming your backend returns a JWT token
        localStorage.setItem('wm_user', JSON.stringify(response.user));
        localStorage.setItem('wm_token', response.token);

        // Redirect based on role
        if (response.user.role === 'admin' || response.user.role === 'staff') {
          navigate('/dashboard');
        } else if (response.user.role === 'customer') {
          navigate('/customer-dashboard');
        }
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-container">
      <h2>Enter Verification Code</h2>
      <p>Code sent to {phoneNumber}</p>
      <input
        type="text"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter OTP"
        maxLength={6}
        className="otp-input"
      />
      {error && <p className="text-red-500">{error}</p>}
      <button
        onClick={handleVerify}
        disabled={loading || otp.length !== 6}
        className="btn-primary mt-4"
      >
        {loading ? 'Verifying...' : 'Verify & Continue'}
      </button>
    </div>
  );
};

export default OTPVerification;
