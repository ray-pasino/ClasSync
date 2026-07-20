'use client';

import React, { useState, useContext, useEffect } from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import { Search, SquarePen, Trash2, Plus, GraduationCap } from 'lucide-react';
import { StoreContext } from '../../context/Storecontext';
import axios from 'axios';
import { toast } from 'react-toastify';


const Lecturersavailabe = () => {

  const { url } = useContext(StoreContext);
  const [edit, setEdit] = useState(false);
  const [editLecturerId, seteditLecturerId] = useState<any>(null);

  const [data, setData] = useState({
    id: "",
    name: "",
    courses: [] as string[],
    phone: "",
    email: ""
  });

// The courses a lecturer teaches, tolerant of the legacy single `course` field.
const lecturerCourseList = (l: any): string[] => {
  if (Array.isArray(l.courses) && l.courses.length) return l.courses.filter(Boolean);
  return l.course ? [l.course] : [];
};


const handleEdit = (id: any) => {
  const selectedLecturer = list.find((lecturer: any) => lecturer._id === id);
  if (selectedLecturer) {
    setData({
      id: selectedLecturer.id,
      name: selectedLecturer.name,
      courses: lecturerCourseList(selectedLecturer),
      phone: selectedLecturer.phone,
      email: selectedLecturer.email
    });
    // Set the clicked room ID in the state (you can track it for update purposes)
    seteditLecturerId(id);
    // Open the edit modal
    setEdit(true);
  }
};

const handleCloseEdit = () => setEdit(false);


const onChangeHandler = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const name = event.target.name;
  const value = event.target.value;
  setData(data => ({ ...data, [name]: value }));
};

// A lecturer can be assigned several courses from the multi-select.
const handleCoursesChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
  const selected = Array.from(event.target.selectedOptions, (o) => o.value).filter(
    (v) => v !== ""
  );
  setData((data) => ({ ...data, courses: selected }));
};

const onSubmitHandler = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  const response = await axios.post(`${url}/api/lecturer/add`, data, {
    headers: {
        'Content-Type': 'application/json'
    }
  });

  if (response.data.success) {
      setData({
        id: "",
        name: "",
        courses: [],
        phone: "",
        email: ""
      });
      toast.success(response.data.message);
      //refresh table
      fetchList();
      //close modal
      handleClosed();
  } else {
      toast.error(response.data.message);
  }
};


const [list, setList] = useState<any[]>([]);
const [courses, setCourses] = useState<any[]>([]);

///fetching list from the database
const fetchList = async () => {
  const response = await axios.get(`${url}/api/lecturer/list`);

  if (response.data.success) {
    setList(response.data.data);
  } else {
    toast.error("Error");
  }
};


// fetch course
const fetchCourses = async () => {
  try {
    const response = await axios.get(`${url}/api/course/list`);
    if (response.data.success) {
      // Map through the array to get only the course names
         const courseNames = response.data.data.map((course: any) => course.name);
         setCourses(courseNames);
    } else {
      toast.error("Failed to fetch courses.");
    }
  } catch (error) {
    toast.error("Error fetching courses.");
  }
};


// submitting edited info
const oneditsubmitHandler = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  const response = await axios.put(`${url}/api/lecturer/update/${editLecturerId}`, data, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

if (response.data.success) {
  toast.success(response.data.message);
  setData({
    id: "",
    name: "",
    courses: [],
    phone: "",
    email: ""
  });
  fetchList();
  handleCloseEdit();
} else {
  toast.error(response.data.message);
}

};


//remove item
const removeItem = async (lecturerId: any) => {
  const response = await axios.post(`${url}/api/lecturer/remove`, { id: lecturerId });
  await fetchList();
  if (response.data.success) {
    toast.success(response.data.message);
  } else {
    toast.error("Error");
  }
};

