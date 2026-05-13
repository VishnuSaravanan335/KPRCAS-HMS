// ─── CLUB REQUESTS ────────────────────────────────────────────────────────────
async function renderClubRequests(role) {
  // Clubs (Pixes, Fine Arts) use the same logic as departments
  return renderDeptRequests(role);
}
