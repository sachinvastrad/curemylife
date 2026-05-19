// Human-friendly labels for case statuses shown to patients/doctors.
// Internal processing states are presented neutrally (e.g. "Under Review")
// so platform-internal terminology is never surfaced in the UI.
const CASE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  ai_processing: 'Under Review',
  awaiting_doctor: 'Awaiting Doctor',
  report_ready: 'Report Ready',
  consultation_booked: 'Consultation Booked',
  consultation_done: 'Consultation Done',
  closed: 'Closed',
};

export function caseStatusLabel(status: string): string {
  return CASE_STATUS_LABELS[status] || status.replace(/_/g, ' ');
}
