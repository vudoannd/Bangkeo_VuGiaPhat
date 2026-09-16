(function() {
  function getQueryParam(param) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  function renderPost(post) {
    document.getElementById('bcPostTitle').textContent = post.title;
    document.getElementById('postTitle').textContent = post.title;
    
    document.title = post.title + ' | Vũ Gia Phát';

    var metaDesc = document.querySelector('meta[name="description"]');
    var descText = post.excerpt || (post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 150) : '');
    if (metaDesc) {
      metaDesc.setAttribute("content", descText);
    } else {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      metaDesc.content = descText;
      document.head.appendChild(metaDesc);
    }

    if (post.created_at) {
      var d = new Date(post.created_at);
      document.getElementById('postDate').textContent = d.toLocaleDateString('vi-VN');
    }

    if (post.content) {
      document.getElementById('postContent').innerHTML = post.content;
    } else {
      document.getElementById('postContent').innerHTML = '<p>Nội dung đang cập nhật...</p>';
    }

    // Generate TOC
    var tocList = document.getElementById('tocList');
    var contentDiv = document.getElementById('postContent');
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

    // JSON-LD
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": post.title,
      "image": [post.image || "images/logo.webp"],
      "datePublished": post.created_at || new Date().toISOString(),
      "author": [{
          "@type": "Organization",
          "name": "Vũ Gia Phát",
          "url": window.location.origin
        }]
    });
    document.head.appendChild(script);
  }

  function init() {
    var postId = parseInt(getQueryParam('id'));
    if (!postId || isNaN(postId)) {
      document.getElementById('postMain').innerHTML = '<div class="container py-5"><div class="alert alert-danger">Không tìm thấy bài viết.</div></div>';
      return;
    }

    if (typeof supabaseClient === 'undefined') {
      setTimeout(init, 500);
      return;
    }

    supabaseClient.from('post').select('*').eq('id', postId).single()
      .then(function(res) {
        if (res.error || !res.data) {
          document.getElementById('postMain').innerHTML = '<div class="container py-5"><div class="alert alert-danger">Không tìm thấy bài viết.</div></div>';
          return;
        }
        renderPost(res.data);
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
