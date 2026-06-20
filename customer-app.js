const CUSTOMER_SYNC_KEY = "apfrInventory.latest";

let customerData = loadCustomerData();

function loadCustomerData() {
  const bundledData = window.APFR_INVENTORY_DATA || {
    updatedAt: "",
    items: [],
  };

  try {
    const saved = window.localStorage.getItem(CUSTOMER_SYNC_KEY);
    if (saved) {
      const localData = JSON.parse(saved);
      const localHasRichData =
        localData.scentInfo &&
        localData.items?.some((item) => item.productImage);
      const bundledHasRichData =
        bundledData.scentInfo &&
        bundledData.items?.some((item) => item.productImage);
      const localHasChineseInfo =
        localData.scentInfo &&
        Object.values(localData.scentInfo).some((info) => info.descriptionZh);
      const bundledHasChineseInfo =
        bundledData.scentInfo &&
        Object.values(bundledData.scentInfo).some((info) => info.descriptionZh);
      const localHasProductInfo =
        localData.items?.some((item) => item.productDescriptionZh || item.productSpecZh);
      const bundledHasProductInfo =
        bundledData.items?.some((item) => item.productDescriptionZh || item.productSpecZh);
      const localHasGoods = Array.isArray(localData.goods);
      const bundledHasGoods = Array.isArray(bundledData.goods);
      const localHasLocalImages = localData.items?.some((item) =>
        item.productImage?.startsWith("product-images/"),
      );
      const bundledHasLocalImages = bundledData.items?.some((item) =>
        item.productImage?.startsWith("product-images/"),
      );
      if (bundledHasRichData && !localHasRichData) return bundledData;
      if (bundledHasChineseInfo && !localHasChineseInfo) return bundledData;
      if (bundledHasProductInfo && !localHasProductInfo) return bundledData;
      if (bundledHasGoods && !localHasGoods) return bundledData;
      if (bundledHasLocalImages && !localHasLocalImages) return bundledData;
      return localData.updatedAt >= bundledData.updatedAt ? localData : bundledData;
    }
  } catch {
    window.localStorage.removeItem(CUSTOMER_SYNC_KEY);
  }

  return bundledData;
}

const customerState = {
  view: "scent",
  selected: "",
  search: "",
};

const PRODUCT_DISPLAY_ORDER = [
  "衣櫥香氛吊卡",
  "線香",
  "盒裝塔香",
  "旅遊罐裝蠟燭",
  "玻璃罐裝蠟燭",
  "玻璃罐裝蠟燭 舊包裝",
  "空間噴霧",
  "室內擴香",
  "室內擴香 舊包裝",
  "燃燒專用精油",
  "燃燒專用精油 舊包裝",
  "洗手露",
];
const productOrder = new Map(PRODUCT_DISPLAY_ORDER.map((label, index) => [label, index]));

const customerEls = {
  customerGrid: document.querySelector("#customerGrid"),
  emptyState: document.querySelector("#emptyState"),
  featurePanel: document.querySelector("#featurePanel"),
  catalogLayout: document.querySelector("#catalogLayout"),
  indexPanel: document.querySelector("#indexPanel"),
  indexList: document.querySelector("#indexList"),
  indexTitle: document.querySelector("#indexTitle"),
  searchInput: document.querySelector("#searchInput"),
  updatedAt: document.querySelector("#updatedAt"),
  viewButtons: document.querySelectorAll("[data-view]"),
};

const customerSorter = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function isAvailable(item) {
  return Number(item.quantity) > 0 && !item.soldOut;
}

function scentInfo(name) {
  return customerData.scentInfo?.[name] || null;
}

function productImageFor(label) {
  return customerData.items.find((item) => item.productLabel === label && item.productImage)
    ?.productImage;
}

function productInfoFor(label) {
  return customerData.items.find(
    (item) =>
      item.productLabel === label &&
      (item.productDescriptionZh || item.productSpecZh),
  );
}

function sortText(a, b) {
  return customerSorter.compare(String(a || ""), String(b || ""));
}

function sortProductLabels(a, b) {
  const leftOrder = productOrder.get(a);
  const rightOrder = productOrder.get(b);
  if (leftOrder !== undefined || rightOrder !== undefined) {
    return (leftOrder ?? Number.MAX_SAFE_INTEGER) - (rightOrder ?? Number.MAX_SAFE_INTEGER);
  }
  return sortText(a, b);
}

function uniqueBy(key) {
  return [...new Set(customerData.items.map((item) => item[key]).filter(Boolean))]
    .sort(key === "productLabel" ? sortProductLabels : sortText);
}

