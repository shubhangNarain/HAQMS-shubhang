const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorizeAdminOnlyLegacy } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/reports/doctor-stats
// Returns aggregated revenue and appointment stats per doctor
router.get('/doctor-stats', authenticate, authorizeAdminOnlyLegacy, async (req, res) => {
  try {
    const start = Date.now();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all doctors, and aggregate appointment/queue stats in parallel
    const [doctors, appointmentStats, queueStats] = await Promise.all([
      prisma.doctor.findMany(),
      prisma.appointment.groupBy({
        by: ['doctorId', 'status'],
        _count: { id: true },
      }),
      prisma.queueToken.groupBy({
        by: ['doctorId'],
        where: { createdAt: { gte: today } },
        _count: { id: true },
      }),
    ]);

    // Build lookup maps
    const appMap = {};
    appointmentStats.forEach((stat) => {
      const docId = stat.doctorId;
      if (!appMap[docId]) {
        appMap[docId] = { total: 0, completed: 0, cancelled: 0 };
      }
      const count = stat._count.id;
      appMap[docId].total += count;
      if (stat.status === 'COMPLETED') {
        appMap[docId].completed = count;
      } else if (stat.status === 'CANCELLED') {
        appMap[docId].cancelled = count;
      }
    });

    const queueMap = {};
    queueStats.forEach((stat) => {
      queueMap[stat.doctorId] = stat._count.id;
    });

    // Assemble report data
    const reportData = doctors.map((doc) => {
      const stats = appMap[doc.id] || { total: 0, completed: 0, cancelled: 0 };
      const todayQueueSize = queueMap[doc.id] || 0;
      const revenue = stats.completed * doc.consultationFee;

      return {
        id: doc.id,
        name: doc.name,
        specialization: doc.specialization,
        department: doc.department,
        totalAppointments: stats.total,
        completedAppointments: stats.completed,
        cancelledAppointments: stats.cancelled,
        todayQueueSize,
        revenue,
      };
    });

    const durationMs = Date.now() - start;

    res.json({
      success: true,
      timeTakenMs: durationMs,
      data: reportData,
    });
  } catch (error) {
    console.error('Failed to generate report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
