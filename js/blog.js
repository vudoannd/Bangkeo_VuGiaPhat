(function() {
  function renderPosts(posts) {
    var grid = document.getElementById('blogGrid');
    if (!posts || posts.length === 0) {
      grid.innerHTML = '<div class="col-12 text-center text-muted py-5">Chưa có bài viết nào.</div>';
      return;
    }

    var html = '';
    posts.forEach(function(p) {
      var img = p.image || 'images/logo.webp';
      var d = p.created_at ? new Date(p.created_at).toLocaleDateString('vi-VN') : '';
      var excerpt = p.excerpt || (p.content ? p.content.replace(/<[^>]*>?/gm, '').substring(0, 100) + '...' : 'Nội dung đang cập nhật...');
      
      html += '<div class="col-md-6 col-lg-4">' +
                '<article class="card h-100 border-0 shadow-sm hover-shadow transition-all">' +
                  '<a href="post.html?id=' + p.id + '" class="text-decoration-none overflow-hidden" style="height: 200px;">' +
                    '<img src="' + img + '" class="card-img-top w-100 h-100 object-fit-cover" alt="' + p.title + '" style="transition: transform 0.3s; hover:scale(1.05);">' +
                  '</a>' +
                  '<div class="card-body d-flex flex-column p-4">' +
                    '<div class="small text-muted mb-2"><i class="bi bi-calendar3 me-1"></i>' + d + '</div>' +
                    '<h2 class="h5 fw-bold mb-3"><a href="post.html?id=' + p.id + '" class="text-dark text-decoration-none hover-brand">' + p.title + '</a></h2>' +
                    '<p class="card-text text-muted small flex-grow-1">' + excerpt + '</p>' +
                    '<div class="mt-3">' +
                      '<a href="post.html?id=' + p.id + '" class="text-brand fw-bold text-decoration-none" style="color: var(--brand);">Đọc tiếp <i class="bi bi-arrow-right ms-1"></i></a>' +
                    '</div>' +
                  '</div>' +
                '</article>' +
              '</div>';
    });
    grid.innerHTML = html;
  }

  function init() {
    if (typeof supabaseClient === 'undefined') {
      setTimeout(init, 500);
      return;
    }

    supabaseClient.from('post').select('*').order('created_at', { ascending: false })
      .then(function(res) {
        if (res.error) {
          console.error(res.error);
          document.getElementById('blogGrid').innerHTML = '<div class="col-12 text-center text-danger py-5">Chưa tạo bảng `post` trên Supabase hoặc lỗi kết nối. Vui lòng tạo bảng `post` (id, title, content, excerpt, image, created_at).</div>';
          
          // Fallback static data if table doesn't exist
          renderPosts([
            {
              id: 1,
              title: 'Băng keo dán thùng BOPP (Trong/Đục)',
              excerpt: 'Băng keo BOPP là loại thông dụng nhất để niêm phong thùng carton. Việc chọn đúng độ dày (mic) sẽ giúp bạn vừa đảm bảo an toàn cho hàng hóa, vừa tối ưu chi phí.',
              image: 'images/bopp_tape.webp',
              created_at: new Date().toISOString()
            },
            {
              id: 2,
              title: 'Màng PE quấn tay & quấn máy',
              excerpt: 'Màng PE (màng chít) siêu dai, bám dính cực tốt, giúp bảo vệ pallet hàng hóa khỏi bụi bẩn, hơi ẩm và đổ vỡ trong quá trình vận chuyển.',
              image: 'images/pe_film1.jpg',
              created_at: new Date().toISOString()
            }
          ]);
          return;
        }
        renderPosts(res.data);
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