function filteredCustomerItems() {
  const key = customerState.view === "scent" ? "scent" : "productLabel";
  const keyword = customerState.search.toLowerCase();

  return customerData.items.filter((item) => {
    const matchesSelected = !customerState.selected || item[key] === customerState.selected;
    const text = `${item.scent} ${item.productLabel} ${item.productTitle}`.toLowerCase();
    return matchesSelected && (!keyword || text.includes(keyword));
  });
}

function filteredGoods() {
  const keyword = customerState.search.toLowerCase();

  return (customerData.goods || []).filter((good) => {
    const text = `${good.label} ${good.title} ${good.descriptionZh}`.toLowerCase();
    return !keyword || text.includes(keyword);
  });
}

function renderIndex() {
  const isGoodsView = customerState.view === "goods";
  customerEls.indexPanel.hidden = isGoodsView;
  customerEls.catalogLayout.classList.toggle("goods-layout", isGoodsView);
  if (isGoodsView) return;

  const key = customerState.view === "scent" ? "scent" : "productLabel";
  customerEls.indexTitle.textContent = customerState.view === "scent" ? "Scents" : "Products";
  customerEls.indexList.innerHTML = "";

  uniqueBy(key).forEach((value) => {
    const allItems = customerData.items.filter((item) => item[key] === value);
    const availableCount = allItems.filter(isAvailable).length;
    const button = document.createElement("button");
    button.className = "index-button";
    button.classList.toggle("active", customerState.selected === value);
    button.type = "button";
    button.innerHTML = `<strong>${value}</strong><span>${availableCount}</span>`;
    button.addEventListener("click", () => {
      customerState.selected = customerState.selected === value ? "" : value;
      renderCustomerPage();
    });
    customerEls.indexList.append(button);
  });
}

function renderCards() {
  if (customerState.view === "goods") {
    renderGoodsCards(filteredGoods());
    return;
  }

  const items = filteredCustomerItems();
  const primary = customerState.view === "scent" ? "productLabel" : "scent";
  const secondary = customerState.view === "scent" ? "scent" : "productLabel";

  customerEls.customerGrid.innerHTML = "";
  customerEls.emptyState.hidden = items.length > 0;

  renderFeaturePanel(items);

  if (!customerState.selected) {
    renderGroupedCards(items, primary, secondary);
    return;
  }

  items
    .slice()
    .sort((a, b) => sortText(a[primary], b[primary]))
    .forEach((item) => {
      const card = document.createElement("article");
      card.className = `customer-card ${isAvailable(item) ? "" : "soldout"}`;
      if (customerState.view === "product") {
        const info = scentInfo(item.scent);
        card.innerHTML = `
          <h3>${item.scent}</h3>
          <p>${info?.notesZh || info?.family || item.productLabel}</p>
          <span class="status-line">${isAvailable(item) ? "IN STOCK" : "SOLD OUT"}</span>
        `;
      } else {
        card.innerHTML = `
          <figure class="product-thumb">
            ${item.productImage ? `<img src="${item.productImage}" alt="${item.productLabel}" loading="lazy" />` : ""}
          </figure>
          <h3>${item.productLabel}</h3>
          <p>${item.price || item.scent}</p>
          <span class="status-line">${isAvailable(item) ? "IN STOCK" : "SOLD OUT"}</span>
        `;
      }
      customerEls.customerGrid.append(card);
    });
}

function renderGoodsCards(goods) {
  customerEls.featurePanel.hidden = true;
  customerEls.featurePanel.innerHTML = "";
  customerEls.customerGrid.innerHTML = "";
  customerEls.emptyState.hidden = goods.length > 0;

  goods.forEach((good) => {
    const card = document.createElement("article");
    card.className = `customer-card goods-card ${isAvailable(good) ? "" : "soldout"}`;
    card.innerHTML = `
      <figure class="product-thumb">
        ${good.image ? `<img src="${good.image}" alt="${good.label}" loading="lazy" />` : ""}
      </figure>
      <h3>${good.label}</h3>
      <p>${good.descriptionZh || ""}</p>
      ${good.price ? `<p class="goods-price">${good.price}</p>` : ""}
      <span class="status-line">${isAvailable(good) ? "IN STOCK" : "SOLD OUT"}</span>
    `;
    customerEls.customerGrid.append(card);
  });
}

