# BangKeo_VuGiaPhat

Website giới thiệu sản phẩm băng keo công nghiệp cho **VGP – Win Win Tape**.

Công nghệ sử dụng — chỉ đúng 6 thứ:

| Thành phần | Vai trò |
|---|---|
| **HTML5** | Cấu trúc ngữ nghĩa (header/nav/main/section/article/footer) |
| **CSS3** | Lớp tùy biến mỏng trên nền Bootstrap (`css/style.css`) |
| **JavaScript thuần** | Toàn bộ phần động (`js/main.js`), không jQuery |
| **Bootstrap 5.3.8** (CDN) | Lưới, navbar, offcanvas, carousel, card, modal, toast, form |
| **Bootstrap Icons 1.13.1** (CDN) | Bộ biểu tượng, dùng qua `<i class="bi bi-*">` |
| **sql.js 1.13.0** (CDN) | Chạy SQLite bằng WebAssembly ngay trong trình duyệt — dùng cho `create-db.html` và toàn bộ khu quản trị `/admin` |

Không dùng framework JS, không build tool, không webfont tải về, không thư viện
biểu đồ — biểu đồ ở trang quản trị vẽ tay bằng SVG trong `admin/js/chart.js`.
Màu chủ đạo `#017DC7` lấy từ logo, áp vào Bootstrap bằng cách ghi đè biến
`--bs-primary` trong `css/style.css` (nạp **sau** `bootstrap.min.css`).

---

## Cách chạy

### Cách 1 — Chạy qua HTTP (nên dùng)

```bash
python -m http.server 8000
```

Rồi mở <http://localhost:8000>. Lúc này trang đọc **trực tiếp `VuGiaPhat.db`**,
và khu quản trị mở được tại <http://localhost:8000/admin/>.
Có thể dùng tiện ích **Live Server** của VS Code thay thế.

### Cách 2 — Nháy đúp `index.html`

Ba trang khách vẫn chạy được. Nhưng giao thức `file://` chặn `fetch()` (chính
sách CORS) nên không đọc được CSDL, trang tự lùi về bản dữ liệu nhúng
`data/bangkeo.data.js` — tức là **dữ liệu gốc, không phải bản vừa sửa trong
`/admin`**. Khu quản trị và `create-db.html` thì không mở được theo cách này.

> Mở Console (F12) để biết trang đang đọc từ nguồn nào: có một dòng ghi rõ, và
> nếu phải dùng bản dự phòng thì kèm luôn lý do.

---

## Cấu trúc thư mục

```
BangkeoVuGiaPhat/
├── index.html            Trang chủ: carousel + danh mục + sản phẩm mới nhất
├── products.html         Trang sản phẩm: lọc theo danh mục, tìm kiếm, sắp xếp
├── contact.html          Trang liên hệ: thông tin + form gửi góp ý
├── css/style.css         Toàn bộ giao diện và hiệu ứng
├── js/main.js            Toàn bộ phần động
├── data/
│   ├── bangkeo.json      Dữ liệu gốc (24 sản phẩm, 3 danh mục)
│   └── bangkeo.data.js   Bản nhúng dự phòng cho file://
├── images/
│   ├── logo.png          Logo VGP
│   └── products/         24 ảnh sản phẩm
├── VuGiaPhat.db          CSDL SQLite (đã tạo sẵn)
├── schema.sql            Cấu trúc 5 bảng
├── seed.sql              Lệnh INSERT sinh từ bangkeo.json
├── create-db.html        Công cụ dựng lại CSDL bằng sql.js (CDN)
├── js/db-seed.js         Module sinh lệnh INSERT
├── admin/                KHU QUẢN TRỊ — xem mục riêng bên dưới
│   ├── index.html        Bảng điều khiển (một trang, chuyển mục bằng hash)
│   ├── login.html        Đăng nhập quản trị
│   ├── css/admin.css     Sidebar, topbar, thẻ số liệu, biểu đồ
│   └── js/               core · db · auth · chart · 7 file page-*.js · app
├── requirements.txt      Danh sách thư viện CDN
└── Du_lieu/              Bản gốc do người dùng cung cấp (không dùng khi chạy)
```

---

## Cơ sở dữ liệu

File **`VuGiaPhat.db`** đã được tạo sẵn, gồm 6 bảng:

