const STORAGE_KEY = "scentInventory.v1";

const demoData = {
  items: [
    {
      id: "item-1",
      fragrance: "白茶無花果",
      name: "擴香 100ml",
      sku: "WT-FIG-D100",
      stock: 8,
      notes: "門市 A 架，熱銷款",
      soldOut: false,
    },
    {
      id: "item-2",
      fragrance: "白茶無花果",
      name: "滾珠香水 10ml",
      sku: "WT-FIG-R10",
      stock: 2,
      notes: "低庫存，需補貨",
      soldOut: false,
    },
    {
      id: "item-3",
      fragrance: "雪松琥珀",
      name: "香氛蠟燭 180g",
      sku: "CED-AM-C180",
      stock: 0,
      notes: "等待新批次",
      soldOut: true,
    },
    {
      id: "item-4",
      fragrance: "桂花烏龍",
      name: "室內噴霧 50ml",
      sku: "OS-OL-M50",
      stock: 12,
      notes: "",
      soldOut: false,
    },
  ],
  reservations: [
    {
      id: "res-1",
      itemId: "item-1",
      customer: "陳小姐",
      quantity: 2,
      notes: "已付款，週末取貨",
      fulfilled: false,
      createdAt: "2026-06-20",
    },
    {
      id: "res-2",
      itemId: "item-3",
      customer: "林先生",
      quantity: 1,
      notes: "到貨通知",
      fulfilled: false,
      createdAt: "2026-06-20",
    },
  ],
};

let state = loadState();
let selectedFragrance = "all";

const elements = {
  availableStock: document.querySelector("#availableStock"),
  currentSubtitle: document.querySelector("#currentSubtitle"),
  currentTitle: document.querySelector("#currentTitle"),
  emptyInventory: document.querySelector("#emptyInventory"),
  emptyReservations: document.querySelector("#emptyReservations"),
  exportCsvButton: document.querySelector("#exportCsvButton"),
  fragranceList: document.querySelector("#fragranceList"),
  inventoryGrid: document.querySelector("#inventoryGrid"),
  itemForm: document.querySelector("#itemForm"),
  openReservations: document.querySelector("#openReservations"),
  reservationForm: document.querySelector("#reservationForm"),
  reservationItemSelect: document.querySelector("#reservationItemSelect"),
  reservationList: document.querySelector("#reservationList"),
  resetDemoButton: document.querySelector("#resetDemoButton"),
  searchInput: document.querySelector("#searchInput"),
  showAllButton: document.querySelector("#showAllButton"),
  soldOutCount: document.querySelector("#soldOutCount"),
  statusFilter: document.querySelector("#statusFilter"),
  totalItems: document.querySelector("#totalItems"),
};

