const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/queue
// List all active queue tokens
router.get('/', authenticate, async (req, res) => {
  try {
    const { doctorId, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where = {
      createdAt: { gte: today },
    };
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    const tokens = await prisma.queueToken.findMany({
      where,
      take: limit,
      skip,
      include: {
        patient: true,
        doctor: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(tokens);
  } catch (error) {
    console.error('Failed to retrieve queue:', error);
    res.status(500).json({ error: 'Failed to retrieve queue' });
  }
});

// POST /api/queue/checkin
// Generate a new queue token for a patient
router.post('/checkin', authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentId } = req.body;

    if (!patientId || !doctorId) {
      return res.status(400).json({ error: 'Patient and Doctor ID are required for check-in.' });
    }

    const [doctorExists, patientExists] = await Promise.all([
      prisma.doctor.findUnique({ where: { id: doctorId } }),
      prisma.patient.findUnique({ where: { id: patientId } }),
    ]);

    if (!doctorExists) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }
    if (!patientExists) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    if (appointmentId) {
      const appointmentExists = await prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appointmentExists) {
        return res.status(404).json({ error: 'Appointment not found.' });
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Wrap the read + write in a serializable transaction to eliminate the race condition.
    // PostgreSQL will serialize concurrent check-ins for the same doctor, preventing
    // two requests from reading the same max token and writing duplicate token numbers.
    const newToken = await prisma.$transaction(async (tx) => {
      const maxTokenResult = await tx.queueToken.aggregate({
        where: {
          doctorId,
          createdAt: { gte: today },
        },
        _max: { tokenNumber: true },
      });

      const nextTokenNumber = (maxTokenResult._max.tokenNumber || 0) + 1;

      return tx.queueToken.create({
        data: {
          tokenNumber: nextTokenNumber,
          patientId,
          doctorId,
          appointmentId: appointmentId || null,
          status: 'WAITING',
        },
        include: {
          patient: true,
          doctor: true,
        },
      });
    }, { isolationLevel: 'Serializable' });

    res.status(201).json({
      message: 'Checked in successfully. Token generated.',
      token: newToken,
    });
  } catch (error) {
    console.error('Queue check-in error:', error);
    res.status(500).json({ error: 'Check-in failed' });
  }
});


// PATCH /api/queue/:id
// Update token status (WAITING -> CALLING -> COMPLETED / SKIPPED)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updatedToken = await prisma.queueToken.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        patient: true,
        doctor: true,
      },
    });

    res.json(updatedToken);
  } catch (error) {
    console.error('Failed to update queue token:', error);
    res.status(500).json({ error: 'Failed to update queue token' });
  }
});

module.exports = router;
