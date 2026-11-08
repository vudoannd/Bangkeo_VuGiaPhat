(function() {
  'use strict';

  var PAGE_SIZE = 6;
  var allPosts = [];
  var shownCount = PAGE_SIZE;

  var FALLBACK_POSTS = [
    {
      id: 1,
      slug: 'cach-phan-biet-bang-keo-du-yard-va-thieu-yard',
      title: 'Cách phân biệt băng keo dán thùng đủ Yard và thiếu Yard chuẩn xác nhất',
      excerpt: 'Hướng dẫn chi tiết cách kiểm tra chiều dài thực tế (yard), độ dày màng (mic) và trọng lượng cuộn băng keo OPP để tránh mua nhầm hàng độn lõi giấy.',
      category_tag: 'Kinh nghiệm mua hàng',
      author: 'Vũ Gia Phát',
      image: 'images/bopp_tape.webp',
      is_published: true,
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      slug: 'huong-dan-chon-mang-pe-quan-pallet-phu-hop',
      title: 'Hướng dẫn chọn màng PE quấn Pallet theo trọng lượng và kích thước hàng hóa',
      excerpt: 'Tư vấn chọn màng PE quấn tay (2.4kg - 3.8kg) và màng PE quấn máy (15kg) với độ dày từ 17 mic đến 23 mic giúp tiết kiệm tới 25% chi phí đóng gói.',
      category_tag: 'Giải pháp kho vận',
      author: 'Vũ Gia Phát',
      image: 'images/pe_film1.jpg',
      is_published: true,
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      slug: 'bang-keo-in-logo-thuong-hieu-giai-phap-marketing',
      title: 'Băng keo in Logo thương hiệu: Giải pháp chống hàng giả & tăng nhận diện giá rẻ',
      excerpt: 'Tìm hiểu quy trình sản xuất băng keo OPP in chữ, in logo thương hiệu bằng trục đồng sắc nét, không bong tróc màu cho shop và doanh nghiệp.',
      category_tag: 'Xu hướng đóng gói',
      author: 'Vũ Gia Phát',
      image: 'images/factory1.webp',
      is_published: true,
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  ];

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function renderPosts() {
    var grid = document.getElementById('blogGrid');
    if (!grid) return;

    if (!allPosts || allPosts.length === 0) {
      grid.innerHTML = '<div class="col-12 text-center text-muted py-5">Chưa có bài viết nào.</div>';
      return;
    }

    var slice = allPosts.slice(0, shownCount);
    var html = '';

    slice.forEach(function(p) {
      var img = p.image || 'images/logo.webp';
      var dateRaw = p.published_at || p.created_at;
      var d = dateRaw ? new Date(dateRaw).toLocaleDateString('vi-VN') : '';
      var excerpt = p.excerpt || (p.content ? p.content.replace(/<[^>]*>?/gm, '').substring(0, 120) + '...' : 'Nội dung đang cập nhật...');
      var catTag = p.category_tag || 'Kiến thức đóng gói';
      var postUrl = 'post.html?' + (p.slug ? 'slug=' + encodeURIComponent(p.slug) : 'id=' + encodeURIComponent(p.id));

      html += '<div class="col-md-6 col-lg-4">' +
                '<article class="card h-100 border-0 shadow-sm hover-shadow transition-all overflow-hidden rounded-4">' +
                  '<a href="' + postUrl + '" class="text-decoration-none overflow-hidden d-block position-relative" style="height: 210px;">' +
                    '<span class="badge bg-primary position-absolute top-0 start-0 m-3 shadow-sm" style="z-index:2;">' + esc(catTag) + '</span>' +
                    '<img src="' + esc(img) + '" class="card-img-top w-100 h-100 object-fit-cover" alt="' + esc(p.title) + '" style="transition: transform 0.3s;" onerror="this.onerror=null;this.src=\'images/logo.webp\'">' +
                  '</a>' +
                  '<div class="card-body d-flex flex-column p-4">' +
                    '<div class="small text-muted mb-2 d-flex align-items-center gap-3">' +
                      '<span><i class="bi bi-calendar3 me-1"></i>' + esc(d) + '</span>' +
                      '<span><i class="bi bi-person me-1"></i>' + esc(p.author || 'Vũ Gia Phát') + '</span>' +
                    '</div>' +
                    '<h2 class="h5 fw-bold mb-3"><a href="' + postUrl + '" class="text-dark text-decoration-none hover-brand">' + esc(p.title) + '</a></h2>' +
                    '<p class="card-text text-muted small flex-grow-1">' + esc(excerpt) + '</p>' +
                    '<div class="mt-3 pt-2 border-top">' +
                      '<a href="' + postUrl + '" class="text-brand fw-bold text-decoration-none small" style="color: var(--brand);">Đọc tiếp <i class="bi bi-arrow-right ms-1"></i></a>' +
                    '</div>' +
                  '</div>' +
                '</article>' +
              '</div>';
    });

    if (allPosts.length > shownCount) {
      html += '<div class="col-12 text-center mt-4">' +
                '<button type="button" class="btn btn-outline-primary rounded-pill px-4" id="btnLoadMorePosts">' +
                  '<i class="bi bi-plus-circle me-1"></i>Xem thêm bài viết' +
                '</button>' +
              '</div>';
    }

    grid.innerHTML = html;

    var btnMore = document.getElementById('btnLoadMorePosts');
    if (btnMore) {
      btnMore.addEventListener('click', function() {
        shownCount += PAGE_SIZE;
        renderPosts();
      });
    }
  }

  function init() {
    if (typeof supabaseClient === 'undefined') {
      setTimeout(init, 400);
      return;
    }

    supabaseClient
      .from('post')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .then(function(res) {
        if (res.error || !res.data || res.data.length === 0) {
          allPosts = FALLBACK_POSTS;
        } else {
          allPosts = res.data;
        }
        renderPosts();
      })['catch'](function() {
        allPosts = FALLBACK_POSTS;
        renderPosts();
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
