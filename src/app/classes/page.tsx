'use client';

import React, { useState, useContext, useEffect } from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import { Search, SquarePen, Trash2, Plus, Presentation } from 'lucide-react';
import { StoreContext } from '../../context/Storecontext';
import axios from 'axios';
import { toast } from 'react-toastify';

const Classes = () => {
  const { url } = useContext(StoreContext);
  const [Clclicked, setClClicked] = useState(false);
  const [edit, setEdit] = useState(false);
  const [editClassId, setEditClassId] = useState<any>(null);

  const [data, setData] = useState({
    className: "",
    course: "",
    semester: "",
    meetings: "",
    population: "",
    unavailablerooms: [] as string[]
  });

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

  const onSubmitHandler = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await axios.post(`${url}/api/class/add`, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      setData({
        className: "",
        course: "",
        semester: "",
        meetings: "",
        population: "",
        unavailablerooms: []
      });
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
    const response = await axios.put(`${url}/api/class/update/${editClassId}`, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      toast.success(response.data.message);
      setData({
        className: "",
        course: "",
        semester: "",
        meetings: "",
        population: "",
        unavailablerooms: []
      });
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
      setData({
        className: selectedClass.className,
        course: selectedClass.course,
        semester: selectedClass.semester,
        meetings: selectedClass.meetings,
        population: selectedClass.population,
        unavailablerooms: selectedClass.unavailablerooms
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
          placeholder="e.g. BSc IT Level 100"
        />
      </div>
      <div>
        <label htmlFor="course" className="block text-sm font-semibold text-b-blue mb-1.5">
          Course
        </label>
        <select className={fieldClass} id="course" name="course" onChange={onChangeHandler} value={data.course}>
          <option value="">Select a course</option>
          {courses.map((course: any, i: number) => (
            <option key={i} value={course}>{course}</option>
          ))}
        </select>
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
        <label htmlFor="meetings" className="block text-sm font-semibold text-b-blue mb-1.5">
          Meetings Per Week
        </label>
        <select className={fieldClass} id="meetings" name="meetings" onChange={onChangeHandler} value={data.meetings}>
          <option value="">Select number of meetings</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
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
                            <p>{sclass.semester}</p>
                            <p className="text-xs text-gray-400 font-light">{sclass.course}</p>
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
                            {sclass.semester} · {sclass.course}
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
