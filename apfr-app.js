const LOCAL_SYNC_KEY = "apfrInventory.latest";

const productSources = [
  ["洗手露", "https://www.everydayware.co/products/apotheke-fragrance-handwash"],
  ["室內擴香", "https://www.everydayware.co/products/apotheke-fragrance-reed-diffuser"],
  ["盒裝塔香", "https://www.everydayware.co/products/apotheke-fragrance-incense-cone-1"],
  ["線香", "https://www.everydayware.co/products/apotheke-fragrance-incense-sticks"],
  ["燃燒專用精油", "https://www.everydayware.co/products/apotheke-fragrance-fragrance-oil"],
  ["燃燒專用精油 舊包裝", "https://www.everydayware.co/products/apotheke-fragrance--fragrance-oil"],
  ["室內擴香 舊包裝", "https://www.everydayware.co/products/apotheke-fragrance-reed--diffuser"],
  ["旅遊罐裝蠟燭", "https://www.everydayware.co/products/apotheke-fragrance-travel-tin-candle"],
  ["空間噴霧", "https://www.everydayware.co/products/apotheke-fragrance-room-mist-spray"],
  ["衣櫥香氛吊卡", "https://www.everydayware.co/products/apotheke-fragrance-closet-tag"],
  ["玻璃罐裝蠟燭 舊包裝", "https://www.everydayware.co/products/apotheke-fragrance-glass--jar--candle"],
  ["玻璃罐裝蠟燭", "https://www.everydayware.co/products/apotheke-fragrance-glass-jar-candle"],
];

const officialProductImages = {
  "洗手露": "product-images/hand-wash.png",
  "室內擴香": "product-images/reed-diffuser.png",
  "盒裝塔香": "product-images/incense-cones.png",
  "線香": "product-images/incense-sticks.png",
  "燃燒專用精油": "product-images/fragrance-oil.png",
  "燃燒專用精油 舊包裝": "product-images/fragrance-oil-old-baseline.png",
  "室內擴香 舊包裝": "product-images/reed-diffuser-old.png",
  "旅遊罐裝蠟燭": "product-images/travel-tin-candle.png",
  "空間噴霧": "product-images/room-mist-spray.png",
  "衣櫥香氛吊卡": "product-images/closet-tag.png",
  "玻璃罐裝蠟燭 舊包裝": "product-images/fragrance-candle-old.png",
  "玻璃罐裝蠟燭": "product-images/fragrance-candle.png",
};

let inventoryData = loadInventoryData();

function loadInventoryData() {
  const bundledData = window.APFR_INVENTORY_DATA || {
    updatedAt: "",
    sourceCount: 0,
    items: [],
  };

  try {
    const saved = window.localStorage.getItem(LOCAL_SYNC_KEY);
    if (saved) {
      const localData = JSON.parse(saved);
      return localData.updatedAt >= bundledData.updatedAt ? localData : bundledData;
    }
  } catch {
    window.localStorage.removeItem(LOCAL_SYNC_KEY);
  }

  return bundledData;
}

const state = {
  view: "scent",
  restockView: "product",
  selected: "",
  search: "",
};

const els = {
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
  closeRestockButton: document.querySelector("#closeRestockButton"),
  currentSubtitle: document.querySelector("#currentSubtitle"),
  currentTitle: document.querySelector("#currentTitle"),
  emptyState: document.querySelector("#emptyState"),
  emptyRestock: document.querySelector("#emptyRestock"),
  exportCsvButton: document.querySelector("#exportCsvButton"),
  exportRestockButton: document.querySelector("#exportRestockButton"),
  inventoryTableBody: document.querySelector("#inventoryTableBody"),
  listTitle: document.querySelector("#listTitle"),
  optionList: document.querySelector("#optionList"),
  restockButton: document.querySelector("#restockButton"),
  restockList: document.querySelector("#restockList"),
  restockPanel: document.querySelector("#restockPanel"),
  restockSummary: document.querySelector("#restockSummary"),
  restockViewButtons: document.querySelectorAll("[data-restock-view]"),
  resultGrid: document.querySelector("#resultGrid"),
  searchInput: document.querySelector("#searchInput"),
  syncStatus: document.querySelector("#syncStatus"),
  syncHint: document.querySelector("#syncHint"),
  syncNowButton: document.querySelector("#syncNowButton"),
  syncTime: document.querySelector("#syncTime"),
  viewButtons: document.querySelectorAll("[data-view]"),
};

