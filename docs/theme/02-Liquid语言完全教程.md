# 02 · Liquid 语言完全教程

> **先说结论**:Liquid 是一门**故意设计得很弱**的模板语言——不能定义函数、不能随意改数据、没有类,只能"读数据 → 加工 → 拼 HTML"。为什么?因为它要让全世界的第三方开发者在 Shopify 服务器上安全地跑代码。接受这个设定,你两天就能学完;抗拒它(试图用写 JS 的方式写 Liquid),你会处处碰壁。
>
> 学习方式:开着 `shopify theme console`(REPL)边读边敲,或改 `sections/hello-world.liquid` 看热重载。

---

## 1. 两种定界符

```liquid
{{ product.title }}          输出:把表达式的值打进 HTML
{% if product.available %}   逻辑:执行标签,不直接产生输出
  有货
{% endif %}
```

加连字符可以**吃掉两侧空白**(控制 HTML 产物的换行/缩进):

```liquid
{%- if true -%}  {{- product.title -}}  {%- endif -%}
```

多行逻辑推荐 `{% liquid %}` 标签,内部每行一条语句、不用重复写定界符:

```liquid
{% liquid
  assign price = product.price
  if price > 10000
    assign badge = 'premium'
  endif
%}
```

注释两种:`{% comment %} 多行 {% endcomment %}`,或行内 `{% # 单行注释 %}`。

---

## 2. 变量与类型

```liquid
{% assign name = 'shopify' %}          字符串(单双引号均可)
{% assign n = 42 %}{% assign f = 1.5 %} 数字
{% assign ok = true %}                  布尔
{% assign words = 'a,b,c' | split: ',' %}  数组(注意:没有数组字面量,split 是唯一手工造数组的办法)

{% capture html %}
  <p>{{ name }}</p>
{% endcapture %}                        capture:把渲染结果存进变量,复杂拼接必备
```

类型全家福:String、Number、Boolean、Nil(空)、Array、以及 **Drop**(Shopify 数据对象,如 `product`,只读)。

计数器标签 `{% increment x %}` / `{% decrement x %}` 存在但几乎不用,忽略。

---

## 3. 真假值:第一大坑

**只有 `false` 和 `nil` 是假,其它一切都是真——包括空字符串、包括 0、包括空数组。**

```liquid
{% if '' %}会执行!{% endif %}
{% if 0 %}会执行!{% endif %}
```

所以判断"有没有内容"要用 `blank` / `empty`:

```liquid
{% if product.description != blank %}   有实际内容(nil、''、'  ' 都算 blank)
{% if collection.products == empty %}   空数组/空对象
```

商家在编辑器里清空一个文本设置后,值往往是 `''` 而不是 `nil`——**判设置永远用 `!= blank`,不要用 `if settings.xxx`**。

---

## 4. 控制流

```liquid
{% if a > 1 and b < 2 %} ... {% elsif c %} ... {% else %} ... {% endif %}
{% unless product.available %} 售罄 {% endunless %}

{% case product.type %}
  {% when 'coffee' %} 咖啡
  {% when 'mug', 'cup' %} 器具(when 可以多值)
  {% else %} 其他
{% endcase %}
```

规则与坑:

| 规则 | 说明 |
|---|---|
| 比较符 | `== != > < >= <=`、`contains`(仅限 字符串包含子串 / 字符串数组包含元素) |
| 没有括号 | 条件里**不能用 `( )` 分组**;`and`/`or` 混用时从**右**往左结合,复杂条件请拆成多个 assign |
| 条件里不能用过滤器 | `{% if items | size > 3 %}` 是**语法错误**;先 `{% assign c = items | size %}` 再 `{% if c > 3 %}` |
| 是 `elsif` | 不是 elseif / elif |

---

## 5. 循环

