const STORAGE_KEY = 'rentflow-local-data-v1';
const BACKUP_HISTORY_KEY = 'rentflow-backup-history-v1';

const state = {
  settings: {
    adminName: 'Aarav Sharma',
    companyName: 'Horizon Estates',
    contactInfo: '+91 98765 43210',
    currency: 'INR',
    reminderDays: 3,
    logoUrl: '',
  },
  properties: [],
  tenants: [],
  payments: [],
  reminders: [],
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedCalendarDate: formatDate(new Date()),
  toastTimer: null,
  pendingConfirm: null,
  notifiedAlertKeys: [],
};

const currencySymbols = {
  INR: '₹',
  USD: '$',
  EUR: '€',
};

const demoData = createDemoData();

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  bindStaticEvents();
  registerServiceWorker();
  bindInstallPrompt();
  applyScrollNavState();
  window.addEventListener('scroll', applyScrollNavState, { passive: true });
  renderAll();
  revealCards();
  setTimeout(() => {
    const loader = document.getElementById('appLoader');
    const shell = document.querySelector('.app-shell');
    if (loader) loader.classList.add('hidden');
    if (shell) shell.style.opacity = '1';
    document.body.classList.add('ready');
  }, 850);
});

function applyScrollNavState() {
  const compact = window.scrollY > 24 && window.innerWidth > 520;
  document.body.classList.toggle('nav-compact', compact);
}

function toggleNotificationPanel() {
  const panel = document.getElementById('notificationPanel');
  const bell = document.getElementById('notificationBell');
  if (!panel || !bell) return;

  const isHidden = panel.classList.toggle('hidden');
  bell.setAttribute('aria-expanded', String(!isHidden));

  if (!isHidden) {
    renderNotificationsPanel();
  }
}

function closeNotificationPanel() {
  const panel = document.getElementById('notificationPanel');
  const bell = document.getElementById('notificationBell');
  if (!panel || !bell) return;

  panel.classList.add('hidden');
  bell.setAttribute('aria-expanded', 'false');
}

function closeHamburgerMenu() {
  const hamburger = document.getElementById('hamburgerMenu');
  const mainNav = document.getElementById('mainNav');
  const mobileMenuClose = document.getElementById('mobileMenuClose');
  if (hamburger && mainNav) {
    hamburger.classList.remove('active');
    mainNav.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
  }

}

function bindStaticEvents() {
  // Hamburger menu setup
  const hamburger = document.getElementById('hamburgerMenu');
  const mainNav = document.getElementById('mainNav');
  
  if (hamburger && mainNav) {
    // Toggle menu on hamburger click
    hamburger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = mainNav.classList.toggle('active');
      hamburger.classList.toggle('active', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
    });
  }

  mobileMenuClose?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeHamburgerMenu();
  });

  // Close menu when nav items are clicked
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', (e) => {
      const section = button.dataset.section;
      if (section) {
        activateSection(section);
        closeHamburgerMenu();
      } else {
        // For non-section items like install button
        closeHamburgerMenu();
      }
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (event) => {
    if (hamburger && mainNav && mainNav.classList.contains('active')) {
      const isClickOnMenu = mainNav.contains(event.target);
      const isClickOnHamburger = hamburger.contains(event.target);
      
      if (!isClickOnMenu && !isClickOnHamburger) {
        closeHamburgerMenu();
      }
    }
  });

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('installAppBtn')?.addEventListener('click', installApp);
  document.getElementById('notificationBell').addEventListener('click', toggleNotificationPanel);
  document.getElementById('quickAddTenant').addEventListener('click', () => openTenantModal());
  document.getElementById('openTenantModal').addEventListener('click', () => openTenantModal());
  document.getElementById('openPropertyModal').addEventListener('click', () => openPropertyModal());
  document.getElementById('openPropertyModalFromProperties').addEventListener('click', () => openPropertyModal());
  document.getElementById('quickRecordPayment').addEventListener('click', () => openPaymentModal());
  document.getElementById('openPaymentModal').addEventListener('click', () => openPaymentModal());
  document.getElementById('connectDriveBtn').addEventListener('click', connectGoogleDrive);
  document.getElementById('backupNowBtn').addEventListener('click', backupNow);
  document.getElementById('restoreBackupBtn').addEventListener('click', restoreLatestBackup);

  document.getElementById('tenantForm').addEventListener('submit', handleTenantSubmit);
  document.getElementById('propertyForm').addEventListener('submit', handlePropertySubmit);
  document.getElementById('paymentForm').addEventListener('submit', handlePaymentSubmit);
  document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);

  document.getElementById('tenantSearch').addEventListener('input', renderTenants);
  document.getElementById('tenantStatusFilter').addEventListener('change', renderTenants);

  document.getElementById('prevMonth').addEventListener('click', () => changeMonth(-1));
  document.getElementById('nextMonth').addEventListener('click', () => changeMonth(1));

  document.getElementById('downloadReceiptBtn').addEventListener('click', downloadReceiptPdf);
  document.getElementById('printReceiptBtn').addEventListener('click', printCurrentReceipt);
  document.getElementById('cancelConfirmBtn').addEventListener('click', closeConfirmDialog);
  document.getElementById('confirmActionBtn').addEventListener('click', () => {
    if (state.pendingConfirm) {
      state.pendingConfirm();
      closeConfirmDialog();
    }
  });

  document.querySelectorAll('.close-modal').forEach((button) => {
    button.addEventListener('click', (event) => {
      const modalId = event.currentTarget.dataset.close;
      if (modalId === 'notificationPanel') {
        closeNotificationPanel();
        return;
      }
      closeModal(modalId);
    });
  });

  document.addEventListener('click', (event) => {
    const modal = event.target.closest('.modal');
    if (modal && event.target === modal) {
      closeModal(modal.id);
    }
    const panel = event.target.closest('#notificationPanel');
    const bell = event.target.closest('#notificationBell');
    if (!panel && !bell && !event.target.closest('[data-close="notificationPanel"]')) {
      closeNotificationPanel();
    }
  });

  document.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;

    const type = actionButton.dataset.action;
    const tenantId = actionButton.dataset.tenantId;
    const paymentId = actionButton.dataset.paymentId;
    const propertyId = actionButton.dataset.propertyId;

    if (type === 'view-tenant') {
      showTenantProfile(tenantId);
    }

    if (type === 'edit-tenant') {
      openTenantModal(tenantId);
    }

    if (type === 'delete-tenant') {
      confirmAction(`Delete ${getTenantById(tenantId)?.name || 'tenant'}? This removes their profile and payment history.`, () => {
        deleteTenant(tenantId);
      });
    }

    if (type === 'edit-property') {
      openPropertyModal(propertyId);
    }

    if (type === 'delete-property') {
      confirmAction(`Delete the property ${getPropertyById(propertyId)?.name || 'record'}? This will detach it from any assigned tenant.`, () => {
        deleteProperty(propertyId);
      });
    }

    if (type === 'generate-receipt') {
      openReceiptPreview(paymentId);
    }

    if (type === 'send-reminder') {
      sendReminder(tenantId);
    }

    if (type === 'copy-reminder') {
      copyReminder(tenantId);
    }

    if (type === 'mark-reminder-sent') {
      markReminderSent(tenantId);
    }
  });
}

