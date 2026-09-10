'use client';

import React, { Suspense, useState, useContext, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '../../components/sidebar/Sidebar';
import { Search, SquarePen, Trash2, Plus, Clock } from 'lucide-react';
import { StoreContext } from '../../context/Storecontext';
import axios from 'axios';
import { toast } from 'react-toastify';

const TimeandscheduleInner = () => {

  const { url } = useContext(StoreContext);
  const [edit, setEdit] = useState(false);
  const [editTimeId, seteditTimeId] = useState<any>(null);


  const [data, setData] = useState({
    startTime: "",
    endTime: ""
  });

const onChangeHandler = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const name = event.target.name;
  const value = event.target.value;
  setData(data => ({ ...data, [name]: value }));
};

const onSubmitHandler = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  const response = await axios.post(`${url}/api/time/add`, data, {
    headers: {
        'Content-Type': 'application/json'
    }
  });

  if (response.data.success) {
      setData({
        startTime: "",
        endTime: ""
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

const searchParams = useSearchParams();
const [list, setList] = useState<any[]>([]);
const [search, setSearch] = useState(searchParams.get('q') || '');

///fetching list from the database
const fetchList = async () => {
  const response = await axios.get(`${url}/api/time/list`);

  if (response.data.success) {
    setList(response.data.data);
  } else {
    toast.error("Error");
  }
};

// submitting edited info
const oneditsubmitHandler = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  const response = await axios.put(`${url}/api/time/update/${editTimeId}`, data, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

if (response.data.success) {
  toast.success(response.data.message);
  setData({
    startTime: "",
    endTime: ""
  });
  fetchList();
  handleCloseEdit();
} else {
  toast.error(response.data.message);
}

};

//remove item
const removeItem = async (timeId: any) => {
  const response = await axios.post(`${url}/api/time/remove`, { id: timeId });
  await fetchList();
  if (response.data.success) {
    toast.success(response.data.message);
  } else {
    toast.error("Error");
  }
};

const handleEdit = (id: any) => {
  const selectedTime = list.find((time: any) => time._id === id);
  if (selectedTime) {
    setData({
       startTime: selectedTime.startTime,
        endTime: selectedTime.endTime
    });
    // Set the clicked Time ID in the state (you can track it for update purposes
    seteditTimeId(id);
    // Open the edit modal
    setEdit(true);
  }
};

const handleCloseEdit = () => setEdit(false);

useEffect(() => {
  fetchList();
}, []);


  const [Tclicked, setTClicked] = useState(false);

  const handleClicked = () => {
    setTClicked(true);
  };

    const handleClosed = () =>  setTClicked(false);


    const generateTimeOptions = () => {
      const Times: string[] = [];
      for (let i = 7; i <= 21; i++) {
        const time = i < 12 ? `${i}:00 AM` : `${i - 12 === 0 ? 12 : i - 12}:00 PM`;
        Times.push(time);
      }
      return Times;
    };

    const generateTimeOptions2 = () => {
      const times: string[] = [];
      for (let i = 8; i <= 22; i++) {
        const time = i < 12 ? `${i}:00 AM` : `${i - 12 === 0 ? 12 : i - 12}:00 PM`;
        times.push(time);
      }
      return times;
    };

  // Shared modal field styling (matches the dashboard's generate modal).
  const fieldClass =
    'w-full border border-[#D8DEEC] rounded-[10px] px-3.5 py-3 bg-[#F7F9FD] text-sm text-b-blue focus:outline-none focus:border-accent focus:bg-white transition-colors';

  const renderTimeForm = (
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void,
    onCancel: () => void,
    submitLabel: string
  ) => (
    <form className="p-6 space-y-5" onSubmit={onSubmit}>
      <div>
        <span className="block text-sm font-semibold text-b-blue mb-1.5">Time Slot</span>
        <div className="flex items-center gap-3">
          <select
            name="startTime"
            id="start-time-select"
            className={fieldClass}
            onChange={onChangeHandler}
            value={data.startTime}
          >
            <option value="">Start</option>
            {generateTimeOptions().map((time, i) => (
              <option key={i} value={time}>{time}</option>
            ))}
          </select>
          <span className="text-xs font-semibold text-gray-400 shrink-0">TO</span>
          <select
            name="endTime"
            id="end-time-select"
            className={fieldClass}
            onChange={onChangeHandler}
            value={data.endTime}
          >
            <option value="">End</option>
            {generateTimeOptions2().map((time, i) => (
              <option key={i} value={time}>{time}</option>
            ))}
          </select>
        </div>
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

  // Free-text filter behind the header's search box.
  const term = search.trim().toLowerCase();
  const filtered = term
    ? list.filter((period: any) =>
        [period.startTime, period.endTime]
          .join(' ')
          .toLowerCase()
          .includes(term)
      )
    : list;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-page-bg">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-6 lg:mb-8">
            <div className="shrink-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-b-blue">
                Time &amp; Schedule
              </h1>
              <p className="text-sm text-gray-400 font-light mt-1">
                Define the time slots used to build timetables
              </p>
            </div>
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="flex items-center gap-2.5 bg-white rounded-xl px-4 h-11 lg:h-12 flex-1 sm:flex-none sm:w-56 md:w-64 border border-[#E8ECF6]">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search slots"
                  className="search-input bg-transparent text-sm w-full font-light text-gray-500 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleClicked}
                className="bg-accent text-white rounded-xl h-11 lg:h-12 px-4 font-semibold flex items-center gap-2 shrink-0 hover:brightness-105 transition whitespace-nowrap"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Add Schedule</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </header>

          {/* List card */}
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-b-blue text-lg">Time Slots</h2>
              <span className="text-xs font-medium text-gray-400">
                {filtered.length} {filtered.length === 1 ? 'slot' : 'slots'}
              </span>
            </div>

            {list.length === 0 ? (
              <div className="flex flex-col items-center text-center py-12">
                <span className="h-12 w-12 rounded-xl bg-page-bg flex items-center justify-center text-accent mb-3">
                  <Clock size={22} />
                </span>
                <p className="text-sm text-gray-400 font-light max-w-xs">
                  No time slots yet. Add your first slot to get started.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center text-center py-12">
                <p className="text-sm text-gray-400 font-light max-w-xs">
                  No slots match “{search.trim()}”.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-page-bg">
                        <th className="font-semibold py-3 pr-4">Period</th>
                        <th className="font-semibold py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((period: any, index: number) => (
                        <tr key={index} className="border-b border-page-bg last:border-0">
                          <td className="py-4 pr-4">
                            <span className="inline-flex items-center gap-2 font-medium text-b-blue">
                              <Clock size={16} className="text-accent" />
                              {period.startTime}
                              <span className="text-xs font-normal text-gray-400">to</span>
                              {period.endTime}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                aria-label="Edit time slot"
                                onClick={() => handleEdit(period._id)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-accent transition-colors"
                              >
                                <SquarePen className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                aria-label="Delete time slot"
                                onClick={() => removeItem(period._id)}
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

                {/* Mobile cards */}
                <div className="sm:hidden space-y-3">
                  {filtered.map((period: any, index: number) => (
                    <div
                      key={index}
                      className="rounded-xl border border-page-bg p-4 flex items-center justify-between gap-3"
                    >
                      <span className="inline-flex items-center gap-2 font-medium text-b-blue text-sm min-w-0">
                        <Clock size={16} className="text-accent shrink-0" />
                        <span className="truncate">
                          {period.startTime} – {period.endTime}
                        </span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          aria-label="Edit time slot"
                          onClick={() => handleEdit(period._id)}
                          className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 bg-page-bg hover:text-accent transition-colors"
                        >
                          <SquarePen className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete time slot"
                          onClick={() => removeItem(period._id)}
                          className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 bg-page-bg hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Add time slot modal */}
      {Tclicked && (
        <div
          className="sheet-scrim fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
          onClick={handleClosed}
        >
          <div
            className="sheet-card w-full sm:max-w-md bg-white rounded-2xl shadow-xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-b-blue rounded-t-2xl px-6 py-5">
              <h2 className="text-white font-semibold text-lg">Add Time Slot</h2>
              <p className="text-white/60 text-xs mt-0.5">Define a start and end time</p>
            </div>
            {renderTimeForm(onSubmitHandler, handleClosed, 'Add')}
          </div>
        </div>
      )}

      {/* Edit time slot modal */}
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
              <h2 className="text-white font-semibold text-lg">Edit Time Slot</h2>
              <p className="text-white/60 text-xs mt-0.5">Update this time slot</p>
            </div>
            {renderTimeForm(oneditsubmitHandler, handleCloseEdit, 'Save Changes')}
          </div>
        </div>
      )}
    </div>
  );
};

// useSearchParams needs a Suspense boundary for this page to keep prerendering.
const Timeandschedule = () => (
  <Suspense>
    <TimeandscheduleInner />
  </Suspense>
);

export default Timeandschedule;
