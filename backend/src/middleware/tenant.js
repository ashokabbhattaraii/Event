// Ensures every tenant-scoped query is filtered to the requesting user's organization,
// so cross-org data access is a structural impossibility rather than a per-controller convention.
const scopeToOrg = (filter, req) => {
  if (!req.user.organization) {
    throw new Error("User has no organization assigned");
  }
  return { ...filter, organization: req.user.organization };
};

const requireSameOrg = (resourceOrgId, req) => {
  return (
    req.user.organization &&
    resourceOrgId &&
    resourceOrgId.toString() === req.user.organization.toString()
  );
};

module.exports = { scopeToOrg, requireSameOrg };
