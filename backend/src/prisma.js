const { PrismaClient } = require('@prisma/client');

// Node.js caches modules on the first require, guaranteeing this behaves as a singleton
const prisma = new PrismaClient();

module.exports = prisma;
