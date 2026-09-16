(function() {
  function getQueryParam(param) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  function renderProductDetail(product, category) {
    // 1. Breadcrumb & Titles
    document.getElementById('bcProductName').textContent = product.title;
    document.getElementById('pdTitle').textContent = product.title;
    if (category) {
      document.getElementById('pdCategory').textContent = category.name;
    }

    // 2. Price & Moq
    var priceNum = isFinite(product.price) ? Number(product.price) : null;
    document.getElementById('pdPrice').textContent = priceNum ? priceNum.toLocaleString('vi-VN') + ' đ' : 'Liên hệ';
    document.getElementById('pdMoq').textContent = product.moq || 'Liên hệ';

    // 3. Quick Specs
    document.getElementById('pdThickness').textContent = product.thickness || '-';
    document.getElementById('pdLength').textContent = product.length || '-';
    document.getElementById('pdWeight').textContent = product.weight || '-';
    document.getElementById('pdPackaging').textContent = product.packaging || '-';

    // 4. Tab Specs
    document.getElementById('tbMaterial').textContent = product.material || '-';
    document.getElementById('tbAdhesion').textContent = product.adhesion || '-';
    document.getElementById('tbThickness').textContent = product.thickness || '-';
    document.getElementById('tbLength').textContent = product.length || '-';
    document.getElementById('tbWeight').textContent = product.weight || '-';
    document.getElementById('tbColor').textContent = product.color || '-';
    document.getElementById('tbApplication').textContent = product.application || '-';

    // 5. Description
    if (product.description) {
      document.getElementById('pdDescription').innerHTML = product.description;
    } else {
      document.getElementById('pdDescription').innerHTML = '<p>Đang cập nhật mô tả sản phẩm.</p>';
    }

    // 6. Gallery
    var images = [];
    if (product.galleryParsed && product.galleryParsed.length > 0) {
      images = product.galleryParsed;
    } else if (product.image) {
      images = [product.image];
    } else {
      images = ['images/logo.webp']; // fallback
    }

    var innerHtml = '';
    var thumbsHtml = '';
    images.forEach(function(img, i) {
      var active = i === 0 ? 'active' : '';
      innerHtml += '<div class="carousel-item ' + active + ' h-100">' +
                   '<img src="' + img + '" class="d-block w-100 h-100" style="object-fit:contain" alt="'+product.title+'">' +
                   '</div>';
      
      thumbsHtml += '<img src="' + img + '" class="border rounded p-1" style="width: 80px; height: 80px; object-fit: contain; cursor: pointer;" onclick="bootstrap.Carousel.getOrCreateInstance(document.getElementById(\'productGallery\')).to(' + i + ')">';
    });
    document.getElementById('galleryInner').innerHTML = innerHtml;
    document.getElementById('galleryThumbs').innerHTML = thumbsHtml;

    // 7. Variants
    var variants = [];
    try {
      variants = product.variants ? (typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants) : [];
    } catch(e) {}

    var variantSelect = document.getElementById('pdVariant');
    if (variants.length > 0) {
      var opts = '';
      variants.forEach(function(v) {
        opts += '<option value="' + (v.id || v.name) + '">' + v.name + (v.price ? ' - ' + parseInt(v.price).toLocaleString('vi-VN') + ' đ' : '') + '</option>';
      });
      variantSelect.innerHTML = opts;
    } else {
      variantSelect.innerHTML = '<option value="default">Giá sỉ - Lẻ mặc định</option>';
    }

    // 8. Add to cart
    document.getElementById('pdAddToCart').addEventListener('click', function() {
      var vid = variantSelect.value;
      if (window.CartManager) {
        window.CartManager.add(product.id, vid, 1);
      } else {
        alert('Giỏ hàng đang khởi tạo, vui lòng thử lại.');
      }
    });

    // 9. SEO JSON-LD
    if (window.generateProductJSONLD) {
      window.generateProductJSONLD(product, category);
    }
  }

  function init() {
    var productId = parseInt(getQueryParam('id'));
    if (!productId || isNaN(productId)) {
      document.getElementById('productDetailContainer').innerHTML = '<div class="alert alert-danger">Không tìm thấy sản phẩm.</div>';
      return;
    }

    if (typeof supabaseClient === 'undefined') {
      setTimeout(init, 500); // wait for supabase
      return;
    }

    supabaseClient.from('product').select('*').eq('id', productId).single()
      .then(function(res) {
        if (res.error || !res.data) {
          document.getElementById('productDetailContainer').innerHTML = '<div class="alert alert-danger">Không tìm thấy sản phẩm.</div>';
          return;
        }
        var p = res.data;
        p.title = p.name;
        if (p.image) {
          p.image = 'images/products/' + p.image.replace(/\.(png|jpg|jpeg)$/i, '.webp');
        }
        if (p.gallery && typeof p.gallery === 'string') {
          try { 
            p.galleryParsed = JSON.parse(p.gallery).map(function(img) { 
              return img ? 'images/products/' + img.replace(/\.(png|jpg|jpeg)$/i, '.webp') : ''; 
            }); 
          } catch(e){}
        } else if (Array.isArray(p.gallery)) {
          p.galleryParsed = p.gallery.map(function(img) { 
            return img ? 'images/products/' + img.replace(/\.(png|jpg|jpeg)$/i, '.webp') : ''; 
          });
        }
        
        if (p.category_id) {
          supabaseClient.from('category').select('*').eq('id', p.category_id).single()
            .then(function(catRes) {
              renderProductDetail(p, catRes.data);
            });
        } else {
          renderProductDetail(p, null);
        }
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
