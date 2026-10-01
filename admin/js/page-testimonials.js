/* ==========================================================================
 * admin/js/page-testimonials.js
 * Quản lý Đánh giá
 * ========================================================================== */

(function (Admin) {
  'use strict';

  var U = Admin.util, esc = U.esc, ui = Admin.ui;
  var supabase = window.supabaseClient;

  Admin.page('testimonials', {
    title:  'Đánh giá',
    label:  'Đánh giá',
    icon:   'bi-star',
    sub:    'Quản lý lời nhận xét và đánh giá của khách hàng',
    render: render
  });

  async function fetchTestimonials() {
    const { data, error } = await supabase
      .from('testimonial')
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
      items = await fetchTestimonials();
    } catch (err) {
      view.innerHTML = ui.emptyState(
        'bi-exclamation-triangle', 'Không nạp được dữ liệu',
        err.message || 'Lỗi kết nối Supabase.',
        '<button class="btn btn-outline-primary btn-sm" onclick="Admin.reload()">Thử lại</button>'
      );
      return;
    }

    var tableHtml = items.length === 0
      ? ui.emptyState('bi-star', 'Không có đánh giá', 'Chưa có dữ liệu trong cơ sở dữ liệu.')
      : '<div class="card border shadow-sm">' +
          '<div class="table-responsive">' +
            '<table class="table table-hover align-middle mb-0">' +
              '<thead class="table-light">' +
                '<tr>' +
                  '<th>Khách hàng</th>' +
                  '<th>Công ty</th>' +
                  '<th>Sao</th>' +
                  '<th>Nội dung</th>' +
                  '<th>Trạng thái</th>' +
                  '<th style="width:100px"></th>' +
                '</tr>' +
              '</thead>' +
              '<tbody id="testimonialsTableBody">' +
                items.map(rowHTML).join('') +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>';

    view.innerHTML =
      '<div class="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">' +
        '<button class="btn btn-primary" id="btnAddTestimonial"><i class="bi bi-plus-lg"></i> Thêm đánh giá</button>' +
      '</div>' +
      tableHtml;

    var tbody = Admin.$('#testimonialsTableBody');
    if (tbody) {
      tbody.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var id = btn.closest('tr').getAttribute('data-id');
        var record = items.find(function (p) { return String(p.id) === id; });
        if (!record) return;
        switch (btn.getAttribute('data-action')) {
          case 'edit': openForm(record); break;
          case 'del': deleteRecord(record); break;
        }
      });
    }

    var btnAdd = Admin.$('#btnAddTestimonial');
    if (btnAdd) {
      btnAdd.addEventListener('click', function() {
        openForm(null);
      });
    }
  }

  function rowHTML(p) {
    var statusBadge = p.is_active ? '<span class="badge bg-success">Hiển thị</span>' : '<span class="badge bg-secondary">Ẩn</span>';
    var featuredBadge = p.is_featured ? ' <span class="badge bg-warning text-dark"><i class="bi bi-star-fill"></i> Nổi bật</span>' : '';

    return '<tr data-id="' + p.id + '">' +
      '<td><div class="fw-semibold">' + esc(p.customer_name) + '</div></td>' +
      '<td>' + esc(p.company_name) + '</td>' +
      '<td>' + p.rating + ' <i class="bi bi-star-fill text-warning"></i></td>' +
      '<td><div class="text-truncate" style="max-width:200px;" title="' + esc(p.content) + '">' + esc(p.content) + '</div></td>' +
      '<td>' + statusBadge + featuredBadge + '</td>' +
      '<td class="text-end">' +
        '<div class="d-flex gap-1 justify-content-end">' +
          '<button class="btn btn-sm btn-outline-primary" data-action="edit"><i class="bi bi-pencil"></i></button>' +
          '<button class="btn btn-sm btn-outline-danger" data-action="del"><i class="bi bi-trash"></i></button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }

  function openForm(record) {
    var isEdit = !!record;
    ui.modal({
      title: isEdit ? 'Chỉnh sửa đánh giá' : 'Thêm đánh giá',
      size: 'lg',
      body:
        '<form id="testimonialForm" novalidate>' +
          '<div class="row g-3">' +
            '<div class="col-md-6">' +
              '<label class="form-label fw-semibold">Khách hàng <span class="text-danger">*</span></label>' +
              '<input type="text" class="form-control" name="customer_name" value="' + esc(record ? record.customer_name : '') + '" required>' +
            '</div>' +
            '<div class="col-md-6">' +
              '<label class="form-label fw-semibold">Công ty</label>' +
              '<input type="text" class="form-control" name="company_name" value="' + esc(record ? record.company_name : '') + '">' +
            '</div>' +
            '<div class="col-md-4">' +
              '<label class="form-label fw-semibold">Đánh giá (sao) <span class="text-danger">*</span></label>' +
              '<input type="number" class="form-control" name="rating" min="1" max="5" value="' + (record ? record.rating : '5') + '" required>' +
            '</div>' +
            '<div class="col-md-4 d-flex align-items-end pb-2">' +
              '<div class="form-check form-switch">' +
                '<input class="form-check-input" type="checkbox" name="is_active" ' + (record ? (record.is_active ? 'checked' : '') : 'checked') + '>' +
                '<label class="form-check-label">Hiển thị</label>' +
              '</div>' +
            '</div>' +
            '<div class="col-md-4 d-flex align-items-end pb-2">' +
              '<div class="form-check form-switch">' +
                '<input class="form-check-input" type="checkbox" name="is_featured" ' + (record ? (record.is_featured ? 'checked' : '') : '') + '>' +
                '<label class="form-check-label">Nổi bật</label>' +
              '</div>' +
            '</div>' +
            '<div class="col-12">' +
              '<label class="form-label fw-semibold">Nội dung <span class="text-danger">*</span></label>' +
              '<textarea class="form-control" name="content" rows="4" required>' + esc(record ? record.content : '') + '</textarea>' +
            '</div>' +
          '</div>' +
        '</form>',
      footer:
        '<button type="button" class="btn btn-light border" data-bs-dismiss="modal">Hủy bỏ</button>' +
        '<button type="button" class="btn btn-primary" id="btnSaveTestimonial">' +
          '<i class="bi bi-check-lg me-1"></i> Lưu lại' +
        '</button>',
      onReady: function (body, close) {
        Admin.$('#btnSaveTestimonial').addEventListener('click', function () {
          saveTestimonial(body, close, isEdit ? record.id : null);
        });
      }
    });
  }

  async function saveTestimonial(body, close, id) {
    var form       = Admin.$('#testimonialForm', body);
    var customer   = form.elements.customer_name.value.trim();
    var content    = form.elements.content.value.trim();

    if (!customer || !content) {
      ui.toast('Vui lòng nhập Tên và Nội dung.', 'err');
      return;
    }

    var payload = {
      customer_name: customer,
      company_name: form.elements.company_name.value.trim(),
      rating: parseInt(form.elements.rating.value) || 5,
      content: content,
      is_active: form.elements.is_active.checked,
      is_featured: form.elements.is_featured.checked
    };

    var saveBtn = Admin.$('#btnSaveTestimonial');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang lưu...';

    try {
      var res = id ? await supabase.from('testimonial').update(payload).eq('id', id)
                   : await supabase.from('testimonial').insert([payload]);
      if (res.error) throw res.error;

      ui.toast('Đã lưu thành công.', 'ok');
      close();
      Admin.reload();
    } catch (err) {
      console.error(err);
      ui.toast('Lưu thất bại: ' + (err.message || String(err)), 'err');
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Lưu lại';
    }
  }

  async function deleteRecord(record) {
    ui.confirm({
      title: 'Xóa đánh giá',
      message: 'Bạn có chắc chắn muốn xóa đánh giá của <strong>' + esc(record.customer_name) + '</strong>?',
      okText: 'Xóa',
      danger: true,
      onConfirm: async function (close) {
        try {
          var res = await supabase.from('testimonial').delete().eq('id', record.id);
          if (res.error) throw res.error;
          ui.toast('Đã xóa', 'ok');
          close();
          Admin.reload();
        } catch (e) {
          ui.toast('Xóa thất bại', 'err');
        }
      }
    });
  }

})(window.Admin);
