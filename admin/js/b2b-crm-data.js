/* ==========================================================================
 * admin/js/b2b-crm-data.js — Bộ dữ liệu & Động cơ tính toán Phễu Khách hàng B2B
 *
 * Bao gồm:
 *   1. 36 Khách hàng B2B mục tiêu (24 KH Tuyến Quận 12 - Hóc Môn & 12 KH Tuyến
 *      Bình Dương - Bình Chánh - Long An), tổng sản lượng 23.850 cuộn/tháng.
 *   2. Động cơ tổng hợp tự động: Khu vực, Nhóm ngành, 7 bước Pipeline,
 *      Thống kê định lượng (Count, Sum, Mean, Median, Min, Max, Std Dev).
 *   3. Động cơ Kiểm toán MOQ (300 - 500 - 1.000 cuộn) & Cảnh báo rủi ro công nợ
 *      cho nhóm Bậc 1 (< 500 cuộn) đang gán chính sách công nợ/đại lý.
 *   4. Lịch đi tuyến gửi mẫu (Sample Run) Thứ 2 -> Thứ 7 & 3 Kịch bản Telesale.
 *   5. Bảng tính Giá vốn, Chiết khấu 3 bậc MOQ & Biên lợi nhuận ròng sau công nợ.
 * ========================================================================== */

