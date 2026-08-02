# 09 · 性能、SEO 与可访问性

> **先说结论**:主题性能问题 80% 来自两个源头——**图片**和**第三方脚本(App 注入)**。CDN、HTTP/2、压缩、缓存 Shopify 平台全包了,你控制不了服务器,你能控制的是"资源纪律"。本章给三份清单:性能、SEO、可访问性,全部可执行、可验收——它们也是接单报价时"专业版"和"糊弄版"的分界线。

---

## 1. 性能:先建立度量

| 指标 | 含义 | 主题里的常见凶手 |
|---|---|---|
| LCP(最大内容绘制) | 首屏大图/标题出现时间 | 首屏 banner 图没预加载、图太大 |
| CLS(累积布局偏移) | 页面元素跳动 | 图片没写宽高、字体闪换、动态注入的横幅 |
| INP(交互到下一帧) | 点击响应速度 | 主线程被大 JS/第三方脚本占死 |

度量工具:Chrome Lighthouse(无痕窗口跑)、`shopify theme profile`(Liquid 渲染耗时分解,找慢 section)、店铺后台的 Web 性能报告(真实用户数据)。

## 2. 图片纪律(收益最大的一节)

Shopify CDN 支持按需缩放/裁剪/转格式(WebP/AVIF 自动),**永远不要输出原图**。标准姿势一行:

```liquid
{{ product.featured_image
  | image_url: width: 1500
  | image_tag:
      widths: '400, 600, 800, 1200, 1500',
      sizes: '(min-width: 750px) 50vw, 100vw',
      loading: 'lazy',
      alt: product.featured_image.alt
}}
```

- `image_url: width:` 定上限,`image_tag` 自动生成 `srcset` + 宽高属性(**宽高属性就是 CLS 的解药**);
- `sizes` 告诉浏览器该图实际占多宽,写错一档浏览器就多下几倍像素——布局 50% 宽就写 `50vw`;
- **首屏 LCP 图反着来**:`loading: 'eager', fetchpriority: 'high'`,再加 `preload: true`(让 Shopify 发预加载头);其余一律 `lazy`;
- 无图占位用 `placeholder_svg_tag`,别裸 `<img>` 空 src。

## 3. JS 与第三方脚本纪律

1. 自己的 JS:全部 `<script src="..." defer>`;按功能拆小文件,只在用到的 section 里引;不引 jQuery/大库——第 06 章证明了原生够用。
2. **第三方 App 是性能黑洞**:每装一个 App 往 `content_for_header` 塞脚本,卸载后常留尸。审计方法:视图源码搜 `content_for_header` 输出段,后台 → 已卸载 App 的 embed 挨个关。接单优化性能,先查这里,经常白捡 20 分。
3. 动效用 CSS 优先;滚动监听用 `IntersectionObserver`,别 scroll 事件里算布局。

## 4. CSS 与字体

- Skeleton 的 `critical.css` 思路:首屏关键样式直出,其余样式文件正常加载即可(HTTP/2 下不必过度合并);杜绝 CSS 里 `@import`(串行加载)。
- 字体三板斧:只用 woff2、`font_display: 'swap'`(第 08 章已做)、对正文字体加 `preload_tag`;能接受的话系统字体栈是零成本满分答案。

## 5. Liquid 渲染性能

- 嵌套循环是大忌:集合页每张卡片里再循环 `product.variants` × 24 张卡,渲染时间爆炸;能用 `where`/`map` 一次算完的别写 for。
- `paginate` 数值别贪大,24~48 合理;
- 全局遍历 `collections` / `all_products` 属于危险动作(`all_products` 本身限 20 个);
- 慢了别猜,`shopify theme profile` 直接看每个 section 的毫秒数。

## 6. SEO 清单

平台已包办:sitemap.xml、robots.txt、canonical、301(改 handle 时勾选)。主题侧要做的:

