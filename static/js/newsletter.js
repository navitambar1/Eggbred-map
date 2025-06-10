let isAdminMode = true;
let currentEditingId = null;
let currentYear = null;
let newsletters = {};
document.addEventListener('DOMContentLoaded', function() {
    loadNewsletters();
    const btn = document.querySelector('.admin-btn');
    if (btn) {
        btn.textContent = 'Exit Admin';
        btn.style.background = 'rgba(220, 53, 69, 0.8)';
    }
});
function initializeDefaultYears() {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 4; i++) {
        const year = (currentYear + i).toString();
        if (!newsletters[year]) {
            newsletters[year] = [];
        }
    }
}

async function loadNewsletters() {
    try {
        const response = await fetch('/api/newsletters');
        newsletters = await response.json();
        initializeDefaultYears(); // <-- Ensure default years exist
        renderNewsletters();
    } catch (error) {
        console.error('Error loading newsletters:', error);
        initializeDefaultYears(); // <-- Even in fallback
        renderNewsletters();
    }
}

// Initialize with sample data
function initializeSampleData() {
    newsletters = {
        '2025': [
            { id: 1, month: 'January', day: 15, url: 'https://example.com/jan2025.pdf' },
            { id: 2, month: 'February', day: 14, url: 'https://example.com/feb2025.pdf' },
            { id: 3, month: 'March', day: 10, url: 'https://example.com/mar2025.pdf' }
        ],
    };
}
// Render newsletters
function renderNewsletters() {
    const grid = document.getElementById('newsletterGrid');
    grid.innerHTML = '';
    const years = Object.keys(newsletters).sort((a, b) => a - b); // ✅ ascending order
    years.forEach(year => {
        const yearColumn = createYearColumn(year, newsletters[year]);
        grid.appendChild(yearColumn);
    });
}
// Create year column
function createYearColumn(year, yearNewsletters) {
    const column = document.createElement('div');
    column.className = 'year-column';

    const header = document.createElement('div');
    header.className = 'year-header';
    header.textContent = year;
    // header.onclick = () => toggleYear(year);

    const list = document.createElement('div');
    list.className = 'newsletter-list';
    list.id = `year-${year}`;

    // ✅ ADD THIS LINE to make it visible by default
    list.classList.add('active');

    yearNewsletters.forEach(newsletter => {
        const item = createNewsletterItem(newsletter, year);
        list.appendChild(item);
    });

    if (isAdminMode) {
        const addItem = document.createElement('div');
        addItem.className = 'newsletter-item add-newsletter-item';
        addItem.textContent = '+ Add Newsletter';
        addItem.onclick = () => openAddModal(year);
        list.appendChild(addItem);
    }
    column.appendChild(header);
    column.appendChild(list);
    return column;
}

// Create newsletter item
function createNewsletterItem(newsletter, year) {
    const item = document.createElement('div');
    item.className = 'newsletter-item';
    const link = document.createElement('span');
    link.className = 'newsletter-link';
    link.textContent = `${newsletter.month} ${newsletter.day}`;
    link.onclick = () => window.open(newsletter.url, '_blank')
    item.appendChild(link);
    if (isAdminMode) {
        const controls = document.createElement('span');
        controls.className = 'edit-controls show';
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = 'Edit';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            editNewsletter(newsletter, year);
        };
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteNewsletter(newsletter.id, year);
        };
        controls.appendChild(editBtn);
        controls.appendChild(deleteBtn);
        item.appendChild(controls);
    }
    return item;
}

