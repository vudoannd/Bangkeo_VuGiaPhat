(function() {
  var SEO_DATA = {
    '1': {
      title: "Băng Keo OPP Trong/Đục Cắt Theo Yêu Cầu | Vũ Gia Phát",
      h1: "Băng Keo OPP Giá Sỉ",
      descTop: "Cung cấp băng keo OPP trong, đục, màu... cắt theo mọi quy cách (yard, mic). Cam kết độ dính cao, không đứt màng, giá xưởng tốt nhất TP.HCM.",
      article: "<h2>Băng keo OPP là gì?</h2><p>Băng keo OPP (Oriented PolyPropylene) là loại băng dính phổ biến nhất hiện nay, được sử dụng rộng rãi trong đóng gói hàng hóa, dán thùng carton...</p><h3>Ưu điểm của băng keo OPP Vũ Gia Phát</h3><ul><li>Màng keo dai, khó đứt khi kéo mạnh.</li><li>Lớp keo Acrylic bám dính cực tốt trên mặt giấy thùng carton.</li><li>Sản xuất trực tiếp, giá sỉ cạnh tranh nhất thị trường.</li></ul>"
    },
    '2': {
      title: "Màng PE Quấn Pallet Bọc Hàng Hóa Giá Rẻ | Vũ Gia Phát",
      h1: "Màng PE Cuốn Thùng",
      descTop: "Màng PE bọc hàng, quấn pallet, màng chít căng dai, độ co giãn lên tới 300%. Có sẵn nhiều lõi (300g, 500g, lõi mỏng).",
      article: "<h2>Màng PE (Màng chít) - Giải pháp bảo vệ hàng hóa tối ưu</h2><p>Màng PE được dùng nhiều trong công nghiệp để bọc hàng hóa, quấn pallet giúp chống xước, chống ẩm và bụi bẩn.</p><h3>Phân loại màng PE</h3><p>Vũ Gia Phát cung cấp cả màng quấn tay và màng quấn máy với đa dạng trọng lượng lõi giấy và độ dày màng từ 15mic đến 20mic.</p>"
    }
  };

  function updateCategorySEO(catId) {
    if (!catId || catId === 'all') return;
    
    var data = SEO_DATA[catId];
    if (data) {
      document.title = data.title;
      
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", data.descTop);
      } else {
        metaDesc = document.createElement('meta');
        metaDesc.name = "description";
        metaDesc.content = data.descTop;
        document.head.appendChild(metaDesc);
      }

      var banner = document.getElementById('seoBanner');
      if (banner) {
        banner.style.display = 'block';
        document.getElementById('seoH1').textContent = data.h1;
        document.getElementById('seoDescTop').textContent = data.descTop;
      }

      var bottom = document.getElementById('seoContentBottom');
      if (bottom) {
        bottom.style.display = 'block';
        document.getElementById('seoArticle').innerHTML = data.article;
      }
      
      generateCategoryJSONLD(data);
    }
  }

  function generateCategoryJSONLD(data) {
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": data.title,
      "description": data.descTop,
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

  // Run on products page
  if (window.location.pathname.indexOf('products.html') !== -1) {
    var urlParams = new URLSearchParams(window.location.search);
    var cat = urlParams.get('cat');
    if (cat) {
      document.addEventListener('DOMContentLoaded', function() {
        updateCategorySEO(cat);
      });
    }
  }
})();
