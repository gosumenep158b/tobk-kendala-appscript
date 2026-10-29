/**
 * ============================================================================
 * SISTEM PELAPORAN KENDALA TOBK - GANESHA OPERATION
 * ============================================================================
 * Backend Google Apps Script (V8 Engine)
 * Framework: Google Sheets Database + HTML Service + Telegram Bot API
 * Warna Khas: Merah (#C41230), Kuning (#F59E0B), Putih (#FFFFFF)
 */

// Konfigurasi Default Sheet & Telegram
const CONFIG = {
  SHEET_DATA_SISWA: "Data_Siswa",
  SHEET_LAPORAN: "Laporan_Kendala",
  SHEET_PENGATURAN: "Pengaturan",
  // Token dan Chat ID bisa diisi langsung di sini atau via menu Pengaturan di Aplikasi
  DEFAULT_BOT_TOKEN: "", // Contoh: "1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
  DEFAULT_CHAT_ID: "",   // Contoh: "-1001234567890" (Grup Telegram)
  ADMIN_PIN: "1984"      // PIN Default masuk Dashboard Admin (Bisa diubah di pengaturan)
};

/**
 * Entry point Web App & API Handler
 */
function doGet(e) {
  // Jika diakses sebagai JSON API (misal dari Vercel / External)
  if (e && e.parameter && e.parameter.api === "true") {
    var action = e.parameter.action;
    var result = {};
    try {
      if (action === "getInitialData") {
        result = getInitialData();
      } else if (action === "getDashboardData") {
        var filters = {
          status: e.parameter.status || "ALL",
          jenjang: e.parameter.jenjang || "ALL",
          search: e.parameter.search || ""
        };
        result = getDashboardData(filters);
      } else {
        result = { success: false, message: "Aksi tidak dikenali" };
      }
    } catch (err) {
      result = { success: false, error: err.toString() };
    }
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Tampilan HTML Web App
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("Pelaporan Kendala TOBK - Ganesha Operation")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Handle POST request jika diakses via Vercel / REST API
 */
function doPost(e) {
  var result = {};
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    var payload = JSON.parse(raw);
    var action = payload.action;

    if (action === "submitLaporan") {
      result = submitLaporan(payload.data);
    } else if (action === "getDashboardData") {
      result = getDashboardData(payload.filters || {});
    } else if (action === "updateFollowUp") {
      result = updateFollowUp(payload.data);
    } else if (action === "searchStudents") {
      result = searchStudents(payload.params || {});
    } else if (action === "verifyAdminPin") {
      result = verifyAdminPin(payload.pin);
    } else {
      result = { success: false, message: "Aksi POST tidak valid: " + action };
    }
  } catch (err) {
    result = { success: false, error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Helper include file HTML (jika dipisah)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Inisialisasi struktur Google Sheets jika belum ada
 */
function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Sheet Laporan_Kendala
  let sheetLaporan = ss.getSheetByName(CONFIG.SHEET_LAPORAN);
  if (!sheetLaporan) {
    sheetLaporan = ss.insertSheet(CONFIG.SHEET_LAPORAN);
    const headers = [
      "Timestamp",
      "Kode_Tiket",
      "Kota",
      "Unit",
      "Jenjang",
      "Asal_Sekolah",
      "Nama_Siswa",
      "No_Hp",
      "Kode_TOBK",
      "Mata_Pelajaran",
      "Kendala",
      "Status",
      "Catatan_Follow_Up",
      "Waktu_Follow_Up",
      "Admin_Follow_Up"
    ];
    sheetLaporan.appendRow(headers);
    sheetLaporan.getRange(1, 1, 1, headers.length)
      .setBackground("#C41230")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheetLaporan.setFrozenRows(1);
  }

  // 2. Sheet Data_Siswa
  let sheetSiswa = ss.getSheetByName(CONFIG.SHEET_DATA_SISWA);
  if (!sheetSiswa) {
    sheetSiswa = ss.insertSheet(CONFIG.SHEET_DATA_SISWA);
    const headers = [
      "id",
      "nama_lengkap",
      "jenjang",
      "nisn",
      "no_hp",
      "no_register",
      "tanggal_lahir",
      "asal_sekolah",
      "kota",
      "unit"
    ];
    sheetSiswa.appendRow(headers);
    sheetSiswa.getRange(1, 1, 1, headers.length)
      .setBackground("#F59E0B")
      .setFontColor("#000000")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheetSiswa.setFrozenRows(1);
  }

  // 3. Sheet Pengaturan
  let sheetSetting = ss.getSheetByName(CONFIG.SHEET_PENGATURAN);
  if (!sheetSetting) {
    sheetSetting = ss.insertSheet(CONFIG.SHEET_PENGATURAN);
    sheetSetting.appendRow(["Kunci", "Nilai", "Keterangan"]);
    sheetSetting.getRange(1, 1, 1, 3)
      .setBackground("#1E293B")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");
    sheetSetting.appendRow(["TELEGRAM_BOT_TOKEN", CONFIG.DEFAULT_BOT_TOKEN, "Bot Token dari @BotFather"]);
    sheetSetting.appendRow(["TELEGRAM_CHAT_ID", CONFIG.DEFAULT_CHAT_ID, "Chat ID Grup / Channel"]);
    sheetSetting.appendRow(["ADMIN_PIN", CONFIG.ADMIN_PIN, "PIN Keamanan Dashboard Admin"]);
    sheetSetting.setFrozenRows(1);
  }

  return { success: true, message: "Spreadsheet berhasil diinisialisasi!" };
}

/**
 * IMPORT DATA SISWA OTOMATIS (1-KLIK)
 * Mengunduh langsung data 818 siswa dari repositori GitHub resmi ke sheet 'Data_Siswa'
 */
function importDataSiswaOtomatis() {
  const url = "https://raw.githubusercontent.com/gosumenep158b/tobk-kendala-appscript/main/data_siswa.csv";
  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      throw new Error("Gagal mengunduh CSV. Kode respon: " + res.getResponseCode());
    }
    const csvData = Utilities.parseCsv(res.getContentText());
    if (!csvData || csvData.length === 0) {
      throw new Error("Data CSV kosong.");
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetSiswa = ss.getSheetByName(CONFIG.SHEET_DATA_SISWA);
    if (!sheetSiswa) {
      sheetSiswa = ss.insertSheet(CONFIG.SHEET_DATA_SISWA);
    } else {
      sheetSiswa.clear();
    }

    // Tulis data CSV ke sheet
    sheetSiswa.getRange(1, 1, csvData.length, csvData[0].length).setValues(csvData);

    // Format Header
    sheetSiswa.getRange(1, 1, 1, csvData[0].length)
      .setBackground("#F59E0B")
      .setFontColor("#000000")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheetSiswa.setFrozenRows(1);
    SpreadsheetApp.flush();

    console.log(`Berhasil mengimpor ${csvData.length - 1} data siswa ke sheet '${CONFIG.SHEET_DATA_SISWA}'!`);
    return {
      success: true,
      totalRows: csvData.length - 1,
      message: `Berhasil mengimpor ${csvData.length - 1} data siswa ke sheet 'Data_Siswa'!`
    };
  } catch (err) {
    console.error("Gagal impor data siswa:", err);
    return { success: false, error: err.toString() };
  }
}

/**
 * Mengambil properti pengaturan
 */
function getSettings() {
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetSetting = ss.getSheetByName(CONFIG.SHEET_PENGATURAN);

  let botToken = props.getProperty("TELEGRAM_BOT_TOKEN") || CONFIG.DEFAULT_BOT_TOKEN;
  let chatId = props.getProperty("TELEGRAM_CHAT_ID") || CONFIG.DEFAULT_CHAT_ID;
  let adminPin = props.getProperty("ADMIN_PIN") || CONFIG.ADMIN_PIN;

  if (sheetSetting && sheetSetting.getLastRow() > 1) {
    const data = sheetSetting.getRange(2, 1, sheetSetting.getLastRow() - 1, 2).getValues();
    data.forEach(row => {
      const key = String(row[0]).trim();
      const val = String(row[1]).trim();
      if (key === "TELEGRAM_BOT_TOKEN" && val) botToken = val;
      if (key === "TELEGRAM_CHAT_ID" && val) chatId = val;
      if (key === "ADMIN_PIN" && val) adminPin = val;
    });
  }

  return {
    botToken: botToken,
    chatId: chatId,
    adminPin: adminPin,
    isTelegramActive: !!(botToken && chatId)
  };
}

/**
 * Menyimpan pengaturan
 */
function saveSettings(settings) {
  const props = PropertiesService.getScriptProperties();
  if (settings.botToken !== undefined) props.setProperty("TELEGRAM_BOT_TOKEN", settings.botToken.trim());
  if (settings.chatId !== undefined) props.setProperty("TELEGRAM_CHAT_ID", settings.chatId.trim());
  if (settings.adminPin !== undefined) props.setProperty("ADMIN_PIN", settings.adminPin.trim());

  // Simpan juga ke sheet Pengaturan
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetSetting = ss.getSheetByName(CONFIG.SHEET_PENGATURAN);
  if (sheetSetting) {
    const data = sheetSetting.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const k = String(data[i][0]).trim();
      if (k === "TELEGRAM_BOT_TOKEN" && settings.botToken !== undefined) {
        sheetSetting.getRange(i + 1, 2).setValue(settings.botToken.trim());
      } else if (k === "TELEGRAM_CHAT_ID" && settings.chatId !== undefined) {
        sheetSetting.getRange(i + 1, 2).setValue(settings.chatId.trim());
      } else if (k === "ADMIN_PIN" && settings.adminPin !== undefined) {
        sheetSetting.getRange(i + 1, 2).setValue(settings.adminPin.trim());
      }
    }
  }

  return { success: true, message: "Pengaturan berhasil disimpan!" };
}

/**
 * Mengambil metadata awal untuk form (Kota, Unit, Jenjang, Sekolah)
 */
function getInitialData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetSiswa = ss.getSheetByName(CONFIG.SHEET_DATA_SISWA);

  const kotaList = ["Sumenep", "Pamekasan", "Sampang", "Bangkalan"];
  const unitList = [
    "Unit Agus Salim",
    "Unit Jokotole",
    "Unit Parteker",
    "Unit Imam Bonjol",
    "Unit Cempaka"
  ];

  let schoolsByJenjang = {
    SD: [],
    SMP: [],
    SMA: []
  };

  if (sheetSiswa && sheetSiswa.getLastRow() > 1) {
    const lastRow = sheetSiswa.getLastRow();
    const data = sheetSiswa.getRange(2, 1, lastRow - 1, 8).getValues();
    // Col 2: jenjang (index 2), Col 7: asal_sekolah (index 7)
    const schoolSets = {
      SD: new Set(),
      SMP: new Set(),
      SMA: new Set()
    };

    data.forEach(r => {
      const jenjang = String(r[2] || "").trim().toUpperCase();
      const sekolah = String(r[7] || "").trim();
      if (sekolah) {
        if (jenjang.includes("SD")) schoolSets.SD.add(sekolah);
        else if (jenjang.includes("SMP")) schoolSets.SMP.add(sekolah);
        else if (jenjang.includes("SMA") || jenjang.includes("SMK") || jenjang.includes("MA")) schoolSets.SMA.add(sekolah);
        else schoolSets.SD.add(sekolah); // default fallback
      }
    });

    schoolsByJenjang.SD = Array.from(schoolSets.SD).sort();
    schoolsByJenjang.SMP = Array.from(schoolSets.SMP).sort();
    schoolsByJenjang.SMA = Array.from(schoolSets.SMA).sort();
  }

  // Jika master data belum terisi, sediakan sample sekolah
  if (schoolsByJenjang.SD.length === 0) {
    schoolsByJenjang.SD = [
      "SDI LUKMANUL HAKIM", "SDIT AL WATHONIYAH", "SDK SANG TIMUR", "SDN BANGSELOK I", 
      "SDN BATUAN I", "SDN KOLOR II", "SDN MASEMEGIT I", "SDN PANDIAN I"
    ];
  }
  if (schoolsByJenjang.SMP.length === 0) {
    schoolsByJenjang.SMP = [
      "SMPN 1 SUMENEP", "SMPN 2 SUMENEP", "SMPN 3 SUMENEP", "SMPIT AL HIDAYAH"
    ];
  }
  if (schoolsByJenjang.SMA.length === 0) {
    schoolsByJenjang.SMA = [
      "SMAN 1 SUMENEP", "SMAN 2 SUMENEP", "SMAN 1 GAPURA", "MAN SUMENEP"
    ];
  }

  const settings = getSettings();

  return {
    kotaList: kotaList,
    unitList: unitList,
    schoolsByJenjang: schoolsByJenjang,
    isTelegramActive: settings.isTelegramActive
  };
}