function activateSection(sectionName) {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.section === sectionName);
  });

  document.querySelectorAll('.page').forEach((section) => {
    section.classList.toggle('active', section.id === `${sectionName}-section`);
  });
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state.properties = Array.isArray(demoData.properties) ? demoData.properties : [];
    state.tenants = Array.isArray(demoData.tenants) ? demoData.tenants : [];
    state.payments = Array.isArray(demoData.payments) ? demoData.payments : [];
    state.settings = demoData.settings;
    state.reminders = [];
    saveData();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.settings = { ...demoData.settings, ...(parsed.settings || {}) };
    state.tenants = Array.isArray(parsed.tenants) ? parsed.tenants : (Array.isArray(demoData.tenants) ? demoData.tenants : []);
    state.payments = Array.isArray(parsed.payments) ? parsed.payments : (Array.isArray(demoData.payments) ? demoData.payments : []);
    state.reminders = Array.isArray(parsed.reminders) ? parsed.reminders : [];
    state.properties = Array.isArray(parsed.properties) ? parsed.properties : migrateLegacyProperties(state.tenants);

    if (!state.properties.length && Array.isArray(demoData.properties)) {
      state.properties = demoData.properties;
    }
  } catch (error) {
    console.error('Unable to parse saved data:', error);
    state.properties = Array.isArray(demoData.properties) ? demoData.properties : [];
    state.tenants = Array.isArray(demoData.tenants) ? demoData.tenants : [];
    state.payments = Array.isArray(demoData.payments) ? demoData.payments : [];
    state.settings = demoData.settings;
    state.reminders = [];
  }

  const theme = localStorage.getItem('rentflow-theme');
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('themeToggle').textContent = '🌙';
  }
}

function createBackupSnapshot() {
  return {
    savedAt: new Date().toISOString(),
    data: {
      settings: state.settings,
      properties: state.properties,
      tenants: state.tenants,
      payments: state.payments,
      reminders: state.reminders,
    },
  };
}

function saveData() {
  const payload = JSON.stringify({
    settings: state.settings,
    properties: state.properties,
    tenants: state.tenants,
    payments: state.payments,
    reminders: state.reminders,
  });

  localStorage.setItem(STORAGE_KEY, payload);

  const history = JSON.parse(localStorage.getItem(BACKUP_HISTORY_KEY) || '[]');
  history.push(createBackupSnapshot());
  if (history.length > 20) history.shift();
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(history));

  scheduleGoogleDriveBackup(payload);
}

function applySnapshotData(snapshot) {
  const data = snapshot?.data || snapshot || {};
  state.settings = { ...demoData.settings, ...(data.settings || {}) };
  state.properties = Array.isArray(data.properties) ? data.properties : [];
  state.tenants = Array.isArray(data.tenants) ? data.tenants : [];
  state.payments = Array.isArray(data.payments) ? data.payments : [];
  state.reminders = Array.isArray(data.reminders) ? data.reminders : [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    settings: state.settings,
    properties: state.properties,
    tenants: state.tenants,
    payments: state.payments,
    reminders: state.reminders,
  }));
}

function getLatestLocalBackup() {
  const history = JSON.parse(localStorage.getItem(BACKUP_HISTORY_KEY) || '[]');
  return history.length ? history[history.length - 1] : null;
}

async function restoreLatestBackup() {
  const localBackup = getLatestLocalBackup();
  const token = localStorage.getItem('rentflow-drive-token');

  if (token && state.settings.googleDriveClientId) {
    try {
      const driveBackup = await getLatestGoogleDriveBackup();
      if (driveBackup) {
        confirmAction('Restore the latest Google Drive backup? This will replace the current local data.', () => {
          applySnapshotData(driveBackup);
          renderAll();
          showToast('Google Drive backup restored.');
        });
        return;
      }
    } catch (error) {
      console.warn('Drive restore cancelled or failed:', error);
    }
  }

  if (!localBackup) {
    showToast('No backup found to restore.');
    return;
  }

  confirmAction('Restore the latest local backup? This will replace the current data.', () => {
    applySnapshotData(localBackup);
    renderAll();
    showToast('Latest local backup restored.');
  });
}

async function getLatestGoogleDriveBackup() {
  const token = localStorage.getItem('rentflow-drive-token');
  if (!token || !state.settings.googleDriveClientId) return null;

  const response = await fetch('https://www.googleapis.com/drive/v3/files?orderBy=createdTime desc&q=name contains "rentflow-backup-"&fields=files(id,name,createdTime)', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Unable to read Drive backup list');
  }

  const result = await response.json();
  const file = result.files && result.files[0];
  if (!file) return null;

  const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!fileResponse.ok) {
    throw new Error('Unable to fetch Drive backup');
  }

  return await fileResponse.json();
}

