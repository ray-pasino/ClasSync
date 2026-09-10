'use client';

import React from 'react';
import LecturerSidebar from '../../components/lecturersidebar/LecturerSidebar';
import AlertsManager from '../../components/alertsmanager/AlertsManager';

const Lectureralerts = () => (
  <div className="flex w-full">
    <LecturerSidebar />
    <main className="min-w-0 flex-1">
      <AlertsManager
        basePath="/api/lecturer"
        heading="Alerts"
        subheading="Changes and cancellations for the classes you teach"
      />
    </main>
  </div>
);

export default Lectureralerts;