// Toggle admin mode
function toggleAdminMode() {
    isAdminMode = !isAdminMode;
    const btn = event.target;
    btn.textContent = isAdminMode ? 'Exit Admin' : 'Admin Mode';
    btn.style.background = isAdminMode ? 'rgba(220, 53, 69, 0.8)' : 'rgba(255, 255, 255, 0.2)';
    renderNewsletters();
}
// Open add newsletter modal
function openAddModal(year) {
    currentYear = year;
    currentEditingId = null;
    document.getElementById('modalTitle').textContent = 'Add Newsletter';
    document.getElementById('newsletterForm').reset();
    document.getElementById('newsletterModal').style.display = 'block';
}
// Edit newsletter
function editNewsletter(newsletter, year) {
    currentYear = year;
    currentEditingId = newsletter.id;
    document.getElementById('modalTitle').textContent = 'Edit Newsletter';
    document.getElementById('newsletterMonth').value = newsletter.month;
    document.getElementById('newsletterDay').value = newsletter.day;
    document.getElementById('newsletterUrl').value = newsletter.url;
    document.getElementById('newsletterModal').style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('newsletterModal').style.display = 'none';
}

// Add new year
function addNewYear() {
    const currentMaxYear = Math.max(...Object.keys(newsletters).map(Number));
    document.getElementById('newYear').value = currentMaxYear + 1;
    document.getElementById('yearModal').style.display = 'block';
}

// Close year modal
function closeYearModal() {
    document.getElementById('yearModal').style.display = 'none';
}

// Handle newsletter form submission
document.getElementById('newsletterForm').addEventListener('submit', async function(e) {
    e.preventDefault();            
    const month = document.getElementById('newsletterMonth').value;
    const day = parseInt(document.getElementById('newsletterDay').value);
    const url = document.getElementById('newsletterUrl').value;            
    const newsletterData = {
        month: month,
        day: day,
        url: url,
        year: currentYear
    };
    try {
        let response;
        if (currentEditingId) {
            response = await fetch(`/api/newsletters/${currentEditingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newsletterData)
            });
        } else {
            response = await fetch('/api/newsletters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newsletterData)
            });
        }
        if (response.ok) {
            loadNewsletters();
            closeModal();
        } else {
            alert('Error saving newsletter');
        }
    } catch (error) {
        console.error('Error:', error);
        // For demo purposes, update local data
        if (currentEditingId) {
            const newsletter = newsletters[currentYear].find(n => n.id === currentEditingId);
            if (newsletter) {
                newsletter.month = month;
                newsletter.day = day;
                newsletter.url = url;
            }
        } else {
            if (!newsletters[currentYear]) {
                newsletters[currentYear] = [];
            }
            newsletters[currentYear].push({
                id: Date.now(),
                month: month,
                day: day,
                url: url
            });
        }
        renderNewsletters();
        closeModal();
    }
});
// Handle year form submission
document.getElementById('yearForm').addEventListener('submit', async function(e) {
    e.preventDefault();            
    const year = document.getElementById('newYear').value;
        if (newsletters[year]) {
            alert('Year already exists!');
            return;
        }       
    try {
        const response = await fetch('/api/years', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year: year })
        });
        if (response.ok) {
            newsletters[year] = [];
            renderNewsletters();
            closeYearModal();
        } else {
            alert('Error adding year');
        }
    } catch (error) {
        console.error('Error:', error);
        // For demo purposes, add year locally
        newsletters[year] = [];
        renderNewsletters();
        closeYearModal();
    }
});
// Delete newsletter
async function deleteNewsletter(id, year) {
    if (!confirm('Are you sure you want to delete this newsletter?')) {
        return;
    }
    try {
        const response = await fetch(`/api/newsletters/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            loadNewsletters();
        } else {
            alert('Error deleting newsletter');
        }
    } catch (error) {
        console.error('Error:', error);
        newsletters[year] = newsletters[year].filter(n => n.id !== id);
        renderNewsletters();
    }
}
// Close modals when clicking outside
window.onclick = function(event) {
    const newsletterModal = document.getElementById('newsletterModal');
    const yearModal = document.getElementById('yearModal');
    if (event.target === newsletterModal) {
        closeModal();
    }
    if (event.target === yearModal) {
        closeYearModal();
    }
}