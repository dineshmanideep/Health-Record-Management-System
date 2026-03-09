/**
 * Seed script — creates a temporary admin account.
 * Run once:  node scripts/seedAdmin.js
 *
 * Credentials created:
 *   Email :  admin@hrms.com
 *   Password: Admin@1234
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Admin = require('../models/Admin');

const ADMIN = {
  name: 'System Admin',
  email: 'admin@hrms.com',
  password: 'Admin@1234',
  phone: '0000000000',
  role: 'admin',
  accessLevel: 'super-admin',
  department: 'System Administration',
  permissions: [
    'manage-users',
    'manage-doctors',
    'manage-hospitals',
    'manage-nurses',
    'view-records',
    'edit-records',
    'delete-records',
    'system-settings',
    'generate-reports'
  ]
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existing = await Admin.findOne({ email: ADMIN.email });
    if (existing) {
      console.log(`Admin already exists: ${ADMIN.email}`);
      console.log('Delete the existing document first if you want to reset the password.');
      process.exit(0);
    }

    await Admin.create(ADMIN);

    console.log('\n✅ Admin account created successfully!');
    console.log('─────────────────────────────────');
    console.log(`  Email    : ${ADMIN.email}`);
    console.log(`  Password : ${ADMIN.password}`);
    console.log(`  Role     : ${ADMIN.accessLevel}`);
    console.log('─────────────────────────────────');
    console.log('⚠️  Change this password after first login.\n');

    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