| Bảng | Nội dung | Số bản ghi ban đầu |
|---|---|---|
| `category` | Danh mục sản phẩm | 3 |
| `product` | Sản phẩm | 24 |
| `user` | Tài khoản khách hàng / quản trị | 3 |
| `order` | Đơn hàng | 4 |
| `order_item` | Chi tiết dòng hàng trong đơn | 7 |
| `feedback` | Phản hồi từ form Liên hệ | 0 — nạp dần khi có khách gửi |

> **File `.db` cũ chỉ có 5 bảng vẫn dùng được.** Khu quản trị tự tạo bảng
> `feedback` khi mở CSDL (`CREATE TABLE IF NOT EXISTS`), khỏi phải dựng lại từ
> đầu và mất hết sản phẩm / đơn hàng đã nhập. Bảng mới xuống tới file ở lần lưu
> đầu tiên sau đó.

Cấu trúc đầy đủ xem tại [schema.sql](schema.sql).

### Dựng lại CSDL

Mở `create-db.html` **qua HTTP** (không mở bằng `file://`, vì trang cần `fetch()`
đọc `schema.sql` và `data/bangkeo.json`):

```bash
python -m http.server 8000
```

Rồi vào <http://localhost:8000/create-db.html>, bấm **"Tạo cơ sở dữ liệu"** →
**"Tải VuGiaPhat.db"**. Trang dùng thư viện **sql.js** nạp từ CDN để chạy SQLite
ngay trong trình duyệt, đúng tiêu chí chỉ dùng JS/HTML/CSS/CDN.

### Tài khoản mẫu

| Email | Mật khẩu | Vai trò |
|---|---|---|
| `admin@vugiaphat.vn` | `Admin@123` | Quản trị |
| `khachhang@gmail.com` | `Khach@123` | Khách hàng |
| `minh.le@congtyabc.vn` | `Minh@123` | Khách hàng |

> **Cảnh báo bảo mật:** `password_hash` ở đây là SHA-256 trần, chỉ để minh hoạ
> trong đồ án. Hệ thống thật bắt buộc dùng thuật toán băm chuyên cho mật khẩu
> như bcrypt / scrypt / Argon2, kèm salt riêng cho từng tài khoản.

### Ghi chú thiết kế CSDL

- **`"order"` phải đặt trong nháy kép** vì `order` là từ khoá SQL.
- **`price` dùng INTEGER** (đơn vị đồng) thay vì REAL, tránh sai số dấu chấm động
  khi cộng tiền đơn hàng.
- **`order_item.unit_price` chép lại giá tại thời điểm đặt**, không tham chiếu
  `product.price`, để đơn cũ không bị đổi tiền khi cập nhật bảng giá.
- **`product.moq` và `product.rating` nằm ngoài đặc tả gốc**, được bổ sung vì
  giao diện đang hiển thị "Đặt tối thiểu" và số sao. Bỏ đi thì CSDL mất thông tin
  mà website đang dùng.
- **`product.description` để NULL** — `bangkeo.json` không có trường mô tả riêng
  cho từng sản phẩm, không tự bịa ra dữ liệu. Viết mô tả trong `/admin` thì nó
  hiện ngay trong ô "Xem nhanh" của website khách.
- **Website khách đọc thẳng CSDL này**, không còn dùng `data/bangkeo.json` —
  xem mục "Nguồn dữ liệu của website khách" bên dưới.

---

## Nguồn dữ liệu của website khách

`index.html` và `products.html` đọc **thẳng `VuGiaPhat.db`** bằng sql.js — đúng
file mà khu quản trị ghi vào. Sửa gì trong `/admin` là website khách đổi theo:

| Sửa trong `/admin` | Đổi ở website khách |
|---|---|
| Giá, tên, ảnh, MOQ, đánh giá sản phẩm | Thẻ sản phẩm và ô "Xem nhanh" |
| Đánh dấu hết hàng | Nhãn *Còn hàng / Hết hàng* trên thẻ |
| Mô tả sản phẩm | Đoạn mô tả trong ô "Xem nhanh" |
| Tên + mô tả danh mục | Thẻ danh mục ở trang chủ, chip lọc ở trang sản phẩm |
| Thêm / xóa sản phẩm | Số đếm trên thẻ danh mục, danh sách, "Sản phẩm mới nhất" |

**Ba nấc dự phòng**, rơi xuống nấc dưới khi nấc trên hỏng — website giới thiệu
sản phẩm mà không hiện được sản phẩm thì hỏng hoàn toàn, còn hiện dữ liệu cũ
vẫn dùng tạm được:

