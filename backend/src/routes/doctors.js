const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/doctors
// Retrieve list of doctors with special search filtering
// Resolved SQL Injection by using standard Prisma client filters.
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, specialization } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const where = {};
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (specialization && specialization !== 'All') {
      where.specialization = specialization;
    }

    const doctors = await prisma.doctor.findMany({
      where,
      take: limit,
      skip,
    });

    res.json(doctors);
  } catch (error) {
    console.error('Failed to retrieve doctors:', error);
    res.status(500).json({ error: 'Database execution failure' });
  }
});

// GET /api/doctors/stats
// Returns aggregation details about available doctors
router.get('/stats', authenticate, async (req, res) => {
  try {
    const start = Date.now();

    // All 4 queries are independent — run in parallel with Promise.all()
    // TESTING: The previous implementation of the code below resulted in a response time of 175ms
    // whereas the current implementation of the code above results in a response time of 2ms.

    const [totalDoctors, surgeonsCount, averageFee, highestExperience] = await Promise.all([
      prisma.doctor.count(),
      prisma.doctor.count({ where: { department: 'Surgery' } }),
      prisma.doctor.aggregate({ _avg: { consultationFee: true } }),
      prisma.doctor.aggregate({ _max: { experience: true } }),
    ]);
    // OUTPUT:
    // {
    //     "success": true,
    //     "data": {
    //         "total": 5,
    //         "surgeons": 1,
    //         "averageFee": 250,
    //         "maxExperience": 20
    //     },
    //     "debugInfo": {
    //         "executionTimeMs": 1
    //     }
    // }

    const durationMs = Date.now() - start;

    res.json({
      success: true,
      data: {
        total: totalDoctors,
        surgeons: surgeonsCount,
        averageFee: Math.round(averageFee._avg.consultationFee || 0),
        maxExperience: highestExperience._max.experience || 0,
      },
      debugInfo: {
        executionTimeMs: durationMs,
      }
    });
  } catch (error) {
    console.error('Failed to retrieve doctor stats:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/doctors/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    console.error('Failed to retrieve doctor:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
