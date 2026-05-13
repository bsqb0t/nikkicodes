# 无限暖暖 · 搭配码图鉴 — 开发文档

## 项目概况

纯静态站点，无构建步骤、零后端依赖。数据驱动，内容全部来自 `data/outfits.json`。
部署方式：GitHub + Cloudflare Pages。

---

## 目录结构

```
/
├── index.html            # 主页面（用户浏览）
├── admin.html            # 管理工具（可视化添加搭配）
├── css/
│   └── style.css         # 全部样式（~480行）
├── js/
│   └── app.js            # 全部前端逻辑（~320行）
├── data/
│   └── outfits.json      # ★ 唯一数据源
├── images/               # 搭配截图 + SVG 占位图
├── README.md             # 用户指南
└── DEVELOPMENT.md        # 开发文档（本文）
```

---

## 数据层 (`data/outfits.json`)

### 单条记录格式

```json
{
  "id": "outfit-001",
  "name": "眠于花畔",
  "aliases": ["花畔", "睡莲"],
  "code": "1amDS0Y5yJ9#",
  "image": "images/outfit-001.svg",
  "color": "粉色",
  "style": "梦幻",
  "setName": "万灵系列"
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 唯一标识，`outfit-` + 数字后缀。建议不重复即可 |
| `name` | string | 是 | 卡片标题 |
| `aliases` | array | 否 | 搜索关键词，无别名时填 `[]` |
| `code` | string | 是 | 游戏染色码，字母数字符号混合 |
| `image` | string | 是 | 本地路径 `images/xxx.jpg` 或网络 URL |
| `color` | string | 是 | 颜色分类，筛选标签由此生成 |
| `style` | string | 是 | 风格分类，筛选标签由此生成 |
| `setName` | string | 是 | 套装系列，筛选标签由此生成 |

### 约束规则

- **JSON 末尾不能有多余逗号**
- 新增记录时，前一条 `}` 后必须加逗号
- `color` / `style` / `setName` 的新值会自动出现在筛选标签中
- 如果重命名一个已有分类值，必须同步修改所有使用了该值的记录
- `image` 使用本地文件时，路径必须与 `images/` 下真实文件名完全一致

### 分类覆盖要求

为保持筛选功能可用，数据应尽量覆盖所有已有的分类值。
目前已有分类：

```
color:  粉色 | 蓝色 | 黑色 | 白色 | 黄色 | 紫色
style:  清新 | 优雅 | 梦幻 | 休闲
setName: 万灵系列 | 星海系列 | 能力套装 | 童话系列 | 星梦系列
```

---

## 前端架构 (`js/app.js`)

### 运行流程

```
init()
  └─ fetch('data/outfits.json')       → 加载数据
      ├─ renderFilters(allData)       → 从数据提取分类 → 生成筛选标签
      └─ render()                     → 应用当前筛选/搜索 → 渲染卡片 + 分页