(function (Admin) {
  'use strict';

  var STORAGE_KEY_CRM = 'vgp_b2b_crm_v1';
  var STORAGE_KEY_PRICING = 'vgp_b2b_pricing_v1';

  var PIPELINE_STAGES = [
    'Chưa gọi',
    'Không nghe máy / Gọi lại',
    'Đã gọi - Xin gửi mẫu',
    'Đã gửi Sample Kit',
    'Đang báo giá / Thương lượng',
    'Đã chốt đơn',
    'Chưa có nhu cầu'
  ];

  var STAGE_META = {
    'Chưa gọi':                    { step: 1, prob: 0.10, probPct: 10, slaDays: 2, badgeCls: 'bg-secondary',         gateHint: 'Gọi xác minh người phụ trách Thu mua / Quản kho' },
    'Không nghe máy / Gọi lại':    { step: 2, prob: 0.05, probPct: 5,  slaDays: 1, badgeCls: 'bg-warning text-dark', gateHint: 'Đổi khung giờ vàng (8h30-10h30 / 14h-16h) gọi lại sau 24h' },
    'Đã gọi - Xin gửi mẫu':        { step: 3, prob: 0.25, probPct: 25, slaDays: 2, badgeCls: 'bg-info text-dark',    gateHint: 'Bắt buộc có Tên + SĐT người nhận mẫu trước khi xe đi tuyến' },
    'Đã gửi Sample Kit':           { step: 4, prob: 0.50, probPct: 50, slaDays: 2, badgeCls: 'bg-primary',           gateHint: 'Quy tắc 48h vàng: Gọi hỏi kết quả test độ dính OPP / độ dẻo PE' },
    'Đang báo giá / Thương lượng': { step: 5, prob: 0.75, probPct: 75, slaDays: 3, badgeCls: 'bg-primary-emphasis',  gateHint: 'Kiểm toán MOQ & Công nợ, gửi Báo giá PDF 3 bậc qua Zalo' },
    'Đã chốt đơn':                 { step: 6, prob: 1.00, probPct: 100, slaDays: 25, badgeCls: 'bg-success',         gateHint: 'Tạo đơn hàng B2B & hẹn chu kỳ tái đặt hàng (Re-order 25 ngày)' },
    'Chưa có nhu cầu':             { step: 7, prob: 0.00, probPct: 0,  slaDays: 45, badgeCls: 'bg-dark',             gateHint: 'Ghi rõ lý do từ chối & đặt lịch nuôi dưỡng lại sau 30-60 ngày' }
  };

  var LOST_REASONS = [
    'Đang còn hợp đồng / tồn kho NCC cũ (Hẹn gọi lại 30 - 60 ngày)',
    'Giá chào chưa cạnh tranh so với NCC hiện tại',
    'Yêu cầu công nợ dài hạn (45 - 60 ngày) vượt định mức Bậc MOQ',
    'Mẫu thử chưa đạt thông số đặc thù (Độ dính kho lạnh / Độ giãn PE)',
    'Tạm ngưng nhập hàng / Xưởng đang mùa thấp điểm'
  ];

  var SAMPLE_RESULTS = [
    'Chưa gửi',
    'Đang test tại kho',
    'Đạt - Chờ báo giá',
    'Cần chỉnh thông số (MIC/Yard)',
    'Không đạt'
  ];

  var REGIONS = [
    'Quận 12',
    'Hóc Môn',
    'Bình Dương',
    'TP.HCM (KCN)',
    'Long An'
  ];

  var INDUSTRIES = [
    'Logistics & Kho vận',
    'Thực phẩm & FMCG',
    'Thùng Carton & Bao bì',
    'Gỗ & Nội thất',
    'Nông sản & Phân bón'
  ];

  var SALES_REPS = [
    {
      id: 'KAM_VIET',
      name: 'Lê Quốc Việt (KAM Đầu tàu 1.000c)',
      shortName: 'Lê Quốc Việt (KAM)',
      routeFocus: 'Chuyên trách Key Accounts >= 1.000 cuộn/tháng (Toàn tuyến)',
      phone: '0909 818 222',
      badgeCls: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle',
      targetVolume: 5000
    },
    {
      id: 'SALE_TUAN',
      name: 'Nguyễn Minh Tuấn (Tuyến 1: Q12 - Hóc Môn)',
      shortName: 'Minh Tuấn (Q12-HM)',
      routeFocus: 'Tuyến 1: Quận 12 & Hóc Môn (Chạy mẫu T2-T4, Ghép tải T5)',
      phone: '0903 515 668',
      badgeCls: 'bg-primary-subtle text-primary-emphasis border border-primary-subtle',
      targetVolume: 11500
    },
    {
      id: 'SALE_NAM',
      name: 'Trần Hoàng Nam (Tuyến 2: BD - BC - Long An)',
      shortName: 'Hoàng Nam (KCN Tỉnh)',
      routeFocus: 'Tuyến 2: KCN Sóng Thần BD (T3), Vĩnh Lộc BC (T5) & Long An (T7)',
      phone: '0918 727 999',
      badgeCls: 'bg-success-subtle text-success-emphasis border border-success-subtle',
      targetVolume: 7350
    }
  ];

  var DEFAULT_CRM_RECORDS = [
    // ================= TUYẾN 1: QUẬN 12 & HÓC MÔN (24 KH) =================
    {
      code: 'KH01', routeGroup: 'Q12_HM', region: 'Quận 12', ward: 'Thới An',
      industry: 'Logistics & Kho vận', company: 'Công ty TNHH Kho Vận Sài Gòn (Saigon Logistics)',
      address: '102 Đ. Lê Thị Riêng, Thới An, Quận 12, TP.HCM', phone: '028 3636 5857',
      website: 'saigonlogistics.com.vn', contactPerson: '', mainProduct: 'Màng PE Pallet + Băng keo OPP',
      expectedVolume: 800, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Công nợ 30 ngày + Giao tận kho', nextFollowUp: '',
      notes: 'Kho Fulfillment đóng hàng nghìn đơn/ngày & quấn pallet xuất nhập liên tục; nhạy cảm độ dính & độ dẻo PE.'
    },
    {
      code: 'KH02', routeGroup: 'Q12_HM', region: 'Quận 12', ward: 'An Phú Đông',
      industry: 'Logistics & Kho vận', company: 'Quý Long Logistics - Tổng Kho Miền Nam',
      address: '471A QL1A, An Phú Đông, Quận 12, TP.HCM', phone: '0979 256 789',
      website: 'vantaibacnam.vn', contactPerson: '', mainProduct: 'Màng PE quấn kiện lớn',
      expectedVolume: 600, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Giao ghép chuyến QL1A', nextFollowUp: '',
      notes: 'Tổng kho vận tải Bắc Nam, cần PE dai quấn cố định kiện hàng lớn tránh xê dịch khi bốc xếp.'
    },
    {
      code: 'KH03', routeGroup: 'Q12_HM', region: 'Quận 12', ward: 'Thới An',
      industry: 'Logistics & Kho vận', company: 'Kho NETPOST Quận 12 (Logistics & Express)',
      address: '271 Tô Ngọc Vân, Thới An, Quận 12, TP.HCM', phone: '1900 3351',
      website: 'netpost.vn', contactPerson: '', mainProduct: 'Băng keo OPP + Màng PE',
      expectedVolume: 500, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Công nợ gối đầu', nextFollowUp: '',
      notes: 'Kho chuyển phát nhanh, tiêu thụ lượng lớn băng keo niêm phong thùng và PE bọc kiện.'
    },
    {
      code: 'KH04', routeGroup: 'Q12_HM', region: 'Quận 12', ward: 'Tân Chánh Hiệp',
      industry: 'Logistics & Kho vận', company: 'HTL Logistics Solutions',
      address: 'Anna Building, Quận 12, TP.HCM', phone: '028 3866 5665',
      website: 'htlvietnam.com.vn', contactPerson: '', mainProduct: 'Màng PE quấn pallet',
      expectedVolume: 400, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Công nợ linh hoạt', nextFollowUp: '',
      notes: 'Liên hệ phòng Mua hàng xin thông tin kho khai thác để gửi Sample Kit trực tiếp.'
    },
    {
      code: 'KH05', routeGroup: 'Q12_HM', region: 'Quận 12', ward: 'Thới An',
      industry: 'Logistics & Kho vận', company: 'Nhất Tín Logistics - Bưu cục/Kho Quận 12',
      address: '421 Đ. Lê Thị Riêng, Thới An, Quận 12, TP.HCM', phone: '1900 636688',
      website: 'ntlogistics.vn', contactPerson: '', mainProduct: 'Màng PE + Băng keo OPP',
      expectedVolume: 700, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Hợp đồng nguyên tắc', nextFollowUp: '',
      notes: 'Nằm cùng trục Lê Thị Riêng với Saigon Logistics, tiện ghép chuyến gửi mẫu thử cùng buổi.'
    },
    {
      code: 'KH06', routeGroup: 'Q12_HM', region: 'Quận 12', ward: 'An Phú Đông',
      industry: 'Thực phẩm & FMCG', company: 'Công ty CP Thực Phẩm Vĩnh Thành Đạt (Vfood)',
      address: '350/25 Đường T15, An Phú Đông, Quận 12, TP.HCM', phone: '028 3719 9555',
      website: 'vinhthanhdat.com.vn', contactPerson: '', mainProduct: 'Băng keo OPP chịu ẩm + PE',
      expectedVolume: 1000, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Công nợ 30 ngày + Lịch giao cố định', nextFollowUp: '',
      notes: 'Xưởng chế biến & đóng gói thực phẩm quy mô lớn đi siêu thị hàng ngày; cần băng keo bám dính tốt môi trường lạnh/ẩm.'
    },
    {
      code: 'KH07', routeGroup: 'Q12_HM', region: 'Quận 12', ward: 'An Phú Đông',
      industry: 'Thực phẩm & FMCG', company: 'Công ty TNHH SX TM DV Thực Phẩm Toàn Thắng',
      address: '806 5TL47, KP2, An Phú Đông, Quận 12, TP.HCM', phone: '0982 468 139',
      website: 'toanthangfood.com.vn', contactPerson: '', mainProduct: 'Băng keo OPP đủ yard + PE',
      expectedVolume: 400, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Công nợ gối đầu', nextFollowUp: '',
      notes: 'Xưởng thực phẩm đóng thùng carton xuất kho đều đặn, nhấn mạnh cam kết đủ yard và lõi mỏng.'
    },
    {
      code: 'KH08', routeGroup: 'Q12_HM', region: 'Quận 12', ward: 'Thới An',
      industry: 'Thực phẩm & FMCG', company: 'Công ty TNHH SX TM Thực Phẩm Quang Khấp (QKFOODS)',
      address: '490 Lê Văn Khương, Thới An, Quận 12, TP.HCM', phone: '0962 278 145',
      website: '', contactPerson: '', mainProduct: 'Băng keo OPP + Màng PE',
      expectedVolume: 350, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Bao test 1 ngày tại xưởng', nextFollowUp: '',
      notes: 'Tuyến Lê Văn Khương (Thới An), thuận tiện ghé trực tiếp gửi hộp mẫu cho Quản đốc xưởng.'
    },
    {
      code: 'KH09', routeGroup: 'Q12_HM', region: 'Quận 12', ward: 'Thới An',
      industry: 'Thực phẩm & FMCG', company: 'Công ty TNHH Thực Phẩm Xanh Loving',
      address: '147 Đường Thới An 16, Thới An, Quận 12, TP.HCM', phone: '0902 142 222',
      website: 'lovingveganfood.vn', contactPerson: '', mainProduct: 'Băng keo OPP đóng thùng + PE',
      expectedVolume: 500, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Công nợ linh hoạt', nextFollowUp: '',
      notes: 'Sản xuất thực phẩm chay đóng thùng đi phân phối toàn quốc; tiêu thụ đều đặn hàng tháng.'
    },
    {
      code: 'KH10', routeGroup: 'Q12_HM', region: 'Quận 12', ward: 'Hiệp Thành',
      industry: 'Thực phẩm & FMCG', company: 'Công ty TNHH Yakult Việt Nam - Trung Tâm Quận 12',
      address: '4/2C Đ. Bùi Văn Ngữ, Quận 12, TP.HCM', phone: '028 6281 4235',
      website: 'yakult.vn', contactPerson: '', mainProduct: 'Màng PE quấn khay/thùng',
      expectedVolume: 450, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Báo giá sỉ B2B', nextFollowUp: '',
      notes: 'Trung tâm phân phối đồ uống lên men bảo quản lạnh, cần màng PE dẻo không rách ở nhiệt độ mát.'
    },
    {
      code: 'KH11', routeGroup: 'Q12_HM', region: 'Quận 12', ward: 'An Phú Đông',
      industry: 'Thùng Carton & Bao bì', company: 'Công ty CP XNK Bao Bì Boxes Việt Nam',
      address: '117/5 Võ Thị Thừa, An Phú Đông, Quận 12, TP.HCM', phone: '0869 222 247',
      website: 'boxes.com.vn', contactPerson: '', mainProduct: 'Đại lý sỉ OPP & Màng PE',
      expectedVolume: 1000, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Chiết khấu đại lý + Công nợ', nextFollowUp: '',
      notes: 'Xưởng sản xuất thùng carton lớn cho E-commerce; chào làm nhà cung cấp chiến lược để họ bán kèm thùng carton.'
    },
    {
      code: 'KH12', routeGroup: 'Q12_HM', region: 'Quận 12', ward: 'Tân Thới Hiệp',
      industry: 'Thùng Carton & Bao bì', company: 'Bao Bì Tiến Thành - Xưởng Hộp Giấy, Túi Giấy',
      address: '15/11 Nguyễn Thị Căn, Tân Thới Hiệp, Quận 12, TP.HCM', phone: '0965 336 456',
      website: '', contactPerson: '', mainProduct: 'Băng keo OPP + PE bọc pallet giấy',
      expectedVolume: 400, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Giá sỉ đại lý bao bì', nextFollowUp: '',
      notes: 'Vừa dùng PE quấn kiện hộp giấy thành phẩm chống ẩm, vừa có thể nhập sỉ bán chéo cho khách.'
    },
    {
      code: 'KH13', routeGroup: 'Q12_HM', region: 'Quận 12', ward: 'Thới An',
      industry: 'Thùng Carton & Bao bì', company: 'Bao Bì Hùng Anh Quận 12',
      address: '29/1 Thới An, Quận 12, TP.HCM', phone: '0972 377 333',
      website: '', contactPerson: '', mainProduct: 'Đại lý Băng keo OPP & PE',
      expectedVolume: 600, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Công nợ gối đầu đại lý', nextFollowUp: '',
      notes: 'Đánh vào cam kết hàng chuẩn thông số để đại lý giữ uy tín với khách xưởng của họ.'
    },
    {
      code: 'KH14', routeGroup: 'Q12_HM', region: 'Quận 12', ward: 'Tân Thới Nhất',
      industry: 'Thùng Carton & Bao bì', company: 'Công ty TNHH Bao Bì Đức Ân',
      address: '22 Đường Tân Thới Nhất 7, Quận 12, TP.HCM', phone: '0903 137 696',
      website: 'ducanlabel.vn', contactPerson: '', mainProduct: 'Băng keo OPP + Màng PE',
      expectedVolume: 350, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Giao nhanh + Công nợ', nextFollowUp: '',
      notes: 'Xưởng in ấn tem nhãn & bao bì, cần băng keo dán thùng thành phẩm và PE bọc kiện giao khách.'
    },
    {
      code: 'KH15', routeGroup: 'Q12_HM', region: 'Hóc Môn', ward: 'Bà Điểm',
      industry: 'Gỗ & Nội thất', company: 'Công ty TNHH SX KD Nội Thất Tân Á Châu',
      address: '59/9 Ấp Tiền Lân, Bà Điểm, Hóc Môn, TP.HCM', phone: '0919 446 263',
      website: 'sofatanachau.com', contactPerson: '', mainProduct: 'Màng PE khổ rộng quấn Sofa',
      expectedVolume: 800, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Công nợ 30 ngày + Bao đổi trả', nextFollowUp: '',
      notes: 'Xưởng sản xuất sofa lớn; bắt buộc quấn nhiều lớp màng PE độ co giãn cao không đứt ở góc cạnh.'
    },
    {
      code: 'KH16', routeGroup: 'Q12_HM', region: 'Hóc Môn', ward: 'Bà Điểm',
      industry: 'Gỗ & Nội thất', company: 'Công ty SX Nội Thất Gỗ Tự Nhiên Huỳnh Gia Mộc',
      address: '29/11W Đông Lân - Hưng Lân, Bà Điểm, Hóc Môn, TP.HCM', phone: '0916 866 782',
      website: 'huynhgiamoc.vn', contactPerson: '', mainProduct: 'Màng PE quấn nội thất gỗ + OPP',
      expectedVolume: 600, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Giao theo lịch xuất xưởng', nextFollowUp: '',
      notes: 'Nội thất gỗ tự nhiên cao cấp cần quấn PE kỹ chống trầy xước và bụi bẩn khi vận chuyển lắp đặt.'
    },
    {
      code: 'KH17', routeGroup: 'Q12_HM', region: 'Hóc Môn', ward: 'Tân Hiệp',
      industry: 'Gỗ & Nội thất', company: 'Công ty CP XD - Trang Trí Nội Thất Ngô Gia',
      address: '141/6C Đ. Song Hành QL22, Hóc Môn, TP.HCM', phone: '028 6251 2846',
      website: '', contactPerson: '', mainProduct: 'Màng PE quấn tay + Băng keo',
      expectedVolume: 450, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Công nợ linh hoạt', nextFollowUp: '',
      notes: 'Nằm ngay trục Song Hành QL22, rất thuận tiện cho xe tải ghép chuyến giao hàng.'
    },
    {
      code: 'KH18', routeGroup: 'Q12_HM', region: 'Hóc Môn', ward: 'Xuân Thới Thượng',
      industry: 'Gỗ & Nội thất', company: 'Xưởng Gia Công Gỗ Nội Thất Biển Đông Nam Á',
      address: '187/11 ĐH65B, Ấp 10, Hóc Môn, TP.HCM', phone: 'Liên hệ trực tiếp',
      website: '', contactPerson: '', mainProduct: 'Màng PE bọc ván/đồ gỗ',
      expectedVolume: 400, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Gửi mẫu trực tiếp tại xưởng', nextFollowUp: '',
      notes: 'Kết hợp ghé trực tiếp khi đi phát mẫu khu vực Bà Điểm - Xuân Thới Thượng.'
    },
    {
      code: 'KH19', routeGroup: 'Q12_HM', region: 'Hóc Môn', ward: 'Tân Thới Nhì',
      industry: 'Logistics & Kho vận', company: 'Logistik Unicorp Vietnam',
      address: '3/40E Dương Công Khi, Ấp Tân Thới Nhì 10, Hóc Môn, TP.HCM', phone: '0928 177 288',
      website: 'logistikvietnam.com', contactPerson: '', mainProduct: 'Màng PE quấn pallet + OPP',
      expectedVolume: 750, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Công nợ 30 ngày', nextFollowUp: '',
      notes: 'Đơn vị kho vận chuyên nghiệp trên trục Dương Công Khi, sản lượng PE quấn pallet ổn định.'
    },
    {
      code: 'KH20', routeGroup: 'Q12_HM', region: 'Hóc Môn', ward: 'Tân Xuân',
      industry: 'Logistics & Kho vận', company: 'Công ty TNHH Minh Phú Logistics',
      address: '8 Phạm Thị Vàng, Ấp Mới 1, Hóc Môn, TP.HCM', phone: 'Liên hệ web',
      website: 'minhphulogistics.com', contactPerson: '', mainProduct: 'Màng PE + Băng keo OPP',
      expectedVolume: 500, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Ghép chuyến xe tải', nextFollowUp: '',
      notes: 'Kho bãi vận tải hàng hóa, cần nguồn cung PE chuẩn lõi để tối ưu chi phí đóng kiện.'
    },
    {
      code: 'KH21', routeGroup: 'Q12_HM', region: 'Hóc Môn', ward: 'Xuân Thới Thượng',
      industry: 'Thùng Carton & Bao bì', company: 'Công ty TNHH SX Bao Bì Tân Thuận Thiên',
      address: '19/2M Đường Huỳnh Thị Mài, Hóc Môn, TP.HCM', phone: '028 6257 0646',
      website: 'tanthuanthienco.com', contactPerson: '', mainProduct: 'Đại lý sỉ Băng keo & PE',
      expectedVolume: 600, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Chiết khấu đại lý + Công nợ', nextFollowUp: '',
      notes: 'Xưởng sản xuất bao bì lâu năm tại Hóc Môn, tiềm năng lấy sỉ định kỳ số lượng lớn.'
    },
    {
      code: 'KH22', routeGroup: 'Q12_HM', region: 'Hóc Môn', ward: 'Tân Hiệp',
      industry: 'Thùng Carton & Bao bì', company: 'Công ty TNHH Bao Bì Việt',
      address: 'Tân Hiệp Vĩnh Lộc, Hóc Môn, TP.HCM', phone: '0939 432 068',
      website: 'baobiviet.vn', contactPerson: '', mainProduct: 'Băng keo OPP + Màng PE',
      expectedVolume: 550, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Công nợ gối đầu', nextFollowUp: '',
      notes: 'Chào giải pháp cung ứng bổ trợ băng keo đủ yard cho tệp khách hàng bao bì sẵn có của họ.'
    },
    {
      code: 'KH23', routeGroup: 'Q12_HM', region: 'Hóc Môn', ward: 'Xuân Thới Sơn',
      industry: 'Thùng Carton & Bao bì', company: 'Công ty TNHH SX Nhựa Vĩnh Phát P.P',
      address: '36D Dương Công Khi, Ấp 4, Xuân Thới Sơn, Hóc Môn, TP.HCM', phone: '0908 557 011',
      website: '', contactPerson: '', mainProduct: 'Băng keo OPP dán thùng + PE',
      expectedVolume: 450, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Giao ghép tuyến Dương Công Khi', nextFollowUp: '',
      notes: 'Cùng trục đường Dương Công Khi với Logistik Unicorp, gộp chung lịch đi gửi Sample Kit.'
    },
    {
      code: 'KH24', routeGroup: 'Q12_HM', region: 'Hóc Môn', ward: 'Thị trấn Hóc Môn',
      industry: 'Thùng Carton & Bao bì', company: 'Công ty CP Bao Bì Nhựa Mạnh Tiến Phát',
      address: '139 Đ. Lê Lợi, Hóc Môn, TP.HCM', phone: '0909 545 950',
      website: '', contactPerson: '', mainProduct: 'Đại lý phân phối OPP & PE',
      expectedVolume: 700, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Giá sỉ theo MOQ 500-1000 cuộn', nextFollowUp: '',
      notes: 'Cửa hàng/công ty phân phối bao bì nhựa lớn trên đường Lê Lợi, tiềm năng nhập sỉ đều hàng tháng.'
    },

    // ================= TUYẾN 2: BÌNH DƯƠNG - BÌNH CHÁNH - LONG AN (12 KH) =================
    {
      code: 'BD01', routeGroup: 'BD_BC_LA', region: 'Bình Dương', ward: 'KCN Sóng Thần 2 (Dĩ An)',
      industry: 'Logistics & Kho vận', company: 'Tổng kho Sóng Thần - Công ty CP Kho Vận Bình Minh',
      address: 'Đường ĐT 743, KCN Sóng Thần 2, Dĩ An, Bình Dương', phone: 'Liên hệ BQL/Thu mua',
      website: '', contactPerson: '', mainProduct: 'Màng PE quấn pallet chuẩn lõi',
      expectedVolume: 1000, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Ghép chuyến Thứ 3 + Công nợ', nextFollowUp: '',
      notes: 'Tổng kho trung chuyển lớn, tần suất quấn pallet lên xuống container liên tục.'
    },
    {
      code: 'BD02', routeGroup: 'BD_BC_LA', region: 'Bình Dương', ward: 'Thuận An / Dĩ An',
      industry: 'Logistics & Kho vận', company: 'Kho trung chuyển Eimskip DC1',
      address: 'KP Bình Thuận 2, Thuận An / Dĩ An, Bình Dương', phone: 'Liên hệ phòng Mua hàng',
      website: 'eimskip.vn', contactPerson: '', mainProduct: 'Màng PE + Băng keo OPP',
      expectedVolume: 800, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Công nợ 30 ngày', nextFollowUp: '',
      notes: 'Chuyên fulfillment & phân phối quốc tế, yêu cầu khắt khe về độ dày MIC và chiều dài thực.'
    },
    {
      code: 'BD03', routeGroup: 'BD_BC_LA', region: 'Bình Dương', ward: 'KCN Sóng Thần (Dĩ An)',
      industry: 'Logistics & Kho vận', company: 'Tổng kho Gemadept Logistics Sóng Thần',
      address: 'KCN Sóng Thần, Dĩ An, Bình Dương', phone: 'Liên hệ bộ phận Vật tư',
      website: 'gemadeptlogistics.com.vn', contactPerson: '', mainProduct: 'Màng PE quấn máy & quấn tay',
      expectedVolume: 1000, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Hợp đồng cung ứng định kỳ', nextFollowUp: '',
      notes: 'Tiêu thụ sản lượng lớn, ưu tiên gửi Hồ sơ năng lực + Sample Kit cho trưởng kho.'
    },
    {
      code: 'BD04', routeGroup: 'BD_BC_LA', region: 'Bình Dương', ward: 'KCN Sóng Thần (Dĩ An)',
      industry: 'Thực phẩm & FMCG', company: 'Hệ thống NPP Vệ tinh PepsiCo / Uni-President',
      address: 'Quanh KCN Sóng Thần, Dĩ An, Bình Dương', phone: 'Khảo sát trực tiếp',
      website: '', contactPerson: '', mainProduct: 'Màng PE quấn pallet nước/thực phẩm',
      expectedVolume: 900, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Công nợ gối đầu linh hoạt', nextFollowUp: '',
      notes: 'Các NPP cấp 1 ngành FMCG xuất hàng mỗi ngày, rất cần PE dẻo và công nợ linh hoạt.'
    },
    {
      code: 'BC01', routeGroup: 'BD_BC_LA', region: 'TP.HCM (KCN)', ward: 'KCN Vĩnh Lộc (Bình Chánh)',
      industry: 'Thực phẩm & FMCG', company: 'Công ty CP Thực Phẩm Cholimex',
      address: 'Lô C40-43/1 Đường 7, KCN Vĩnh Lộc, Bình Chánh, TP.HCM', phone: 'Liên hệ P. Thu mua',
      website: 'cholimexfood.com.vn', contactPerson: '', mainProduct: 'Băng keo OPP dán thùng + PE',
      expectedVolume: 1000, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Ghép chuyến Thứ 5 + Công nợ', nextFollowUp: '',
      notes: 'Đóng gói tương ớt, nước chấm số lượng khổng lồ bằng thùng carton và quấn pallet xuất khẩu.'
    },
    {
      code: 'BC02', routeGroup: 'BD_BC_LA', region: 'TP.HCM (KCN)', ward: 'KCN Vĩnh Lộc (Bình Chánh)',
      industry: 'Thực phẩm & FMCG', company: 'Công ty Thủy Hải Sản Việt Nhật',
      address: 'Lô C34/I Đường 2G, KCN Vĩnh Lộc, Bình Chánh, TP.HCM', phone: 'Liên hệ P. Vật tư',
      website: '', contactPerson: '', mainProduct: 'Băng keo OPP chịu lạnh + PE',
      expectedVolume: 700, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Bao test độ dính kho lạnh', nextFollowUp: '',
      notes: 'Ngành thủy sản đông lạnh cần băng keo độ bám dính cao không bong tróc trong môi trường ẩm/lạnh.'
    },
    {
      code: 'BC03', routeGroup: 'BD_BC_LA', region: 'TP.HCM (KCN)', ward: 'KCN Vĩnh Lộc (Bình Chánh)',
      industry: 'Thực phẩm & FMCG', company: 'Công ty SX TM Tân Quang Minh (Nước giải khát Bidrico)',
      address: 'Lô C21-23/I Đường 2F, KCN Vĩnh Lộc, Bình Chánh, TP.HCM', phone: 'Liên hệ P. Cung ứng',
      website: 'bidrico.com.vn', contactPerson: '', mainProduct: 'Màng PE quấn pallet + OPP',
      expectedVolume: 900, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Công nợ 30 ngày', nextFollowUp: '',
      notes: 'Hàng nước giải khát nặng, cần màng PE độ căng kéo tốt để giữ vững kiện hàng trên pallet.'
    },
    {
      code: 'BC04', routeGroup: 'BD_BC_LA', region: 'TP.HCM (KCN)', ward: 'KCN Vĩnh Lộc (Bình Chánh)',
      industry: 'Thùng Carton & Bao bì', company: 'Công ty Bao Bì Sài Gòn & Bao Bì Visingpack',
      address: 'Lô B56-57 Đường 2E & Lô C10/I Đường 2F, KCN Vĩnh Lộc', phone: 'Liên hệ P. Kinh doanh/Mua hàng',
      website: '', contactPerson: '', mainProduct: 'Đại lý cấp 1 OPP & Màng PE',
      expectedVolume: 800, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Giá sỉ nhà máy + Công nợ', nextFollowUp: '',
      notes: 'Hợp tác cung ứng chéo băng keo & PE cho tệp khách hàng mua thùng carton của họ.'
    },
    {
      code: 'LA01', routeGroup: 'BD_BC_LA', region: 'Long An', ward: 'KCN Thủ Thừa (Thủ Thừa)',
      industry: 'Nông sản & Phân bón', company: 'Công ty TNHH Lương Thực Dương Gia Bảo',
      address: 'KCN Thủ Thừa, Thị trấn Thủ Thừa, Long An', phone: 'Liên hệ Quản đốc kho',
      website: '', contactPerson: '', mainProduct: 'Màng PE quấn kiện bao tải',
      expectedVolume: 600, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Ghép chuyến Thứ 7 + Công nợ', nextFollowUp: '',
      notes: 'Ngành lương thực đóng bao trên pallet, cần màng PE chống bụi ẩm và cố định bao.'
    },
    {
      code: 'LA02', routeGroup: 'BD_BC_LA', region: 'Long An', ward: 'KCN Thủ Thừa (Thủ Thừa)',
      industry: 'Nông sản & Phân bón', company: 'Công ty TNHH Xuất Nhập Khẩu Nina Agro',
      address: 'KCN Thủ Thừa, Thị trấn Thủ Thừa, Long An', phone: 'Liên hệ P. Thu mua',
      website: '', contactPerson: '', mainProduct: 'Màng PE + Băng keo xuất khẩu',
      expectedVolume: 650, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Cam kết chuẩn thông số', nextFollowUp: '',
      notes: 'Nông sản xuất khẩu đòi hỏi đóng gói chắc chắn, đủ tiêu chuẩn lưu kho và vận chuyển container.'
    },
    {
      code: 'LA03', routeGroup: 'BD_BC_LA', region: 'Long An', ward: 'KCN Thủ Thừa (Thủ Thừa)',
      industry: 'Nông sản & Phân bón', company: 'Công ty Cổ phần Phân Bón Nutri One',
      address: 'KCN Thủ Thừa, Thị trấn Thủ Thừa, Long An', phone: 'Liên hệ P. Vật tư',
      website: '', contactPerson: '', mainProduct: 'Màng PE dày quấn bao phân bón',
      expectedVolume: 800, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Ghép chuyến Thứ 7 ưu đãi cước', nextFollowUp: '',
      notes: 'Bao phân bón nặng và dễ rách, cần màng PE dày (17-20 mic) quấn chặt tránh đổ vỡ khi nâng hạ.'
    },
    {
      code: 'LA04', routeGroup: 'BD_BC_LA', region: 'Long An', ward: 'KCN Vĩnh Lộc 2 (Bến Lức)',
      industry: 'Logistics & Kho vận', company: 'Kho lạnh Eimskip Long An',
      address: 'Lô E2-E3 Đường VL7, KCN Vĩnh Lộc 2, Bến Lức, Long An', phone: 'Liên hệ Quản lý kho',
      website: 'eimskip.vn', contactPerson: '', mainProduct: 'Màng PE & Băng keo chịu nhiệt thấp',
      expectedVolume: 850, status: 'Chưa gọi', lastCallDate: '', sampleSentDate: '',
      sampleResult: 'Chưa gửi', policy: 'Đồng bộ cùng Eimskip DC1 Dĩ An', nextFollowUp: '',
      notes: 'Nhu cầu vật tư đóng gói chịu nhiệt độ kho lạnh cực lớn; nằm ngay giáp ranh Bến Lức - Thủ Thừa.'
    }
  ];

  var WEEKLY_SCHEDULE = [
    {
      day: 'Thứ 2',
      route: 'Quận 12 (Đợt 1)',
      cluster: 'Thới An - An Phú Đông - Tân Thới Hiệp',
      morning: 'Gọi Telesale toàn bộ 14 KH Quận 12 để xin tên người nhận mẫu & xác nhận địa chỉ kho.',
      afternoon: 'Chạy xe máy đi rải 8-10 Hộp Sample Kit dọc trục Lê Thị Riêng, Lê Văn Khương, QL1A.',
      badge: 'primary'
    },
    {
      day: 'Thứ 3',
      route: 'Bình Dương (Dĩ An)',
      cluster: 'KCN Sóng Thần 1 & 2 - Thuận An',
      morning: 'Ghép chuyến xe tải giao đơn sỉ (300-1000 cuộn) cho khách Bình Dương.',
      afternoon: 'Ghé phát Sample Kit trực tiếp cho các Tổng kho Logistics & NPP FMCG tại Sóng Thần.',
      badge: 'success'
    },
    {
      day: 'Thứ 4',
      route: 'Hóc Môn',
      cluster: 'Bà Điểm - Xuân Thới Sơn - Tân Hiệp',
      morning: 'Gọi Telesale 10 KH Hóc Môn (Xưởng Sofa/Gỗ & Bao bì) hẹn gửi mẫu.',
      afternoon: 'Chạy tuyến Bà Điểm - Dương Công Khi - QL22 phát Sample Kit màng PE khổ rộng cho các xưởng gỗ.',
      badge: 'warning'
    },
    {
      day: 'Thứ 5',
      route: 'Bình Chánh & Quận 12',
      cluster: 'KCN Vĩnh Lộc - Tân Thới Nhất',
      morning: 'Ghép chuyến xe tải giao đơn tuyến Quận 12 - Hóc Môn - Bình Chánh.',
      afternoon: 'Gọi Follow-up (Cuộc gọi 2) cho các KH Quận 12 đã nhận mẫu từ Thứ 2 để lấy kết quả test & báo giá.',
      badge: 'info'
    },
    {
      day: 'Thứ 6',
      route: 'Hóc Môn & Bình Dương',
      cluster: 'Toàn tuyến đã gửi mẫu trong tuần',
      morning: 'Gọi Follow-up (Cuộc gọi 2) cho KH Hóc Môn & Dĩ An; gửi bảng giá công nợ qua Zalo/Email.',
      afternoon: 'Chốt danh sách đơn hàng lớn cần xếp xe tải cho Thứ 7 và đầu tuần sau.',
      badge: 'secondary'
    },
    {
      day: 'Thứ 7',
      route: 'Long An',
      cluster: 'KCN Vĩnh Lộc 2 (Bến Lức) - KCN Thủ Thừa',
      morning: 'Chạy tuyến xe tải giao hàng & kết hợp gửi Sample Kit cho cụm Bến Lức - Thủ Thừa.',
      afternoon: 'Tổng kết CRM tuần: Cập nhật trạng thái phễu, lọc danh sách KH cần gọi lại vào Thứ 2.',
      badge: 'danger'
    }
  ];

  var SAMPLE_KIT_SPECS = '1 cuộn Màng PE chuẩn lõi mỏng + 2 cuộn Băng keo OPP (1 trong, 1 đục đủ yard) + Bảng thông số kỹ thuật (ghi rõ độ dày MIC, trọng lượng lõi gram, chiều dài thực) + Card Visit / QR Zalo nhận báo giá sỉ.';

  var TELESALE_SCRIPTS = [
    {
      id: 'call1',
      title: 'Kịch bản Cuộc gọi 1 (Xin gửi mẫu Sample Kit)',
      template: '“Chào anh/chị {contact}, em gọi từ xưởng Băng keo & Màng PE Vũ Gia Phát. Kho {company} mình đóng hàng và quấn pallet liên tục, không biết dạo này các bạn kho có gặp tình trạng mua phải PE lõi giấy quá dày hay băng keo thiếu yard làm đội chi phí không ạ? Bên em cam kết chuẩn thông số, lõi mỏng, bao kéo căng không đứt. Chiều nay xe bên em đi ngang {location}, em gửi tặng kho mình 1 hộp mẫu miễn phí để anh em quấn thử nhé?”'
    },
    {
      id: 'call2',
      title: 'Kịch bản Cuộc gọi 2 (Follow-up sau 2 ngày nhận mẫu)',
      template: '“Chào anh/chị {contact}, hôm trước bên em có gửi bộ mẫu PE và băng keo OPP qua kho {company} mình, các bạn đóng gói test thử độ dai và độ dính thấy ổn chứ ạ? Với định mức lấy từ 300 - 1.000 cuộn, bên em hỗ trợ công nợ gối đầu linh hoạt và miễn phí ghép chuyến xe tải giao tận kho tại {location} (báo trước 1-2 ngày). Em gửi bảng giá sỉ tốt nhất qua Zalo để anh/chị đối chiếu chi phí cho đợt nhập tháng này nhé?”'
    },
    {
      id: 'agency',
      title: 'Kịch bản Chào Đại lý Bao bì / Xưởng Carton',
      template: '“Chào anh/chị {contact}, em thấy bên {company} mình chuyên cung cấp thùng carton và bao bì ở {location}. Khách mua thùng carton thường hỏi mua kèm băng keo OPP và màng PE. Bên em chuyên bỏ sỉ nguồn hàng đủ yard, chuẩn lõi với giá gốc tận xưởng và hỗ trợ công nợ để bên mình phân phối kèm tăng doanh thu mà không lo chôn vốn. Em gửi mẫu và bảng chiết khấu đại lý qua anh/chị xem thử nhé?”'
    }
  ];

  var DEFAULT_PRICING_CONFIG = {
    workingCapitalRateMonthly: 1.2, // %/tháng
    truckFeePerRoll: 500,           // VNĐ/cuộn
    tier2DiscountPct: 4.0,          // % CK Bậc 2 (500-799 cuộn)
    tier2CreditDays: 15,            // Số ngày công nợ Bậc 2
    tier3DiscountPct: 8.0,          // % CK Bậc 3 (800-1000+ cuộn)
    tier3CreditDays: 30,            // Số ngày công nợ Bậc 3
    products: [
      {
        code: 'PE-01',
        name: 'Màng PE Quấn Tay 50cm (17 mic - 20 mic, chuẩn lõi giấy mỏng)',
        targetIndustries: 'Logistics, Kho vận, Thực phẩm, FMCG',
        factoryCost: 92000,
        tier1BasePrice: 115000
      },
      {
        code: 'PE-02',
        name: 'Màng PE Khổ Rộng Quấn Sofa & Nội Thất Gỗ (độ giãn cao)',
        targetIndustries: 'Gỗ & Nội thất (Bà Điểm, Hóc Môn)',
        factoryCost: 135000,
        tier1BasePrice: 168000
      },
      {
        code: 'PE-03',
        name: 'Màng PE Quấn Pallet Chịu Lạnh / Bao Tải Nặng',
        targetIndustries: 'Kho lạnh, Thủy sản, Nông sản & Phân bón',
        factoryCost: 108000,
        tier1BasePrice: 135000
      },
      {
        code: 'OPP-01',
        name: 'Băng Keo OPP Trong / Đục 48mm x 100 Yard (cam kết đủ yard)',
        targetIndustries: 'Thực phẩm, E-commerce, Thùng Carton',
        factoryCost: 8800,
        tier1BasePrice: 11500
      },
      {
        code: 'OPP-02',
        name: 'Băng Keo OPP Trong / Đục 48mm x 200 Yard (cuộn lớn tiết kiệm lõi)',
        targetIndustries: 'Xưởng sản xuất, Đại lý bao bì B2B',
        factoryCost: 16800,
        tier1BasePrice: 21500
      }
    ]
  };

  /* ======================================================================
   * HÀM ĐỌC / LƯU DỮ LIỆU & PHÂN CÔNG SALES PHỤ TRÁCH TUYẾN
   * ====================================================================== */

  function getSalesRepInfo(recOrId) {
    var repId = '';
    if (typeof recOrId === 'string') {
      repId = recOrId;
    } else if (recOrId && typeof recOrId === 'object') {
      if (recOrId.assignedSales) {
        repId = recOrId.assignedSales;
      } else {
        var vol = Number(recOrId.expectedVolume) || 0;
        var isRoute1 = recOrId.routeGroup === 'Q12_HM' || recOrId.region === 'Quận 12' || recOrId.region === 'Hóc Môn';
        if (vol >= 1000) repId = 'KAM_VIET';
        else if (isRoute1) repId = 'SALE_TUAN';
        else repId = 'SALE_NAM';
      }
    }
    return SALES_REPS.find(function (s) { return s.id === repId; }) || SALES_REPS[1];
  }

  function ensureSalesAssigned(list) {
    if (!Array.isArray(list)) return [];
    list.forEach(function (r) {
      if (!r.assignedSales) {
        r.assignedSales = getSalesRepInfo(r).id;
      }
    });
    return list;
  }

  function getRecords() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY_CRM);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return ensureSalesAssigned(parsed);
      }
    } catch (e) {}
    return ensureSalesAssigned(JSON.parse(JSON.stringify(DEFAULT_CRM_RECORDS)));
  }

  function saveRecords(records) {
    try {
      localStorage.setItem(STORAGE_KEY_CRM, JSON.stringify(ensureSalesAssigned(records)));
    } catch (e) {}
  }

  function resetDefaultRecords() {
    var fresh = ensureSalesAssigned(JSON.parse(JSON.stringify(DEFAULT_CRM_RECORDS)));
    saveRecords(fresh);
    return fresh;
  }

  function exportBackupPayload() {
    var records = getRecords();
    var pricing = getPricingConfig();
    return {
      schemaVersion: '4.0-kanban-7step-b2b',
      exportedAt: new Date().toISOString(),
      company: 'Băng Keo Vũ Gia Phát — CRM B2B Pipeline',
      totalRecords: records.length,
      records: records,
      pricingConfig: pricing
    };
  }

  function importBackupPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return { ok: false, error: 'Dữ liệu JSON không hợp lệ.' };
    }
    var records = Array.isArray(payload) ? payload : payload.records;
    if (!Array.isArray(records) || records.length === 0) {
      return { ok: false, error: 'File JSON không chứa danh sách khách hàng B2B hợp lệ.' };
    }
    saveRecords(records);
    if (payload.pricingConfig && Array.isArray(payload.pricingConfig.products)) {
      savePricingConfig(payload.pricingConfig);
    }
    return { ok: true, count: records.length };
  }

  function addActivity(code, type, note) {
    var list = getRecords();
    var rec = list.find(function (r) { return r.code === code; });
    if (!rec) return null;
    if (!Array.isArray(rec.activities)) rec.activities = [];
    var now = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var timeStr = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ' - ' +
                  pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + '/' + now.getFullYear();
    rec.activities.unshift({
      time: timeStr,
      type: type || 'Ghi chú CRM',
      note: note || ''
    });
    saveRecords(list);
    return rec;
  }

  function getPricingConfig() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY_PRICING);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.products)) return parsed;
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_PRICING_CONFIG));
  }

  function savePricingConfig(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY_PRICING, JSON.stringify(cfg));
    } catch (e) {}
  }

  /* ======================================================================
   * HÀM PHÂN BẬC MOQ, LỊCH XE & KIỂM TOÁN CÔNG NỢ
   * ====================================================================== */

  function getTierInfo(volume) {
    var v = Number(volume) || 0;
    if (v >= 800) {
      return {
        code: 'TIER-3',
        name: 'Bậc 3: 800 - 1.000 cuộn',
        shortLabel: 'Bậc 3 (800-1.000c)',
        badgeCls: 'bg-success-subtle text-success-emphasis border border-success-subtle',
        maxCreditDays: 30,
        recommendation: 'Giá Đại lý cấp 1; Công nợ 30 ngày theo HĐ nguyên tắc; Ưu tiên lịch xe tải tận kho.'
      };
    }
    if (v >= 500) {
      return {
        code: 'TIER-2',
        name: 'Bậc 2: 500 - 799 cuộn',
        shortLabel: 'Bậc 2 (500-799c)',
        badgeCls: 'bg-primary-subtle text-primary-emphasis border border-primary-subtle',
        maxCreditDays: 15,
        recommendation: 'Hưởng CK Bậc 2; Công nợ gối đầu 15 ngày; Miễn phí giao ghép chuyến Thứ 3 - Thứ 5 - Thứ 7.'
      };
    }
    return {
      code: 'TIER-1',
      name: 'Bậc 1: 300 - 499 cuộn',
      shortLabel: 'Bậc 1 (<500c)',
      badgeCls: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle',
      maxCreditDays: 0,
      recommendation: 'Giá sỉ cơ sở (0% CK); Thanh toán COD hoặc gối đầu tối đa 7 ngày; Ghép chuyến báo trước 1-2 ngày.'
    };
  }

  function getRecommendedTruckSchedule(rec) {
    if (rec.region === 'Bình Dương') return 'Thứ 3 cố định (Tuyến Dĩ An - Sóng Thần)';
    if (rec.region === 'Long An') return 'Thứ 7 cố định (Tuyến Bến Lức - Thủ Thừa)';
    if (rec.region === 'TP.HCM (KCN)') return 'Thứ 5 cố định (Tuyến KCN Vĩnh Lộc - Bình Chánh)';
    if (rec.region === 'Hóc Môn') return 'Thứ 4 (Sample) & Thứ 5 (Xe tải ghép chuyến QL22 - Bà Điểm)';
    return 'Thứ 2 (Sample) & Thứ 5 (Xe tải ghép chuyến Q12 - QL1A)';
  }

  function auditRecord(rec) {
    var v = Number(rec.expectedVolume) || 0;
    var tier = getTierInfo(v);
    var pol = String(rec.policy || '').toLowerCase();
    var hasCreditOrAgency = pol.indexOf('công nợ') !== -1 || pol.indexOf('đại lý') !== -1;
    var isRisk = v < 500 && hasCreditOrAgency;
    var upsellNeeded = isRisk ? Math.max(0, 500 - v) : 0;

    var action = 'Đúng chuẩn định mức MOQ';
    if (isRisk) {
      if (rec.code === 'KH04') {
        action = 'Chuyển sang COD hoặc yêu cầu nâng đơn thêm 100 cuộn/tháng để giữ Công nợ gối đầu 15 ngày.';
      } else if (rec.code === 'KH07') {
        action = 'Yêu cầu gom đơn tối thiểu 500 cuộn/lần giao để áp dụng Công nợ gối đầu 15 ngày.';
      } else if (rec.code === 'KH12') {
        action = 'Áp dụng giá sỉ Bậc 1 (COD); chỉ mở chiết khấu Đại lý bao bì khi cam kết lấy đủ 500 cuộn/tháng.';
      } else if (rec.code === 'KH14') {
        action = 'Đơn 350 cuộn chỉ áp dụng thanh toán ngay khi nhận hàng (COD); nâng thêm 150 cuộn nếu muốn công nợ.';
      } else if (rec.code === 'KH17') {
        action = 'Gợi ý chốt đơn 500 cuộn/lần (tăng 50 cuộn) để vừa miễn phí ghép chuyến QL22 vừa mở công nợ 15 ngày.';
      } else {
        action = 'Chuyển sang COD hoặc đàm phán nâng thêm ' + upsellNeeded + ' cuộn/tháng để đạt chuẩn Bậc 2 (500 cuộn).';
      }
    }

    return {
      tier: tier,
      isRisk: isRisk,
      auditLabel: isRisk ? 'CẢNH BÁO: Lệch chuẩn Bậc 1 (Rủi ro công nợ)' : 'Hợp lệ (' + tier.code + ')',
      upsellNeeded: upsellNeeded,
      negotiationAction: action,
      truckSchedule: getRecommendedTruckSchedule(rec)
    };
  }

  /* ======================================================================
   * HÀM THỐNG KÊ TỔNG HỢP DASHBOARD & ĐỊNH LƯỢNG
   * ====================================================================== */

  function isSampleSent(rec) {
    return (rec.sampleResult && rec.sampleResult !== 'Chưa gửi') ||
           rec.status === 'Đã gửi Sample Kit' ||
           rec.status === 'Đang báo giá / Thương lượng' ||
           rec.status === 'Đã chốt đơn' ||
           Boolean(rec.sampleSentDate);
  }

  function isConverted(rec) {
    return rec.status === 'Đã chốt đơn';
  }

  function computeRegionalStats(records) {
    var list = records || getRecords();
    var map = {};
    REGIONS.forEach(function (r) {
      map[r] = { region: r, count: 0, volume: 0, sampleSent: 0, converted: 0 };
    });

    var total = { region: 'TỔNG TOÀN TUYẾN', count: 0, volume: 0, sampleSent: 0, converted: 0 };

    list.forEach(function (rec) {
      var r = map[rec.region] ? rec.region : 'Quận 12';
      var vol = Number(rec.expectedVolume) || 0;
      map[r].count++;
      map[r].volume += vol;
      if (isSampleSent(rec)) map[r].sampleSent++;
      if (isConverted(rec)) map[r].converted++;

      total.count++;
      total.volume += vol;
      if (isSampleSent(rec)) total.sampleSent++;
      if (isConverted(rec)) total.converted++;
    });

    return {
      rows: REGIONS.map(function (r) { return map[r]; }),
      total: total
    };
  }

  function computeIndustryStats(records) {
    var list = records || getRecords();
    var map = {};
    INDUSTRIES.forEach(function (ind) {
      map[ind] = { industry: ind, countQ12HM: 0, countBDBCLA: 0, totalCount: 0, totalVolume: 0 };
    });

    var total = { industry: 'TỔNG CỘNG', countQ12HM: 0, countBDBCLA: 0, totalCount: 0, totalVolume: 0 };

    list.forEach(function (rec) {
      var ind = map[rec.industry] ? rec.industry : 'Logistics & Kho vận';
      var vol = Number(rec.expectedVolume) || 0;
      var isRoute1 = rec.routeGroup === 'Q12_HM' || rec.region === 'Quận 12' || rec.region === 'Hóc Môn';
      if (isRoute1) {
        map[ind].countQ12HM++;
        total.countQ12HM++;
      } else {
        map[ind].countBDBCLA++;
        total.countBDBCLA++;
      }
      map[ind].totalCount++;
      map[ind].totalVolume += vol;

      total.totalCount++;
      total.totalVolume += vol;
    });

    return {
      rows: INDUSTRIES.map(function (ind) { return map[ind]; }),
      total: total
    };
  }

  function computePipelineStats(records) {
    var list = records || getRecords();
    var map = {};
    PIPELINE_STAGES.forEach(function (st) {
      var meta = STAGE_META[st] || { probPct: 0 };
      map[st] = {
        stage: st,
        winProbPct: meta.probPct,
        countQ12HM: 0,
        countBDBCLA: 0,
        totalCount: 0,
        volume: 0,
        monthlyRevenue: 0,
        weightedRevenue: 0,
        monthlyNetProfit: 0,
        weightedNetProfit: 0,
        pct: 0
      };
    });

    var totalCount = list.length || 1;
    var totalQ12HM = 0;
    var totalBDBCLA = 0;
    var totalVolume = 0;
    var totalMonthlyRev = 0;
    var totalWeightedRev = 0;
    var totalMonthlyProfit = 0;
    var totalWeightedProfit = 0;

    list.forEach(function (rec) {
      var st = map[rec.status] ? rec.status : 'Chưa gọi';
      var isRoute1 = rec.routeGroup === 'Q12_HM' || rec.region === 'Quận 12' || rec.region === 'Hóc Môn';
      var vol = Number(rec.expectedVolume) || 0;
      var fin = estimateDealFinancials(rec);

      if (isRoute1) {
        map[st].countQ12HM++;
        totalQ12HM++;
      } else {
        map[st].countBDBCLA++;
        totalBDBCLA++;
      }
      map[st].totalCount++;
      map[st].volume += vol;
      map[st].monthlyRevenue += fin.monthlyRevenue;
      map[st].weightedRevenue += fin.weightedRevenue;
      map[st].monthlyNetProfit += fin.monthlyNetProfit;
      map[st].weightedNetProfit += fin.weightedNetProfit;

      totalVolume += vol;
      totalMonthlyRev += fin.monthlyRevenue;
      totalWeightedRev += fin.weightedRevenue;
      totalMonthlyProfit += fin.monthlyNetProfit;
      totalWeightedProfit += fin.weightedNetProfit;
    });

    var rows = PIPELINE_STAGES.map(function (st) {
      var item = map[st];
      item.pct = Math.round((item.totalCount / totalCount) * 1000) / 10;
      return item;
    });

    return {
      rows: rows,
      total: {
        stage: 'TỔNG CỘNG TOÀN PHỄU',
        countQ12HM: totalQ12HM,
        countBDBCLA: totalBDBCLA,
        totalCount: list.length,
        volume: totalVolume,
        monthlyRevenue: totalMonthlyRev,
        weightedRevenue: totalWeightedRev,
        monthlyNetProfit: totalMonthlyProfit,
        weightedNetProfit: totalWeightedProfit,
        pct: 100
      }
    };
  }

  function computeLostReasonStats(records) {
    var list = records || getRecords();
    var lostList = list.filter(function (r) { return r.status === 'Chưa có nhu cầu'; });
    var map = {};
    LOST_REASONS.forEach(function (rs) {
      map[rs] = { reason: rs, count: 0, volume: 0 };
    });
    lostList.forEach(function (r) {
      var rs = r.lostReason && map[r.lostReason] ? r.lostReason : LOST_REASONS[0];
      map[rs].count++;
      map[rs].volume += (Number(r.expectedVolume) || 0);
    });
    return {
      totalLost: lostList.length,
      totalLostVolume: lostList.reduce(function (s, r) { return s + (Number(r.expectedVolume) || 0); }, 0),
      rows: LOST_REASONS.map(function (rs) { return map[rs]; })
    };
  }

  function computeQuantitativeMetrics(records) {
    var list = records || getRecords();
    var vols = list.map(function (r) { return Number(r.expectedVolume) || 0; }).sort(function (a, b) { return a - b; });
    var n = vols.length;
    if (!n) {
      return { count: 0, sum: 0, mean: 0, median: 0, min: 0, max: 0, stdDev: 0, innerMean: 0, kcnMean: 0 };
    }
    var sum = vols.reduce(function (a, b) { return a + b; }, 0);
    var mean = sum / n;
    var mid = Math.floor(n / 2);
    var median = n % 2 === 0 ? (vols[mid - 1] + vols[mid]) / 2 : vols[mid];
    var min = vols[0];
    var max = vols[n - 1];

    var variance = vols.reduce(function (acc, v) {
      return acc + Math.pow(v - mean, 2);
    }, 0) / n;
    var stdDev = Math.sqrt(variance);

    var innerVols = list.filter(function (r) { return r.region === 'Quận 12' || r.region === 'Hóc Môn'; });
    var kcnVols = list.filter(function (r) { return r.region !== 'Quận 12' && r.region !== 'Hóc Môn'; });
    var innerMean = innerVols.length ? innerVols.reduce(function (a, r) { return a + (Number(r.expectedVolume) || 0); }, 0) / innerVols.length : 0;
    var kcnMean = kcnVols.length ? kcnVols.reduce(function (a, r) { return a + (Number(r.expectedVolume) || 0); }, 0) / kcnVols.length : 0;

    return {
      count: n,
      sum: sum,
      mean: Math.round(mean * 10) / 10,
      median: Math.round(median * 10) / 10,
      min: min,
      max: max,
      stdDev: Math.round(stdDev * 10) / 10,
      innerMean: Math.round(innerMean * 10) / 10,
      kcnMean: Math.round(kcnMean * 10) / 10
    };
  }

  function computeTierDistribution(records) {
    var list = records || getRecords();
    var totalCount = list.length || 1;
    var totalVol = list.reduce(function (s, r) { return s + (Number(r.expectedVolume) || 0); }, 0) || 1;

    var tiers = {
      'TIER-1': { code: 'TIER-1', label: 'Bậc 1: 300 - 499 cuộn', count: 0, volume: 0, discountPct: 0, creditDays: 0, terms: 'Giá sỉ cơ sở (0% CK); Thanh toán COD hoặc gối đầu tối đa 7 ngày; Ghép chuyến xe tải báo trước 1-2 ngày.' },
      'TIER-2': { code: 'TIER-2', label: 'Bậc 2: 500 - 799 cuộn', count: 0, volume: 0, discountPct: 4, creditDays: 15, terms: 'Chiết khấu Bậc 2; Công nợ gối đầu 15 ngày; Miễn phí giao ghép chuyến cố định Thứ 3 - Thứ 5 - Thứ 7.' },
      'TIER-3': { code: 'TIER-3', label: 'Bậc 3: 800 - 1.000 cuộn', count: 0, volume: 0, discountPct: 8, creditDays: 30, terms: 'Chiết khấu Bậc 3 / Đại lý cấp 1; Công nợ 30 ngày theo hợp đồng nguyên tắc; Ưu tiên lịch xe tải tận kho.' }
    };

    list.forEach(function (r) {
      var v = Number(r.expectedVolume) || 0;
      var t = getTierInfo(v).code;
      tiers[t].count++;
      tiers[t].volume += v;
    });

    return ['TIER-1', 'TIER-2', 'TIER-3'].map(function (k) {
      var item = tiers[k];
      item.countPct = Math.round((item.count / totalCount) * 1000) / 10;
      item.volumePct = Math.round((item.volume / totalVol) * 1000) / 10;
      item.avgVolume = item.count ? Math.round(item.volume / item.count) : 0;
      return item;
    });
  }

  function getKeyAccounts(records) {
    var list = records || getRecords();
    var totalVol = list.reduce(function (s, r) { return s + (Number(r.expectedVolume) || 0); }, 0) || 1;
    var playbooks = {
      'KH06': 'Tuyến Thứ 5 (Quận 12): Gửi mẫu băng keo OPP chịu ẩm kho mát + chào hợp đồng công nợ 30 ngày.',
      'KH11': 'Tuyến Thứ 5 (Quận 12): Đề xuất làm NCC chiến lược bán kèm thùng carton với chiết khấu Đại lý Bậc 3.',
      'BD01': 'Tuyến Thứ 3 (Bình Dương): Gửi mẫu PE quấn pallet chuẩn lõi mỏng tại Sóng Thần 2 + công nợ 30 ngày.',
      'BD03': 'Tuyến Thứ 3 (Bình Dương): Chào bộ phận Vật tư Gemadept hồ sơ năng lực + Sample Kit PE quấn máy/tay.',
      'BC01': 'Tuyến Thứ 5 (KCN Vĩnh Lộc): Chào P. Thu mua Cholimex bộ mẫu OPP đủ yard đóng thùng xuất khẩu.'
    };

    return list
      .filter(function (r) { return (Number(r.expectedVolume) || 0) >= 1000; })
      .map(function (r) {
        var v = Number(r.expectedVolume) || 0;
        return {
          record: r,
          sharePct: Math.round((v / totalVol) * 1000) / 10,
          tier: getTierInfo(v),
          playbook: playbooks[r.code] || (getRecommendedTruckSchedule(r) + ': Gửi Sample Kit + Chào hợp đồng nguyên tắc công nợ 30 ngày.')
        };
      });
  }

  function addDaysIso(days) {
    var d = new Date();
    d.setDate(d.getDate() + (Number(days) || 0));
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /**
   * Ước tính Doanh thu kỳ vọng (VNĐ/tháng), Doanh thu Trọng số (Weighted Forecast VNĐ),
   * Chi phí vốn công nợ + xe tải và Lợi nhuận Ròng (Net Profit & Net Margin %) của từng Deal.
   */
  function estimateDealFinancials(rec) {
    var cfg = getPricingConfig();
    var vol = Number(rec.expectedVolume) || 0;
    var tier = getTierInfo(vol);
    var discPct = tier.code === 'TIER-3' ? (Number(cfg.tier3DiscountPct) || 8) :
                  (tier.code === 'TIER-2' ? (Number(cfg.tier2DiscountPct) || 4) : 0);

    var products = cfg.products || [];
    var pePrice = (products[0] && Number(products[0].tier1BasePrice)) || 108000;
    var peCost = (products[0] && Number(products[0].factoryCost)) || 86000;
    var oppPrice = (products[3] && Number(products[3].tier1BasePrice)) || 11500;
    var oppCost = (products[3] && Number(products[3].factoryCost)) || 8800;

    var baseBlendPrice = Math.round(pePrice * 0.35 + oppPrice * 0.65);
    var baseBlendCost = Math.round(peCost * 0.35 + oppCost * 0.65);
    var skuCode = rec.primarySku || 'AUTO';

    var matchedProd = products.find(function (p) { return p.code === skuCode; });
    if (matchedProd) {
      baseBlendPrice = Number(matchedProd.tier1BasePrice) || baseBlendPrice;
      baseBlendCost = Number(matchedProd.factoryCost) || baseBlendCost;
    } else if (skuCode === 'MIX_PE_OPP') {
      baseBlendPrice = Math.round(pePrice * 0.35 + oppPrice * 0.65);
      baseBlendCost = Math.round(peCost * 0.35 + oppCost * 0.65);
    } else {
      var prodStr = String(rec.mainProduct || '').toLowerCase();
      var hasPE = prodStr.indexOf('pe') !== -1 || prodStr.indexOf('màng') !== -1;
      var hasOPP = prodStr.indexOf('opp') !== -1 || prodStr.indexOf('băng keo') !== -1 || prodStr.indexOf('đại lý') !== -1;

      if (hasPE && !hasOPP) {
        if (prodStr.indexOf('lớn') !== -1 || prodStr.indexOf('máy') !== -1 || prodStr.indexOf('sofa') !== -1) {
          baseBlendPrice = (products[1] && Number(products[1].tier1BasePrice)) || 132000;
          baseBlendCost = (products[1] && Number(products[1].factoryCost)) || 105000;
          skuCode = 'PE-02';
        } else {
          baseBlendPrice = pePrice;
          baseBlendCost = peCost;
          skuCode = 'PE-01';
        }
      } else if (!hasPE && hasOPP) {
        baseBlendPrice = (products[4] && Number(products[4].tier1BasePrice)) || 21500;
        baseBlendCost = (products[4] && Number(products[4].factoryCost)) || 16800;
        skuCode = 'OPP-02';
      } else {
        skuCode = 'MIX_PE_OPP';
      }
    }

    var netUnitPrice = Math.round(baseBlendPrice * (1 - discPct / 100));
    var truckFee = Number(cfg.truckFeePerRoll) || 500;
    var capRateMonthly = Number(cfg.workingCapitalRateMonthly) || 1.2;

    // Xác định số ngày công nợ thực tế của Deal
    var creditDays = tier.code === 'TIER-3' ? (Number(cfg.tier3CreditDays) || 30) :
                     (tier.code === 'TIER-2' ? (Number(cfg.tier2CreditDays) || 15) : 0);
    var polLower = String(rec.policy || '').toLowerCase();
    if (polLower.indexOf('cod') !== -1) creditDays = 0;
    else if (polLower.indexOf('30 ngày') !== -1) creditDays = 30;
    else if (polLower.indexOf('15 ngày') !== -1 || polLower.indexOf('gối đầu') !== -1) creditDays = Math.max(creditDays, 15);

    var capitalCostPerRoll = Math.round(netUnitPrice * (capRateMonthly / 100) * (creditDays / 30));
    var netProfitPerRoll = netUnitPrice - baseBlendCost - truckFee - capitalCostPerRoll;
    var netMarginPct = netUnitPrice > 0 ? Math.round((netProfitPerRoll / netUnitPrice) * 1000) / 10 : 0;

    var monthlyRevenue = vol * netUnitPrice;
    var monthlyNetProfit = vol * netProfitPerRoll;
    var meta = STAGE_META[rec.status] || STAGE_META['Chưa gọi'];
    var weightedRevenue = Math.round(monthlyRevenue * meta.prob);
    var weightedNetProfit = Math.round(monthlyNetProfit * meta.prob);

    return {
      skuCode: skuCode,
      factoryUnitCost: baseBlendCost,
      baseUnitPrice: baseBlendPrice,
      discountPct: discPct,
      netUnitPrice: netUnitPrice,
      truckFeePerRoll: truckFee,
      creditDays: creditDays,
      capitalCostPerRoll: capitalCostPerRoll,
      netProfitPerRoll: netProfitPerRoll,
      netMarginPct: netMarginPct,
      monthlyRevenue: monthlyRevenue,
      weightedRevenue: weightedRevenue,
      monthlyNetProfit: monthlyNetProfit,
      weightedNetProfit: weightedNetProfit,
      winProbPct: meta.probPct,
      stageMeta: meta
    };
  }

  /**
   * Đánh giá trạng thái SLA (Đúng hạn / Hôm nay cần gọi / Quá hạn gọi hoặc Quá 48h test mẫu).
   */
  function evaluateSlaStatus(rec) {
    var todayStr = addDaysIso(0);
    var todayMs = new Date(todayStr + 'T00:00:00').getTime();

    // 1. Kiểm tra quá hạn 48h test mẫu ở Bước 4
    if (rec.status === 'Đã gửi Sample Kit' && rec.sampleSentDate) {
      var sentMs = new Date(rec.sampleSentDate + 'T00:00:00').getTime();
      if (isFinite(sentMs)) {
        var sampleDays = Math.round((todayMs - sentMs) / 86400000);
        if (sampleDays >= 2 && (!rec.sampleResult || rec.sampleResult === 'Đang test tại kho')) {
          return {
            state: 'overdue',
            isUrgent: true,
            daysDiff: sampleDays,
            label: 'Quá ' + (sampleDays * 24) + 'h test mẫu — Gọi ngay!',
            badgeCls: 'bg-danger text-white'
          };
        }
      }
    }

    // 2. Kiểm tra ngày hẹn Follow-up
    if (rec.nextFollowUp) {
      var fMs = new Date(rec.nextFollowUp + 'T00:00:00').getTime();
      if (isFinite(fMs)) {
        var diff = Math.round((fMs - todayMs) / 86400000);
        if (diff < 0 && rec.status !== 'Đã chốt đơn') {
          return {
            state: 'overdue',
            isUrgent: true,
            daysDiff: Math.abs(diff),
            label: 'Quá hạn gọi ' + Math.abs(diff) + ' ngày (' + rec.nextFollowUp + ')',
            badgeCls: 'bg-danger text-white'
          };
        }
        if (diff === 0) {
          return {
            state: 'today',
            isUrgent: true,
            daysDiff: 0,
            label: 'Hôm nay cần gọi Follow-up',
            badgeCls: 'bg-warning text-dark'
          };
        }
        if (rec.status === 'Đã chốt đơn') {
          return {
            state: diff <= 3 ? 'today' : 'scheduled',
            isUrgent: diff <= 3,
            daysDiff: diff,
            label: diff <= 0 ? 'Đến kỳ Tái đặt hàng (Re-order)' : ('Re-order sau ' + diff + ' ngày'),
            badgeCls: diff <= 3 ? 'bg-warning text-dark' : 'bg-success-subtle text-success-emphasis'
          };
        }
        return {
          state: 'scheduled',
          isUrgent: false,
          daysDiff: diff,
          label: 'Hẹn gọi: ' + rec.nextFollowUp,
          badgeCls: 'bg-info-subtle text-info-emphasis'
        };
      }
    }

    return {
      state: 'none',
      isUrgent: false,
      daysDiff: 0,
      label: '',
      badgeCls: ''
    };
  }

  /**
   * Tổng hợp KPI Hiệu suất Đội ngũ Sales B2B theo Tuyến & Key Account.
   */
  function computeSalesRepStats(records) {
    var list = records || getRecords();
    var map = {};
    SALES_REPS.forEach(function (rep) {
      map[rep.id] = {
        rep: rep,
        totalDeals: 0,
        totalVolume: 0,
        sampleSentCount: 0,
        quotingCount: 0,
        wonCount: 0,
        wonVolume: 0,
        overdueSlaCount: 0,
        monthlyRevenue: 0,
        weightedRevenue: 0,
        monthlyNetProfit: 0,
        weightedNetProfit: 0
      };
    });

    list.forEach(function (rec) {
      var repInfo = getSalesRepInfo(rec);
      var bucket = map[repInfo.id] || map[SALES_REPS[1].id];
      var vol = Number(rec.expectedVolume) || 0;
      var fin = estimateDealFinancials(rec);
      var sla = evaluateSlaStatus(rec);

      bucket.totalDeals++;
      bucket.totalVolume += vol;
      if (isSampleSent(rec)) bucket.sampleSentCount++;
      if (rec.status === 'Đang báo giá / Thương lượng') bucket.quotingCount++;
      if (rec.status === 'Đã chốt đơn') {
        bucket.wonCount++;
        bucket.wonVolume += vol;
      }
      if (sla.state === 'overdue') bucket.overdueSlaCount++;
      bucket.monthlyRevenue += fin.monthlyRevenue;
      bucket.weightedRevenue += fin.weightedRevenue;
      bucket.monthlyNetProfit += fin.monthlyNetProfit;
      bucket.weightedNetProfit += fin.weightedNetProfit;
    });

    var rows = SALES_REPS.map(function (rep) {
      var item = map[rep.id];
      item.sampleRatePct = item.totalDeals ? Math.round((item.sampleSentCount / item.totalDeals) * 1000) / 10 : 0;
      item.winRatePct = item.totalDeals ? Math.round((item.wonCount / item.totalDeals) * 1000) / 10 : 0;
      item.targetPct = rep.targetVolume ? Math.round((item.wonVolume / rep.targetVolume) * 1000) / 10 : 0;
      return item;
    });

    return {
      rows: rows
    };
  }

  Admin.b2b = {
    PIPELINE_STAGES: PIPELINE_STAGES,
    STAGE_META: STAGE_META,
    LOST_REASONS: LOST_REASONS,
    SAMPLE_RESULTS: SAMPLE_RESULTS,
    REGIONS: REGIONS,
    INDUSTRIES: INDUSTRIES,
    SALES_REPS: SALES_REPS,
    WEEKLY_SCHEDULE: WEEKLY_SCHEDULE,
    SAMPLE_KIT_SPECS: SAMPLE_KIT_SPECS,
    TELESALE_SCRIPTS: TELESALE_SCRIPTS,
    getRecords: getRecords,
    saveRecords: saveRecords,
    resetDefaultRecords: resetDefaultRecords,
    exportBackupPayload: exportBackupPayload,
    importBackupPayload: importBackupPayload,
    getSalesRepInfo: getSalesRepInfo,
    addActivity: addActivity,
    getPricingConfig: getPricingConfig,
    savePricingConfig: savePricingConfig,
    getTierInfo: getTierInfo,
    getRecommendedTruckSchedule: getRecommendedTruckSchedule,
    auditRecord: auditRecord,
    addDaysIso: addDaysIso,
    estimateDealFinancials: estimateDealFinancials,
    evaluateSlaStatus: evaluateSlaStatus,
    computeRegionalStats: computeRegionalStats,
    computeIndustryStats: computeIndustryStats,
    computePipelineStats: computePipelineStats,
    computeLostReasonStats: computeLostReasonStats,
    computeSalesRepStats: computeSalesRepStats,
    computeQuantitativeMetrics: computeQuantitativeMetrics,
    computeTierDistribution: computeTierDistribution,
    getKeyAccounts: getKeyAccounts
  };

})(window.Admin);