const alphaNumericSorter = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function normalizeText(value) {
  return String(value || "").trim();
}

function isInStock(item) {
  return Number(item.quantity) > 0 && !item.soldOut;
}

function uniqueValues(key) {
  return [...new Set(inventoryData.items.map((item) => item[key]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

function sortAlphaNumeric(a, b) {
  return alphaNumericSorter.compare(normalizeText(a), normalizeText(b));
}

function downloadCsv(rows, filename) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function extractProduct(html) {
  const match = html.match(/app\.value\('product', JSON\.parse\('(.*?)'\)\);/s);
  if (!match) throw new Error("找不到商品資料");
  return JSON.parse(JSON.parse(`"${match[1]}"`));
}

function cleanScent(name) {
  return normalizeText(name)
    .replace(/[（(]\s*售完停產\s*[）)]/g, "")
    .replace(/[（(]\s*停產\s*[）)]/g, "")
    .trim();
}

function accessoryVariation(name) {
  const text = normalizeText(name);
  return text.includes("擴香竹") || text.includes("禮品包裝");
}

function variationName(variation) {
  return (
    variation?.fields?.[0]?.name ||
    variation?.fields_translations?.["zh-hant"]?.[0] ||
    variation?.key ||
    ""
  );
}

function recordsFromProduct(product, label, url) {
  const variations = product.variations || [];
  const title = product.title_translations?.["zh-hant"] || label;
  const productImage =
    officialProductImages[label] ||
    product.media?.[0]?.images?.original?.url ||
    product.cover_media_array?.[0]?.original_image_url ||
    product.media?.[0]?.default_image_url ||
    "";

  if (variations.length === 0) {
    const quantity = Number(product.quantity || 0);
    return [
      {
        id: product._id,
        productLabel: label,
        productTitle: title,
        scent: label,
        rawScent: label,
        quantity,
        soldOut: Boolean(product.sold_out) || quantity <= 0,
        price: product.price?.label || "",
        productImage,
        url,
      },
    ];
  }

  return variations
    .filter((variation) => !accessoryVariation(variationName(variation)))
    .map((variation) => {
      const rawScent = variationName(variation);
      const quantity = Number(variation.quantity || 0);
      return {
        id: `${product._id}:${variation.key || variation.stock_id}`,
        productLabel: label,
        productTitle: title,
        scent: cleanScent(rawScent),
        rawScent,
        quantity,
        soldOut: Boolean(product.sold_out) || quantity <= 0,
        price: variation.price?.label || product.price?.label || "",
        productImage,
        url,
      };
    });
}

function formatUpdatedAt(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

async function syncInventoryFromOfficialSite() {
  els.syncNowButton.disabled = true;
  els.syncNowButton.textContent = "更新中...";
  els.syncStatus.textContent = "正在讀取官網庫存";
  els.syncHint.textContent = "正在逐一讀取 APFR 商品頁，完成後會自動重新載入。";

  try {
    if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
      const response = await fetch("/api/sync", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "本機同步失敗");
      window.localStorage.setItem(LOCAL_SYNC_KEY, JSON.stringify(payload));
      window.location.reload();
      return;
    }

    const itemGroups = await Promise.all(
      productSources.map(async ([label, url]) => {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`${label} 讀取失敗`);
        const html = await response.text();
        return recordsFromProduct(extractProduct(html), label, url);
      }),
    );

    const payload = {
      updatedAt: formatUpdatedAt(new Date()),
      sourceCount: productSources.length,
      items: itemGroups.flat(),
    };

    window.localStorage.setItem(LOCAL_SYNC_KEY, JSON.stringify(payload));
    window.location.reload();
  } catch (error) {
    els.syncNowButton.disabled = false;
    els.syncNowButton.textContent = "更新並重整庫存";
    els.syncStatus.textContent = "瀏覽器無法直接更新";
    els.syncHint.textContent =
      "請改用資料夾裡的「更新 APFR 庫存.command」，完成後重新整理此頁。";
    window.alert(`瀏覽器阻擋直接讀取官網資料。\n\n${error.message}\n\n請改用「更新 APFR 庫存.command」。`);
  }
}

function filteredItems() {
  const keyword = state.search.toLowerCase();
  const key = state.view === "scent" ? "scent" : "productLabel";

  return inventoryData.items.filter((item) => {
    const matchesSelection = !state.selected || item[key] === state.selected;
    const text = [
      item.scent,
      item.productLabel,
      item.productTitle,
      item.price,
      item.statusText,
    ].join(" ").toLowerCase();
    const matchesSearch = !keyword || text.includes(keyword);
    return matchesSelection && matchesSearch;
  });
}

function soldOutItems() {
  return inventoryData.items
    .filter((item) => !isInStock(item))
    .sort((a, b) => {
      const productSort = sortAlphaNumeric(a.productLabel, b.productLabel);
      if (productSort !== 0) return productSort;
      return sortAlphaNumeric(a.scent, b.scent);
    });
}

function restockGroups() {
  const groupKey = state.restockView === "scent" ? "scent" : "productLabel";
  return soldOutItems().reduce((result, item) => {
    if (!result.has(item[groupKey])) result.set(item[groupKey], []);
    result.get(item[groupKey]).push(item);
    return result;
  }, new Map());
}

function renderSyncStatus() {
  if (inventoryData.updatedAt) {
    els.syncStatus.textContent = `已讀取 ${inventoryData.sourceCount} 個官網品項`;
    els.syncTime.textContent = `最後更新：${inventoryData.updatedAt}`;
  } else {
    els.syncStatus.textContent = "尚未同步官網資料";
    els.syncTime.textContent = "請先執行「更新 APFR 庫存.command」。";
  }
}

function renderOptions() {
  const key = state.view === "scent" ? "scent" : "productLabel";
  const label = state.view === "scent" ? "香氣" : "品項";
  els.listTitle.textContent = label;
  els.optionList.innerHTML = "";

  uniqueValues(key).forEach((value) => {
    const items = inventoryData.items.filter((item) => item[key] === value);
    const stockCount = items.filter(isInStock).length;
    const button = document.createElement("button");
    button.className = "fragrance-button";
    button.type = "button";
    button.classList.toggle("active", state.selected === value);
    button.innerHTML = `
      <strong>${value}</strong>
      <span class="option-count">${stockCount}/${items.length} 有庫存</span>
    `;
    button.addEventListener("click", () => {
      state.selected = value;
      render();
    });
    els.optionList.append(button);
  });
}

function statusLabel(item) {
  return isInStock(item) ? `有庫存 ${item.quantity}` : "售完";
}

function renderCards() {
  const items = filteredItems();
  const primary = state.view === "scent" ? "productLabel" : "scent";
  const secondary = state.view === "scent" ? "scent" : "productLabel";
  els.resultGrid.innerHTML = "";
  els.emptyState.hidden = items.length > 0;

  els.currentTitle.textContent = state.selected || "全部庫存";
  els.currentSubtitle.textContent =
    state.view === "scent"
      ? "目前是依香氣查看：每張卡片代表這個味道對應到的品項。"
      : "目前是依品項查看：每張卡片代表這個品項對應到的味道。";

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = `stock-card ${isInStock(item) ? "" : "soldout"}`;
    card.innerHTML = `
      <p class="fragrance-name">${item[secondary]}</p>
      <h3>${item[primary]}</h3>
      <div class="card-meta">
        <span class="qty-badge ${isInStock(item) ? "" : "soldout"}">${statusLabel(item)}</span>
        <span>${item.price || "未標價"}</span>
      </div>
      <a href="${item.url}" target="_blank" rel="noreferrer">打開官網</a>
    `;
    els.resultGrid.append(card);
  });
}

function renderTable() {
  const items = filteredItems();
  els.inventoryTableBody.innerHTML = "";

  items.forEach((item) => {
    const row = document.createElement("tr");
    row.className = isInStock(item) ? "" : "soldout";
    row.innerHTML = `
      <td>${item.scent}</td>
      <td>${item.productLabel}</td>
      <td>${item.quantity}</td>
      <td>${item.price || ""}</td>
      <td>${statusLabel(item)}</td>
      <td><a href="${item.url}" target="_blank" rel="noreferrer">官網</a></td>
    `;
    els.inventoryTableBody.append(row);
  });
}

function renderRestockList() {
  const items = soldOutItems();
  const chipKey = state.restockView === "scent" ? "productLabel" : "scent";
  const groupLabel = state.restockView === "scent" ? "味道" : "品項";
  const chipLabel = state.restockView === "scent" ? "品項" : "味道";
  const groups = restockGroups();

  els.restockList.innerHTML = "";
  els.emptyRestock.hidden = items.length > 0;
  els.restockSummary.textContent =
    items.length > 0
      ? `目前依${groupLabel}整理：${groups.size} 個${groupLabel}、${items.length} 筆售完組合。`
      : "目前沒有售完品項。";

  [...groups]
    .sort(([nameA], [nameB]) => sortAlphaNumeric(nameA, nameB))
    .forEach(([groupName, groupItems]) => {
    const group = document.createElement("article");
    group.className = "restock-group";
    group.innerHTML = `
      <div>
        <h3>${groupName}</h3>
        <span>${groupItems.length} 個${chipLabel}售完</span>
      </div>
      <div class="restock-products">
        ${groupItems
          .slice()
          .sort((a, b) => sortAlphaNumeric(a[chipKey], b[chipKey]))
          .map((item) => `<span>${item[chipKey]}</span>`)
          .join("")}
      </div>
    `;
    els.restockList.append(group);
  });
}

function render() {
  renderSyncStatus();
  renderOptions();
  renderCards();
  renderTable();
}

els.viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.view = button.dataset.view;
    state.selected = "";
    document.querySelectorAll("[data-view]").forEach((candidate) => {
      candidate.classList.toggle("active", candidate === button);
    });
    render();
  });
});

