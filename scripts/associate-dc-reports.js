/**
 * Associate DC Reports with Generated Users
 * 
 * This script fetches reports from the DC app API and documents
 * which phone numbers from the dummy data can access them.
 * 
 * Usage:
 *   node scripts/associate-dc-reports.js
 */

const DC_API_URL = process.env.DC_API_URL || 'http://omerald-dc.vercel.app/api/reports';

// Generated user phone numbers
const GENERATED_PHONE_NUMBERS = [
  '+15555550100',
  '+15555550101',
  '+15555550102',
  '+15555550103',
  '+15555550104',
  '+15555550105',
  '+15555550106',
  '+15555550107',
  '+15555550108',
  '+15555550109',
];

async function fetchDCReports() {
  try {
    console.log('📡 Fetching reports from DC app...\n');
    const response = await fetch(DC_API_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error('API returned unsuccessful response');
    }
    
    return result.data?.data || [];
  } catch (error) {
    console.error('❌ Error fetching DC reports:', error.message);
    return [];
  }
}

function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\s/g, '').replace(/-/g, '');
}

function analyzeReports(reports) {
  console.log(`📊 Analyzing ${reports.length} reports from DC app...\n`);
  
  const phoneToReports = new Map();
  const unmatchedReports = [];
  
  // Initialize map for all generated phone numbers
  GENERATED_PHONE_NUMBERS.forEach(phone => {
    phoneToReports.set(normalizePhone(phone), []);
  });
  
  reports.forEach(report => {
    const patientPhone = normalizePhone(report.patient?.contact?.phone || '');
    const sharedDetails = report.sharedReportDetails || [];
    
    // Check if report matches any generated user
    let matched = false;
    
    // Check patient phone
    if (patientPhone && phoneToReports.has(patientPhone)) {
      phoneToReports.get(patientPhone).push({
        reportId: report.id,
        reportName: report.reportData?.reportName || 'Unknown',
        matchType: 'patient',
        sharedStatus: null,
      });
      matched = true;
    }
    
    // Check shared report details
    sharedDetails.forEach(detail => {
      const sharedPhone = normalizePhone(detail.userContact || '');
      if (sharedPhone && phoneToReports.has(sharedPhone)) {
        phoneToReports.get(sharedPhone).push({
          reportId: report.id,
          reportName: report.reportData?.reportName || 'Unknown',
          matchType: 'shared',
          sharedStatus: detail.accepted ? 'accepted' : 'pending',
          sharedAt: detail.sharedAt,
        });
        matched = true;
      }
    });
    
    if (!matched) {
      unmatchedReports.push({
        reportId: report.id,
        patientPhone: patientPhone || 'N/A',
        reportName: report.reportData?.reportName || 'Unknown',
      });
    }
  });
  
  // Display results
  console.log('✅ Reports matched to generated users:\n');
  let totalMatched = 0;
  
  phoneToReports.forEach((reports, phone) => {
    if (reports.length > 0) {
      totalMatched += reports.length;
      console.log(`📱 ${phone}:`);
      reports.forEach(r => {
        console.log(`   - ${r.reportName} (${r.matchType}${r.sharedStatus ? `, ${r.sharedStatus}` : ''})`);
      });
      console.log('');
    }
  });
  
  console.log(`\n📈 Summary:`);
  console.log(`   - Total reports in DC: ${reports.length}`);
  console.log(`   - Reports matched to generated users: ${totalMatched}`);
  console.log(`   - Unmatched reports: ${unmatchedReports.length}`);
  
  if (unmatchedReports.length > 0) {
    console.log(`\n⚠️  Unmatched reports (won't appear for generated users):`);
    unmatchedReports.slice(0, 10).forEach(r => {
      console.log(`   - ${r.reportName} (Patient: ${r.patientPhone})`);
    });
    if (unmatchedReports.length > 10) {
      console.log(`   ... and ${unmatchedReports.length - 10} more`);
    }
  }
  
  console.log(`\n💡 To see reports in the app:`);
  console.log(`   1. Login with a phone number that has matched reports`);
  console.log(`   2. Go to Reports tab`);
  console.log(`   3. Reports will appear if:`);
  console.log(`      - Patient phone matches user phone (direct reports)`);
  console.log(`      - Report is shared with user phone (shared reports)`);
  console.log(`      - User accepts pending shared reports`);
  
  return {
    matched: totalMatched,
    unmatched: unmatchedReports.length,
    phoneToReports,
  };
}

async function main() {
  console.log('🔍 DC Reports Association Analysis\n');
  console.log('=' .repeat(50));
  console.log(`DC API URL: ${DC_API_URL}`);
  console.log(`Generated Users: ${GENERATED_PHONE_NUMBERS.length}`);
  console.log('=' .repeat(50));
  console.log('');
  
  const reports = await fetchDCReports();
  
  if (reports.length === 0) {
    console.log('⚠️  No reports found or API unavailable');
    console.log('   Make sure the DC app is running and accessible');
    return;
  }
  
  await analyzeReports(reports);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fetchDCReports, analyzeReports };















