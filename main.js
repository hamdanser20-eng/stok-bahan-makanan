// Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAR8nOkH-0Ik8fwcEMgjsnqKXMvR-qQqUk",
    authDomain: "insancemerlang-3b037.firebaseapp.com",
    projectId: "insancemerlang-3b037",
    storageBucket: "insancemerlang-3b037.firebasestorage.app",
    messagingSenderId: "150953324871",
    appId: "1:150953324871:web:fe3d3214ce3bc6e1121c62",
    measurementId: "G-1R8MDPMGPK"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const itemsRef = db.collection("bahan_makanan");

// DOM Elements
const tbody = document.getElementById('itemsTableBody');
const totalProductsSpan = document.getElementById('totalProducts');
const totalStockSpan = document.getElementById('totalStock');
const lowStockSpan = document.getElementById('lowStockItems');
const totalCategoriesSpan = document.getElementById('totalCategories');
const totalItemsHeader = document.getElementById('totalItemsHeader');
const searchInput = document.getElementById('searchInput');
const btnSearch = document.getElementById('btnSearch');
const categoryFilterDiv = document.getElementById('categoryFilter');
const successAlert = document.getElementById('successAlert');
const errorAlert = document.getElementById('errorAlert');
const successMsg = document.getElementById('successMessage');
const errorMsg = document.getElementById('errorMessage');

// Modals
const modalTambah = document.getElementById('modalTambah');
const modalUbah = document.getElementById('modalUbah');
const modalHapus = document.getElementById('modalHapus');
const btnTambah = document.getElementById('btnTambah');
const btnSimpanTambah = document.getElementById('btnSimpanTambah');
const btnSimpanUbah = document.getElementById('btnSimpanUbah');
const btnKonfirmasiHapus = document.getElementById('btnKonfirmasiHapus');

// State
let allItems = [];
let currentEditId = null;
let currentDeleteItem = null;
let activeCategory = 'Semua';

// Helper functions
function showSuccess(msg) {
    successMsg.innerText = msg;
    successAlert.style.display = 'flex';
    setTimeout(() => successAlert.style.display = 'none', 2800);
}

function showError(msg) {
    errorMsg.innerText = msg;
    errorAlert.style.display = 'flex';
    setTimeout(() => errorAlert.style.display = 'none', 4000);
}

function formatRupiah(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function getStatusBadge(stok) {
    if (stok === 0) return '<span class="stock-badge badge-danger"><i class="fas fa-skull-crosswalk"></i> Habis</span>';
    if (stok < 2) return '<span class="stock-badge badge-danger"><i class="fas fa-hourglass-half"></i> Sangat Rendah</span>';
    if (stok < 5) return '<span class="stock-badge badge-warning"><i class="fas fa-exclamation"></i> Rendah</span>';
    return '<span class="stock-badge badge-success"><i class="fas fa-check-circle"></i> Cukup</span>';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function renderTable(dataArray) {
    if (!dataArray.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:3rem;">🍽️ Tidak ada bahan ditemukan</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    dataArray.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${escapeHtml(item.nama)}</strong></td>
            <td><span style="background:#f7ede7; padding:4px 12px; border-radius:30px;">${escapeHtml(item.kategori)}</span></td>
            <td>${(item.stok || 0).toFixed(2)} kg</td>
            <td>Rp ${formatRupiah(item.harga || 0)}</td>
            <td>${getStatusBadge(item.stok || 0)}</td>
            <td class="action-buttons">
                <button class="btn-sm-warning edit-btn" data-id="${item.id}"><i class="fas fa-pen"></i> Edit</button>
                <button class="btn-sm-danger delete-btn" data-id="${item.id}"><i class="fas fa-trash"></i> Hapus</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => openEditModal(btn.getAttribute('data-id'))));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => openDeleteModal(btn.getAttribute('data-id'))));
}

function updateStatsUI(itemsArray) {
    let totalStockVal = 0, lowCount = 0, cats = new Set();
    itemsArray.forEach(i => {
        totalStockVal += (i.stok || 0);
        if (i.stok < 5) lowCount++;
        if (i.kategori) cats.add(i.kategori);
    });
    totalProductsSpan.innerText = itemsArray.length;
    totalStockSpan.innerText = totalStockVal.toFixed(2);
    lowStockSpan.innerText = lowCount;
    totalCategoriesSpan.innerText = cats.size;
    totalItemsHeader.innerText = itemsArray.length;
}

function renderCategoryFilter(itemsArr) {
    let catsSet = new Set(itemsArr.map(i => i.kategori).filter(Boolean));
    categoryFilterDiv.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = `category-btn ${activeCategory === 'Semua' ? 'active' : ''}`;
    allBtn.innerText = 'Semua';
    allBtn.onclick = () => {
        activeCategory = 'Semua';
        applyFilters();
    };
    categoryFilterDiv.appendChild(allBtn);
    for (let cat of catsSet) {
        let btn = document.createElement('button');
        btn.className = `category-btn ${activeCategory === cat ? 'active' : ''}`;
        btn.innerText = cat;
        btn.onclick = () => {
            activeCategory = cat;
            applyFilters();
        };
        categoryFilterDiv.appendChild(btn);
    }
}

