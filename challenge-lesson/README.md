# 六年級挑戰課（課堂互動網站・前端）

搭配「同學留言」的兩節課（80 分鐘）前導活動：

1. **活動一：我遇到的挑戰**：學生用平板寫下挑戰，投影畫面即時變成文字雲。
2. **活動二：我想到的方法**：從文字雲前 8 名挑戰中選一個寫方法，再每人 3 票投票。
3. **活動三：留言回饋**：用時空膠囊寫信給同學，再回到這裡選一個這週要試的方法。

## 網址

| 用途 | 網址 |
|---|---|
| 學生平板 | https://star1123-cheng.github.io/class602-space-capsule/challenge-lesson/ |
| 老師投影 | https://star1123-cheng.github.io/class602-space-capsule/challenge-lesson/screen.html |

學生掃投影頁上的 QR code 就會進到學生頁。

## 運作方式

網頁放在 GitHub Pages；資料用 `fetch` 送到 Apps Script，存在老師的試算表（做法和時空膠囊一樣）。

| 檔案 | 用途 |
|---|---|
| `index.html` | 學生平板頁 |
| `screen.html` | 老師投影頁 |
| `style.css` | 共用樣式 |
| `app.js` | 共用程式（呼叫後端、文字雲排版），Apps Script 網址寫在這裡 |
| `preview/` | 本機預覽用的假後端，不連線 |

後端 `Code.gs` 與 `appsscript.json` **不放在這個公開 repo**，只存在 Apps Script 和老師雲端硬碟的 `六年級挑戰課` 資料夾，那份才是正本；這裡的前端也是從那裡複製過來的。

`app.js` 裡的 Apps Script 網址不是密碼：學生本來就要連到它。真正的保護是：

- 學生送出要有**課堂代碼**（4 位數，老師在投影頁按「換新代碼」）。
- 活動沒開放時，後端一律拒收。
- 老師操作要**導師密碼**（存在 Apps Script 指令碼屬性），連錯 5 次鎖 10 分鐘。

## 本機預覽（不連線、不動到真實資料）

```bash
node preview/server.js
```

打開 http://localhost:5178/（學生頁）與 http://localhost:5178/screen.html（投影頁）。示範用導師密碼是 `demo`、課堂代碼是 `1234`，只在本機預覽有效。網址加 `?seed=1` 會放入虛構示範資料。

## 隱私

試算表只存座號，不存姓名；投影畫面也看不到座號。這個資料夾不含試算表 ID、指令碼 ID 或密碼。