function renderGroupedCards(items, primary, secondary) {
  const groups = new Map();

  items.forEach((item) => {
    if (!groups.has(item[primary])) groups.set(item[primary], []);
    groups.get(item[primary]).push(item);
  });

  [...groups.entries()]
    .sort(([left], [right]) =>
      primary === "productLabel" ? sortProductLabels(left, right) : sortText(left, right),
    )
    .forEach(([groupName, groupItems]) => {
      const card = document.createElement("article");
      card.className = "customer-card summary-card";
      const firstItem = groupItems[0];
      const rows = groupItems
        .slice()
        .sort((left, right) => sortText(left[secondary], right[secondary]))
        .map(
          (item) => `
            <li class="inventory-line ${isAvailable(item) ? "" : "soldout"}">
              <span>${item[secondary]}</span>
              <span>${isAvailable(item) ? "IN STOCK" : "SOLD OUT"}</span>
            </li>
          `,
        )
        .join("");

      if (customerState.view === "scent") {
        const productInfo = productInfoFor(groupName);
        card.innerHTML = `
          <figure class="product-thumb">
            ${firstItem.productImage ? `<img src="${firstItem.productImage}" alt="${groupName}" loading="lazy" />` : ""}
          </figure>
          <h3>${groupName}</h3>
          ${productInfo?.productSpecZh ? `<p>${productInfo.productSpecZh}</p>` : ""}
          <ul class="inventory-lines">${rows}</ul>
        `;
      } else {
        const info = scentInfo(groupName);
        card.innerHTML = `
          <h3>${groupName}</h3>
          ${info?.notesZh ? `<p>${info.notesZh}</p>` : ""}
          <ul class="inventory-lines">${rows}</ul>
        `;
      }

      customerEls.customerGrid.append(card);
    });
}

function renderFeaturePanel(items) {
  const selected = customerState.selected;
  customerEls.featurePanel.hidden = false;

  if (customerState.view === "scent" && selected) {
    const info = scentInfo(selected);
    const hasImage = Boolean(info?.image);
    const description =
      info?.descriptionZh ||
      info?.description ||
      "請洽現場人員了解這款香氣的更多細節。";
    const notes =
      info?.notesZh ||
      (info?.notes?.length ? info.notes.join(" / ") : "");
    customerEls.featurePanel.className = `feature-panel scent-feature${hasImage ? "" : " no-feature-image"}`;
    customerEls.featurePanel.innerHTML = `
      ${hasImage ? `<img src="${info.image}" alt="${selected}" />` : ""}
      <div>
        <p class="feature-kicker">香氣介紹</p>
        <h3>${selected}</h3>
        <p class="feature-description">${description}</p>
        ${notes ? `<p class="feature-notes">${notes}</p>` : ""}
      </div>
    `;
    return;
  }

  if (customerState.view === "product" && selected) {
    const image = productImageFor(selected);
    const productInfo = productInfoFor(selected);
    const availableCount = items.filter(isAvailable).length;
    const description =
      productInfo?.productDescriptionZh ||
      `${availableCount} available scent${availableCount === 1 ? "" : "s"} in this product.`;
    customerEls.featurePanel.className = `feature-panel product-feature${image ? "" : " no-feature-image"}`;
    customerEls.featurePanel.innerHTML = `
      ${image ? `<img src="${image}" alt="${selected}" />` : ""}
      <div>
        <p class="feature-kicker">品項介紹</p>
        <h3>${selected}</h3>
        <p class="feature-description">${description}</p>
        ${
          productInfo?.productSpecZh
            ? `<p class="feature-notes">${productInfo.productSpecZh}</p>`
            : ""
        }
      </div>
    `;
    return;
  }

  customerEls.featurePanel.hidden = true;
  customerEls.featurePanel.innerHTML = "";
}

function renderCustomerPage() {
  renderIndex();
  renderCards();
  customerEls.updatedAt.textContent = customerData.updatedAt
    ? `Last updated: ${customerData.updatedAt}`
    : "Inventory sync time unavailable.";
}

async function refreshCustomerData() {
  if (window.location.protocol === "file:") return;

  try {
    const response = await fetch(`inventory-data.js?refresh=${Date.now()}`, {
      cache: "no-store",
    });
    const source = await response.text();
    const match = source.match(/window\.APFR_INVENTORY_DATA\s*=\s*(\{[\s\S]*\});?\s*$/);
    if (!match) return;

    const latestData = JSON.parse(match[1]);
    if (latestData.updatedAt && latestData.updatedAt !== customerData.updatedAt) {
      customerData = latestData;
      renderCustomerPage();
    }
  } catch {
    // Keep showing the last successful inventory while a refresh is unavailable.
  }
}

customerEls.viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    customerState.view = button.dataset.view;
    customerState.selected = "";
    customerEls.viewButtons.forEach((candidate) => {
      candidate.classList.toggle("active", candidate === button);
    });
    renderCustomerPage();
  });
});

customerEls.searchInput.addEventListener("input", (event) => {
  customerState.search = event.target.value.trim();
  renderCustomerPage();
});

renderCustomerPage();
setInterval(refreshCustomerData, 60 * 1000);