```liquid
{% for product in collection.products limit: 4 offset: 2 reversed %}
  {{ forloop.index }}   1 起
  {{ forloop.index0 }}  0 起
  {% if forloop.first %}第一个{% endif %}
  {% if forloop.last %}最后一个{% endif %}
  {{ forloop.length }}  总数
  {% if product.available == false %}{% continue %}{% endif %}
  {% if forloop.index > 10 %}{% break %}{% endif %}
{% else %}
  集合是空的(for 的 else 分支)
{% endfor %}

{% for i in (1..5) %}{{ i }}{% endfor %}          范围循环
{% cycle 'odd', 'even' %}                          交替输出(做斑马纹)
```

没有 `while`,没有传统 `i++` 循环——需要"重复 n 次"就用范围循环。

---

## 6. 过滤器:Liquid 的函数库

语法:`{{ 输入 | 过滤器: 参数1, 参数2 | 下一个过滤器 }}`,**从左到右依次执行**,没有优先级一说。

### 6.1 高频字符串过滤器

```liquid
{{ 'hello' | upcase }}                      HELLO(还有 downcase / capitalize)
{{ 'hello' | append: ' world' }}            hello world(prepend 加在前)
{{ title | replace: 'a', 'b' | remove: 'x' }}
{{ title | truncate: 20 }}                  超长截断加省略号(truncatewords 按词)
{{ ' hi ' | strip }}                        去两端空白
{{ '深烘 咖啡豆' | handleize }}              shen-hong-ka-fei-dou 风格的 URL 安全串
{{ text | escape }}                         HTML 转义
{{ html | strip_html }}                     去掉所有标签
{{ 'a,b,c' | split: ',' }}                  → 数组
```

### 6.2 高频数组过滤器

```liquid
{{ arr | size }} {{ arr | first }} {{ arr | last }}
{{ arr | join: ', ' }}
{{ products | map: 'title' }}                        抽取字段
{{ products | where: 'available', true }}            过滤
{{ products | sort: 'price' }} {{ arr | sort_natural }}
{{ arr | uniq }} {{ arr | reverse }} {{ a | concat: b }}
{{ items | sum: 'quantity' }}                        求和
```

### 6.3 数学过滤器(没有运算符,加减乘除全是过滤器)

```liquid
{{ 10 | plus: 5 | minus: 3 | times: 2 | modulo: 5 }}
{{ 5 | divided_by: 2 }}     → 2 !整数除整数结果取整,想要小数写 divided_by: 2.0
{{ 4.6 | round }} {{ 4.2 | ceil }} {{ 4.8 | floor }} {{ -3 | abs }}
{{ n | at_least: 1 | at_most: 50 }}                  夹在区间内
```

### 6.4 Shopify 专属过滤器(电商灵魂)

```liquid
{{ product.price | money }}                  ¥199(按店铺货币格式;price 单位是分!)
{{ product.price | money_with_currency }}    ¥199 CNY
{{ 'now' | date: '%Y-%m-%d %H:%M' }}         日期格式化
{{ settings.heading | default: '默认标题' }}  空值兜底
{{ product | json }}                         整个对象转 JSON(给 JS 用,第 06 章重点)
{{ 'cart.title' | t }}                       多语言翻译(第 08 章)
{{ image | image_url: width: 800 | image_tag }}   响应式图片(第 09 章)
{{ 'critical.css' | asset_url | stylesheet_tag }} 引用 assets/ 里的文件
{{ 'icon-cart.svg' | inline_asset_content }}      把 SVG 内容直接内联进 HTML(新一代做法,Skeleton 在用)
```

