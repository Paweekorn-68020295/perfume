/* ==========================================================
   Body Scent — script.js
   ไฟล์เดียวใช้ร่วมกันทุกหน้า ทำงานตาม element ที่พบในหน้านั้น
   ========================================================== */

/* ---------- ตั้งค่า (แก้ 2 ค่านี้ก่อนใช้งานจริง) ---------- */
const APPS_SCRIPT_URL = "APPS_SCRIPT_URL"; // URL ของ Web app จาก Apps Script (ลงท้าย /exec)
const CSV_URL = "CSV_URL";                 // URL ของ Google Sheet ที่ Publish to web เป็น CSV
const HAS_HEADER_ROW = true;               // true = แถวแรกใน Sheet เป็นหัวตาราง (จะข้ามไม่แสดง)

/* ---------- Mood ที่ใช้กรองสินค้า ---------- */
const MOODS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "fresh", label: "Fresh" },
  { key: "sweet", label: "Sweet" },
  { key: "confident", label: "Confident" },
  { key: "romance", label: "Romance" }
];

document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("product-list")) initProductPage();
  if (document.getElementById("orderForm")) initOrderPage();
  if (document.getElementById("ordersTable")) initAdminPage();
});

/* ==========================================================
   1) หน้า product.html
   ========================================================== */
function initProductPage() {
  var filterBar = document.getElementById("filter-bar");
  var list = document.getElementById("product-list");
  var products = [];

  var params = new URLSearchParams(window.location.search);
  var current = (params.get("mood") || "all").toLowerCase();
  if (!MOODS.some(function (m) { return m.key === current; })) current = "all";

  function renderFilters() {
    if (!filterBar) return;
    filterBar.innerHTML = "";
    MOODS.forEach(function (m) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = m.label;
      if (m.key !== "all") btn.setAttribute("data-mood", m.key);
      if (m.key === current) btn.classList.add("active");
      btn.addEventListener("click", function () {
        current = m.key;
        renderFilters();
        renderProducts();
      });
      filterBar.appendChild(btn);
    });
  }

  function renderProducts() {
    list.innerHTML = "";
    var shown = products.filter(function (p) {
      return current === "all" || p.mood === current;
    });

    if (shown.length === 0) {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "ไม่พบสินค้า";
      list.appendChild(empty);
      return;
    }

    shown.forEach(function (p) {
      list.appendChild(createProductCard(p));
    });
  }

  function createProductCard(p) {
    var card = document.createElement("article");
    card.className = "product-card";
    card.setAttribute("data-mood", p.mood);

    var imgWrap = document.createElement("div");
    imgWrap.className = "product-img";
    var img = document.createElement("img");
    img.src = p.image;
    img.alt = p.name;
    img.loading = "lazy";
    imgWrap.appendChild(img);

    var body = document.createElement("div");
    body.className = "product-body";

    var moodTag = document.createElement("span");
    moodTag.className = "product-mood";
    moodTag.textContent = p.mood;

    var name = document.createElement("h3");
    name.textContent = p.name;

    body.appendChild(moodTag);
    body.appendChild(name);

    if (p.size) {
      var size = document.createElement("span");
      size.className = "product-size";
      size.textContent = p.size;
      body.appendChild(size);
    }

    var foot = document.createElement("div");
    foot.className = "product-foot";

    var price = document.createElement("span");
    price.className = "price";
    price.textContent = formatPrice(p.price) + " บาท";

    // ชื่อที่ส่งไปหน้า order: รวมไซส์ด้วย (ถ้ามี) เพื่อให้แยกเล็ก/ใหญ่ได้
    var itemText = p.size && p.name.indexOf(p.size) === -1 ? p.name + " " + p.size : p.name;

    var order = document.createElement("a");
    order.className = "btn btn-accent btn-sm";
    order.textContent = "สั่งซื้อ";
    order.href =
      "order.html?item=" + encodeURIComponent(itemText) +
      "&price=" + encodeURIComponent(p.price);

    foot.appendChild(price);
    foot.appendChild(order);
    body.appendChild(foot);

    card.appendChild(imgWrap);
    card.appendChild(body);
    return card;
  }

  renderFilters();

  fetch("products.json")
    .then(function (res) {
      if (!res.ok) throw new Error("โหลด products.json ไม่สำเร็จ");
      return res.json();
    })
    .then(function (data) {
      products = data;
      renderProducts();
    })
    .catch(function (error) {
      console.error(error);
      list.innerHTML = "";
      var msg = document.createElement("p");
      msg.className = "empty-state";
      msg.textContent = "ไม่สามารถโหลดรายการสินค้าได้ กรุณาลองใหม่อีกครั้ง";
      list.appendChild(msg);
    });
}

