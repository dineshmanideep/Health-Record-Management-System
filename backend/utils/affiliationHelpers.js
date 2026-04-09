const Hospital = require('../models/Hospital');
const HospitalAffiliation = require('../models/HospitalAffiliation');

async function getActiveAffiliation({ staffId, staffRole }) {
  return HospitalAffiliation.findOne({
    staffId,
    staffRole,
    status: 'active'
  });
}

async function getHospitalSummary(hospitalId) {
  if (!hospitalId) return null;
  return Hospital.findById(hospitalId).select('name address phone email hospitalType');
}

async function reactivateOrCreateAffiliation({
  staffId,
  staffRole,
  hospitalId,
  department = '',
  singleHospital = false
}) {
  if (singleHospital) {
    const activeAffiliation = await getActiveAffiliation({ staffId, staffRole });
    if (activeAffiliation && String(activeAffiliation.hospitalId) !== String(hospitalId)) {
      return {
        kind: 'conflict',
        affiliation: activeAffiliation,
        hospital: await getHospitalSummary(activeAffiliation.hospitalId)
      };
    }
  }

  const existingAffiliation = await HospitalAffiliation.findOne({ staffId, hospitalId });

  if (existingAffiliation) {
    if (existingAffiliation.status === 'active') {
      return {
        kind: 'existing_active',
        affiliation: existingAffiliation,
        hospital: await getHospitalSummary(hospitalId)
      };
    }

    existingAffiliation.status = 'active';
    existingAffiliation.joinedAt = new Date();
    existingAffiliation.leftAt = undefined;
    if (department) existingAffiliation.department = department;
    await existingAffiliation.save();

    return {
      kind: 'reactivated',
      affiliation: existingAffiliation,
      hospital: await getHospitalSummary(hospitalId)
    };
  }

  const affiliation = await HospitalAffiliation.create({
    staffId,
    staffRole,
    hospitalId,
    department
  });

  return {
    kind: 'created',
    affiliation,
    hospital: await getHospitalSummary(hospitalId)
  };
}

module.exports = {
  getActiveAffiliation,
  getHospitalSummary,
  reactivateOrCreateAffiliation
};
