const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // Mask password in payload logging
    const logPayload = { ...req.body };
    if (logPayload.password) {
      logPayload.password = '***';
    }
    console.log('[DEBUG] Registering user with payload:', JSON.stringify(logPayload));

    const { email, password, name, role } = req.body;

    // MISSING VALIDATION: Does not check if email is valid format or if password is strong
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'RECEPTIONIST',
      },
    });

    // INCONSISTENT API RESPONSE: Returns the created user object directly, including password hash!
    // This is a major security flaw.
    // Stripping the user object of the password before sending it as the response
    // Major security flaw fix:
    delete user.password;

    res.status(201).json({
      message: 'User registered successfully',
      user,
    });
  } catch (error) {
    // IMPROPER ERROR HANDLING: Leaking database errors and details
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration', databaseError: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    // Mask password in login attempts
    // Removed the password from log
    console.log(`[AUTH] Login attempt for email: ${req.body.email}`);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Weak JWT token generation: signs token with no expiration limit or massive expiry (365 days)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('haqms_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600 * 1000 // 1 hour
    });

    // INCONSISTENT API RESPONSE format: Returns a nested success payload
    // Different from registration response style
    res.json({
      status: 'success',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error', errorStack: error.stack });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('haqms_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
// Returns current user details based on JWT
const { authenticate } = require('../middleware/auth');
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const headerToken = authHeader.split(' ')[1];
      if (headerToken && headerToken !== 'null' && headerToken !== 'undefined') {
        token = headerToken;
      }
    }
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, c) => {
        const parts = c.trim().split('=');
        const k = parts[0];
        const v = parts.slice(1).join('=');
        if (k && v) acc[k] = v;
        return acc;
      }, {});
      token = cookies['haqms_token'];
    }

    res.json({
      user,
      token,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving profile' });
  }
});

module.exports = router;
