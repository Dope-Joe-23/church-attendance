import * as XLSX from 'xlsx';
import apiClient from '../services/apiClient';

/**
 * Export members data with attendance totals to Excel
 * @param {Array} members - Array of member objects
 * @param {string} filename - Output filename
 */
export const exportMembersToExcel = async (members, filename = 'members_export.xlsx') => {
  try {
    // Prepare member rows with attendance data
    const memberRows = await Promise.all(
      members.map(async (member) => {
        let totalAttendance = 0;
        
        try {
          // Fetch attendance count for this member
          const response = await apiClient.get(`/attendance/?member=${member.id}`);
          const attendanceData = response.data.results || response.data;
          totalAttendance = Array.isArray(attendanceData) ? attendanceData.length : 0;
        } catch (error) {
          console.warn(`Could not fetch attendance for member ${member.id}:`, error);
        }
        
        return {
          'Member ID': member.member_id || '',
          'Full Name': member.full_name || '',
          'Phone': member.phone || '',
          'Email': member.email || '',
          'Sex': member.sex ? (member.sex === 'male' ? 'Male' : 'Female') : '',
          'Date of Birth': member.date_of_birth || '',
          'Department': member.department || '',
          'Class': member.class_name || '',
          'Committee': member.committee || '',
          'Marital Status': member.marital_status || '',
          'Profession': member.profession || '',
          'Residence': member.place_of_residence || '',
          'Baptised': member.baptised ? 'Yes' : 'No',
          'Confirmed': member.confirmed ? 'Yes' : 'No',
          'Type': member.is_visitor ? 'Visitor' : 'Member',
          'Total Attendance': totalAttendance,
        };
      })
    );

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(memberRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Members');

    // Set column widths for better readability
    const columnWidths = [
      { wch: 12 }, // Member ID
      { wch: 20 }, // Full Name
      { wch: 15 }, // Phone
      { wch: 20 }, // Email
      { wch: 10 }, // Sex
      { wch: 15 }, // Date of Birth
      { wch: 15 }, // Department
      { wch: 12 }, // Class
      { wch: 15 }, // Committee
      { wch: 15 }, // Marital Status
      { wch: 15 }, // Profession
      { wch: 20 }, // Residence
      { wch: 10 }, // Baptised
      { wch: 10 }, // Confirmed
      { wch: 10 }, // Type
      { wch: 15 }, // Total Attendance
    ];
    worksheet['!cols'] = columnWidths;

    // Generate and download file
    const timestamp = new Date().toISOString().split('T')[0];
    const downloadFilename = `${filename.replace('.xlsx', '')}_${timestamp}.xlsx`;
    XLSX.writeFile(workbook, downloadFilename);
    
    return true;
  } catch (error) {
    console.error('Error exporting members to Excel:', error);
    throw error;
  }
};
