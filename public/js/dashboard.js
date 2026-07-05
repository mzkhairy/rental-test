document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth();
  if (!user) return;
  
  initTopbar();

  // Load stats
  try {
    const vehicles = await apiFetch('/api/vehicles');
    document.getElementById('stat-total-vehicles').textContent = vehicles.length;
    document.getElementById('stat-available-vehicles').textContent = vehicles.filter(v => v.status === 'Available').length;
    
    const rentals = await apiFetch('/api/rentals');
    document.getElementById('stat-active-rentals').textContent = rentals.filter(r => r.status === 'Active').length;

    const transfers = await apiFetch('/api/transfers');
    document.getElementById('stat-active-transfers').textContent = transfers.filter(t => t.status === 'Requested' || t.status === 'Approved' || t.status === 'In Transit').length;

  } catch (err) {
    console.error('Failed to load dashboard stats', err);
  }
});
