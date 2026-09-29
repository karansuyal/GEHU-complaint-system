// Mirrors the backend's status rules (backend/app/crud/complaint.py) so staff
// are only offered changes the server will accept. The server stays the
// source of truth; this just avoids showing buttons that would fail.
//
// `escalated` is deliberately not offered as a choice: the SLA job sets it
// automatically. Staff can take an escalated complaint back to any open status
// or resolve it. A resolved complaint is final for wardens (the student can
// reopen it); admins may move it back to "in progress".

const CHOICES = ['pending', 'in_progress', 'resolved']

export const STATUS_CHOICE_LABELS = { pending: 'Pending', in_progress: 'In progress', resolved: 'Resolved' }

const NEXT = {
  warden: {
    pending: ['in_progress', 'resolved'],
    in_progress: ['pending', 'resolved'],
    escalated: ['pending', 'in_progress', 'resolved'],
    resolved: []
  },
  admin: {
    pending: ['in_progress', 'resolved'],
    in_progress: ['pending', 'resolved'],
    escalated: ['pending', 'in_progress', 'resolved'],
    resolved: ['in_progress']
  }
}

export function allowedNext(role, status) {
  return (NEXT[role] || NEXT.warden)[status] || []
}

// Options for a status picker: the current status (when it is a normal
// choice) plus every status the role may move to, in a stable order.
export function statusOptions(role, status) {
  const allowed = new Set(allowedNext(role, status))
  return CHOICES.filter((s) => s === status || allowed.has(s)).map((s) => [s, STATUS_CHOICE_LABELS[s]])
}

export const canChangeStatus = (role, status) => allowedNext(role, status).length > 0
