/* ==========================================================================
 * admin/js/page-products.js — Mục "Sản phẩm"
 *
 * Thêm / sửa / xóa sản phẩm, kèm tìm kiếm không dấu, lọc theo danh mục và
 * tình trạng kho, sắp xếp, phân trang, và thao tác hàng loạt.
 *
 * Ràng buộc quan trọng: KHÔNG cho xóa sản phẩm đã nằm trong đơn hàng nào.
 * Cột order_item.product_id là khóa ngoại trỏ tới product.id nhưng không có
 * ON DELETE, nên xóa đi sẽ để lại dòng hàng mồ côi — đơn cũ mất luôn tên sản
 * phẩm. Trường hợp đó giao diện gợi ý đánh dấu "hết hàng" thay vì xóa.
 * ========================================================================== */

(function (Admin) {
  'use strict';

  var U = Admin.util, esc = U.esc, ui = Admin.ui;
  var supabase = window.supabaseClient;

  /* Trạng thái bộ lọc — giữ ngoài hàm render để chuyển mục rồi quay lại
     vẫn thấy đúng chỗ đang xem. */
  var state = { tab: 'catalog', q: '', cat: 'all', stock: 'all', rating: 'all', sort: 'id-desc', page: 1, size: 12 };
  var picked = {};        // id các dòng đang tick chọn

  var SORTS = {
    'id-desc':    { label: 'Mới nhập trước' },
    'id-asc':     { label: 'Cũ nhất trước' },
    'name-asc':   { label: 'Tên A → Z' },
    'price-desc': { label: 'Giá cao → thấp' },
    'price-asc':  { label: 'Giá thấp → cao' },
    'rating-desc': { label: 'Đánh giá cao nhất' }
  };

  /* ======================================================================
   * 1. TRUY VẤN
   * ====================================================================== */

  async function categories() {
    var { data } = await supabase.from('category').select('id, name').order('id');
    return data || [];
  }

  /**
   * Lấy danh sách sản phẩm đã lọc.
   */
  async function fetchAll() {
    var query = supabase.from('product').select('*, category:category_id(name)');

    if (state.cat !== 'all') query = query.eq('category_id', Number(state.cat));
    if (state.stock !== 'all') query = query.eq('in_stock', Number(state.stock));
    if (state.rating === 'none') query = query.is('rating', null);
    if (state.rating === 'has') query = query.not('rating', 'is', null);

    if (state.sort === 'id-desc') query = query.order('id', { ascending: false });
    else if (state.sort === 'id-asc') query = query.order('id', { ascending: true });
    else if (state.sort === 'name-asc') query = query.order('name', { ascending: true });
    else if (state.sort === 'price-desc') query = query.order('price', { ascending: false });
    else if (state.sort === 'price-asc') query = query.order('price', { ascending: true });
    else if (state.sort === 'rating-desc') query = query.order('rating', { ascending: false, nullsFirst: false });

    var { data } = await query;
    var rows = data || [];

    for (var i = 0; i < rows.length; i++) {
      var p = rows[i];
      if (p.category) p.category_name = p.category.name;
      
      var { count } = await supabase.from('order_item')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', p.id);
      p.order_lines = count || 0;
    }

    if (state.q) {
      var key = U.deaccent(state.q);
      rows = rows.filter(function (p) {
        return U.deaccent(p.name).indexOf(key) !== -1 ||
               U.deaccent(p.category_name || '').indexOf(key) !== -1 ||
               String(p.id) === state.q.trim();
      });
    }
    return rows;
  }

  async function knownImages() {
    var { data } = await supabase.from('product').select('image').not('image', 'is', null).neq('image', '');
    if (!data) return [];
    var images = data.map(function (r) { return r.image; });
    return images.filter(function(v, i, a) { return a.indexOf(v) === i; }).sort();
  }

  /* ======================================================================
   * 2. VẼ TRANG
   * ====================================================================== */

  async function render(view) {
    // Nhận bộ lọc gửi kèm từ trang tổng quan: #/products?stock=0
    var q = Admin.query();
    if (q.tab !== undefined && (q.tab === 'catalog' || q.tab === 'b2b-pricing')) { state.tab = q.tab; }
    if (q.stock !== undefined) { state.stock = q.stock; state.page = 1; }
    if (q.cat !== undefined) { state.cat = q.cat; state.page = 1; }
    if (q.rating !== undefined) { state.rating = q.rating; state.page = 1; }

    var subNavHtml =
      '<div class="card border shadow-sm mb-3">' +
        '<div class="card-body py-2 px-3 d-flex flex-wrap gap-2 align-items-center justify-content-between">' +
          '<ul class="nav nav-pills b2b-subnav gap-1">' +
            '<li class="nav-item">' +
              '<button type="button" class="nav-link' + (state.tab === 'catalog' ? ' active' : '') + '" data-prod-tab="catalog">' +
                '<i class="bi bi-box-seam me-1"></i>1. Danh sách Sản phẩm Website' +
              '</button>' +
            '</li>' +
            '<li class="nav-item">' +
              '<button type="button" class="nav-link' + (state.tab === 'b2b-pricing' ? ' active' : '') + '" data-prod-tab="b2b-pricing">' +
                '<i class="bi bi-calculator-fill me-1"></i>2. Bảng tính Giá vốn, Chiết khấu 3 Bậc MOQ (300 - 500 - 1.000c) &amp; Công nợ' +
              '</button>' +
            '</li>' +
          '</ul>' +
        '</div>' +
      '</div>';

    if (state.tab === 'b2b-pricing') {
      var allWebProducts = await fetchAll();
      view.innerHTML = subNavHtml + '<div id="b2bPricingView"></div>';
      view.querySelectorAll('[data-prod-tab]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.tab = btn.getAttribute('data-prod-tab');
          render(view);
        });
      });
      renderB2BPricingCalculator(view.querySelector('#b2bPricingView'), allWebProducts);
      return;
    }

    var cats = await categories();
    var rows = await fetchAll();
    var pages = Math.max(1, Math.ceil(rows.length / state.size));
    if (state.page > pages) state.page = pages;
    var slice = rows.slice((state.page - 1) * state.size, state.page * state.size);

    view.innerHTML =
      subNavHtml +
      '<div class="card">' +
        '<div class="card-header">' +
          '<div class="d-flex flex-wrap gap-2 align-items-center w-100">' +

            '<div class="position-relative flex-grow-1" style="min-width:220px;max-width:340px">' +
              '<i class="bi bi-search position-absolute text-ink-3" ' +
                 'style="left:.75rem;top:50%;transform:translateY(-50%)"></i>' +
              '<input type="search" class="form-control ps-5" id="pSearch" ' +
                     'placeholder="Tìm theo tên hoặc mã (gõ không dấu cũng ra)" ' +
                     'value="' + esc(state.q) + '" aria-label="Tìm sản phẩm">' +
            '</div>' +

            '<select class="form-select w-auto" id="pCat" aria-label="Lọc theo danh mục">' +
              '<option value="all">Mọi danh mục</option>' +
              cats.map(function (c) {
                return '<option value="' + c.id + '"' +
                       (state.cat === String(c.id) ? ' selected' : '') + '>' +
                       esc(c.name) + '</option>';
              }).join('') +
            '</select>' +

            '<select class="form-select w-auto" id="pStock" aria-label="Lọc theo tình trạng kho">' +
              '<option value="all">Mọi tình trạng</option>' +
              '<option value="1"' + (state.stock === '1' ? ' selected' : '') + '>Còn hàng</option>' +
              '<option value="0"' + (state.stock === '0' ? ' selected' : '') + '>Hết hàng</option>' +
            '</select>' +

            '<select class="form-select w-auto" id="pSort" aria-label="Sắp xếp">' +
              Object.keys(SORTS).map(function (k) {
                return '<option value="' + k + '"' + (state.sort === k ? ' selected' : '') + '>' +
                       esc(SORTS[k].label) + '</option>';
              }).join('') +
            '</select>' +

            '<div class="ms-auto d-flex gap-2">' +
              (state.rating !== 'all' || state.stock !== 'all' || state.cat !== 'all' || state.q
                ? '<button type="button" class="btn btn-light border" id="pReset">' +
                  '<i class="bi bi-x-circle me-1"></i>Bỏ lọc</button>' : '') +
              '<button type="button" class="btn btn-primary" id="pAdd">' +
                '<i class="bi bi-plus-lg me-1"></i>Thêm sản phẩm</button>' +
            '</div>' +

          '</div>' +
        '</div>' +

        '<div id="pBulk" class="px-3 py-2 border-bottom bg-brand-lighter d-none">' +
          '<div class="d-flex flex-wrap align-items-center gap-2 fs-13">' +
            '<span id="pBulkCount" class="fw-semibold"></span>' +
            '<button type="button" class="btn btn-sm btn-light border" data-bulk="1">' +
              '<i class="bi bi-check-circle me-1"></i>Đánh dấu còn hàng</button>' +
            '<button type="button" class="btn btn-sm btn-light border" data-bulk="0">' +
              '<i class="bi bi-x-circle me-1"></i>Đánh dấu hết hàng</button>' +
            '<button type="button" class="btn btn-sm btn-outline-danger" data-bulk="del">' +
              '<i class="bi bi-trash me-1"></i>Xóa</button>' +
            '<button type="button" class="btn btn-sm btn-link text-decoration-none ms-auto" ' +
                    'data-bulk="none">Bỏ chọn</button>' +
          '</div>' +
        '</div>' +

        '<div class="table-responsive">' + table(slice) + '</div>' +

        '<div class="card-header border-top border-bottom-0 d-flex flex-wrap gap-2">' +
          '<span class="fs-13 text-ink-2">' +
            ui.rangeText(rows.length, state.page, state.size, 'sản phẩm') + '</span>' +
          '<div class="ms-auto" id="pPager">' + ui.pager(rows.length, state.page, state.size) + '</div>' +
        '</div>' +
      '</div>';

    bind(view, rows);
  }

  function table(rows) {
    if (!rows.length) {
      return ui.emptyState('bi-box-seam', 'Không tìm thấy sản phẩm nào',
        'Thử đổi từ khóa hoặc bỏ bớt bộ lọc.');
    }

    return '<table class="table table-hover align-middle mb-0">' +
      '<thead><tr>' +
        '<th style="width:36px"><input type="checkbox" class="form-check-input" id="pAllChk" ' +
            'aria-label="Chọn tất cả"></th>' +
        '<th style="width:64px">Ảnh</th>' +
        '<th>Sản phẩm</th>' +
        '<th>Danh mục</th>' +
        '<th class="num">Giá</th>' +
        '<th>Đặt tối thiểu</th>' +
        '<th class="num">Đánh giá</th>' +
        '<th>Kho</th>' +
        '<th style="width:120px" class="text-end">Thao tác</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (p) {
        return '<tr data-id="' + p.id + '"' + (p.is_hidden ? ' style="opacity:0.6"' : '') + '>' +
          '<td><input type="checkbox" class="form-check-input" data-pick="' + p.id + '"' +
             (picked[p.id] ? ' checked' : '') + ' aria-label="Chọn sản phẩm ' + p.id + '"></td>' +
          '<td>' + U.imgTag(p.image, 'thumb', p.name) + '</td>' +
          '<td style="min-width:260px;max-width:420px">' +
            '<div class="clamp-2 fw-semibold fs-13" title="' + esc(p.name) + '">' +
              esc(p.name) + (p.is_hidden ? ' <span class="badge bg-secondary-subtle text-secondary ms-1">Đã ẩn</span>' : '') + '</div>' +
            '<div class="fs-12 text-ink-3">Mã #' + p.id +
              (p.order_lines ? ' · đã bán trong ' + p.order_lines + ' đơn' : '') + '</div>' +
          '</td>' +
          '<td class="fs-13">' + (p.category_name
              ? esc(p.category_name)
              : '<span class="badge bg-danger-subtle text-danger-emphasis">Danh mục lỗi</span>') +
          '</td>' +
          '<td class="num fw-semibold">' + esc(U.vnd(p.price)) + '</td>' +
          '<td class="fs-13 text-ink-2">' + esc(p.moq || '—') + '</td>' +
          '<td class="num fs-13">' + (p.rating === null
              ? '<span class="text-ink-3">—</span>'
              : '<i class="bi bi-star-fill text-warning me-1"></i>' + p.rating.toFixed(1)) + '</td>' +
          '<td>' + (p.in_stock
              ? '<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle">Còn hàng</span>'
              : '<span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle">Hết hàng</span>') +
          '</td>' +
          '<td class="text-end text-nowrap">' +
            '<button type="button" class="btn btn-sm btn-light border ' + (p.is_hidden ? 'text-secondary' : 'text-primary') + '" data-toggle-vis="' + p.id +
                   '" title="' + (p.is_hidden ? 'Hiện lại' : 'Ẩn sản phẩm') + '" aria-label="Ẩn/Hiện sản phẩm"><i class="bi ' + (p.is_hidden ? 'bi-eye-slash' : 'bi-eye') + '"></i></button> ' +
            '<button type="button" class="btn btn-sm btn-light border" data-edit="' + p.id +
                   '" title="Sửa" aria-label="Sửa sản phẩm"><i class="bi bi-pencil"></i></button> ' +
            '<button type="button" class="btn btn-sm btn-light border text-danger" data-del="' + p.id +
                   '" title="Xóa" aria-label="Xóa sản phẩm"><i class="bi bi-trash"></i></button>' +
          '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  /* ======================================================================
   * 3. GẮN SỰ KIỆN
   * ====================================================================== */

  function bind(view, rows) {
    var $ = function (s) { return view.querySelector(s); };

    view.querySelectorAll('[data-prod-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.tab = btn.getAttribute('data-prod-tab');
        render(view);
      });
    });

    $('#pSearch').addEventListener('input', U.debounce(function (e) {
      state.q = e.target.value;
      state.page = 1;
      Admin.reload();
      // Trả con trỏ về ô tìm kiếm sau khi vẽ lại, để gõ tiếp không bị ngắt
      var box = document.querySelector('#pSearch');
      if (box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
    }, 280));

    $('#pCat').addEventListener('change', function (e) { setFilter('cat', e.target.value); });
    $('#pStock').addEventListener('change', function (e) { setFilter('stock', e.target.value); });
    $('#pSort').addEventListener('change', function (e) {
      state.sort = e.target.value; Admin.reload();
    });

    var reset = $('#pReset');
    if (reset) reset.addEventListener('click', function () {
      state.q = ''; state.cat = 'all'; state.stock = 'all'; state.rating = 'all'; state.page = 1;
      clearQuery();
      Admin.reload();
    });

    $('#pAdd').addEventListener('click', function () { openForm(null); });

    // --- Chọn dòng ---
    var allChk = $('#pAllChk');
    if (allChk) allChk.addEventListener('change', function () {
      rows.slice((state.page - 1) * state.size, state.page * state.size).forEach(function (p) {
        if (allChk.checked) picked[p.id] = true; else delete picked[p.id];
      });
      view.querySelectorAll('[data-pick]').forEach(function (c) { c.checked = allChk.checked; });
      syncBulk(view);
    });

    view.querySelectorAll('[data-pick]').forEach(function (c) {
      c.addEventListener('change', function () {
        var id = c.getAttribute('data-pick');
        if (c.checked) picked[id] = true; else delete picked[id];
        syncBulk(view);
      });
    });

    view.querySelectorAll('[data-bulk]').forEach(function (b) {
      b.addEventListener('click', function () { bulk(b.getAttribute('data-bulk')); });
    });

    // --- Sửa / xóa / ẩn hiện ---
    view.querySelectorAll('[data-toggle-vis]').forEach(function (b) {
      b.addEventListener('click', function () { toggleVisibility(Number(b.getAttribute('data-toggle-vis'))); });
    });
    view.querySelectorAll('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () { openForm(Number(b.getAttribute('data-edit'))); });
    });
    view.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () { remove(Number(b.getAttribute('data-del'))); });
    });

    // --- Phân trang ---
    var pager = $('#pPager');
    if (pager) pager.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-page]');
      if (!btn) return;
      state.page = Number(btn.getAttribute('data-page'));
      Admin.reload();
    });

    syncBulk(view);
  }

  function setFilter(key, value) {
    state[key] = value;
    state.page = 1;
    clearQuery();
    Admin.reload();
  }

  /** Xóa tham số lọc trên hash để lần vẽ sau không bị nó ghi đè trở lại. */
  function clearQuery() {
    if (location.hash.indexOf('?') !== -1) {
      history.replaceState(null, '', location.pathname + '#/products');
    }
  }

  function syncBulk(view) {
    var ids = Object.keys(picked);
    var bar = view.querySelector('#pBulk');
    if (!bar) return;
    bar.classList.toggle('d-none', ids.length === 0);
    var label = view.querySelector('#pBulkCount');
    if (label) label.textContent = 'Đã chọn ' + ids.length + ' sản phẩm';
  }

  /* ======================================================================
   * 4. THAO TÁC HÀNG LOẠT
   * ====================================================================== */

  async function bulk(action) {
    var ids = Object.keys(picked).map(Number);
    if (!ids.length) return;

    if (action === 'none') { picked = {}; Admin.reload(); return; }

    if (action === '0' || action === '1') {
      for (var i = 0; i < ids.length; i++) {
        await supabase.from('product').update({ in_stock: Number(action) }).eq('id', ids[i]);
      }
      picked = {};
      ui.toast('Đã cập nhật tình trạng kho cho ' + ids.length + ' sản phẩm.', 'ok');
      Admin.reload();
      return;
    }

    if (action === 'del') {
      var locked = [];
      for (var j = 0; j < ids.length; j++) {
        var id = ids[j];
        var { count } = await supabase.from('order_item').select('*', { count: 'exact', head: true }).eq('product_id', id);
        if (count > 0) locked.push(id);
      }
      
      var free = ids.filter(function (id) { return locked.indexOf(id) === -1; });

      if (!free.length) {
        ui.toast('Tất cả sản phẩm đã chọn đều nằm trong đơn hàng nên không xóa được.', 'err');
        return;
      }

      ui.confirm({
        title: 'Xóa ' + free.length + ' sản phẩm?',
        rawMessage:
          'Thao tác này không hoàn tác được.' +
          (locked.length
            ? '<br><br><span class="badge bg-warning-subtle text-warning-emphasis">Bỏ qua ' +
              locked.length + ' sản phẩm</span> vì đang nằm trong đơn hàng đã ghi nhận.'
            : ''),
        okText: 'Xóa ' + free.length + ' sản phẩm'
      }).then(async function (ok) {
        if (!ok) return;
        for (var k = 0; k < free.length; k++) {
          await supabase.from('product').delete().eq('id', free[k]);
        }
        picked = {};
        ui.toast('Đã xóa ' + free.length + ' sản phẩm.', 'ok');
        Admin.reload();
      });
    }
  }

  /* ======================================================================
   * 5. XÓA / ÂN HIỆN MỘT SẢN PHẨM
   * ====================================================================== */

  async function toggleVisibility(id) {
    var { data: p } = await supabase.from('product').select('is_hidden').eq('id', id).single();
    if (!p) return;
    var newStatus = p.is_hidden ? false : true;
    var { error } = await supabase.from('product').update({ is_hidden: newStatus }).eq('id', id);
    if (error) {
      ui.toast('Lỗi khi cập nhật trạng thái.', 'err');
    } else {
      ui.toast(newStatus ? 'Đã ẩn sản phẩm.' : 'Đã hiện sản phẩm.', 'ok');
      Admin.reload();
    }
  }

  async function remove(id) {
    var { data: p } = await supabase.from('product').select('name').eq('id', id).single();
    if (!p) return;

    var { count: used } = await supabase.from('order_item').select('*', { count: 'exact', head: true }).eq('product_id', id);
    if (used > 0) {
      ui.modal({
        title: 'Không thể xóa sản phẩm này',
        body:
          '<p class="mb-2">Sản phẩm <strong>' + esc(p.name) + '</strong> đã xuất hiện trong ' +
          '<strong>' + used + ' dòng hàng</strong> của các đơn đã ghi nhận.</p>' +
          '<p class="fs-13 text-ink-2 mb-0">Xóa đi thì những đơn hàng cũ sẽ mất tên sản phẩm ' +
          'và không còn tra cứu được. Nếu muốn ngừng bán, hãy đánh dấu <em>hết hàng</em> — ' +
          'sản phẩm sẽ biến mất khỏi phần giới thiệu nhưng lịch sử đơn hàng vẫn nguyên vẹn.</p>',
        footer:
          '<button type="button" class="btn btn-light border" data-bs-dismiss="modal">Đóng</button>' +
          '<button type="button" class="btn btn-primary" data-oos>' +
            '<i class="bi bi-x-circle me-1"></i>Đánh dấu hết hàng</button>',
        onReady: function (body, close, el) {
          el.querySelector('[data-oos]').addEventListener('click', async function () {
            await supabase.from('product').update({ in_stock: 0 }).eq('id', id);
            close();
            ui.toast('Đã đánh dấu "' + p.name.slice(0, 40) + '…" là hết hàng.', 'ok');
            Admin.reload();
          });
        }
      });
      return;
    }

    ui.confirm({
      title: 'Xóa sản phẩm?',
      rawMessage: 'Xóa vĩnh viễn <strong>' + esc(p.name) + '</strong>? Thao tác này không hoàn tác được.',
      okText: 'Xóa sản phẩm'
    }).then(async function (ok) {
      if (!ok) return;
      await supabase.from('product').delete().eq('id', id);
      delete picked[id];
      ui.toast('Đã xóa sản phẩm.', 'ok');
      Admin.reload();
    });
  }

  /* ======================================================================
   * 6. BIỂU MẪU THÊM / SỬA
   * ====================================================================== */

  async function openForm(id) {
    var p;
    if (id) {
      var { data } = await supabase.from('product').select('*').eq('id', id).single();
      p = data;
    } else {
      p = { id: null, category_id: null, name: '', description: '', price: '', image: '',
            in_stock: 1, moq: '', rating: null, price_tiers: null };
    }
    if (!p) { ui.toast('Không tìm thấy sản phẩm.', 'err'); return; }

    var specs = { text: p.description || '', thickness: p.thickness || '', weight: p.weight || '', length: p.length || '', adhesion: p.adhesion || '', application: p.application || '' };

    var cats = await categories();
    var imgs = await knownImages();

    ui.modal({
      title: id ? 'Sửa sản phẩm #' + id : 'Thêm sản phẩm mới',
      size: 'lg',
      body:
        '<form id="prodForm" novalidate>' +
          '<div class="row g-3">' +

            '<div class="col-12">' +
              '<label class="form-label" for="f-name">Tên sản phẩm <span class="text-danger">*</span></label>' +
              '<textarea class="form-control" id="f-name" name="name" rows="2" ' +
                        'placeholder="Ví dụ: Băng keo trong 48mm x 100 yard">' + esc(p.name) + '</textarea>' +
            '</div>' +

            '<div class="col-md-6">' +
              '<label class="form-label" for="f-cat">Danh mục <span class="text-danger">*</span></label>' +
              '<select class="form-select" id="f-cat" name="category_id">' +
                '<option value="">— Chọn danh mục —</option>' +
                cats.map(function (c) {
                  return '<option value="' + c.id + '"' +
                         (String(p.category_id) === String(c.id) ? ' selected' : '') + '>' +
                         esc(c.name) + '</option>';
                }).join('') +
              '</select>' +
            '</div>' +

            '<div class="col-md-6">' +
              '<label class="form-label" for="f-price">Giá bán (đồng) <span class="text-danger">*</span></label>' +
              '<div class="input-group">' +
                '<input class="form-control" id="f-price" name="price" inputmode="numeric" ' +
                       'value="' + esc(p.price === '' ? '' : p.price) + '">' +
                '<span class="input-group-text" id="pricePreview">₫</span>' +
              '</div>' +
              '<div class="form-text fs-12">Nhập số nguyên, đơn vị đồng. CSDL lưu kiểu INTEGER ' +
                'để cộng tiền đơn hàng không bị sai số lẻ.</div>' +
            '</div>' +
            
            '<div class="col-12 mt-2">' +
              '<div class="d-flex justify-content-between align-items-center border-bottom pb-1 mb-2">' +
                '<label class="form-label fw-semibold fs-14 text-brand mb-0">Bảng giá sỉ (Tùy chọn)</label>' +
                '<button type="button" class="btn btn-sm btn-outline-primary" id="addTierBtn"><i class="bi bi-plus-circle me-1"></i>Thêm mốc giá</button>' +
              '</div>' +
              '<div id="priceTiersWrapper"></div>' +
              '<input type="hidden" id="f-price-tiers" name="price_tiers" value="' + esc(typeof p.price_tiers === 'string' ? p.price_tiers : (p.price_tiers ? JSON.stringify(p.price_tiers) : '')) + '">' +
            '</div>' +

            '<div class="col-md-4">' +
              '<label class="form-label" for="f-moq">Đặt hàng tối thiểu</label>' +
              '<input class="form-control" id="f-moq" name="moq" placeholder="Ví dụ: 10 Cuộn" ' +
                     'value="' + esc(p.moq || '') + '">' +
            '</div>' +

            '<div class="col-md-4">' +
              '<label class="form-label" for="f-rating">Đánh giá (0–5)</label>' +
              '<input class="form-control" id="f-rating" name="rating" inputmode="decimal" ' +
                     'placeholder="Để trống" value="' +
                     (p.rating === null || p.rating === undefined ? '' : p.rating) + '">' +
              '<div class="form-text fs-12">Trống = chưa có đánh giá</div>' +
            '</div>' +

            '<div class="col-md-4">' +
              '<label class="form-label d-block">Tình trạng kho</label>' +
              '<div class="form-check form-switch mt-2">' +
                '<input class="form-check-input" type="checkbox" role="switch" id="f-stock" ' +
                       'name="in_stock"' + (Number(p.in_stock) ? ' checked' : '') + '>' +
                '<label class="form-check-label fs-13" for="f-stock" id="stockLabel">' +
                  (Number(p.in_stock) ? 'Còn hàng' : 'Hết hàng') + '</label>' +
              '</div>' +
            '</div>' +

            '<div class="col-12 mt-2">' +
              '<div class="form-check form-switch border p-2 rounded bg-light">' +
                '<input class="form-check-input ms-0 me-2" type="checkbox" role="switch" id="f-hidden" ' +
                       'name="is_hidden"' + (p.is_hidden ? ' checked' : '') + '>' +
                '<label class="form-check-label fs-14 fw-semibold text-danger" for="f-hidden" id="hiddenLabel">' +
                  'Ngừng hiển thị sản phẩm này trên trang web' + '</label>' +
              '</div>' +
            '</div>' +

            '<div class="col-12">' +
              '<label class="form-label" for="f-desc">Mô tả chung</label>' +
              '<textarea class="form-control" id="f-desc" name="text" rows="3" ' +
                        'placeholder="Chất liệu, tính năng chung...">' +
                esc(specs.text) + '</textarea>' +
            '</div>' +

            '<div class="col-12"><div class="fw-semibold fs-14 mt-2 mb-1 text-brand border-bottom pb-1">Thông số kỹ thuật chi tiết</div></div>' +

            '<div class="col-md-4 col-sm-6">' +
              '<label class="form-label fs-13" for="f-thickness">Độ dày màng (mic)</label>' +
              '<input class="form-control form-control-sm" id="f-thickness" name="thickness" ' +
                     'placeholder="VD: 50 mic" value="' + esc(specs.thickness) + '">' +
            '</div>' +

            '<div class="col-md-4 col-sm-6">' +
              '<label class="form-label fs-13" for="f-weight">Trọng lượng (kg/cây)</label>' +
              '<input class="form-control form-control-sm" id="f-weight" name="weight" ' +
                     'placeholder="VD: 1.2 kg/cây" value="' + esc(specs.weight) + '">' +
            '</div>' +

            '<div class="col-md-4 col-sm-6">' +
              '<label class="form-label fs-13" for="f-length">Chiều dài (yard)</label>' +
              '<input class="form-control form-control-sm" id="f-length" name="length" ' +
                     'placeholder="VD: 100 yard" value="' + esc(specs.length) + '">' +
            '</div>' +

            '<div class="col-md-6">' +
              '<label class="form-label fs-13" for="f-adhesion">Độ bám dính</label>' +
              '<input class="form-control form-control-sm" id="f-adhesion" name="adhesion" ' +
                     'placeholder="VD: Cao, siêu dính..." value="' + esc(specs.adhesion) + '">' +
            '</div>' +

            '<div class="col-md-6">' +
              '<label class="form-label fs-13" for="f-application">Ứng dụng</label>' +
              '<input class="form-control form-control-sm" id="f-application" name="application" ' +
                     'placeholder="VD: Dán thùng carton..." value="' + esc(specs.application) + '">' +
            '</div>' +

            '<div class="col-12 mt-4">' +
              '<label class="form-label" for="f-img">Ảnh sản phẩm</label>' +
              '<div class="d-flex gap-3 align-items-start flex-wrap">' +
                '<div class="text-center">' +
                  U.imgTag(p.image, 'thumb', p.name).replace('class="thumb"',
                    'class="thumb" id="imgPreview" style="width:82px;height:82px"') +
                  '<div class="fs-12 text-ink-3 mt-1">Xem trước</div>' +
                '</div>' +
                '<div class="flex-grow-1" style="min-width:240px">' +
                  '<input class="form-control mb-2" id="f-img" name="image" ' +
                         'placeholder="ten_file.webp" value="' + esc(p.image || '') + '">' +
                  '<div class="form-text fs-12 mb-2">Chỉ nhập TÊN FILE. Ảnh phải nằm sẵn trong ' +
                    'thư mục <code>images/products/</code> — trình duyệt không có quyền tự chép ' +
                    'file vào đó, phải chép tay.</div>' +
              '<div class="col-12 mt-3">' +
                '<label class="form-label" for="f-gallery">Thư viện ảnh (Gallery Carousel)</label>' +
                '<textarea class="form-control" id="f-gallery" name="gallery" rows="2" ' +
                          'placeholder="[\'anh1.jpg\', \'anh2.jpg\']">' + 
                          esc(typeof p.gallery === 'string' ? p.gallery : (Array.isArray(p.gallery) ? JSON.stringify(p.gallery) : '')) + '</textarea>' +
                '<div class="form-text fs-12">Nhập mảng JSON ví dụ: <code>["anh1.jpg", "anh2.jpg"]</code> để hiển thị Carousel.</div>' +
              '</div>' +

                  (imgs.length
                    ? '<div class="img-pick">' + imgs.map(function (f) {
                        return '<button type="button" data-img="' + esc(f) + '" ' +
                               'aria-pressed="' + (f === p.image) + '" title="' + esc(f) + '">' +
                               '<img src="' + esc(U.IMG_DIR + encodeURIComponent(f).replace(/\.(png|jpg|jpeg)$/i, '.webp')) + '" alt="" ' +
                               'loading="lazy"></button>';
                      }).join('') + '</div>'
                    : '') +
                '</div>' +
              '</div>' +
            '</div>' +

          '</div>' +
        '</form>',
      footer:
        '<button type="button" class="btn btn-light border" data-bs-dismiss="modal">Hủy</button>' +
        '<button type="button" class="btn btn-primary" data-save>' +
          '<i class="bi bi-check-lg me-1"></i>' + (id ? 'Lưu thay đổi' : 'Thêm sản phẩm') + '</button>',
      onReady: function (body, close, el) {
        var form = el.querySelector('#prodForm');

        // Xem trước giá đã định dạng ngay khi gõ
        var priceInput = form.elements.price;
        var preview = el.querySelector('#pricePreview');
        function syncPrice() {
          var n = Number(String(priceInput.value).replace(/[^\d]/g, ''));
          preview.textContent = n > 0 ? U.vnd(n) : '₫';
        }
        priceInput.addEventListener('input', syncPrice);
        syncPrice();

        // Xử lý UI Bảng giá sỉ
        var tiersWrapper = el.querySelector('#priceTiersWrapper');
        var hiddenTiers = form.elements.price_tiers;
        var currentTiers = [];
        try {
          if (hiddenTiers.value) currentTiers = JSON.parse(hiddenTiers.value);
        } catch (e) {}
        
        function renderTiers() {
          if (currentTiers.length === 0) {
            tiersWrapper.innerHTML = '<div class="text-center text-ink-3 fs-13 py-2 bg-light rounded border border-dashed">Chưa có mốc giá sỉ. Cài đặt nếu muốn bán rẻ hơn khi mua số lượng nhiều.</div>';
            return;
          }
          var html = '<table class="table table-sm table-bordered fs-13 mb-0 text-center align-middle"><thead><tr class="bg-light"><th>SL Từ</th><th>SL Đến</th><th>Giá/Đơn vị</th><th>Xóa</th></tr></thead><tbody>';
          for (var i = 0; i < currentTiers.length; i++) {
            var t = currentTiers[i];
            html += '<tr>' +
              '<td><input class="form-control form-control-sm text-center t-min" data-idx="' + i + '" type="number" min="1" value="' + (t.min_quantity || '') + '"></td>' +
              '<td><input class="form-control form-control-sm text-center t-max" data-idx="' + i + '" type="text" placeholder="∞" value="' + (t.max_quantity || '') + '"></td>' +
              '<td><input class="form-control form-control-sm text-center t-price" data-idx="' + i + '" type="number" value="' + (t.price || '') + '"></td>' +
              '<td><button type="button" class="btn btn-sm text-danger t-del" data-idx="' + i + '"><i class="bi bi-trash"></i></button></td>' +
            '</tr>';
          }
          html += '</tbody></table>';
          tiersWrapper.innerHTML = html;
          
          tiersWrapper.querySelectorAll('.t-del').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
               var idx = Number(e.currentTarget.getAttribute('data-idx'));
               currentTiers.splice(idx, 1);
               updateTiersJSON();
               renderTiers();
            });
          });
          tiersWrapper.querySelectorAll('input').forEach(function(inp) {
            inp.addEventListener('input', function(e) {
               var idx = Number(e.currentTarget.getAttribute('data-idx'));
               var cls = e.currentTarget.className;
               if (cls.indexOf('t-min') !== -1) currentTiers[idx].min_quantity = Number(e.currentTarget.value) || 0;
               if (cls.indexOf('t-max') !== -1) currentTiers[idx].max_quantity = e.currentTarget.value ? (Number(e.currentTarget.value) || null) : null;
               if (cls.indexOf('t-price') !== -1) currentTiers[idx].price = Number(e.currentTarget.value) || 0;
               updateTiersJSON();
            });
          });
        }
        
        function updateTiersJSON() {
           var valid = currentTiers.filter(function(t) { return t.min_quantity > 0 && t.price > 0; });
           hiddenTiers.value = valid.length ? JSON.stringify(valid) : '';
        }
        
        el.querySelector('#addTierBtn').addEventListener('click', function() {
           currentTiers.push({ min_quantity: '', max_quantity: null, price: '' });
           renderTiers();
        });
        renderTiers();

        // Nhãn công tắc đổi theo trạng thái
        form.elements.in_stock.addEventListener('change', function (e) {
          el.querySelector('#stockLabel').textContent = e.target.checked ? 'Còn hàng' : 'Hết hàng';
        });

        // Chọn ảnh từ bảng gợi ý
        var imgInput = form.elements.image;
        var imgPrev = el.querySelector('#imgPreview');
        function syncImg() {
          var f = imgInput.value.trim();
          imgPrev.src = f ? U.IMG_DIR + encodeURIComponent(f).replace(/\.(png|jpg|jpeg)$/i, '.webp') : U.FALLBACK_IMG;
          el.querySelectorAll('[data-img]').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b.getAttribute('data-img') === f));
          });
        }
        imgInput.addEventListener('input', syncImg);
        el.querySelectorAll('[data-img]').forEach(function (b) {
          b.addEventListener('click', function () {
            imgInput.value = b.getAttribute('data-img');
            syncImg();
          });
        });

        el.querySelector('[data-save]').addEventListener('click', function () {
          save(form, id, close);
        });
      }
    });
  }

  async function save(form, id, close) {
    var R = ui.RULE;
    var ok = ui.validate(form, {
      name: [R.minLen(5, 'Tên sản phẩm cần ít nhất 5 ký tự.')],
      category_id: [R.required('Hãy chọn danh mục cho sản phẩm.')],
      price: [R.intRange(0, 1000000000, 'Giá phải là số nguyên từ 0 đến 1.000.000.000 đồng.')],
      rating: [{
        test: function (v) {
          if (String(v).trim() === '') return true;         // trống = chưa đánh giá
          var n = Number(String(v).replace(',', '.'));
          return isFinite(n) && n >= 0 && n <= 5;
        },
        msg: 'Đánh giá phải nằm trong khoảng 0 đến 5, hoặc để trống.'
      }]
    });
    if (!ok) return;

    var rating = String(form.elements.rating.value).trim();
    
    var specsObj = {
      text: form.querySelector('[name="text"]').value.trim(),
      thickness: form.querySelector('[name="thickness"]').value.trim(),
      weight: form.querySelector('[name="weight"]').value.trim(),
      length: form.querySelector('[name="length"]').value.trim(),
      adhesion: form.querySelector('[name="adhesion"]').value.trim(),
      application: form.querySelector('[name="application"]').value.trim()
    };

    var data = {
      category_id: Number(form.elements.category_id.value),
      name: form.querySelector('[name="name"]').value.trim(),
      description: form.querySelector('[name="text"]').value.trim() || null,
      thickness: form.querySelector('[name="thickness"]').value.trim() || null,
      weight: form.querySelector('[name="weight"]').value.trim() || null,
      length: form.querySelector('[name="length"]').value.trim() || null,
      adhesion: form.querySelector('[name="adhesion"]').value.trim() || null,
      application: form.querySelector('[name="application"]').value.trim() || null,
      price: Number(String(form.elements.price.value).replace(/[^\d]/g, '')),
      image: form.elements.image.value.trim() || null,
      price_tiers: (function() {
        var val = form.elements.price_tiers.value.trim();
        if (!val) return null;
        try { return JSON.parse(val); } catch (e) { return null; }
      })(),
        gallery: (function() {
          var val = form.elements.gallery.value.trim();
          if (!val) return null;
          try {
             if (val.startsWith('[')) return val;
             return JSON.stringify(val.split(',').map(s => s.trim()));
          } catch(e) { return val; }
        })(),

      in_stock: form.elements.in_stock.checked ? 1 : 0,
      is_hidden: form.elements.is_hidden.checked,
      moq: form.elements.moq.value.trim() || null,
      rating: rating === '' ? null : Number(rating.replace(',', '.'))
    };

    try {
      if (id) {
        var { error } = await supabase.from('product').update(data).eq('id', id);
        if (error) throw error;
        ui.toast('Đã lưu thay đổi.', 'ok');
      } else {
        var { data: inserted, error: insertError } = await supabase.from('product').insert([data]).select();
        if (insertError) throw insertError;
        ui.toast('Đã thêm sản phẩm #' + (inserted && inserted[0] ? inserted[0].id : '') + '.', 'ok');
      }
      close();
      Admin.reload();
    } catch (err) {
      ui.toast('Không lưu được: ' + err.message, 'err');
    }
  }

  /* ======================================================================
   * 7. BẢNG TÍNH GIÁ VỐN, CHIẾT KHẤU 3 BẬC MOQ & ĐIỀU KHOẢN CÔNG NỢ (SHEET 5)
   * ====================================================================== */

  function renderB2BPricingCalculator(container, allWebProducts) {
    if (!Admin.b2b) {
      container.innerHTML = '<div class="alert alert-warning">Chưa nạp module b2b-crm-data.js.</div>';
      return;
    }

    var cfg = Admin.b2b.getPricingConfig();
    var crmRecords = Admin.b2b.getRecords();
    var tierDist = Admin.b2b.computeTierDistribution(crmRecords);
    var totalKh = crmRecords.length || 1;
    var totalVol = crmRecords.reduce(function (s, r) { return s + (Number(r.expectedVolume) || 0); }, 0);
    var avgVol = Math.round((totalVol / totalKh) * 10) / 10;

    // Đồng bộ % CK và số ngày công nợ đang cấu hình vào bảng phân bổ bậc
    tierDist[1].discountPct = cfg.tier2DiscountPct;
    tierDist[1].creditDays = cfg.tier2CreditDays;
    tierDist[2].discountPct = cfg.tier3DiscountPct;
    tierDist[2].creditDays = cfg.tier3CreditDays;

    container.innerHTML =
      /* Bảng 1: Phân bổ 36 KH theo 3 Bậc định mức (MOQ) & Điều khoản công nợ chuẩn */
      '<div class="card border shadow-sm mb-4">' +
        '<div class="card-header bg-brand-lighter d-flex flex-wrap justify-content-between align-items-center">' +
          '<div>' +
            '<h2 class="h6 fw-bold text-dark mb-0">1. PHÂN BỔ ' + crmRecords.length + ' KHÁCH HÀNG MỤC TIÊU THEO BẬC ĐỊNH MỨC (MOQ) &amp; ĐIỀU KHOẢN CÔNG NỢ CHUẨN</h2>' +
            '<div class="fs-12 text-ink-2">Các ô màu vàng nhạt là Ô Nhập Liệu Mở — chỉnh % Chiết khấu hoặc Số ngày công nợ để bảng tính bên dưới tự động cập nhật</div>' +
          '</div>' +
        '</div>' +
        '<div class="table-responsive">' +
          '<table class="table table-bordered table-hover align-middle mb-0 fs-13">' +
            '<thead class="table-light">' +
              '<tr>' +
                '<th>Mã Bậc</th>' +
                '<th>Bậc Định Mức Sản Lượng (Cuộn/Tháng)</th>' +
                '<th class="num">Số KH (Từ CRM)</th>' +
                '<th class="num">Tỷ Trọng KH (%)</th>' +
                '<th class="num">Tổng Sản Lượng (Cuộn/Tháng)</th>' +
                '<th class="num">Tỷ Trọng SL (%)</th>' +
                '<th class="num">SL Trung Bình (Cuộn/KH)</th>' +
                '<th class="text-center" style="width:125px">Tỷ Lệ CK Đề Xuất (%)</th>' +
                '<th class="text-center" style="width:125px">Số Ngày Công Nợ Tối Đa</th>' +
                '<th>Điều Khoản Giao Hàng &amp; Thanh Toán Khuyến Nghị</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              tierDist.map(function (t, idx) {
                var ckCell = idx === 0
                  ? '<span class="fw-bold">0%</span>'
                  : '<input type="number" step="0.5" min="0" max="50" class="form-control form-control-sm text-center b2b-input-yellow" data-tier-cfg="' + (idx === 1 ? 'tier2DiscountPct' : 'tier3DiscountPct') + '" value="' + t.discountPct + '">';
                var cnCell = idx === 0
                  ? '<span class="fw-bold">0 ngày (COD)</span>'
                  : '<input type="number" step="5" min="0" max="90" class="form-control form-control-sm text-center b2b-input-yellow" data-tier-cfg="' + (idx === 1 ? 'tier2CreditDays' : 'tier3CreditDays') + '" value="' + t.creditDays + '">';
                return '<tr>' +
                  '<td class="fw-bold text-brand">' + esc(t.code) + '</td>' +
                  '<td class="fw-semibold">' + esc(t.label) + '</td>' +
                  '<td class="num fw-bold">' + U.num(t.count) + '</td>' +
                  '<td class="num">' + t.countPct + '%</td>' +
                  '<td class="num fw-bold text-brand">' + U.num(t.volume) + '</td>' +
                  '<td class="num">' + t.volumePct + '%</td>' +
                  '<td class="num">' + U.num(t.avgVolume) + '</td>' +
                  '<td class="text-center">' + ckCell + '</td>' +
                  '<td class="text-center">' + cnCell + '</td>' +
                  '<td class="fs-12 text-ink-2">' + esc(t.terms) + '</td>' +
                '</tr>';
              }).join('') +
            '</tbody>' +
            '<tfoot class="table-light fw-bold">' +
              '<tr>' +
                '<td>TỔNG</td>' +
                '<td>Toàn bộ Phễu B2B (' + crmRecords.length + ' Khách hàng)</td>' +
                '<td class="num">' + U.num(crmRecords.length) + '</td>' +
                '<td class="num">100%</td>' +
                '<td class="num text-danger">' + U.num(totalVol) + ' cuộn</td>' +
                '<td class="num">100%</td>' +
                '<td class="num">' + avgVol + '</td>' +
                '<td colspan="3" class="text-ink-2">Định mức đơn tối thiểu (MOQ): 300 - 1.000 cuộn/đơn</td>' +
              '</tr>' +
            '</tfoot>' +
          '</table>' +
        '</div>' +
      '</div>' +

      /* Bảng 2: Bảng tính Giá vốn, Giá bán theo bậc & Biên lợi nhuận ròng */
      '<div class="card border shadow-sm">' +
        '<div class="card-header bg-light d-flex flex-wrap gap-3 align-items-center justify-content-between">' +
          '<div>' +
            '<h2 class="h6 fw-bold text-dark mb-0">2. BẢNG TÍNH GIÁ VỐN, GIÁ BÁN THEO BẬC &amp; BIÊN LỢI NHUẬN RÒNG TỪNG DÒNG SẢN PHẨM</h2>' +
            '<div class="fs-12 text-ink-2">Điền Giá vốn xuất xưởng &amp; Giá bán cơ sở Bậc 1 vào ô vàng để tự động tính lãi gộp và lãi ròng sau công nợ &amp; xe tải</div>' +
          '</div>' +
          '<div class="d-flex flex-wrap gap-3 align-items-center fs-13">' +
            '<label class="d-flex align-items-center gap-2 mb-0">' +
              '<span class="fw-semibold">Chi phí vốn lưu động (%/tháng):</span>' +
              '<input type="number" step="0.1" min="0" class="form-control form-control-sm text-center b2b-input-yellow" style="width:82px" id="cfgCapRate" value="' + cfg.workingCapitalRateMonthly + '">' +
            '</label>' +
            '<label class="d-flex align-items-center gap-2 mb-0">' +
              '<span class="fw-semibold">Cước xe tải ghép chuyến (VNĐ/cuộn):</span>' +
              '<input type="number" step="100" min="0" class="form-control form-control-sm text-center b2b-input-yellow" style="width:95px" id="cfgTruckFee" value="' + cfg.truckFeePerRoll + '">' +
            '</label>' +
          '</div>' +
        '</div>' +
        '<div class="table-responsive">' +
          '<table class="table table-bordered table-hover align-middle mb-0 fs-13">' +
            '<thead class="table-light">' +
              '<tr>' +
                '<th>Mã SP</th>' +
                '<th style="min-width:230px">Danh Mục Sản Phẩm Chủ Lực (Chuẩn Lõi - Đủ Yard)</th>' +
                '<th>Nhóm Ngành Tiêu Thụ</th>' +
                '<th class="text-end" style="width:130px">Đơn Giá Vốn Xuất Xưởng (VNĐ)</th>' +
                '<th class="text-end" style="width:130px">Giá Bán Cơ Sở Bậc 1 (300-499c)</th>' +
                '<th class="num">Lãi Gộp Bậc 1 (VNĐ/Cuộn)</th>' +
                '<th class="num">Biên Lãi Gộp Bậc 1 (%)</th>' +
                '<th class="num">Giá Bán Bậc 2 (500-799c)</th>' +
                '<th class="num">Lãi Ròng Bậc 2 (Sau CN &amp; Xe)</th>' +
                '<th class="num">Giá Bán Bậc 3 (800-1.000c)</th>' +
                '<th class="num">Lãi Ròng Bậc 3 (Sau CN &amp; Xe)</th>' +
                '<th class="text-end">Đồng bộ Web</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody id="b2bPricingRows">' +
              cfg.products.map(function (item, idx) {
                var cost = Number(item.factoryCost) || 0;
                var p1 = Number(item.tier1BasePrice) || 0;
                var gross1 = p1 - cost;
                var margin1 = p1 > 0 ? ((gross1 / p1) * 100).toFixed(1) : '0.0';

                var p2 = Math.round((p1 * (1 - (Number(cfg.tier2DiscountPct) || 0) / 100)) / 100) * 100;
                var capCost2 = p2 * ((Number(cfg.workingCapitalRateMonthly) || 0) / 100) * ((Number(cfg.tier2CreditDays) || 0) / 30);
                var net2 = Math.round(p2 - cost - (Number(cfg.truckFeePerRoll) || 0) - capCost2);

                var p3 = Math.round((p1 * (1 - (Number(cfg.tier3DiscountPct) || 0) / 100)) / 100) * 100;
                var capCost3 = p3 * ((Number(cfg.workingCapitalRateMonthly) || 0) / 100) * ((Number(cfg.tier3CreditDays) || 0) / 30);
                var net3 = Math.round(p3 - cost - (Number(cfg.truckFeePerRoll) || 0) - capCost3);

                return '<tr>' +
                  '<td class="fw-bold text-brand">' + esc(item.code) + '</td>' +
                  '<td class="fw-semibold">' + esc(item.name) + '</td>' +
                  '<td class="fs-12 text-ink-2">' + esc(item.targetIndustries) + '</td>' +
                  '<td><input type="number" step="100" class="form-control form-control-sm text-end b2b-input-yellow" data-prod-idx="' + idx + '" data-field="factoryCost" value="' + cost + '"></td>' +
                  '<td><input type="number" step="100" class="form-control form-control-sm text-end b2b-input-yellow" data-prod-idx="' + idx + '" data-field="tier1BasePrice" value="' + p1 + '"></td>' +
                  '<td class="num fw-bold ' + (gross1 >= 0 ? 'text-success' : 'text-danger') + '">' + U.vnd(gross1) + '</td>' +
                  '<td class="num fw-semibold">' + margin1 + '%</td>' +
                  '<td class="num fw-bold text-primary">' + U.vnd(p2) + '</td>' +
                  '<td class="num fw-bold ' + (net2 >= 0 ? 'text-success' : 'text-danger') + '">' + U.vnd(net2) + '</td>' +
                  '<td class="num fw-bold text-primary">' + U.vnd(p3) + '</td>' +
                  '<td class="num fw-bold ' + (net3 >= 0 ? 'text-success' : 'text-danger') + '">' + U.vnd(net3) + '</td>' +
                  '<td class="text-end">' +
                    '<button type="button" class="btn btn-sm btn-outline-primary text-nowrap" data-sync-web="' + idx + '" title="Áp dụng 3 bậc giá sỉ (300, 500, 800 cuộn) vào sản phẩm trên Website">' +
                      '<i class="bi bi-cloud-upload me-1"></i>Áp vào SP Web' +
                    '</button>' +
                  '</td>' +
                '</tr>';
              }).join('') +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';

    container.querySelectorAll('[data-tier-cfg]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var key = inp.getAttribute('data-tier-cfg');
        cfg[key] = Number(inp.value) || 0;
        Admin.b2b.savePricingConfig(cfg);
        renderB2BPricingCalculator(container, allWebProducts);
      });
    });

    var capInp = container.querySelector('#cfgCapRate');
    if (capInp) {
      capInp.addEventListener('change', function () {
        cfg.workingCapitalRateMonthly = Number(capInp.value) || 0;
        Admin.b2b.savePricingConfig(cfg);
        renderB2BPricingCalculator(container, allWebProducts);
      });
    }

    var truckInp = container.querySelector('#cfgTruckFee');
    if (truckInp) {
      truckInp.addEventListener('change', function () {
        cfg.truckFeePerRoll = Number(truckInp.value) || 0;
        Admin.b2b.savePricingConfig(cfg);
        renderB2BPricingCalculator(container, allWebProducts);
      });
    }

    container.querySelectorAll('[data-prod-idx]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var idx = Number(inp.getAttribute('data-prod-idx'));
        var field = inp.getAttribute('data-field');
        cfg.products[idx][field] = Number(inp.value) || 0;
        Admin.b2b.savePricingConfig(cfg);
        renderB2BPricingCalculator(container, allWebProducts);
      });
    });

    container.querySelectorAll('[data-sync-web]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.getAttribute('data-sync-web'));
        var b2bProd = cfg.products[idx];
        var p1 = Number(b2bProd.tier1BasePrice) || 0;
        var p2 = Math.round((p1 * (1 - (Number(cfg.tier2DiscountPct) || 0) / 100)) / 100) * 100;
        var p3 = Math.round((p1 * (1 - (Number(cfg.tier3DiscountPct) || 0) / 100)) / 100) * 100;

        ui.modal({
          title: 'Đồng bộ Bậc Giá Sỉ B2B sang Sản phẩm Website',
          body:
            '<div class="fs-13">' +
              '<p class="mb-2">Chọn sản phẩm trên Website để áp dụng bảng giá 3 bậc MOQ từ dòng <strong>' + esc(b2bProd.code + ' — ' + b2bProd.name) + '</strong>:</p>' +
              '<div class="bg-light p-2 rounded border mb-3">' +
                '• <strong>Bậc 1 (300 – 499 cuộn):</strong> ' + U.vnd(p1) + '<br>' +
                '• <strong>Bậc 2 (500 – 799 cuộn):</strong> ' + U.vnd(p2) + '<br>' +
                '• <strong>Bậc 3 (≥ 800 cuộn):</strong> ' + U.vnd(p3) +
              '</div>' +
              '<label class="form-label fw-semibold">Chọn Sản phẩm trên Website:</label>' +
              '<select class="form-select" id="syncWebProductSelect">' +
                (allWebProducts || []).map(function (wp) {
                  return '<option value="' + wp.id + '">#' + wp.id + ' — ' + esc(wp.name) + ' (Giá hiện tại: ' + U.vnd(wp.price) + ')</option>';
                }).join('') +
              '</select>' +
            '</div>',
          footer:
            '<button type="button" class="btn btn-light border" data-bs-dismiss="modal">Hủy</button>' +
            '<button type="button" class="btn btn-primary" data-confirm-sync><i class="bi bi-check2-circle me-1"></i>Cập nhật Bảng giá sỉ</button>',
          onReady: function (body, close, modalEl) {
            modalEl.querySelector('[data-confirm-sync]').addEventListener('click', async function () {
              var wpId = Number(modalEl.querySelector('#syncWebProductSelect').value);
              if (!wpId) return;
              var newTiers = [
                { min_quantity: 300, max_quantity: 499, price: p1 },
                { min_quantity: 500, max_quantity: 799, price: p2 },
                { min_quantity: 800, max_quantity: null, price: p3 }
              ];
              var res = await supabase.from('product').update({
                price: p1,
                moq: '300 cuộn',
                price_tiers: newTiers
              }).eq('id', wpId);

              if (res.error) {
                ui.toast('Lỗi cập nhật sản phẩm: ' + res.error.message, 'err');
              } else {
                ui.toast('Đã đồng bộ bảng giá sỉ 3 bậc (300 - 500 - 800 cuộn) vào sản phẩm #' + wpId + '!', 'ok');
                close();
              }
            });
          }
        });
      });
    });
  }

  Admin.page('products', {
    title: 'Sản phẩm',
    sub: 'Thêm, sửa, xóa và quản lý kho hàng',
    icon: 'bi-box-seam',
    badge: async function () { 
      var { count } = await supabase.from('product').select('*', { count: 'exact', head: true }).eq('in_stock', 0);
      return count || 0;
    },
    render: render
  });
})(window.Admin);
