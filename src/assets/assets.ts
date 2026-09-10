const lecturerImage = '/assets/businessman-with-chart.jpg';
const adminBlock = '/assets/adminblock.jpg';
const adminBlock2 = '/adminblock2.jpg';
const studygroup = '/assets/study-group-african-people.jpg';
const logo = '/assets/logo.png';
const admin = '/assets/sysadmin_03.jpg';
const adminprofile = '/assets/adminprofile.png';
const courseicon = '/assets/course-icon.png';
const timeicon = '/assets/time-icon.png';
const clockPhoto = '/assets/clockandbooks.png';
const dashboardvector = '/assets/dashboardvector.png';
const lecturerooms = '/assets/lectureroom.png';
const personicon = '/assets/person-icon.png';
const tiemtableicon = '/assets/tiemtable-icon.png';
const dashboardvectorwhite = '/assets/whiteVector.png';
const whitelectureroom = '/assets/whitelectureroom.png';
const courses = '/assets/courses.png';
const cap = '/assets/cap.png';
const classes = '/assets/classes.png';
const whiteTimetableIcon = '/assets/whiteTimetable Icon.png';
const dClasses = '/assets/d-classes.png';
const dropdown = '/assets/dropdown.png';

export const assets = {
  lecturerImage,
  adminBlock,
  adminBlock2,
  studygroup,
  logo,
  admin,
  clockPhoto,
  personicon,
  tiemtableicon,
  dashboardvectorwhite,
  whitelectureroom,
  courses,
  cap,
  classes,
  whiteTimetableIcon,
  dropdown,
};


// Sample student used as the display fallback on the SIP noticeboard: any
// profile row the signed-in record has no value for falls back to these.
export const studentInfo = {
  name: 'ALEX ASAMOAH',
  indexnumber: 4211231920,
  email: 'asamoah.baffour@gmail.com',
  faculty: 'FACULTY OF COMPUTING AND INFORMATION SYSTEMS',
  program: 'COMPUTER SCIENCE',
  level: 200,
  session: 'MORNING',
  phone: '0235498675',
  campus: 'MAIN CAMPUS - ABEKA',
  department: 'COMPUTER SCIENCE',
  cohort: '2022/2023',
  creditRequired: '',
  creditTaken: 138,
};



export const lecturerInfo = {
  name: 'BENSON AMFO',
  email: 'amfobenson@live.gctu.edu.gh',
  faculty: 'FACULTY OF COMPUTING AND INFORMATION SYSTEMS',
  department: 'COMPUTER SCIENCE',
  phone: '0238456789',
  campus: 'MAIN CAMPUS - ABEKA',
};


export const adminstratorinfo = {
  name: 'OBED EWUDZIE',
  email: 'ewudzieobed@live.gctu.edu.gh',
  phone: '0239494316',
  team: 'GENERAL STAFF',
  campus: 'MAIN CAMPUS - ABEKA',
  profileImage: adminprofile,
};


export const sidebardata = [
  {
    title: 'Dashboard',
    icon: dashboardvector,
    link: '/dashboard',
  },

  {
    title: 'Lecture Rooms',
    icon: lecturerooms,
    link: '/lecturerooms',
  },

  {
    title: 'Courses Available',
    icon: courseicon,
    link: '/coursesavailable',
  },

  {
    title: 'Lecturers Available',
    icon: personicon,
    link: '/lecturersavailable',
  },


  {
    title: 'Time & Schedule',
    icon: timeicon,
    link: '/timeandschedule',
  },

  {
    title: 'Classes',
    icon: dClasses,
    link: '/classes',
  },
];
