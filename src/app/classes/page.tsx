'use client';

import React, { useState, useContext, useEffect } from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import { Search, SquarePen, Trash2, Plus, Presentation } from 'lucide-react';
import { StoreContext } from '../../context/Storecontext';
import axios from 'axios';
import { toast } from 'react-toastify';

type CourseRow = { course: string; meetings: string };

// Fresh, empty form state. A factory so each reset gets its own nested arrays.
const emptyClass = () => ({
  className: "",
  semester: "",
  level: "",
  population: "",
  unavailablerooms: [] as string[],
  courses: [{ course: "", meetings: "1" }] as CourseRow[],
});

// The list of courses a class record takes, tolerant of the legacy single
// `course` field on older records.
const classCourseList = (c: any): CourseRow[] => {
  if (Array.isArray(c.courses) && c.courses.length) {
    return c.courses.map((x: any) => ({
      course: x.course,
      meetings: String(x.meetings ?? "1"),
    }));
  }
  if (c.course) return [{ course: c.course, meetings: String(c.meetings ?? "1") }];
  return [];
};

const Classes = () => {
  const { url } = useContext(StoreContext);
  const [Clclicked, setClClicked] = useState(false);
  const [edit, setEdit] = useState(false);
  const [editClassId, setEditClassId] = useState<any>(null);

  const [data, setData] = useState(emptyClass);

  const onChangeHandler = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleRoomsChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRooms = Array.from(event.target.selectedOptions, option => option.value).filter(room => room !== "");
    setData(data => ({ ...data, unavailablerooms: selectedRooms }));
  };

  // ---- Course rows -------------------------------------------------------
  const updateCourseRow = (index: number, field: keyof CourseRow, value: string) => {
    setData(prev => ({
      ...prev,
      courses: prev.courses.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      ),
    }));
  };

  const addCourseRow = () =>
    setData(prev => ({ ...prev, courses: [...prev.courses, { course: "", meetings: "1" }] }));

  const removeCourseRow = (index: number) =>
    setData(prev => ({
      ...prev,
      // Always keep at least one row.
      courses: prev.courses.length === 1 ? prev.courses : prev.courses.filter((_, i) => i !== index),
    }));

  const onSubmitHandler = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const courses = data.courses.filter((c) => c.course);
    if (!data.className || !data.semester || courses.length === 0) {
      toast.error('Add a class name, academic period, and at least one course.');
      return;
    }

    const response = await axios.post(`${url}/api/class/add`, { ...data, courses }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      setData(emptyClass());
      toast.success(response.data.message);
      fetchList();
      handleClosed();
    } else {
      toast.error(response.data.message);
    }
  };

  const [list, setList] = useState<any[]>([]);

  const fetchList = async () => {
    const response = await axios.get(`${url}/api/class/list`);

    if (response.data.success) {
      setList(response.data.data);
    } else {
      toast.error("Error");
    }
  };

  const onEditSubmitHandler = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const courses = data.courses.filter((c) => c.course);
    if (!data.className || !data.semester || courses.length === 0) {
      toast.error('Add a class name, academic period, and at least one course.');
      return;
    }

    const response = await axios.put(`${url}/api/class/update/${editClassId}`, { ...data, courses }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      toast.success(response.data.message);
      setData(emptyClass());
      fetchList();
      handleCloseEdit();
    } else {
      toast.error(response.data.message);
    }
  };

  const handleCloseEdit = () => setEdit(false);

  const removeItem = async (classId: any) => {
    const response = await axios.post(`${url}/api/class/remove`, { id: classId });
    await fetchList();
    if (response.data.success) {
      toast.success(response.data.message);
    } else {
      toast.error("Error");
    }
  };

  const handleEdit = (id: any) => {
    const selectedClass = list.find((lecture: any) => lecture._id === id);
    if (selectedClass) {
      const courses = classCourseList(selectedClass);
      setData({
        className: selectedClass.className || "",
        semester: selectedClass.semester || "",
        level: selectedClass.level != null ? String(selectedClass.level) : "",
        population: selectedClass.population != null ? String(selectedClass.population) : "",
        unavailablerooms: selectedClass.unavailablerooms || [],
        courses: courses.length ? courses : [{ course: "", meetings: "1" }],
      });
      setEditClassId(id);
      setEdit(true);
    }
  };

  const handleClicked = () => {
    setClClicked(true);
  };

  const handleClosed = () => {
    setClClicked(false);
  };

  const [courses, setCourses] = useState<any[]>([]);

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${url}/api/course/list`);
      if (response.data.success) {
        const courseNames = response.data.data.map((course: any) => course.name);
        setCourses(courseNames);
      } else {
        toast.error("Failed to fetch courses.");
      }
    } catch (error) {
      toast.error("Error fetching courses.");
    }
  };

  const [rooms, setRooms] = useState<any[]>([]);

  const fetchRoom = async () => {
    try {
      const response = await axios.get(`${url}/api/room/list`);
      if (response.data.success) {
        setRooms(response.data.data);
      } else {
        toast.error("Failed to fetch rooms.");
      }
    } catch (error) {
      toast.error("Error fetching rooms.");
    }
  };

  useEffect(() => {
    fetchList();
    fetchCourses();
    fetchRoom();
  }, []);

  // Shared modal field styling (matches the dashboard's generate modal).
  const fieldClass =
    'w-full border border-[#D8DEEC] rounded-[10px] px-3.5 py-3 bg-[#F7F9FD] text-sm text-b-blue focus:outline-none focus:border-accent focus:bg-white transition-colors';
  // Same styling without a fixed width, for the flexed course rows (so the
  // course dropdown can grow and the meetings selector stays a narrow fixed box).
  const rowFieldClass =
    'border border-[#D8DEEC] rounded-[10px] px-3.5 py-3 bg-[#F7F9FD] text-sm text-b-blue focus:outline-none focus:border-accent focus:bg-white transition-colors';

  const renderClassForm = (
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void,
    onCancel: () => void,
    submitLabel: string
  ) => (
    <form className="p-6 space-y-5" onSubmit={onSubmit}>
      <div>
        <label htmlFor="className" className="block text-sm font-semibold text-b-blue mb-1.5">
          Class Name
        </label>
        <input
          type="text"
          id="className"
          className={fieldClass}
          name="className"
          onChange={onChangeHandler}
          value={data.className}
          placeholder="e.g. BSc Information Technology"
        />
        <p className="text-[11px] text-gray-400 font-light mt-1.5">
          The programme name. Pick the level below — you can reuse the same
          programme name for different levels.
        </p>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-semibold text-b-blue">
            Courses &amp; Meetings / Week
          </label>
          <button
            type="button"
            onClick={addCourseRow}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:brightness-110"
          >
            <Plus size={14} /> Add course
          </button>
        </div>
        <div className="space-y-2">
          {data.courses.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                className={`${rowFieldClass} flex-1 min-w-0`}
                value={row.course}
                onChange={(e) => updateCourseRow(i, 'course', e.target.value)}
                aria-label={`Course ${i + 1}`}
              >
                <option value="">Select a course</option>
                {courses.map((course: any, ci: number) => (
                  <option key={ci} value={course}>{course}</option>
                ))}
              </select>
              <select
                className={`${rowFieldClass} w-[88px] shrink-0`}
                value={row.meetings}
                onChange={(e) => updateCourseRow(i, 'meetings', e.target.value)}
                aria-label={`Meetings per week for course ${i + 1}`}
                title="Meetings per week"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={String(n)}>{n}×</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeCourseRow(i)}
                disabled={data.courses.length === 1}
                aria-label="Remove course"
                className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 font-light mt-1.5">
          Add every course this class takes, and how many times a week each meets.
        </p>
      </div>
      <div>
        <label htmlFor="semester" className="block text-sm font-semibold text-b-blue mb-1.5">
          Academic Period
        </label>
        <select className={fieldClass} id="semester" name="semester" onChange={onChangeHandler} value={data.semester}>
          <option value="">Select an academic period</option>
          <option value="First Semester">First Semester</option>
          <option value="Second Semester">Second Semester</option>
        </select>
      </div>
      <div>
        <label htmlFor="level" className="block text-sm font-semibold text-b-blue mb-1.5">
          Level
        </label>
        <select className={fieldClass} id="level" name="level" onChange={onChangeHandler} value={data.level}>
          <option value="">Select a level (optional)</option>
          <option value="100">Level 100</option>
          <option value="200">Level 200</option>
          <option value="300">Level 300</option>
          <option value="400">Level 400</option>
        </select>
      </div>
      <div>
        <label htmlFor="population" className="block text-sm font-semibold text-b-blue mb-1.5">
          Population
        </label>
        <input
          type="text"
          id="population"
          className={fieldClass}
          name="population"
          onChange={onChangeHandler}
          value={data.population}
          placeholder="e.g. 80"
        />
      </div>
      <div>
        <label htmlFor="unavailablerooms" className="block text-sm font-semibold text-b-blue mb-1.5">
          Unavailable Lecture Rooms
        </label>
        <select
          id="unavailablerooms"
          className={`${fieldClass} min-h-[120px]`}
          name="unavailablerooms"
          onChange={handleRoomsChange}
          value={data.unavailablerooms}
          multiple
        >
          {rooms.map((room: any, i: number) => (
            <option key={i} value={room.roomname}>
              {room.roomname}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-gray-400 font-light mt-1.5">
          Hold Ctrl (or Cmd) to select multiple rooms.
        </p>
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
                Classes
              </h1>
              <p className="text-sm text-gray-400 font-light mt-1">
                Manage classes and their scheduling constraints
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
                <span className="hidden sm:inline">Add Class</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </header>

          {/* List card */}
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-b-blue text-lg">Available Classes</h2>
              <span className="text-xs font-medium text-gray-400">
                {list.length} {list.length === 1 ? 'class' : 'classes'}
              </span>
            </div>

            {list.length === 0 ? (
              <div className="flex flex-col items-center text-center py-12">
                <span className="h-12 w-12 rounded-xl bg-page-bg flex items-center justify-center text-accent mb-3">
                  <Presentation size={22} />
                </span>
                <p className="text-sm text-gray-400 font-light max-w-xs">
                  No classes yet. Add your first class to get started.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-page-bg">
                        <th className="font-semibold py-3 pr-4">Name</th>
                        <th className="font-semibold py-3 pr-4">Population</th>
                        <th className="font-semibold py-3 pr-4">Courses</th>
                        <th className="font-semibold py-3 pr-4">Unavailable Rooms</th>
                        <th className="font-semibold py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((sclass: any, index: number) => (
                        <tr key={index} className="border-b border-page-bg last:border-0 align-top">
                          <td className="py-4 pr-4 font-medium text-b-blue">{sclass.className}</td>
                          <td className="py-4 pr-4 text-gray-600">{sclass.population}</td>
                          <td className="py-4 pr-4 text-gray-600">
                            <p>
                              {sclass.semester}
                              {sclass.level ? ` · Level ${sclass.level}` : ''}
                            </p>
                            <p className="text-xs text-gray-400 font-light">
                              {classCourseList(sclass)
                                .map((c) => `${c.course} (${c.meetings}×)`)
                                .join(', ') || '—'}
                            </p>
                          </td>
                          <td className="py-4 pr-4 text-gray-600">
                            {sclass.unavailablerooms.join(', ')}
                          </td>
                          <td className="py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                aria-label="Edit class"
                                onClick={() => handleEdit(sclass._id)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-accent transition-colors"
                              >
                                <SquarePen className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                aria-label="Delete class"
                                onClick={() => removeItem(sclass._id)}
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
                  {list.map((sclass: any, index: number) => (
                    <div key={index} className="rounded-xl border border-page-bg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-b-blue truncate">{sclass.className}</p>
                          <p className="text-xs text-gray-400 font-light mt-0.5">
                            {sclass.semester}
                            {sclass.level ? ` · Level ${sclass.level}` : ''} ·{' '}
                            {classCourseList(sclass).map((c) => c.course).join(', ') || '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            aria-label="Edit class"
                            onClick={() => handleEdit(sclass._id)}
                            className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 bg-page-bg hover:text-accent transition-colors"
                          >
                            <SquarePen className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete class"
                            onClick={() => removeItem(sclass._id)}
                            className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 bg-page-bg hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-page-bg space-y-1 text-xs text-gray-500">
                        <p>
                          <span className="font-medium text-gray-400">Population:</span>{' '}
                          {sclass.population}
                        </p>
                        <p>
                          <span className="font-medium text-gray-400">Unavailable rooms:</span>{' '}
                          {sclass.unavailablerooms.length
                            ? sclass.unavailablerooms.join(', ')
                            : '—'}
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

      {/* Add class modal */}
      {Clclicked && (
        <div
          className="sheet-scrim fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
          onClick={handleClosed}
        >
          <div
            className="sheet-card w-full sm:max-w-md bg-white rounded-2xl shadow-xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-b-blue rounded-t-2xl px-6 py-5">
              <h2 className="text-white font-semibold text-lg">Add New Class</h2>
              <p className="text-white/60 text-xs mt-0.5">Create a class for scheduling</p>
            </div>
            {renderClassForm(onSubmitHandler, handleClosed, 'Add Class')}
          </div>
        </div>
      )}

      {/* Edit class modal */}
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
              <h2 className="text-white font-semibold text-lg">Update Class Info</h2>
              <p className="text-white/60 text-xs mt-0.5">Update this class&apos;s details</p>
            </div>
            {renderClassForm(onEditSubmitHandler, handleCloseEdit, 'Save Changes')}
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