1. `VuGiaPhat.db` qua sql.js — nguồn thật
2. `data/bangkeo.json` — ảnh chụp dữ liệu ban đầu
3. `data/bangkeo.data.js` — bản nhúng, chạy được cả khi nháy đúp `index.html`

Mở Console (F12) sẽ thấy một dòng cho biết trang đang đọc từ nấc nào. Nhờ nấc 3
mà lời hứa "nháy đúp `index.html` là chạy" vẫn còn nguyên — chỉ là lúc đó dữ
liệu hiển thị là bản gốc, không phải bản vừa sửa trong `/admin`.

> **Đánh đổi cần biết:** nấc 1 phải tải thư viện sql.js (~600 KB WebAssembly) từ
> CDN, nặng hơn hẳn 9 KB của file JSON. Đổi lại, dữ liệu luôn là bản mới nhất và
> chỉ có một nguồn sự thật duy nhất. Thư viện được nạp với thuộc tính `defer`
> nên không chặn lúc trình duyệt dựng trang.

---

## Tính năng

**Trang chủ** — Carousel Bootstrap 3 slide (tự chạy 5 giây, dừng khi rê chuột, có
nút prev/next, chấm chỉ số, vuốt ngang trên mobile, điều hướng bằng phím mũi tên)
· 3 thẻ danh mục kèm số lượng · 8 sản phẩm mới nhất · dải điểm mạnh và số liệu.

**Trang sản phẩm** — Lọc theo danh mục (đồng bộ với URL `?cat=2`, F5 hoặc gửi link
vẫn giữ nguyên bộ lọc) · Tìm kiếm không dấu, gõ "bang keo" vẫn ra "băng keo" ·
Sắp xếp theo mới nhất / giá / đánh giá · Nút "Xem thêm" từng 12 sản phẩm.

**Trang liên hệ** — Thông tin công ty · Form kiểm tra bằng JavaScript (họ tên, email,
số điện thoại Việt Nam, chủ đề, nội dung) với thông báo lỗi tiếng Việt ngay dưới từng ô.

**Dùng chung** — Menu offcanvas trên mobile · Navbar thu gọn khi cuộn · Hiệu ứng hiện
dần khi cuộn · Modal xem nhanh sản phẩm · Toast thông báo · Nút lên đầu trang ·
Responsive từ 320px trở lên.

> **Cần Internet** để tải Bootstrap và Bootstrap Icons từ CDN. Muốn chạy hoàn toàn
> ngoại tuyến thì tải 3 file CSS/JS của Bootstrap cùng thư mục font của Bootstrap
> Icons về máy, rồi đổi đường dẫn trong các thẻ `<link>` / `<script>`.

---

## Khu quản trị — `/admin`

Mở <http://localhost:8000/admin/> (**bắt buộc chạy qua HTTP**, xem lý do bên dưới).
Đăng nhập bằng `admin@vugiaphat.vn` / `Admin@123`.

Giao diện có **sidebar riêng**, không dùng lại navbar của website khách.

| Mục | Làm được gì |
|---|---|
| **Tổng quan** | Doanh thu, số đơn / sản phẩm / khách · biểu đồ doanh thu 6 tháng · cơ cấu trạng thái đơn · top 5 sản phẩm bán chạy · đơn gần đây · danh sách việc cần xử lý |
| **Đơn hàng** | Lọc theo trạng thái, tìm theo khách/mã đơn · xem chi tiết dòng hàng · **tạo và sửa đơn** kèm trình soạn dòng hàng · đổi trạng thái tại chỗ · xóa |
| **Sản phẩm** | Thêm / sửa / xóa · tìm kiếm không dấu · lọc theo danh mục và tình trạng kho · sắp xếp · phân trang · chọn nhiều dòng để đổi kho hoặc xóa hàng loạt · chọn ảnh có xem trước |
| **Danh mục** | Thêm / sửa / xóa kèm số sản phẩm, khoảng giá và doanh thu từng danh mục |
| **Khách hàng** | Thêm / sửa / xóa tài khoản · đổi vai trò admin · đặt lại mật khẩu · xem đơn của từng khách |
| **Phản hồi** | Nạp tin nhắn form Liên hệ vào bảng `feedback`, lọc theo chủ đề, đánh dấu đã đọc, nhận diện khách đã có tài khoản, trả lời qua email, xuất CSV |
| **Cơ sở dữ liệu** | Thống kê bảng · 5 phép kiểm tra toàn vẹn · xuất / nạp / đặt lại file `.db` · ô chạy câu lệnh `SELECT` |

