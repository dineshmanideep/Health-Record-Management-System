const getDoctorPatientRecordHelp = () => ({
  page: 'Doctor Patient Records',
  whatToDo: [
    'Review the patient timeline and check the latest uploaded reports.',
    'Compare trend changes before deciding next treatment notes.',
    'Use assignment or follow-up actions to delegate next steps.'
  ],
  primaryButtons: ['Back', 'Assign Record', 'Upload or View Documents']
});

export const getVoiceHelpContent = (pathname) => {
  const route = pathname || '/';

  if (route === '/') {
    return {
      page: 'Home',
      whatToDo: [
        'Read the platform overview and choose your next action.',
        'Use login if you already have access, or signup to create an account.'
      ],
      primaryButtons: ['Login', 'Signup']
    };
  }

  if (route === '/login') {
    return {
      page: 'Login',
      whatToDo: [
        'Enter your registered email and password.',
        'Submit the form to open your role-specific dashboard.'
      ],
      primaryButtons: ['Login', 'Show or Hide Password']
    };
  }

  if (route === '/signup') {
    return {
      page: 'Signup',
      whatToDo: [
        'Fill all required profile and account fields.',
        'Use a strong password and confirm it correctly before submitting.'
      ],
      primaryButtons: ['Create Account', 'Password Strength Indicator']
    };
  }

  if (route === '/dashboard') {
    return {
      page: 'Role Redirect Dashboard',
      whatToDo: [
        'Wait while your account role is validated.',
        'You will be redirected to your role dashboard automatically.'
      ],
      primaryButtons: ['Continue']
    };
  }

  if (route === '/unauthorized') {
    return {
      page: 'Unauthorized',
      whatToDo: [
        'Your current role cannot access this page.',
        'Go back and open pages available for your role permissions.'
      ],
      primaryButtons: ['Back to Dashboard']
    };
  }

  if (route.startsWith('/patient')) {
    if (route === '/patient/dashboard') {
      return {
        page: 'Patient Dashboard',
        whatToDo: [
          'Check your record summary and recent updates first.',
          'Use quick links to open records, analytics, and watch insights.'
        ],
        primaryButtons: ['Medical Records', 'Health Analytics', 'Watch Insights']
      };
    }

    if (route === '/patient/records') {
      return {
        page: 'Patient Medical Records',
        whatToDo: [
          'Open a record group and review diagnosis and test documents.',
          'Use AI summary text for a quick understanding before details.'
        ],
        primaryButtons: ['View Record', 'Expand Details', 'Download Document']
      };
    }

    if (route === '/patient/health-analytics') {
      return {
        page: 'Patient Health Analytics',
        whatToDo: [
          'Choose a report type and compare values across dates.',
          'Read trend summary and chart labels to understand direction changes.'
        ],
        primaryButtons: ['Report Selector', 'Date Controls', 'Chart Legends']
      };
    }

    if (route === '/patient/smartwatch-insights') {
      return {
        page: 'Patient Smartwatch Insights',
        whatToDo: [
          'Review wearable metrics and look for unusual spikes.',
          'Track consistency over time and share concerns with clinicians.'
        ],
        primaryButtons: ['Refresh Data', 'Metric Filters']
      };
    }

    if (route === '/patient/activity-logs') {
      return {
        page: 'Patient Activity Logs',
        whatToDo: [
          'Scan recent system activity to verify account actions.',
          'Report unknown actions to your provider or support team.'
        ],
        primaryButtons: ['Filter Logs', 'Date Range']
      };
    }

    if (route === '/patient/profile') {
      return {
        page: 'Patient Profile',
        whatToDo: [
          'Update your personal and medical baseline information.',
          'Save changes to keep your care team synchronized.'
        ],
        primaryButtons: ['Edit Profile', 'Save Changes']
      };
    }
  }

  if (route.startsWith('/doctor')) {
    if (route === '/doctor/dashboard') {
      return {
        page: 'Doctor Dashboard',
        whatToDo: [
          'Review pending patient tasks and assignment progress.',
          'Prioritize patients requiring immediate follow-up.'
        ],
        primaryButtons: ['My Patients', 'Record Entry', 'Audit Logs']
      };
    }

    if (route === '/doctor/patients') {
      return {
        page: 'Doctor Patients',
        whatToDo: [
          'Open a patient card to inspect details and recent records.',
          'Use record actions to continue diagnosis workflow.'
        ],
        primaryButtons: ['Open Patient', 'View Records']
      };
    }

    if (route.startsWith('/doctor/patient-records/')) {
      return getDoctorPatientRecordHelp();
    }

    if (route === '/doctor/assign-records') {
      return {
        page: 'Doctor Assign Records',
        whatToDo: [
          'Click New Assignment, then choose patient, nurse, and facility.',
          'Add clear clinical directives, optional due date, and attachments or voice note.',
          'Submit only after all required fields are complete.'
        ],
        primaryButtons: ['New Assignment', 'Create Assignment', 'Voice Note Upload']
      };
    }

    if (route === '/doctor/audit-logs') {
      return {
        page: 'Doctor Audit Logs',
        whatToDo: [
          'Review action history for accountability and traceability.',
          'Filter by date or event type to find specific operations quickly.'
        ],
        primaryButtons: ['Filter', 'Date Range']
      };
    }

    if (route === '/doctor/profile') {
      return {
        page: 'Doctor Profile',
        whatToDo: [
          'Maintain contact and specialization details accurately.',
          'Save updates so downstream assignments and identity views stay correct.'
        ],
        primaryButtons: ['Edit Profile', 'Save Changes']
      };
    }
  }

  if (route.startsWith('/nurse')) {
    if (route === '/nurse/dashboard') {
      return {
        page: 'Nurse Dashboard',
        whatToDo: [
          'Check assigned tasks and prioritize pending work.',
          'Open doctor tasks or test-center tasks based on urgency.'
        ],
        primaryButtons: ['Doctor Tasks', 'Test Center']
      };
    }

    if (route === '/nurse/assignments') {
      return {
        page: 'Nurse Assignments',
        whatToDo: [
          'Open an assignment and read doctor instructions first.',
          'Review attached files, voice note, and transcript before submitting outputs.'
        ],
        primaryButtons: ['Open Assignment', 'Mark In Progress', 'Submit Work']
      };
    }

    if (route === '/nurse/test-assignments') {
      return {
        page: 'Nurse Test Assignments',
        whatToDo: [
          'Collect and upload test documents carefully.',
          'Verify report type and patient match before final submission.'
        ],
        primaryButtons: ['Upload Test', 'Submit Assignment']
      };
    }

    if (route === '/nurse/audit-logs') {
      return {
        page: 'Nurse Audit Logs',
        whatToDo: [
          'Use this page to trace task history and status changes.',
          'Filter events to investigate incomplete or delayed actions.'
        ],
        primaryButtons: ['Filter', 'Date Range']
      };
    }

    if (route === '/nurse/profile') {
      return {
        page: 'Nurse Profile',
        whatToDo: [
          'Update role details and contact information.',
          'Save profile changes to keep assignment mapping accurate.'
        ],
        primaryButtons: ['Edit Profile', 'Save Changes']
      };
    }
  }

  if (route.startsWith('/hospital')) {
    if (route === '/hospital/dashboard') {
      return {
        page: 'Hospital Dashboard',
        whatToDo: [
          'Review staffing, test workflows, and operational metrics.',
          'Use management sections to update doctors, nurses, and tests.'
        ],
        primaryButtons: ['Doctors', 'Nurses', 'Test Types', 'Assignments']
      };
    }

    if (route === '/hospital/doctors') {
      return {
        page: 'Hospital Doctors',
        whatToDo: [
          'Add or manage doctor profiles and affiliations.',
          'Confirm details before activating operational access.'
        ],
        primaryButtons: ['Add Doctor', 'Edit Doctor', 'Save']
      };
    }

    if (route === '/hospital/nurses') {
      return {
        page: 'Hospital Nurses',
        whatToDo: [
          'Manage nurse records and assignment readiness.',
          'Keep contact and unit details up to date.'
        ],
        primaryButtons: ['Add Nurse', 'Edit Nurse', 'Save']
      };
    }

    if (route === '/hospital/tests') {
      return {
        page: 'Hospital Test Types',
        whatToDo: [
          'Create or update available test categories.',
          'Use clear names and expected parameters for consistency.'
        ],
        primaryButtons: ['Add Test Type', 'Update Test Type']
      };
    }

    if (route === '/hospital/test-assignments') {
      return {
        page: 'Hospital Test Assignments',
        whatToDo: [
          'Assign tests to staff and track completion states.',
          'Review workload balance and pending queues.'
        ],
        primaryButtons: ['Create Assignment', 'Filter Status']
      };
    }

    if (route === '/hospital/audit-logs') {
      return {
        page: 'Hospital Audit Logs',
        whatToDo: [
          'Inspect critical system actions and operational events.',
          'Use logs for compliance checks and process improvement.'
        ],
        primaryButtons: ['Filter', 'Date Range']
      };
    }

    if (route === '/hospital/profile') {
      return {
        page: 'Hospital Profile',
        whatToDo: [
          'Maintain organization metadata and contact channels.',
          'Save updates to keep integrations and visibility correct.'
        ],
        primaryButtons: ['Edit Profile', 'Save Changes']
      };
    }
  }

  if (route.startsWith('/admin')) {
    if (route === '/admin/dashboard') {
      return {
        page: 'Admin Dashboard',
        whatToDo: [
          'Track overall platform operations across organizations.',
          'Use quick actions to manage hospitals and clinical users.'
        ],
        primaryButtons: ['Hospitals', 'Doctors', 'Nurses']
      };
    }

    if (route === '/admin/hospitals') {
      return {
        page: 'Admin Hospitals',
        whatToDo: [
          'Create and maintain hospital accounts and status.',
          'Verify details before enabling access.'
        ],
        primaryButtons: ['Add Hospital', 'Edit Hospital', 'Save']
      };
    }

    if (route === '/admin/doctors') {
      return {
        page: 'Admin Doctors',
        whatToDo: [
          'Review doctor registrations and approvals.',
          'Assign proper affiliations and resolve pending requests.'
        ],
        primaryButtons: ['Approve', 'Edit', 'Search']
      };
    }

    if (route === '/admin/nurses') {
      return {
        page: 'Admin Nurses',
        whatToDo: [
          'Manage nurse onboarding and account state.',
          'Use filters to quickly find pending actions.'
        ],
        primaryButtons: ['Approve', 'Edit', 'Search']
      };
    }

    if (route === '/admin/profile') {
      return {
        page: 'Admin Profile',
        whatToDo: [
          'Keep your administrative account details updated.',
          'Save profile changes to preserve audit and communication accuracy.'
        ],
        primaryButtons: ['Edit Profile', 'Save Changes']
      };
    }
  }

  return {
    page: 'Current Page',
    whatToDo: [
      'Review visible instructions and complete required steps from top to bottom.',
      'If unsure, use the nearest primary action button shown in this section.'
    ],
    primaryButtons: ['Primary Action']
  };
};
