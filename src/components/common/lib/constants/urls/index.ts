// User APIs
export const getUserById = '/api/user/getUserById';
export const getAllUsers = '/api/user/getAllUsers';
export const createUser = '/api/user/register';
export const insertUser = '/api/user/insertUser';
export const updateUser = '/api/user/updateUser';
export const deleteUser = '/api/user/deleteUser';
export const deleteManyUsers = '/api/user/deleteManyUsers';

// Profile APIs
export const getAllProfiles = '/api/profile/getAllProfiles';
export const getProfileByPhone = '/api/profile/getProfileByPhone';
export const getProfileById = '/api/profile/getProfileById';
export const createProfile = '/api/profile/createProfile';
export const insertProfile = '/api/profile/insertProfile';
export const updateProfile = '/api/profile/updateProfile';
export const deleteProfile = '/api/profile/deleteProfile';
export const getMembersById = '/api/profile/getMembersById';
export const addMember = '/api/profile/addMember';
export const shareMember = '/api/profile/shareMember';
export const unshareMember = '/api/profile/unshareMember';
export const getPendingShares = '/api/profile/getPendingShares';
export const acceptSharedMember = '/api/profile/acceptSharedMember';
export const rejectSharedMember = '/api/profile/rejectSharedMember';
export const requestDoctorStatus = '/api/profile/requestDoctorStatus';
export const getDoctorRequests = '/api/profile/getDoctorRequests';
export const approveDoctor = '/api/profile/approveDoctor';
export const uploadCertificate = '/api/profile/uploadCertificate';
export const uploadCertificateToS3 = '/api/upload/certificate';
export const deleteCertificate = '/api/profile/deleteCertificate';
export const uploadProfileImageToS3 = '/api/upload/profileImage';
export const analyzeBodyImpact = '/api/profile/analyzeBodyImpact';
export const analyzeDiagnosedConditions = '/api/profile/analyzeDiagnosedConditions';
export const analyzeBodyCoordinates = '/api/body/analyzeCoordinates';
export const markVaccineCompleted = '/api/profile/markVaccineCompleted';
export const updateVaccineCompletion = '/api/profile/updateVaccineCompletion';
export const deleteVaccineCompletion = '/api/profile/deleteVaccineCompletion';

// Members APIs
export const getSharedMembers = '/api/members/getSharedMembers';
export const getSharedMemById = '/api/members/getSharedMemById';
export const getSharedMemByContact = '/api/members/getSharedMemByContact';
export const shareProfile = '/api/members/insertSharedMem';
export const updateSharedMem = '/api/members/updateSharedMem';

// Reports APIs
export const getReports = '/api/reports/getReports';
export const insertReport = '/api/reports/insertReport';
export const updateReport = '/api/reports/updateReport';
export const deleteReport = '/api/reports/deleteReport';
export const getManyReports = '/api/reports/getManyReports';
export const getManyReportById = '/api/reports/getManyReportById';
export const getReportsByMembers = '/api/reports/getReportsByMembers';
export const getPendingSharedReports = '/api/reports/getPendingSharedReports';
export const uploadReportToS3 = '/api/upload/report';
export const getSignedUrl = '/api/upload/getSignedUrl';

// Vaccine APIs
export const getVaccines = '/api/vaccine/getVaccines';
export const getVaccine = '/api/vaccine/getVaccine';
export const addVaccine = '/api/vaccine/create';
export const updateVaccine = '/api/vaccine/update';
export const deleteVaccine = '/api/vaccine/delete';

// Dose APIs
export const getDoses = '/api/dose/getDoses';
export const getDose = '/api/dose/getDose';
export const addDose = '/api/dose/create';
export const updateDose = '/api/dose/update';
export const deleteDose = '/api/dose/delete';

// Dose Duration APIs
export const getDoseDurations = '/api/doseDuration/getDoseDurations';
export const getDoseDuration = '/api/doseDuration/getDoseDuration';
export const addDoseDuration = '/api/doseDuration/create';
export const updateDoseDuration = '/api/doseDuration/update';
export const deleteDoseDuration = '/api/doseDuration/delete';

// Health Topic APIs
export const getHealthTopics = '/api/healthTopic/getHealthTopics';
export const getHealthTopic = '/api/healthTopic/getHealthTopic';
export const addHealthTopic = '/api/healthTopic/create';
export const updateHealthTopic = '/api/healthTopic/update';
export const deleteHealthTopic = '/api/healthTopic/delete';

// Report Type APIs
export const getReportTypes = '/api/reportType/getReportTypes';
export const getReportType = '/api/reportType/getReportType';
export const addReportType = '/api/reportType/create';
export const updateReportType = '/api/reportType/update';
export const deleteReportType = '/api/reportType/delete';

// Keyword APIs
export const getKeywords = '/api/keyword/getKeywords';
export const getKeyword = '/api/keyword/getKeyword';
export const addKeyword = '/api/keyword/create';
export const updateKeyword = '/api/keyword/update';
export const deleteKeyword = '/api/keyword/delete';

// Query APIs
export const getQueries = '/api/queries/getQueries';
export const insertQueries = '/api/queries/insertQueries';
export const updateQueries = '/api/queries/updateQueries';
export const deleteQueries = '/api/queries/deleteQueries';

// Razorpay APIs
export const createSubscriptionOrder = '/api/razorpay/createSubscriptionOrder';
export const listSubscriptionOrders = '/api/razorpay/listSubscriptionOrders';
export const paySubscriptionOrder = '/api/razorpay/paySubscriptionOrder';

// Other APIs
export const sendMail = '/api/sendMail';
export const subscribeUserToNewsletter = '/api/subscribeUserToNewsletter';

