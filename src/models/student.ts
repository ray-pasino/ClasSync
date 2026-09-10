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
  // Optional profile fields shown on the SIP noticeboard. They are not part of
  // sign-in or timetable matching, so records created before they existed just
  // render blank rows, exactly as the university portal does.
  title: { type: String },
  department: { type: String },
  cohort: { type: String },
  creditRequired: { type: Number },
  creditTaken: { type: Number },
  // Alerts this user has dismissed, by alert id. Alerts are shared documents,
  // so dismissal has to be per-user — hiding one must never hide it for
  // everybody else on the same cohort.
  dismissedAlerts: { type: [String], default: [] },
  // Opt-in for per-class SMS reminders. Defaults to true because the sidebar
  // toggle has always rendered as on and the subscribe route already tells
  // students they will receive them — turning it off here would silently
  // contradict that. Students opt out with the same toggle.
  smsReminders: { type: Boolean, default: true },
});

const StudentModel = (mongoose.models.student ||
  mongoose.model('student', studentSchema)) as mongoose.Model<any>;

export default StudentModel;
