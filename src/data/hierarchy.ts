// Reporting structure for the hierarchy view. Role names must match src/data/scorecard.ts exactly.
export interface OrgNode {
  role: string;
  children?: OrgNode[];
}

export const HEAD = "Head of IoT Delivery & Operations";

export const orgTree: OrgNode = {
  role: HEAD,
  children: [
    {
      role: "Field Operations Senior Manager",
      children: [
        { role: "Survey Manager", children: [{ role: "Surveyor" }] },
        {
          role: "Implementation Manager - TAQA",
          children: [{ role: "Supervisor (Team Leader) - TAQA" }],
        },
        {
          role: "Implementation Manager- Etihad",
          children: [{ role: "Supervisor (Team Leader) - Etihad" }, { role: "Implementation Lead" }],
        },
        { role: "Quality Team Lead - TAQA", children: [{ role: "Quality Engineer - TAQA" }] },
        {
          role: "Quality Team Lead - Etihad",
          children: [{ role: "Quality Engineer - Ethihad" }, { role: "Acceptance Team Lead - Etihad" }],
        },
      ],
    },
    {
      role: "NOC Senior Manager",
      children: [
        {
          role: "L1 & SP Manager",
          children: [{ role: "NOC L1 Engineer" }, { role: "NOC Onsite L1 Engineer" }],
        },
        {
          role: "OPS SM/L2 & Security Manager",
          children: [
            { role: "NOC L2 Engineer" },
            { role: "Security GRC Manager" },
            { role: "Operations Service Management Manager" },
          ],
        },
        { role: "Operations Excellence Manager" },
        { role: "Change & Incident Manager" },
      ],
    },
    { role: "HSE Manager" },
  ],
};