/**
 * Cari siswa berdasarkan nama / sekolah / jenjang
 */
function searchStudents(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetSiswa = ss.getSheetByName(CONFIG.SHEET_DATA_SISWA);
  if (!sheetSiswa || sheetSiswa.getLastRow() <= 1) {
    return [];
  }

  const query = (params.query || "").toLowerCase().trim();
  const school = (params.school || "").toLowerCase().trim();
  const jenjang = (params.jenjang || "").toUpperCase().trim();

  const lastRow = sheetSiswa.getLastRow();
  const lastCol = sheetSiswa.getLastColumn();
  const data = sheetSiswa.getRange(2, 1, lastRow - 1, Math.max(lastCol, 10)).getValues();
  // index: 0=id, 1=nama, 2=jenjang, 3=nisn, 4=no_hp, 5=no_register, 6=tgl_lahir, 7=asal_sekolah, 8=kota, 9=nama_unit

  const results = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const nama = String(row[1] || "");
    const rowJenjang = String(row[2] || "").toUpperCase();
    const noHp = String(row[4] || "");
    const noReg = String(row[5] || "");
    const rowSchool = String(row[7] || "");
    const kota = String(row[8] || "Sumenep");
    const unit = String(row[9] || "Unit Jokotole");

    if (jenjang && !rowJenjang.includes(jenjang)) continue;
    if (school && rowSchool.toLowerCase() !== school) continue;

    if (query) {
      const matchNama = nama.toLowerCase().includes(query);
      const matchReg = noReg.toLowerCase().includes(query);
      const matchHp = noHp.includes(query);
      if (!matchNama && !matchReg && !matchHp) continue;
    }

    results.push({
      nama: nama,
      jenjang: rowJenjang,
      noHp: noHp,
      noReg: noReg,
      sekolah: rowSchool,
      kota: kota,
      unit: unit
    });

    if (results.length >= 25) break; // limit agar respon ringan
  }

  return results;
}