| 项 | 做法 |
|---|---|
| Title/Description | `theme.liquid` 用 `{{ page_title }}` `{{ page_description }}`(Skeleton 的 `meta-tags` snippet 已含,商家在后台每个资源页填) |
| 社交分享卡 | og:image 等,同在 `meta-tags` snippet,确认有 `page_image` 兜底 |
| 结构化数据 | 商品页输出 JSON-LD(下方模板);富结果=搜索列表里带价格星级 |
| 语义结构 | 每页一个 `h1`(商品页=商品名),层级不跳档 |
| 图片 alt | 后台可填,模板里 `image.alt` 带出,装饰图 `alt=""` |

商品页 JSON-LD 骨架(放进 product section 底部):

```liquid
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": {{ product.title | json }},
  "image": {{ product.featured_image | image_url: width: 1200 | prepend: 'https:' | json }},
  "description": {{ product.description | strip_html | truncatewords: 60 | json }},
  "offers": {
    "@type": "Offer",
    "price": {{ product.price | divided_by: 100.0 | json }},
    "priceCurrency": {{ cart.currency.iso_code | json }},
    "availability": "https://schema.org/{% if product.available %}InStock{% else %}OutOfStock{% endif %}",
    "url": {{ request.origin | append: product.url | json }}
  }
}
</script>
```

注意技巧:**所有动态值过 `| json`**,自动处理引号转义,手拼字符串必被商品名里的引号炸掉。

## 7. 可访问性(a11y)清单

不是道德加分项——键盘/读屏用户是真实顾客,且 Theme Store 与大客户验收都查:

- **语义**:能用 `<button>` 不用 `<div onclick>`;跳转用 `<a>`,动作用 `<button>`;
- **键盘**:Tab 能走完"选变体 → 加购 → 开抽屉 → 改数量 → 去结账"全程;焦点样式不许 `outline: none` 裸删;抽屉打开时焦点移入、Esc 关闭、关闭后焦点归还触发按钮;
- **ARIA**:抽屉/折叠面板维护 `aria-expanded`、`aria-controls`;购物车角标变化用 `aria-live="polite"` 播报;图标按钮必须有可读名(`aria-label="打开购物车"`);
- **视觉**:正文对比度 ≥ 4.5:1(商家能改颜色,所以在设置说明里提示);`prefers-reduced-motion` 降级动画;
- **表单**:每个 input 有 `<label>`(视觉隐藏也行),错误信息用文字不是只有红框。

第 06 章用 `<details>/<summary>` 做 FAQ、原生表单做加购,就是"语义优先"的实践——原生元素自带的键盘与读屏行为,比你手写 ARIA 可靠得多。

---

## 🛠 练习(北纬咖啡 · 体检与达标)

1. Lighthouse 无痕跑首页/商品页/集合页,记下四项分数;`shopify theme profile` 找出最慢 section。
2. 图片专项:首页 banner 按第 2 节改造(eager + preload + sizes),重跑对比 LCP;集合页卡片确认全部 lazy + 有宽高。
3. 商品页加 JSON-LD,用 Google 富结果测试工具验证通过。
4. 拔掉鼠标,键盘走完完整购买流程,修复卡住的每一处(重点:抽屉焦点管理)。
5. 目标线:移动端 Performance ≥ 80,Accessibility ≥ 95,SEO ≥ 95。

## ✅ 自测

- CLS 的两个主题常见来源?`image_tag` 怎么帮你消掉其中一个?
- `sizes` 属性写错的代价是什么?50% 宽布局该写什么?
- 为什么 JSON-LD 里所有动态值要过 `| json`?
- 装了又卸的 App 为什么还可能拖慢店铺?去哪排查?

## 🔁 带去 App 线

- 你未来写的 App 就是别人主题里的"第三方脚本"——今天当过受害者,明天写 App embed 时自觉 defer、瘦身、卸载即清理。
- JSON-LD/OG 这类"面向机器的元数据"思想,与 App 线 webhook payload、GraphQL 类型契约同源:结构化、可校验、别手拼字符串。
