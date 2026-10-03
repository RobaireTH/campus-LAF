/** Item-related routes. Claim screens belong to Nurain (SOF-29/30/31) — keep these in sync. */
export const itemRoutes = {
  detail: (id: string) => `/items/${id}`,
  edit: (id: string) => `/items/${id}/edit`,
  claim: (id: string) => `/items/${id}/claim`, // SOF-29 claim form
  claims: (id: string) => `/items/${id}/claims`, // SOF-30 claim review (owner)
  handover: (claimId: string) => `/claims/${claimId}`, // SOF-31 contact & handover
  myClaims: "/dashboard?tab=my-claims", // SOF-28
};
