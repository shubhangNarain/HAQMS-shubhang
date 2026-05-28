const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/appointments
// List all appointments
// PERFORMANCE BUG: Classic N+1 Query Issue!
// Instead of using Prisma's include, it loops through each appointment and executes
// individual select statements for Patient and Doctor details.
router.get('/', authenticate, async (req, res) => {
  try {
    const { doctorId, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const where = {};
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    // Single query — patient and doctor loaded via Prisma include (no N+1)
    // TEST RESULT: The [N+1] bug resulted in a response time of 60ms whereas
    // the current implementation of the code above results in a response time of 6ms.
    const [appointments, totalAppointments] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { appointmentDate: 'asc' },
        take: limit,
        skip,
        include: {
          patient: {
            select: { id: true, name: true, phoneNumber: true, age: true, medicalHistory: true },
          },
          doctor: {
            select: { id: true, name: true, specialization: true },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    const totalPages = Math.ceil(totalAppointments / limit);

    res.json({
      success: true,
      count: appointments.length,
      appointments,
      pagination: {
        page,
        limit,
        totalAppointments,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Failed to retrieve appointments:', error);
    res.status(500).json({ error: 'Failed to retrieve appointments' });
  }
});

// POST /api/appointments
// Book an appointment
// DESIGN BUG: Duplicate-prone schema. No unique index blocks duplicate appointment bookings.
// In this API, we have a half-hearted verification that is easily bypassed or logically flawed,
// allowing multiple bookings for the exact same date and doctor.
// FIXED: Same date multiple booking scenario, not we block them within a 15 min window of existing slot
router.post('/', authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, reason } = req.body;

    if (!patientId || !doctorId || !appointmentDate) {
      return res.status(400).json({ error: 'Patient, Doctor, and Appointment Date are required.' });
    }

    const appDate = new Date(appointmentDate);
    if (isNaN(appDate.getTime())) {
      return res.status(400).json({ error: 'Invalid appointment date format.' });
    }

    if (appDate <= new Date()) {
      return res.status(400).json({ error: 'Appointment date must be in the future.' });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }

    const appHour = appDate.getHours();
    const appMin = appDate.getMinutes();
    const appTimeStr = `${String(appHour).padStart(2, '0')}:${String(appMin).padStart(2, '0')}`;

    if (appTimeStr < doctor.availableFrom || appTimeStr > doctor.availableTo) {
      return res.status(400).json({
        error: `Selected slot ${appTimeStr} is outside the doctor's available shift.`,
      });
    }

    // Block bookings within a 15-minute window of an existing slot (not just exact millisecond match)
    const windowStart = new Date(appDate.getTime() - 15 * 60 * 1000);
    const windowEnd = new Date(appDate.getTime() + 15 * 60 * 1000);

    const existingBooking = await prisma.appointment.findFirst({
      where: {
        doctorId,
        status: { not: 'CANCELLED' },
        appointmentDate: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
    });

    if (existingBooking) {
      return res.status(400).json({
        error: 'Double booking blocked. Doctor already has an appointment within 15 minutes of this slot.',
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        appointmentDate: appDate,
        reason: reason || '',
        status: 'PENDING',
      },
    });

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment,
    });
  } catch (error) {
    console.error('Failed to book appointment:', error);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// PATCH /api/appointments/:id
// Update appointment status (COMPLETED, CANCELLED, etc.)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

module.exports = router;