/**
 * Generate Kode Tiket unik: TOBK-YYMMDD-XXXX
 */
function generateTicketCode() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let rand = "";
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TOBK-${y}${m}${d}-${rand}`;
}

/**
 * Kirim Notifikasi ke Grup Telegram
 */
function sendTelegramNotification(laporan) {
  const settings = getSettings();
  if (!settings.botToken || !settings.chatId) {
    console.log("Telegram Bot Token atau Chat ID belum dikonfigurasi.");
    return { success: false, reason: "Telegram belum dikonfigurasi" };
  }

  const text = 
    `🔴 <b>LAPORAN KENDALA TOBK GO</b> 🔴\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🎫 <b>Kode Tiket:</b> <code>${laporan.ticketCode}</code>\n` +
    `📅 <b>Waktu:</b> ${laporan.timestamp}\n\n` +
    `👤 <b>Nama Siswa:</b> <b>${escapeHtml(laporan.namaSiswa)}</b>\n` +
    `📱 <b>No. HP / WA:</b> <a href="https://wa.me/${cleanPhone(laporan.noHp)}">${laporan.noHp}</a>\n` +
    `🏫 <b>Asal Sekolah:</b> ${escapeHtml(laporan.asalSekolah)}\n` +
    `🎓 <b>Jenjang:</b> ${laporan.jenjang}\n` +
    `📍 <b>Kota & Unit:</b> ${escapeHtml(laporan.kota)} - ${escapeHtml(laporan.unit)}\n\n` +
    `📚 <b>Mata Pelajaran:</b> <b>${escapeHtml(laporan.mapel)}</b>\n` +
    `📝 <b>Kode TOBK:</b> <code>${escapeHtml(laporan.kodeTobk)}</code>\n` +
    `⚠️ <b>Detail Kendala:</b>\n` +
    `<i>"${escapeHtml(laporan.kendala)}"</i>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Status: ⏳ <b>MENUNGGU FOLLOW UP</b>\n` +
    `<i>Aplikasi Helpdesk Ganesha Operation</i>`;

  const url = `https://api.telegram.org/bot${settings.botToken}/sendMessage`;
  const payload = {
    chat_id: settings.chatId,
    text: text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  };

  try {
    const response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const resJson = JSON.parse(response.getContentText());
    if (resJson.ok) {
      return { success: true };
    } else {
      console.error("Telegram API Error:", resJson.description);
      return { success: false, error: resJson.description };
    }
  } catch (err) {
    console.error("Gagal mengirim Telegram:", err);
    return { success: false, error: err.toString() };
  }
}

