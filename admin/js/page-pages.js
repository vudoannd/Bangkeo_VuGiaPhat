/* ==========================================================================
 * admin/js/page-pages.js
 * Quản lý Trang nội dung tĩnh
 * ========================================================================== */

(function (Admin) {
  'use strict';

  var U = Admin.util, esc = U.esc, ui = Admin.ui;
  var supabase = window.supabaseClient;

  Admin.page('pages', {
    title:  'Trang nội dung',
    label:  'Trang nội dung',
    icon:   'bi-file-earmark-text',
    sub:    'Quản lý nội dung các trang tĩnh như Chính sách bảo mật, Điều khoản dịch vụ',
    render: render
  });

  async function fetchPages() {
    const { data, error } = await supabase
      .from('page')
      .select('*')
      .order('slug', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function render(view) {
    view.innerHTML =
      '<div class="d-flex justify-content-center py-5">' +
      '<div class="spinner-border text-primary" role="status"></div></div>';

    var pages;
    try {
      pages = await fetchPages();
    } catch (err) {
      view.innerHTML = ui.emptyState(
        'bi-exclamation-triangle', 'Không nạp được dữ liệu',
        err.message || 'Lỗi kết nối Supabase.',
        '<button class="btn btn-outline-primary btn-sm" onclick="Admin.reload()">Thử lại</button>'
      );
      return;
    }

    var warningHtml = pages.length === 0
      ? '<div class="alert alert-warning border-0 border-start border-4 mb-4" role="alert">' +
          '<strong>Chưa có trang tĩnh nào.</strong> Hãy tạo bảng page và thêm dữ liệu mẫu trên Supabase.' +
        '</div>'
      : '';

    var tableHtml = pages.length === 0
      ? ui.emptyState('bi-file-earmark-text', 'Không có trang nội dung', 'Chưa có dữ liệu trong cơ sở dữ liệu.')
      : '<div class="card border shadow-sm">' +
          '<div class="table-responsive">' +
            '<table class="table table-hover align-middle mb-0">' +
              '<thead class="table-light">' +
                '<tr>' +
                  '<th style="width:200px">Đường dẫn (Slug)</th>' +
                  '<th style="width:250px">Tiêu đề</th>' +
                  '<th>Trạng thái nội dung</th>' +
                  '<th style="width:160px">Cập nhật lần cuối</th>' +
                  '<th style="width:100px"></th>' +
                '</tr>' +
              '</thead>' +
              '<tbody id="pagesTableBody">' +
                pages.map(pageRow).join('') +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>';

    view.innerHTML =
      '<div class="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">' +
        '<p class="text-body-secondary fs-13 mb-0">' +
          'Nội dung các trang này được hiển thị ở dưới Footer (Chính sách, Điều khoản).' +
        '</p>' +
      '</div>' +
      warningHtml +
      tableHtml;

    var tbody = Admin.$('#pagesTableBody');
    if (tbody) {
      tbody.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var id = btn.closest('tr').getAttribute('data-id');
        var pageRecord = pages.find(function (p) { return String(p.id) === id; });
        if (!pageRecord) return;
        switch (btn.getAttribute('data-action')) {
          case 'edit': openForm(pageRecord); break;
        }
      });
    }
  }

  function pageRow(p) {
    var descHtml = p.content
      ? '<span class="badge bg-success bg-opacity-10 text-success border border-success">Đã có nội dung</span>'
      : '<span class="badge bg-warning bg-opacity-10 text-warning border border-warning">Chưa có nội dung</span>';
      
    var dateStr = p.updated_at ? new Date(p.updated_at).toLocaleString('vi-VN') : 'Chưa cập nhật';

    return '<tr data-id="' + p.id + '">' +
      '<td><code>/' + esc(p.slug) + '</code></td>' +
      '<td><div class="fw-semibold">' + esc(p.title) + '</div></td>' +
      '<td>' + descHtml + '</td>' +
      '<td class="fs-12 text-muted">' + dateStr + '</td>' +
      '<td class="text-end">' +
        '<div class="d-flex gap-1 justify-content-end">' +
          '<button class="btn btn-sm btn-outline-primary" data-action="edit" title="Chỉnh sửa nội dung">' +
            '<i class="bi bi-pencil"></i> Sửa' +
          '</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }

  function openForm(pageRecord) {
    ui.modal({
      title: 'Chỉnh sửa trang: ' + esc(pageRecord.title),
      size: 'xl',
      body:
        '<form id="pageForm" novalidate>' +
          '<div class="row g-3">' +
            '<div class="col-md-6">' +
              '<label class="form-label fw-semibold" for="pSlug">Đường dẫn (Slug)</label>' +
              '<input type="text" class="form-control bg-light" id="pSlug" value="' + esc(pageRecord.slug) + '" readonly>' +
            '</div>' +
            '<div class="col-md-6">' +
              '<label class="form-label fw-semibold" for="pTitle">Tiêu đề trang <span class="text-danger">*</span></label>' +
              '<input type="text" class="form-control" id="pTitle" name="title" value="' + esc(pageRecord.title) + '" required>' +
            '</div>' +
            '<div class="col-12">' +
              '<label class="form-label fw-semibold" for="pContent">Nội dung HTML <span class="text-danger">*</span></label>' +
              '<div class="form-text mb-2">Nhập mã HTML để định dạng nội dung trang. Sử dụng các thẻ &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, v.v.</div>' +
              '<textarea class="form-control font-monospace" id="pContent" name="content" rows="15" style="font-size: 13px;">' + esc(pageRecord.content || '') + '</textarea>' +
            '</div>' +
          '</div>' +
        '</form>',
      footer:
        '<button type="button" class="btn btn-light border" data-bs-dismiss="modal">Hủy bỏ</button>' +
        '<button type="button" class="btn btn-primary" id="btnSavePage">' +
          '<i class="bi bi-check-lg me-1"></i> Lưu thay đổi' +
        '</button>',
      onReady: function (body, close) {
        Admin.$('#btnSavePage').addEventListener('click', function () {
          savePage(body, close, pageRecord.id);
        });
      }
    });
  }

  async function savePage(body, close, id) {
    var form       = Admin.$('#pageForm', body);
    var titleField = form.elements.title;
    var title      = titleField.value.trim();
    var content    = form.elements.content.value.trim();

    if (!title) {
      ui.setFieldError(titleField, 'Vui lòng nhập tiêu đề.');
      titleField.focus();
      return;
    }
    ui.setFieldError(titleField, '');

    var record = {
      title:       title,
      content:     content,
      updated_at:  new Date().toISOString()
    };

    var saveBtn = Admin.$('#btnSavePage');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang lưu...';

    try {
      var res = await supabase.from('page').update(record).eq('id', id);
      if (res.error) throw res.error;

      ui.toast('Đã cập nhật nội dung trang.', 'ok');
      close();
      Admin.reload();
    } catch (err) {
      console.error(err);
      ui.toast('Lưu thất bại: ' + (err.message || String(err)), 'err');
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Lưu thay đổi';
    }
  }

})(window.Admin);
