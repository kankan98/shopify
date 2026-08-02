# 06 · 购物车与 Ajax API

> **先说结论**:现代主题的购物车体验由三层合奏:**`cart` 对象**(服务端渲染初始状态)→ **Cart Ajax API**(几个 JSON 端点,改购物车状态)→ **Section Rendering API**(让服务端把新状态渲染成 HTML 还给你,直接替换 DOM)。学会第三层是分水岭——它让你**不用在 JS 里重复实现 Liquid 模板**,这是主题界最重要的工程模式,也是"会 JS"的你今天的主场。

---

## 1. cart 对象与购物车页

`cart` 是全局对象,任何页面可用(头部的购物车角标就靠它):

```liquid
{{ cart.item_count }}          件数
{{ cart.total_price | money }} 总价(分)
{% for item in cart.items %}
  {{ item.key }}                行唯一标识(变体id:哈希,change 接口用)
  {{ item.quantity }}
  {{ item.product.title }} / {{ item.variant.title }}
  {{ item.final_line_price | money }}   该行小计(含折扣)
  {{ item.image | image_url: width: 200 | image_tag }}
  {{ item.url }}
{% endfor %}
```

**零 JS 版购物车页**(`sections/cart.liquid` 的骨架,渐进增强的底座):

```liquid
{% form 'cart', cart %}
  {% for item in cart.items %}
    <div class="cart-line">
      {{ item.product.title }} — {{ item.variant.title }}
      {% # name="updates[]" 按行顺序对应数量;改完点更新按钮整页提交 %}
      <input type="number" name="updates[]" value="{{ item.quantity }}" min="0">
      <span>{{ item.final_line_price | money }}</span>
    </div>
  {% endfor %}

  <textarea name="note" placeholder="订单备注">{{ cart.note }}</textarea>
  <button type="submit" name="update">更新购物车</button>
  <button type="submit" name="checkout">去结账</button>   {% # 提交进 Shopify 托管结账,主题到此为止 %}
{% endform %}
```

> 补充概念:**line item properties**(加购时带 `properties[刻字]=xxx`,做定制商品)和 **cart attributes**(整车维度的附加信息),接单遇到"商品要填定制信息"就是它们。

---

## 2. Cart Ajax API:五个端点

全部返回 JSON,路径**用 `routes` 对象拼**(多语言店铺前缀问题,第 03 章讲过):

| 端点 | 方法 | 干什么 | 关键参数 |
|---|---|---|---|
| `{{ routes.cart_url }}.js` → `/cart.js` | GET | 读整车 | — |
| `{{ routes.cart_add_url }}.js` | POST | 加购 | `{ items: [{ id: 变体id, quantity: 1, properties: {...} }] }` |
| `{{ routes.cart_change_url }}.js` | POST | 改/删某一行 | `{ line: 1起的行号 或 id: item.key, quantity: 0表示删 }` |
| `{{ routes.cart_update_url }}.js` | POST | 批量改数量/note | `{ updates: { 变体id: 数量 }, note: '...' }` |
| `/cart/clear.js` | POST | 清空 | — |

最小加购:

```js
const res = await fetch(window.routes.cartAddUrl + '.js', {   // routes 从 Liquid 注入,见下
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] })
});
if (!res.ok) {
  const err = await res.json();      // 422:{ status, message, description } 常见于库存不足
  showToast(err.description);
}
```

两个必知细节:

1. **`add.js` 的响应只包含"本次加进去的行"**,不含总价和总件数——要更新角标你还得再 `GET /cart.js`,或者用第 3 节的一次请求解法。
2. Liquid 数据传给 JS 的标准姿势(别硬编码):

```liquid
<script>
  window.routes = {
    cartAddUrl: {{ routes.cart_add_url | json }},
    cartChangeUrl: {{ routes.cart_change_url | json }},
    cartUrl: {{ routes.cart_url | json }}
  };
</script>
```

---

## 3. Section Rendering API:主题界的"局部刷新"

