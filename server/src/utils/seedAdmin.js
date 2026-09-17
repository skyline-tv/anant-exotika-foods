const Admin = require('../models/Admin');

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    return;
  }

  const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return;
  }

  await Admin.create({
    name: process.env.ADMIN_NAME || 'Admin',
    email,
    password,
  });

  console.log(`Default admin created: ${email}`);
};

module.exports = seedAdmin;