/**
 * Siswa Submit Laporan Kendala
 */
function submitLaporan(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetLaporan = ss.getSheetByName(CONFIG.SHEET_LAPORAN);
  if (!sheetLaporan) {
    setupSpreadsheet();
    sheetLaporan = ss.getSheetByName(CONFIG.SHEET_LAPORAN);
  }

  // Validasi sederhana
  if (!payload.namaSiswa || !payload.kendala || !payload.jenjang || !payload.mapel) {
    throw new Error("Mohon lengkapi semua kolom wajib pada form.");
  }

  const ticketCode = payload.ticketCode || generateTicketCode();
  const now = new Date();
  const timestampStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

  const rowData = [
    timestampStr,
    ticketCode,
    payload.kota || "-",
    payload.unit || "-",
    payload.jenjang || "-",
    payload.asalSekolah || "-",
    payload.namaSiswa.trim(),
    payload.noHp ? String(payload.noHp).trim() : "-",
    payload.kodeTobk ? String(payload.kodeTobk).trim() : "-",
    payload.mapel || "-",
    payload.kendala.trim(),
    "Belum Follow Up",
    "", // Catatan Follow Up
    "", // Waktu Follow Up
    ""  // Admin Follow Up
  ];

  sheetLaporan.appendRow(rowData);

  // Kirim Telegram
  const telegramData = {
    ticketCode: ticketCode,
    timestamp: timestampStr,
    namaSiswa: payload.namaSiswa.trim(),
    noHp: payload.noHp || "-",
    asalSekolah: payload.asalSekolah || "-",
    jenjang: payload.jenjang || "-",
    kota: payload.kota || "-",
    unit: payload.unit || "-",
    mapel: payload.mapel || "-",
    kodeTobk: payload.kodeTobk || "-",
    kendala: payload.kendala.trim()
  };

  const teleResult = sendTelegramNotification(telegramData);

  return {
    success: true,
    ticketCode: ticketCode,
    timestamp: timestampStr,
    telegramSent: teleResult.success,
    message: "Laporan kendala berhasil dikirimkan!"
  };
}

