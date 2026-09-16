/* ==========================================================================
 * admin/js/page-carousel.js — Mục "Carousel trang chủ"
 *
 * Cho phép quản trị viên CRUD các slide hiển thị trên #heroCarousel của
 * trang index.html. Dữ liệu lưu trong bảng carousel_slide trên Supabase.
 *
 * Mỗi slide có:
 *   badge_text   – nhãn nhỏ phía trên tiêu đề
 *   title        – tiêu đề chính (bắt buộc)
 *   description  – mô tả ngắn
 *   btn1_text/url – nút CTA chính
 *   btn2_text/url – nút CTA phụ
 *   image_file   – tên file ảnh trong thư mục /images/ (ví dụ: banner-1.webp)
 *   category_id  – nếu không có image_file thì lấy ảnh từ sp đầu của danh mục
 *   sort_order   – thứ tự hiển thị
 *   is_active    – bật/tắt slide
 * ========================================================================== */

(function (Admin) {
  'use strict';

  var U = Admin.util, esc = U.esc, ui = Admin.ui;
  var supabase = window.supabaseClient;

  /* ========================================================================
   * 1. ĐĂNG KÝ MỤC
   * ====================================================================== */

  Admin.page('carousel', {
    title:  'Carousel trang chủ',
    label:  'Carousel',
    icon:   'bi-images',
    sub:    'Quản lý các slide banner hiển thị trên trang chủ',
    render: render
  });

  /* ========================================================================
   * 2. NẠP DỮ LIỆU
   * ====================================================================== */

  async function fetchSlides() {
    const { data, error } = await supabase
      .from('carousel_slide')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function fetchCategories() {
    const { data, error } = await supabase
      .from('category')
      .select('id, name')
      .order('id');
    if (error) throw error;
    return data || [];
  }

  /* ========================================================================
   * 3. RENDER DANH SÁCH
   * ====================================================================== */

  async function render(view) {
    view.innerHTML =
      '<div class="d-flex justify-content-center py-5">' +
      '<div class="spinner-border text-primary" role="status"></div></div>';

    var slides, cats;
    try {
      slides = await fetchSlides();
      cats   = await fetchCategories();
    } catch (err) {
      view.innerHTML = ui.emptyState(
        'bi-exclamation-triangle', 'Không nạp được dữ liệu',
        err.message || 'Lỗi kết nối Supabase.',
        '<button class="btn btn-outline-primary btn-sm" onclick="Admin.reload()">Thử lại</button>'
      );
      return;
    }

    /* Bản đồ danh mục để tra tên nhanh */
    var catMap = {};
    cats.forEach(function (c) { catMap[c.id] = c.name; });

    var warningHtml = slides.length === 0
      ? '<div class="alert alert-warning border-0 border-start border-4 d-flex gap-3 align-items-start mb-4" role="alert">' +
          '<i class="bi bi-exclamation-triangle-fill fs-5 mt-1"></i>' +
          '<div><strong>Bảng carousel_slide chưa có dữ liệu.</strong><br>' +
          'Hãy bấm nút bên dưới để tạo 3 slide mẫu, hoặc bấm <strong>Thêm slide</strong> để tự tạo.' +
          '<div class="mt-2"><button id="btnSeedData" class="btn btn-sm btn-warning fw-semibold"><i class="bi bi-magic me-1"></i>Thêm dữ liệu mẫu</button></div></div>' +
        '</div>'
      : '';

    var tableHtml = slides.length === 0
      ? ui.emptyState('bi-images', 'Chưa có slide nào',
          'Bấm "+ Thêm slide" để tạo slide đầu tiên cho carousel trang chủ.')
      : '<div class="card border shadow-sm">' +
          '<div class="table-responsive">' +
            '<table class="table table-hover align-middle mb-0">' +
              '<thead class="table-light">' +
                '<tr>' +
                  '<th style="width:52px" class="text-center">#</th>' +
                  '<th style="width:200px">Ảnh nền</th>' +
                  '<th>Nội dung slide</th>' +
                  '<th style="width:120px" class="text-center">Trạng thái</th>' +
                  '<th style="width:110px" class="text-center">Thứ tự</th>' +
                  '<th style="width:100px"></th>' +
                '</tr>' +
              '</thead>' +
              '<tbody id="slideTableBody">' +
                slides.map(function (s) { return slideRow(s, catMap); }).join('') +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>';

    var sqlAccordion =
      '<div class="accordion mt-4" id="accSetup">' +
        '<div class="accordion-item border-0 border-top">' +
          '<h2 class="accordion-header">' +
            '<button class="accordion-button collapsed fs-13 py-2 px-0 bg-transparent shadow-none text-body-secondary" ' +
                    'type="button" data-bs-toggle="collapse" data-bs-target="#colSetup">' +
              '<i class="bi bi-code-square me-2"></i>Script SQL tạo bảng carousel_slide (chạy lần đầu trong Supabase)' +
            '</button>' +
          '</h2>' +
          '<div id="colSetup" class="accordion-collapse collapse" data-bs-parent="#accSetup">' +
            '<div class="accordion-body ps-0">' +
              '<pre class="bg-light p-3 rounded fs-12 overflow-auto" style="white-space:pre-wrap">' + esc(SQL_SETUP) + '</pre>' +
              '<button class="btn btn-sm btn-outline-secondary" id="btnCopySQL">' +
                '<i class="bi bi-clipboard me-1"></i>Sao chép SQL' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    view.innerHTML =
      '<div class="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">' +
        '<p class="text-body-secondary fs-13 mb-0">' +
          'Số nhỏ hơn ở cột <strong>Thứ tự</strong> sẽ xuất hiện trước. ' +
          'Chỉ slide <strong>Hiển thị</strong> mới xuất hiện trên trang chủ.' +
        '</p>' +
        '<button class="btn btn-primary rounded-pill d-flex align-items-center gap-2" id="btnAddSlide">' +
          '<i class="bi bi-plus-lg"></i> Thêm slide' +
        '</button>' +
      '</div>' +
      warningHtml +
      tableHtml +
      sqlAccordion;

    /* --- Gắn sự kiện --- */
    var addBtn = Admin.$('#btnAddSlide');
    if (addBtn) addBtn.addEventListener('click', function () { openForm(null, cats); });

    var copyBtn = Admin.$('#btnCopySQL');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(SQL_SETUP).then(function () {
          ui.toast('Đã sao chép SQL vào clipboard.', 'ok');
        });
      });
    }

    var seedBtn = Admin.$('#btnSeedData');
    if (seedBtn) {
      seedBtn.addEventListener('click', async function () {
        seedBtn.disabled = true;
        seedBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang tạo...';
        try {
          var res = await supabase.from('carousel_slide').insert([
            {
              badge_text: 'Băng keo trong & tem nhãn', title: 'Tem nhãn nhiệt in sắc nét, dán chắc',
              description: 'Băng keo OPP trong suốt, tem nhãn vận chuyển khổ 4×6 và nhãn mã vạch — đáp ứng trọn khâu đóng gói và hậu cần.',
              btn1_text: 'Xem sản phẩm', btn1_url: 'products.html?cat=1', btn2_text: 'Nhận báo giá', btn2_url: 'contact.html', category_id: 1, sort_order: 1
            },
            {
              badge_text: 'Keo acrylic cao cấp', title: 'Dán thùng carton bền chắc, chịu nhiệt',
              description: 'Băng keo OPP/BOPP keo acrylic gia cường, chống thấm nước, ít tiếng ồn khi xé — lựa chọn hàng đầu cho kho vận và nhà máy.',
              btn1_text: 'Xem sản phẩm', btn1_url: 'products.html?cat=2', btn2_text: 'Nhận báo giá', btn2_url: 'contact.html', category_id: 2, sort_order: 2
            },
            {
              badge_text: 'Màng PE (Màng chít)', title: 'Siêu dai, co giãn tốt, bảo vệ tối ưu',
              description: 'Màng PE quấn pallet với độ co giãn lên đến 350%, bám dính siêu chắc giúp cố định hàng hóa, chống bụi bẩn, chống thấm nước hoàn hảo cho kho vận.',
              btn1_text: 'Xem sản phẩm', btn1_url: 'products.html?cat=5', btn2_text: 'Nhận báo giá', btn2_url: 'contact.html', category_id: 5, sort_order: 3
            }
          ]);
          if (res.error) throw res.error;
          ui.toast('Đã tạo 3 slide mẫu thành công.', 'ok');
          Admin.reload();
        } catch (err) {
          console.error(err);
          ui.toast('Lỗi tạo dữ liệu: ' + (err.message || String(err)), 'err');
          seedBtn.disabled = false;
          seedBtn.innerHTML = '<i class="bi bi-magic me-1"></i>Thêm dữ liệu mẫu';
        }
      });
    }

    var tbody = Admin.$('#slideTableBody');
    if (tbody) {
      tbody.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var id    = Number(btn.closest('tr').getAttribute('data-id'));
        var slide = slides.find(function (s) { return s.id === id; });
        if (!slide) return;
        switch (btn.getAttribute('data-action')) {
          case 'edit':   openForm(slide, cats);          break;
          case 'delete': deleteSlide(slide);             break;
          case 'up':     moveSlide(slide, slides, -1);   break;
          case 'down':   moveSlide(slide, slides,  1);   break;
          case 'toggle': toggleActive(slide);            break;
        }
      });
    }
  }

  /* ========================================================================
   * 4. DÒNG BẢNG
   * ====================================================================== */

  function slideRow(s, catMap) {
    var imgInfo;
    if (s.image_file) {
      imgInfo = '<span class="badge bg-info-subtle text-info-emphasis fw-normal">' +
                '<i class="bi bi-image me-1"></i>' + esc(s.image_file) + '</span>';
    } else if (s.category_id) {
      imgInfo = '<span class="badge bg-secondary-subtle text-secondary-emphasis fw-normal">' +
                '<i class="bi bi-grid me-1"></i>Danh mục: ' + esc(catMap[s.category_id] || s.category_id) + '</span>';
    } else {
      imgInfo = '<span class="badge bg-warning-subtle text-warning-emphasis fw-normal">' +
                '<i class="bi bi-question me-1"></i>Chưa chọn ảnh</span>';
    }

    var badgeHtml = s.badge_text
      ? '<div class="fs-12 text-muted mb-1">' + esc(s.badge_text) + '</div>'
      : '';
    var descHtml = s.description
      ? '<div class="small text-muted text-truncate" style="max-width:320px">' + esc(s.description) + '</div>'
      : '';
    var btns =
      (s.btn1_text ? '<span class="badge bg-primary-subtle text-primary-emphasis fw-normal fs-12">' + esc(s.btn1_text) + '</span> ' : '') +
      (s.btn2_text ? '<span class="badge bg-warning-subtle text-warning-emphasis fw-normal fs-12">' + esc(s.btn2_text) + '</span>' : '');

    return '<tr data-id="' + s.id + '">' +
      '<td class="text-center fw-semibold text-muted">' + s.id + '</td>' +
      '<td>' + imgInfo + '</td>' +
      '<td>' +
        badgeHtml +
        '<div class="fw-semibold">' + esc(s.title || '(Không có tiêu đề)') + '</div>' +
        descHtml +
        (btns ? '<div class="d-flex gap-2 mt-1 flex-wrap">' + btns + '</div>' : '') +
      '</td>' +
      '<td class="text-center">' +
        '<button class="btn btn-sm ' + (s.is_active ? 'btn-success' : 'btn-outline-secondary') + ' rounded-pill px-3 d-inline-flex align-items-center gap-1" ' +
                'data-action="toggle" title="' + (s.is_active ? 'Đang hiển thị – bấm để tắt' : 'Đang tắt – bấm để bật') + '">' +
          '<i class="bi ' + (s.is_active ? 'bi-eye-fill' : 'bi-eye-slash') + '"></i>' +
          '<span class="d-none d-lg-inline">' + (s.is_active ? 'Hiển thị' : 'Tắt') + '</span>' +
        '</button>' +
      '</td>' +
      '<td class="text-center">' +
        '<div class="d-flex align-items-center justify-content-center gap-1">' +
          '<button class="btn btn-sm btn-outline-secondary p-1" data-action="up" title="Lên" style="width:28px;height:28px">' +
            '<i class="bi bi-chevron-up"></i></button>' +
          '<span class="fw-semibold px-1">' + s.sort_order + '</span>' +
          '<button class="btn btn-sm btn-outline-secondary p-1" data-action="down" title="Xuống" style="width:28px;height:28px">' +
            '<i class="bi bi-chevron-down"></i></button>' +
        '</div>' +
      '</td>' +
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

  /* ========================================================================
   * 5. FORM THÊM / SỬA
   * ====================================================================== */

  function openForm(slide, cats) {
    var isNew = !slide;
    var s = slide || {
      badge_text: '', title: '', description: '',
      btn1_text: 'Xem sản phẩm', btn1_url: 'products.html',
      btn2_text: 'Nhận báo giá', btn2_url: 'contact.html',
      image_file: '', category_id: '', sort_order: 0, is_active: true
    };

    var catOptions = '<option value="">— Không dùng danh mục —</option>' +
      cats.map(function (c) {
        return '<option value="' + c.id + '"' + (s.category_id === c.id ? ' selected' : '') + '>' +
               esc(c.name) + ' (ID ' + c.id + ')</option>';
      }).join('');

    ui.modal({
      title: isNew ? 'Thêm slide mới' : 'Chỉnh sửa slide',
      size: 'lg',
      body:
        '<form id="slideForm" novalidate>' +
          '<div class="row g-3">' +

            '<div class="col-12">' +
              '<label class="form-label fw-semibold" for="sBadge">Nhãn badge <span class="text-muted fw-normal fs-12">(hiển thị nhỏ phía trên tiêu đề)</span></label>' +
              '<input type="text" class="form-control" id="sBadge" name="badge_text" value="' + esc(s.badge_text) + '" placeholder="Ví dụ: Keo acrylic cao cấp">' +
            '</div>' +

            '<div class="col-12">' +
              '<label class="form-label fw-semibold" for="sTitle">Tiêu đề <span class="text-danger">*</span></label>' +
              '<input type="text" class="form-control" id="sTitle" name="title" value="' + esc(s.title) + '" placeholder="Ví dụ: Dán thùng carton bền chắc, chịu nhiệt" required>' +
              '<div class="invalid-feedback" id="err-title"></div>' +
            '</div>' +

            '<div class="col-12">' +
              '<label class="form-label fw-semibold" for="sDesc">Mô tả ngắn</label>' +
              '<textarea class="form-control" id="sDesc" name="description" rows="3" placeholder="Mô tả hiển thị dưới tiêu đề, tối đa 2–3 dòng...">' + esc(s.description) + '</textarea>' +
            '</div>' +

            '<div class="col-sm-6">' +
              '<label class="form-label fw-semibold" for="sBtn1Text">Nút 1 — Nhãn</label>' +
              '<input type="text" class="form-control" id="sBtn1Text" name="btn1_text" value="' + esc(s.btn1_text) + '" placeholder="Xem sản phẩm">' +
            '</div>' +
            '<div class="col-sm-6">' +
              '<label class="form-label fw-semibold" for="sBtn1Url">Nút 1 — URL</label>' +
              '<input type="text" class="form-control" id="sBtn1Url" name="btn1_url" value="' + esc(s.btn1_url) + '" placeholder="products.html?cat=2">' +
            '</div>' +

            '<div class="col-sm-6">' +
              '<label class="form-label fw-semibold" for="sBtn2Text">Nút 2 — Nhãn</label>' +
              '<input type="text" class="form-control" id="sBtn2Text" name="btn2_text" value="' + esc(s.btn2_text) + '" placeholder="Nhận báo giá">' +
            '</div>' +
            '<div class="col-sm-6">' +
              '<label class="form-label fw-semibold" for="sBtn2Url">Nút 2 — URL</label>' +
              '<input type="text" class="form-control" id="sBtn2Url" name="btn2_url" value="' + esc(s.btn2_url) + '" placeholder="contact.html">' +
            '</div>' +

            '<div class="col-12">' +
              '<label class="form-label fw-semibold">Ảnh nền slide</label>' +
              '<div class="card p-3 bg-light border">' +
                '<div class="mb-2">' +
                  '<label class="form-label fs-13 mb-1" for="sImageFile"><strong>Tùy chọn A:</strong> Tên file trong thư mục <code>/images/</code></label>' +
                  '<input type="text" class="form-control form-control-sm" id="sImageFile" name="image_file" value="' + esc(s.image_file || '') + '" placeholder="banner-1.webp">' +
                  '<div class="form-text">Ưu tiên hơn tùy chọn B. Để trống nếu dùng B.</div>' +
                '</div>' +
                '<hr class="my-2">' +
                '<div>' +
                  '<label class="form-label fs-13 mb-1" for="sCategoryId"><strong>Tùy chọn B:</strong> Lấy ảnh tự động từ sản phẩm đầu của danh mục</label>' +
                  '<select class="form-select form-select-sm" id="sCategoryId" name="category_id">' + catOptions + '</select>' +
                  '<div class="form-text">Chỉ dùng khi Tùy chọn A để trống.</div>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<div class="col-sm-6">' +
              '<label class="form-label fw-semibold" for="sSortOrder">Thứ tự hiển thị</label>' +
              '<input type="number" class="form-control" id="sSortOrder" name="sort_order" value="' + (s.sort_order || 0) + '" min="0" step="1">' +
              '<div class="form-text">Số nhỏ hơn → hiển thị trước.</div>' +
            '</div>' +
            '<div class="col-sm-6 d-flex align-items-end">' +
              '<div class="form-check form-switch mb-2">' +
                '<input class="form-check-input" type="checkbox" role="switch" id="sIsActive" name="is_active" ' + (s.is_active ? 'checked' : '') + ' style="width:3em;height:1.6em">' +
                '<label class="form-check-label fw-semibold ms-2" for="sIsActive">Hiển thị slide này</label>' +
              '</div>' +
            '</div>' +

          '</div>' +
        '</form>',

      footer:
        '<button type="button" class="btn btn-light border" data-bs-dismiss="modal">Hủy bỏ</button>' +
        '<button type="button" class="btn btn-primary" id="btnSaveSlide">' +
          '<i class="bi bi-check-lg me-1"></i>' + (isNew ? 'Thêm slide' : 'Lưu thay đổi') +
        '</button>',

      onReady: function (body, close) {
        Admin.$('#btnSaveSlide').addEventListener('click', function () {
          saveSlide(body, close, isNew ? null : slide.id);
        });
      }
    });
  }

  /* ========================================================================
   * 6. LƯU SLIDE
   * ====================================================================== */

  async function saveSlide(body, close, id) {
    var form       = Admin.$('#slideForm', body);
    var titleField = form.elements.title;
    var title      = titleField.value.trim();

    if (!title) {
      ui.setFieldError(titleField, 'Vui lòng nhập tiêu đề cho slide.');
      titleField.focus();
      return;
    }
    ui.setFieldError(titleField, '');

    var catVal = form.elements.category_id.value;
    var record = {
      badge_text:  form.elements.badge_text.value.trim(),
      title:       title,
      description: form.elements.description.value.trim(),
      btn1_text:   form.elements.btn1_text.value.trim(),
      btn1_url:    form.elements.btn1_url.value.trim(),
      btn2_text:   form.elements.btn2_text.value.trim(),
      btn2_url:    form.elements.btn2_url.value.trim(),
      image_file:  form.elements.image_file.value.trim() || null,
      category_id: catVal ? Number(catVal) : null,
      sort_order:  Number(form.elements.sort_order.value) || 0,
      is_active:   form.elements.is_active.checked
    };

    var saveBtn = Admin.$('#btnSaveSlide');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang lưu...';

    try {
      var res;
      if (id) {
        res = await supabase.from('carousel_slide').update(record).eq('id', id);
      } else {
        res = await supabase.from('carousel_slide').insert([record]);
      }
      if (res.error) throw res.error;

      ui.toast(id ? 'Đã cập nhật slide.' : 'Đã thêm slide mới.', 'ok');
      close();
      Admin.reload();
    } catch (err) {
      console.error(err);
      ui.toast('Lưu thất bại: ' + (err.message || String(err)), 'err');
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i>' + (id ? 'Lưu thay đổi' : 'Thêm slide');
    }
  }

  /* ========================================================================
   * 7. XÓA SLIDE
   * ====================================================================== */

  async function deleteSlide(slide) {
    var ok = await ui.confirm({
      title:   'Xóa slide',
      message: 'Xóa slide "' + (slide.title || 'không có tiêu đề') + '"? Thao tác này không thể hoàn tác.',
      okText:  'Xóa slide'
    });
    if (!ok) return;

    try {
      var res = await supabase.from('carousel_slide').delete().eq('id', slide.id);
      if (res.error) throw res.error;
      ui.toast('Đã xóa slide.', 'ok');
      Admin.reload();
    } catch (err) {
      console.error(err);
      ui.toast('Xóa thất bại: ' + (err.message || String(err)), 'err');
    }
  }

  /* ========================================================================
   * 8. BẬT / TẮT SLIDE
   * ====================================================================== */

  async function toggleActive(slide) {
    try {
      var res = await supabase
        .from('carousel_slide')
        .update({ is_active: !slide.is_active })
        .eq('id', slide.id);
      if (res.error) throw res.error;
      ui.toast(slide.is_active ? 'Đã tắt slide.' : 'Đã bật slide.', 'ok');
      Admin.reload();
    } catch (err) {
      console.error(err);
      ui.toast('Cập nhật thất bại: ' + (err.message || String(err)), 'err');
    }
  }

  /* ========================================================================
   * 9. ĐỔI THỨ TỰ (mũi tên ↑↓)
   * Hoán đổi sort_order giữa slide hiện tại và slide kề.
   * ====================================================================== */

  async function moveSlide(slide, slides, direction) {
    var sorted = slides.slice().sort(function (a, b) { return a.sort_order - b.sort_order; });
    var idx    = sorted.findIndex(function (s) { return s.id === slide.id; });
    var target = sorted[idx + direction];
    if (!target) return; // Đã ở đầu hoặc cuối

    try {
      await Promise.all([
        supabase.from('carousel_slide').update({ sort_order: target.sort_order }).eq('id', slide.id),
        supabase.from('carousel_slide').update({ sort_order: slide.sort_order  }).eq('id', target.id)
      ]);
      Admin.reload();
    } catch (err) {
      console.error(err);
      ui.toast('Đổi thứ tự thất bại: ' + (err.message || String(err)), 'err');
    }
  }

  /* ========================================================================
   * 10. SCRIPT SQL TẠO BẢNG
   * ====================================================================== */

  var SQL_SETUP =
    '-- Tạo bảng carousel_slide\n' +
    'CREATE TABLE carousel_slide (\n' +
    '  id          SERIAL PRIMARY KEY,\n' +
    '  badge_text  TEXT    NOT NULL DEFAULT \'\',\n' +
    '  title       TEXT    NOT NULL,\n' +
    '  description TEXT    NOT NULL DEFAULT \'\',\n' +
    '  btn1_text   TEXT    NOT NULL DEFAULT \'Xem sản phẩm\',\n' +
    '  btn1_url    TEXT    NOT NULL DEFAULT \'products.html\',\n' +
    '  btn2_text   TEXT    NOT NULL DEFAULT \'Nhận báo giá\',\n' +
    '  btn2_url    TEXT    NOT NULL DEFAULT \'contact.html\',\n' +
    '  image_file  TEXT,\n' +
    '  category_id INTEGER REFERENCES category(id) ON DELETE SET NULL,\n' +
    '  sort_order  INTEGER NOT NULL DEFAULT 0,\n' +
    '  is_active   BOOLEAN NOT NULL DEFAULT TRUE,\n' +
    '  created_at  TIMESTAMPTZ DEFAULT NOW()\n' +
    ');\n\n' +
    '-- Seed 3 slide mặc định\n' +
    'INSERT INTO carousel_slide\n' +
    '  (badge_text, title, description, btn1_text, btn1_url, btn2_text, btn2_url, category_id, sort_order)\n' +
    'VALUES\n' +
    '  (\'Băng keo giấy & tem nhãn\',\n' +
    '   \'Tem nhãn nhiệt in sắc nét, dán chắc\',\n' +
    '   \'Băng keo giấy dễ xé tay, tem nhãn vận chuyển khổ 4x6 và nhãn mã vạch tổng hợp — đáp ứng trọn khâu đóng gói và hậu cần.\',\n' +
    '   \'Xem sản phẩm\', \'products.html?cat=1\', \'Nhận báo giá\', \'contact.html\', 1, 1),\n' +
    '  (\'Keo acrylic cao cấp\',\n' +
    '   \'Dán thùng carton bền chắc, chịu nhiệt\',\n' +
    '   \'Băng keo OPP/BOPP keo acrylic gia cường, chống thấm nước, ít tiếng ồn khi xé — lựa chọn hàng đầu cho kho vận và nhà máy.\',\n' +
    '   \'Xem sản phẩm\', \'products.html?cat=2\', \'Nhận báo giá\', \'contact.html\', 2, 2),\n' +
    '  (\'Màng PE (Màng chít)\',\n' +
    '   \'Siêu dai, co giãn tốt, bảo vệ tối ưu\',\n' +
    '   \'Màng PE quấn pallet với độ co giãn lên đến 350%, bám dính siêu chắc giúp cố định hàng hóa, chống bụi bẩn, chống thấm nước hoàn hảo cho kho vận.\',\n' +
    '   \'Xem sản phẩm\', \'products.html?cat=5\', \'Nhận báo giá\', \'contact.html\', 5, 3);';

})(window.Admin);
