import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  id: { type: Number, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String },
  faculty: { type: String },
  session: { type: String },
  level: { type: Number },
  program: { type: String },
  phone: { type: String },
  campus: { type: String },
  // Opt-in for per-class SMS reminders. Defaults to true because the sidebar
  // toggle has always rendered as on and the subscribe route already tells
  // students they will receive them — turning it off here would silently
  // contradict that. Students opt out with the same toggle.
  smsReminders: { type: Boolean, default: true },
});

const StudentModel = (mongoose.models.student ||
  mongoose.model('student', studentSchema)) as mongoose.Model<any>;

export default StudentModel;
