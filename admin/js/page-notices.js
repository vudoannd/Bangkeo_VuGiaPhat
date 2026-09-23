/* ==========================================================================
 * admin/js/page-notices.js
 * Quản lý Bảng tin (Notices)
 * ========================================================================== */

(function (Admin) {
  'use strict';

  var U = Admin.util, esc = U.esc, ui = Admin.ui;
  var supabase = window.supabaseClient;

  Admin.page('notices', {
    title:  'Bảng tin (Thông báo)',
    label:  'Thông báo',
    icon:   'bi-megaphone',
    sub:    'Quản lý các thông báo hiển thị dạng Popup trên trang chủ',
    render: render
  });

  async function fetchNotices() {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function render(view) {
    view.innerHTML =
      '<div class="d-flex justify-content-center py-5">' +
      '<div class="spinner-border text-primary" role="status"></div></div>';

    var notices;
    try {
      notices = await fetchNotices();
    } catch (err) {
      view.innerHTML = ui.emptyState(
        'bi-exclamation-triangle', 'Không nạp được dữ liệu',
        err.message || 'Lỗi kết nối Supabase.',
        '<button class="btn btn-outline-primary btn-sm" onclick="Admin.reload()">Thử lại</button>'
      );
      return;
    }

    var warningHtml = notices.length === 0
      ? '<div class="alert alert-warning border-0 border-start border-4 mb-4" role="alert">' +
          '<strong>Chưa có thông báo nào.</strong> Hãy bấm "Thêm thông báo" để tạo.' +
        '</div>'
      : '';

    var tableHtml = notices.length === 0
      ? ui.emptyState('bi-megaphone', 'Không có thông báo', 'Bấm "+ Thêm thông báo" để tạo.')
      : '<div class="card border shadow-sm">' +
          '<div class="table-responsive">' +
            '<table class="table table-hover align-middle mb-0">' +
              '<thead class="table-light">' +
                '<tr>' +
                  '<th style="width:250px">Tiêu đề</th>' +
                  '<th>Nội dung</th>' +
                  '<th style="width:140px" class="text-center">Trạng thái</th>' +
                  '<th style="width:160px">Ngày tạo</th>' +
                  '<th style="width:100px"></th>' +
                '</tr>' +
              '</thead>' +
              '<tbody id="noticesTableBody">' +
                notices.map(noticeRow).join('') +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>';

    view.innerHTML =
      '<div class="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">' +
        '<p class="text-body-secondary fs-13 mb-0">' +
          'Chỉ thông báo đang <strong>Kích hoạt</strong> mới hiển thị lên Popup trang chủ.' +
        '</p>' +
        '<button class="btn btn-primary rounded-pill d-flex align-items-center gap-2" id="btnAddNotice">' +
          '<i class="bi bi-plus-lg"></i> Thêm thông báo' +
        '</button>' +
      '</div>' +
      warningHtml +
      tableHtml;

    var addBtn = Admin.$('#btnAddNotice');
    if (addBtn) addBtn.addEventListener('click', function () { openForm(null); });

    var tbody = Admin.$('#noticesTableBody');
    if (tbody) {
      tbody.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var id = btn.closest('tr').getAttribute('data-id');
        var notice = notices.find(function (n) { return String(n.id) === id; });
        if (!notice) return;
        switch (btn.getAttribute('data-action')) {
          case 'edit':   openForm(notice);       break;
          case 'delete': deleteNotice(notice);   break;
          case 'toggle': toggleActive(notice);   break;
        }
      });
    }
  }

  function noticeRow(n) {
    var descHtml = n.content
      ? '<div class="small text-muted text-truncate" style="max-width:400px">' + esc(n.content) + '</div>'
      : '';
      
    var dateStr = new Date(n.created_at).toLocaleString('vi-VN');

    return '<tr data-id="' + n.id + '">' +
      '<td><div class="fw-semibold">' + esc(n.title) + '</div></td>' +
      '<td>' + descHtml + '</td>' +
      '<td class="text-center">' +
        '<button class="btn btn-sm ' + (n.is_active ? 'btn-success' : 'btn-outline-secondary') + ' rounded-pill px-3 d-inline-flex align-items-center gap-1" ' +
                'data-action="toggle" title="Bật/Tắt">' +
          '<i class="bi ' + (n.is_active ? 'bi-eye-fill' : 'bi-eye-slash') + '"></i>' +
          '<span class="d-none d-lg-inline">' + (n.is_active ? 'Kích hoạt' : 'Đang tắt') + '</span>' +
        '</button>' +
      '</td>' +
      '<td class="fs-12 text-muted">' + dateStr + '</td>' +
      '<td class="text-end">' +
        '<div class="d-flex gap-1 justify-content-end">' +
          '<button class="btn btn-sm btn-outline-primary" data-action="edit" title="Chỉnh sửa">' +
            '<i class="bi bi-pencil"></i></button>' +
          '<button class="btn btn-sm btn-outline-danger" data-action="delete" title="Xóa">' +
            '<i class="bi bi-trash"></i></button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }

  function openForm(notice) {
    var isNew = !notice;
    var n = notice || {
      title: '', content: '', is_active: false
    };

    ui.modal({
      title: isNew ? 'Thêm thông báo mới' : 'Chỉnh sửa thông báo',
      size: 'lg',
      body:
        '<form id="noticeForm" novalidate>' +
          '<div class="row g-3">' +
            '<div class="col-12">' +
              '<label class="form-label fw-semibold" for="nTitle">Tiêu đề <span class="text-danger">*</span></label>' +
              '<input type="text" class="form-control" id="nTitle" name="title" value="' + esc(n.title) + '" required>' +
            '</div>' +
            '<div class="col-12">' +
              '<label class="form-label fw-semibold" for="nContent">Nội dung (hỗ trợ HTML cơ bản)</label>' +
              '<textarea class="form-control" id="nContent" name="content" rows="6">' + esc(n.content) + '</textarea>' +
            '</div>' +
            '<div class="col-12 d-flex align-items-end">' +
              '<div class="form-check form-switch mb-2">' +
                '<input class="form-check-input" type="checkbox" role="switch" id="nIsActive" name="is_active" ' + (n.is_active ? 'checked' : '') + ' style="width:3em;height:1.6em">' +
                '<label class="form-check-label fw-semibold ms-2" for="nIsActive">Kích hoạt hiển thị thông báo này trên trang chủ</label>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</form>',
      footer:
        '<button type="button" class="btn btn-light border" data-bs-dismiss="modal">Hủy bỏ</button>' +
        '<button type="button" class="btn btn-primary" id="btnSaveNotice">' +
          '<i class="bi bi-check-lg me-1"></i>' + (isNew ? 'Thêm' : 'Lưu thay đổi') +
        '</button>',
      onReady: function (body, close) {
        Admin.$('#btnSaveNotice').addEventListener('click', function () {
          saveNotice(body, close, isNew ? null : notice.id);
        });
      }
    });
  }

  async function saveNotice(body, close, id) {
    var form       = Admin.$('#noticeForm', body);
    var titleField = form.elements.title;
    var title      = titleField.value.trim();

    if (!title) {
      ui.setFieldError(titleField, 'Vui lòng nhập tiêu đề.');
      titleField.focus();
      return;
    }
    ui.setFieldError(titleField, '');

    var record = {
      title:       title,
      content:     form.elements.content.value.trim(),
      is_active:   form.elements.is_active.checked
    };

    var saveBtn = Admin.$('#btnSaveNotice');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang lưu...';

    try {
      var res;
      if (id) {
        res = await supabase.from('notices').update(record).eq('id', id);
      } else {
        res = await supabase.from('notices').insert([record]);
      }
      if (res.error) throw res.error;

      ui.toast(id ? 'Đã cập nhật thông báo.' : 'Đã thêm thông báo mới.', 'ok');
      close();
      Admin.reload();
    } catch (err) {
      console.error(err);
      ui.toast('Lưu thất bại: ' + (err.message || String(err)), 'err');
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i>' + (id ? 'Lưu thay đổi' : 'Thêm');
    }
  }

  async function deleteNotice(notice) {
    var ok = await ui.confirm({
      title:   'Xóa thông báo',
      message: 'Xóa thông báo "' + esc(notice.title) + '"? Thao tác này không thể hoàn tác.',
      okText:  'Xóa thông báo'
    });
    if (!ok) return;

    try {
      var res = await supabase.from('notices').delete().eq('id', notice.id);
      if (res.error) throw res.error;
      ui.toast('Đã xóa thông báo.', 'ok');
      Admin.reload();
    } catch (err) {
      console.error(err);
      ui.toast('Xóa thất bại: ' + (err.message || String(err)), 'err');
    }
  }

  async function toggleActive(notice) {
    try {
      var res = await supabase
        .from('notices')
        .update({ is_active: !notice.is_active })
        .eq('id', notice.id);
      if (res.error) throw res.error;
      ui.toast(notice.is_active ? 'Đã tắt thông báo.' : 'Đã kích hoạt thông báo.', 'ok');
      Admin.reload();
    } catch (err) {
      console.error(err);
      ui.toast('Cập nhật thất bại: ' + (err.message || String(err)), 'err');
    }
  }

})(window.Admin);