function applyFilters() {
    let keyword = searchInput.value.toLowerCase();
    let filtered = [...allItems];
    if (activeCategory !== 'Semua') filtered = filtered.filter(i => i.kategori === activeCategory);
    if (keyword) filtered = filtered.filter(i => i.nama.toLowerCase().includes(keyword) || (i.kategori || '').toLowerCase().includes(keyword));
    renderTable(filtered);
}

function openEditModal(id) {
    let item = allItems.find(i => i.id === id);
    if (item) {
        currentEditId = id;
        document.getElementById('idUbah').value = id;
        document.getElementById('namaUbah').value = item.nama;
        document.getElementById('kategoriUbah').value = item.kategori;
        document.getElementById('stokUbah').value = item.stok;
        document.getElementById('hargaUbah').value = item.harga;
        document.getElementById('deskripsiUbah').value = item.deskripsi || '';
        modalUbah.style.display = 'flex';
    }
}

function openDeleteModal(id) {
    let item = allItems.find(i => i.id === id);
    if (item) {
        currentDeleteItem = item;
        document.getElementById('namaBarangHapus').innerText = item.nama;
        modalHapus.style.display = 'flex';
    }
}

async function tambahBarang() {
    let nama = document.getElementById('nama').value.trim();
    let kategori = document.getElementById('kategori').value;
    let stok = parseFloat(document.getElementById('stok').value);
    let harga = parseInt(document.getElementById('harga').value);
    let deskripsi = document.getElementById('deskripsi').value;
    if (!nama || !kategori) {
        showError('Nama dan kategori wajib diisi');
        return;
    }
    try {
        await itemsRef.add({
            nama,
            kategori,
            stok,
            harga,
            deskripsi,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showSuccess('Bahan berhasil ditambahkan');
        closeAllModals();
    } catch (e) {
        showError('Gagal tambah: ' + e.message);
    }
}

async function ubahBarang() {
    let id = document.getElementById('idUbah').value;
    let nama = document.getElementById('namaUbah').value.trim();
    let kategori = document.getElementById('kategoriUbah').value;
    let stok = parseFloat(document.getElementById('stokUbah').value);
    let harga = parseInt(document.getElementById('hargaUbah').value);
    let deskripsi = document.getElementById('deskripsiUbah').value;
    if (!nama || !kategori) {
        showError('Lengkapi data');
        return;
    }
    try {
        await itemsRef.doc(id).update({
            nama,
            kategori,
            stok,
            harga,
            deskripsi,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showSuccess('Data bahan diperbarui');
        closeAllModals();
    } catch (e) {
        showError('Gagal ubah: ' + e.message);
    }
}

async function hapusBarang() {
    if (!currentDeleteItem) return;
    try {
        await itemsRef.doc(currentDeleteItem.id).delete();
        showSuccess(`"${currentDeleteItem.nama}" telah dihapus`);
        closeAllModals();
    } catch (e) {
        showError('Gagal hapus: ' + e.message);
    }
}

function closeAllModals() {
    modalTambah.style.display = 'none';
    modalUbah.style.display = 'none';
    modalHapus.style.display = 'none';
    document.getElementById('formTambah').reset();
    currentEditId = null;
    currentDeleteItem = null;
}

function listenRealtime() {
    itemsRef.orderBy('nama').onSnapshot(snapshot => {
        allItems = [];
        snapshot.forEach(doc => {
            allItems.push({ id: doc.id, ...doc.data() });
        });
        updateStatsUI(allItems);
        renderCategoryFilter(allItems);
        applyFilters();
    }, err => {
        showError('Realtime error: ' + err.message);
    });
}

// Event bindings
btnTambah.onclick = () => { modalTambah.style.display = 'flex'; };
btnSimpanTambah.onclick = tambahBarang;
btnSimpanUbah.onclick = ubahBarang;
btnKonfirmasiHapus.onclick = hapusBarang;

document.querySelectorAll('.close-tambah').forEach(btn => btn.onclick = () => modalTambah.style.display = 'none');
document.querySelectorAll('.close-ubah').forEach(btn => btn.onclick = () => modalUbah.style.display = 'none');
document.querySelectorAll('.close-hapus').forEach(btn => btn.onclick = () => modalHapus.style.display = 'none');

btnSearch.onclick = () => applyFilters();
searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') applyFilters(); });

window.onclick = (e) => {
    if (e.target.classList.contains('modal-overlay')) closeAllModals();
};

// Start realtime listener
listenRealtime();