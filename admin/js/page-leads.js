/* ==========================================================================
 * admin/js/page-leads.js
 * Quản lý Báo giá (Leads)
 * ========================================================================== */

(function (Admin) {
  'use strict';

  var U = Admin.util, esc = U.esc, ui = Admin.ui;
  var supabase = window.supabaseClient;

  Admin.page('leads', {
    title:  'Khách hàng tiềm năng (Leads)',
    label:  'Báo giá / Khách',
    icon:   'bi-person-lines-fill',
    sub:    'Quản lý dữ liệu form Báo giá nhanh',
    render: render
  });

  async function fetchLeads() {
    const { data, error } = await supabase
      .from('lead')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function render(view) {
    view.innerHTML =
      '<div class="d-flex justify-content-center py-5">' +
      '<div class="spinner-border text-primary" role="status"></div></div>';

    var items;
    try {
      items = await fetchLeads();
    } catch (err) {
      view.innerHTML = ui.emptyState(
        'bi-exclamation-triangle', 'Không nạp được dữ liệu',
        err.message || 'Lỗi kết nối Supabase.',
        '<button class="btn btn-outline-primary btn-sm" onclick="Admin.reload()">Thử lại</button>'
      );
      return;
    }

    var tableHtml = items.length === 0
      ? ui.emptyState('bi-person-lines-fill', 'Không có Leads', 'Chưa có dữ liệu.')
      : '<div class="card border shadow-sm">' +
          '<div class="table-responsive">' +
            '<table class="table table-hover align-middle mb-0">' +
              '<thead class="table-light">' +
                '<tr>' +
                  '<th>Họ tên / SĐT</th>' +
                  '<th>Sản phẩm / SL</th>' +
                  '<th>Ghi chú</th>' +
                  '<th>Trạng thái</th>' +
                  '<th>Ngày tạo</th>' +
                  '<th style="width:130px">Cập nhật</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody id="leadsTableBody">' +
                items.map(rowHTML).join('') +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>';

    view.innerHTML = tableHtml;

    var tbody = Admin.$('#leadsTableBody');
    if (tbody) {
      tbody.addEventListener('change', function (e) {
        if (e.target.tagName !== 'SELECT') return;
        var id = e.target.closest('tr').getAttribute('data-id');
        var newStatus = e.target.value;
        updateStatus(id, newStatus, e.target);
      });
    }
  }

  function rowHTML(p) {
    var statusBadge = '';
    if (p.status === 'new') statusBadge = '<span class="badge bg-primary">Mới</span>';
    else if (p.status === 'contacted') statusBadge = '<span class="badge bg-warning text-dark">Đã liên hệ</span>';
    else if (p.status === 'converted') statusBadge = '<span class="badge bg-success">Thành công</span>';
    else statusBadge = '<span class="badge bg-secondary">' + p.status + '</span>';

    return '<tr data-id="' + p.id + '">' +
      '<td><div class="fw-semibold">' + esc(p.name) + '</div><div class="text-muted fs-13"><i class="bi bi-telephone"></i> ' + esc(p.phone) + '</div></td>' +
      '<td><div class="fw-medium">' + esc(p.product_interest) + '</div><div class="fs-13">SL: ' + esc(p.quantity_expected) + '</div></td>' +
      '<td><div class="fs-13 text-muted" style="max-width:200px">' + esc(p.note) + '</div></td>' +
      '<td>' + statusBadge + '</td>' +
      '<td class="fs-13 text-muted">' + new Date(p.created_at).toLocaleString('vi-VN') + '</td>' +
      '<td>' +
        '<select class="form-select form-select-sm status-select">' +
          '<option value="new" ' + (p.status === 'new' ? 'selected' : '') + '>Mới</option>' +
          '<option value="contacted" ' + (p.status === 'contacted' ? 'selected' : '') + '>Đã LH</option>' +
          '<option value="converted" ' + (p.status === 'converted' ? 'selected' : '') + '>Thành công</option>' +
          '<option value="closed" ' + (p.status === 'closed' ? 'selected' : '') + '>Đóng/Hủy</option>' +
        '</select>' +
      '</td>' +
    '</tr>';
  }

  async function updateStatus(id, newStatus, selectEl) {
    selectEl.disabled = true;
    try {
      var res = await supabase.from('lead').update({status: newStatus}).eq('id', id);
      if (res.error) throw res.error;
      ui.toast('Đã cập nhật trạng thái', 'ok');
      Admin.reload(); // Reload to refresh badges/UI
    } catch (e) {
      ui.toast('Lỗi cập nhật', 'err');
      selectEl.disabled = false;
    }
  }

})(window.Admin);
