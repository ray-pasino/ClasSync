import mongoose from 'mongoose';

// A change/cancellation alert raised by an admin against a class. Persisted so
// students and lecturers can see it in-app even if SMS is down or opted out.
const alertSchema = new mongoose.Schema(
  {
    // 'cancellation' is a one-off notice that the class won't hold: nothing is
    // removed from the timetable, but the reminder for that occurrence is
    // withheld (see lib/classReminders). 'change' and 'info' are announcements.
    type: {
      type: String,
      enum: ['cancellation', 'change', 'info'],
      default: 'info',
    },
    className: { type: String, required: true },
    // Cohort level (100/200/300/400) when the alert targets a single level of
    // the programme; absent means it applies to the whole programme.
    level: { type: Number },
    // For a cancellation: the course that won't hold, and the day it applies to
    // (absent day = the course generally). The timetable itself is unchanged.
    course: { type: String },
    day: { type: String },
    semester: { type: String },
    // A 'change' may also move the session on the timetable. Both placements are
    // recorded so the feed can say what actually changed, and so the move is
    // auditable after the timetable itself has moved on.
    fromDay: { type: String },
    fromTime: { type: String },
    fromRoom: { type: String },
    toDay: { type: String },
    toTime: { type: String },
    toRoom: { type: String },
    // A one-off ("just this week") move: the timetable is deliberately left
    // alone, so the class returns to its normal slot next week. The reminder
    // pipeline withholds the old slot's reminder for that single occurrence and
    // sends one for the new slot instead — the same one-occurrence rule a
    // cancellation follows. A permanent move (admin) leaves this false, because
    // the timetable itself has been rewritten.
    oneOff: { type: Boolean, default: false },
    message: { type: String, required: true },
    // Lecturer names teaching this class, resolved from the timetable at send
    // time. Used to surface the alert to the right lecturers and to SMS them.
    lecturerNames: { type: [String], default: [] },
    // SMS dispatch outcome, for the admin's confirmation and auditing.
    smsSent: { type: Boolean, default: false },
    smsCount: { type: Number, default: 0 },
    smsReason: { type: String },
    // Set when a reschedule deliberately sends no SMS because the class's own
    // reminder has not gone out yet and will carry the new details instead.
    smsDeferred: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const AlertModel = (mongoose.models.alert ||
  mongoose.model('alert', alertSchema)) as mongoose.Model<any>;

export default AlertModel;
