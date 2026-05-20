import mongoose from 'mongoose';
import { Patient } from './src/models/Patient.js';

async function check() {
  await mongoose.connect('mongodb+srv://shariyershazan1_db_user:x0eVZMLkSAza1TYK@cluster0.hzqhmud.mongodb.net/');
  
  const id1 = '6a0c1788ebb0bbc93177df45';
  const id2 = '6a0d550bd706c08d2997dcd1';

  const p1 = await Patient.findById(id1).lean();
  const p2 = await Patient.findById(id2).lean();

  console.log('Patient 1 user:', p1 ? p1.user : 'N/A');
  console.log('Patient 2 user:', p2 ? p2.user : 'N/A');

  process.exit(0);
}

check();