function migrateLegacyProperties(tenants) {
  if (!Array.isArray(tenants) || !tenants.length) return [];

  return tenants.map((tenant) => {
    const propertyName = tenant.propertyName || tenant.propertyId || 'Untitled property';
    const name = propertyName.split(/\s+(?=[A-Z]|\d|$)/).length > 1 ? propertyName.split(/\s+(?=[A-Z]|\d|$)/)[0] : propertyName;
    const unitNumber = propertyName.includes('-') ? propertyName.split('-').slice(-1)[0].trim() : '';
    const migrated = {
      id: tenant.propertyId || createId('property'),
      name: propertyName.replace(new RegExp(`\\s*${unitNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '').trim() || name,
      unitNumber: unitNumber || 'N/A',
      address: tenant.address || 'Address not provided',
      baseRent: Number(tenant.monthlyRent || 0),
      status: 'Occupied',
      notes: 'Imported from legacy tenant record',
      occupiedBy: tenant.id || null,
      createdAt: tenant.createdAt || new Date().toISOString(),
    };

    if (!tenant.propertyId) {
      tenant.propertyId = migrated.id;
      tenant.propertyName = `${migrated.name} ${migrated.unitNumber}`.trim();
    }

    return migrated;
  });
}

function renderAll() {
  renderOverview();
  renderProperties();
  renderTenants();
  renderPayments();
  renderCalendar();
  renderReceipts();
  renderSettings();
  populatePropertyTenantSelector();
  populatePaymentTenantSelector();
}

function renderOverview() {
  const dueAlerts = getDueAlerts();
  const count = dueAlerts.length;
  const countEl = document.getElementById('notificationCount');
  if (countEl) {
    countEl.textContent = String(count);
    countEl.classList.toggle('hidden', count === 0);
  }

  renderNotificationsPanel();
  triggerDueAlerts(dueAlerts);

  const totalProperties = state.properties.length;
  const totalTenants = state.tenants.length;
  const activeTenants = state.tenants.filter((tenant) => getTenantStatus(tenant) !== 'Overdue').length;
  const rentCollected = state.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const pendingRent = state.tenants
    .filter((tenant) => getTenantStatus(tenant) !== 'Paid')
    .reduce((sum, tenant) => sum + Number(tenant.monthlyRent || 0), 0);
  const overdueRent = state.tenants
    .filter((tenant) => getTenantStatus(tenant) === 'Overdue')
    .reduce((sum, tenant) => sum + Number(tenant.monthlyRent || 0), 0);

  const stats = [
    { label: 'Total Properties', value: totalProperties, icon: '🏢', trend: '+2 this quarter' },
    { label: 'Total Tenants', value: totalTenants, icon: '👥', trend: `${activeTenants} active` },
    { label: 'Rent Collected', value: formatCurrency(rentCollected), icon: '💰', trend: 'This month' },
    { label: 'Pending Rent', value: formatCurrency(pendingRent), icon: '⏳', trend: 'Awaiting payment' },
    { label: 'Overdue Rent', value: formatCurrency(overdueRent), icon: '⚠️', trend: 'Needs action' },
    { label: 'Upcoming Due', value: getUpcomingDueCount(), icon: '📆', trend: 'Next 7 days' },
  ];

  document.getElementById('overviewStats').innerHTML = stats.map((stat) => `
    <article class="stat-card">
      <div class="stat-top">
        <span class="stat-label">${stat.label}</span>
        <span class="stat-icon">${stat.icon}</span>
      </div>
      <div class="stat-value">${stat.value}</div>
      <div class="stat-foot">${stat.trend}</div>
    </article>
  `).join('');

  const collectedShare = rentCollected || 1;
  const pendingShare = pendingRent || 0;
  const overdueShare = overdueRent || 0;
  const totalPool = Math.max(collectedShare + pendingShare + overdueShare, 1);

  document.getElementById('rentOverview').innerHTML = `
    <div class="rent-bar-box">
      <div class="rent-bar-row">
        <span class="rent-bar-heading">Collected</span>
        <strong>${formatCurrency(rentCollected)}</strong>
      </div>
      <div class="rent-bar-track">
        <div class="rent-bar-fill collected" style="width: ${(rentCollected / totalPool) * 100}%"></div>
      </div>
    </div>

    <div class="rent-bar-box">
      <div class="rent-bar-row">
        <span class="rent-bar-heading">Pending</span>
        <strong>${formatCurrency(pendingRent)}</strong>
      </div>
      <div class="rent-bar-track">
        <div class="rent-bar-fill pending" style="width: ${(pendingRent / totalPool) * 100}%"></div>
      </div>
    </div>

    <div class="rent-bar-box">
      <div class="rent-bar-row">
        <span class="rent-bar-heading">Overdue</span>
        <strong>${formatCurrency(overdueRent)}</strong>
      </div>
      <div class="rent-bar-track">
        <div class="rent-bar-fill overdue" style="width: ${(overdueRent / totalPool) * 100}%"></div>
      </div>
    </div>
  `;

  const upcoming = getUpcomingDues();
  document.getElementById('upcomingDues').innerHTML = upcoming.length
    ? upcoming.slice(0, 5).map((tenant) => {
        const status = getTenantStatus(tenant);
        const daysRemaining = getDaysRemaining(tenant.nextDueDate);
        const reminderIds = state.reminders.filter((item) => item.tenantId === tenant.id);
        const sentRecently = reminderIds.some((item) => item.status === 'sent');

        return `
          <div class="due-item">
            <div class="due-item-main">
              <div class="avatar">${getInitials(tenant.name)}</div>
              <div class="due-meta">
                <strong>${tenant.name}</strong>
                <span class="muted">${formatCurrency(tenant.monthlyRent)} • Due ${formatDateLabel(tenant.nextDueDate)}</span>
                <span class="muted">${daysRemaining} days left</span>
              </div>
            </div>
            <div>
              <div class="badge ${statusClass(status)}">${status}</div>
              <div class="reminder-actions">
                <button class="notice-btn" data-action="copy-reminder" data-tenant-id="${tenant.id}">Copy reminder</button>
                <button class="notice-btn" data-action="${sentRecently ? 'mark-reminder-sent' : 'send-reminder'}" data-tenant-id="${tenant.id}">
                  ${sentRecently ? 'Reminder sent' : 'Send reminder'}
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')
    : '<div class="empty-state">No upcoming dues for the moment.</div>';

  const recentPayments = [...state.payments].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).slice(0, 5);
  document.getElementById('recentPaymentsList').innerHTML = recentPayments.length
    ? recentPayments.map((payment) => {
        const tenant = getTenantById(payment.tenantId);
        return `
          <div class="payment-item">
            <div class="due-item-main">
              <div class="avatar">${tenant ? getInitials(tenant.name) : 'T'}</div>
              <div class="due-meta">
                <strong>${tenant ? tenant.name : 'Tenant'}</strong>
                <span class="muted">${payment.rentMonth}</span>
              </div>
            </div>
            <div class="due-meta" style="align-items:flex-end">
              <strong class="amount">${formatCurrency(payment.amount)}</strong>
              <span class="muted">${formatDateLabel(payment.paymentDate)}</span>
            </div>
          </div>
        `;
      }).join('')
    : '<div class="empty-state">No payment activity yet.</div>';

  const recentTenants = [...state.tenants].sort((a, b) => new Date(b.createdAt || b.joinDate) - new Date(a.createdAt || a.joinDate)).slice(0, 5);
  document.getElementById('recentTenantsList').innerHTML = recentTenants.length
    ? recentTenants.map((tenant) => `
        <div class="tenant-mini-item">
          <div class="due-item-main">
            <div class="avatar">${getInitials(tenant.name)}</div>
            <div class="due-meta">
              <strong>${tenant.name}</strong>
              <span class="muted">${tenant.propertyName}</span>
            </div>
          </div>
          <span class="badge ${statusClass(getTenantStatus(tenant))}">${getTenantStatus(tenant)}</span>
        </div>
      `).join('')
    : '<div class="empty-state">No tenants available.</div>';
}

function renderTenants() {
  const query = document.getElementById('tenantSearch').value.trim().toLowerCase();
  const filterStatus = document.getElementById('tenantStatusFilter').value;

  const filtered = state.tenants.filter((tenant) => {
    const propertyName = getTenantPropertyName(tenant);
    const matchesSearch = !query || [tenant.name, propertyName, tenant.phone, tenant.email].some((value) => (value || '').toLowerCase().includes(query));
    const status = getTenantStatus(tenant);
    const matchesStatus = filterStatus === 'all' || status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const container = document.getElementById('tenantList');

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state">No tenants match your current filters.</div>';
    return;
  }

  container.innerHTML = filtered.map((tenant) => {
    const status = getTenantStatus(tenant);
    const totalPaid = getTotalPaymentsForTenant(tenant.id);
    const pending = Math.max(tenant.monthlyRent - totalPaid, 0);
    return `
      <article class="tenant-card">
        <div class="tenant-card-head">
          <div class="tenant-identity">
            <div class="avatar">${getInitials(tenant.name)}</div>
            <div>
              <div class="tenant-name">${tenant.name}</div>
              <div class="tenant-small">${getTenantPropertyName(tenant)}</div>
            </div>
          </div>
          <span class="badge ${statusClass(status)}">${status}</span>
        </div>

        <div class="card-subtext">
          <div class="info-row">
            <span class="info-label">Monthly rent</span>
            <span class="info-value">${formatCurrency(tenant.monthlyRent)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Next due</span>
            <span class="info-value">${formatDateLabel(tenant.nextDueDate)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Total paid</span>
            <span class="info-value">${formatCurrency(totalPaid)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Pending</span>
            <span class="info-value">${formatCurrency(pending)}</span>
          </div>
        </div>

        <div class="card-actions">
          <button class="card-action-btn secondary" data-action="view-tenant" data-tenant-id="${tenant.id}">View</button>
          <button class="card-action-btn secondary" data-action="edit-tenant" data-tenant-id="${tenant.id}">Edit</button>
          <button class="card-action-btn danger" data-action="delete-tenant" data-tenant-id="${tenant.id}">Delete</button>
        </div>
      </article>
    `;
  }).join('');
}

function renderProperties() {
  const container = document.getElementById('propertyList');
  if (!state.properties.length) {
    container.innerHTML = '<div class="empty-state">No properties added yet. Add a new property to begin allocation.</div>';
    return;
  }

  container.innerHTML = state.properties.map((property) => {
    const assignedTenant = state.tenants.find((tenant) => tenant.propertyId === property.id);
    return `
      <article class="tenant-card">
        <div class="tenant-card-head">
          <div class="tenant-identity">
            <div class="avatar">${getInitials(property.name)}</div>
            <div>
              <div class="tenant-name">${property.name}</div>
              <div class="tenant-small">${property.unitNumber}</div>
            </div>
          </div>
          <span class="badge ${property.status === 'Occupied' ? 'paid' : property.status === 'Maintenance' ? 'due-today' : 'upcoming'}">${property.status}</span>
        </div>

        <div class="card-subtext">
          <div class="info-row"><span class="info-label">Address</span><span class="info-value">${property.address}</span></div>
          <div class="info-row"><span class="info-label">Base rent</span><span class="info-value">${formatCurrency(property.baseRent || 0)}</span></div>
          <div class="info-row"><span class="info-label">Occupant</span><span class="info-value">${assignedTenant ? assignedTenant.name : 'Vacant'}</span></div>
          <div class="info-row"><span class="info-label">Notes</span><span class="info-value">${property.notes || '—'}</span></div>
        </div>

        <div class="card-actions">
          <button class="card-action-btn secondary" data-action="edit-property" data-property-id="${property.id}">Edit</button>
          <button class="card-action-btn danger" data-action="delete-property" data-property-id="${property.id}">Delete</button>
        </div>
      </article>
    `;
  }).join('');
}

function renderPayments() {
  const tbody = document.getElementById('paymentsTableBody');

  if (!state.payments.length) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No payment records yet.</div></td></tr>';
    return;
  }

  const sorted = [...state.payments].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
  tbody.innerHTML = sorted.map((payment) => {
    const tenant = getTenantById(payment.tenantId);
    return `
      <tr>
        <td>
          <div class="td-tenant">
            <div class="avatar small-flag">${tenant ? getInitials(tenant.name) : 'T'}</div>
            <div>
              <strong>${tenant ? tenant.name : 'Unknown tenant'}</strong>
              <div class="tenant-small">${tenant ? tenant.propertyName : ''}</div>
            </div>
          </div>
        </td>
        <td>${payment.rentMonth}</td>
        <td class="table-amount">${formatCurrency(payment.amount)}</td>
        <td>${payment.method}</td>
        <td>${formatDateLabel(payment.paymentDate)}</td>
        <td><button class="receipt-button" data-action="generate-receipt" data-payment-id="${payment.id}">Receipt</button></td>
      </tr>
    `;
  }).join('');
}

function renderCalendar() {
  const monthLabel = document.getElementById('calendarMonthLabel');
  const monthDate = new Date(state.currentYear, state.currentMonth, 1);
  monthLabel.textContent = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const calendarGrid = document.getElementById('calendarGrid');
  const firstDay = new Date(state.currentYear, state.currentMonth, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
  const prevMonthDays = new Date(state.currentYear, state.currentMonth, 0).getDate();
  const cells = [];

  for (let i = startDay - 1; i >= 0; i -= 1) {
    const dayNum = prevMonthDays - i;
    cells.push({ date: new Date(state.currentYear, state.currentMonth - 1, dayNum), isCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(state.currentYear, state.currentMonth, day), isCurrentMonth: true });
  }

  while (cells.length < 42) {
    const nextDay = cells.length - (startDay + daysInMonth) + 1;
    cells.push({ date: new Date(state.currentYear, state.currentMonth + 1, nextDay), isCurrentMonth: false });
  }

  const markerMap = buildCalendarEvents();
  calendarGrid.innerHTML = cells.map(({ date, isCurrentMonth }) => {
    const dateKey = formatDate(date);
    const isSelected = dateKey === state.selectedCalendarDate;
    const events = markerMap[dateKey] || [];
    return `
      <button class="calendar-day ${isCurrentMonth ? '' : 'muted'} ${isSelected ? 'selected' : ''}" data-date="${dateKey}">
        <span class="day-number">${date.getDate()}</span>
        <div class="day-events">
          ${events.slice(0, 2).map((event) => `
            <span class="day-event ${event.statusClass}">${event.label}</span>
          `).join('')}
        </div>
      </button>
    `;
  }).join('');

  document.querySelectorAll('.calendar-day').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedCalendarDate = button.dataset.date;
      renderCalendar();
      renderCalendarDetail();
    });
  });

  renderCalendarDetail();
}

function renderCalendarDetail() {
  const container = document.getElementById('calendarDetail');
  const events = buildCalendarEvents()[state.selectedCalendarDate] || [];

  if (!events.length) {
    container.innerHTML = `
      <div>
        <p class="eyebrow">Selected date</p>
        <h3>${formatDateLabel(state.selectedCalendarDate)}</h3>
      </div>
      <div class="empty-state" style="margin-top:18px;">No rent activity scheduled for this date.</div>
    `;
    return;
  }

  container.innerHTML = `
    <div>
      <p class="eyebrow">Selected date</p>
      <h3>${formatDateLabel(state.selectedCalendarDate)}</h3>
    </div>
    <div class="detail-list">
      ${events.map((event) => `
        <div class="detail-item">
          <span class="badge ${event.statusClass}">${event.status}</span>
          <strong>${event.name}</strong>
          <div class="muted">${event.type === 'payment' ? `Received ${formatCurrency(event.amount)}` : `Rent due ${formatCurrency(event.amount)}`}</div>
          <div class="muted">${event.propertyName || 'Property'}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderReceipts() {
  const list = document.getElementById('receiptList');

  if (!state.payments.length) {
    list.innerHTML = '<div class="empty-state">No receipts have been generated yet.</div>';
    return;
  }

  list.innerHTML = [...state.payments].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).map((payment) => {
    const tenant = getTenantById(payment.tenantId);
    return `
      <article class="receipt-card">
        <h4>${tenant ? tenant.name : 'Tenant'}</h4>
        <div class="muted">Receipt #${payment.receiptNumber || 'N/A'}</div>
        <div class="muted">${payment.rentMonth}</div>
        <div class="amount" style="margin-top:10px;">${formatCurrency(payment.amount)}</div>
        <div class="receipt-actions">
          <button class="mini-link" data-action="generate-receipt" data-payment-id="${payment.id}">Preview</button>
          <button class="mini-link" data-action="generate-receipt" data-payment-id="${payment.id}">Print</button>
        </div>
      </article>
    `;
  }).join('');
}

function renderSettings() {
  const form = document.getElementById('settingsForm');
  form.adminName.value = state.settings.adminName || '';
  form.companyName.value = state.settings.companyName || '';
  form.contactInfo.value = state.settings.contactInfo || '';
  form.currency.value = state.settings.currency || 'INR';
  form.reminderDays.value = state.settings.reminderDays || 3;
  form.logoUrl.value = state.settings.logoUrl || '';
  form.googleDriveClientId.value = state.settings.googleDriveClientId || '';
  form.googleDriveFolderId.value = state.settings.googleDriveFolderId || '';
  const backupStatus = document.getElementById('backupStatus');
  if (backupStatus) {
    backupStatus.textContent = getGoogleDriveStateText();
  }
}

function populatePaymentTenantSelector() {
  const select = document.getElementById('paymentTenantSelect');
  select.innerHTML = state.tenants.length ? state.tenants.map((tenant) => `
    <option value="${tenant.id}">${tenant.name} — ${getTenantPropertyName(tenant)}</option>
  `).join('') : '<option value="">No tenants available</option>';
}

function populatePropertyTenantSelector() {
  const select = document.getElementById('tenantPropertySelect');
  if (!select) return;
  select.innerHTML = state.properties.length ? state.properties.map((property) => `
    <option value="${property.id}">${property.name} — ${property.unitNumber}</option>
  `).join('') : '<option value="">No properties available</option>';
}

function openTenantModal(tenantId = null) {
  const form = document.getElementById('tenantForm');
  const modal = document.getElementById('tenantModal');
  const title = document.getElementById('tenantModalTitle');

  form.reset();
  form.tenantId.value = '';
  form.rentCycleDays.value = '30';
  form.joinDate.value = formatDate(new Date());
  const firstPropertyId = state.properties[0]?.id || '';
  if (firstPropertyId) form.propertyId.value = firstPropertyId;

  if (tenantId) {
    const tenant = getTenantById(tenantId);
    if (!tenant) return;
    title.textContent = 'Edit tenant';
    form.tenantId.value = tenant.id;
    form.name.value = tenant.name;
    form.phone.value = tenant.phone;
    form.email.value = tenant.email;
    form.propertyId.value = tenant.propertyId || firstPropertyId;
    form.address.value = tenant.address;
    form.monthlyRent.value = tenant.monthlyRent;
    form.securityDeposit.value = tenant.securityDeposit || 0;
    form.joinDate.value = tenant.joinDate;
    form.rentCycleDays.value = String(tenant.rentCycleDays || 30);
    form.leaseInfo.value = tenant.leaseInfo || '';
  } else {
    title.textContent = 'Add tenant';
  }

  if (!state.properties.length) {
    showToast('Add a property first before assigning a tenant.');
    return;
  }

  modal.classList.remove('hidden');
}

function openPropertyModal(propertyId = null) {
  const form = document.getElementById('propertyForm');
  const modal = document.getElementById('propertyModal');
  const title = document.getElementById('propertyModalTitle');
  form.reset();
  form.propertyId.value = '';

  if (propertyId) {
    const property = getPropertyById(propertyId);
    if (!property) return;
    title.textContent = 'Edit property';
    form.propertyId.value = property.id;
    form.name.value = property.name;
    form.unitNumber.value = property.unitNumber;
    form.address.value = property.address;
    form.baseRent.value = property.baseRent || 0;
    form.status.value = property.status || 'Vacant';
    form.notes.value = property.notes || '';
  } else {
    title.textContent = 'Add property';
  }

  modal.classList.remove('hidden');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
}

function openPaymentModal() {
  const form = document.getElementById('paymentForm');
  const modal = document.getElementById('paymentModal');
  form.reset();
  form.paymentDate.value = formatDate(new Date());
  form.rentMonth.value = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  if (state.tenants.length) {
    form.tenantId.value = state.tenants[0].id;
  }
  modal.classList.remove('hidden');
}

function handleTenantSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const tenantId = formData.get('tenantId') || createId('tenant');
  const propertyId = formData.get('propertyId');
  const property = getPropertyById(propertyId);

  if (!property) {
    showToast('Please select a valid property before saving the tenant.');
    return;
  }

  const payload = {
    id: tenantId,
    name: formData.get('name')?.trim(),
    phone: formData.get('phone')?.trim(),
    email: formData.get('email')?.trim() || '',
    address: formData.get('address')?.trim(),
    propertyId: property.id,
    propertyName: `${property.name} ${property.unitNumber}`.trim(),
    monthlyRent: Number(formData.get('monthlyRent') || 0),
    securityDeposit: Number(formData.get('securityDeposit') || 0),
    joinDate: formData.get('joinDate'),
    rentCycleDays: Number(formData.get('rentCycleDays') || 30),
    leaseInfo: formData.get('leaseInfo')?.trim() || '',
    createdAt: new Date().toISOString(),
    nextDueDate: '',
    lastPaymentDate: '',
  };

  if (!payload.name || !payload.address || !payload.joinDate || !payload.monthlyRent) {
    showToast('Please complete all required tenant fields.');
    return;
  }

  const existingIndex = state.tenants.findIndex((tenant) => tenant.id === payload.id);
  const existing = existingIndex >= 0 ? state.tenants[existingIndex] : null;

  if (existing) {
    if (existing.propertyId && existing.propertyId !== property.id) {
      const previousProperty = getPropertyById(existing.propertyId);
      if (previousProperty) previousProperty.status = previousProperty.status === 'Occupied' ? 'Vacant' : previousProperty.status;
      previousProperty.occupiedBy = null;
    }
    state.tenants[existingIndex] = {
      ...existing,
      ...payload,
      nextDueDate: existing.nextDueDate || calculateNextDueDate(payload.joinDate, payload.rentCycleDays),
      lastPaymentDate: existing.lastPaymentDate || '',
    };
  } else {
    payload.nextDueDate = calculateNextDueDate(payload.joinDate, payload.rentCycleDays);
    state.tenants.push(payload);
  }

  property.status = 'Occupied';
  property.occupiedBy = payload.id;

  saveData();
  renderAll();
  closeModal('tenantModal');
  showToast(existing ? 'Tenant updated.' : 'Tenant added successfully.');
}

function handlePropertySubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const propertyId = formData.get('propertyId') || createId('property');
  const payload = {
    id: propertyId,
    name: formData.get('name')?.trim(),
    unitNumber: formData.get('unitNumber')?.trim(),
    address: formData.get('address')?.trim(),
    baseRent: Number(formData.get('baseRent') || 0),
    status: formData.get('status') || 'Vacant',
    notes: formData.get('notes')?.trim() || '',
    occupiedBy: null,
    createdAt: new Date().toISOString(),
  };

  if (!payload.name || !payload.unitNumber || !payload.address) {
    showToast('Property name, unit, and address are required.');
    return;
  }

  const existingIndex = state.properties.findIndex((property) => property.id === propertyId);
  if (existingIndex >= 0) {
    state.properties[existingIndex] = { ...state.properties[existingIndex], ...payload };
  } else {
    state.properties.push(payload);
  }

  saveData();
  renderAll();
  closeModal('propertyModal');
  showToast('Property saved.');
}

function handlePaymentSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const tenantId = formData.get('tenantId');
  const amount = Number(formData.get('amount') || 0);
  const paymentDate = formData.get('paymentDate');

  if (!tenantId || !amount || !paymentDate) {
    showToast('Select a tenant and enter a valid payment amount.');
    return;
  }

  const tenant = getTenantById(tenantId);
  if (!tenant) {
    showToast('Tenant not found.');
    return;
  }

  const currentDue = tenant.nextDueDate || calculateNextDueDate(tenant.joinDate, tenant.rentCycleDays || 30);
  const payment = {
    id: createId('payment'),
    tenantId,
    amount,
    paymentDate,
    method: formData.get('method') || 'Cash',
    rentMonth: formData.get('rentMonth') || formatMonth(paymentDate),
    note: formData.get('note')?.trim() || '',
    receiptNumber: `REC-${Math.floor(1000 + Math.random() * 9000)}`,
  };

  state.payments.push(payment);
  tenant.lastPaymentDate = paymentDate;
  tenant.currentDueDate = currentDue;
  tenant.currentRentPeriod = `${formatDateLabel(tenant.joinDate)} → ${formatDateLabel(currentDue)}`;
  tenant.nextDueDate = calculateNextDueDate(currentDue, tenant.rentCycleDays || 30);
  tenant.paymentStatus = 'Paid';

  saveData();
  renderAll();
  closeModal('paymentModal');
  showToast('Payment recorded and receipt generated.');
  openReceiptPreview(payment.id);
}

function handleSettingsSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  state.settings = {
    adminName: formData.get('adminName')?.trim() || 'Admin',
    companyName: formData.get('companyName')?.trim() || 'Property Company',
    contactInfo: formData.get('contactInfo')?.trim() || '',
    currency: formData.get('currency') || 'INR',
    reminderDays: Number(formData.get('reminderDays') || 3),
    logoUrl: formData.get('logoUrl')?.trim() || '',
    googleDriveClientId: formData.get('googleDriveClientId')?.trim() || '',
    googleDriveFolderId: formData.get('googleDriveFolderId')?.trim() || '',
  };

  saveData();
  renderOverview();
  renderSettings();
  showToast('Settings saved.');
}

function deleteTenant(tenantId) {
  const tenant = getTenantById(tenantId);
  if (tenant?.propertyId) {
    const property = getPropertyById(tenant.propertyId);
    if (property) {
      property.status = 'Vacant';
      property.occupiedBy = null;
    }
  }
  state.tenants = state.tenants.filter((tenantItem) => tenantItem.id !== tenantId);
  state.payments = state.payments.filter((payment) => payment.tenantId !== tenantId);
  saveData();
  renderAll();
  showToast('Tenant deleted.');
}

function deleteProperty(propertyId) {
  const property = getPropertyById(propertyId);
  if (property) {
    state.tenants = state.tenants.map((tenant) => {
      if (tenant.propertyId === property.id) {
        return { ...tenant, propertyId: '', propertyName: tenant.propertyName || property.name };
      }
      return tenant;
    });
  }
  state.properties = state.properties.filter((item) => item.id !== propertyId);
  saveData();
  renderAll();
  showToast('Property deleted.');
}