/**
 * Mengambil data Dashboard (Rekap & Tabel Laporan)
 */
function getDashboardData(filters) {
  filters = filters || {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetLaporan = ss.getSheetByName(CONFIG.SHEET_LAPORAN);

  if (!sheetLaporan || sheetLaporan.getLastRow() <= 1) {
    return {
      stats: {
        total: 0,
        pending: 0,
        done: 0,
        persentase: "0%"
      },
      reports: []
    };
  }

  const lastRow = sheetLaporan.getLastRow();
  const lastCol = sheetLaporan.getLastColumn();
  const data = sheetLaporan.getRange(2, 1, lastRow - 1, Math.max(lastCol, 15)).getValues();

  let total = 0;
  let pending = 0;
  let done = 0;
  const reports = [];

  const filterStatus = (filters.status || "ALL").toUpperCase();
  const filterJenjang = (filters.jenjang || "ALL").toUpperCase();
  const search = (filters.search || "").toLowerCase().trim();

  // Iterasi dari yang paling baru (bawah ke atas)
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    const rawStatus = String(row[11] || "Belum Follow Up").trim();
    const isDone = rawStatus.toLowerCase().includes("selesai") || rawStatus.toLowerCase().includes("sudah");
    const statusNormalized = isDone ? "Selesai Follow Up" : "Belum Follow Up";

    total++;
    if (isDone) {
      done++;
    } else {
      pending++;
    }

    const jenjang = String(row[4] || "").toUpperCase();
    const ticketCode = String(row[1] || "");
    const namaSiswa = String(row[6] || "");
    const asalSekolah = String(row[5] || "");
    const noHp = String(row[7] || "");
    const kodeTobk = String(row[8] || "");
    const mapel = String(row[9] || "");
    const kendala = String(row[10] || "");
    const catatan = String(row[12] || "");
    const waktuFollowUp = String(row[13] || "");
    const adminFollowUp = String(row[14] || "");

    // Filter status
    if (filterStatus === "PENDING" && isDone) continue;
    if (filterStatus === "DONE" && !isDone) continue;

    // Filter jenjang
    if (filterJenjang !== "ALL" && !jenjang.includes(filterJenjang)) continue;

    // Search query
    if (search) {
      const match = 
        ticketCode.toLowerCase().includes(search) ||
        namaSiswa.toLowerCase().includes(search) ||
        asalSekolah.toLowerCase().includes(search) ||
        noHp.includes(search) ||
        kendala.toLowerCase().includes(search);
      if (!match) continue;
    }

    reports.push({
      rowIndex: i + 2, // 1-indexed row in sheet
      timestamp: formatDateTime(row[0]),
      ticketCode: ticketCode,
      kota: String(row[2] || "-"),
      unit: String(row[3] || "-"),
      jenjang: jenjang,
      asalSekolah: asalSekolah,
      namaSiswa: namaSiswa,
      noHp: noHp,
      kodeTobk: kodeTobk,
      mapel: mapel,
      kendala: kendala,
      status: statusNormalized,
      catatanFollowUp: catatan,
      waktuFollowUp: waktuFollowUp,
      adminFollowUp: adminFollowUp
    });
  }

  const persentase = total > 0 ? Math.round((done / total) * 100) + "%" : "0%";

  return {
    stats: {
      total: total,
      pending: pending,
      done: done,
      persentase: persentase
    },
    reports: reports
  };
}