问题:加购成功后,购物车抽屉里的商品列表 HTML 谁来生成?在 JS 里 `innerHTML = ...` 拼一遍?那你就得**用 JS 重写一遍 Liquid 模板**,两份逻辑永远对不齐(金额格式化、多语言、促销价……全要重复)。

解法:让服务端**用原有的 Liquid section 重新渲染一次**,把 HTML 给你,你只负责替换:

```js
// 方式 A:独立 GET(任意时机可用;最多一次 5 个 section)
const sections = await fetch('/?sections=cart-drawer,cart-icon-bubble').then(r => r.json());
// → { "cart-drawer": "<div...>", "cart-icon-bubble": "<span...>" }

// 方式 B:搭车 cart 请求(推荐:改状态 + 拿新 HTML,一次往返)
await fetch(routes.cartAddUrl + '.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [{ id: variantId, quantity: 1 }],
    sections: 'cart-drawer,cart-icon-bubble'        // ← 加这一个字段
  })
});
// 响应里多出 res.sections['cart-drawer'] = 渲染好的 HTML
```

**section id 从哪来**:JSON 模板里的实例有动态 id(形如 `template--xxx__main`),写死必错。规范做法是在 Liquid 里把 `{{ section.id }}` 注到 DOM 上,JS 现场读:

```liquid
<div data-section-id="{{ section.id }}"> ... </div>
```

替换 DOM 时用 `DOMParser` 取回同 id 的内部节点再换,避免整段 innerHTML 干掉事件绑定的容器。

---

## 4. 实战:手写购物车抽屉(本章大作业)

结构:`sections/cart-drawer.liquid`(Liquid 负责所有 HTML)+ 一个原生 **Web Component**(JS 只管状态和替换)。

```liquid
{% # sections/cart-drawer.liquid —— 放进 header-group,全站可用 %}
<cart-drawer data-section-id="{{ section.id }}">
  <div class="drawer__overlay" data-close></div>
  <aside class="drawer__panel">
    <h2>购物车({{ cart.item_count }})</h2>
    {% for item in cart.items %}
      <div class="drawer__line">
        {{ item.image | image_url: width: 120 | image_tag }}
        <div>
          {{ item.product.title }}<br>{{ item.variant.title }}
          <div>
            {% # 数量步进:JS 读 data-line 调 change.js %}
            <button data-qty data-line="{{ forloop.index }}" data-delta="-1">−</button>
            {{ item.quantity }}
            <button data-qty data-line="{{ forloop.index }}" data-delta="1">+</button>
          </div>
        </div>
        <span>{{ item.final_line_price | money }}</span>
      </div>
    {% else %}
      <p>购物车是空的</p>
    {% endfor %}
    <footer>
      <strong>{{ cart.total_price | money }}</strong>
      <a href="{{ routes.cart_url }}">查看购物车</a>
      <button name="checkout" onclick="location.href='/checkout'">去结账</button>
    </footer>
  </aside>
</cart-drawer>

{% schema %}
{ "name": "购物车抽屉", "settings": [] }
{% endschema %}
```

```js
// assets/cart-drawer.js —— 主题界标准 JS 风格:自定义元素,无构建、无框架
class CartDrawer extends HTMLElement {
  connectedCallback() {
    this.sectionId = this.dataset.sectionId;
    this.addEventListener('click', (e) => {
      if (e.target.matches('[data-close]')) this.close();
      if (e.target.matches('[data-qty]')) this.changeLine(e.target);
    });
    // 任何地方加购成功后广播这个事件,抽屉自己刷新并打开:模块间零耦合
    document.addEventListener('cart:updated', (e) => this.renderFrom(e.detail.sections));
  }
  open()  { this.classList.add('is-open'); }
  close() { this.classList.remove('is-open'); }

  async changeLine(btn) {
    const line = Number(btn.dataset.line);
    const qty  = Number(btn.dataset.delta) + Number(btn.closest('.drawer__line').querySelector('[data-qty]').textContent || 0);
    const res = await fetch(window.routes.cartChangeUrl + '.js', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line, quantity: Math.max(0, qty), sections: this.sectionId })
    }).then(r => r.json());
    this.renderFrom(res.sections);
  }

  renderFrom(sections) {
    if (!sections?.[this.sectionId]) return;
    const html = new DOMParser().parseFromString(sections[this.sectionId], 'text/html');
    this.querySelector('.drawer__panel').replaceWith(html.querySelector('.drawer__panel'));
    this.open();
  }
}
customElements.define('cart-drawer', CartDrawer);
```

