const form = document.getElementById('faultForm');
const confirmBox = document.getElementById('confirm');
const submitBtn = document.getElementById('submitBtn');

function clearErrors() {
  form.querySelectorAll('.err').forEach((e) => (e.textContent = ''));
  form.querySelectorAll('.invalid').forEach((e) => e.classList.remove('invalid'));
}

function showErrors(fields) {
  let first = null;
  for (const [name, msg] of Object.entries(fields)) {
    const slot = form.querySelector(`.err[data-for="${name}"]`);
    const input = form.elements[name];
    if (slot) slot.textContent = msg;
    if (input && input.classList) {
      input.classList.add('invalid');
      first = first || input;
    }
  }
  if (first) first.focus();
}

// Same rules as the server, so people get instant feedback
function validate(data) {
  const e = {};
  if (!data.equipment_name) e.equipment_name = 'Enter the equipment name.';
  if (!data.location) e.location = 'Enter where the equipment is.';
  if (!data.description) e.description = 'Describe what is wrong.';
  else if (data.description.length < 10) e.description = 'Add a little more detail (at least 10 characters).';
  return e;
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  clearErrors();
  confirmBox.hidden = true;

  const data = Object.fromEntries(new FormData(form).entries());
  for (const k in data) data[k] = data[k].trim();

  const errors = validate(data);
  if (Object.keys(errors).length) return showErrors(errors);

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  try {
    const res = await fetch('/api/faults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (!res.ok) {
      if (body.fields) showErrors(body.fields);
      else throw new Error(body.error);
      return;
    }
    confirmBox.innerHTML =
      `<strong>Report #${body.id} submitted</strong>` +
      `The maintenance team can now see the ${escapeHtml(body.equipment_name)} fault.` +
      `<div class="links"><a class="btn" href="dashboard.html">View dashboard</a></div>`;
    confirmBox.hidden = false;
    confirmBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    form.reset();
    document.getElementById('p-medium').checked = true;
  } catch (err) {
    confirmBox.hidden = false;
    confirmBox.style.background = '#fbe4e4';
    confirmBox.style.borderColor = 'var(--high)';
    confirmBox.innerHTML = `<strong>Report not sent</strong>${escapeHtml(err.message || 'Check your connection and try again.')}`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit report';
  }
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