/**
 * Admin Update Status & Catatan Follow Up
 */
function updateFollowUp(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetLaporan = ss.getSheetByName(CONFIG.SHEET_LAPORAN);
  if (!sheetLaporan) throw new Error("Sheet laporan tidak ditemukan.");

  const ticketCode = String(payload.ticketCode || "").trim();
  if (!ticketCode) throw new Error("Kode tiket tidak valid.");

  const lastRow = sheetLaporan.getLastRow();
  const data = sheetLaporan.getRange(2, 2, lastRow - 1, 1).getValues();

  let targetRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === ticketCode) {
      targetRow = i + 2;
      break;
    }
  }

  if (targetRow === -1) {
    throw new Error("Laporan dengan kode tiket " + ticketCode + " tidak ditemukan.");
  }

  const now = new Date();
  const timeStr = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
  const newStatus = payload.status || "Selesai Follow Up";
  const catatan = payload.catatan || "";
  const admin = payload.admin || "Admin GO";

  sheetLaporan.getRange(targetRow, 12).setValue(newStatus);      // Col L: Status
  sheetLaporan.getRange(targetRow, 13).setValue(catatan);        // Col M: Catatan_Follow_Up
  sheetLaporan.getRange(targetRow, 14).setValue(timeStr);        // Col N: Waktu_Follow_Up
  sheetLaporan.getRange(targetRow, 15).setValue(admin);          // Col O: Admin_Follow_Up

  return {
    success: true,
    message: `Tiket ${ticketCode} berhasil di-update menjadi ${newStatus}!`,
    waktuFollowUp: timeStr
  };
}

/**
 * Verifikasi PIN Admin
 */
function verifyAdminPin(pin) {
  const settings = getSettings();
  if (String(pin).trim() === String(settings.adminPin).trim()) {
    return { success: true };
  }
  return { success: false, message: "PIN Admin salah!" };
}

// ----------------- UTILITIES -----------------

function cleanPhone(phone) {
  let p = String(phone || "").replace(/[^0-9]/g, "");
  if (p.startsWith("0")) {
    p = "62" + p.substring(1);
  } else if (!p.startsWith("62")) {
    p = "62" + p;
  }
  return p;
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateTime(val) {
  if (!val) return "-";
  if (val instanceof Date) {
    return Utilities.formatDate(val, "Asia/Jakarta", "yyyy-MM-dd HH:mm");
  }
  return String(val);
}