加购侧(商品表单的提交拦截)只需要:请求时带 `sections: 抽屉的sectionId`,成功后 `document.dispatchEvent(new CustomEvent('cart:updated', { detail: { sections: res.sections } }))`。

**为什么主题界偏爱 Web Components**(Dawn/Horizon 官方约定,你会 JS 所以只需换个视角):

1. 无构建链路,一个 `<script>` 就能跑,符合主题"零依赖"体质;
2. HTML 即初始化——`connectedCallback` 在元素入 DOM 时自动执行,**主题编辑器重渲 section 后无需手动重新绑事件**(这是普通 `DOMContentLoaded + querySelector` 写法在编辑器里频繁失灵的原因);
3. 天然的作用域(`this.querySelector`)避免全局选择器互相踩。

配套地,编辑器有一组事件可监听:`shopify:section:load / unload / select`、`shopify:block:select` 等,用于"商家在编辑器里点到这个 section 时自动展开抽屉"这类预览体验优化:

```js
document.addEventListener('shopify:section:select', (e) => {
  if (e.target.querySelector('cart-drawer')) e.target.querySelector('cart-drawer').open();
});
```

---

## 5. 同一模式的另外两个 API(会一通百)

**预测搜索**(输入即出结果):

```js
const url = `${window.routes.predictiveSearchUrl}?q=${encodeURIComponent(q)}&resources[type]=product,collection&section_id=predictive-search`;
// 返回 HTML(由 sections/predictive-search.liquid 渲染),直接塞进下拉面板
```

**商品推荐**(相关/互补商品位):

```js
const url = `${window.routes.productRecommendationsUrl}?product_id=${id}&limit=4&intent=related&section_id=related-products`;
// 同样返回渲染好的 HTML;intent=complementary 是"搭配购买"
```

套路完全一致:**参数 + section_id → 服务端渲染 → 替换 DOM**。加上防抖(300ms)和 `AbortController` 取消过期请求,就是生产级实现。

---

## 🛠 练习(北纬咖啡 · 交易链路下半场)

1. 完成第 4 节购物车抽屉全流程:商品页 Ajax 加购 → 抽屉弹出并显示新状态 → 抽屉内步进数量/删行 → 角标同步。全程无整页刷新。
2. 处理失败分支:库存只剩 2 件时连点加购,把 422 的 `description` 用 toast 展示。
3. 商品页底部加"相关商品"位(recommendations + section_id 模式)。
4. 挑战(可跳过):头部搜索框接预测搜索,带防抖与请求取消。

## ✅ 自测

- `add.js` 的响应里有购物车总价吗?两种拿到最新总价的方式各是什么?
- Section Rendering API 解决的核心工程问题是什么(为什么不该用 JS 拼购物车 HTML)?
- section id 为什么不能写死?规范的传递路径是什么?
- 主题编辑器里"改了设置后按钮事件全失灵",大概率是什么写法导致的?Web Component 为什么免疫?

## 🔁 带去 App 线

- 你今天写的 `fetch` + JSON + 错误分支处理,就是 App 线日常;Storefront API 的 `cartLinesAdd/cartLinesUpdate` mutations 与 add.js/change.js 逐一对应,连"单位是分"都一样。
- **Web Components 在这里练熟,直接偿还 App 线最大的一笔预习债**——Polaris Web Components(`<s-button>` 等)就是同一套技术,总纲结论一说的互操作难点从此对你不存在。
- 事件驱动解耦(`cart:updated`)对应 App 里的 App Bridge 事件模型。
