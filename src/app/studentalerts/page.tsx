'use client';

import React from 'react';
import StudentSidebar from '../../components/studentsidebar/StudentSidebar';
import AlertsManager from '../../components/alertsmanager/AlertsManager';

const Studentalerts = () => (
  <div className="flex w-full">
    <StudentSidebar />
    <main className="min-w-0 flex-1">
      <AlertsManager
        basePath="/api/student"
        heading="Alerts"
        subheading="Class changes and cancellations for your cohort"
      />
    </main>
  </div>
);

export default Studentalerts;
