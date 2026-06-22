import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  id: { type: Number, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phone: { type: Number, required: true },
  team: { type: String },
  campus: { type: String },
  password: { type: String, required: true },
});

const AdminModel = (mongoose.models.admin ||
  mongoose.model('admin', adminSchema)) as mongoose.Model<any>;

export default AdminModel;
