'use client';


import React, { useContext, useState, useEffect } from 'react';
import Sidebar from '../../components/sidebar/Sidebar';
import { Search, SquarePen, Trash2, Plus, DoorOpen } from 'lucide-react';
import { StoreContext } from '../../context/Storecontext';
import axios from 'axios';
import { toast } from 'react-toastify';

const Lecturerooms = () => {

  const [clicked, setClicked] = useState(false);
  const [edit, setEdit] = useState(false);
  const [editRoomId, setEditRoomId] = useState<any>(null);

  const handleClicked = () => {
    setClicked(true);
  };

  const handleEdit = (id: any) => {
    const selectedRoom = list.find((room: any) => room._id === id);
    if (selectedRoom) {
      setData({
        roomname: selectedRoom.roomname,
        capacity: selectedRoom.capacity,
      });
      // Set the clicked room ID in the state (you can track it for update purposes)
      setEditRoomId(id);
      // Open the edit modal
      setEdit(true);
    }
  };


  const handleClosed = () =>  setClicked(false);

  const handleCloseEdit = () => setEdit(false);

  const { url } = useContext(StoreContext);


  const [data, setData] = useState({
    roomname: "",
    capacity: "",
  });


const onChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
  const name = event.target.name;
  const value = event.target.value;
  setData(data => ({ ...data, [name]: value }));
};


const onSubmitHandler = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  const response = await axios.post(`${url}/api/room/add`, data, {
    headers: {
        'Content-Type': 'application/json'
    }
  });

  if (response.data.success) {
      setData({
          roomname: "",
          capacity: "",
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

///fetching list from the database
const fetchList = async () => {
  const response = await axios.get(`${url}/api/room/list`);

  if (response.data.success) {
    setList(response.data.data);
  } else {
    toast.error("Error");
  }
};

// submitting edited info
const oneditsubmitHandler = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  const response = await axios.put(`${url}/api/room/update/${editRoomId}`, data, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

if (response.data.success) {
  toast.success(response.data.message);
  setData({
    roomname: "",
    capacity: "",
  });
  fetchList();
  handleCloseEdit();
} else {
  toast.error(response.data.message);
}

};

//remove item
const removeItem = async (itemId: any) => {
  const response = await axios.post(`${url}/api/room/remove`, { id: itemId });
  await fetchList();
  if (response.data.success) {
    toast.success(response.data.message);
  } else {
    toast.error("Error");
  }
};

useEffect(() => {
  fetchList();
}, []);

  // Shared modal field styling (matches the dashboard's generate modal).
  const fieldClass =
    'w-full border border-[#D8DEEC] rounded-[10px] px-3.5 py-3 bg-[#F7F9FD] text-sm text-b-blue focus:outline-none focus:border-accent focus:bg-white transition-colors';

  const renderRoomForm = (
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void,
    onCancel: () => void,
    submitLabel: string
  ) => (
    <form className="p-6 space-y-5" onSubmit={onSubmit}>
      <div>
        <label htmlFor="roomname" className="block text-sm font-semibold text-b-blue mb-1.5">
          Room Name
        </label>
        <input
          type="text"
          id="roomname"
          className={fieldClass}
          name="roomname"
          onChange={onChangeHandler}
          value={data.roomname}
          placeholder="e.g. Auditorium A"
        />
      </div>
      <div>
        <label htmlFor="capacity" className="block text-sm font-semibold text-b-blue mb-1.5">
          Capacity
        </label>
        <input
          type="text"
          id="capacity"
          className={fieldClass}
          name="capacity"
          onChange={onChangeHandler}
          value={data.capacity}
          placeholder="e.g. 120"
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
                Lecture Rooms
              </h1>
              <p className="text-sm text-gray-400 font-light mt-1">
                Manage the rooms available for scheduling
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
                <span className="hidden sm:inline">Add Room</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </header>

          {/* List card */}
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-b-blue text-lg">All Rooms</h2>
              <span className="text-xs font-medium text-gray-400">
                {list.length} {list.length === 1 ? 'room' : 'rooms'}
              </span>
            </div>

            {list.length === 0 ? (
              <div className="flex flex-col items-center text-center py-12">
                <span className="h-12 w-12 rounded-xl bg-page-bg flex items-center justify-center text-accent mb-3">
                  <DoorOpen size={22} />
                </span>
                <p className="text-sm text-gray-400 font-light max-w-xs">
                  No lecture rooms yet. Add your first room to get started.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-gray-400 border-b border-page-bg">
                        <th className="font-semibold py-3 pr-4">Room Name</th>
                        <th className="font-semibold py-3 pr-4">Capacity</th>
                        <th className="font-semibold py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((room: any, index: number) => (
                        <tr key={index} className="border-b border-page-bg last:border-0">
                          <td className="py-4 pr-4 font-medium text-b-blue">{room.roomname}</td>
                          <td className="py-4 pr-4 text-gray-600">{room.capacity}</td>
                          <td className="py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                aria-label="Edit room"
                                onClick={() => handleEdit(room._id)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:text-accent transition-colors"
                              >
                                <SquarePen className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                aria-label="Delete room"
                                onClick={() => removeItem(room._id)}
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
                  {list.map((room: any, index: number) => (
                    <div
                      key={index}
                      className="rounded-xl border border-page-bg p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-b-blue truncate">{room.roomname}</p>
                        <p className="text-xs text-gray-400 font-light mt-0.5">
                          Capacity: {room.capacity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          aria-label="Edit room"
                          onClick={() => handleEdit(room._id)}
                          className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 bg-page-bg hover:text-accent transition-colors"
                        >
                          <SquarePen className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete room"
                          onClick={() => removeItem(room._id)}
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

      {/* Add room modal */}
      {clicked && (
        <div
          className="sheet-scrim fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
          onClick={handleClosed}
        >
          <div
            className="sheet-card w-full sm:max-w-md bg-white rounded-2xl shadow-xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-b-blue rounded-t-2xl px-6 py-5">
              <h2 className="text-white font-semibold text-lg">Add Lecture Room</h2>
              <p className="text-white/60 text-xs mt-0.5">
                Create a room available for scheduling
              </p>
            </div>
            {renderRoomForm(onSubmitHandler, handleClosed, 'Add Room')}
          </div>
        </div>
      )}

      {/* Edit room modal */}
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
              <h2 className="text-white font-semibold text-lg">Edit Lecture Room</h2>
              <p className="text-white/60 text-xs mt-0.5">Update this room&apos;s details</p>
            </div>
            {renderRoomForm(oneditsubmitHandler, handleCloseEdit, 'Save Changes')}
          </div>
        </div>
      )}
    </div>
  );
};

export default Lecturerooms;