function formatPrice(n) {
  return Number(n).toLocaleString("th-TH");
}

/* ==========================================================
   2) หน้า order.html
   ========================================================== */
function initOrderPage() {
  var form = document.getElementById("orderForm");
  var itemsInput = document.getElementById("items");
  var totalInput = document.getElementById("total");

  // อ่านค่า item และ price จาก URL แล้วเติมลงฟอร์มทันที
  var params = new URLSearchParams(window.location.search);
  var item = params.get("item");
  var price = params.get("price");

  if (item && itemsInput) itemsInput.value = item;
  if (price && totalInput) totalInput.value = price;

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var payload = {
      customerName: document.getElementById("customerName").value.trim(),
      contact: document.getElementById("contact").value.trim(),
      items: document.getElementById("items").value.trim(),
      total: document.getElementById("total").value.trim(),
      note: document.getElementById("note").value.trim()
    };

    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    })
      .then(() => { window.location.href = "thankyou.html"; })
      .catch(error => {
        console.error(error);
        alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        if (submitBtn) submitBtn.disabled = false;
      });
  });
}

/* ==========================================================
   3) หน้า admin.html
   ========================================================== */
function initAdminPage() {
  var tbody = document.querySelector("#ordersTable tbody");

  function showMessage(text) {
    tbody.innerHTML = "";
    var tr = document.createElement("tr");
    var td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = text;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  showMessage("กำลังโหลดข้อมูล...");

  // กันเบราว์เซอร์จำข้อมูลเก่า (cache) ด้วยการต่อ timestamp
  var url = CSV_URL + (CSV_URL.indexOf("?") === -1 ? "?" : "&") + "t=" + Date.now();

  fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error("โหลดข้อมูล CSV ไม่สำเร็จ");
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text);
      if (HAS_HEADER_ROW) rows = rows.slice(1);

      // ตัดแถวว่าง แล้วเรียงรายการล่าสุดขึ้นก่อน
      rows = rows
        .filter(function (r) {
          return r.some(function (cell) { return cell.trim() !== ""; });
        })
        .reverse();

      if (rows.length === 0) {
        showMessage("ยังไม่มีคำสั่งซื้อ");
        return;
      }

      tbody.innerHTML = "";
      rows.forEach(function (r) {
        var tr = document.createElement("tr");
        // คอลัมน์: วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
        for (var i = 0; i < 6; i++) {
          var td = document.createElement("td");
          td.textContent = r[i] !== undefined ? r[i] : "";
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
    })
    .catch(function (error) {
      console.error(error);
      showMessage("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    });
}

/* ---------- ฟังก์ชัน parse CSV เอง (รองรับ "..." , "" และขึ้นบรรทัดใหม่ในช่อง) ---------- */
function parseCSV(text) {
  var rows = [];
  var row = [];
  var field = "";
  var inQuotes = false;

  // ตัด BOM ถ้ามี
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (var i = 0; i < text.length; i++) {
    var ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  // แถวสุดท้ายที่ไม่มี newline ปิดท้าย
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
