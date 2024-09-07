'use client';

import moment from 'moment';

interface PatientInfoProps {
  record: any;
}

const calculateAge = (dob: string | Date | undefined) => {
  if (!dob) return 'N/A';
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

const PatientInfo = ({ record }: PatientInfoProps) => {
  // Extract patient data - handle multiple possible structures
  const patient = record?.patient || {};
  
  // Patient name - check multiple possible locations
  const patientName = patient?.name || 
    record?.userName || 
    record?.patientName ||
    (typeof patient === 'string' ? patient : null) ||
    'N/A';
  
  // Patient DOB - check multiple possible locations
  const patientDOB = patient?.dob || 
    record?.patient?.dob ||
    record?.dob;
  
  // Patient gender - check multiple possible locations and formats
  const patientGender = patient?.gender || 
    record?.patient?.gender ||
    record?.gender ||
    (patient?.sex ? patient.sex : null) || // Some reports use 'sex' instead of 'gender'
    'N/A';
  
  // Patient contact - check multiple possible locations
  const patientContact = patient?.contact?.phone || 
    patient?.phone ||
    record?.patient?.contact?.phone ||
    record?.phone ||
    '';
  
  // Patient PID
  const patientPID = patient?.pid || 
    record?.patient?.pid ||
    record?.pid ||
    '';

  // Get diagnostic center and branch - ensure we only use strings, not objects
  const diagnosticCenter = (typeof record?.diagnosticCenter === 'string' ? record.diagnosticCenter : null) ||
    record?.diagnosticCenter?.diagnostic?.name || 
    record?.diagnosticCenter?.name ||
    'N/A';
  const branch = (typeof record?.branch === 'string' ? record.branch : null) ||
    record?.diagnosticCenter?.branch?.name || 
    record?.branch?.name ||
    '';
  const branchName = branch ? `${diagnosticCenter} - ${branch}` : diagnosticCenter;

  const pathologist = record?.pathologist?.name || 
    record?.createdBy || 
    'N/A';

  // Report dates
  const reportDate = record?.reportData?.reportDate || record?.reportDate;
  const uploadDate = record?.reportData?.updatedDate || record?.uploadDate || record?.uploadedAt;

  return (
    <div className="mx-0 sm:mx-6 md:mx-10 my-2 sm:my-5 p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
        <div className="flex-1 w-full sm:border-r sm:border-gray-400 sm:pr-4 md:pr-6 pb-4 sm:pb-0 border-b sm:border-b-0 border-gray-300">
          <div>
            <h2 className="text-base sm:text-lg font-semibold mb-2 break-words">{patientName}</h2>
            {patientDOB && <p className="text-xs sm:text-sm mb-1">Age: {calculateAge(patientDOB)}</p>}
            <p className="text-xs sm:text-sm mb-1">Sex: {patientGender}</p>
            {patientContact && <p className="text-xs sm:text-sm mb-1 break-all">Contact: {patientContact}</p>}
            {patientPID && <p className="text-xs sm:text-sm break-all">PID: {patientPID}</p>}
          </div>
        </div>
        <div className="flex-1 w-full sm:border-r sm:border-gray-400 sm:px-4 md:px-6 pb-4 sm:pb-0 border-b sm:border-b-0 border-gray-300">
          <div>
            <h3 className="text-left text-sm sm:text-base font-semibold mb-2">Sample Collected From:</h3>
            <p className="text-xs sm:text-sm mb-2 break-words">{branchName}</p>
            <p className="text-xs sm:text-sm break-words">Pathologist: {pathologist}</p>
          </div>
        </div>
        <div className="flex-1 w-full sm:px-4 md:px-6">
          <div className="text-xs sm:text-sm">
            <h3 className="text-left text-sm sm:text-base font-semibold mb-2">Report Dates:</h3>
            <p className="mb-1 break-words">
              <span className="font-bold">Report Generate Date:</span>{' '}
              {reportDate ? moment(reportDate).format('MM-DD-YYYY') : 'N/A'}
            </p>
            <p className="break-words">
              <span className="font-bold">Report Uploaded Date:</span>{' '}
              {uploadDate ? moment(uploadDate).format('MM-DD-YYYY') : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientInfo;

