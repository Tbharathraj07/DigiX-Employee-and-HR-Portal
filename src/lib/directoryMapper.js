// ==============================================================================
// DigiX Technologies - Secure Employee Directory UI Mapper
// File: src/lib/directoryMapper.js
// ==============================================================================

/**
 * Safely maps database employee directory records into sanitized UI objects.
 * Strictly guarantees that sensitive fields (salary, phone number, joining date,
 * emergency contacts, personal HR data, and auth user ID) are NEVER included.
 *
 * @param {Object} row Raw record from database view or RPC
 * @returns {Object|null} Sanitized employee directory model
 */
export const mapDbDirectoryEntryToUi = (row) => {
  if (!row) return null;

  const normRole =
    row.designation?.toLowerCase().includes('admin') || row.employee_id?.startsWith('ADM')
      ? 'admin'
      : row.department === 'Human Resources' ||
        row.employee_id?.startsWith('HR') ||
        row.designation?.toLowerCase().includes('hr')
      ? 'hr'
      : 'employee';

  const defaultAvatar =
    row.profile_photo ||
    `https://images.unsplash.com/photo-${
      normRole === 'admin'
        ? '1507003211169-0a1dd7228f2d'
        : normRole === 'hr'
        ? '1573496359142-b8d87734a5a2'
        : '1534528741775-53994a69daeb'
    }?w=150&auto=format&fit=crop&q=80`;

  const capStatus = row.status
    ? row.status.charAt(0).toUpperCase() + row.status.slice(1).toLowerCase()
    : 'Active';

  const inferredWorkType = row.location?.toLowerCase().includes('remote')
    ? 'Remote'
    : row.location?.toLowerCase().includes('office') || row.location?.toLowerCase().includes('headquarters')
    ? 'On-site'
    : 'Hybrid';

  return {
    id: row.employee_id || row.id,
    dbId: row.id,
    name: row.name,
    email: row.email,
    role: normRole,
    roleTitle: row.designation || 'Specialist',
    department: row.department || 'Technology',
    team: row.department || 'Engineering',
    avatar: defaultAvatar,
    location: row.location ? row.location.split('(')[0].trim() : 'Corporate Office',
    rawLocation: row.location || 'Corporate Office',
    status: capStatus,
    workType: inferredWorkType,
    isDirectoryUser: true
  };
};
