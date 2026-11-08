/* ==========================================================================
 * admin/js/page-posts.js
 * Quản lý Bài viết Blog / Tin tức (CRUD)
 * ========================================================================== */

(function (Admin) {
  'use strict';

  var U = Admin.util, esc = U.esc, ui = Admin.ui;
  var supabase = window.supabaseClient;

  var state = { q: '', status: 'all' };

  Admin.page('posts', {
    title:  'Bài viết Blog',
    label:  'Bài viết',
    icon:   'bi-journal-richtext',
    sub:    'Quản lý tin tức, bài viết cẩm nang ngành băng keo & màng PE',
    render: render
  });

  function slugify(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  async function fetchPosts() {
    var query = supabase
      .from('post')
      .select('*')
      .order('created_at', { ascending: false });

    if (state.status === 'published') query = query.eq('is_published', true);
    else if (state.status === 'draft') query = query.eq('is_published', false);

    const { data, error } = await query;
    if (error) throw error;
    var rows = data || [];
    if (state.q) {
      var k = U.deaccent(state.q);
      rows = rows.filter(function (p) {
        return U.deaccent(p.title || '').indexOf(k) !== -1 ||
               U.deaccent(p.category_tag || '').indexOf(k) !== -1 ||
               U.deaccent(p.slug || '').indexOf(k) !== -1;
      });
    }
    return rows;
  }

  async function render(view) {
    view.innerHTML =
      '<div class="d-flex justify-content-center py-5">' +
      '<div class="spinner-border text-primary" role="status"></div></div>';

    var posts;
    try {
      posts = await fetchPosts();
    } catch (err) {
      view.innerHTML = ui.emptyState(
        'bi-exclamation-triangle', 'Không nạp được danh sách bài viết',
        (err && err.message) || 'Hãy kiểm tra bảng `post` trên Supabase.',
        '<button class="btn btn-outline-primary btn-sm" onclick="Admin.reload()">Thử lại</button>'
      );
      return;
    }

    var toolbarHtml =
      '<div class="d-flex align-items-center justify-content-between gap-2 mb-3 flex-wrap">' +
        '<div class="d-flex gap-2 flex-wrap align-items-center">' +
          '<div class="position-relative" style="min-width:220px">' +
            '<i class="bi bi-search position-absolute text-muted" style="left:.75rem;top:50%;transform:translateY(-50%)"></i>' +
            '<input type="search" class="form-control form-control-sm ps-5" id="postSearch" placeholder="Tìm tiêu đề, danh mục..." value="' + esc(state.q) + '">' +
          '</div>' +
          '<select class="form-select form-select-sm w-auto" id="postStatusFilter">' +
            '<option value="all"' + (state.status === 'all' ? ' selected' : '') + '>Mọi trạng thái</option>' +
            '<option value="published"' + (state.status === 'published' ? ' selected' : '') + '>Đã xuất bản</option>' +
            '<option value="draft"' + (state.status === 'draft' ? ' selected' : '') + '>Bản nháp</option>' +
          '</select>' +
        '</div>' +
        '<div class="d-flex gap-2">' +
          (posts.length === 0 && state.status === 'all' && !state.q
            ? '<button class="btn btn-sm btn-outline-secondary" id="btnSeedPosts"><i class="bi bi-magic me-1"></i>Tạo bài viết mẫu</button>'
            : '') +
          '<button class="btn btn-sm btn-primary" id="btnAddPost"><i class="bi bi-plus-lg me-1"></i>Viết bài mới</button>' +
        '</div>' +
      '</div>';

    var tableHtml = posts.length === 0
      ? ui.emptyState('bi-journal-richtext', 'Chưa có bài viết nào', 'Bấm "Viết bài mới" hoặc "Tạo bài viết mẫu" để bắt đầu.')
      : '<div class="card border shadow-sm">' +
          '<div class="table-responsive">' +
            '<table class="table table-hover align-middle mb-0">' +
              '<thead class="table-light">' +
                '<tr>' +
                  '<th style="width:70px">Ảnh</th>' +
                  '<th>Tiêu đề &amp; Đường dẫn</th>' +
                  '<th>Chuyên mục</th>' +
                  '<th>Trạng thái</th>' +
                  '<th>Ngày đăng</th>' +
                  '<th style="width:140px" class="text-end">Thao tác</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody id="postsTableBody">' +
                posts.map(rowHTML).join('') +
              '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>';

    view.innerHTML = toolbarHtml + tableHtml;

    var searchInp = Admin.$('#postSearch');
    if (searchInp) {
      searchInp.addEventListener('input', U.debounce(function (e) {
        state.q = e.target.value;
        Admin.reload();
      }, 280));
    }

    var statusSel = Admin.$('#postStatusFilter');
    if (statusSel) {
      statusSel.addEventListener('change', function (e) {
        state.status = e.target.value;
        Admin.reload();
      });
    }

    var btnAdd = Admin.$('#btnAddPost');
    if (btnAdd) {
      btnAdd.addEventListener('click', function () { openForm(null); });
    }

    var btnSeed = Admin.$('#btnSeedPosts');
    if (btnSeed) {
      btnSeed.addEventListener('click', seedDefaultPosts);
    }

    var tbody = Admin.$('#postsTableBody');
    if (tbody) {
      tbody.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var id = btn.closest('tr').getAttribute('data-id');
        var record = posts.find(function (p) { return String(p.id) === String(id); });
        if (!record) return;
        var act = btn.getAttribute('data-action');
        if (act === 'edit') openForm(record);
        else if (act === 'del') deleteRecord(record);
        else if (act === 'toggle') togglePublish(record);
      });
    }
  }

  function rowHTML(p) {
    var img = p.image || '../images/logo.webp';
    if (img && !/^https?:\/\//i.test(img) && img.indexOf('../') !== 0) {
      img = '../' + img.replace(/^\//, '');
    }
    var statusBadge = p.is_published
      ? '<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle">Đã xuất bản</span>'
      : '<span class="badge bg-secondary-subtle text-secondary-emphasis border">Bản nháp</span>';
    var dateStr = (p.published_at || p.created_at)
      ? new Date(p.published_at || p.created_at).toLocaleDateString('vi-VN')
      : '—';
    var previewUrl = '../post.html?' + (p.slug ? 'slug=' + encodeURIComponent(p.slug) : 'id=' + encodeURIComponent(p.id));

    return '<tr data-id="' + esc(p.id) + '">' +
      '<td><img src="' + esc(img) + '" alt="" class="rounded border" style="width:52px;height:40px;object-fit:cover" onerror="this.src=\'../images/logo.webp\'"></td>' +
      '<td>' +
        '<div class="fw-semibold">' + esc(p.title) + '</div>' +
        '<div class="fs-12 text-muted"><code>/' + esc(p.slug || p.id) + '</code> · Tác giả: ' + esc(p.author || 'Vũ Gia Phát') + '</div>' +
      '</td>' +
      '<td><span class="badge bg-light text-dark border">' + esc(p.category_tag || 'Kiến thức đóng gói') + '</span></td>' +
      '<td>' + statusBadge + '</td>' +
      '<td class="fs-13 text-muted">' + dateStr + '</td>' +
      '<td class="text-end text-nowrap">' +
        '<a href="' + previewUrl + '" target="_blank" class="btn btn-sm btn-light border me-1" title="Xem bài viết">' +
          '<i class="bi bi-box-arrow-up-right"></i>' +
        '</a>' +
        '<button type="button" class="btn btn-sm btn-light border me-1" data-action="toggle" title="' + (p.is_published ? 'Chuyển về nháp' : 'Xuất bản ngay') + '">' +
          '<i class="bi ' + (p.is_published ? 'bi-eye-slash' : 'bi-check2-circle text-success') + '"></i>' +
        '</button>' +
        '<button type="button" class="btn btn-sm btn-outline-primary me-1" data-action="edit" title="Chỉnh sửa">' +
          '<i class="bi bi-pencil"></i>' +
        '</button>' +
        '<button type="button" class="btn btn-sm btn-outline-danger" data-action="del" title="Xóa">' +
          '<i class="bi bi-trash"></i>' +
        '</button>' +
      '</td>' +
    '</tr>';
  }

  function openForm(record) {
    var isEdit = !!record;
    var p = record || {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      image: 'images/bopp_tape.webp',
      category_tag: 'Kiến thức đóng gói',
      author: 'Vũ Gia Phát',
      is_published: true,
      seo_title: '',
      seo_description: ''
    };

    ui.modal({
      title: isEdit ? 'Chỉnh sửa bài viết' : 'Viết bài mới',
      size: 'xl',
      body:
        '<form id="postForm" novalidate>' +
          '<div class="row g-3">' +
            '<div class="col-md-8">' +
              '<label class="form-label fw-semibold">Tiêu đề bài viết <span class="text-danger">*</span></label>' +
              '<input type="text" class="form-control" name="title" id="postTitleInp" value="' + esc(p.title) + '" required placeholder="VD: Cách phân biệt băng keo đủ yard và thiếu yard">' +
            '</div>' +
            '<div class="col-md-4">' +
              '<label class="form-label fw-semibold">Đường dẫn tĩnh (Slug)</label>' +
              '<input type="text" class="form-control" name="slug" id="postSlugInp" value="' + esc(p.slug || '') + '" placeholder="tu-dong-tao-tu-tieu-de">' +
            '</div>' +
            '<div class="col-md-4">' +
              '<label class="form-label fw-semibold">Chuyên mục (Tag)</label>' +
              '<input type="text" class="form-control" name="category_tag" value="' + esc(p.category_tag || 'Kiến thức đóng gói') + '" placeholder="VD: Kiến thức đóng gói">' +
            '</div>' +
            '<div class="col-md-4">' +
              '<label class="form-label fw-semibold">Tác giả</label>' +
              '<input type="text" class="form-control" name="author" value="' + esc(p.author || 'Vũ Gia Phát') + '">' +
            '</div>' +
            '<div class="col-md-4">' +
              '<label class="form-label fw-semibold">Ảnh đại diện (URL / Đường dẫn)</label>' +
              '<input type="text" class="form-control" name="image" value="' + esc(p.image || '') + '" placeholder="images/bopp_tape.webp">' +
            '</div>' +
            '<div class="col-12">' +
              '<label class="form-label fw-semibold">Tóm tắt ngắn (Excerpt)</label>' +
              '<textarea class="form-control" name="excerpt" rows="2" placeholder="Đoạn mô tả ngắn hiển thị ngoài danh sách bài viết...">' + esc(p.excerpt || '') + '</textarea>' +
            '</div>' +
            '<div class="col-12">' +
              '<label class="form-label fw-semibold">Nội dung bài viết (HTML) <span class="text-danger">*</span></label>' +
              '<div class="form-text mb-1">Hỗ trợ thẻ <code>&lt;h2&gt;</code>, <code>&lt;h3&gt;</code> (tự động tạo Mục lục bài viết), <code>&lt;p&gt;</code>, <code>&lt;ul&gt;</code>, <code>&lt;strong&gt;</code>...</div>' +
              '<textarea class="form-control font-monospace" name="content" rows="12" style="font-size:13px" required>' + esc(p.content || '') + '</textarea>' +
            '</div>' +
            '<div class="col-12 border-top pt-3 mt-2">' +
              '<h6 class="fw-bold text-brand mb-2"><i class="bi bi-search me-1"></i>Tối ưu SEO cho bài viết</h6>' +
              '<div class="row g-3">' +
                '<div class="col-md-6">' +
                  '<label class="form-label small fw-semibold">SEO Title</label>' +
                  '<input type="text" class="form-control form-control-sm" name="seo_title" value="' + esc(p.seo_title || '') + '" placeholder="Mặc định lấy tiêu đề bài viết">' +
                '</div>' +
                '<div class="col-md-6">' +
                  '<label class="form-label small fw-semibold">SEO Description</label>' +
                  '<input type="text" class="form-control form-control-sm" name="seo_description" value="' + esc(p.seo_description || '') + '" placeholder="Mặc định lấy tóm tắt bài viết">' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="col-12">' +
              '<div class="form-check form-switch">' +
                '<input class="form-check-input" type="checkbox" id="postPublishedChk" name="is_published" ' + (p.is_published !== false ? 'checked' : '') + '>' +
                '<label class="form-check-label fw-semibold" for="postPublishedChk">Xuất bản công khai ngay trên trang Blog</label>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</form>',
      footer:
        '<button type="button" class="btn btn-light border" data-bs-dismiss="modal">Hủy bỏ</button>' +
        '<button type="button" class="btn btn-primary" id="btnSavePost"><i class="bi bi-check-lg me-1"></i>' + (isEdit ? 'Lưu thay đổi' : 'Đăng bài viết') + '</button>',
      onReady: function (body, close) {
        var titleInp = Admin.$('#postTitleInp', body);
        var slugInp = Admin.$('#postSlugInp', body);
        var slugTouched = !!p.slug;

        slugInp.addEventListener('input', function () {
          slugTouched = slugInp.value.trim().length > 0;
        });
        titleInp.addEventListener('input', function () {
          if (!slugTouched) {
            slugInp.value = slugify(titleInp.value);
          }
        });

        Admin.$('#btnSavePost', body).addEventListener('click', function () {
          savePost(body, close, isEdit ? record.id : null);
        });
      }
    });
  }

  async function savePost(body, close, id) {
    var form = Admin.$('#postForm', body);
    var title = form.elements.title.value.trim();
    var content = form.elements.content.value.trim();

    if (!title || !content) {
      ui.toast('Vui lòng nhập đầy đủ Tiêu đề và Nội dung bài viết.', 'err');
      return;
    }

    var slug = form.elements.slug.value.trim() || slugify(title);
    var isPublished = form.elements.is_published.checked;
    var nowIso = new Date().toISOString();

    var payload = {
      title: title,
      slug: slug,
      excerpt: form.elements.excerpt.value.trim() || null,
      content: content,
      image: form.elements.image.value.trim() || 'images/logo.webp',
      category_tag: form.elements.category_tag.value.trim() || 'Kiến thức đóng gói',
      author: form.elements.author.value.trim() || 'Vũ Gia Phát',
      is_published: isPublished,
      published_at: isPublished ? nowIso : null,
      seo_title: form.elements.seo_title.value.trim() || null,
      seo_description: form.elements.seo_description.value.trim() || null
    };
    if (!id) payload.created_at = nowIso;

    var saveBtn = Admin.$('#btnSavePost');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang lưu...';

    try {
      var res = id
        ? await supabase.from('post').update(payload).eq('id', id)
        : await supabase.from('post').insert([payload]);
      if (res.error) throw res.error;

      ui.toast(id ? 'Đã cập nhật bài viết.' : 'Đã đăng bài viết mới.', 'ok');
      close();
      Admin.reload();
    } catch (err) {
      console.error(err);
      ui.toast('Lưu thất bại: ' + (err.message || String(err)), 'err');
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Lưu lại';
    }
  }

  async function togglePublish(record) {
    var nextState = !record.is_published;
    try {
      var res = await supabase.from('post').update({
        is_published: nextState,
        published_at: nextState ? new Date().toISOString() : null
      }).eq('id', record.id);
      if (res.error) throw res.error;
      ui.toast(nextState ? 'Đã xuất bản bài viết.' : 'Đã chuyển về bản nháp.', 'ok');
      Admin.reload();
    } catch (err) {
      ui.toast('Không đổi được trạng thái: ' + (err.message || ''), 'err');
    }
  }

  function deleteRecord(record) {
    ui.confirm({
      title: 'Xóa bài viết?',
      rawMessage: 'Bạn có chắc chắn muốn xóa bài viết <strong>' + esc(record.title) + '</strong>?',
      okText: 'Xóa bài viết',
      danger: true
    }).then(async function (ok) {
      if (!ok) return;
      try {
        var res = await supabase.from('post').delete().eq('id', record.id);
        if (res.error) throw res.error;
        ui.toast('Đã xóa bài viết.', 'ok');
        Admin.reload();
      } catch (err) {
        ui.toast('Xóa thất bại: ' + (err.message || ''), 'err');
      }
    });
  }

  async function seedDefaultPosts() {
    var now = new Date().toISOString();
    var samples = [
      {
        title: 'Cách phân biệt băng keo dán thùng đủ Yard và thiếu Yard chuẩn xác nhất',
        slug: 'cach-phan-biet-bang-keo-du-yard-va-thieu-yard',
        excerpt: 'Hướng dẫn chi tiết cách kiểm tra chiều dài thực tế (yard), độ dày màng (mic) và trọng lượng cuộn băng keo OPP để tránh mua nhầm hàng độn lõi giấy.',
        category_tag: 'Kinh nghiệm mua hàng',
        author: 'Vũ Gia Phát',
        image: 'images/bopp_tape.webp',
        is_published: true,
        published_at: now,
        created_at: now,
        seo_title: 'Cách Phân Biệt Băng Keo Đủ Yard & Thiếu Yard - Vũ Gia Phát',
        seo_description: 'Mẹo kiểm tra băng keo trong, băng keo đục đủ số yard, đúng độ dày màng 50 mic và cách cân trọng lượng lõi giấy cho doanh nghiệp.',
        content:
          '<h2>1. Yard trong ngành băng keo là gì?</h2>' +
          '<p>Trong ngành sản xuất băng keo đóng gói, <strong>1 Yard = 0.9144 mét</strong>. Các quy cách phổ biến nhất trên thị trường hiện nay là cuộn 80 yard, 100 yard và 200 yard khổ 48mm (4F8).</p>' +
          '<h2>2. 3 cách kiểm tra băng keo đủ yard chuẩn xác</h2>' +
          '<ul>' +
            '<li><strong>Cân trọng lượng cả cây (6 cuộn):</strong> Với lõi giấy mỏng chuẩn (3–4mm), cây băng keo 100 yard màng 50 mic thường nặng từ 1.8kg – 2.2kg tùy độ dày lõi.</li>' +
            '<li><strong>Đo độ dày viền keo (Bề dày thịt keo):</strong> Cuộn 100 yard chuẩn có phần thịt keo dày khoảng 1.3cm – 1.5cm.</li>' +
            '<li><strong>Kiểm tra độ dày lõi giấy:</strong> Tránh các loại băng keo dùng lõi giấy siêu dày (7–10mm) hoặc lõi thạch cao làm tăng trọng lượng ảo.</li>' +
          '</ul>' +
          '<h2>3. Cam kết từ Xưởng sản xuất Vũ Gia Phát</h2>' +
          '<p>Tại Vũ Gia Phát, mọi lô hàng xuất xưởng đều được cam kết đúng 100% số yard và độ dày màng (mic), hỗ trợ đổi trả miễn phí trong 7 ngày nếu sai quy cách.</p>'
      },
      {
        title: 'Hướng dẫn chọn màng PE quấn Pallet theo trọng lượng và kích thước hàng hóa',
        slug: 'huong-dan-chon-mang-pe-quan-pallet-phu-hop',
        excerpt: 'Tư vấn chọn màng PE quấn tay (2.4kg - 3.8kg) và màng PE quấn máy (15kg) với độ dày từ 17 mic đến 23 mic giúp tiết kiệm tới 25% chi phí đóng gói.',
        category_tag: 'Giải pháp kho vận',
        author: 'Vũ Gia Phát',
        image: 'images/pe_film1.jpg',
        is_published: true,
        published_at: now,
        created_at: now,
        seo_title: 'Hướng Dẫn Chọn Màng PE Quấn Pallet Tiết Kiệm Chi Phí - Vũ Gia Phát',
        seo_description: 'Cách chọn màng PE quấn tay, màng PE quấn máy đúng độ dày mic và tỷ lệ co giãn 350% cho kho xưởng.',
        content:
          '<h2>1. Phân loại màng PE quấn hàng phổ biến</h2>' +
          '<p>Màng PE (Stretch Film / Màng chít) được sản xuất từ hạt nhựa LLDPE nguyên sinh, có độ giãn dài lên tới 300% – 350%.</p>' +
          '<h3>a) Màng PE quấn tay</h3>' +
          '<p>Khổ rộng phổ biến 50cm, trọng lượng cuộn từ 2.0kg, 2.4kg, 3.0kg đến 3.8kg (lõi giấy 200g – 300g), phù hợp cho kho hàng vừa và nhỏ.</p>' +
          '<h3>b) Màng PE quấn máy</h3>' +
          '<p>Cuộn lớn trọng lượng 15kg (lõi 1kg – 1.2kg), độ dày 20–23 mic, chuyên dùng cho máy quấn pallet tự động tại các nhà máy xuất khẩu.</p>' +
          '<h2>2. Mẹo tối ưu chi phí màng PE cho doanh nghiệp</h2>' +
          '<p>Hãy ưu tiên kiểm tra <strong>trọng lượng màng nhựa tịnh (Net Weight)</strong> sau khi trừ đi trọng lượng lõi giấy để tính đúng chi phí thực tế trên mỗi mét màng quấn.</p>'
      }
    ];

    try {
      var res = await supabase.from('post').insert(samples);
      if (res.error) throw res.error;
      ui.toast('Đã tạo 2 bài viết mẫu thành công.', 'ok');
      Admin.reload();
    } catch (err) {
      ui.toast('Không thể tạo bài viết mẫu: ' + (err.message || ''), 'err');
    }
  }

})(window.Admin);