function showTenantProfile(tenantId) {
  const tenant = getTenantById(tenantId);
  if (!tenant) return;

  const totalPaid = getTotalPaymentsForTenant(tenantId);
  const pending = Math.max(tenant.monthlyRent - totalPaid, 0);
  const currentDue = tenant.currentDueDate || tenant.nextDueDate || calculateNextDueDate(tenant.joinDate, tenant.rentCycleDays || 30);
  const status = getTenantStatus(tenant);
  const propertyName = getTenantPropertyName(tenant);

  const profileHtml = `
    <div class="modal hidden" id="profileModal">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>${tenant.name}</h3>
          <button class="icon-btn close-modal" data-close="profileModal">✕</button>
        </div>

        <div class="card-subtext">
          <div class="tenant-identity">
            <div class="avatar">${getInitials(tenant.name)}</div>
            <div>
              <div class="tenant-name">${tenant.name}</div>
              <div class="tenant-small">${propertyName}</div>
            </div>
          </div>

          <div class="info-row"><span class="info-label">Phone</span><span class="info-value">${tenant.phone}</span></div>
          <div class="info-row"><span class="info-label">Email</span><span class="info-value">${tenant.email || '—'}</span></div>
          <div class="info-row"><span class="info-label">Address</span><span class="info-value">${tenant.address}</span></div>
          <div class="info-row"><span class="info-label">Property / room</span><span class="info-value">${propertyName}</span></div>
          <div class="info-row"><span class="info-label">Monthly rent</span><span class="info-value">${formatCurrency(tenant.monthlyRent)}</span></div>
          <div class="info-row"><span class="info-label">Security deposit</span><span class="info-value">${formatCurrency(tenant.securityDeposit || 0)}</span></div>
          <div class="info-row"><span class="info-label">Rent period</span><span class="info-value">${tenant.currentRentPeriod || `${formatDateLabel(tenant.joinDate)} → ${formatDateLabel(currentDue)}`}</span></div>
          <div class="info-row"><span class="info-label">Current due date</span><span class="info-value">${formatDateLabel(currentDue)}</span></div>
          <div class="info-row"><span class="info-label">Days remaining</span><span class="info-value">${getDaysRemaining(currentDue)} days</span></div>
          <div class="info-row"><span class="info-label">Payment status</span><span class="info-value">${status}</span></div>
          <div class="info-row"><span class="info-label">Last payment date</span><span class="info-value">${tenant.lastPaymentDate ? formatDateLabel(tenant.lastPaymentDate) : '—'}</span></div>
          <div class="info-row"><span class="info-label">Next payment due</span><span class="info-value">${formatDateLabel(tenant.nextDueDate)}</span></div>
          <div class="info-row"><span class="info-label">Total paid</span><span class="info-value">${formatCurrency(totalPaid)}</span></div>
          <div class="info-row"><span class="info-label">Pending</span><span class="info-value">${formatCurrency(pending)}</span></div>
        </div>

        <div class="form-actions">
          <button type="button" class="secondary-btn close-modal" data-close="profileModal">Close</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', profileHtml);
  const modal = document.getElementById('profileModal');
  modal.classList.remove('hidden');
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.remove();
    }
  });
  modal.querySelectorAll('.close-modal').forEach((button) => {
    button.addEventListener('click', () => modal.remove());
  });
}

function openReceiptPreview(paymentId) {
  const payment = state.payments.find((item) => item.id === paymentId);
  if (!payment) return;

  const tenant = getTenantById(payment.tenantId);
  const settings = state.settings;
  const previousPending = tenant ? Math.max(Number(tenant.monthlyRent || 0) - getTotalPaymentsForTenant(tenant.id) + Number(payment.amount || 0), 0) : 0;
  const currentBalance = Math.max(previousPending - Number(payment.amount || 0), 0);

  const receiptMarkup = `
    <div class="receipt-header">
      <div class="company-block">
        <div class="company-logo">${settings.companyName ? settings.companyName.slice(0, 1).toUpperCase() : 'R'}</div>
        <div>
          <strong>${settings.companyName}</strong><br />
          <span class="muted">${settings.contactInfo}</span>
        </div>
      </div>
      <div>
        <div style="font-size:0.8rem; color:#6b7280; text-transform:uppercase; letter-spacing:0.12em;">Receipt No</div>
        <strong>${payment.receiptNumber || 'GEN-0001'}</strong>
      </div>
    </div>

    <div class="receipt-meta">
      <div><strong>Tenant:</strong> ${tenant ? tenant.name : '—'}</div>
      <div><strong>Property:</strong> ${tenant ? tenant.propertyName : '—'}</div>
      <div><strong>Payment date:</strong> ${formatDateLabel(payment.paymentDate)}</div>
      <div><strong>Rent month:</strong> ${payment.rentMonth}</div>
      <div><strong>Payment method:</strong> ${payment.method}</div>
    </div>

    <table class="receipt-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Monthly rent</td>
          <td>${formatCurrency(payment.amount)}</td>
        </tr>
        <tr>
          <td>Previous pending</td>
          <td>${formatCurrency(previousPending)}</td>
        </tr>
        <tr>
          <td>Current balance</td>
          <td>${formatCurrency(currentBalance)}</td>
        </tr>
      </tbody>
    </table>

    <div class="signature-box">
      <div>
        <div>Authorized signature</div>
        <div style="margin-top:32px; border-top:1px solid #d1d5db; width:150px; padding-top:8px; text-align:center; font-weight:700;">${settings.adminName}</div>
      </div>
    </div>
  `;

  document.getElementById('receiptPreview').innerHTML = receiptMarkup;
  document.getElementById('receiptModal').classList.remove('hidden');

  document.getElementById('downloadReceiptBtn').onclick = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=680');
    printWindow.document.write(`<!doctype html><html><head><title>Receipt</title><style>body{font-family:Arial,sans-serif;padding:24px;background:#f9fafb;color:#111827} .receipt{max-width:700px;margin:0 auto;background:#fff;padding:28px;border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.08)} ...`);
    printWindow.document.write(document.getElementById('receiptPreview').innerHTML);
    printWindow.document.write('</div></body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };
}

function printCurrentReceipt() {
  const receiptNode = document.getElementById('receiptPreview');
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  printWindow.document.write('<html><head><title>Receipt</title><style>body{font-family:Arial,sans-serif;padding:24px;background:#f3f4f6;} .receipt{max-width:720px; margin:0 auto; background:#fff; border-radius:18px; padding:30px; box-shadow:0 14px 30px rgba(0,0,0,.08)} table{width:100%; border-collapse:collapse} th,td{padding:10px 0px;border-bottom:1px solid #e5e7eb;text-align:left} .signature-box{margin-top:30px; display:flex; justify-content:flex-end} </style></head><body>');
  printWindow.document.write('<div class="receipt">' + receiptNode.innerHTML + '</div>');
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 400);
}

function downloadReceiptPdf() {
  printCurrentReceipt();
}

function confirmAction(message, callback) {
  const dialog = document.getElementById('confirmDialog');
  document.getElementById('confirmMessage').textContent = message;
  state.pendingConfirm = callback;
  dialog.classList.remove('hidden');
}

function closeConfirmDialog() {
  document.getElementById('confirmDialog').classList.add('hidden');
  state.pendingConfirm = null;
}

function sendReminder(tenantId) {
  const tenant = getTenantById(tenantId);
  if (!tenant) return;

  const message = generateReminderMessage(tenant);
  const reminder = {
    id: createId('reminder'),
    tenantId,
    status: 'pending',
    message,
    createdAt: new Date().toISOString(),
  };
  state.reminders.push(reminder);
  saveData();
  renderOverview();
  navigator.clipboard?.writeText(message).catch(() => {});
  showToast('Reminder drafted and copied.');
}

function copyReminder(tenantId) {
  const tenant = getTenantById(tenantId);
  if (!tenant) return;
  const message = generateReminderMessage(tenant);
  navigator.clipboard?.writeText(message).catch(() => {});
  showToast('Reminder message copied to clipboard.');
}

function markReminderSent(tenantId) {
  const reminder = state.reminders.find((item) => item.tenantId === tenantId);
  if (!reminder) return;
  reminder.status = 'sent';
  reminder.sentAt = new Date().toISOString();
  saveData();
  renderOverview();
  showToast('Reminder marked as sent.');
}

function generateReminderMessage(tenant) {
  return `Hello ${tenant.name}, your monthly rent of ${formatCurrency(tenant.monthlyRent)} is due on ${formatDateLabel(tenant.nextDueDate)}. Please make the payment on or before the due date.`;
}

function getDueAlerts() {
  const reminderWindow = Number(state.settings.reminderDays || 3);
  return [...state.tenants]
    .map((tenant) => {
      const status = getTenantStatus(tenant);
      const dueDate = tenant.nextDueDate || calculateNextDueDate(tenant.joinDate, tenant.rentCycleDays || 30);
      const daysLeft = getDaysRemaining(dueDate);

      if (status === 'Paid') return null;
      if (status === 'Overdue' || status === 'Due Today' || daysLeft <= reminderWindow) {
        return {
          id: tenant.id,
          key: `${tenant.id}-${dueDate}`,
          name: tenant.name,
          amount: tenant.monthlyRent,
          dueDate,
          daysLeft,
          status,
          propertyName: getTenantPropertyName(tenant),
          message: status === 'Overdue'
            ? `${tenant.name} is overdue by ${Math.abs(daysLeft)} day(s).`
            : `${tenant.name} rent is due in ${daysLeft} day(s).`,
        };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

function renderNotificationsPanel() {
  const panel = document.getElementById('notificationPanel');
  const list = document.getElementById('notificationList');
  if (!panel || !list) return;

  const alerts = getDueAlerts();
  if (!alerts.length) {
    list.innerHTML = '<div class="empty-state">No active payment alerts.</div>';
    return;
  }

  list.innerHTML = alerts.slice(0, 6).map((alert) => `
    <div class="notification-item">
      <div>
        <strong>${alert.name}</strong>
        <span class="muted">${alert.propertyName}</span>
        <span class="muted">${formatCurrency(alert.amount)} • Due ${formatDateLabel(alert.dueDate)}</span>
        <span class="badge ${statusClass(alert.status)}">${alert.status}</span>
      </div>
      <div class="muted">${alert.daysLeft <= 0 ? 'Late' : `${alert.daysLeft}d`}</div>
    </div>
  `).join('');
}

function triggerDueAlerts(alerts) {
  alerts.forEach((alert) => {
    if (state.notifiedAlertKeys.includes(alert.key)) return;

    state.notifiedAlertKeys.push(alert.key);
    playReminderTone();
    showToast(`Payment alert: ${alert.name} due ${formatDateLabel(alert.dueDate)}.`);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('RentFlow payment alert', {
        body: `${alert.name}: ${formatCurrency(alert.amount)} due ${formatDateLabel(alert.dueDate)}.`,
        icon: 'assets/icon.svg',
      });
    }
  });
}

function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') return;
  Notification.requestPermission().catch(() => {});
}

function playReminderTone() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;

  try {
    const context = new AudioCtor();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(620, context.currentTime + 0.18);
    gainNode.gain.setValueAtTime(0.0001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
    oscillator.onended = () => context.close().catch(() => {});
  } catch (error) {
    console.warn('Reminder tone failed:', error);
  }
}

function getUpcomingDues() {
  return [...state.tenants]
    .filter((tenant) => {
      const status = getTenantStatus(tenant);
      return status === 'Upcoming' || status === 'Due Today' || status === 'Overdue';
    })
    .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));
}

function getUpcomingDueCount() {
  return getUpcomingDues().length;
}

function getTenantStatus(tenant) {
  const currentDueDate = tenant.currentDueDate || tenant.nextDueDate || calculateNextDueDate(tenant.joinDate, tenant.rentCycleDays || 30);
  const dueDate = new Date(`${currentDueDate}T00:00:00`);
  const today = new Date();
  const todayNoTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueNoTime = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  const latestPayment = getLatestPaymentForTenant(tenant.id);
  if (latestPayment && new Date(`${latestPayment.paymentDate}T00:00:00`) >= dueNoTime) {
    const paymentDate = new Date(`${latestPayment.paymentDate}T00:00:00`);
    if (paymentDate.getTime() <= todayNoTime.getTime() && paymentDate.getTime() >= new Date(`${tenant.joinDate}T00:00:00`).getTime()) {
      return 'Paid';
    }
  }

  if (todayNoTime.getTime() > dueNoTime.getTime()) return 'Overdue';
  if (todayNoTime.getTime() === dueNoTime.getTime()) return 'Due Today';
  return 'Upcoming';
}

function statusClass(status) {
  switch (status) {
    case 'Paid': return 'paid';
    case 'Due Today': return 'due-today';
    case 'Overdue': return 'overdue';
    default: return 'upcoming';
  }
}

function buildCalendarEvents() {
  const grouped = {};

  state.tenants.forEach((tenant) => {
    const dueDate = tenant.nextDueDate;
    if (dueDate) {
      const status = getTenantStatus(tenant);
      grouped[dueDate] = grouped[dueDate] || [];
      grouped[dueDate].push({
        name: tenant.name,
        amount: tenant.monthlyRent,
        status,
        statusClass: statusClass(status),
        propertyName: tenant.propertyName,
        type: 'rent',
        label: tenant.name.split(' ')[0],
      });
    }
  });

  state.payments.forEach((payment) => {
    const dateKey = payment.paymentDate;
    grouped[dateKey] = grouped[dateKey] || [];
    grouped[dateKey].push({
      name: getTenantById(payment.tenantId)?.name || 'Tenant',
      amount: payment.amount,
      status: 'Paid',
      statusClass: 'paid',
      propertyName: getTenantById(payment.tenantId)?.propertyName || '',
      type: 'payment',
      label: 'Paid',
    });
  });

  return grouped;
}

function changeMonth(direction) {
  state.currentMonth += direction;
  if (state.currentMonth < 0) {
    state.currentMonth = 11;
    state.currentYear -= 1;
  }
  if (state.currentMonth > 11) {
    state.currentMonth = 0;
    state.currentYear += 1;
  }
  renderCalendar();
}

function getTenantById(id) {
  return state.tenants.find((tenant) => tenant.id === id);
}

function getPropertyById(id) {
  return state.properties.find((property) => property.id === id);
}

function getTenantPropertyName(tenant) {
  if (tenant.propertyId) {
    const property = getPropertyById(tenant.propertyId);
    if (property) return `${property.name} ${property.unitNumber}`.trim();
  }
  return tenant.propertyName || 'No property assigned';
}

function getTotalPaymentsForTenant(tenantId) {
  return state.payments
    .filter((payment) => payment.tenantId === tenantId)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

function getLatestPaymentForTenant(tenantId) {
  const tenantPayments = state.payments
    .filter((payment) => payment.tenantId === tenantId)
    .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
  return tenantPayments[0] || null;
}

function calculateNextDueDate(dateValue, cycleDays) {
  const base = new Date(`${dateValue}T00:00:00`);
  const next = new Date(base.getTime());
  next.setDate(base.getDate() + Number(cycleDays || 30));
  return formatDate(next);
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `${currencySymbols[state.settings.currency] || '₹'}${amount.toLocaleString('en-IN')}`;
}

function formatDate(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMonth(value) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function getInitials(name) {
  return (name || 'T').split(' ').slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
}

function getDaysBetween(startDate, endDate) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((endDate - startDate) / msPerDay);
}

function getDaysRemaining(dateString) {
  if (!dateString) return 0;
  const dueDate = new Date(`${dateString}T00:00:00`);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.ceil((dueDate - start) / (1000 * 60 * 60 * 24)));
}

function createId(prefix) {
  if (window.crypto && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function revealCards() {
  const targets = document.querySelectorAll('.stat-card, .panel, .tenant-card, .receipt-card, .table-panel, .section-hero');
  targets.forEach((el, index) => {
    el.classList.add('reveal');
    setTimeout(() => el.classList.add('visible'), 80 + index * 50);
  });
}

function bindInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window.deferredInstallPrompt = event;
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) installBtn.classList.remove('hidden');
  });

  window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) installBtn.classList.add('hidden');
    showToast('App installed successfully.');
  });
}

