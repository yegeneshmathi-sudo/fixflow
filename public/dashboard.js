const $ = (id) => document.getElementById(id);
const rowsEl = $('rows');
let debounce;

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg, bad) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('bad', !!bad);
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2400);
}

function timeAgo(dateStr) {
  const secs = Math.max(0, (Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

const statusClass = { Open: 'st-open', 'In Progress': 'st-progress', Resolved: 'st-resolved' };

async function loadSummary() {
  const s = await (await fetch('/api/summary')).json();
  $('sTotal').textContent = s.total;
  $('sOpen').textContent = s.open;
  $('sProgress').textContent = s.inProgress;
  $('sResolved').textContent = s.resolved;
  const pct = (n) => (s.total ? (n / s.total) * 100 : 0) + '%';
  $('mOpen').style.width = pct(s.open);
  $('mProgress').style.width = pct(s.inProgress);
  $('mResolved').style.width = pct(s.resolved);
  $('pendingNote').innerHTML =
    `<b>${s.pending}</b> pending (open plus in progress), <b>${s.resolved}</b> resolved` +
    (s.urgent ? `. <b>${s.urgent}</b> high priority fault${s.urgent > 1 ? 's' : ''} still need${s.urgent > 1 ? '' : 's'} attention.` : '.');
}

async function loadFaults() {
  const params = new URLSearchParams();
  if ($('fStatus').value) params.set('status', $('fStatus').value);
  if ($('fPriority').value) params.set('priority', $('fPriority').value);
  if ($('q').value.trim()) params.set('q', $('q').value.trim());

  const res = await fetch('/api/faults?' + params);
  if (!res.ok) throw new Error('Could not load faults.');
  const faults = await res.json();

  $('count').textContent = `${faults.length} shown`;
  $('empty').hidden = faults.length > 0;
  $('emptyMsg').textContent = params.toString()
    ? 'Try clearing a filter or searching for something else.'
    : 'No faults have been reported yet.';

  rowsEl.innerHTML = faults.map((f) => `
    <tr class="${f.status === 'Resolved' ? 'done' : ''}">
      <td class="mark"><div class="m-${f.priority.toLowerCase()}"></div></td>
      <td>
        <div class="equip">${esc(f.equipment_name)}</div>
        <div class="loc">${esc(f.location)}${f.reported_by ? ' · ' + esc(f.reported_by) : ''}</div>
      </td>
      <td class="desc">${esc(f.description)}</td>
      <td><span class="badge b-${f.priority.toLowerCase()}">${esc(f.priority)}</span></td>
      <td class="ago" title="${new Date(f.created_at).toLocaleString()}">${timeAgo(f.created_at)}</td>
      <td>
        <select class="status ${statusClass[f.status]}" data-id="${f.id}" data-prev="${esc(f.status)}" aria-label="Status for ${esc(f.equipment_name)}">
          ${['Open', 'In Progress', 'Resolved'].map((s) => `<option${s === f.status ? ' selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
    </tr>`).join('');
}

async function refresh() {
  try {
    await Promise.all([loadSummary(), loadFaults()]);
  } catch (e) {
    toast(e.message || 'Could not reach the server.', true);
  }
}

rowsEl.addEventListener('change', async (ev) => {
  const sel = ev.target.closest('select.status');
  if (!sel) return;
  const id = sel.dataset.id;
  const status = sel.value;
  try {
    const res = await fetch(`/api/faults/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    toast(`Report #${id} marked ${status}`);
    await refresh();
  } catch (e) {
    sel.value = sel.dataset.prev;
    toast(e.message || 'Status not updated.', true);
  }
});

$('fStatus').addEventListener('change', loadFaults);
$('fPriority').addEventListener('change', loadFaults);
$('q').addEventListener('input', () => {
  clearTimeout(debounce);
  debounce = setTimeout(loadFaults, 250);
});

refresh();
setInterval(() => { if (!document.activeElement.matches('select.status')) refresh(); }, 30000); // keep the board fresh