useEffect(() => {
  fetchList();
  fetchCourses();
}, []);


  const [Lclicked, setLClicked] = useState(false);

  const handleClicked = () => {
    setLClicked(true);
  };

    const handleClosed = () =>  setLClicked(false);

  // Shared modal field styling (matches the dashboard's generate modal).
  const fieldClass =
    'w-full border border-[#D8DEEC] rounded-[10px] px-3.5 py-3 bg-[#F7F9FD] text-sm text-b-blue focus:outline-none focus:border-accent focus:bg-white transition-colors';

  const renderLecturerForm = (
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void,
    onCancel: () => void,
    submitLabel: string
  ) => (
    <form className="p-6 space-y-5" onSubmit={onSubmit}>
      <div>
        <label htmlFor="id" className="block text-sm font-semibold text-b-blue mb-1.5">
          Lecturer ID
        </label>
        <input
          type="text"
          id="id"
          className={fieldClass}
          name="id"
          onChange={onChangeHandler}
          value={data.id}
          placeholder="e.g. LEC-001"
        />
      </div>
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-b-blue mb-1.5">
          Name
        </label>
        <input
          type="text"
          id="name"
          className={fieldClass}
          name="name"
          onChange={onChangeHandler}
          value={data.name}
          placeholder="e.g. Dr. Jane Doe"
        />
      </div>
      <div>
        <label htmlFor="course-select" className="block text-sm font-semibold text-b-blue mb-1.5">
          Courses
        </label>
        <select
          name="courses"
          id="course-select"
          className={`${fieldClass} min-h-[120px]`}
          onChange={handleCoursesChange}
          value={data.courses}
          multiple
        >
          {courses.map((course: any, i: number) => (
            <option key={i} value={course}>{course}</option>
          ))}
        </select>
        <p className="text-[11px] text-gray-400 font-light mt-1.5">
          Hold Ctrl (or Cmd) to select every course this lecturer teaches.
        </p>
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-semibold text-b-blue mb-1.5">
          Telephone No.
        </label>
        <input
          type="number"
          id="phone"
          className={fieldClass}
          name="phone"
          onChange={onChangeHandler}
          value={data.phone}
          placeholder="e.g. 0241234567"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-b-blue mb-1.5">
          Email
        </label>
        <input
          type="text"
          id="email"
          className={fieldClass}
          name="email"
          onChange={onChangeHandler}
          value={data.email}
          placeholder="e.g. jane.doe@gctu.edu.gh"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          className="flex-1 rounded-xl py-3 font-semibold text-gray-600 bg-page-bg hover:bg-gray-100 transition"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 rounded-xl py-3 font-semibold text-white bg-accent hover:brightness-105 transition"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-page-bg">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-6 lg:mb-8">
            <div className="shrink-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-b-blue">
                Lecturers
              </h1>
              <p className="text-sm text-gray-400 font-light mt-1">
                Manage lecturers and their assigned courses
              </p>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="flex items-center gap-2.5 bg-white rounded-xl px-4 h-11 lg:h-12 flex-1 sm:flex-none sm:w-56 md:w-64 border border-[#E8ECF6]">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search"
                  className="search-input bg-transparent text-sm w-full font-light text-gray-500 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleClicked}
                className="bg-accent text-white rounded-xl h-11 lg:h-12 px-4 font-semibold flex items-center gap-2 shrink-0 hover:brightness-105 transition whitespace-nowrap"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Add Lecturer</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </header>

          {/* List card */}
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-b-blue text-lg">Available Lecturers</h2>
              <span className="text-xs font-medium text-gray-400">
                {list.length} {list.length === 1 ? 'lecturer' : 'lecturers'}
              </span>
            </div>

            {list.length === 0 ? (
              <div className="flex flex-col items-center text-center py-12">
                <span className="h-12 w-12 rounded-xl bg-page-bg flex items-center justify-center text-accent mb-3">
                  <GraduationCap size={22} />
                </span>
                <p className="text-sm text-gray-400 font-light max-w-xs">
                  No lecturers yet. Add your first lecturer to get started.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-page-bg">
                        <th className="font-semibold py-3 pr-4">Lect. ID</th>
                        <th className="font-semibold py-3 pr-4">Name</th>
                        <th className="font-semibold py-3 pr-4">Course</th>
                        <th className="font-semibold py-3 pr-4">Telephone No.</th>
                        <th className="font-semibold py-3 pr-4">Email</th>
                        <th className="font-semibold py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((lecturer: any, index: number) => (
                        <tr key={index} className="border-b border-page-bg last:border-0">
                          <td className="py-4 pr-4 font-medium text-b-blue">{lecturer.id}</td>
                          <td className="py-4 pr-4 text-gray-600">{lecturer.name}</td>
                          <td className="py-4 pr-4 text-gray-600">
                            {lecturerCourseList(lecturer).join(', ') || '—'}
                          </td>
                          <td className="py-4 pr-4 text-gray-600">{lecturer.phone}</td>
                          <td className="py-4 pr-4 text-gray-600">{lecturer.email}</td>
                          <td className="py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                aria-label="Edit lecturer"
                                onClick={() => handleEdit(lecturer._id)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-accent transition-colors"
                              >
                                <SquarePen className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                aria-label="Delete lecturer"
                                onClick={() => removeItem(lecturer._id)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile / tablet cards */}
                <div className="lg:hidden space-y-3">
                  {list.map((lecturer: any, index: number) => (
                    <div key={index} className="rounded-xl border border-page-bg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-b-blue truncate">{lecturer.name}</p>
                          <p className="text-xs text-gray-400 font-light mt-0.5">
                            {lecturer.id} · {lecturerCourseList(lecturer).join(', ') || '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            aria-label="Edit lecturer"
                            onClick={() => handleEdit(lecturer._id)}
                            className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 bg-page-bg hover:text-accent transition-colors"
                          >
                            <SquarePen className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete lecturer"
                            onClick={() => removeItem(lecturer._id)}
                            className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 bg-page-bg hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-page-bg space-y-1 text-xs text-gray-500">
                        <p className="truncate">
                          <span className="font-medium text-gray-400">Phone:</span> {lecturer.phone}
                        </p>
                        <p className="truncate">
                          <span className="font-medium text-gray-400">Email:</span> {lecturer.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Add lecturer modal */}
      {Lclicked && (
        <div
          className="sheet-scrim fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
          onClick={handleClosed}
        >
          <div
            className="sheet-card w-full sm:max-w-md bg-white rounded-2xl shadow-xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-b-blue rounded-t-2xl px-6 py-5">
              <h2 className="text-white font-semibold text-lg">Add Lecturer</h2>
              <p className="text-white/60 text-xs mt-0.5">Add a lecturer to the directory</p>
            </div>
            {renderLecturerForm(onSubmitHandler, handleClosed, 'Add Lecturer')}
          </div>
        </div>
      )}

      {/* Edit lecturer modal */}
      {edit && (
        <div
          className="sheet-scrim fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
          onClick={handleCloseEdit}
        >
          <div
            className="sheet-card w-full sm:max-w-md bg-white rounded-2xl shadow-xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-b-blue rounded-t-2xl px-6 py-5">
              <h2 className="text-white font-semibold text-lg">Update Lecturer Info</h2>
              <p className="text-white/60 text-xs mt-0.5">Update this lecturer&apos;s details</p>
            </div>
            {renderLecturerForm(oneditsubmitHandler, handleCloseEdit, 'Save Changes')}
          </div>
        </div>
      )}
    </div>
  );
};

export default Lecturersavailabe;
