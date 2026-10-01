(function() {
  function updateCategorySEO(catId) {
    if (!catId || catId === 'all') return;
    
    if (typeof supabaseClient === 'undefined') {
      setTimeout(function() { updateCategorySEO(catId); }, 500);
      return;
    }

    supabaseClient.from('category').select('*').eq('id', catId).single()
      .then(function(res) {
        var data = res.data;
        if (data && (data.seo_title || data.seo_description || data.seo_article)) {
          var title = data.seo_title || data.name;
          var desc = data.seo_description || '';
          
          document.title = title;
          
          var metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            metaDesc.setAttribute("content", desc);
          } else {
            metaDesc = document.createElement('meta');
            metaDesc.name = "description";
            metaDesc.content = desc;
            document.head.appendChild(metaDesc);
          }

          var banner = document.getElementById('seoBanner');
          if (banner) {
            banner.style.display = 'block';
            document.getElementById('seoH1').textContent = title;
            document.getElementById('seoDescTop').textContent = desc;
          }

          var bottom = document.getElementById('seoContentBottom');
          if (bottom && data.seo_article) {
            bottom.style.display = 'block';
            document.getElementById('seoArticle').innerHTML = data.seo_article;
          }
          
          generateCategoryJSONLD(data, title, desc);
        }
      });
  }

  function generateCategoryJSONLD(data, title, desc) {
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": title,
      "description": desc,
      "url": window.location.href
    });
    document.head.appendChild(script);
  }

  window.generateProductJSONLD = function(product, category) {
    var images = product.galleryParsed || [product.image || "images/logo.webp"];
    var schema = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.title,
      "image": images,
      "description": product.description || "Băng keo, màng PE giá sỉ",
      "sku": "VGP-" + product.id,
      "brand": {
        "@type": "Brand",
        "name": "Vũ Gia Phát"
      },
      "offers": {
        "@type": "AggregateOffer",
        "url": window.location.href,
        "priceCurrency": "VND",
        "lowPrice": product.price || 10000,
        "availability": product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": "Vũ Gia Phát"
        }
      }
    };
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  };

  window.generateLocalBusinessJSONLD = function() {
    var schema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "Vũ Gia Phát",
      "image": "https://domain.com/images/logo.webp",
      "telephone": "02838123456",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "123 Đường Băng Keo",
        "addressLocality": "TP.HCM",
        "addressRegion": "Hồ Chí Minh",
        "addressCountry": "VN"
      }
    };
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  };

  window.generateOrganizationJSONLD = function() {
    var schema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Vũ Gia Phát",
      "url": window.location.origin,
      "logo": window.location.origin + "/images/logo.webp"
    };
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  };

  window.generateBreadcrumbJSONLD = function() {
    var breadcrumbs = document.querySelectorAll('.breadcrumb-item a');
    if (!breadcrumbs || breadcrumbs.length === 0) return;
    
    var itemList = [];
    breadcrumbs.forEach(function(el, idx) {
      itemList.push({
        "@type": "ListItem",
        "position": idx + 1,
        "name": el.textContent.trim(),
        "item": el.href || window.location.href
      });
    });
    // Add current page if active breadcrumb exists
    var active = document.querySelector('.breadcrumb-item.active');
    if (active) {
      itemList.push({
        "@type": "ListItem",
        "position": itemList.length + 1,
        "name": active.textContent.trim(),
        "item": window.location.href
      });
    }

    if (itemList.length > 0) {
      var schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": itemList
      };
      var script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    }
  };

  window.generateFAQJSONLD = function() {
    var schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Chính sách đổi trả như thế nào?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Chúng tôi hỗ trợ đổi trả trong vòng 7 ngày đối với sản phẩm lỗi do nhà sản xuất."
          }
        },
        {
          "@type": "Question",
          "name": "Có giao hàng tận nơi không?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Vũ Gia Phát giao hàng tận nơi toàn quốc, miễn phí vận chuyển cho đơn hàng sỉ tại TP.HCM."
          }
        }
      ]
    };
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  };

  document.addEventListener('DOMContentLoaded', function() {
    // 1. Organization schema on all pages
    generateOrganizationJSONLD();

    // 2. Breadcrumbs schema where applicable
    generateBreadcrumbJSONLD();

    // 3. LocalBusiness on contact and about pages
    var path = window.location.pathname;
    if (path.indexOf('about.html') !== -1 || path.indexOf('contact.html') !== -1) {
      generateLocalBusinessJSONLD();
    }

    // 4. Category SEO on products page
    if (path.indexOf('products.html') !== -1) {
      var urlParams = new URLSearchParams(window.location.search);
      var cat = urlParams.get('cat');
      if (cat) {
        updateCategorySEO(cat);
      }
    }
    
    // 5. FAQ on product-detail page
    if (path.indexOf('product-detail.html') !== -1) {
      generateFAQJSONLD();
    }
  });

})();