els.clearSelectionButton.addEventListener("click", () => {
  state.selected = "";
  render();
});

els.syncNowButton.addEventListener("click", syncInventoryFromOfficialSite);

els.restockButton.addEventListener("click", () => {
  renderRestockList();
  els.restockPanel.hidden = false;
  els.restockPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

els.restockViewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.restockView = button.dataset.restockView;
    els.restockViewButtons.forEach((candidate) => {
      candidate.classList.toggle("active", candidate === button);
    });
    renderRestockList();
  });
});

els.closeRestockButton.addEventListener("click", () => {
  els.restockPanel.hidden = true;
});

els.exportRestockButton.addEventListener("click", () => {
  const groupedRows = [...restockGroups()].sort(([nameA], [nameB]) =>
    sortAlphaNumeric(nameA, nameB),
  );
  const rows =
    state.restockView === "scent"
      ? [
          ["味道", "售完品項", "售完品項數"],
          ...groupedRows.map(([scent, items]) => [
            scent,
            items
              .slice()
              .sort((a, b) => sortAlphaNumeric(a.productLabel, b.productLabel))
              .map((item) => item.productLabel)
              .join("、"),
            items.length,
          ]),
        ]
      : [
          ["品項", "售完味道", "售完味道數"],
          ...groupedRows.map(([productLabel, items]) => [
            productLabel,
            items
              .slice()
              .sort((a, b) => sortAlphaNumeric(a.scent, b.scent))
              .map((item) => item.scent)
              .join("、"),
            items.length,
          ]),
        ];
  const filename =
    state.restockView === "scent"
      ? "APFR售完補貨清單-依味道.csv"
      : "APFR售完補貨清單-依品項.csv";
  downloadCsv(rows, filename);
});

els.searchInput.addEventListener("input", (event) => {
  state.search = normalizeText(event.target.value);
  render();
});

els.exportCsvButton.addEventListener("click", () => {
  const rows = [
    ["香氣", "品項", "庫存", "價格", "狀態", "官網"],
    ...filteredItems().map((item) => [
      item.scent,
      item.productLabel,
      item.quantity,
      item.price,
      statusLabel(item),
      item.url,
    ]),
  ];
  downloadCsv(rows, "APFR官網庫存.csv");
});

render();
