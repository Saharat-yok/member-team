const fmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' });
export const formatDue = (iso) => fmt.format(new Date(iso));

// <input type="date"> ต้องการรูปแบบ YYYY-MM-DD ตามเวลาเครื่อง ซึ่ง locale 'en-CA' ให้รูปแบบนี้พอดี
export const toInputDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-CA') : '');

export const isOverdue = (t) => !!t.dueDate && t.status !== 'done' && new Date(t.dueDate) < new Date();
