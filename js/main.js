/* ==========================================================================
 * BangKeo_VuGiaPhat - main.js
 *
 * Xử lý phần động của website: nạp dữ liệu, dựng thẻ sản phẩm, lọc/tìm kiếm,
 * modal xem nhanh và form liên hệ.
 *
 * JavaScript thuần (ES6+). Các thành phần giao diện dùng sẵn của Bootstrap 5:
 *   - Carousel, Offcanvas (menu mobile), Modal, Toast, Collapse
 * File này chỉ gọi API của Bootstrap chứ không tự viết lại các thành phần đó.
 *
 * Mọi trang đều nạp chung file này; script tự nhận biết đang ở trang nào qua
 * thuộc tính <body data-page="home|products|contact">.
 * ========================================================================== */

(function () {
  'use strict';

  /* Đánh dấu "JS đang chạy" ngay khi script được nạp.
     CSS chỉ ẩn các khối .reveal khi có lớp này, nên nếu JS lỗi hoặc bị chặn
     thì nội dung vẫn hiển thị đầy đủ thay vì trắng trang. */
  document.documentElement.classList.add('js-ready');

  /* ======================================================================
   * 1. HẰNG SỐ & TIỆN ÍCH DÙNG CHUNG
   * ====================================================================== */

  var IMG_DIR      = 'images/products/';
  var PAGE_SIZE    = 12;   // số sản phẩm mỗi lần "Xem thêm"
  var HOME_LATEST  = 8;    // số sản phẩm mới nhất trên trang chủ
  var FEEDBACK_KEY = 'vgp_feedback';

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  /** Định dạng tiền Việt Nam: 8040 -> "8.040 ₫" */
  var vnd = new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0
  });
  function formatPrice(n) {
    if (n === 0) return '<span class="text-danger fw-bold">Liên hệ báo giá</span>';
    return (typeof n === 'number' && isFinite(n)) ? vnd.format(n) : 'Liên hệ';
  }

  /** Chặn chèn HTML từ dữ liệu (tiêu đề sản phẩm lấy từ file JSON). */
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Bỏ dấu tiếng Việt để tìm kiếm "không dấu".
   * Nhờ vậy gõ "bang keo" vẫn tìm ra "băng keo".
   */
  function deaccent(str) {
    return String(str || '')
      .normalize('NFD')
      // \u0300-\u036f là dải dấu tổ hợp (huyền, sắc, hỏi, ngã, nặng, mũ, móc...).
      // Viết dạng escape thay vì gõ thẳng ký tự, vì chúng vô hình trong mã nguồn.
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')  // đ có gạch ngang, không nằm trong dải tổ hợp trên
      .replace(/Đ/g, 'D')
      .toLowerCase();
  }

  /** Hoãn lệnh gọi cho đến khi người dùng ngừng gõ (dùng cho ô tìm kiếm). */
  function debounce(fn, wait) {
    var timer;
    return function () {
      var args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  /* ======================================================================
   * 2. NẠP & CHUẨN HÓA DỮ LIỆU
   * ====================================================================== */

  /**
   * QUAN TRỌNG: file bangkeo.json có một số key bị dính dấu cách ở hai đầu,
   * cụ thể là " moq ", " rating ", " price_vnd " và cả category.name (" Giấy ").
   * Truy cập thẳng obj.price_vnd sẽ trả về undefined.
   * Hàm này tìm key sau khi đã trim nên đọc được cả hai kiểu viết.
   */
  function pick(obj, key) {
    if (!obj) return undefined;
    if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
    var found = Object.keys(obj).filter(function (k) { return k.trim() === key; })[0];
    return found === undefined ? undefined : obj[found];
  }

  /**
   * Cấu trúc chung mà cả trang chủ lẫn trang sản phẩm đều làm việc với nó:
   *
   *   categories: [{ id, name, description, count }]
   *   products:   [{ id, title, description, moq, rating, categoryId,
   *                  categoryName, price, inStock, image, search }]
   */

  function loadData() {
    return loadFromSupabase();
  }

  function loadFromSupabase() {
    if (typeof supabaseClient === 'undefined') {
      return Promise.reject(new Error('Chưa nạp được thư viện Supabase hoặc file supabase-config.js'));
    }

    // Promise.all giúp lấy danh mục và sản phẩm cùng lúc song song để tải trang nhanh hơn
      return Promise.all([
        supabaseClient.from('category').select('*').order('id'),
        supabaseClient.from('product').select('*').neq('is_hidden', true).order('id')
      ]).then(function (results) {
      var catRes = results[0];
      var prodRes = results[1];

      if (catRes.error) throw catRes.error;
      if (prodRes.error) throw prodRes.error;

      var catMap = {};
      var categories = catRes.data.map(function(c) {
        catMap[c.id] = c;
        return { id: c.id, name: c.name, description: c.description || '', count: 0 };
      });

      var products = prodRes.data.map(function(p) {
        var cat = catMap[p.category_id];
        return {
          id:           p.id,
          title:        p.name,
          description:  p.description || '',
          thickness: p.thickness || '',
          weight: p.weight || '',
          length: p.length || '',
          adhesion: p.adhesion || '',
          application: p.application || '',
          packaging: p.packaging || '',
          color: p.color || '',
          material: p.material || '',
          moq:          String(p.moq || '').trim(),
          rating:       (p.rating === null || p.rating === undefined) ? null : Number(p.rating),
          categoryId:   p.category_id,
          categoryName: cat ? cat.name : 'Khác',
          price:        isFinite(p.price) ? Number(p.price) : null,
          inStock:      Number(p.in_stock) !== 0,
          image:        p.image ? IMG_DIR + p.image.replace(/\.(png|jpg|jpeg)$/i, '.webp') : '',
          gallery:      p.gallery,
          galleryParsed: (function(){ try { var g = typeof p.gallery === "string" ? JSON.parse(p.gallery) : (Array.isArray(p.gallery) ? p.gallery : []); return g.map(function(img) { return img ? IMG_DIR + img.replace(/\.(png|jpg|jpeg)$/i, ".webp") : ""; }); } catch(e) { return []; } })(),
          search:       deaccent(p.name)
        };
      });

      // Đếm số lượng sản phẩm mỗi danh mục
      categories.forEach(function(c) {
        c.count = products.filter(function(p) { return p.categoryId === c.id; }).length;
      });

      return { categories: categories, products: products, source: 'supabase' };
    });
  }

  

  /**
   * Sắp xếp "mới nhất".
   * Lưu ý: file JSON KHÔNG có trường ngày tạo. Phần lớn id là mốc thời gian
   * epoch-ms (vd 1601719647235 -> 10/2020) nhưng có vài id lệch chuẩn
   * (60598884351, 10000037724350) nên không thể quy đổi ra ngày đáng tin cậy.
   * Vì vậy ta sắp xếp giảm dần theo giá trị số của id, coi đây là thứ tự nhập kho.
   */
  function byNewest(a, b) {
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  }

  /* ======================================================================
   * 3. THÀNH PHẦN GIAO DIỆN DÙNG CHUNG
   * ====================================================================== */

  /** Ảnh dự phòng (SVG nội tuyến) khi file ảnh bị thiếu -> không bao giờ vỡ ảnh. */
  var FALLBACK_IMG =
    'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">' +
      '<rect width="200" height="150" fill="#E8F4FC"/>' +
      '<circle cx="100" cy="66" r="36" fill="none" stroke="#017DC7" stroke-width="6"/>' +
      '<circle cx="100" cy="66" r="13" fill="none" stroke="#017DC7" stroke-width="6"/>' +
      '<text x="100" y="128" text-anchor="middle" font-family="sans-serif" ' +
      'font-size="14" fill="#017DC7">Chua co anh</text></svg>'
    );

  /** Thanh sao đánh giá. rating === null -> ghi rõ "Chưa có đánh giá". */
  function starsHTML(rating) {
    if (rating === null || !isFinite(rating)) {
      return '<span class="text-body-tertiary fst-italic small">Chưa có đánh giá</span>';
    }
    var pct = Math.max(0, Math.min(100, (rating / 5) * 100));
    return '<span class="d-inline-flex align-items-center gap-2 small text-body-secondary">' +
             '<span class="stars" aria-hidden="true">' +
               '<i style="--pct:' + pct.toFixed(1) + '%">★★★★★</i>' +
             '</span>' +
             '<span>' + rating.toFixed(1) + '</span>' +
           '</span>';
  }

  /** Dựng thẻ sản phẩm bằng lớp .card của Bootstrap. isNew = gắn nhãn "Mới". */
  function productCardHTML(p, isNew) {
    var hideClass = (!p.image && document.body.getAttribute('data-page') === 'home') ? ' d-none' : '';
    
    var images = p.galleryParsed && p.galleryParsed.length > 0 ? p.galleryParsed : [p.image || FALLBACK_IMG];
    var imageHtml = '<a href="product-detail.html?id=' + esc(p.id) + '"><img src="' + esc(images[0]) + '" alt="' + esc(p.title) + '" style="object-fit:contain; width:100%; height:100%; padding: 1rem;" loading="lazy" onerror="this.onerror=null;this.src=\'' + FALLBACK_IMG + '\'"></a>';
    
    var specHtml = '';
    specHtml += '<div class="col-6"><div class="border rounded py-1 px-2 text-truncate">' + esc(p.thickness || '50 mic') + '</div></div>';
    specHtml += '<div class="col-6"><div class="border rounded py-1 px-2 text-truncate">' + esc(p.length || '100 yard') + '</div></div>';
    specHtml += '<div class="col-6"><div class="border rounded py-1 px-2 text-truncate">' + esc(p.weight || '1.2kg') + '</div></div>';
    specHtml += '<div class="col-6"><div class="border rounded py-1 px-2 text-truncate">' + esc(p.packaging || 'Packing') + '</div></div>';

    // Parse variants
    var variants = [];
    try {
      variants = p.variants ? (typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants) : [];
    } catch(e){}

    var variantOptions = '';
    if (variants && variants.length > 0) {
      variants.forEach(function(v) { 
        variantOptions += '<option value="' + esc(v.id || v.name) + '">' + esc(v.name) + (v.price ? ' - ' + formatPrice(v.price) : '') + '</option>'; 
      });
    } else {
      variantOptions = '<option value="default">Giá sỉ - Lẻ</option>';
    }

    return '' +
      '<div class="col-12 col-xl-6' + hideClass + '">' +
        '<article class="card h-100 border product-card reveal" data-id="' + esc(p.id) + '">' +
          '<div class="row g-0 h-100">' +
            '<div class="col-4 col-sm-5 position-relative">' +
              '<div class="position-absolute top-0 start-0 m-2" style="z-index:2">' +
                (p.inStock ? '<span class="badge bg-warning text-dark shadow-sm">Bán chạy</span>' : '<span class="badge bg-danger text-white shadow-sm">Hết hàng</span>') +
              '</div>' +
              '<div class="product-media h-100 bg-white d-flex align-items-center justify-content-center" style="aspect-ratio: 1;">' +
                imageHtml +
              '</div>' +
            '</div>' +
            '<div class="col-8 col-sm-7">' +
              '<div class="card-body h-100 d-flex flex-column p-3">' +
                '<h3 class="product-title fs-6 fw-bold mb-3" title="' + esc(p.title) + '"><a href="product-detail.html?id=' + esc(p.id) + '" class="text-decoration-none text-dark hover-brand">' + esc(p.title) + '</a></h3>' +
                
                '<div class="row g-2 mb-3 text-center small fw-semibold text-muted" style="font-size:0.8rem;">' +
                  specHtml +
                '</div>' +
                
                '<div class="mt-auto text-center">' +
                  '<div class="text-danger fw-bold mb-3" style="font-size:1.4rem">' + formatPrice(p.price) + '</div>' +
                  '<button class="btn btn-sm text-white rounded-pill fw-semibold w-100" style="background-color: var(--brand);" data-quick="' + esc(p.id) + '">Xem chi tiết</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</article>' +
      '</div>';
  }

  function skeletonHTML(n) {
      var out = '';
      for (var i = 0; i < n; i++) {
        out += '<div class="col-12 col-xl-6"><div class="skeleton" style="height: 220px;"></div></div>';
      }
      return out;
    }

  /** Khối thông báo trạng thái (rỗng / lỗi), chiếm trọn hàng. */
  function stateHTML(title, desc, actionHTML) {
    return '<div class="col-12 text-center py-5">' +
      '<i class="bi bi-search d-block mb-3 text-body-tertiary" style="font-size:3rem"></i>' +
      '<h3 class="h5">' + esc(title) + '</h3>' +
      '<p class="text-body-secondary">' + esc(desc) + '</p>' + (actionHTML || '') +
      '</div>';
  }

  /* --- Thông báo nổi: dùng component Toast của Bootstrap ---------------- */
  function toast(msg, type) {
    var wrap = $('.toast-container');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      document.body.appendChild(wrap);
    }

    var map = {
      ok:  { icon: 'bi-check-circle-fill', cls: 'text-success' },
      err: { icon: 'bi-exclamation-circle-fill', cls: 'text-danger' }
    };
    var m = map[type] || { icon: 'bi-info-circle-fill', cls: 'text-primary' };

    var el = document.createElement('div');
    el.className = 'toast align-items-center border-0 shadow';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<div class="d-flex">' +
        '<div class="toast-body d-flex align-items-center gap-2">' +
          '<i class="bi ' + m.icon + ' ' + m.cls + ' fs-5"></i>' +
          '<span>' + esc(msg) + '</span>' +
        '</div>' +
        '<button type="button" class="btn-close me-2 m-auto" ' +
                'data-bs-dismiss="toast" aria-label="Đóng"></button>' +
      '</div>';
    wrap.appendChild(el);

    var t = new bootstrap.Toast(el, { delay: 4000 });
    el.addEventListener('hidden.bs.toast', function () { el.remove(); });
    t.show();
  }

  /* --- Hiện dần khi cuộn ---------------------------------------------- */
  var revealObserver = null;

  function initReveal() {
    if (!('IntersectionObserver' in window)) {
      // Trình duyệt cũ: hiện hết ngay, không để nội dung kẹt ở trạng thái ẩn
      $$('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    revealObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          obs.unobserve(e.target); // mỗi phần tử chỉ chạy hiệu ứng một lần
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    observeReveal();
  }

  /** Gọi lại sau khi chèn thêm thẻ mới vào DOM. */
  function observeReveal() {
    if (!revealObserver) {
      $$('.reveal:not(.is-visible)').forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    $$('.reveal:not(.is-visible)').forEach(function (el) { revealObserver.observe(el); });
  }

  /* ======================================================================
   * 4. HEADER & NÚT LÊN ĐẦU TRANG
   * Menu mobile do component Offcanvas của Bootstrap lo, không cần code thêm.
   * ====================================================================== */

  function initHeader() {
    /* --- Tự đánh dấu mục menu của trang đang xem --- */
    var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    $$('#mainNavLinks .nav-link, .offcanvas-body .list-group-item').forEach(function (a) {
      var target = (a.getAttribute('href') || '').split('?')[0].split('/').pop().toLowerCase();
      if (target && target === here) {
        a.classList.add('active');
        a.classList.add('bg-primary');
        if (a.classList.contains('text-white') && !a.classList.contains('list-group-item')) {
           // Desktop nav already has styling for active but we can add more if needed
        }
        a.setAttribute('aria-current', 'page');
      }
    });

    /* --- Bấm vào một mục menu thì đóng ngăn kéo offcanvas --- */
    var oc = $('#mainNav');
    if (oc) {
      $$('.nav-link', oc).forEach(function (a) {
        a.addEventListener('click', function () {
          var inst = bootstrap.Offcanvas.getInstance(oc);
          if (inst) inst.hide();
        });
      });
    }

    /* --- Navbar thu gọn khi cuộn xuống --- */
    var nav = $('.navbar');
    if (nav) {
      var onScroll = function () {
        nav.classList.toggle('is-scrolled', window.scrollY > 20);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  function initToTop() {
    var btn = $('.to-top');
    if (!btn) return;

    window.addEventListener('scroll', function () {
      btn.classList.toggle('is-shown', window.scrollY > 420);
    }, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ======================================================================
   * 5. MODAL XEM NHANH — dùng component Modal của Bootstrap
   * ====================================================================== */

  /**
   * Bắt sự kiện bấm "Xem nhanh" ở cấp document.
   * Dùng ủy quyền sự kiện nên thẻ sản phẩm chèn sau vẫn hoạt động.
   */
  function initQuickView(getProduct) {
    var modalEl = $('#quickViewModal');
    if (!modalEl) return;
    var modal = new bootstrap.Modal(modalEl);

          document.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-quick]');
        if (!btn) return;
        var p = getProduct(btn.getAttribute('data-quick'));
        if (!p) return;
  
        $('#quickViewLabel', modalEl).textContent = p.title;

        // Build Image Gallery
        var galleryHtml = '';
        var images = [];
        
        // Parse gallery if it's a JSON string
        var parsedGallery = [];
        if (p.galleryParsed && p.galleryParsed.length > 0) { parsedGallery = p.galleryParsed; } else if (typeof p.gallery === 'string' && p.gallery.trim().startsWith('[')) {
            try {
                parsedGallery = JSON.parse(p.gallery);
            } catch (e) {
                console.error("Lỗi parse gallery:", e);
            }
        } else if (Array.isArray(p.gallery)) {
            parsedGallery = p.gallery;
        }

        if (parsedGallery && parsedGallery.length > 0) {
            images = parsedGallery;
        } else if (p.image) {
            images = [p.image];
        } else {
            images = [FALLBACK_IMG];
        }

        if (images.length === 1) {
            galleryHtml = '<div class="product-media border rounded"><img src="' + esc(images[0]) + '" alt="' + esc(p.title) + '" onerror="this.onerror=null;this.src=\'' + FALLBACK_IMG + '\'"></div>';
        } else {
            // Build Bootstrap Carousel
            var carouselId = 'carouselProduct' + p.id;
            var indicators = '<div class="carousel-indicators">';
            var inner = '<div class="carousel-inner rounded border">';
            
            for (var i = 0; i < images.length; i++) {
                var active = i === 0 ? 'active' : '';
                var activeAria = i === 0 ? 'aria-current="true"' : '';
                indicators += '<button type="button" data-bs-target="#' + carouselId + '" data-bs-slide-to="' + i + '" class="' + active + '" ' + activeAria + ' aria-label="Slide ' + (i+1) + '"></button>';
                inner += '<div class="carousel-item ' + active + '"><img src="' + esc(images[i]) + '" class="d-block w-100" style="object-fit: contain; aspect-ratio: 1/1;" alt="Hình ' + (i+1) + '" onerror="this.onerror=null;this.src=\'' + FALLBACK_IMG + '\'"></div>';
            }
            indicators += '</div>';
            inner += '</div>';
            
            var controls = '<button class="carousel-control-prev" type="button" data-bs-target="#' + carouselId + '" data-bs-slide="prev"><span class="carousel-control-prev-icon bg-dark rounded-circle" style="padding: 1.5rem" aria-hidden="true"></span><span class="visually-hidden">Trước</span></button>' +
                           '<button class="carousel-control-next" type="button" data-bs-target="#' + carouselId + '" data-bs-slide="next"><span class="carousel-control-next-icon bg-dark rounded-circle" style="padding: 1.5rem" aria-hidden="true"></span><span class="visually-hidden">Sau</span></button>';
            
            galleryHtml = '<div id="' + carouselId + '" class="carousel slide" data-bs-ride="carousel">' + indicators + inner + controls + '</div>';
        }

        $('#quickViewBody', modalEl).innerHTML =
          '<div class="row g-4">' +
            '<div class="col-sm-5">' +
              galleryHtml +
            '</div>' +
            '<div class="col-sm-7">' +
              '<span class="badge rounded-pill bg-primary-subtle text-primary-emphasis mb-2">' +
                esc(p.categoryName) + '</span>' +
              '<div class="mb-2">' + starsHTML(p.rating) + '</div>' +
              '<p class="fw-bold text-danger mb-0" style="font-size:1.6rem">' +
                formatPrice(p.price) + '</p>' +
              '<p class="small text-body-tertiary">' +
                'Giá tham khảo cho một đơn vị. Liên hệ để được báo giá sỉ lớn.</p>' +
              (function() {
              var specs = { text: p.description || '', thickness: p.thickness || '', weight: p.weight || '', length: p.length || '', adhesion: p.adhesion || '', application: p.application || '' };
              var html = '';
              if (specs.text) {
                html += '<p class="small border-top pt-3" style="white-space:pre-wrap">' + esc(specs.text) + '</p>';
              }
              html += '<dl class="row row-cols-1 small border-top mb-3 pt-3">';
              html += specRow('Mã sản phẩm', p.id);
              html += specRow('Danh mục', p.categoryName);
              if (specs.thickness) html += specRow('Độ dày màng (mic)', specs.thickness);
              if (specs.weight) html += specRow('Trọng lượng (kg/cây)', specs.weight);
              if (specs.length) html += specRow('Chiều dài (yard)', specs.length);
              if (specs.adhesion) html += specRow('Độ bám dính', specs.adhesion);
              if (specs.application) html += specRow('Ứng dụng', specs.application);
              html += specRow('Đặt hàng tối thiểu', p.moq || '-');
              html += specRow('Tình trạng', p.inStock ? 'Còn hàng' : 'Hết hàng');
              html += '</dl>';
              return html;
            })() +
            
            // Lấy danh sách variants giống trong productCardHTML
            (function(){
              var variants = [];
              try { variants = p.variants ? (typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants) : []; } catch(e){}
              var variantOptions = '';
              if (variants && variants.length > 0) {
                variants.forEach(function(v) { 
                  variantOptions += '<option value="' + esc(v.id || v.name) + '">' + esc(v.name) + (v.price ? ' - ' + formatPrice(v.price) : '') + '</option>'; 
                });
              } else {
                variantOptions = '<option value="default">Mặc định</option>';
              }
              return '<div class="mb-3">' +
                       '<label class="form-label small fw-bold">Chọn phân loại:</label>' +
                       '<select class="form-select form-select-sm variant-select" id="modal-variant-' + esc(p.id) + '" style="border-color: var(--brand); color: var(--brand);">' +
                         variantOptions +
                       '</select>' +
                     '</div>';
            })() +
            
            '<div class="d-flex flex-column gap-2 mt-3">' +
              '<button class="btn btn-primary w-100 fw-bold" onclick="CartManager.add(' + esc(p.id) + ', document.getElementById(\'modal-variant-' + esc(p.id) + '\').value); bootstrap.Modal.getInstance(document.getElementById(\'quickViewModal\')).hide();">' +
                '<i class="bi bi-cart-plus me-1"></i>Thêm vào giỏ hàng' +
              '</button>' +
              '<a class="btn w-100 text-white" style="background-color: #0068ff" href="' + (window.__SETTINGS_MAP__ && window.__SETTINGS_MAP__.zalo_link ? window.__SETTINGS_MAP__.zalo_link : '#') + '" target="_blank">' +
                '<i class="bi bi-chat-dots me-1"></i>Chat Zalo tư vấn thêm</a>' +
              '<a class="btn btn-outline-secondary w-100" href="tel:' + (window.__SETTINGS_MAP__ && window.__SETTINGS_MAP__.hotline1 ? window.__SETTINGS_MAP__.hotline1.replace(/\s+/g, '') : '') + '">' +
                '<i class="bi bi-telephone-fill me-1"></i>Gọi Hotline</a>' +
            '</div>' +
          '</div>' +
        '</div>';

      modal.show();
    });
  }

  function specRow(label, value) {
    return '<div class="d-flex justify-content-between gap-3 py-2 border-bottom">' +
             '<dt class="fw-normal text-body-tertiary">' + esc(label) + '</dt>' +
             '<dd class="mb-0 fw-semibold text-end">' + esc(value) + '</dd>' +
           '</div>';
  }

  /* ======================================================================
   * 6. TRANG CHỦ
   * ====================================================================== */

  function initHome(data) {
    /* --- Thẻ danh mục (D2C Grid) --- */
    var catWrap = $('#catGrid');
    if (catWrap) {
      // Sort categories by product count, descending
      var sortedCats = data.categories.slice().sort(function(a, b) {
        return b.count - a.count;
      });
      
      // Limit to top 6
      var topCats = sortedCats.slice(0, 6);
      
      // Show "More" button if there are more than 6 categories
      var btnMore = $('#catGridMore');
      if (btnMore) {
        btnMore.style.display = sortedCats.length > 6 ? 'block' : 'none';
      }

      var html = '';
      topCats.forEach(function(c) {
        // Fallback to first product image in category if category has no image
        var sampleProd = data.products.filter(function(p) { return p.categoryId === c.id; })[0];
        var bgImg = c.image || (sampleProd && sampleProd.image) || 'images/logo.webp';
        
        html += '<div class="col-6 col-md-4 col-lg-4">' +
                  '<a href="products.html?cat=' + esc(c.id) + '" class="text-decoration-none d-block position-relative overflow-hidden rounded-4 cat-d2c-card" style="aspect-ratio: 4/3; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">' +
                    // Background Image with zoom transition
                    '<div class="cat-d2c-bg" style="position:absolute; inset:0; background-image:url(\'' + esc(bgImg) + '\'); background-size:cover; background-position:center; transition: transform 0.5s ease;"></div>' +
                    // Gradient overlay
                    '<div style="position:absolute; inset:0; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 60%); pointer-events: none;"></div>' +
                    // Text content
                    '<div class="position-absolute bottom-0 start-0 w-100 p-3 text-white d-flex justify-content-between align-items-end" style="pointer-events: none;">' +
                      '<div>' +
                        '<h3 class="fs-6 fw-bold mb-1 text-uppercase text-truncate" style="max-width: 150px;">' + esc(c.name) + '</h3>' +
                        '<span class="small opacity-75">' + c.count + ' sản phẩm</span>' +
                      '</div>' +
                      '<div class="text-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 32px; height: 32px; background-color: var(--brand);">' +
                        '<i class="bi bi-arrow-right"></i>' +
                      '</div>' +
                    '</div>' +
                  '</a>' +
                '</div>';
      });
      
      // Inject CSS once for the hover effect
      if (!document.getElementById('cat-d2c-style')) {
        var style = document.createElement('style');
        style.id = 'cat-d2c-style';
        style.innerHTML = '.cat-d2c-card:hover .cat-d2c-bg { transform: scale(1.1); }';
        document.head.appendChild(style);
      }

      catWrap.innerHTML = html;
    }

    /* --- Sản phẩm mới nhất --- */
    var grid = $('#latestGrid');
    if (grid) {
      var latest = data.products.slice().sort(byNewest).slice(0, HOME_LATEST);
      grid.innerHTML = latest.length
        ? latest.map(function (p, i) { return productCardHTML(p, i < 4); }).join('')
        : stateHTML('Chưa có sản phẩm', 'Danh sách sản phẩm đang được cập nhật.');
      observeReveal();
    }

    /* --- Carousel: nạp từ Supabase (bảng carousel_slide) --- */
    loadSlides().then(function(slides) {
      if (!slides || slides.length === 0) {
        // Bảng tồn tại nhưng chưa có dữ liệu → dùng fallback danh mục
        renderCarouselFallback(data);
      } else {
        renderCarousel(slides, data.products);
      }
    })['catch'](function(err) {
      console.warn('Không nạp được carousel_slide, dùng fallback danh mục:', err);
      renderCarouselFallback(data);
    });
  }

  /**
   * Nạp danh sách slides từ bảng carousel_slide trên Supabase.
   * Chỉ lấy slide đang bật (is_active = true), sắp xếp theo sort_order.
   */
  function loadSlides() {
    if (typeof supabaseClient === 'undefined') {
      return Promise.reject(new Error('supabaseClient chưa khởi tạo'));
    }
    return supabaseClient
      .from('carousel_slide')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(function(res) {
        if (res.error) throw res.error;
        return res.data || [];
      });
  }

  /**
   * Vẽ carousel dựa trên dữ liệu từ bảng carousel_slide.
   * - Nếu slide có image_file → dùng images/{image_file}
   * - Nếu slide có category_id → lấy ảnh sản phẩm đầu tiên của danh mục đó
   * - Fallback: ảnh SVG nội tuyến
   */
  function renderCarousel(slides, products) {
    var indicatorsEl = $('#heroCarouselIndicators');
    var innerEl      = $('#heroCarouselInner');
    if (!indicatorsEl || !innerEl) return;

    if (!slides || slides.length === 0) {
      return;
    }

    var indicatorsHtml = '';
    var innerHtml      = '';

    slides.forEach(function(s, i) {
      var activeClass = i === 0 ? 'active' : '';
      var ariaCurrent = i === 0 ? ' aria-current="true"' : '';

      indicatorsHtml +=
        '<button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="' + i + '"' +
        ' class="' + activeClass + '"' + ariaCurrent + ' aria-label="Slide ' + (i + 1) + '"></button>';

      var imgSrc = FALLBACK_IMG;
      if (s.image_file) {
        imgSrc = 'images/' + s.image_file;
      } else if (s.category_id) {
        var sample = products.filter(function(p) { return p.categoryId === s.category_id; })[0];
        if (sample && sample.image) imgSrc = sample.image;
      }

      var btn1 = '';
      if (s.btn1_text && s.btn1_url) {
        btn1 = '<a class="btn btn-danger text-white rounded-pill px-4 fw-bold text-uppercase" href="' + esc(s.btn1_url) + '">' + esc(s.btn1_text) + '</a>';
      } else {
        btn1 = '<a class="btn btn-danger text-white rounded-pill px-4 fw-bold text-uppercase" href="contact.html">NHẬN BÁO GIÁ SỈ</a>';
      }

      var btn2 = '';
      if (s.btn2_text && s.btn2_url) {
        btn2 = '<a class="btn btn-outline-light bg-white text-dark rounded-pill px-4 fw-bold text-uppercase border-0" href="' + esc(s.btn2_url) + '">' + esc(s.btn2_text) + '</a>';
      } else {
        btn2 = '<a class="btn btn-outline-light bg-white text-dark rounded-pill px-4 fw-bold text-uppercase border-0" href="products.html">XEM SẢN PHẨM</a>';
      }

      innerHtml +=
        '<div class="carousel-item ' + activeClass + '">' +
          '<div class="hero-slide d-flex align-items-center justify-content-center text-center" style="background-image: url(\'' + esc(imgSrc) + '\'); background-size: cover; background-position: center; min-height: 400px; position: relative;">' +
            '<div style="position: absolute; inset: 0; background: rgba(0,0,0,0.3);"></div>' +
            '<div class="container slide-content" style="z-index: 2;">' +
              '<h2 class="mb-4 text-white fw-bold text-uppercase" style="text-shadow: 0 2px 4px rgba(0,0,0,0.5); font-size: clamp(2rem, 5vw, 4rem);">' + esc(s.title || 'GIẢI PHÁP ĐÓNG GÓI CHUYÊN NGHIỆP') + '</h2>' +
              '<div class="d-flex flex-wrap justify-content-center gap-3">' +
                btn1 + btn2 +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    });

    indicatorsEl.innerHTML = indicatorsHtml;
    innerEl.innerHTML      = innerHtml;
    reinitCarousel();
  }


  /**
   * Fallback: nếu bảng carousel_slide chưa tồn tại hoặc lỗi kết nối,
   * dùng lại danh mục hiện có để dựng carousel (hành vi cũ).
   * Nếu HTML đã có slides tĩnh với data-cat → chỉ điền ảnh vào,
   * rồi mới rebuild nếu số slides không khớp.
   */
  function renderCarouselFallback(data) {
    var indicatorsEl = $('#heroCarouselIndicators');
    var innerEl      = $('#heroCarouselInner');
    if (!indicatorsEl || !innerEl) return;

    /* 1. Điền ảnh vào các slides tĩnh đã có trong HTML (data-cat) */
    $$('.carousel-item[data-cat]').forEach(function(slide) {
      var catId  = Number(slide.getAttribute('data-cat'));
      var sample = data.products.filter(function(p) { return p.categoryId === catId; })[0];
      var img    = slide.querySelector('.slide-bg');
      if (img && sample && sample.image) {
        img.onerror = function() { this.onerror = null; this.src = FALLBACK_IMG; };
        img.src = sample.image;
      }
    });

    /* 2. Rebuild đầy đủ nếu danh mục có dữ liệu khác slides tĩnh */
    var activeCats = data.categories.filter(function(c) { return c.count > 0; }).slice(0, 4);
    if (!activeCats.length) { reinitCarousel(); return; }

    var staticCatIds = Array.prototype.slice.call($$('.carousel-item[data-cat]'))
                           .map(function(el) { return Number(el.getAttribute('data-cat')); });
    var needRebuild  = activeCats.some(function(c) { return staticCatIds.indexOf(c.id) === -1; });

    if (!needRebuild) { reinitCarousel(); return; }

    /* Rebuild hoàn toàn khi danh mục thực tế khác slides tĩnh */
    var indicatorsHtml = '';
    var innerHtml      = '';

    activeCats.forEach(function(c, i) {
      var activeClass = i === 0 ? 'active' : '';
      var ariaCurrent = i === 0 ? ' aria-current="true"' : '';

      indicatorsHtml +=
        '<button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="' + i + '"' +
        ' class="' + activeClass + '"' + ariaCurrent + ' aria-label="Slide ' + (i + 1) + '"></button>';

      var sample = data.products.filter(function(p) { return p.categoryId === c.id; })[0];
      var imgSrc = (sample && sample.image) ? sample.image : FALLBACK_IMG;

      innerHtml +=
        '<div class="carousel-item ' + activeClass + '" data-cat="' + c.id + '">' +
          '<div class="hero-slide">' +
            '<img class="slide-bg" src="' + esc(imgSrc) + '" alt="' + esc(c.name) + '"' +
            ' onerror="this.onerror=null;this.src=\'' + FALLBACK_IMG + '\'">' +
            '<div class="container slide-content">' +
              '<span class="badge rounded-pill bg-white bg-opacity-25 border border-white' +
              ' border-opacity-50 mb-3 text-uppercase">' + esc(c.name) + '</span>' +
              '<h2 class="mb-3">' + esc(c.description || c.name) + '</h2>' +
              '<div class="d-flex flex-wrap gap-2">' +
                '<a class="btn btn-primary rounded-pill px-4" href="products.html?cat=' + c.id + '">Xem sản phẩm</a>' +
                '<a class="btn btn-warning text-dark fw-bold rounded-pill px-4" href="contact.html">Nhận báo giá</a>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    });

    indicatorsEl.innerHTML = indicatorsHtml;
    innerEl.innerHTML      = innerHtml;
    reinitCarousel();
  }


  /**
   * Dispose Bootstrap Carousel instance cũ (đã khởi tạo khi inner còn rỗng)
   * rồi tạo lại để nhận đúng các .carousel-item vừa được điền vào.
   */
  function reinitCarousel() {
    var el = $('#heroCarousel');
    if (!el || typeof bootstrap === 'undefined') return;
    // Xoá instance cũ nếu có
    var old = bootstrap.Carousel.getInstance(el);
    if (old) old.dispose();
    // Tạo mới với cấu hình gốc
    new bootstrap.Carousel(el, { ride: 'carousel', interval: 5000, touch: true });
  }

  /* ======================================================================
   * 7. TRANG SẢN PHẨM
   * ====================================================================== */

  function initProducts(data) {
    var grid = $('#productGrid');
    if (!grid) return;

    var chipsWrap = $('#catChips');
    var searchInp = $('#searchInput');
    var sortSel   = $('#sortSelect');
    var countEl   = $('#resultCount');
    var moreWrap  = $('#loadMoreWrap');
    var moreBtn   = $('#loadMoreBtn');

    // Trạng thái bộ lọc hiện tại
    var state = { cat: 'all', q: '', sort: 'newest', shown: PAGE_SIZE };

    /* --- Đọc bộ lọc từ URL (?cat=2) để link chia sẻ / F5 vẫn giữ nguyên --- */
    var params = new URLSearchParams(location.search);
    var catParam = params.get('cat');
    if (catParam && data.categories.some(function (c) { return String(c.id) === catParam; })) {
      state.cat = catParam;
    }
    var qParam = params.get('q');
    if (qParam) {
      state.q = qParam;
      if (searchInp) searchInp.value = qParam;
    }

    /* --- Dựng thanh chip danh mục --- */
    if (chipsWrap) {
      var chips = [{ id: 'all', name: 'Tất cả', count: data.products.length }]
        .concat(data.categories.map(function (c) {
          return { id: String(c.id), name: c.name, count: c.count };
        }));

      chipsWrap.innerHTML = chips.map(function (c) {
        return '<button type="button" class="btn btn-outline-secondary chip" ' +
               'data-cat="' + esc(c.id) + '" ' +
               'aria-pressed="' + (String(c.id) === state.cat) + '">' +
               esc(c.name) + ' <span class="n">(' + c.count + ')</span></button>';
      }).join('');

      chipsWrap.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (!chip) return;
        state.cat = chip.getAttribute('data-cat');
        state.shown = PAGE_SIZE;
        $$('.chip', chipsWrap).forEach(function (c) {
          c.setAttribute('aria-pressed', String(c === chip));
        });
        syncURL();
        render();
      });
    }

    /* --- Ô tìm kiếm (chờ người dùng gõ xong mới lọc) --- */
    if (searchInp) {
      searchInp.addEventListener('input', debounce(function () {
        state.q = searchInp.value.trim();
        state.shown = PAGE_SIZE;
        syncURL();
        render();
      }, 250));
    }

    /* --- Sắp xếp --- */
    if (sortSel) {
      sortSel.addEventListener('change', function () {
        state.sort = sortSel.value;
        state.shown = PAGE_SIZE;
        render();
      });
    }

    /* --- Xem thêm --- */
    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        state.shown += PAGE_SIZE;
        render();
      });
    }

    /**
     * Ghi bộ lọc lên thanh địa chỉ mà không tải lại trang.
     * Nhờ vậy F5 hoặc gửi link cho người khác vẫn giữ đúng kết quả đang xem.
     */
    function syncURL() {
      var p = new URLSearchParams();
      if (state.cat !== 'all') p.set('cat', state.cat);
      if (state.q) p.set('q', state.q);
      var qs = p.toString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
    }

    /** Áp dụng lọc + sắp xếp, trả về danh sách kết quả. */
    function apply() {
      var list = data.products.slice();

      if (state.cat !== 'all') {
        list = list.filter(function (p) { return String(p.categoryId) === state.cat; });
      }

      if (state.q) {
        var key = deaccent(state.q);
        list = list.filter(function (p) {
          return p.search.indexOf(key) !== -1 ||
                 deaccent(p.categoryName).indexOf(key) !== -1;
        });
      }

      switch (state.sort) {
        case 'price-asc':
          list.sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
          break;
        case 'price-desc':
          list.sort(function (a, b) { return (b.price || 0) - (a.price || 0); });
          break;
        case 'rating':
          // Sản phẩm chưa có đánh giá (null) luôn xếp cuối danh sách
          list.sort(function (a, b) {
            if (a.rating === null && b.rating === null) return byNewest(a, b);
            if (a.rating === null) return 1;
            if (b.rating === null) return -1;
            return b.rating - a.rating;
          });
          break;
        default:
          list.sort(byNewest);
      }
      return list;
    }

    /** Đưa trạng thái về mặc định (dùng cho nút "Xóa bộ lọc"). */
    function resetFilters() {
      state.cat = 'all';
      state.q = '';
      state.shown = PAGE_SIZE;
      if (searchInp) searchInp.value = '';
      if (chipsWrap) {
        $$('.chip', chipsWrap).forEach(function (c) {
          c.setAttribute('aria-pressed', String(c.getAttribute('data-cat') === 'all'));
        });
      }
      syncURL();
      render();
    }

    function render() {
      var list  = apply();
      var slice = list.slice(0, state.shown);

      if (list.length === 0) {
        grid.innerHTML = stateHTML(
          'Không tìm thấy sản phẩm nào',
          'Thử đổi từ khóa khác hoặc chọn lại danh mục.',
          '<button type="button" class="btn btn-outline-primary" id="resetFilter">' +
          '<i class="bi bi-x-circle me-1"></i>Xóa bộ lọc</button>'
        );
        // Khối trạng thái vừa được chèn lại nên phải gắn sự kiện ở đây
        var reset = $('#resetFilter');
        if (reset) reset.addEventListener('click', resetFilters);
      } else {
        grid.innerHTML = slice.map(function (p) { return productCardHTML(p, false); }).join('');
        observeReveal();
      }

      if (countEl) {
        countEl.innerHTML = list.length
          ? 'Hiển thị <strong class="text-brand">' + slice.length + '</strong> trên ' +
            list.length + ' sản phẩm'
          : '';
      }
      if (moreWrap) moreWrap.hidden = slice.length >= list.length;
    }

    render();
  }

  /* ======================================================================
   * 8. TRANG LIÊN HỆ — FORM GỬI FEEDBACK
   * Dùng lớp .is-invalid / .invalid-feedback của Bootstrap để báo lỗi.
   * ====================================================================== */

  function initContact() {
    var form = $('#contactForm');
    if (!form) return;

    /* Quy tắc kiểm tra cho từng ô nhập. */
    var rules = {
      name: {
        test: function (v) { return v.trim().length >= 2; },
        msg: 'Vui lòng nhập họ tên (ít nhất 2 ký tự).'
      },
      email: {
        test: function (v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()); },
        msg: 'Email chưa đúng định dạng, ví dụ: ten@congty.com'
      },
      phone: {
        // Số điện thoại Việt Nam: bắt đầu bằng 0 hoặc +84, tổng 10–11 chữ số
        test: function (v) { return /^(0|\+84)\d{9,10}$/.test(v.replace(/[\s.\-()]/g, '')); },
        msg: 'Số điện thoại chưa hợp lệ, ví dụ: 0901234567'
      },
      subject: {
        test: function (v) { return v.trim() !== ''; },
        msg: 'Vui lòng chọn chủ đề liên hệ.'
      },
      message: {
        test: function (v) { return v.trim().length >= 10; },
        msg: 'Nội dung cần ít nhất 10 ký tự để chúng tôi hỗ trợ chính xác.'
      }
    };

    /** Hiện / ẩn lỗi của một ô nhập bằng lớp của Bootstrap. */
    function setError(field, msg) {
      var box = $('#err-' + field.name);
      if (msg) {
        field.classList.add('is-invalid');
        field.setAttribute('aria-invalid', 'true');
        if (box) box.textContent = msg;
      } else {
        field.classList.remove('is-invalid');
        field.removeAttribute('aria-invalid');
        if (box) box.textContent = '';
      }
    }

    function validateField(field) {
      var rule = rules[field.name];
      if (!rule) return true;
      var ok = rule.test(field.value);
      setError(field, ok ? '' : rule.msg);
      return ok;
    }

    /* Kiểm tra lại ngay khi người dùng sửa ô đang báo lỗi. */
    Object.keys(rules).forEach(function (name) {
      var field = form.elements[name];
      if (!field) return;
      field.addEventListener('blur', function () { validateField(field); });
      field.addEventListener('input', function () {
        if (field.classList.contains('is-invalid')) validateField(field);
      });
    });

    form.addEventListener('submit', function (e) {
      // Tự kiểm tra bằng JS thay vì dựa vào thông báo mặc định của trình duyệt
      e.preventDefault();

      var firstBad = null;
      Object.keys(rules).forEach(function (name) {
        var field = form.elements[name];
        if (field && !validateField(field) && !firstBad) firstBad = field;
      });

      if (firstBad) {
        firstBad.focus();
        toast('Vui lòng kiểm tra lại các ô còn thiếu.', 'err');
        return;
      }
      // Lấy nút submit để hiển thị trạng thái loading
      var btn = form.querySelector('button[type="submit"]');
      var originalBtnText = btn ? btn.textContent : 'Gửi liên hệ';
      
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Đang gửi...';
      }

      var record = {
        fullname:   form.elements.name.value.trim(),
        email:      form.elements.email.value.trim(),
        phone:      form.elements.phone.value.trim(),
        company:    form.company.value.trim() || null,
        subject:    form.elements.subject.value,
        quantity:   form.quantity.value.trim() || null,
        message:    form.elements.message.value.trim(),
        created_at: new Date().toISOString()
      };

      if (typeof supabaseClient === 'undefined') {
        toast('Lỗi hệ thống: Chưa kết nối được máy chủ.', 'err');
        if (btn) {
          btn.disabled = false;
          btn.textContent = originalBtnText;
        }
        return;
      }

      supabaseClient.from('feedback').insert([record]).then(function(res) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = originalBtnText;
        }

        if (res.error) {
          console.error(res.error);
          toast('Đã có lỗi xảy ra. Vui lòng thử lại sau.', 'err');
        } else {
          form.reset();
          Object.keys(rules).forEach(function (name) {
            var field = form.elements[name];
            if (field) setError(field, '');
          });
          toast('Cảm ơn ' + record.fullname + '! Chúng tôi sẽ phản hồi trong 24 giờ.', 'ok');
        }
      });
    });
  }

  /* ======================================================================
   * 9. KHỞI CHẠY
   * ====================================================================== */

  function initFloatingWidgets() {
    var phone = (window.__SETTINGS_MAP__ && window.__SETTINGS_MAP__.hotline1)
      ? window.__SETTINGS_MAP__.hotline1.replace(/\s+/g, '')
      : '02838123456';
    var zalo = (window.__SETTINGS_MAP__ && window.__SETTINGS_MAP__.zalo_link)
      ? window.__SETTINGS_MAP__.zalo_link
      : 'https://zalo.me/0901234567';

    var div = document.createElement('div');
    div.className = 'floating-widget';
    div.innerHTML = 
      '<a href="tel:' + phone + '" class="float-btn float-phone" aria-label="Gọi điện thoại" data-setting-href="hotline1" data-setting-prefix="tel:">' +
        '<i class="bi bi-telephone-fill"></i>' +
        '<span class="tooltip-text">Gọi Hotline</span>' +
      '</a>' +
      '<a href="' + zalo + '" target="_blank" class="float-btn float-zalo" aria-label="Chat Zalo" data-setting-href="zalo_link">' +
        'Zalo' +
        '<span class="tooltip-text">Chat Zalo</span>' +
      '</a>';
    document.body.appendChild(div);
  }


  function loadSettings() {
    if (typeof window.supabaseClient === 'undefined') return;
    window.supabaseClient.from('settings').select('*')
      .then(function(res) {
        if (res.error) {
          console.error('Lỗi tải settings:', res.error);
          return;
        }
        window.__SETTINGS_MAP__ = {};
        var settingsMap = window.__SETTINGS_MAP__;
        res.data.forEach(function(row) {
          settingsMap[row.key] = row.value;
        });

        var textEls = document.querySelectorAll('[data-setting-text]');
        for (var i = 0; i < textEls.length; i++) {
          var key = textEls[i].getAttribute('data-setting-text');
          if (settingsMap[key]) {
            textEls[i].textContent = settingsMap[key];
          }
        }

        var hrefEls = document.querySelectorAll('[data-setting-href]');
        for (var j = 0; j < hrefEls.length; j++) {
          var key = hrefEls[j].getAttribute('data-setting-href');
          var prefix = hrefEls[j].getAttribute('data-setting-prefix') || '';
          if (settingsMap[key]) {
             var val = settingsMap[key];
             if (prefix === 'tel:') {
                val = val.replace(/\s+/g, '');
             }
             hrefEls[j].setAttribute('href', prefix + val);
          }
        }
      });
  }

  /* ======================================================================
   * CART MANAGER (Phase 5)
   * ====================================================================== */
  var CartManager = window.CartManager = (function() {
    var SESSION_KEY = 'vgp_session_id';
    var CART_KEY = 'vgp_cart_items';
    
    var sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem(SESSION_KEY, sessionId);
    }

    var items = [];
    try {
      items = JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch(e) { items = []; }

    var cartId = null;

    function saveLocal() {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
      updateBadge();
    }

    function updateBadge() {
      var badges = document.querySelectorAll('#cartCount');
      var count = items.reduce(function(sum, it) { return sum + it.quantity; }, 0);
      badges.forEach(function(b) { b.textContent = count; });
    }

    function syncFromSupabase() {
      if (typeof supabaseClient === 'undefined') return;
      
      supabaseClient.from('cart').select('id').eq('session_id', sessionId).maybeSingle()
        .then(function(res) {
          if (res.data) {
            cartId = res.data.id;
            loadItems();
          } else {
            supabaseClient.from('cart').insert({ session_id: sessionId }).select('id').single()
              .then(function(res2) {
                if (res2.data) cartId = res2.data.id;
              });
          }
        });
    }

    function loadItems() {
      if (!cartId || typeof supabaseClient === 'undefined') return;
      supabaseClient.from('cart_item').select('*').eq('cart_id', cartId)
        .then(function(res) {
          if (res.data && res.data.length > 0) {
            items = res.data;
            saveLocal();
          }
        });
    }

    function addToCart(productId, variantId, qty) {
      qty = qty || 1;
      var existing = items.filter(function(it) { 
        return it.product_id == productId && it.variant_id == variantId; 
      })[0];
      
      if (existing) {
        existing.quantity += qty;
      } else {
        items.push({ product_id: productId, variant_id: variantId, quantity: qty });
      }
      saveLocal();
      toast('Đã thêm sản phẩm vào giỏ hàng!', 'success');

      if (cartId && typeof supabaseClient !== 'undefined') {
        if (existing) {
          supabaseClient.from('cart_item').update({ quantity: existing.quantity })
            .eq('cart_id', cartId).eq('product_id', productId).eq('variant_id', variantId)
            .then(function(){});
        } else {
          supabaseClient.from('cart_item').insert({
            cart_id: cartId,
            product_id: productId,
            variant_id: variantId,
            quantity: qty
          }).then(function(){});
        }
      }
    }

    return {
      init: function() {
        updateBadge();
        setTimeout(syncFromSupabase, 1000);
      },
      add: addToCart,
      updateQuantity: function(productId, variantId, qty) {
        var existing = items.filter(function(it) { return it.product_id == productId && it.variant_id == variantId; })[0];
        if (existing) {
          existing.quantity = parseInt(qty, 10);
          if (existing.quantity <= 0) {
            this.remove(productId, variantId);
            return;
          }
          saveLocal();
          if (cartId && typeof supabaseClient !== 'undefined') {
            supabaseClient.from('cart_item').update({ quantity: existing.quantity })
              .eq('cart_id', cartId).eq('product_id', productId).eq('variant_id', variantId)
              .then(function(){});
          }
        }
      },
      remove: function(productId, variantId) {
        items = items.filter(function(it) { return !(it.product_id == productId && it.variant_id == variantId); });
        saveLocal();
        if (cartId && typeof supabaseClient !== 'undefined') {
            supabaseClient.from('cart_item').delete()
              .eq('cart_id', cartId).eq('product_id', productId).eq('variant_id', variantId)
              .then(function(){});
        }
      },
      clear: function() {
        items = [];
        saveLocal();
        if (cartId && typeof supabaseClient !== 'undefined') {
            supabaseClient.from('cart_item').delete().eq('cart_id', cartId).then(function(){});
        }
      },
      getItems: function() { return items; },
      getSessionId: function() { return sessionId; }
    };
  })();

  function renderMegaMenu(data) {
    var megaMenuContainer = $('#megaMenuContent');
    if (!megaMenuContainer) return;

    if (!data.categories || data.categories.length === 0) {
      megaMenuContainer.innerHTML = '<div class="text-center text-muted py-3">Không có danh mục nào.</div>';
      return;
    }

    var html = '<div class="row g-0">';
    
    // Cột trái: Danh mục (25%)
    html += '<div class="col-12 col-md-3 border-end bg-white">';
    html += '<div class="list-group list-group-flush h-100 rounded-0 border-0" style="max-height: 450px; overflow-y: auto;">';
    data.categories.forEach(function(cat, index) {
      var activeClass = index === 0 ? ' bg-light text-primary fw-bold' : '';
      html += '<a href="products.html?cat=' + esc(cat.id) + '" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center mega-cat-item border-0' + activeClass + '" data-cat-id="' + esc(cat.id) + '">';
      html += '<span>' + esc(cat.name) + '</span>';
      html += '<i class="bi bi-chevron-right small text-muted"></i>';
      html += '</a>';
    });
    html += '</div>';
    html += '</div>'; // End col-3

    // Cột phải: Sản phẩm nổi bật (75%)
    html += '<div class="col-12 col-md-9 p-4 bg-white rounded-bottom-end-3" style="min-height: 450px;">';
    html += '<div class="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">';
    html += '<h6 class="fw-bold mb-0 text-uppercase" id="megaCatTitle">' + esc(data.categories[0].name) + '</h6>';
    html += '<a href="products.html?cat=' + esc(data.categories[0].id) + '" class="small text-decoration-none text-primary" id="megaCatLink">Xem tất cả <i class="bi bi-arrow-right"></i></a>';
    html += '</div>';
    html += '<div class="row g-3" id="megaProductsList"></div>'; // Will be populated by JS
    html += '</div>'; // End col-9
    
    html += '</div>'; // End row
    
    megaMenuContainer.innerHTML = html;

    // Logic xử lý hover và hiển thị sản phẩm
    var catItems = $$('.mega-cat-item', megaMenuContainer);
    var productsList = $('#megaProductsList');
    var catTitle = $('#megaCatTitle');
    var catLink = $('#megaCatLink');

    function renderProductsForCat(catId) {
      var cat = data.categories.filter(function(c) { return String(c.id) === String(catId); })[0];
      if (cat) {
        catTitle.textContent = cat.name;
        catLink.setAttribute('href', 'products.html?cat=' + esc(cat.id));
      }

      var products = data.products.filter(function(p) { return String(p.categoryId) === String(catId); }).slice(0, 8); // Lấy 8 SP
      
      if (products.length === 0) {
        productsList.innerHTML = '<div class="col-12 text-muted small py-2">Đang cập nhật sản phẩm...</div>';
        return;
      }

      var phtml = '';
      products.forEach(function(p) {
        var img = p.image || FALLBACK_IMG;
        phtml += '<div class="col-6 col-lg-3">';
        phtml += '<a href="product-detail.html?id=' + esc(p.id) + '" class="text-decoration-none text-dark d-block border rounded p-2 text-center bg-white" onmouseover="this.classList.add(\'shadow-sm\', \'border-primary\')" onmouseout="this.classList.remove(\'shadow-sm\', \'border-primary\')" style="transition: all 0.2s ease;">';
        phtml += '<div class="bg-white rounded mb-2 d-flex align-items-center justify-content-center" style="aspect-ratio: 1;">';
        phtml += '<img src="' + esc(img) + '" alt="' + esc(p.title) + '" class="img-fluid object-fit-contain p-1" style="max-height: 100%;">';
        phtml += '</div>';
        phtml += '<div class="small fw-bold text-truncate" title="' + esc(p.title) + '">' + esc(p.title) + '</div>';
        if (p.price && p.price > 0) {
          phtml += '<div class="text-danger fw-bold small mt-1">' + formatPrice(p.price) + '</div>';
        } else {
          phtml += '<div class="text-warning fw-bold small mt-1">Giá sỉ</div>';
        }
        phtml += '</a></div>';
      });
      productsList.innerHTML = phtml;
    }

    if (data.categories.length > 0) {
      renderProductsForCat(data.categories[0].id);
    }

    catItems.forEach(function(item) {
      item.addEventListener('mouseenter', function() {
        catItems.forEach(function(i) { i.className = i.className.replace(' bg-light text-primary fw-bold', ''); });
        this.className += ' bg-light text-primary fw-bold';
        
        var catId = this.getAttribute('data-cat-id');
        renderProductsForCat(catId);
      });
    });
  }

  function initNewsBoard() {
    if (typeof supabaseClient === 'undefined') return;
    
    supabaseClient
      .from('notices')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(function(res) {
        if (res.error) {
          console.error('Lỗi nạp thông báo:', res.error);
          return;
        }
        
        var notice = res.data && res.data.length > 0 ? res.data[0] : null;
        if (!notice) return;
        
        var modalEl = $('#newsBoardModal');
        if (!modalEl) {
          var modalHtml = 
            '<div class="modal fade" id="newsBoardModal" tabindex="-1" aria-labelledby="newsBoardLabel" aria-hidden="true">' +
              '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">' +
                '<div class="modal-content border-0 shadow-lg">' +
                  '<div class="modal-header bg-brand-gradient text-white border-0">' +
                    '<h5 class="modal-title fs-5 fw-bold" id="newsBoardLabel">' +
                      '<i class="bi bi-megaphone-fill me-2 text-warning"></i>Thông báo từ VGP' +
                    '</h5>' +
                    '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Đóng"></button>' +
                  '</div>' +
                  '<div class="modal-body p-4" id="newsBoardBody"></div>' +
                  '<div class="modal-footer border-0 pt-0 pb-4 px-4 justify-content-center">' +
                    '<button type="button" class="btn btn-primary rounded-pill px-5" data-bs-dismiss="modal">Đã hiểu</button>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>';
          document.body.insertAdjacentHTML('beforeend', modalHtml);
          modalEl = $('#newsBoardModal');
        }
        
        var readNotices = [];
        try {
          readNotices = JSON.parse(localStorage.getItem('vgp_read_notices')) || [];
        } catch(e) {}
        
        var isUnread = readNotices.indexOf(notice.id) === -1;
        var btnNotice = $('#btnNotice');
        var noticeBadge = $('#noticeBadge');
        
        var bodyEl = $('#newsBoardBody', modalEl);
        if (bodyEl) {
          var html = '<h4 class="mb-3 text-primary fw-bold">' + esc(notice.title) + '</h4>';
          if (notice.content) html += '<div class="notice-content">' + notice.content + '</div>';
          bodyEl.innerHTML = html;
        }
        
        var bsModal = new bootstrap.Modal(modalEl);
        
        if (btnNotice) {
          if (isUnread && noticeBadge) noticeBadge.classList.remove('d-none');
          btnNotice.addEventListener('click', function(e) {
            e.preventDefault();
            bsModal.show();
          });
        }
        
        var page = document.body.getAttribute('data-page');
        if (page === 'home' && isUnread) {
          bsModal.show();
        }
        
        modalEl.addEventListener('hidden.bs.modal', function () {
          if (noticeBadge) noticeBadge.classList.add('d-none');
          if (readNotices.indexOf(notice.id) === -1) {
            readNotices.push(notice.id);
            if (readNotices.length > 20) readNotices.shift();
            localStorage.setItem('vgp_read_notices', JSON.stringify(readNotices));
          }
        });
      });
  }

  function boot() {
    CartManager.init();
    var page = document.body.getAttribute('data-page') || '';

    initHeader();
    initToTop();
    initReveal();
    initFloatingWidgets();
    loadSettings();
    initNewsBoard();

    // Trang liên hệ không cần dữ liệu sản phẩm cho body, nhưng cần cho Mega Menu
    if (page === 'contact') {
      initContact();
      // Không return ở đây nữa để tiếp tục loadData() cho Mega-Menu
    }

    // Hiện khung xương cá trong lúc chờ dữ liệu
    var latestGrid  = $('#latestGrid');
    var productGrid = $('#productGrid');
    if (latestGrid)  latestGrid.innerHTML  = skeletonHTML(HOME_LATEST);
    if (productGrid) productGrid.innerHTML = skeletonHTML(PAGE_SIZE);

    loadData().then(function (data) {
      // Ghi ra Console để mở F12 là biết ngay trang đang đọc từ đâu
      console.info('Dữ liệu tải từ Supabase (' +
        data.products.length + ' sản phẩm, ' + data.categories.length + ' danh mục).');

      // Tra về sản phẩm theo id cho modal xem nhanh
      var byId = {};
      data.products.forEach(function (p) { byId[p.id] = p; });
      initQuickView(function (id) { return byId[id]; });

      renderMegaMenu(data);

      if (page === 'home')     initHome(data);
      if (page === 'products') initProducts(data);
      if (page === 'cart')     initCartPage(data);
    })['catch'](function (err) {
      console.error('Lỗi nạp dữ liệu:', err);
      var msg = stateHTML(
        'Không tải được dữ liệu sản phẩm',
        'Không thể nạp dữ liệu từ máy chủ Supabase. Vui lòng kiểm tra lại kết nối mạng.'
      );
      if (latestGrid)  latestGrid.innerHTML  = msg;
      if (productGrid) productGrid.innerHTML = msg;
      toast('Không tải được dữ liệu sản phẩm.', 'err');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ======================================================================
   * TRANG GIỎ HÀNG (cart.html)
   * ====================================================================== */
  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function initCartPage(data) {
    var container = $('#cartItemsContainer');
    var form = $('#checkoutForm');
    var subtotalEl = $('#cartSubtotal');
    var totalEl = $('#cartTotal');
    var noticeEl = $('#quoteNotice');

    var byId = {};
    data.products.forEach(function (p) { byId[p.id] = p; });

    function renderCart() {
      var items = CartManager.getItems();
      if (items.length === 0) {
        container.innerHTML = '<div class="text-center py-5"><i class="bi bi-cart-x text-muted" style="font-size: 3rem;"></i><p class="mt-3 text-muted">Giỏ hàng trống.</p></div>';
        subtotalEl.textContent = '0 đ';
        totalEl.textContent = '0 đ';
        noticeEl.classList.add('d-none');
        return;
      }

      var html = '<ul class="list-group list-group-flush mb-3">';
      var total = 0;
      var hasZeroPrice = false;

      items.forEach(function(item) {
        var product = byId[item.product_id];
        if (!product) return;
        var price = parseFloat(product.price) || 0;
        if (price === 0) hasZeroPrice = true;
        total += price * item.quantity;
        
        var imgUrl = product.image || 'images/placeholder.webp';

        html += '<li class="list-group-item py-3 px-0 d-flex align-items-center gap-3 border-bottom">';
        html += '<img src="' + imgUrl + '" class="rounded border" style="width: 70px; height: 70px; object-fit: cover;">';
        html += '<div class="flex-grow-1">';
        html += '<h6 class="mb-1 text-truncate" style="max-width: 200px;">' + escapeHtml(product.name) + '</h6>';
        if (item.variant_id) {
          html += '<div class="small text-muted mb-2">Loại: ' + escapeHtml(item.variant_id) + '</div>';
        }
        if (price > 0) {
          html += '<div class="text-danger fw-bold">' + formatMoney(price) + '</div>';
        } else {
          html += '<div class="text-warning fw-bold small">Cần báo giá</div>';
        }
        html += '</div>';
        html += '<div class="d-flex align-items-center gap-2">';
        html += '<input type="number" class="form-control form-control-sm text-center cart-qty-input" style="width: 60px;" value="' + item.quantity + '" data-pid="' + product.id + '" data-vid="' + (item.variant_id || '') + '" min="1">';
        html += '<button type="button" class="btn btn-sm btn-outline-danger cart-remove-btn" data-pid="' + product.id + '" data-vid="' + (item.variant_id || '') + '"><i class="bi bi-trash"></i></button>';
        html += '</div>';
        html += '</li>';
      });

      html += '</ul>';
      container.innerHTML = html;
      subtotalEl.textContent = formatMoney(total);
      totalEl.textContent = formatMoney(total);
      
      if (hasZeroPrice) {
        noticeEl.classList.remove('d-none');
      } else {
        noticeEl.classList.add('d-none');
      }

      // Gắn sự kiện thay đổi số lượng và xóa
      document.querySelectorAll('.cart-qty-input').forEach(function(inp) {
        inp.addEventListener('change', function(e) {
          var pid = e.target.getAttribute('data-pid');
          var vid = e.target.getAttribute('data-vid');
          var qty = parseInt(e.target.value, 10);
          if (qty > 0) {
            CartManager.updateQuantity(pid, vid, qty);
            renderCart();
          } else {
            e.target.value = 1;
          }
        });
      });

      document.querySelectorAll('.cart-remove-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          var tgt = e.target.closest('button');
          var pid = tgt.getAttribute('data-pid');
          var vid = tgt.getAttribute('data-vid');
          CartManager.remove(pid, vid);
          renderCart();
        });
      });
    }

    // Render giỏ hàng lúc đầu
    renderCart();

    // Xử lý chốt đơn
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var items = CartManager.getItems();
        if (items.length === 0) {
          alert("Giỏ hàng đang trống!");
          return;
        }

        var btnSubmit = $('#btnSubmitOrder');
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang xử lý...';

        var cName = $('#cName').value.trim();
        var cPhone = $('#cPhone').value.trim();
        var cAddress = $('#cAddress').value.trim();
        var cNote = $('#cNote').value.trim();
        var totalAmount = 0;
        
        items.forEach(function(it) {
          var prod = byId[it.product_id];
          if(prod) {
            totalAmount += (parseFloat(prod.price) || 0) * it.quantity;
          }
        });

        // 1. Lưu order vào Supabase
        supabaseClient.from('orders').insert({
          customer_name: cName,
          customer_phone: cPhone,
          customer_address: cAddress,
          customer_note: cNote,
          total_amount: totalAmount,
          session_id: CartManager.getSessionId()
        }).select('id').single().then(function(resOrder) {
          if (resOrder.error) {
            console.error(resOrder.error);
            alert("Có lỗi xảy ra khi tạo đơn hàng. Hãy thử lại!");
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="bi bi-send-fill"></i> Đặt hàng qua Zalo';
            return;
          }

          var orderId = resOrder.data.id;
          
          // 2. Lưu order items
          var orderItemsData = items.map(function(it) {
            var prod = byId[it.product_id];
            return {
              order_id: orderId,
              product_id: it.product_id,
              variant_id: it.variant_id,
              quantity: it.quantity,
              price: prod ? (parseFloat(prod.price) || 0) : 0
            };
          });

          supabaseClient.from('order_items').insert(orderItemsData).then(function(resItems) {
            // 3. Tạo mẫu tin nhắn Zalo
            var zaloPhone = "02838123456"; // Mặc định nếu cần, có thể thay đổi
            var hotlineEl = document.querySelector('[data-setting-text="hotline1"]');
            if (hotlineEl) zaloPhone = hotlineEl.textContent.replace(/[^0-9]/g, '');

            var msg = "Xin chào VŨ GIA PHÁT,\n\nTôi muốn đặt đơn hàng mã #" + orderId + ".\n";
            msg += "- Tên: " + cName + "\n";
            msg += "- SĐT: " + cPhone + "\n";
            if (cAddress) msg += "- Địa chỉ: " + cAddress + "\n";
            if (cNote) msg += "- Ghi chú: " + cNote + "\n\n";
            msg += "Chi tiết giỏ hàng:\n";
            items.forEach(function(it) {
              var prod = byId[it.product_id];
              var pName = prod ? prod.name : ("SP ID: " + it.product_id);
              msg += "+ " + pName + (it.variant_id ? " (" + it.variant_id + ")" : "") + " x" + it.quantity + "\n";
            });
            msg += "\nTổng tiền tạm tính: " + formatMoney(totalAmount);
            
            CartManager.clear();
            
            var zaloUrl = "https://zalo.me/" + zaloPhone + "?text=" + encodeURIComponent(msg);
            window.location.href = zaloUrl;
          });
        });
      });
    }
  }

})();
