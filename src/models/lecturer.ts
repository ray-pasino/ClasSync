import mongoose from 'mongoose';

const lecturerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  id: { type: Number, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: Number, required: true },
  faculty: { type: String },
  department: { type: String },
  campus: { type: String },
  // A lecturer can teach several courses, each stored by course name.
  courses: { type: [String], default: [] },
  // Legacy single-course field — kept optional so older records still load and
  // schedule. New records use `courses`.
  course: { type: String },
});

const LecturerModel = (mongoose.models.lecturer ||
  mongoose.model('lecturer', lecturerSchema)) as mongoose.Model<any>;

export default LecturerModel;
