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
  // Alerts this user has dismissed, by alert id. Alerts are shared documents,
  // so dismissal has to be per-user — hiding one must never hide it for
  // everybody else on the same cohort.
  dismissedAlerts: { type: [String], default: [] },
  // Opt-in for per-class SMS reminders. See the note on the student schema for
  // why this defaults to true.
  smsReminders: { type: Boolean, default: true },
});

const LecturerModel = (mongoose.models.lecturer ||
  mongoose.model('lecturer', lecturerSchema)) as mongoose.Model<any>;

export default LecturerModel;