async function installApp() {
  if (!window.deferredInstallPrompt) {
    showToast('This browser is not showing an install prompt right now.');
    return;
  }

  window.deferredInstallPrompt.prompt();
  await window.deferredInstallPrompt.userChoice;
  window.deferredInstallPrompt = null;
  const installBtn = document.getElementById('installAppBtn');
  if (installBtn) installBtn.classList.add('hidden');
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.warn('Service worker register failed:', error);
    });
  }
}

function getGoogleDriveStateText() {
  if (!state.settings.googleDriveClientId) return 'Local backup active';
  const token = localStorage.getItem('rentflow-drive-token');
  return token ? 'Drive connected and autosaving' : 'Drive ready — connect to enable backup';
}

async function connectGoogleDrive() {
  const clientId = state.settings.googleDriveClientId;
  if (!clientId) {
    showToast('Add a Google Drive client ID in Settings first.');
    return;
  }

  if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
    showToast('Google Drive script is still loading. Try again in a moment.');
    return;
  }

  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/drive.file',
    callback: (response) => {
      if (response.error) {
        showToast('Google Drive connection was cancelled or failed.');
        return;
      }
      localStorage.setItem('rentflow-drive-token', response.access_token);
      document.getElementById('backupStatus').textContent = 'Drive connected and autosaving';
      showToast('Google Drive connected.');
      backupNow();
    },
  });

  tokenClient.requestAccessToken();
}

