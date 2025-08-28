const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const { generateOTP, verifyOTP } = require('../utils/otp');

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Register User
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user (you can generate a username automatically or omit it if not needed)
    const user = new User({
      email,
      password,
      firstName: firstName,
      lastName: lastName,
      emailVerificationToken,
      emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    await user.save();

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email/${emailVerificationToken}`;
    
    try {
      await sendEmail({
        to: email,
        subject: 'Verify Your Email - ChatApp',
        html: `
          <h2>Welcome to ChatApp!</h2>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
        `
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Continue with registration even if email fails
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully. Please check your email for verification.',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password, otpCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if OTP is enabled
    if (user.isOtpEnabled) {
      if (!otpCode) {
        return res.status(200).json({ 
          requiresOTP: true,
          message: 'OTP verification required'
        });
      }

      // Verify OTP
      const isOtpValid = speakeasy.totp.verify({
        secret: user.otpSecret,
        encoding: 'base32',
        token: otpCode,
        window: 2
      });

      if (!isOtpValid) {
        return res.status(401).json({ error: 'Invalid OTP code' });
      }
    }

    // Update user status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
        isOtpEnabled: user.isOtpEnabled,
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout User
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Update user status
    await User.findByIdAndUpdate(req.user._id, 
      {
        isOnline: false,
        lastSeen: new Date()
      }, 
      { new: true }
    );

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify Email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password/${resetToken}`;
    
    try {
      await sendEmail({
        to: email,
        subject: 'Password Reset - ChatApp',
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      });

      res.json({ message: 'Password reset email sent' });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      res.status(500).json({ error: 'Failed to send reset email' });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Setup OTP
router.post('/setup-otp', authenticateToken, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `ChatApp (${req.user.email})`,
      issuer: 'ChatApp'
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Temporarily store secret (don't save to DB until verified)
    req.user.otpSecret = secret.base32;
    await req.user.save();

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    });
  } catch (error) {
    console.error('OTP setup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify and Enable OTP
router.post('/verify-otp', authenticateToken, async (req, res) => {
  try {
    const { otpCode } = req.body;

    if (!otpCode) {
      return res.status(400).json({ error: 'OTP code is required' });
    }

    if (!req.user.otpSecret) {
      return res.status(400).json({ error: 'OTP not set up. Please set up OTP first.' });
    }

    const isValid = speakeasy.totp.verify({
      secret: req.user.otpSecret,
      encoding: 'base32',
      token: otpCode,
      window: 2
    });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    req.user.isOtpEnabled = true;
    await req.user.save();

    res.json({ message: 'OTP enabled successfully' });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disable OTP
router.post('/disable-otp', authenticateToken, async (req, res) => {
  try {
    const { password, otpCode } = req.body;

    if (!password || !otpCode) {
      return res.status(400).json({ error: 'Password and OTP code are required' });
    }

    // Verify password
    const user = await User.findById(req.user._id).select('+password');
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Verify OTP
    const isOtpValid = speakeasy.totp.verify({
      secret: user.otpSecret,
      encoding: 'base32',
      token: otpCode,
      window: 2
    });

    if (!isOtpValid) {
      return res.status(401).json({ error: 'Invalid OTP code' });
    }

    user.isOtpEnabled = false;
    user.otpSecret = undefined;
    await user.save();

    res.json({ message: 'OTP disabled successfully' });
  } catch (error) {
    console.error('OTP disable error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Current User
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        isEmailVerified: req.user.isEmailVerified,
        isOtpEnabled: req.user.isOtpEnabled,
        avatar: req.user.avatar,
        lastSeen: req.user.lastSeen,
        isOnline: req.user.isOnline
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;