**记住 `price 单位是分**(所有金额字段都是最小货币单位),`| money` 负责除以 100 并格式化,自己千万别手算。

---

## 7. 对象(Drops)与访问

Shopify 把所有数据包装成只读对象树,点号访问,方括号支持动态 key:

```liquid
{{ product.title }}
{{ product.variants.first.price | money }}
{{ product['title'] }}                       等价写法
{% assign key = 'title' %}{{ product[key] }} 动态 key
```

对象分两类(第 03 章细讲):

- **全局对象**:任何文件里都能用——`shop`、`cart`、`customer`、`settings`、`request`、`routes`、`localization`、`collections`、`pages`…
- **上下文对象**:只在对应模板/标签里存在——商品页的 `product`、集合页的 `collection`、section 文件里的 `section` 与 `block`、`paginate` 标签内的 `paginate`、form 标签内的 `form`。

不存在的属性返回 `nil`(不报错),拼写错 key 只会"悄悄空白"——**页面某块莫名空白时,第一反应是检查对象路径拼写**。

---

## 8. snippet 与 `{% render %}`:唯一的复用单元

Liquid 不能定义函数,复用靠 `snippets/` 目录 + `render` 标签(类比:接受具名参数的纯函数,返回 HTML):

```liquid
{% render 'price-badge', product: product, show_compare: true %}
```

```liquid
{% # snippets/price-badge.liquid %}
{% doc %}
  渲染价格徽章
  @param {product} product - 商品对象
  @param {boolean} [show_compare] - 是否显示划线价
{% enddoc %}
<span class="price">{{ product.price | money }}</span>
{% if show_compare and product.compare_at_price > product.price %}
  <s>{{ product.compare_at_price | money }}</s>
{% endif %}
```

规则:

- **作用域完全隔离**:snippet 里只能看到显式传入的参数 + 全局对象,看不到调用方的 assign。这是特性不是限制——保证 snippet 可预测。
- `{% doc %}` 是第三代新增的文档注释,VS Code 扩展会在调用处悬停展示参数说明,养成习惯写它(看 `my-new-theme/snippets/image.liquid` 的真实示例)。
- 简写:`{% render 'card' with product as item %}`;循环渲染:`{% render 'card' for collection.products as product %}`(自带 forloop)。
- 老代码里的 `{% include %}` 已废弃(不隔离作用域、性能差),看到就知道是旧教程。

---

## 9. 本章坑位总结(背下来,每条都会踩)

1. 空字符串和 0 都是**真**;判空一律 `!= blank`。
2. 金额单位是**分**,输出必须过 `| money`。
3. `divided_by` 整数除法**取整**,要小数除以 `2.0`。
4. 条件里**不能用过滤器**、不能用括号;复杂逻辑先 assign 再判断。
5. `contains` 只认字符串(和字符串数组),不能判断对象数组里"是否存在某商品"。
6. 拼错对象属性不报错,只输出空——空白 ≠ 没数据,先查拼写。
7. `render` 里拿不到外面的变量——没传就是 nil。
8. Liquid 在**服务端**跑,页面发出后就结束了;"点按钮后变化"的需求属于 JS(第 06 章),别想用 Liquid 做。

---

## 🛠 练习(全部在 `sections/hello-world.liquid` 里做,存盘看热重载)

1. 用 `shop` 对象输出:店名、货币、商品总数、域名。
2. 遍历 `collections`,每行输出集合标题和商品数,空集合跳过(`continue`),只显示前 5 个(`limit`)。
3. 遍历某个集合的商品:第一件加"🔥新品"前缀,售罄的显示删除线标题,价格用 `money` 输出;整个列表做 odd/even 斑马纹(`cycle`)。
4. 写一个 `snippets/discount-tag.liquid`:传入 product,若 `compare_at_price > price` 则计算折扣百分比并输出"省 XX%"(注意整数除法坑)。
5. 用 `theme console` 验证:`{{ '' | default: 'A' }}`、`{{ 0 | default: 'A' }}`、`{{ nil | default: 'A' }}` 各输出什么?想清楚为什么(提示:default 对 blank 也生效,0 不是 blank)。

## ✅ 自测

- `{% if settings.banner_text %}` 为什么在商家清空文案后仍然显示横幅?正确写法?
- `{{ 1999 | money }}` 输出多少钱?为什么不是 1999 元?
- `render` 与已废弃的 `include` 本质区别是什么?
- 为什么 Liquid 里做不了"点击加载更多"?这类需求的正确技术选型是什么?

## 🔁 带去 App 线

- 这里认识的每个对象(product/variant/collection/cart)在 **Admin GraphQL API 里同名同构**:`{{ product.variants }}` ↔ GraphQL `product { variants(first: 10) { ... } }`。Liquid 学的是"数据长什么样",GraphQL 学的只是"换种语法取同样的数据"。
- 金额单位是分、`handle` 是全平台唯一 URL 标识——这些平台约定三条线通用。