function scheduleGoogleDriveBackup(payload) {
  const token = localStorage.getItem('rentflow-drive-token');
  if (!token || !state.settings.googleDriveClientId) return;

  window.clearTimeout(window.rentflowDriveBackupTimer);
  window.rentflowDriveBackupTimer = window.setTimeout(() => {
    uploadBackupToGoogleDrive(payload || JSON.stringify({
      settings: state.settings,
      properties: state.properties,
      tenants: state.tenants,
      payments: state.payments,
      reminders: state.reminders,
    }));
  }, 900);
}

async function backupNow() {
  const payload = JSON.stringify({
    settings: state.settings,
    properties: state.properties,
    tenants: state.tenants,
    payments: state.payments,
    reminders: state.reminders,
  });

  const token = localStorage.getItem('rentflow-drive-token');
  if (!token || !state.settings.googleDriveClientId) {
    localStorage.setItem(STORAGE_KEY, payload);
    showToast('Local backup saved. Connect Drive in Settings for cloud backup.');
    return;
  }

  try {
    await uploadBackupToGoogleDrive(payload);
    showToast('Cloud backup synced to Google Drive.');
  } catch (error) {
    console.error('Drive backup failed:', error);
    showToast('Local backup saved. Drive sync could not complete.');
  }
}

async function uploadBackupToGoogleDrive(payload) {
  const token = localStorage.getItem('rentflow-drive-token');
  if (!token) throw new Error('Google Drive token missing');

  const folderId = state.settings.googleDriveFolderId || '';
  const fileName = `rentflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    ...(folderId ? { parents: [folderId] } : {}),
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([payload], { type: 'application/json' }));

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Drive request failed');
  }

  const backupStatus = document.getElementById('backupStatus');
  if (backupStatus) backupStatus.textContent = 'Drive connected and autosaving';

  return response.json();
}

function showToast(message) {
  const toast = document.getElementById('toast');
  clearTimeout(state.toastTimer);
  toast.textContent = message;
  toast.classList.remove('hidden');
  state.toastTimer = setTimeout(() => toast.classList.add('hidden'), 2200);
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('rentflow-theme', isDark ? 'dark' : 'light');
  document.getElementById('themeToggle').textContent = isDark ? '🌙' : '☀️';
}

function createDemoData() {
  const propertyOneId = createId('property');
  const propertyTwoId = createId('property');
  const propertyThreeId = createId('property');
  const tenantOneId = createId('tenant');
  const tenantTwoId = createId('tenant');
  const tenantThreeId = createId('tenant');

  const properties = [
    {
      id: propertyOneId,
      name: 'Greenstone Residency',
      unitNumber: 'A-204',
      address: 'Greenstone Residency, Sector 14, Pune',
      baseRent: 15000,
      status: 'Occupied',
      notes: 'Corner apartment with balcony',
      occupiedBy: tenantOneId,
      createdAt: '2026-08-10T10:00:00.000Z',
    },
    {
      id: propertyTwoId,
      name: 'Lakeview Tower',
      unitNumber: 'B-302',
      address: 'Lakeview Tower, Wakad, Pune',
      baseRent: 18000,
      status: 'Occupied',
      notes: 'Top-floor unit with lake view',
      occupiedBy: tenantTwoId,
      createdAt: '2026-08-08T09:30:00.000Z',
    },
    {
      id: propertyThreeId,
      name: 'Oakview Homes',
      unitNumber: 'C-105',
      address: 'Oakview Homes, Kharadi, Pune',
      baseRent: 12000,
      status: 'Occupied',
      notes: 'Close to market and metro',
      occupiedBy: tenantThreeId,
      createdAt: '2026-08-02T12:00:00.000Z',
    },
  ];

  const t1 = {
    id: tenantOneId,
    name: 'Rahul Sharma',
    phone: '+91 98765 43210',
    email: 'rahul@horizonestates.com',
    address: 'A-204, Greenstone Residency',
    propertyId: propertyOneId,
    propertyName: 'Greenstone Residency A-204',
    monthlyRent: 15000,
    securityDeposit: 30000,
    joinDate: '2026-08-16',
    rentCycleDays: 30,
    leaseInfo: '1-year lease with 30-day notice',
    nextDueDate: '2026-09-15',
    lastPaymentDate: '2026-08-16',
    createdAt: '2026-08-10T10:00:00.000Z',
  };

  const t2 = {
    id: tenantTwoId,
    name: 'Sneha Patel',
    phone: '+91 91234 55678',
    email: 'sneha@horizonestates.com',
    address: 'B-302, Lakeview Tower',
    propertyId: propertyTwoId,
    propertyName: 'Lakeview Tower B-302',
    monthlyRent: 18000,
    securityDeposit: 36000,
    joinDate: '2026-08-12',
    rentCycleDays: 30,
    leaseInfo: 'Annual contract, no pets allowed',
    nextDueDate: '2026-09-11',
    lastPaymentDate: '',
    createdAt: '2026-08-08T09:30:00.000Z',
  };

  const t3 = {
    id: tenantThreeId,
    name: 'Arjun Mehta',
    phone: '+91 99888 22110',
    email: 'arjun@horizonestates.com',
    address: 'C-105, Oakview Homes',
    propertyId: propertyThreeId,
    propertyName: 'Oakview Homes C-105',
    monthlyRent: 12000,
    securityDeposit: 24000,
    joinDate: '2026-07-18',
    rentCycleDays: 30,
    leaseInfo: 'Family accommodation, quiet hours',
    nextDueDate: '2026-09-16',
    lastPaymentDate: '2026-08-18',
    createdAt: '2026-08-02T12:00:00.000Z',
  };

  const payments = [
    {
      id: createId('payment'),
      tenantId: tenantOneId,
      amount: 15000,
      paymentDate: '2026-08-16',
      method: 'Bank Transfer',
      rentMonth: 'August 2026',
      note: 'Initial rent payment',
      receiptNumber: 'REC-1001',
    },
    {
      id: createId('payment'),
      tenantId: tenantThreeId,
      amount: 12000,
      paymentDate: '2026-08-18',
      method: 'UPI',
      rentMonth: 'August 2026',
      note: 'Paid via GPay',
      receiptNumber: 'REC-1002',
    },
  ];

  return {
    settings: {
      adminName: 'Aarav Sharma',
      companyName: 'Horizon Estates',
      contactInfo: '+91 98765 43210',
      currency: 'INR',
      reminderDays: 3,
      logoUrl: '',
    },
    properties,
    tenants: [t1, t2, t3],
    payments,
  };
}
