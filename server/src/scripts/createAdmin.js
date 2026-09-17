const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true });

const connectDatabase = require('../config/database');
const Admin = require('../models/Admin');

const createAdmin = async () => {
  const name = process.env.ADMIN_NAME || 'Admin';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  }

  await connectDatabase();

  const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    process.exit(0);
  }

  await Admin.create({ name, email, password });
  console.log(`Admin created: ${email}`);
  process.exit(0);
};

createAdmin().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
