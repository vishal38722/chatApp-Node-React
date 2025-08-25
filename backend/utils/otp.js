const crypto = require('crypto');

// Generate random OTP
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  
  return otp;
};

// Generate secure OTP using crypto
const generateSecureOTP = (length = 6) => {
  const buffer = crypto.randomBytes(length);
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += (buffer[i] % 10).toString();
  }
  
  return otp;
};

// Verify OTP (for email-based OTP)
const verifyOTP = (providedOTP, storedOTP, expirationTime) => {
  if (!providedOTP || !storedOTP) {
    return false;
  }
  
  // Check if OTP has expired
  if (Date.now() > expirationTime) {
    return false;
  }
  
  // Compare OTPs
  return providedOTP === storedOTP;
};

// Generate OTP with expiration
const generateOTPWithExpiration = (length = 6, expirationMinutes = 5) => {
  const otp = generateSecureOTP(length);
  const expirationTime = Date.now() + (expirationMinutes * 60 * 1000);
  
  return {
    otp,
    expirationTime
  };
};

module.exports = {
  generateOTP,
  generateSecureOTP,
  verifyOTP,
  generateOTPWithExpiration
};