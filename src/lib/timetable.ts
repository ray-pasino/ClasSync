import LecturerModel from '../models/lecturer';
import CourseModel from '../models/course';
import RoomModel from '../models/room';
import TimeModel from '../models/time';
import ClassModel from '../models/class';

// Collect all the data needed to generate a timetable.
export async function collectData() {
  try {
    const lecturers = await LecturerModel.find().exec();
    const courses = await CourseModel.find().exec();
    const lectureRooms = await RoomModel.find().exec();
    const timeSlots = await TimeModel.find().exec();
    const setClasses = await ClassModel.find().exec();
    return { lecturers, courses, lectureRooms, timeSlots, setClasses };
  } catch (error) {
    console.error('Error collecting data:', error);
    return null;
  }
}

// Generate a timetable from the collected data and the chosen days of the week.
export function generateTimetable(
  { lecturers, lectureRooms, timeSlots, setClasses }: any,
  daysOfWeek: string[]
) {
  const timetable: any[] = [];
  const assignedCourses = new Set();
  const assignedSlots = new Array(timeSlots.length)
    .fill(null)
    .map(() => new Array(daysOfWeek.length).fill(0));

  daysOfWeek.forEach((day) => {
    timeSlots.forEach((slot: any, slotIndex: number) => {
      const availableCourses = setClasses.filter(
        (cls: any) =>
          !assignedCourses.has(cls.course) &&
          assignedSlots[slotIndex][daysOfWeek.indexOf(day)] === 0
      );

      if (availableCourses.length === 0) return;

      const randomLecturer = lecturers[Math.floor(Math.random() * lecturers.length)];
      const randomRoom = lectureRooms[Math.floor(Math.random() * lectureRooms.length)];
      const randomClass = availableCourses[Math.floor(Math.random() * availableCourses.length)];

      const lecturerName = randomLecturer ? randomLecturer.name : 'Unknown Lecturer';

      timetable.push({
        Semester: randomClass.semester,
        className: randomClass.className,
        course: randomClass.course,
        room: randomRoom ? randomRoom.roomname : 'Unknown Room',
        time: `${timeSlots[slotIndex].startTime} - ${timeSlots[slotIndex].endTime}`,
        lecturer: lecturerName,
        day: day,
      });

      assignedCourses.add(randomClass.course);
      assignedSlots[slotIndex][daysOfWeek.indexOf(day)] = 1;
    });
  });

  return timetable;
}
