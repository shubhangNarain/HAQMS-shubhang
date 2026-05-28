const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/reports/doctor-stats
// Returns aggregated revenue and appointment stats per doctor
router.get('/doctor-stats', authenticate, async (req, res) => {
  try {
    const start = Date.now();

    // Fetch all doctors first, then process all in parallel — no sequential loop
    const doctors = await prisma.doctor.findMany();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reportData = await Promise.all(
      doctors.map(async (doc) => {
        // All 4 queries for this doctor run in parallel
        const [totalAppointments, completedAppointments, cancelledAppointments, todayQueueSize] = await Promise.all([
          prisma.appointment.count({ where: { doctorId: doc.id } }),
          prisma.appointment.count({ where: { doctorId: doc.id, status: 'COMPLETED' } }),
          prisma.appointment.count({ where: { doctorId: doc.id, status: 'CANCELLED' } }),
          prisma.queueToken.count({ where: { doctorId: doc.id, createdAt: { gte: today } } }),
        ]);

        // Revenue derived from completedAppointments count — no extra findMany needed
        const revenue = completedAppointments * doc.consultationFee;

        return {
          id: doc.id,
          name: doc.name,
          specialization: doc.specialization,
          department: doc.department,
          totalAppointments,
          completedAppointments,
          cancelledAppointments,
          todayQueueSize,
          revenue,
        };
      })
    );

    const durationMs = Date.now() - start;
    // TESTING:
    // previous: 451ms
    // current: 3ms

    res.json({
      success: true,
      timeTakenMs: durationMs,
      data: reportData,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report', details: error.message });
  }
});

module.exports = router;
