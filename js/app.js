(function () {
  const PAGE_SIZE = 12;
  const state = {
    allData: [],
    filtered: [],
    currentPage: 1,
    searchQuery: '',
    activeFilters: { color: null, style: null, setName: null }
  };

  const $ = id => document.getElementById(id);
  const grid = $('grid');
  const search = $('search');
  const filters = $('filters');
  const pagination = $('pagination');
  const resultCount = $('resultCount');
  const clearBtn = $('clearFilters');
  const toast = $('toast');

  let toastTimer = null;

  // ---------- Init ----------
  async function init() {
    try {
      const res = await fetch('data/outfits.json');
      if (!res.ok) throw new Error('Failed to load data');
      state.allData = await res.json();
      state.filtered = [...state.allData];
      renderFilters();
      render();
    } catch (err) {
      grid.innerHTML = '<div class="no-results"><div class="no-results-text">数据加载失败，请刷新页面重试</div></div>';
      console.error(err);
    }
  }

  // ---------- Filters ----------
  function renderFilters() {
    const colors = [...new Set(state.allData.map(d => d.color))];
    const styles = [...new Set(state.allData.map(d => d.style))];
    const sets = [...new Set(state.allData.map(d => d.setName))];

    filters.innerHTML = `
      <div class="filter-group filter-group-color">
        <span class="filter-label filter-label-color">颜色</span>
        ${colors.map(c => `<button class="filter-btn" data-group="color" data-value="${c}">${c}</button>`).join('')}
      </div>
      <div class="filter-group filter-group-style">
        <span class="filter-label filter-label-style">风格</span>
        ${styles.map(s => `<button class="filter-btn" data-group="style" data-value="${s}">${s}</button>`).join('')}
      </div>
      <div class="filter-group filter-group-set">
        <span class="filter-label filter-label-set">套装</span>
        ${sets.map(s => `<button class="filter-btn" data-group="setName" data-value="${s}">${s}</button>`).join('')}
      </div>
    `;

    filters.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.dataset.group;
        const value = btn.dataset.value;
        toggleFilter(group, value);
      });
    });
  }

  function toggleFilter(group, value) {
    if (state.activeFilters[group] === value) {
      state.activeFilters[group] = null;
    } else {
      state.activeFilters[group] = value;
    }
    state.currentPage = 1;
    applyFilters();
    updateFilterUI();
  }

  function updateFilterUI() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      const group = btn.dataset.group;
      const value = btn.dataset.value;
      btn.classList.toggle('active', state.activeFilters[group] === value);
    });
    const hasFilters = Object.values(state.activeFilters).some(v => v !== null);
    clearBtn.style.display = hasFilters ? 'inline-block' : 'none';
  }

  function clearAllFilters() {
    state.activeFilters = { color: null, style: null, setName: null };
    state.currentPage = 1;
    applyFilters();
    updateFilterUI();
  }

  // ---------- Search ----------
  search.addEventListener('input', () => {
    state.searchQuery = search.value.trim();
    state.currentPage = 1;
    applyFilters();
  });

  // ---------- Apply Filters & Search ----------
  function applyFilters() {
    let result = [...state.allData];
    const q = state.searchQuery.toLowerCase();

    if (q) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        (item.aliases || []).some(a => a.toLowerCase().includes(q)) ||
        item.code.toLowerCase().includes(q) ||
        item.color.toLowerCase().includes(q) ||
        item.style.toLowerCase().includes(q) ||
        item.setName.toLowerCase().includes(q)
      );
    }

    if (state.activeFilters.color) {
      result = result.filter(item => item.color === state.activeFilters.color);
    }
    if (state.activeFilters.style) {
      result = result.filter(item => item.style === state.activeFilters.style);
    }
    if (state.activeFilters.setName) {
      result = result.filter(item => item.setName === state.activeFilters.setName);
    }

    state.filtered = result;
    render();
  }

  // ---------- Render Cards ----------
  function render() {
    const total = state.filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    if (state.currentPage > totalPages) {
      state.currentPage = totalPages;
    }

    const start = (state.currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageItems = state.filtered.slice(start, end);

    renderCards(pageItems, total);
    renderPagination(totalPages);
    resultCount.textContent = `共 ${total} 个搭配`;
  }

  function renderCards(items, total) {
    if (total === 0) {
      grid.innerHTML = `
        <div class="no-results">
          <div class="no-results-text">没有找到匹配的搭配</div>
          <div class="no-results-hint">试试其他关键词或清除筛选条件</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(item => {
      const aliases = (item.aliases && item.aliases.length > 0)
        ? item.aliases.join(' / ')
        : '';
      const safeCode = escapeHtml(item.code);
      return `
        <div class="card">
          <div class="card-image">
            <img src="${item.image}" alt="${escapeHtml(item.name)}" loading="lazy">
          </div>
          <div class="card-body">
            <div class="card-name">${escapeHtml(item.name)}</div>
            ${aliases ? `<div class="card-aliases">${escapeHtml(aliases)}</div>` : ''}
            <div class="card-code-wrap">
              <span class="card-code" data-code="${safeCode}">${safeCode}</span>
              <button class="copy-btn" data-code="${safeCode}" title="复制搭配码">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
            <div class="card-tags">
              <span class="tag tag-color">${escapeHtml(item.color)}</span>
              <span class="tag tag-style">${escapeHtml(item.style)}</span>
              <span class="tag tag-set">${escapeHtml(item.setName)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Event delegation for copy
    grid.querySelectorAll('.card-code, .copy-btn').forEach(el => {
      el.addEventListener('click', () => {
        copyCode(el.dataset.code);
      });
    });
  }

  // ---------- Pagination ----------
  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      pagination.innerHTML = '';
      return;
    }

    let html = '';
    const cur = state.currentPage;

    // Prev
    html += `<button class="page-btn" data-page="prev" ${cur <= 1 ? 'disabled' : ''}>&lsaquo;</button>`;

    // First page + ellipsis
    if (cur > 3) {
      html += `<button class="page-btn" data-page="1">1</button>`;
      if (cur > 4) html += `<span class="page-info">…</span>`;
    }

    // Window around current page
    const start = Math.max(1, cur - 1);
    const end = Math.min(totalPages, cur + 1);
    for (let i = start; i <= end; i++) {
      html += `<button class="page-btn ${i === cur ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    // Last page + ellipsis
    if (cur < totalPages - 2) {
      if (cur < totalPages - 3) html += `<span class="page-info">…</span>`;
      html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    // Next
    html += `<button class="page-btn" data-page="next" ${cur >= totalPages ? 'disabled' : ''}>&rsaquo;</button>`;

    pagination.innerHTML = html;

    pagination.querySelectorAll('.page-btn:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.page;
        if (target === 'prev') goToPage(cur - 1);
        else if (target === 'next') goToPage(cur + 1);
        else goToPage(parseInt(target));
      });
    });
  }

  function goToPage(page) {
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
    if (page < 1 || page > totalPages || page === state.currentPage) return;
    state.currentPage = page;
    render();
    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Copy ----------
  function copyCode(code) {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      showToast('已复制到剪贴板 ✓');
    }).catch(() => {
      // Fallback for non-HTTPS or restricted contexts
      try {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('已复制到剪贴板 ✓');
      } catch {
        showToast('复制失败，请手动选中复制');
      }
    });
  }

  // ---------- Toast ----------
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }

  // ---------- Utils ----------
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Clear Filters ----------
  clearBtn.addEventListener('click', clearAllFilters);

  // ---------- Start ----------
  init();
})();