### Đăng nhập và phân quyền

Kiểm tra ngay trong trình duyệt, qua đúng bảng `user` của `VuGiaPhat.db`:
mật khẩu băm SHA-256 bằng Web Crypto rồi so với `password_hash`, và bắt buộc
`is_admin = 1`. Tài khoản khách hàng đăng nhập vào đây sẽ bị từ chối.

Phiên làm việc lưu trong `sessionStorage`: sống trong đúng một tab, đóng tab là
mất, tự hết hạn sau 45 phút không thao tác. Có hai chốt chặn — một chốt chạy
ngay trong `<head>` trước khi trang được vẽ, một chốt chạy sau khi mở CSDL để
đối chiếu lại tài khoản vẫn tồn tại và vẫn còn quyền.

> **Cảnh báo bảo mật.** Website không có backend nên mọi kiểm tra đều nằm ở phía
> trình duyệt. Người biết việc hoàn toàn có thể mở Console để đi vòng qua, hoặc
> tải thẳng `VuGiaPhat.db` về đọc. Lớp đăng nhập này **đủ để phân vai trong đồ án
> nhưng không phải là bảo mật thật**. Muốn thật thì phải có máy chủ: giữ CSDL ở
> phía server, kiểm tra mật khẩu và quyền ở server, phát session cookie HttpOnly,
> và băm mật khẩu bằng bcrypt / scrypt / Argon2 thay cho SHA-256 trần.

### Ghi thẳng vào `VuGiaPhat.db` — làm một lần rồi quên

Lần đầu vào `/admin`, chip trên topbar sẽ ghi **"Lưu trong trình duyệt"**. Bấm
vào đó → **Chọn file…** → chọn đúng `VuGiaPhat.db` trong thư mục dự án → cho
phép ghi. Xong. Từ giờ mọi thao tác thêm/sửa/xóa ghi **thẳng vào file thật trên
đĩa**, và ba trang khách đọc chính file đó nên tải lại là thấy dữ liệu mới.

```
        ┌──────────────── admin/ ────────────────┐
        │  sql.js  ──createWritable()──┐         │
        └──────────────────────────────┼─────────┘
                                       ▼
                              VuGiaPhat.db (đĩa)
                                       │
        ┌──────────── 3 trang khách ───┼─────────┐
        │  sql.js  ◄────── fetch() ────┘         │
        └────────────────────────────────────────┘
```

Cơ chế là **File System Access API** — cách duy nhất để JavaScript ghi được file
trên đĩa khi không có máy chủ. Vì lý do an toàn, trình duyệt bắt buộc người dùng
phải tự tay chọn file và tự bấm cấp quyền; không thể tự động hóa bước này.

| | Chrome · Edge · Opera | Firefox · Safari |
|---|---|---|
| Ghi thẳng vào file | ✅ | ❌ |
| Đường lùi | — | IndexedDB + **Xuất file .db** rồi chép đè tay |

**Trình duyệt thu hồi quyền ghi sau mỗi lần tải lại trang** — đó là quy định
của nền tảng, không phải lỗi. Khi đó:

- Thao tác lưu đầu tiên sẽ **tự bật hộp thoại xin quyền** (vì lúc đó đang có cú
  bấm của bạn, đúng điều kiện duy nhất trình duyệt cho phép hỏi). Bấm *Cho phép*
  là thay đổi xuống thẳng file.
- Từ chối, hoặc chưa kết nối file bao giờ, thì có một **dải cảnh báo vàng ngay
  dưới topbar** nói rõ "thay đổi chưa vào file VuGiaPhat.db", kèm nút xử lý. Dải
  này chỉ biến mất khi thật sự đang ghi được vào file.

Không mất dữ liệu trong lúc chờ: mọi thay đổi đã nằm sẵn trong IndexedDB, bấm
kết nối / cấp lại quyền là toàn bộ được đẩy xuống file ngay lập tức.

Kể cả khi đang ghi thẳng vào file, mỗi thay đổi vẫn được sao thêm một bản vào
IndexedDB làm lưới an toàn, phòng khi file bị di chuyển hoặc quyền bị thu hồi
giữa chừng.

Vì phải `fetch()` file `.db` và cần Web Crypto, khu quản trị **không chạy được
bằng cách nháy đúp file** (`file://`). Trang sẽ hiện thông báo kèm hướng dẫn nếu
mở sai cách.