function loadState() {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(demoData);

  try {
    return JSON.parse(saved);
  } catch {
    return structuredClone(demoData);
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function openReservationsForItem(itemId) {
  return state.reservations
    .filter((reservation) => reservation.itemId === itemId && !reservation.fulfilled)
    .reduce((total, reservation) => total + Number(reservation.quantity), 0);
}

function availableForItem(item) {
  if (item.soldOut) return 0;
  return Math.max(0, Number(item.stock) - openReservationsForItem(item.id));
}

function statusForItem(item) {
  const available = availableForItem(item);
  if (item.soldOut || available === 0) return { label: "售完", value: "soldout" };
  if (available <= 2) return { label: "低庫存", value: "low" };
  return { label: "可售", value: "available" };
}

function getFilteredItems() {
  const keyword = elements.searchInput.value.trim().toLowerCase();
  const status = elements.statusFilter.value;

  return state.items.filter((item) => {
    const itemStatus = statusForItem(item).value;
    const matchesFragrance =
      selectedFragrance === "all" || item.fragrance === selectedFragrance;
    const matchesStatus = status === "all" || itemStatus === status;
    const searchText = `${item.fragrance} ${item.name} ${item.sku}`.toLowerCase();
    const matchesKeyword = !keyword || searchText.includes(keyword);
    return matchesFragrance && matchesStatus && matchesKeyword;
  });
}

function renderSummary() {
  const availableStock = state.items.reduce(
    (total, item) => total + availableForItem(item),
    0,
  );
  const soldOutCount = state.items.filter(
    (item) => statusForItem(item).value === "soldout",
  ).length;
  const openReservations = state.reservations
    .filter((reservation) => !reservation.fulfilled)
    .reduce((total, reservation) => total + Number(reservation.quantity), 0);

  elements.totalItems.textContent = state.items.length;
  elements.availableStock.textContent = availableStock;
  elements.soldOutCount.textContent = soldOutCount;
  elements.openReservations.textContent = openReservations;
}

function renderFragrances() {
  const fragrances = [...new Set(state.items.map((item) => item.fragrance))].sort(
    (a, b) => a.localeCompare(b, "zh-Hant"),
  );
  elements.fragranceList.innerHTML = "";

  fragrances.forEach((fragrance) => {
    const items = state.items.filter((item) => item.fragrance === fragrance);
    const available = items.reduce((total, item) => total + availableForItem(item), 0);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fragrance-button";
    if (selectedFragrance === fragrance) button.classList.add("active");
    button.innerHTML = `<strong>${fragrance}</strong><span>${available} 可售</span>`;
    button.addEventListener("click", () => {
      selectedFragrance = fragrance;
      render();
    });
    elements.fragranceList.append(button);
  });
}

function renderInventory() {
  const template = document.querySelector("#itemCardTemplate");
  const filteredItems = getFilteredItems();
  elements.inventoryGrid.innerHTML = "";
  elements.emptyInventory.hidden = filteredItems.length > 0;

  elements.currentTitle.textContent =
    selectedFragrance === "all" ? "全部品項" : selectedFragrance;
  elements.currentSubtitle.textContent =
    selectedFragrance === "all"
      ? "即時查看每個香氣下的可售、預定與售完狀態。"
      : `正在查看「${selectedFragrance}」的所有品項。`;

  filteredItems.forEach((item) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const status = statusForItem(item);
    const reserved = openReservationsForItem(item.id);
    const available = availableForItem(item);

    node.dataset.itemId = item.id;
    node.classList.toggle("soldout", status.value === "soldout");
    node.querySelector(".fragrance-name").textContent = item.fragrance;
    node.querySelector("h3").textContent = item.name;
    node.querySelector(".sku").textContent = item.sku;
    node.querySelector(".status-pill").textContent = status.label;
    node.querySelector(".status-pill").classList.add(status.value);
    node.querySelector(".stock-total").textContent = item.stock;
    node.querySelector(".reserved-total").textContent = reserved;
    node.querySelector(".available-total").textContent = available;
    node.querySelector(".item-notes").textContent = item.notes || "沒有備註";
    node.querySelector(".restore-item").hidden = !item.soldOut;
    node.querySelector(".mark-soldout").hidden = item.soldOut;

    elements.inventoryGrid.append(node);
  });
}

function renderReservationSelect() {
  elements.reservationItemSelect.innerHTML = "";
  state.items
    .slice()
    .sort((a, b) => `${a.fragrance}${a.name}`.localeCompare(`${b.fragrance}${b.name}`))
    .forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.fragrance} / ${item.name} / 可售 ${availableForItem(item)}`;
      elements.reservationItemSelect.append(option);
    });
}

function renderReservations() {
  const openReservations = state.reservations.filter(
    (reservation) => !reservation.fulfilled,
  );
  elements.reservationList.innerHTML = "";
  elements.emptyReservations.hidden = openReservations.length > 0;

  openReservations.forEach((reservation) => {
    const item = state.items.find((candidate) => candidate.id === reservation.itemId);
    const row = document.createElement("article");
    row.className = "reservation-row";
    row.innerHTML = `
      <div>
        <strong>${reservation.customer}</strong>
        <span>${reservation.createdAt} 建立</span>
      </div>
      <div>
        <strong>${item ? `${item.fragrance} / ${item.name}` : "品項已不存在"}</strong>
        <span>${reservation.quantity} 件 · ${reservation.notes || "沒有備註"}</span>
      </div>
      <button class="mini-button fulfill-reservation" type="button" data-id="${reservation.id}">標記出貨</button>
    `;
    elements.reservationList.append(row);
  });
}

function render() {
  saveState();
  renderSummary();
  renderFragrances();
  renderInventory();
  renderReservationSelect();
  renderReservations();
}

function itemFromForm(form) {
  const data = new FormData(form);
  return {
    fragrance: data.get("fragrance").trim(),
    name: data.get("name").trim(),
    sku: data.get("sku").trim(),
    stock: Number(data.get("stock")),
    notes: data.get("notes").trim(),
  };
}

elements.itemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const nextItem = itemFromForm(event.currentTarget);
  const existingItem = state.items.find((item) => item.sku === nextItem.sku);

  if (existingItem) {
    existingItem.fragrance = nextItem.fragrance;
    existingItem.name = nextItem.name;
    existingItem.stock += nextItem.stock;
    existingItem.notes = nextItem.notes;
    existingItem.soldOut = existingItem.stock === 0;
  } else {
    state.items.push({
      id: crypto.randomUUID(),
      ...nextItem,
      soldOut: nextItem.stock === 0,
    });
  }

  selectedFragrance = nextItem.fragrance;
  event.currentTarget.reset();
  event.currentTarget.stock.value = 1;
  render();
});

elements.reservationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.reservations.push({
    id: crypto.randomUUID(),
    itemId: data.get("itemId"),
    customer: data.get("customer").trim(),
    quantity: Number(data.get("quantity")),
    notes: data.get("notes").trim(),
    fulfilled: false,
    createdAt: new Date().toISOString().slice(0, 10),
  });
  event.currentTarget.reset();
  event.currentTarget.quantity.value = 1;
  render();
});

elements.inventoryGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const card = button.closest(".item-card");
  const item = state.items.find((candidate) => candidate.id === card.dataset.itemId);
  if (!item) return;

  if (button.classList.contains("adjust-minus")) {
    item.stock = Math.max(0, item.stock - 1);
    item.soldOut = item.stock === 0;
  }

  if (button.classList.contains("adjust-plus")) {
    item.stock += 1;
    item.soldOut = false;
  }

  if (button.classList.contains("mark-soldout")) {
    item.stock = 0;
    item.soldOut = true;
  }

  if (button.classList.contains("restore-item")) {
    item.soldOut = false;
  }

  render();
});

elements.reservationList.addEventListener("click", (event) => {
  const button = event.target.closest(".fulfill-reservation");
  if (!button) return;

  const reservation = state.reservations.find(
    (candidate) => candidate.id === button.dataset.id,
  );
  const item = state.items.find((candidate) => candidate.id === reservation?.itemId);

  if (reservation) reservation.fulfilled = true;
  if (item) item.stock = Math.max(0, item.stock - Number(reservation.quantity));
  render();
});

elements.showAllButton.addEventListener("click", () => {
  selectedFragrance = "all";
  render();
});

elements.searchInput.addEventListener("input", render);
elements.statusFilter.addEventListener("change", render);

elements.resetDemoButton.addEventListener("click", () => {
  state = structuredClone(demoData);
  selectedFragrance = "all";
  render();
});

elements.exportCsvButton.addEventListener("click", () => {
  const rows = [
    ["香氣", "品項", "SKU", "總庫存", "已預定", "可售", "狀態", "備註"],
    ...state.items.map((item) => {
      const status = statusForItem(item);
      return [
        item.fragrance,
        item.name,
        item.sku,
        item.stock,
        openReservationsForItem(item.id),
        availableForItem(item),
        status.label,
        item.notes,
      ];
    }),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "香氛庫存.csv";
  link.click();
  URL.revokeObjectURL(url);
});

render();