```

### 状态管理

```javascript
const state = {
  allData: [],          // 原始全量数据
  filtered: [],         // 经过筛选/搜索后的子集
  currentPage: 1,
  pageSize: 12,
  searchQuery: '',
  activeFilters: { color: null, style: null, setName: null }
};
```

### 核心函数

| 函数 | 触发时机 | 作用 |
|---|---|---|
| `init()` | 页面加载 | fetch JSON → 渲染筛选标签 → 首次 render |
| `render()` | 数据变化 | 根据 filtered + currentPage 渲染卡片和分页 |
| `renderCards()` | render 内 | 生成卡片 HTML（含事件绑定） |
| `renderPagination()` | render 内 | 生成分页按钮 |
| `renderFilters()` | init | 从 allData 提取去重值 → 生成三组筛选按钮 |
| `applyFilters()` | 搜索/筛选变化 | 合并 searchQuery + activeFilters → 更新 filtered → render |
| `toggleFilter()` | 点击筛选按钮 | 切换某分类的激活状态 → applyFilters |
| `handleSearch()` | 搜索输入 | 更新 searchQuery → applyFilters |
| `copyCode()` | 点击搭配码 | 写入剪贴板 → 显示 toast |

### 搜索逻辑

搜索框实时过滤，匹配字段：`name` / `aliases` / `code` / `color` / `style` / `setName`

### 分页逻辑

- 每页 12 条
- 筛选/搜索后自动重置到第 1 页
- 少于 1 页时隐藏分页控件
- 页码窗口：当前页 ± 1，首尾页 + 省略号

### 图片点击

卡片图片点击 → 动态创建 lightbox 元素（`class="lightbox"`）→ 全屏显示原图
关闭方式：点击背景 / 点击 × 按钮 / 按 Esc

---

## 样式 (`css/style.css`)

### 主题变量

```css
:root {
  --pink-50: #fdf2f8;
  --pink-500: #ec4899;
  --pink-700: #be185d;
  /* ... */
}
```

修改变量即可全局换色。

### 图片显示

```css
.card-image {
  aspect-ratio: 3 / 4;     /* 固定比例 */
  overflow: hidden;
}
.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;       /* 裁剪填充 */
}
```

不同比例图片的视觉效果：

| 图片比例 | 裁切效果 |
|---|---|
| 3:4 | 完美显示 |
| 9:16（竖屏截图） | 上下各裁约 1/4 |
| 4:3（横屏） | 左右留白，不推荐 |

### 响应式断点

| 宽度 | 卡片列数 |
|---|---|
| ≤ 600px | 2 列 |
| 601–900px | 3 列 |
| > 900px | 4 列（auto-fill） |

---

## 管理工具 (`admin.html`)

### 功能

- 图片：支持粘贴 URL 或上传本地文件（二选一）
- 字段输入：名称、搭配码、颜色、风格、套装系列、别名
- 智能建议：颜色/风格/套装自动从现有数据加载下拉建议
- 预览：实时卡片预览
- 输出：生成可直接粘贴到 `outfits.json` 的 JSON

### 图片处理逻辑

```
有 URL 输入 → 使用 URL 作为 image 字段值，隐藏「推送图片」提示
无 URL 有文件 → 使用原始文件名作为 image 字段值，显示「推送图片」提示
两者都无     → 自动生成 SVG 占位图
```

### 加载现有数据

```javascript
async function loadExisting() {
  const res = await fetch('data/outfits.json');
  const data = await res.json();
  const colors = [...new Set(data.map(d => d.color))];
  const styles = [...new Set(data.map(d => d.style))];
  const sets = [...new Set(data.map(d => d.setName))];
  populateDatalist('dlColor', colors);
  populateDatalist('dlStyle', styles);
  populateDatalist('dlSet', sets);
}
```

---

## Cloudflare Pages 部署

### 配置

| 配置项 | 值 |
|---|---|
| 框架预设 | 无（None） |
| 构建命令 | 留空 |
| 构建输出目录 | `/` |
| 根目录 | 留空 |

### 自动部署

每次 `git push` 到 `main` 分支 → Cloudflare Pages 自动重新部署（约 1-2 分钟）。

### 绑定自定义域名（可选）

Cloudflare Dashboard → Pages → 你的项目 → 自定义域 → 输入域名 → 按提示添加 DNS 记录。

---

## 本地开发

```bash
# 启动本地服务器
python3 -m http.server 8080
# 浏览器打开
open http://localhost:8080
# 管理工具
open http://localhost:8080/admin.html
```

> 注意：直接双击 `index.html` 用 `file://` 协议打开时，`fetch` 会被浏览器拦截，务必使用本地服务器。

---

## 自定义指南

### 修改主题色

编辑 `css/style.css` 的 `:root` 变量，替换粉色系为其他颜色。

### 修改分页条数

编辑 `js/app.js` 第 2 行的 `PAGE_SIZE` 常量。

### 添加新字段

如果需要在数据中增加新字段（如 `"rarity": "五星"`）：

1. `data/outfits.json` — 每条记录追加新字段
2. `js/app.js` — `renderCards()` 中读取并显示
3. `js/app.js` — `renderFilters()` 中决定是否需要新筛选组
4. `admin.html` — 表单添加对应输入项
5. `admin.html` — `loadExisting()` 中提取该字段的去重值

### 添加新筛选分类

新增分类需要在 `renderFilters()` 中添加一个 `filter-group`。
参考现有三组（颜色/风格/套装）的 HTML 结构和 JS 逻辑。

---

## 常见问题

### JSON 加载失败

```
原因：文件末尾有多余逗号，或上一行缺少逗号
解决：用 `python3 -c "import json; json.load(open('data/outfits.json'))"` 验证
```

### 图片不显示

```
原因1：image 字段路径与 images/ 下文件名不匹配
原因2：网络 URL 被防盗链拦截
解决：本地文件检查文件名大小写，URL 尝试用浏览器直接打开验证
```

### 筛选标签不更新

```
原因：新增的 color/style/setName 值在数据中已存在
解决：renderFilters() 每次从 allData 中提取去重值，自动更新
```