### Phản hồi khách hàng — đường đi tới cơ sở dữ liệu

Phản hồi nằm trong bảng `feedback` của `VuGiaPhat.db`, nhưng phải qua một chặng
trung gian, và lý do rất cụ thể:

```
contact.html          localStorage           admin/        VuGiaPhat.db
(máy của khách)  ──>  'vgp_feedback'   ──>   mục Phản hồi  ──>  bảng feedback
                      (hộp thư đi)           (tự nạp khi mở)
```

Trình duyệt của khách **không ghi được** vào `VuGiaPhat.db` — ghi file cần File
System Access API, mà API đó bắt người dùng tự tay chọn file và cấp quyền.
Không thể yêu cầu một khách vãng lai làm việc đó. Nên form chỉ bỏ phản hồi vào
"hộp thư đi" trong `localStorage`; khu quản trị — nơi *có* quyền ghi file — tự
nạp chúng vào CSDL mỗi lần bạn mở mục **Phản hồi**, không phải bấm gì.

Nạp xong thì phản hồi nằm vĩnh viễn trong file, đi theo file, mở ở máy nào cũng
thấy. Nạp hai lần cũng không nhân đôi: chỉ mục `UNIQUE (email, created_at)`
chặn ở tầng CSDL, và bản ghi đã vào CSDL thì bị gỡ khỏi hộp thư đi.

> **Giới hạn không thể lách nếu không có máy chủ:** hộp thư đi nằm trong trình
> duyệt của *khách*, trên *máy* của khách. Khách ở xa gửi form thì phản hồi nằm
> ở máy họ, bạn không với tới được. Ở đây chỉ thấy phản hồi gửi từ chính máy
> đang chạy admin. Muốn nhận phản hồi thật từ khách ở xa thì bắt buộc phải có
> một máy chủ nhận form, hoặc một dịch vụ form bên ngoài.

### Ràng buộc dữ liệu mà giao diện tự giữ

- Không xóa sản phẩm đã nằm trong đơn hàng — gợi ý đánh dấu *hết hàng* thay thế.
- Không xóa danh mục còn sản phẩm — bắt chuyển sản phẩm sang danh mục khác trước.
- Không xóa khách hàng còn đơn hàng.
- Không tự xóa mình, không tự gỡ quyền của mình, không xóa quản trị viên cuối cùng.
- `"order".total_amount` luôn được tính lại từ tổng `order_item.subtotal`, đúng
  bất biến mà `create-db.html` kiểm tra.

---

## Ghi chú kỹ thuật

**File JSON có key dính dấu cách.** Các trường `" moq "`, `" rating "`,
`" price_vnd "` và tên danh mục (`" Giấy "`) đều thừa khoảng trắng ở hai đầu.
Truy cập thẳng `p.price_vnd` sẽ trả về `undefined`. Hàm `pick()` trong
[js/main.js](js/main.js) so khớp tên key sau khi `trim()` nên đọc được cả hai kiểu viết.

**"Sản phẩm mới nhất" suy ra từ `id`.** Dữ liệu không có trường ngày tạo. Phần lớn
`id` là mốc thời gian epoch-ms, nhưng có vài giá trị lệch chuẩn nên không quy đổi ra
ngày thật được. Trang sắp xếp giảm dần theo giá trị số của `id`, coi đó là thứ tự nhập kho.

**5 trong 24 sản phẩm chưa có đánh giá** (`rating: null`). Chúng hiển thị
"Chưa có đánh giá" thay vì 0 sao, và luôn xếp cuối khi sắp xếp theo đánh giá.

**Khung ảnh dùng tỉ lệ 4:3.** Cả 24 ảnh nguồn đều là ảnh ngang cỡ nhỏ (~308px rộng,
tỉ lệ 1.0–1.94), không có ảnh vuông. Khung 4:3 bám sát tỉ lệ phổ biến nhất của bộ ảnh
(14/24 ảnh ở mức 1.25–1.26) nên giảm được khoảng trắng thừa so với khung vuông.

**Form liên hệ không có backend.** Nội dung gửi đi được bỏ vào `localStorage`
(khóa `vgp_feedback`) làm *hộp thư đi*, rồi khu quản trị nạp vào bảng `feedback`
của CSDL — xem mục "Phản hồi khách hàng" ở trên để hiểu vì sao phải đi vòng như
vậy. Khi triển khai thật, thay đoạn lưu đó bằng lời gọi API lên máy chủ.
