// Notifikasi manual refetch
const fetchNotifications = async () => {
  try {
    const data = await apiFetch('/api/notifications?unread=true');
    const badge = document.getElementById('notif-badge');
    const notifBody = document.getElementById('notif-body');
    
    if (!badge || !notifBody) return;

    if (data.length > 0) {
      badge.textContent = data.length;
      badge.style.display = 'block';
      
      notifBody.innerHTML = '';
      data.slice(0, 5).forEach(notif => {
        const item = document.createElement('div');
        item.className = 'notif-item';
        item.innerHTML = `
          <div class="notif-item-title">${notif.title}</div>
          <div class="notif-item-desc">${notif.message}</div>
        `;
        item.onclick = async () => {
          // Tandai sudah dibaca dan hapus dari dropdown
          try {
            await apiFetch(`/api/notifications/${notif._id}/read`, { method: 'PUT' });
            fetchNotifications(); // Refresh dropdown
          } catch(e) {
            console.error('Gagal update notifikasi', e);
          }
        };
        notifBody.appendChild(item);
      });
      
      // Tambahkan tombol lihat semua jika lebih dari 5
      if (data.length > 5) {
        const more = document.createElement('div');
        more.className = 'notif-item';
        more.style.textAlign = 'center';
        more.style.color = 'var(--primary-color)';
        more.innerHTML = `<em>+${data.length - 5} notifikasi lainnya</em>`;
        notifBody.appendChild(more);
      }
    } else {
      badge.style.display = 'none';
      notifBody.innerHTML = '<div class="notif-item"><div class="notif-item-desc" style="text-align:center;">Tidak ada notifikasi baru.</div></div>';
    }

    // Selalu tambahkan tombol "Lihat Semua" di bagian paling bawah
    const viewAll = document.createElement('div');
    viewAll.className = 'notif-item';
    viewAll.style.textAlign = 'center';
    viewAll.style.borderTop = '1px solid var(--border-color)';
    viewAll.style.background = 'var(--bg-main)';
    viewAll.innerHTML = `<a href="/notifications.html" style="color: var(--primary-color); text-decoration: none; font-weight: 500; display: block; width: 100%;">Lihat Semua Notifikasi</a>`;
    notifBody.appendChild(viewAll);

  } catch (err) {
    console.error('Failed to fetch notifications', err);
  }
};

// Toggle dropdown
document.addEventListener('DOMContentLoaded', () => {
  const bell = document.getElementById('notif-bell');
  const dropdown = document.getElementById('notif-dropdown');
  
  if (bell && dropdown) {
    bell.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });
    
    document.addEventListener('click', () => {
      dropdown.classList.remove('show');
    });
    
    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Fetch notifications on load
    fetchNotifications();
    
    // Polling setiap 15 detik agar real-time
    setInterval(fetchNotifications, 15000);
  }
});
