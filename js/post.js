(function() {
  'use strict';

  var FALLBACK_POSTS = [
    {
      id: 1,
      slug: 'cach-phan-biet-bang-keo-du-yard-va-thieu-yard',
      title: 'Cách phân biệt băng keo dán thùng đủ Yard và thiếu Yard chuẩn xác nhất',
      excerpt: 'Hướng dẫn chi tiết cách kiểm tra chiều dài thực tế (yard), độ dày màng (mic) và trọng lượng cuộn băng keo OPP để tránh mua nhầm hàng độn lõi giấy.',
      category_tag: 'Kinh nghiệm mua hàng',
      author: 'Vũ Gia Phát',
      image: 'images/bopp_tape.webp',
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
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
      id: 2,
      slug: 'huong-dan-chon-mang-pe-quan-pallet-phu-hop',
      title: 'Hướng dẫn chọn màng PE quấn Pallet theo trọng lượng và kích thước hàng hóa',
      excerpt: 'Tư vấn chọn màng PE quấn tay (2.4kg - 3.8kg) và màng PE quấn máy (15kg) với độ dày từ 17 mic đến 23 mic giúp tiết kiệm tới 25% chi phí đóng gói.',
      category_tag: 'Giải pháp kho vận',
      author: 'Vũ Gia Phát',
      image: 'images/pe_film1.jpg',
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
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
    },
    {
      id: 3,
      slug: 'bang-keo-in-logo-thuong-hieu-giai-phap-marketing',
      title: 'Băng keo in Logo thương hiệu: Giải pháp chống hàng giả & tăng nhận diện giá rẻ',
      excerpt: 'Tìm hiểu quy trình sản xuất băng keo OPP in chữ, in logo thương hiệu bằng trục đồng sắc nét, không bong tróc màu cho shop và doanh nghiệp.',
      category_tag: 'Xu hướng đóng gói',
      author: 'Vũ Gia Phát',
      image: 'images/factory1.webp',
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      seo_title: 'In Băng Keo Logo Thương Hiệu Theo Yêu Cầu - Vũ Gia Phát',
      seo_description: 'Dịch vụ sản xuất băng keo in logo, in chữ theo yêu cầu giá xưởng tại TP.HCM.',
      content:
        '<h2>1. Lợi ích khi sử dụng băng keo in Logo</h2>' +
        '<p>Mỗi kiện hàng gửi đi là một điểm chạm thương hiệu. Sử dụng băng keo in logo giúp niêm phong chống tráo hàng đồng thời quảng bá thương hiệu chuyên nghiệp.</p>' +
        '<h2>2. Quy trình đặt in băng keo tại Vũ Gia Phát</h2>' +
        '<ul>' +
          '<li>Bước 1: Tiếp nhận logo và tư vấn màu nền, kích thước cuộn.</li>' +
          '<li>Bước 2: Lên maquette thiết kế miễn phí 100%.</li>' +
          '<li>Bước 3: Khắc trục in ống đồng và tiến hành in, tráng keo, phân cuộn.</li>' +
        '</ul>'
    }
  ];

  function getQueryParam(param) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  function renderPost(post) {
    var bcEl = document.getElementById('bcPostTitle');
    if (bcEl) bcEl.textContent = post.title;

    var titleEl = document.getElementById('postTitle');
    if (titleEl) titleEl.textContent = post.title;

    var catEl = document.getElementById('postCategoryTag');
    if (catEl) catEl.textContent = post.category_tag || 'Kiến thức đóng gói';

    var authorEl = document.getElementById('postAuthor');
    if (authorEl) authorEl.textContent = post.author || 'Vũ Gia Phát';

    var seoTitle = post.seo_title || post.title;
    document.title = seoTitle + ' | Vũ Gia Phát';

    var metaDesc = document.querySelector('meta[name="description"]');
    var descText = post.seo_description || post.excerpt || (post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 155) : '');
    if (metaDesc) {
      metaDesc.setAttribute("content", descText);
    } else {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      metaDesc.content = descText;
      document.head.appendChild(metaDesc);
    }

    var dateRaw = post.published_at || post.created_at;
    if (dateRaw) {
      var d = new Date(dateRaw);
      var dateEl = document.getElementById('postDate');
      if (dateEl) dateEl.textContent = d.toLocaleDateString('vi-VN');
    }

    var contentDiv = document.getElementById('postContent');
    if (contentDiv) {
      contentDiv.innerHTML = post.content || '<p>Nội dung đang cập nhật...</p>';
    }

    // Generate TOC
    var tocList = document.getElementById('tocList');
    if (tocList && contentDiv) {
      var headings = contentDiv.querySelectorAll('h2, h3');
      if (headings.length > 0) {
        var tocHtml = '';
        headings.forEach(function(h, index) {
          var id = 'heading-' + index;
          h.id = id;
          var padding = h.tagName.toLowerCase() === 'h3' ? 'ms-3' : '';
          tocHtml += '<li class="mb-2 ' + padding + '"><a href="#' + id + '" class="text-decoration-none text-dark hover-brand">' + h.textContent + '</a></li>';
        });
        tocList.innerHTML = tocHtml;
      } else {
        tocList.innerHTML = '<li class="text-muted fst-italic">Không có mục lục</li>';
      }
    }

    // Article Schema JSON-LD
    if (window.generateArticleJSONLD) {
      window.generateArticleJSONLD(post);
    }
    if (window.generateBreadcrumbJSONLD) {
      window.generateBreadcrumbJSONLD();
    }
  }

  function findFallback(slug, id) {
    if (slug) {
      var bySlug = FALLBACK_POSTS.filter(function(p) { return p.slug === slug; })[0];
      if (bySlug) return bySlug;
    }
    if (id) {
      var byId = FALLBACK_POSTS.filter(function(p) { return Number(p.id) === Number(id); })[0];
      if (byId) return byId;
    }
    return FALLBACK_POSTS[0];
  }

  function init() {
    var slug = getQueryParam('slug');
    var postId = parseInt(getQueryParam('id'), 10);

    if (!slug && (!postId || isNaN(postId))) {
      renderPost(FALLBACK_POSTS[0]);
      return;
    }

    if (typeof supabaseClient === 'undefined') {
      setTimeout(init, 400);
      return;
    }

    var query = supabaseClient.from('post').select('*');
    if (slug) {
      query = query.eq('slug', slug).maybeSingle();
    } else {
      query = query.eq('id', postId).maybeSingle();
    }

    query.then(function(res) {
      if (res.error || !res.data) {
        renderPost(findFallback(slug, postId));
        return;
      }
      renderPost(res.data);
    })['catch'](function() {
      renderPost(findFallback(slug, postId));
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
