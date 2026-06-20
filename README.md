# 香氛庫存管理

這裡有兩個 APFR 庫存頁：

- `apfr-inventory.html`：現場管理用，可查看售完、補貨清單與匯出。
- `customer-inventory.html`：客人瀏覽用，風格較接近 APFR 日本官網；依品項顯示品項圖片，依香氣顯示香氣介紹。

## 開始使用

建議直接雙擊 `啟動 APFR 庫存.command`。

它會打開本機頁面 `http://127.0.0.1:8787/apfr-inventory.html`，並啟動只在這台電腦上運作的小服務。保持啟動視窗開著，就能在頁面使用 `更新並重整庫存`。

若只想手動更新資料，也可以雙擊 `更新 APFR 庫存.command`，完成後重新整理 `apfr-inventory.html`。

## 平板與其他電腦共用

雙擊 `啟動 APFR 客人瀏覽.command`，並保持跳出的視窗開啟。讓平板與其他電腦連上相同 Wi-Fi，接著使用啟動視窗顯示的「客人瀏覽網址」開啟 `customer-inventory.html`。

在這台電腦完成庫存更新後，其他裝置重新整理頁面，就會看到最新資料。

啟動共享頁後，系統會立即同步一次，之後每 15 分鐘自動同步 Everydayware 庫存。客人頁每分鐘檢查一次最新資料並自動更新。

## 雲端版本（不需保持電腦開機）

專案內已準備好 GitHub Pages 雲端部署設定。建立一個公開 GitHub repository 後，把這個資料夾推送到 `main` 分支，並在 repository 的 **Settings > Pages** 將來源選為 **GitHub Actions**。

GitHub Actions 會每 15 分鐘在雲端執行 `sync_inventory.rb`，更新庫存資料並發布客人頁。GitHub 排程在尖峰時段可能略有延遲。網站網址會是：

`https://你的GitHub帳號.github.io/專案名稱/customer-inventory.html`

這個雲端版本是客人瀏覽用，並會公開顯示庫存資料；管理頁與本機啟動檔不會被發布。

## APFR 官網庫存總覽

- 依香氣查看哪些品項有庫存
- 依品項查看哪些香氣有庫存
- 一鍵更新並重整官網庫存
- 售完品項仍會顯示，並標示售完
- 一鍵整理售完補貨清單，預設依品項列出售完味道
- 匯出售完補貨清單 CSV
- 搜尋味道、品項或價格
- 連回原本官網商品頁
- 匯出目前篩選結果 CSV

## 後續可擴充

- 多人同步與雲端資料庫
- 條碼或 QR code 掃描
- 客戶聯絡方式與出貨紀錄
- 補貨提醒
- 月銷售報表
